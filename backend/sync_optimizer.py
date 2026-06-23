"""
🚀 SISTEMA DE SINCRONIZACIÓN OPTIMIZADO ODOO <-> DASHBOARD
Mejoras implementadas:
- Sync incremental con delta detection
- Worker pool dinámico con circuit breaker
- Compresión y almacenamiento optimizado
- Procesamiento paralelo y streaming
- Monitoreo granular de rendimiento
"""

import time
import hashlib
import json
import logging
import os
import gzip
import tempfile
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from collections import deque
import threading
import concurrent.futures

logger = logging.getLogger(__name__)


# ============================================================================
# 1. METADATA Y DELTA SYNC
# ============================================================================

@dataclass
class SyncMetadata:
    """Metadata de sincronización para delta detection"""
    last_sync_timestamp: str
    last_rotation_hash: str = ""
    last_stock_hash: str = ""
    last_po_hash: str = ""
    last_orderpoints_hash: str = ""
    products_count: int = 0
    total_size_bytes: int = 0
    sync_duration_seconds: float = 0.0

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict):
        return cls(**data)


def calculate_hash(data: Any) -> str:
    """Calcula hash MD5 de datos para delta detection.
    Usa solo longitud y muestreo para evitar serializar GBs de datos."""
    if isinstance(data, list):
        # Hash basado en longitud + primeros y últimos elementos
        h = hashlib.md5()
        h.update(str(len(data)).encode())
        if data:
            h.update(json.dumps(data[0], sort_keys=True, default=str).encode())
            if len(data) > 1:
                h.update(json.dumps(data[-1], sort_keys=True, default=str).encode())
            if len(data) > 100:
                h.update(json.dumps(data[len(data)//2], sort_keys=True, default=str).encode())
        return h.hexdigest()
    else:
        data_str = json.dumps(data, sort_keys=True, default=str)
        return hashlib.md5(data_str.encode()).hexdigest()


class DeltaSyncManager:
    """Gestiona sincronización incremental basada en cambios"""

    def __init__(self, metadata_file: str):
        self.metadata_file = metadata_file
        self.metadata = self._load_metadata()

    def _load_metadata(self) -> SyncMetadata:
        """Carga metadata del último sync"""
        try:
            import os
            if os.path.exists(self.metadata_file):
                with open(self.metadata_file, 'r') as f:
                    data = json.load(f)
                    return SyncMetadata.from_dict(data)
        except Exception as e:
            logger.warning(f"No se pudo cargar metadata: {e}")

        # Default metadata (primera sincronización)
        return SyncMetadata(
            last_sync_timestamp=datetime.now().isoformat()
        )

    def save_metadata(self, metadata: SyncMetadata):
        """Guarda metadata del sync actual"""
        try:
            with open(self.metadata_file, 'w') as f:
                json.dump(metadata.to_dict(), f, indent=2)
            logger.info(f"Metadata guardada: {metadata.products_count} productos, {metadata.sync_duration_seconds:.2f}s")
        except Exception as e:
            logger.error(f"Error guardando metadata: {e}")

    def should_fetch_section(self, section: str, current_hash: str) -> bool:
        """Determina si una sección necesita actualizarse"""
        last_hash = getattr(self.metadata, f"last_{section}_hash", "")
        changed = last_hash != current_hash
        if changed:
            logger.info(f"📊 Sección '{section}' cambió (hash: {last_hash[:8]}... -> {current_hash[:8]}...)")
        else:
            logger.info(f"✓ Sección '{section}' sin cambios (hash: {current_hash[:8]}...)")
        return changed

    def get_last_sync_date(self) -> datetime:
        """Obtiene fecha del último sync"""
        try:
            return datetime.fromisoformat(self.metadata.last_sync_timestamp)
        except:
            return datetime.now() - timedelta(days=180)


# ============================================================================
# 2. WORKER POOL DINÁMICO CON CIRCUIT BREAKER
# ============================================================================

class CircuitBreaker:
    """Circuit breaker para proteger contra lentitud de Odoo"""

    def __init__(self,
                 failure_threshold: int = 3,
                 recovery_timeout: float = 30.0,
                 slow_threshold: float = 5.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.slow_threshold = slow_threshold

        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self.recent_latencies = deque(maxlen=10)
        self._lock = threading.Lock()

    def record_success(self, latency: float):
        """Registra una llamada exitosa"""
        with self._lock:
            self.recent_latencies.append(latency)
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failure_count = 0
                logger.info("🔓 Circuit breaker: HALF_OPEN -> CLOSED")

    def record_failure(self, latency: float = None):
        """Registra una llamada fallida o lenta"""
        with self._lock:
            if latency:
                self.recent_latencies.append(latency)

            self.failure_count += 1
            self.last_failure_time = time.time()

            if self.failure_count >= self.failure_threshold:
                if self.state != "OPEN":
                    self.state = "OPEN"
                    logger.warning(f"⚠️ Circuit breaker: OPEN (failures: {self.failure_count})")

    def can_execute(self) -> bool:
        """Determina si se puede ejecutar una llamada"""
        with self._lock:
            if self.state == "CLOSED":
                return True

            if self.state == "OPEN":
                # Check if recovery timeout has passed
                if self.last_failure_time and \
                   time.time() - self.last_failure_time >= self.recovery_timeout:
                    self.state = "HALF_OPEN"
                    logger.info("🔄 Circuit breaker: OPEN -> HALF_OPEN (recovery attempt)")
                    return True
                return False

            if self.state == "HALF_OPEN":
                return True

            return False

    def get_avg_latency(self) -> float:
        """Obtiene latencia promedio reciente"""
        with self._lock:
            if not self.recent_latencies:
                return 0.0
            return sum(self.recent_latencies) / len(self.recent_latencies)

    def is_slow(self) -> bool:
        """Determina si el sistema está respondiendo lento"""
        avg = self.get_avg_latency()
        return avg > self.slow_threshold


class DynamicWorkerPool:
    """Worker pool que se ajusta dinámicamente según latencia"""

    def __init__(self,
                 min_workers: int = 6,
                 max_workers: int = 12,
                 initial_workers: int = 8):
        self.min_workers = min_workers
        self.max_workers = max_workers
        self.current_workers = initial_workers
        self.circuit_breaker = CircuitBreaker()
        self._lock = threading.Lock()

    def adjust_workers(self):
        """Ajusta número de workers según latencia"""
        with self._lock:
            avg_latency = self.circuit_breaker.get_avg_latency()

            if self.circuit_breaker.is_slow():
                # Sistema lento: reducir workers
                new_workers = max(self.min_workers, self.current_workers - 2)
                if new_workers != self.current_workers:
                    logger.info(f"🔽 Reduciendo workers: {self.current_workers} -> {new_workers} (latencia: {avg_latency:.2f}s)")
                    self.current_workers = new_workers

            elif avg_latency < 2.0 and self.current_workers < self.max_workers:
                # Sistema rápido: aumentar workers
                new_workers = min(self.max_workers, self.current_workers + 1)
                if new_workers != self.current_workers:
                    logger.info(f"🔼 Aumentando workers: {self.current_workers} -> {new_workers} (latencia: {avg_latency:.2f}s)")
                    self.current_workers = new_workers

    def execute_with_monitoring(self, client, method: str, *args, **kwargs):
        """Ejecuta una llamada con monitoreo de latencia"""
        if not self.circuit_breaker.can_execute():
            raise Exception("Circuit breaker is OPEN")

        start_time = time.time()
        try:
            result = client.call_kw(method, *args, **kwargs)
            latency = time.time() - start_time
            self.circuit_breaker.record_success(latency)
            return result
        except Exception as e:
            latency = time.time() - start_time
            self.circuit_breaker.record_failure(latency)
            raise e

    def get_executor(self) -> concurrent.futures.ThreadPoolExecutor:
        """Obtiene un executor con el número actual de workers"""
        return concurrent.futures.ThreadPoolExecutor(max_workers=self.current_workers)


# ============================================================================
# 3. SISTEMA DE MÉTRICAS Y MONITOREO
# ============================================================================

@dataclass
class SyncMetrics:
    """Métricas de rendimiento de sincronización"""
    sync_start: float
    sync_end: float = 0.0

    # Tiempos por paso
    discovery_time: float = 0.0
    extraction_time: float = 0.0
    processing_time: float = 0.0
    cache_write_time: float = 0.0

    # Tamaños de datos
    raw_data_size: int = 0
    compressed_size: int = 0

    # Contadores
    products_fetched: int = 0
    products_processed: int = 0
    delta_changes_detected: int = 0

    # Workers
    avg_workers_used: float = 0.0
    max_latency: float = 0.0

    def __post_init__(self):
        if self.sync_end == 0.0:
            self.sync_end = time.time()

    @property
    def total_time(self) -> float:
        return self.sync_end - self.sync_start

    @property
    def compression_ratio(self) -> float:
        if self.raw_data_size == 0:
            return 0.0
        return (1 - self.compressed_size / self.raw_data_size) * 100

    def log_summary(self):
        """Imprime resumen de métricas"""
        logger.info("=" * 80)
        logger.info("📊 RESUMEN DE SINCRONIZACIÓN")
        logger.info("=" * 80)
        logger.info(f"⏱️  Tiempo total: {self.total_time:.2f}s")
        logger.info(f"   - Discovery: {self.discovery_time:.2f}s ({self.discovery_time/self.total_time*100:.1f}%)")
        logger.info(f"   - Extracción: {self.extraction_time:.2f}s ({self.extraction_time/self.total_time*100:.1f}%)")
        logger.info(f"   - Procesamiento: {self.processing_time:.2f}s ({self.processing_time/self.total_time*100:.1f}%)")
        logger.info(f"   - Escritura cache: {self.cache_write_time:.2f}s ({self.cache_write_time/self.total_time*100:.1f}%)")
        logger.info(f"")
        logger.info(f"💾 Tamaño de datos:")
        logger.info(f"   - Raw: {self.raw_data_size / (1024*1024):.2f} MB")
        logger.info(f"   - Comprimido: {self.compressed_size / (1024*1024):.2f} MB")
        logger.info(f"   - Ratio de compresión: {self.compression_ratio:.1f}%")
        logger.info(f"")
        logger.info(f"📦 Productos: {self.products_processed} procesados / {self.products_fetched} obtenidos")
        logger.info(f"🔄 Cambios detectados: {self.delta_changes_detected}")
        logger.info(f"👥 Workers promedio: {self.avg_workers_used:.1f}")
        logger.info(f"⚡ Latencia máxima: {self.max_latency:.2f}s")
        logger.info("=" * 80)

        # Alertas si algún paso toma >30% del tiempo
        steps = [
            ("Discovery", self.discovery_time),
            ("Extracción", self.extraction_time),
            ("Procesamiento", self.processing_time),
            ("Cache", self.cache_write_time)
        ]

        for name, duration in steps:
            pct = (duration / self.total_time) * 100
            if pct > 30:
                logger.warning(f"⚠️ ALERTA: {name} tomó {pct:.1f}% del tiempo total (>{30}%)")


class MetricsCollector:
    """Recolector de métricas en tiempo real"""

    def __init__(self):
        self.metrics = SyncMetrics(sync_start=time.time())
        self._step_start = time.time()

    def start_step(self, step_name: str):
        """Inicia un paso de sincronización"""
        self._step_start = time.time()
        logger.info(f"🔄 Iniciando: {step_name}")

    def end_step(self, step_name: str):
        """Finaliza un paso y registra su duración"""
        duration = time.time() - self._step_start

        step_attr = step_name.lower().replace(" ", "_") + "_time"
        if hasattr(self.metrics, step_attr):
            setattr(self.metrics, step_attr, duration)

        logger.info(f"✅ Completado: {step_name} ({duration:.2f}s)")

    def finalize(self) -> SyncMetrics:
        """Finaliza la recolección de métricas"""
        self.metrics.sync_end = time.time()
        self.metrics.log_summary()
        return self.metrics


# ============================================================================
# 4. UTILIDADES DE COMPRESIÓN Y ALMACENAMIENTO
# ============================================================================

def compress_json_data(data: dict) -> Tuple[bytes, int, int]:
    """
    Comprime datos JSON con gzip
    Returns: (compressed_bytes, raw_size, compressed_size)
    """
    import gzip

    json_str = json.dumps(data, separators=(',', ':'), default=str)
    raw_bytes = json_str.encode('utf-8')
    raw_size = len(raw_bytes)

    compressed = gzip.compress(raw_bytes, compresslevel=6)
    compressed_size = len(compressed)

    return compressed, raw_size, compressed_size


def _atomic_write_bytes(file_path: str, content: bytes) -> None:
    directory = os.path.dirname(file_path) or "."
    fd, temp_path = tempfile.mkstemp(dir=directory)
    try:
        with os.fdopen(fd, "wb") as temp_file:
            temp_file.write(content)
            temp_file.flush()
            os.fsync(temp_file.fileno())
        os.replace(temp_path, file_path)
    except Exception:
        try:
            os.unlink(temp_path)
        except OSError:
            pass
        raise


def write_compressed_cache(file_path: str, data: dict) -> Tuple[int, int]:
    """
    Escribe cache comprimido y retorna tamaños
    Returns: (raw_size, compressed_size)
    """
    # Escribir JSON sin comprimir (para compatibilidad)
    json_str = json.dumps(data, indent=None, separators=(',', ':'), default=str)
    raw_bytes = json_str.encode('utf-8')
    raw_size = len(raw_bytes)
    compressed = gzip.compress(raw_bytes, compresslevel=6)

    _atomic_write_bytes(file_path, raw_bytes)
    _atomic_write_bytes(file_path + ".gz", compressed)

    compressed_size = len(compressed)

    return raw_size, compressed_size
