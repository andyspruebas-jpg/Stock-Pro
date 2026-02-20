import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react'
import XLSX from 'xlsx-js-style'
import {
  Package, Search, Filter, ArrowUpDown, BrainCircuit, RefreshCw,
  TrendingUp, AlertTriangle, X, ChevronRight, BarChart3,
  Calendar, Info, Box, Archive, Table, FileSpreadsheet, Lock, Eye, EyeOff,
  LogOut, Truck, Clock, ArrowUpRight, SortAsc, LayoutGrid, Users, ListFilter, Globe,
  User, Camera, Key, Save, Store, Settings, ArrowRightLeft, ArrowRight, ArrowLeft, Check, AlertCircle, Trash2, History, CalendarClock, ChevronDown, ArrowUp, ArrowDown, Quote, Plus, CheckCircle2,
  FilterX, PlusCircle, XCircle, Sparkles, Download
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import Login from './Login'

// --- Utility: cn ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const getCleanWhName = (name: string) => {
  const upper = name.toUpperCase();

  // 1. Prioritize ANDYS / YAM YAM specific branches (Identifiable by 'ANDY' or 'YAM' or specific locations known to be Andys)
  const isAndys = upper.includes('ANDY') || upper.includes('YAM');

  if (isAndys) {
    if (upper.includes('MIGUEL')) return 'ANDYS S.MIGUEL';
    if (upper.includes('POTOSI')) return 'ANDYS POTOSI';
    if (upper.includes('ACHUMANI')) return 'ANDYS ACHUMANI';
    if (upper.includes('OBRAJES')) return 'ANDYS OBRAJES';
    if (upper.includes('SOPOCACHI')) return 'ANDYS SOPOCACHI';
    if (upper.includes('CALACOTO')) return 'ANDYS CALACOTO';
  }

  // 2. NUBA branches
  if (upper.includes('21')) return 'NUBA 21';
  if (upper.includes('CENTRAL')) return 'ALMACEN CENTRAL';
  if (upper.includes('PISO')) return 'ALMACEN PISO 3';
  if (upper.includes('AMERICA')) return 'NUBA AMERICA';
  if (upper.includes('BENI')) return 'NUBA BENI';
  if (upper.includes('CINEBOL')) return 'NUBA CINEBOL';
  if (upper.includes('EQUIPETROL')) return 'NUBA EQUIPETROL';
  if (upper.includes('MEGACENTER')) return 'NUBA MEGACENTER';
  if (upper.includes('MULTICINE')) return 'NUBA MULTICINE';
  if (upper.includes('SAN MARTIN')) return 'NUBA SAN MARTIN';
  if (upper.includes('VELARDE')) return 'NUBA VELARDE';
  if (upper.includes('VENTURA')) return 'NUBA VENTURA';
  if (upper.includes('06')) return 'NUBA 06';
  if (upper.includes('COMERCIO')) return 'NUBA COMERCIO';
  if (upper.includes('LOS PINOS')) return 'NUBA LOS PINOS';
  if (upper.includes('PRADO')) return 'NUBA PRADO';
  if (upper.includes('SHOPPING')) return 'NUBA SHOPPING';
  if (upper.includes('SUCRE')) return 'NUBA SUCRE';
  if (upper.includes('SAN MIGUEL')) return 'NUBA SAN MIGUEL'; // Fallback only if NOT Andys
  if (upper.includes('ACHUMANI')) return 'NUBA ACHUMANI'; // If NUBA also has Achumani
  if (upper.includes('POTOSI')) return 'NUBA POTOSI'; // If NUBA also has Potosi

  // Fallback: Default to just cleaning it
  const cleaned = name.replace(/ANDYS|YAM YAM|ALMACEN|NUBA|ANDY/gi, '').trim();
  return cleaned ? (isAndys ? `ANDYS ${cleaned.split(' ')[0]}` : `NUBA ${cleaned.split(' ')[0]}`) : name;
};

// --- Interfaces ---
interface PendingOrder {
  qty: number
  date: string
  date_order?: string
  warehouse_id?: number | null
  ref?: string
  partner_id?: number | null
  supplier?: string
  state?: string
  create_date?: string
  order_name?: string
  company_name?: string
  date_planned?: string
}



interface Product {
  id: number
  barcode: string
  default_code?: string
  name: string
  currentStock: number
  total_stock?: number
  location_id?: number
  provider: string
  origen?: string
  last_inventory_date?: string
  // Metrics
  abc_category?: string
  abc_details?: string
  abc_integrity?: string
  total_sales?: number
  currentSales?: number
  currentSalesGlobal?: number
  coverage: number
  coverage_global?: number
  currentStatus: "Normal" | "Deficiente" | "Sin Stock"
  currentPending: number
  total_pending?: number
  pending_orders?: PendingOrder[]
  filteredPendingOrders?: PendingOrder[]
  abc_by_wh?: Record<string, {
    category: string
    rotation: string
    revenue: string
    val_rot: number
    val_rev: number
  }>
  stock_by_wh?: Record<string, number>
  sales_by_wh?: Record<string, number>
  type_name?: string
  brand_name?: string
  category_name?: string
  tags?: string[]
}

interface TransferOrder {
  id: string;
  items: {
    product: any;
    qty: number;
  }[];
  fromName: string;
  toName: string;
  fromId: number;
  toId: number;
  timestamp: string;
  status: 'pending' | 'received';
}

interface ABCSummary {
  rotation: Record<string, number>
  revenue: Record<string, number>
  margin: Record<string, number>
}

// --- Components ---

// --- Filter Dropdown Component ---
const filterVariants = {
  orange: {
    btnActive: 'bg-orange-600 border-orange-500 text-white shadow-orange-500/20',
    iconInactive: 'text-orange-400',
    optionActive: 'text-orange-400 bg-orange-500/10',
  },
  emerald: {
    btnActive: 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20',
    iconInactive: 'text-emerald-400',
    optionActive: 'text-emerald-400 bg-emerald-500/10',
  },
  indigo: {
    btnActive: 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/20',
    iconInactive: 'text-indigo-400',
    optionActive: 'text-indigo-400 bg-indigo-500/10',
  },
  amber: {
    btnActive: 'bg-amber-600 border-amber-500 text-white shadow-amber-500/20',
    iconInactive: 'text-amber-400',
    optionActive: 'text-amber-400 bg-amber-500/10',
  },
  cyan: {
    btnActive: 'bg-cyan-600 border-cyan-500 text-white shadow-cyan-500/20',
    iconInactive: 'text-cyan-400',
    optionActive: 'text-cyan-400 bg-cyan-500/10',
  }
}

// --- Components ---

const ProfileModal = ({ isOpen, onClose, username, avatar, onUpdate }: any) => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newDisplayName, setNewDisplayName] = useState(username)
  const [newAvatar, setNewAvatar] = useState(avatar || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setNewDisplayName(username)
      setNewAvatar(avatar || '')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage({ type: '', text: '' })
    }
  }, [isOpen, username, avatar])

  if (!isOpen) return null

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const token = localStorage.getItem('stock_token') || sessionStorage.getItem('stock_token')
      const payload: any = { token }

      // Username change
      if (newDisplayName !== username) {
        payload.new_username = newDisplayName
      }

      // Password change
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setMessage({ type: 'error', text: 'Las contraseñas no coinciden' })
          setLoading(false)
          return
        }
        if (!currentPassword) {
          setMessage({ type: 'error', text: 'Debes ingresar la contraseña actual' })
          setLoading(false)
          return
        }
        payload.current_password = currentPassword
        payload.new_password = newPassword
      }

      // Avatar change
      if (newAvatar !== avatar) {
        payload.avatar = newAvatar
      }

      // Check if anything changed
      if (!payload.new_password && !payload.avatar && !payload.new_username) {
        onClose()
        return
      }

      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.status === 'success') {
        setMessage({ type: 'success', text: 'Perfil actualizado correctamente' })

        // Update local storage if token or user changed
        if (data.token) {
          if (localStorage.getItem('stock_token')) {
            localStorage.setItem('stock_token', data.token)
            localStorage.setItem('stock_user', data.user)
          } else {
            sessionStorage.setItem('stock_token', data.token)
            sessionStorage.setItem('stock_user', data.user)
          }
        }

        onUpdate({ username: data.user, avatar: data.avatar })
        setTimeout(onClose, 1500)
      } else {
        setMessage({ type: 'error', text: data.message || 'Error al actualizar' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewAvatar(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <User size={20} />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Mi Perfil</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500"><X size={20} /></button>
        </div>

        <form onSubmit={handleUpdate} className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl bg-slate-800 border-2 border-slate-700 overflow-hidden shadow-xl">
                {newAvatar ? (
                  <img src={newAvatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <User size={40} />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer shadow-lg transition-all active:scale-95 group-hover:scale-110">
                <Camera size={16} />
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">Toca la cámara para cambiar foto</p>
          </div>

          {/* User Info Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400">
              <User size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Información de Usuario</span>
            </div>
            <input
              type="text"
              placeholder="Nombre de Usuario"
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500/50 transition-all outline-none text-white font-bold"
              value={newDisplayName}
              onChange={e => setNewDisplayName(e.target.value)}
            />
          </div>

          {/* Password Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Key size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Cambiar Contraseña</span>
            </div>

            <div className="space-y-3">
              <input
                type="password"
                placeholder="Contraseña Actual"
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500/50 transition-all outline-none"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="password"
                  placeholder="Nueva"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500/50 transition-all outline-none"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Confirmar"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500/50 transition-all outline-none"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          {message.text && (
            <div className={`p-4 rounded-2xl text-xs font-bold uppercase tracking-wider text-center ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

function FilterDropdown({
  label,
  icon: Icon,
  value,
  options,
  onChange,
  isOpen,
  onToggle,
  variant = 'orange'
}: {
  label: string
  icon: any
  value: string
  options: { name: string, count: number }[]
  onChange: (val: string) => void
  isOpen: boolean
  onToggle: () => void
  variant: 'orange' | 'emerald' | 'indigo' | 'amber' | 'cyan'
}) {
  const styles = filterVariants[variant]
  const [searchTerm, setSearchTerm] = useState('')

  // Reset search when closed
  useEffect(() => {
    if (!isOpen) setSearchTerm('')
  }, [isOpen])

  const filteredOptions = options.filter(opt =>
    opt.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="relative">
      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 z-10" onClick={onToggle}></div>}

      <button
        onClick={onToggle}
        className={`
          flex items-center gap-3 pl-3 pr-4 py-2 rounded-2xl border transition-all duration-300 shadow-lg backdrop-blur-md z-20 relative group
          ${isOpen || value !== 'All'
            ? styles.btnActive
            : 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 text-slate-400'}
        `}
      >
        <div className={`p-1.5 rounded-lg ${isOpen || value !== 'All' ? 'bg-white/20' : 'bg-slate-800'}`}>
          <Icon size={14} className={isOpen || value !== 'All' ? 'text-white' : styles.iconInactive} />
        </div>

        <div className="flex flex-col items-start gap-0.5 text-left">
          <span className={`text-[9px] font-black uppercase tracking-widest ${isOpen || value !== 'All' ? 'text-white/70' : 'text-slate-500'}`}>{label}</span>
          <span className={`text-xs font-bold max-w-[140px] truncate ${isOpen || value !== 'All' ? 'text-white' : 'text-slate-200'}`}>
            {value === 'All' ? 'Todos' : value}
          </span>
        </div>

        <ChevronRight size={14} className={`ml-2 transition-transform opacity-50 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute top-full mt-2 left-0 min-w-[300px] w-auto max-w-[500px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 pb-2 max-h-[400px] overflow-y-auto custom-scrollbar ring-1 ring-white/10"
          >
            {/* Search Input & Fixed "Todos" */}
            <div className="sticky top-0 bg-slate-900 z-10 border-b border-slate-800/50 rounded-t-2xl">
              <div className="p-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 border border-slate-700 focus:border-indigo-500 focus:outline-none placeholder:text-slate-600"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <button
                onClick={() => { onChange('All'); onToggle(); }}
                className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors hover:bg-slate-800 ${value === 'All' ? styles.optionActive : 'text-slate-400'}`}
              >
                Todos
              </button>
            </div>

            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <button
                  key={opt.name}
                  onClick={() => { onChange(opt.name); onToggle(); }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors hover:bg-slate-800 flex justify-between group items-center
                        ${value === opt.name ? styles.optionActive : 'text-slate-300'}
                    `}
                >
                  <span className="truncate max-w-[500px]">{opt.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${value === opt.name ? 'bg-white/20 text-current' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'}`}>
                    {opt.count}
                  </span>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 italic">No se encontraron resultados</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCard({ label, value, subtext, icon: Icon, color, delay, onClick, active }: any) {
  // Mapping for active states since dynamic tailwind classes don't work well
  const activeStyles: Record<string, string> = {
    'text-rose-500': 'border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-500/20',
    'text-amber-500': 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/20',
    'text-red-600': 'border-red-600 bg-red-600/10 shadow-lg shadow-red-600/20',
    'text-slate-400': 'border-slate-400 bg-slate-400/10 shadow-lg shadow-slate-400/20',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className={`bg-slate-900/50 border p-5 rounded-3xl relative overflow-hidden group transition-all cursor-pointer
        ${active ? activeStyles[color] || 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 hover:border-slate-700'}
      `}
    >
      <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-500 ${color}`}>
        <Icon size={80} />
      </div>
      <div className="relative z-10">
        <div className={`flex items-center gap-2 mb-2 ${color}`}>
          <Icon size={18} />
          <span className="text-xs font-bold uppercase tracking-widest opacity-80">{label}</span>
        </div>
        <div className="text-3xl font-black text-white tracking-tight mb-1">
          {value}
        </div>
        <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
          {subtext}
        </div>
      </div>
    </motion.div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    'Normal': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'Deficiente': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    'Sin Stock': 'bg-rose-500/10 text-rose-500 border-rose-500/20'
  }

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${styles[status as keyof typeof styles] || 'bg-slate-500/10 text-slate-500 border-slate-500/20'
      }`}>
      {status}
    </span>
  )
}

const ProductRow = React.memo(({ p, setSelectedProduct, setActiveTooltip, selectedWarehouseId }: any) => (
  <tr
    onClick={() => setSelectedProduct(p)}
    className="hover:bg-slate-800/20 transition-all cursor-pointer group relative hover:z-20 border-b border-slate-800/50"
  >
    <td className="px-4 py-4">
      <span className="text-xs font-mono text-slate-500">{p.barcode || '-'}</span>
    </td>
    <td className="px-4 py-4 min-w-[200px]">
      <span className="font-semibold text-white group-hover:text-indigo-400 transition-colors leading-tight block whitespace-normal" title={p.name}>{p.name}</span>
    </td>
    <td className="px-4 py-4 min-w-[150px]">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-400 bg-slate-800/30 px-2 py-1 rounded border border-slate-700/50 block whitespace-normal" title={p.provider}>
          {p.provider}
        </span>
        {p.origen && (
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
            {p.origen}
          </span>
        )}
      </div>
    </td>
    <td className="px-4 py-4 text-center">
      <div className="flex flex-col items-center gap-1" title={`ABC Global (R/I/M): ${p.abc_details || '-'}`}>
        <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black uppercase tracking-tight shadow-sm border
                              ${p.abc_category === 'AA' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400/30' :
            p.abc_category === 'A' ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' :
              p.abc_category === 'B' ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' :
                p.abc_category === 'C' ? 'bg-sky-700/20 text-sky-400 border-sky-500/30' :
                  'bg-slate-800 text-slate-500 border-slate-700'}`}>
          {p.abc_category || 'E'}
        </span>
      </div>
    </td>
    {selectedWarehouseId && (
      <td className="px-4 py-4 text-center">
        <div className="flex flex-col items-center gap-1">
          {(() => {
            const localAbc = p.abc_by_wh?.[selectedWarehouseId.toString()]?.category || 'E';
            return (
              <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black uppercase tracking-tight shadow-sm border
                                  ${localAbc === 'AA' ? 'bg-amber-500 text-slate-900 border-amber-300' :
                  localAbc === 'A' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
                    localAbc === 'B' ? 'bg-slate-700/50 text-slate-300 border-slate-600' :
                      'bg-slate-800/10 text-slate-600 border-slate-800/50'}`}
                title={`ABC Sucursal: ${localAbc}`}>
                {localAbc}
              </span>
            );
          })()}
        </div>
      </td>
    )}
    <td className="px-4 py-4 text-center">
      <div className="flex flex-col items-center text-center">
        <span className={`text-base font-bold font-mono ${p.currentStock <= 0 ? "text-rose-500" : "text-white"}`}>
          {p.currentStock}
        </span>
      </div>
    </td>
    <td className="px-4 py-4 text-center">
      <div className="flex flex-col items-center">
        <span className="text-sm font-semibold text-slate-400">
          {p.currentSales?.toLocaleString() || '0'}
        </span>
        {selectedWarehouseId && (
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
            Global: {p.currentSalesGlobal?.toLocaleString() || '0'}
          </span>
        )}
      </div>
    </td>
    <td className="px-4 py-4 text-center">
      <div className={`inline-flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl border min-w-[70px] ${p.coverage < 7 ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
        p.coverage < 15 ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
          "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
        }`}>
        {p.coverage >= 999 ? (
          <span className="text-[8px] font-black uppercase tracking-tighter leading-tight">SIN VENTAS</span>
        ) : (
          <>
            <span className="text-xs font-black">{p.coverage}</span>
            <span className="text-[10px] uppercase tracking-tighter opacity-70">Días</span>
          </>
        )}
      </div>
    </td>
    <td className="px-4 py-4 text-center">
      {p.currentPending > 0 ? (
        <div
          className="relative inline-block cursor-help py-1 px-2 hover:bg-white/5 rounded-lg transition-colors"
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setActiveTooltip({
              product: p,
              x: rect.left,
              y: rect.top
            });
          }}
          onMouseLeave={() => setActiveTooltip(null)}
        >
          <div className="flex items-center justify-center gap-1.5 text-blue-400">
            <ArrowUpRight size={14} />
            <span className="font-bold text-sm tracking-tight">{p.currentPending}</span>
          </div>
        </div>
      ) : (
        <span className="text-slate-700 font-black">-</span>
      )}
    </td>
    <td className="px-4 py-4">
      <div className="flex items-center gap-2">
        {p.abc_integrity !== 'Validado' && p.currentStatus !== 'Normal' && (
          <span title="Error de Costo: Margen Negativo detectado">
            <AlertTriangle size={16} className="text-rose-500 animate-pulse shrink-0" />
          </span>
        )}
        <StatusBadge status={p.currentStatus} />
      </div>
    </td>
  </tr>
))

const TransferRow = React.memo(({
  p,
  sourceStock,
  transferTargetWarehouse,
  transferQty,
  setTransferQuantities,
  selectedWarehouseId,
  warehouses,
  setTransferTargetWarehouse,
  warehouseColumnFilter,
  visibleWarehouses,
  suggestion,
  isOpportunity,
  index,
  setActiveTooltip,
  currentView,
  showMLExplanations,
  useML,
  showMLColumns
}: any) => {
  const [showAIReason, setShowAIReason] = useState(false)
  const destSales = p.sales_by_wh?.[selectedWarehouseId!] || 0;
  return (
    <tr className="hover:bg-slate-800/20 transition-all border-b border-slate-800/50">
      <td className="px-3 py-1.5 sticky left-0 bg-slate-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)] w-[80px] min-w-[80px]">
        <span className="text-[10px] font-mono text-slate-400">{p.barcode || '-'}</span>
      </td>
      <td className="px-3 py-1.5 sticky left-[80px] bg-slate-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)] w-[300px] min-w-[300px] md:w-[450px] md:min-w-[450px]">
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold text-white text-[13px] leading-tight whitespace-normal">{p.name}</span>
            <span className={`text-[8px] font-black px-1.5 rounded border shrink-0 ${(() => {
              // In transfers view, show ABC from source warehouse
              const abcToShow = transferTargetWarehouse
                ? (p.abc_by_wh?.[transferTargetWarehouse.toString()]?.category || p.abc_category)
                : p.abc_category;

              return abcToShow === 'AA' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                abcToShow === 'A' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
                  abcToShow === 'B' ? 'bg-slate-800 text-slate-400 border-slate-700' :
                    'bg-slate-900 text-slate-600 border-slate-800';
            })()}`}>
              {transferTargetWarehouse
                ? (p.abc_by_wh?.[transferTargetWarehouse.toString()]?.category || p.abc_category)
                : p.abc_category}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] text-slate-500 font-bold">{p.provider}</span>
            {p.origen && (
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter bg-slate-800/30 px-1 rounded border border-slate-700/20">{p.origen}</span>
            )}
          </div>
          {currentView === 'ml' && showMLExplanations && suggestion?.ml_data?.top_factors && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {suggestion.ml_data.top_factors.map((f: string, i: number) => (
                <span key={i} className="text-[7px] font-black uppercase tracking-tighter bg-indigo-500/10 text-indigo-400/80 px-1.5 py-0.5 rounded-md border border-indigo-500/20">
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      </td>
      {transferTargetWarehouse ? (
        <>
          {warehouses.filter((w: any) => w.id === transferTargetWarehouse).map((wh: any) => {
            const targetStock = p.stock_by_wh?.[wh.id] || 0;
            const targetSales = p.sales_by_wh?.[wh.id] || 0;
            const targetCov = targetSales > 0 ? Math.round(targetStock / (targetSales / 30)) : 999;
            const displayCov = targetCov > 999 ? 999 : targetCov;

            const projTargetCov = targetSales > 0 ? Math.round((targetStock - transferQty) / (targetSales / 30)) : 999;
            const displayProjCov = projTargetCov > 999 ? 999 : projTargetCov;

            const colorBase = currentView === 'ml' ? 'indigo' : 'emerald';
            return (
              <React.Fragment key={wh.id}>
                <td className="px-2 py-1.5 text-center bg-slate-900 w-[70px] min-w-[70px] sticky left-[380px] md:left-[530px] z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                  <div className={`inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg border transition-all duration-300 ${displayProjCov < 7 ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                    displayProjCov < 15 ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                      `bg-${colorBase}-500/10 border-${colorBase}-500/20 text-${colorBase}-500`
                    }`}>
                    <div className="flex items-center gap-1">
                      <span className={`${displayCov >= 999 ? 'text-[7px]' : 'text-[10px]'} font-black ${transferQty > 0 ? 'opacity-40 line-through scale-90' : ''}`}>
                        {displayCov >= 999 ? 'SIN VENTAS' : displayCov}
                      </span>
                      {transferQty > 0 && (
                        <>
                          <ArrowRight size={8} className="text-rose-400" />
                          <span className={`${displayProjCov >= 999 ? 'text-[7px]' : 'text-[10px]'} font-black animate-pulse`}>
                            {displayProjCov >= 999 ? 'SIN VENTAS' : displayProjCov}
                          </span>
                        </>
                      )}
                    </div>
                    {displayProjCov < 999 && <span className="text-[8px] uppercase tracking-tighter opacity-70">Días</span>}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-center bg-slate-900 w-[140px] min-w-[140px] sticky left-[450px] md:left-[600px] z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`text-sm font-black font-mono ${targetStock <= 0 ? "text-rose-500" : (currentView === 'ml' ? "text-indigo-400" : "text-cyan-400")} ${transferQty > 0 ? 'opacity-40 line-through scale-90' : ''}`}>
                        {Math.round(targetStock)}
                      </span>
                      {transferQty > 0 && (
                        <>
                          <ArrowRight size={10} className="text-rose-400 shadow-sm" />
                          <span className={`text-sm font-black font-mono ${currentView === 'ml' ? "text-indigo-300" : "text-cyan-300"} animate-pulse`}>
                            {Math.round(targetStock - transferQty)}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-60">
                      <TrendingUp size={8} className={currentView === 'ml' ? "text-indigo-500" : "text-cyan-500"} />
                      <span className={`text-[9px] font-bold ${currentView === 'ml' ? "text-indigo-500" : "text-cyan-500"}`}>{targetSales.toFixed(0)} <span className="text-[7px] uppercase opacity-60">VENTAS</span></span>
                    </div>
                    {(() => {
                      const whOrders = (p.pending_orders || []).filter((o: any) => o.warehouse_id === wh.id);
                      const totalPendingInWh = whOrders.reduce((acc: number, curr: any) => acc + curr.qty, 0);
                      if (totalPendingInWh <= 0) return null;

                      return (
                        <div
                          className="absolute -right-1 top-1 text-rose-500 cursor-help"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setActiveTooltip({
                              product: { ...p, filteredPendingOrders: whOrders },
                              x: rect.left,
                              y: rect.top
                            });
                          }}
                          onMouseLeave={() => setActiveTooltip(null)}
                        >
                          <Truck size={10} className="animate-pulse" />
                        </div>
                      );
                    })()}
                  </div>
                </td>

                {/* Machine Learning Specific Columns */}
                {currentView === 'ml' && showMLColumns && (
                  <>
                    <td className="px-3 py-1.5 text-center bg-slate-900 border-l border-indigo-500/10 min-w-[100px]">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-400 line-through opacity-50">{(targetSales / 30).toFixed(2)}</span>
                          <ArrowRight size={8} className="text-indigo-400" />
                          <span className="text-xs font-black text-indigo-400">
                            {suggestion?.ml_data?.v_ml ? suggestion.ml_data.v_ml.toFixed(2) : (targetSales / 30).toFixed(2)}
                          </span>
                        </div>
                        <span className="text-[7px] text-indigo-500/50 uppercase font-black tracking-tighter">Predicción</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-center bg-slate-900 min-w-[80px]">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-purple-400">
                          {suggestion?.ml_data?.lead_time ? `${suggestion.ml_data.lead_time}d` : '---'}
                        </span>
                        <span className="text-[7px] text-purple-500/50 uppercase font-black tracking-tighter">LeadTime</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-center bg-slate-900 min-w-[90px]">
                      <div className="flex flex-col items-center">
                        <div className={`text-[10px] font-black px-1.5 rounded-md ${(suggestion?.ml_data?.risk || 0) > 0.7 ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.3)]' :
                          (suggestion?.ml_data?.risk || 0) > 0.4 ? 'bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-emerald-500 text-white'
                          }`}>
                          {suggestion?.ml_data?.risk ? `${Math.round(suggestion.ml_data.risk * 100)}%` : '0%'}
                        </div>
                        <span className="text-[7px] text-slate-500 uppercase font-bold tracking-tighter mt-1">Riesgo</span>
                      </div>
                    </td>
                  </>
                )}
              </React.Fragment>
            );
          })}
          <td className="px-4 py-1 text-center bg-slate-800/10 w-[110px]">
            {(() => {
              const remoteStock = p.stock_by_wh?.[transferTargetWarehouse!] || 0;
              const maxQty = Math.max(0, Math.floor(remoteStock));
              const isBlocked = maxQty <= 0;

              return (
                <div key="action-cell" className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={maxQty}
                      value={transferQty || ''}
                      onChange={(e) => {
                        const rawVal = e.target.value;
                        if (rawVal === '') {
                          setTransferQuantities((prev: any) => ({ ...prev, [p.id]: '' }));
                          return;
                        }
                        const parsed = parseInt(rawVal, 10);
                        const cleanVal = isNaN(parsed) ? 0 : parsed;
                        const finalVal = Math.min(maxQty, Math.max(0, cleanVal)).toString();
                        setTransferQuantities((prev: any) => ({ ...prev, [p.id]: finalVal }));
                      }}
                      disabled={isBlocked}
                      placeholder="0"
                      className={`w-14 bg-slate-950 border ${isBlocked ? 'border-slate-800 opacity-30 shadow-none' : `border-slate-700 hover:border-${currentView === 'ml' ? 'indigo' : 'emerald'}-500/30`} rounded-lg text-center text-white py-1 focus:outline-none focus:border-${currentView === 'ml' ? 'indigo' : 'emerald'}-500/50 font-mono text-xs font-black transition-all ${suggestion && Number(transferQty) === suggestion.qty ? 'ring-1 ring-indigo-500/50' : ''}`}
                    />

                    {currentView === 'ml' && useML && suggestion && suggestion.qty_formula !== undefined && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded text-[8px] font-black z-20">
                        <span className="text-slate-500">{suggestion.qty_formula}</span>
                        <ArrowRight size={6} className="inline mx-1 text-indigo-500" />
                        <span className="text-indigo-400">{suggestion.qty}</span>
                        <div className="text-[6px] text-slate-600 tracking-tighter uppercase mt-0.5">Formula vs ML</div>
                      </div>
                    )}

                    {suggestion && Number(transferQty) === suggestion.qty && (
                      <div
                        className={`absolute -top-2 -right-2 p-1 ${isOpportunity ? 'bg-amber-600' : 'bg-emerald-600'} rounded-full cursor-help shadow-lg z-20 transition-all ${showAIReason ? 'scale-110 ring-2 ' + (isOpportunity ? 'ring-amber-400' : 'ring-emerald-400') : 'animate-pulse hover:scale-110'}`}
                        onMouseEnter={() => setShowAIReason(true)}
                        onMouseLeave={() => setShowAIReason(false)}
                      >
                        <BrainCircuit size={8} className="text-white" />

                        <AnimatePresence>
                          {showAIReason && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, x: 10 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.9, x: 10 }}
                              className={`absolute ${index < 3 ? 'top-0' : 'bottom-0'} right-full mr-6 w-64 bg-slate-900 border ${isOpportunity ? 'border-amber-500/50' : 'border-emerald-500/50'} p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] pointer-events-none select-none`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className={`text-[10px] ${isOpportunity ? 'text-amber-500' : 'text-emerald-500'} font-extrabold uppercase tracking-widest flex items-center gap-1.5`}>
                                  <BrainCircuit size={12} />
                                  {isOpportunity ? 'OPORTUNIDAD' : 'PRIORITARIO'}
                                </p>
                                {suggestion.score && (
                                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isOpportunity ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                    {suggestion.score}%
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-200 font-medium leading-relaxed">
                                {suggestion.reason || `Sugerido traspasar ${suggestion.qty} unidades.`}
                              </p>
                              <div className={`absolute ${index < 3 ? 'top-3 border-l border-t' : 'bottom-3 border-r border-b'} -right-1.5 w-3 h-3 bg-slate-900 ${isOpportunity ? 'border-amber-500/50' : 'border-emerald-500/50'} rotate-45`}></div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </td>
          <td className="px-4 py-1.5 text-center bg-indigo-500/5 w-[140px] relative">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center gap-1.5">
                <span className={`text-sm font-black font-mono ${sourceStock <= 0 ? "text-rose-500" : "text-indigo-400"} ${transferQty > 0 ? 'opacity-40 line-through scale-90' : ''}`}>
                  {Math.round(sourceStock)}
                </span>
                {transferQty > 0 && (
                  <>
                    <ArrowRight size={10} className="text-emerald-400 shadow-sm" />
                    <span className="text-sm font-black font-mono text-indigo-300 animate-pulse">
                      {Math.round(sourceStock + transferQty)}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-60">
                <TrendingUp size={8} className="text-indigo-500" />
                <span className="text-[9px] font-bold text-indigo-500">{(p.sales_by_wh?.[selectedWarehouseId!] || 0).toFixed(0)} <span className="text-[7px] uppercase opacity-60">VENTAS</span></span>
              </div>
              {(() => {
                const whOrders = (p.pending_orders || []).filter((o: any) => o.warehouse_id === selectedWarehouseId);
                const totalPendingInWh = whOrders.reduce((acc: number, curr: any) => acc + curr.qty, 0);
                if (totalPendingInWh <= 0) return null;

                return (
                  <div
                    className="absolute right-1 top-1 text-rose-500 cursor-help"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setActiveTooltip({
                        product: { ...p, filteredPendingOrders: whOrders },
                        x: rect.left,
                        y: rect.top
                      });
                    }}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <Truck size={10} className="animate-pulse" />
                  </div>
                );
              })()}
            </div>
          </td>
          <td className="px-2 py-1.5 text-center bg-indigo-500/10 w-[70px]">
            {(() => {
              const destSales = p.sales_by_wh?.[selectedWarehouseId!] || 0;
              const destCov = destSales > 0 ? Math.round(sourceStock / (destSales / 30)) : 999;
              const displayDestCov = destCov > 999 ? 999 : destCov;

              const projDestStock = sourceStock + transferQty;
              const projDestCov = destSales > 0 ? Math.round(projDestStock / (destSales / 30)) : 999;
              const displayProjDestCov = projDestCov > 999 ? 999 : projDestCov;

              return (
                <div className={`inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg border transition-all duration-300 ${displayProjDestCov < 7 ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                  displayProjDestCov < 15 ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                    "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  }`}>
                  <div className="flex items-center gap-1">
                    <span className={`${displayDestCov >= 999 ? 'text-[7px]' : 'text-[10px]'} font-black ${transferQty > 0 ? 'opacity-40 line-through scale-90' : ''}`}>
                      {displayDestCov >= 999 ? 'SIN VENTAS' : displayDestCov}
                    </span>
                    {transferQty > 0 && (
                      <>
                        <ArrowRight size={8} className="text-emerald-400" />
                        <span className={`${displayProjDestCov >= 999 ? 'text-[7px]' : 'text-[10px]'} font-black animate-pulse`}>
                          {displayProjDestCov >= 999 ? 'SIN VENTAS' : displayProjDestCov}
                        </span>
                      </>
                    )}
                  </div>
                  {displayProjDestCov < 999 && <span className="text-[8px] uppercase tracking-tighter opacity-70">Días</span>}
                </div>
              );
            })()}
          </td>
        </>
      ) : (
        <>
          <td className="px-2 py-1.5 text-center bg-slate-900 w-[70px] min-w-[70px] sticky left-[380px] md:left-[530px] z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
            {(() => {
              const destSales = p.sales_by_wh?.[selectedWarehouseId!] || 0;
              const destCov = destSales > 0 ? Math.round(sourceStock / (destSales / 30)) : 999;
              const displayDestCov = destCov > 999 ? 999 : destCov;
              return (
                <div className={`inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg border ${displayDestCov < 7 ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                  displayDestCov < 15 ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                    "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  }`}>
                  <span className={`${displayDestCov >= 999 ? 'text-[7px]' : 'text-[10px]'} font-black`}>{displayDestCov >= 999 ? 'SIN VENTAS' : displayDestCov}</span>
                  {displayDestCov < 999 && <span className="text-[8px] uppercase tracking-tighter opacity-70">Días</span>}
                </div>
              );
            })()}
          </td>
          <td className="px-3 py-1.5 text-center bg-slate-900 w-[140px] min-w-[140px] sticky left-[450px] md:left-[600px] z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
            <span className={`text-sm font-black font-mono ${sourceStock <= 0 ? "text-rose-500" : "text-cyan-400"}`}>
              {Math.round(sourceStock)}
            </span>
          </td>
          {currentView === 'ml' && showMLColumns && (
            <>
              <td className="px-3 py-1.5 text-center bg-slate-900 border-l border-indigo-500/10 min-w-[100px]">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-black text-indigo-400">
                    {suggestion?.ml_data?.v_ml ? suggestion.ml_data.v_ml.toFixed(2) : (destSales / 30).toFixed(2)}
                  </span>
                  <span className="text-[7px] text-indigo-500/50 uppercase font-black tracking-tighter">Predicción</span>
                </div>
              </td>
              <td className="px-3 py-1.5 text-center bg-slate-900 min-w-[80px]">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-black text-purple-400">
                    {suggestion?.ml_data?.lead_time ? `${suggestion.ml_data.lead_time}d` : '---'}
                  </span>
                  <span className="text-[7px] text-purple-500/50 uppercase font-black tracking-tighter">LeadTime</span>
                </div>
              </td>
              <td className="px-3 py-1.5 text-center bg-slate-900 min-w-[90px]">
                <div className="flex flex-col items-center">
                  <div className={`text-[10px] font-black px-1.5 rounded-md ${(suggestion?.ml_data?.risk || 0) > 0.7 ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.3)]' :
                    (suggestion?.ml_data?.risk || 0) > 0.4 ? 'bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-emerald-500 text-white'
                    }`}>
                    {suggestion?.ml_data?.risk ? `${Math.round(suggestion.ml_data.risk * 100)}%` : '0%'}
                  </div>
                  <span className="text-[7px] text-slate-500 uppercase font-bold tracking-tighter mt-1">Riesgo</span>
                </div>
              </td>
            </>
          )}
          {visibleWarehouses.map((wh: any, index: number) => {
            const targetStock = p.stock_by_wh?.[wh.id] || 0;
            return (
              <td key={wh.id} className={`px-4 py-2 text-center hover:bg-emerald-500/5 cursor-pointer transition-colors ${index === 0 ? 'border-l-2 border-slate-700/60' : ''}`}
                onClick={() => setTransferTargetWarehouse(wh.id)}
              >
                <span className={`text-xs font-bold font-mono ${targetStock <= 0 ? "text-slate-700" : "text-slate-300"}`}>
                  {Math.round(targetStock)}
                </span>
                {(() => {
                  const whOrders = (p.pending_orders || []).filter((o: any) => o.warehouse_id === wh.id);
                  const totalPendingInWh = whOrders.reduce((acc: number, curr: any) => acc + curr.qty, 0);
                  if (totalPendingInWh <= 0) return null;

                  return (
                    <div
                      className="absolute right-1 top-1 text-rose-500 cursor-help"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setActiveTooltip({
                          product: { ...p, filteredPendingOrders: whOrders },
                          x: rect.left,
                          y: rect.top
                        });
                      }}
                      onMouseLeave={() => setActiveTooltip(null)}
                    >
                      <Truck size={8} className="animate-pulse" />
                    </div>
                  );
                })()}
              </td>
            );
          })}
        </>
      )
      }
    </tr >
  );
});

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(() => {
    const savedView = localStorage.getItem('stock_app_view');
    const savedWarehouseId = localStorage.getItem('stock_selected_warehouse');

    // If we're in transfers view and have a saved warehouse, restore it
    if (savedView === 'transfers' && savedWarehouseId) {
      const parsed = parseInt(savedWarehouseId, 10);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  })

  // Save selectedWarehouseId to localStorage when it changes
  useEffect(() => {
    if (selectedWarehouseId !== null) {
      localStorage.setItem('stock_selected_warehouse', selectedWarehouseId.toString());
    }
  }, [selectedWarehouseId]);
  const prevWarehouseIdRef = useRef<number | null>(null)

  // Loading & Global Stats
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [nextSync, setNextSync] = useState<string | null>(null)
  const [globalStats, setGlobalStats] = useState<any>(null)
  // Tooltip Logic with Delay
  const tooltipTimeoutRef = useRef<any>(null)

  const handleTooltipAction = useCallback((data: any) => {
    if (data) {
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current)
      setActiveTooltip(data)
    } else {
      tooltipTimeoutRef.current = setTimeout(() => setActiveTooltip(null), 300)
    }
  }, [])

  const [abcSummary, setAbcSummary] = useState<ABCSummary | null>(null)

  // Filters
  const [productSearchTerm, setProductSearchTerm] = useState(() => localStorage.getItem('stock_filter_search') || '')
  const [providerSearchTerm, setProviderSearchTerm] = useState('')
  const [selectedProvider, setSelectedProvider] = useState(() => localStorage.getItem('stock_filter_provider') || 'All')

  const [showOnlyDeficient, setShowOnlyDeficient] = useState(() => localStorage.getItem('stock_filter_deficient') === 'true')
  const [showOnlyPending, setShowOnlyPending] = useState(() => localStorage.getItem('stock_filter_pending') === 'true')
  const [showOnlyOutOfStock, setShowOnlyOutOfStock] = useState(() => localStorage.getItem('stock_filter_out_of_stock') === 'true') // Quiebre Sin Pedido
  const [showOnlyOutOfStockWithPending, setShowOnlyOutOfStockWithPending] = useState(() => localStorage.getItem('stock_filter_out_of_stock_pending') === 'true') // Quiebre Con Pedido
  const [pendingDays, setPendingDays] = useState<number | null>(() => {
    const saved = localStorage.getItem('stock_filter_pending_days');
    return saved ? parseInt(saved) : null;
  })

  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const [selectedCategory, setSelectedCategory] = useState<string>(() => localStorage.getItem('stock_filter_abc') || 'All')
  const [selectedOrigin, setSelectedOrigin] = useState<string>(() => localStorage.getItem('stock_filter_origin') || 'All')
  const [selectedStatus, setSelectedStatus] = useState<string>(() => localStorage.getItem('stock_filter_status') || 'All')
  const [selectedCoverage, setSelectedCoverage] = useState<string>(() => localStorage.getItem('stock_filter_coverage') || 'All')

  // New Filters
  const [selectedProductType, setSelectedProductType] = useState<string>(() => localStorage.getItem('stock_filter_type') || 'All')
  const [selectedBrand, setSelectedBrand] = useState<string>(() => localStorage.getItem('stock_filter_brand') || 'All')
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>(() => localStorage.getItem('stock_filter_category') || 'All')
  const [selectedTag, setSelectedTag] = useState<string>(() => localStorage.getItem('stock_filter_tag') || 'All')
  const [selectedCategoryStore, setSelectedCategoryStore] = useState<string>(() => localStorage.getItem('stock_filter_abc_store') || 'All')
  const [warehouseGroupFilter, setWarehouseGroupFilter] = useState<'All' | 'NUBA' | 'ANDYS'>(() => (localStorage.getItem('stock_filter_wh_group') as any) || 'All')
  const [warehouseColumnFilter, setWarehouseColumnFilter] = useState<'All' | 'NUBA' | 'ANDYS'>(() => (localStorage.getItem('stock_filter_wh_column') as any) || 'All')


  // Grouping State
  const [groupBy, setGroupBy] = useState<'type' | 'brand' | 'category' | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [timer, setTimer] = useState(0) // Used to force refresh "Next sync in X min" every min


  // Auth States
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)

  // UI States
  const [currentView, setCurrentView] = useState<'products' | 'transfers' | 'ml'>(() => {
    const saved = localStorage.getItem('stock_app_view');
    return (saved === 'products' || saved === 'transfers' || saved === 'ml') ? saved : 'products';
  })

  // Save view to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('stock_app_view', currentView);
  }, [currentView]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(() => {
    try {
      const saved = localStorage.getItem('selected_product');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  })
  const [showInTransitDetails, setShowInTransitDetails] = useState(() => localStorage.getItem('show_in_transit_details') === 'true')
  useEffect(() => {
    if (!selectedProduct) setShowInTransitDetails(false);
  }, [selectedProduct]);
  const [showAbcSummary, setShowAbcSummary] = useState(false)
  const [activeTooltip, setActiveTooltip] = useState<{ product: Product, x: number, y: number } | null>(null)

  // AI Analysis States
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Reset AI analysis when product changes
  useEffect(() => {
    setAiAnalysis(null)
  }, [selectedProduct?.id])

  const [transferAnalysisResult, setTransferAnalysisResult] = useState<string | null>(() => {
    const saved = localStorage.getItem('transfer_analysis_result');
    return (saved === "null" || saved === null) ? null : saved;
  })

  // Machine Learning Control States
  const [useML, setUseML] = useState(() => localStorage.getItem('stock_ml_active') === 'true')
  const [showMLExplanations, setShowMLExplanations] = useState(() => localStorage.getItem('stock_ml_explanations') === 'true')
  const [showMLColumns, setShowMLColumns] = useState(() => localStorage.getItem('stock_ml_columns') !== 'false')

  useEffect(() => {
    localStorage.setItem('stock_ml_active', String(useML));
  }, [useML]);

  useEffect(() => {
    localStorage.setItem('stock_ml_explanations', String(showMLExplanations));
  }, [showMLExplanations]);

  useEffect(() => {
    localStorage.setItem('stock_ml_columns', String(showMLColumns));
  }, [showMLColumns]);
  const [transferSuggestions, setTransferSuggestions] = useState<{ id: number, qty: number, name: string, reason?: string }[]>(() => {
    try {
      const saved = localStorage.getItem('transfer_suggestions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  })
  const [transferOpportunities, setTransferOpportunities] = useState<{ id: number, qty: number, name: string, reason?: string }[]>(() => {
    try {
      const saved = localStorage.getItem('transfer_opportunities');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  })
  const [transferAnalysisStats, setTransferAnalysisStats] = useState<{ total_aprobados: number, total_oportunidades: number, total_rechazados: number } | null>(() => {
    try {
      const saved = localStorage.getItem('transfer_analysis_stats');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  })
  const [isAnalyzingTransfers, setIsAnalyzingTransfers] = useState(false)
  const [showTransferAnalysisModal, setShowTransferAnalysisModal] = useState(() => localStorage.getItem('show_transfer_analysis_modal') === 'true')
  const [showAnalysisConfirmModal, setShowAnalysisConfirmModal] = useState(false)
  const [showGlobalAnalysisConfirmModal, setShowGlobalAnalysisConfirmModal] = useState(false)
  const [isAnalyzingGlobalTransfers, setIsAnalyzingGlobalTransfers] = useState(false)
  const [globalAnalysisByBranch, setGlobalAnalysisByBranch] = useState<Record<string, any[]>>({})
  const [globalAnalysisByProduct, setGlobalAnalysisByProduct] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('global_analysis_by_product');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  })
  const [globalAnalysisResult, setGlobalAnalysisResult] = useState<string | null>(() => {
    const saved = localStorage.getItem('global_analysis_result');
    return (saved === "null" || saved === null) ? null : saved;
  })
  const [globalAnalysisView, setGlobalAnalysisView] = useState<'branch' | 'product'>(() => (localStorage.getItem('global_analysis_view') as any) || 'product')
  const [stagedGlobalTransfers, setStagedGlobalTransfers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('staged_global_transfers');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  })
  const [globalAnalysisGlobalStats, setGlobalAnalysisGlobalStats] = useState<{ total: number, withSuggestions: number, discarded: number } | null>(() => {
    try {
      const saved = localStorage.getItem('global_analysis_global_stats');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  })
  const [globalAnalysisPhaseFilter, setGlobalAnalysisPhaseFilter] = useState<'ALL' | 'RESCATE' | 'NORMALIZACIÓN'>('ALL')

  const stagedKeys = useMemo(() => new Set(stagedGlobalTransfers.map(t => `${t.product_id}-${t.source_id}`)), [stagedGlobalTransfers]);

  const filteredGlobalAnalysisByProduct = useMemo(() => {
    if (!Array.isArray(globalAnalysisByProduct)) return [];
    return globalAnalysisByProduct.filter((p: any) => globalAnalysisPhaseFilter === 'ALL' || p.phase === globalAnalysisPhaseFilter);
  }, [globalAnalysisByProduct, globalAnalysisPhaseFilter]);

  const ANALYSIS_LIMIT = 4000

  const handleAnalyzeTransfers = async () => {
    if (!transferTargetWarehouse || !selectedWarehouseId || isAnalyzingTransfers) return
    setIsAnalyzingTransfers(true)
    setShowTransferAnalysisModal(true)
    setTransferAnalysisResult(null)
    setTransferSuggestions([]) // Clear previous results immediately
    setTransferOpportunities([])
    setTransferAnalysisStats(null)

    try {
      // Use ONLY the currently filtered/visible products for analysis
      // This respects the user's active filters (ABC, Category, Search, etc.)
      const productsForAnalysis = [...transferFilteredProducts]
        .sort((a, b) => {
          const salesA = a.sales_by_wh?.[selectedWarehouseId!] || 0;
          const stockA = a.stock_by_wh?.[selectedWarehouseId!] || 0;
          const covA = salesA > 0 ? stockA / (salesA / 30) : 999;

          const salesB = b.sales_by_wh?.[selectedWarehouseId!] || 0;
          const stockB = b.stock_by_wh?.[selectedWarehouseId!] || 0;
          const covB = salesB > 0 ? stockB / (salesB / 30) : 999;

          // Critical products first (coverage < 30 days)
          const isCriticalA = covA < 30 ? 0 : 1;
          const isCriticalB = covB < 30 ? 0 : 1;
          if (isCriticalA !== isCriticalB) return isCriticalA - isCriticalB;

          return covA - covB;
        });

      // Calculate local pending (confirmed but not in Odoo)
      const localPending: Record<number, number> = {}; // Coming into destination
      const localOutgoing: Record<number, number> = {}; // Leaving source

      pendingTransfers.forEach(order => {
        // If it's coming to our current destination
        if (order.toId === selectedWarehouseId) {
          order.items.forEach(item => {
            if (item.product) {
              localPending[item.product.id] = (localPending[item.product.id] || 0) + item.qty;
            }
          });
        }
        // If it's leaving our current source
        if (order.fromId === transferTargetWarehouse) {
          order.items.forEach(item => {
            if (item.product) {
              localOutgoing[item.product.id] = (localOutgoing[item.product.id] || 0) + item.qty;
            }
          });
        }
      });

      // Optimizar payload para evitar errores de tamaño/timeout con listas grandes (2000+ productos)
      const cleanedProducts = productsForAnalysis.map(p => ({
        id: p.id,
        name: p.name,
        // Solo enviamos ventas de todos los almacenes (necesario para protección CD)
        sales_by_wh: p.sales_by_wh,
        // Stock, Pendientes y ABC solo del Origen y Destino para reducir tamaño del JSON
        stock_by_wh: {
          [transferTargetWarehouse!]: Math.max(0, (p.stock_by_wh?.[transferTargetWarehouse!] || 0) - (localOutgoing[p.id] || 0)),
          [selectedWarehouseId!]: p.stock_by_wh?.[selectedWarehouseId!]
        },
        pending_by_wh: {
          [selectedWarehouseId!]: (p.pending_by_wh?.[selectedWarehouseId!] || 0) + (localPending[p.id] || 0)
        },
        abc_by_wh: {
          [transferTargetWarehouse!]: p.abc_by_wh?.[transferTargetWarehouse!],
          [selectedWarehouseId!]: p.abc_by_wh?.[selectedWarehouseId!]
        },
        abc_category: p.abc_category
      }));

      const resp = await fetch('/api/analyze_transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: cleanedProducts,
          source_warehouse_id: transferTargetWarehouse,
          target_warehouse_id: selectedWarehouseId,
          source_warehouse_name: warehouses.find(w => w.id === transferTargetWarehouse)?.name || 'Origen',
          target_warehouse_name: warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Destino'
        })
      })
      const data = await resp.json()
      setTransferAnalysisResult(data.analysis)
      setTransferAnalysisStats(data.stats || null)

      const hydrate = (list: any[]) => (list || []).map((s: any) => {
        const product = transferFilteredProducts.find(p =>
          String(p.id) === String(s.id) ||
          p.name.toLowerCase() === String(s.name).toLowerCase()
        );
        if (product) {
          return { ...s, id: product.id, name: product.name, product: product };
        }
        return s;
      });

      setTransferSuggestions(hydrate(data.suggestions || []).filter((s: any) => s.qty > 0))
      setTransferOpportunities(hydrate(data.opportunities || []).filter((s: any) => s.qty > 0))
    } catch (e) {
      setTransferAnalysisResult("Error al conectar con la IA para el análisis de traspasos.")
      setTransferSuggestions([])
      setTransferOpportunities([])
      setTransferAnalysisStats(null)
    } finally {
      setIsAnalyzingTransfers(false)
    }
  }

  const handleAnalyzeAllTransfers = async () => {
    if (isAnalyzingGlobalTransfers) return
    setIsAnalyzingGlobalTransfers(true)
    setGlobalAnalysisResult(null)
    setGlobalAnalysisByBranch({})
    setGlobalAnalysisByProduct({})

    // Calculate local adjustments from Pending Transfers (In Transit)
    const localPending: Record<number, Record<number, number>> = {};
    const localOutgoing: Record<number, Record<number, number>> = {};

    pendingTransfers.forEach(order => {
      order.items.forEach(item => {
        if (item.product) {
          if (!localPending[item.product.id]) localPending[item.product.id] = {};
          localPending[item.product.id][order.toId] = (localPending[item.product.id][order.toId] || 0) + item.qty;

          if (!localOutgoing[item.product.id]) localOutgoing[item.product.id] = {};
          localOutgoing[item.product.id][order.fromId] = (localOutgoing[item.product.id][order.fromId] || 0) + item.qty;
        }
      });
    });

    try {
      // 1. Calcular lista de almacenes que participan (orígenes + destino) - MOVIDO AQUÍ PARA OPTIMIZAR PAYLOAD
      const whList = warehouses.filter(w => {
        if (w.id === null) return false;
        const name = w.name.toUpperCase();
        if (name === 'NUBA MEGACENTER') return false;

        const isCentral = name === 'ALMACEN CENTRAL';
        const isPiso3 = name.includes('ALMACEN PISO 3');
        const isSopocachi = name.includes('ALMACEN SOPOCACHI') || name.includes('NUBA SOPOCACHI');
        const isNuba = name.includes('NUBA') || name.includes('EXPANDIA');
        const isAndyYY = name.includes('ANDY') || name.includes('YAM YAM');

        if (warehouseColumnFilter === 'NUBA') return isNuba || isCentral || isSopocachi;
        if (warehouseColumnFilter === 'ANDYS') return isAndyYY || isCentral || isPiso3;
        return isNuba || isAndyYY || isCentral;
      }).map(w => ({ id: w.id, name: w.name }));

      const relevantWhIds = new Set([selectedWarehouseId, ...whList.map(w => w.id)].filter(Boolean) as number[]);

      // Usar los productos actualmente filtrados con ajustes locales
      const productsForAnalysis = [...transferFilteredProducts].map(p => {
        const stock_by_wh: Record<number, number> = {};
        const sales_by_wh: Record<number, number> = {};
        const pending_by_wh: Record<number, number> = {};
        const abc_by_wh: Record<number, any> = {};

        // Solo enviamos datos de los almacenes que realmente participan en este análisis
        // Esto reduce drásticamente el tamaño del JSON (de ~15MB a <1MB para 3000 productos)
        relevantWhIds.forEach(whId => {
          if (p.stock_by_wh?.[whId] !== undefined) stock_by_wh[whId] = p.stock_by_wh[whId];
          if (p.sales_by_wh?.[whId] !== undefined) sales_by_wh[whId] = p.sales_by_wh[whId];
          if (p.pending_by_wh?.[whId] !== undefined) pending_by_wh[whId] = p.pending_by_wh[whId];
          if (p.abc_by_wh?.[whId]) abc_by_wh[whId] = { category: p.abc_by_wh[whId].category };
        });

        // Aplicar ajustes locales de "En Tránsito" solo para los relevantes
        if (localOutgoing[p.id]) {
          Object.entries(localOutgoing[p.id]).forEach(([whIdStr, qty]) => {
            const whId = Number(whIdStr);
            if (relevantWhIds.has(whId)) {
              stock_by_wh[whId] = (stock_by_wh[whId] || 0) - qty;
            }
          });
        }
        if (localPending[p.id]) {
          Object.entries(localPending[p.id]).forEach(([whIdStr, qty]) => {
            const whId = Number(whIdStr);
            if (relevantWhIds.has(whId)) {
              pending_by_wh[whId] = (pending_by_wh[whId] || 0) + qty;
            }
          });
        }

        return {
          id: p.id,
          name: p.name,
          barcode: p.barcode,
          stock_by_wh,
          sales_by_wh,
          pending_by_wh,
          abc_by_wh,
          abc_category: p.abc_category,
          category_name: p.category_name
        };
      });

      console.log('🔍 Enviando análisis global V2 hacia sucursal:', selectedWarehouseId, { productos: productsForAnalysis.length, sucursales: whList.length });

      const resp = await fetch('/api/analyze_all_transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: productsForAnalysis,
          warehouses: whList,
          destination_warehouse_id: selectedWarehouseId, // Sucursal destino fija
          use_ml: currentView === 'ml' ? useML : false
        })
      })
      const data = await resp.json()

      console.log('📊 Respuesta del análisis global V2:', data);

      setGlobalAnalysisResult(data.analysis || "Análisis completado")

      // Nueva estructura V2: array de objetos con info de producto + top_sources
      const productsData = data.products || []

      // Guardamos la lista completa de análisis por producto
      setGlobalAnalysisByProduct(productsData)
      setGlobalAnalysisByBranch({}) // Ya no usamos vista por sucursal en V2
      setGlobalAnalysisView('product') // Forzar vista de producto

      // Sync with global suggestions if we are in ML view or if desired
      setTransferSuggestions(productsData.map((p: any) => ({
        id: p.product_id,
        qty: p.best_qty,
        qty_formula: p.best_qty_formula,
        name: p.product_name,
        reason: `IA ${p.phase}`,
        ml_data: p.ml_data
      })))

      // Calcular estadísticas
      const totalAnalizados = data.debug?.total_products || productsForAnalysis.length;
      const conTraspasos = productsData.length;
      const descartados = totalAnalizados - conTraspasos;

      setGlobalAnalysisGlobalStats({
        total: totalAnalizados,
        withSuggestions: conTraspasos,
        discarded: descartados
      });

      // Limpiar cola de preparados en nuevo análisis
      setStagedGlobalTransfers([])

      setGlobalAnalysisPhaseFilter('ALL')
      console.log('✅ Estados actualizados V2.1 - Productos analizados:', productsData.length);

      // Manejar versionamiento de caché si es necesario
      if (data.version) {
        localStorage.setItem('global_analysis_version', data.version);
      }

      if (data.debug) {
        console.log('🐞 Debug Info:', data.debug);
      }
    } catch (e) {
      console.error('❌ Error en análisis global V2:', e);
      setGlobalAnalysisResult("Error al realizar el análisis global.")
      setGlobalAnalysisByBranch({})
      setGlobalAnalysisByProduct({})
    } finally {
      setIsAnalyzingGlobalTransfers(false)
    }
  }

  const handleStageGlobalTransfer = (sug: any, product: any) => {
    const transfer = {
      product_id: product.product_id || product.id,
      product_name: product.product_name || product.name || 'Producto Desconocido',
      product_barcode: product.product_barcode || product.barcode || '-',
      source_id: sug.source_id,
      source_name: sug.source_name,
      dest_id: selectedWarehouseId,
      dest_name: warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Destino',
      qty: sug.qty,
      score: sug.score,
      post_coverage_days: sug.dest_post_coverage, // Correcting field name from backend
      source_initial_coverage: sug.source_initial_coverage,
      source_post_coverage: sug.source_post_coverage,
      dest_initial_coverage: sug.dest_initial_coverage,
      dest_post_coverage: sug.dest_post_coverage,
      v_dest: sug.debug_info?.v_dest || 0,
      dest_stock: product.dest_stock,
      max_source_stock: product.stock_by_wh?.[sug.source_id] || 9999 // Cap at source physical stock
    };

    setStagedGlobalTransfers(prev => {
      const isExactMatch = prev.some(t => t.product_id === transfer.product_id && t.source_id === transfer.source_id);

      if (isExactMatch) {
        // Toggle OFF: If clicking the same one, just remove it
        return prev.filter(t => !(t.product_id === transfer.product_id && t.source_id === transfer.source_id));
      } else {
        // Selection per Product: Remove any other source for THIS product and add the new one
        const otherProducts = prev.filter(t => t.product_id !== transfer.product_id);
        return [...otherProducts, transfer];
      }
    });
  };

  const handleUpdateStagedQuantity = (productId: number, sourceId: number, newQty: string) => {
    // Permitir vacío mientras se escribe
    if (newQty === '') {
      setStagedGlobalTransfers(prev => prev.map(t => {
        if (t.product_id === productId && t.source_id === sourceId) {
          return { ...t, qty: '' as any, post_coverage_days: t.dest_initial_coverage };
        }
        return t;
      }));
      return;
    }

    const qtyInt = parseInt(newQty);
    if (isNaN(qtyInt)) return;

    setStagedGlobalTransfers(prev => prev.map(t => {
      if (t.product_id === productId && t.source_id === sourceId) {
        // Cap quantity at max source stock
        const validQty = Math.min(qtyInt, t.max_source_stock || 9999);

        // Recalcular cobertura proyectada
        let newCoverage = t.post_coverage_days;
        if (t.v_dest && t.v_dest > 0) {
          const projectedStock = (t.dest_stock || 0) + validQty;
          newCoverage = projectedStock / t.v_dest;
        }
        return { ...t, qty: validQty, post_coverage_days: newCoverage };
      }
      return t;
    }));
  };

  const handleApplyStagedGlobalTransfers = () => {
    if (stagedGlobalTransfers.length === 0) return;

    // Agrupar por origen para crear múltiples pedidos si es necesario
    const bySource: Record<number, any[]> = {};
    stagedGlobalTransfers.forEach(t => {
      if (!bySource[t.source_id]) bySource[t.source_id] = [];
      bySource[t.source_id].push(t);
    });

    // Para cada origen, crear un pedido pendiente
    const newOrders: TransferOrder[] = Object.entries(bySource).map(([sourceId, items]) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
      const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

      return {
        id: `TR-IA-${timeStr}-${randomPart}-${sourceId}`,
        items: items.map(t => {
          const found = products.find(p => String(p.id) === String(t.product_id));
          return {
            product: found || {
              id: t.product_id,
              name: t.product_name || 'Producto Desconocido',
              barcode: t.product_barcode || '-'
            },
            qty: t.qty
          };
        }),
        fromName: items[0].source_name,
        toName: items[0].dest_name,
        fromId: Number(sourceId),
        toId: Number(items[0].dest_id),
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
    });

    setPendingTransfers(prev => [...newOrders, ...prev]);
    newOrders.forEach(order => logTransferHistory('created', order));

    alert(`¡Se han preparado ${stagedGlobalTransfers.length} traspasos inteligentes hacia ${stagedGlobalTransfers[0].dest_name}!`);

    setStagedGlobalTransfers([]);
    setGlobalAnalysisResult(null);
    setCurrentView('transfers');
  };

  const applyAISuggestions = (includeLowPriority: boolean = false) => {
    // Closes the modal and applies numbers to the main UI for editing
    const newQty: Record<number, string> = { ...transferQuantities }

    // Apply principal suggestions
    transferSuggestions.forEach(s => {
      if (s.qty > 0) newQty[s.id] = s.qty.toString()
    })

    // Apply opportunities if requested
    if (includeLowPriority) {
      transferOpportunities.forEach(s => {
        if (s.qty > 0) newQty[s.id] = s.qty.toString()
      })
    }

    setTransferQuantities(newQty)
    setShowTransferAnalysisModal(false)
  }

  const handleAnalyzeProduct = async () => {
    if (!selectedProduct) return
    setIsAnalyzing(true)
    try {
      const resp = await fetch('/api/analyze_product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: selectedProduct,
          warehouse_id: selectedWarehouseId,
          warehouse_name: warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Vista Global'
        })
      })
      const data = await resp.json()
      setAiAnalysis(data.analysis)
    } catch (e) {
      setAiAnalysis("Error al conectar con la IA.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const [displayLimit, setDisplayLimit] = useState(500)
  const [displayLimitTransfer, setDisplayLimitTransfer] = useState(500)
  const [showWhDropdown, setShowWhDropdown] = useState(false)
  const [showTransferSourceDropdown, setShowTransferSourceDropdown] = useState(false)
  const [showTransferDestDropdown, setShowTransferDestDropdown] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showActionsDropdown, setShowActionsDropdown] = useState(false)
  const [transferSearchTerm, setTransferSearchTerm] = useState(() => localStorage.getItem('transfer_filter_search') || '')
  const [transferSourceWarehouse, setTransferSourceWarehouse] = useState<number | null>(null)
  const [transferCoverageFilter, setTransferCoverageFilter] = useState<string>(() => localStorage.getItem('transfer_coverage_filter') || 'All')

  // Transfer Sorting State
  const [transferSortBy, setTransferSortBy] = useState<string | null>(null)
  const [transferSortOrder, setTransferSortOrder] = useState<'asc' | 'desc'>('asc')

  const handleTransferSort = (field: string) => {
    if (transferSortBy === field) {
      if (transferSortOrder === 'asc') {
        setTransferSortOrder('desc')
      } else {
        setTransferSortBy(null)
        setTransferSortOrder('asc')
      }
    } else {
      setTransferSortBy(field)
      setTransferSortOrder('asc')
    }
  }
  const [transferTargetWarehouse, setTransferTargetWarehouse] = useState<number | null>(() => {
    const saved = localStorage.getItem('transfer_target_wh');
    const num = Number(saved);
    return (saved !== null && !isNaN(num)) ? num : null;
  })
  const [transferQuantities, setTransferQuantities] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem('transfer_work_qty');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Error parsing transfer_work_qty from localStorage", e);
      return {};
    }
  })
  const [transferDirections, setTransferDirections] = useState<Record<number, 'out' | 'in'>>({})
  const [transferToConfirm, setTransferToConfirm] = useState<{
    items: {
      product: any;
      qty: number;
    }[];
    fromName: string;
    toName: string;
    fromId: number;
    toId: number;
  } | null>(null)
  const [pendingTransfers, setPendingTransfers] = useState<TransferOrder[]>(() => {
    try {
      const saved = localStorage.getItem('pending_transfers');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error parsing pending_transfers from localStorage", e);
      return [];
    }
  });
  const [showPendingModal, setShowPendingModal] = useState(() => localStorage.getItem('show_pending_modal') === 'true');
  const [selectedTransferForDetails, setSelectedTransferForDetails] = useState<TransferOrder | null>(null);
  const [modalQuantities, setModalQuantities] = useState<Record<number, string>>({});

  // Transfer History
  type HistoryEntry = {
    id: string;
    timestamp: string;
    action: 'created' | 'deleted' | 'confirmed';
    transferId: string;
    fromName: string;
    toName: string;
    itemCount: number;
    user: string;
  };

  const [transferHistory, setTransferHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('transfer_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [showHistoryModal, setShowHistoryModal] = useState(() => localStorage.getItem('show_history_modal') === 'true');

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('transfer_history', JSON.stringify(transferHistory));
  }, [transferHistory]);

  // Function to log history
  const logTransferHistory = (action: 'created' | 'deleted' | 'confirmed', transfer: TransferOrder) => {
    const entry: HistoryEntry = {
      id: `HIST-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      transferId: transfer.id,
      fromName: transfer.fromName,
      toName: transfer.toName,
      itemCount: transfer.items.length,
      user: userProfile.username || 'Usuario'
    };
    setTransferHistory(prev => [entry, ...prev]);
  };

  // Sync modalQuantities when transferToConfirm opens
  useEffect(() => {
    if (transferToConfirm) {
      const initial: Record<number, string> = {};
      transferToConfirm.items.forEach(item => {
        initial[item.product.id] = item.qty.toString();
      });
      setModalQuantities(initial);
    } else {
      setModalQuantities({});
    }
  }, [transferToConfirm?.items.length]);

  useEffect(() => {
    localStorage.setItem('pending_transfers', JSON.stringify(pendingTransfers));
  }, [pendingTransfers]);

  useEffect(() => {
    const handler = setTimeout(() => {
      localStorage.setItem('transfer_work_qty', JSON.stringify(transferQuantities));
    }, 1000);
    return () => clearTimeout(handler);
  }, [transferQuantities]);

  // Persist Filters
  useEffect(() => { localStorage.setItem('stock_filter_search', productSearchTerm); }, [productSearchTerm]);
  useEffect(() => { localStorage.setItem('stock_filter_provider', selectedProvider); }, [selectedProvider]);
  useEffect(() => { localStorage.setItem('stock_filter_abc', selectedCategory); }, [selectedCategory]);
  useEffect(() => { localStorage.setItem('stock_filter_brand', selectedBrand); }, [selectedBrand]);
  useEffect(() => { localStorage.setItem('stock_filter_category', selectedProductCategory); }, [selectedProductCategory]);
  useEffect(() => { localStorage.setItem('stock_filter_tag', selectedTag); }, [selectedTag]);
  useEffect(() => { localStorage.setItem('stock_filter_origin', selectedOrigin); }, [selectedOrigin]);
  useEffect(() => { localStorage.setItem('stock_filter_status', selectedStatus); }, [selectedStatus]);
  useEffect(() => { localStorage.setItem('stock_filter_type', selectedProductType); }, [selectedProductType]);
  useEffect(() => { localStorage.setItem('stock_filter_abc_store', selectedCategoryStore); }, [selectedCategoryStore]);
  useEffect(() => { localStorage.setItem('stock_filter_wh_group', warehouseGroupFilter); }, [warehouseGroupFilter]);
  useEffect(() => { localStorage.setItem('stock_filter_wh_column', warehouseColumnFilter); }, [warehouseColumnFilter]);
  useEffect(() => { localStorage.setItem('stock_filter_coverage', selectedCoverage); }, [selectedCoverage]);
  useEffect(() => { localStorage.setItem('transfer_filter_search', transferSearchTerm); }, [transferSearchTerm]);
  useEffect(() => { localStorage.setItem('transfer_coverage_filter', transferCoverageFilter); }, [transferCoverageFilter]);

  useEffect(() => {
    if (transferTargetWarehouse) {
      localStorage.setItem('transfer_target_wh', transferTargetWarehouse.toString());
    } else {
      localStorage.removeItem('transfer_target_wh');
    }
  }, [transferTargetWarehouse]);

  useEffect(() => {
    localStorage.setItem('stock_app_view', currentView);
  }, [currentView]);

  // Persist Analysis States
  useEffect(() => {
    if (transferAnalysisResult) localStorage.setItem('transfer_analysis_result', transferAnalysisResult);
    else localStorage.removeItem('transfer_analysis_result');
  }, [transferAnalysisResult]);

  useEffect(() => {
    localStorage.setItem('transfer_suggestions', JSON.stringify(transferSuggestions));
  }, [transferSuggestions]);

  useEffect(() => {
    localStorage.setItem('transfer_opportunities', JSON.stringify(transferOpportunities));
  }, [transferOpportunities]);

  useEffect(() => {
    if (transferAnalysisStats) localStorage.setItem('transfer_analysis_stats', JSON.stringify(transferAnalysisStats));
    else localStorage.removeItem('transfer_analysis_stats');
  }, [transferAnalysisStats]);

  useEffect(() => {
    localStorage.setItem('show_transfer_analysis_modal', showTransferAnalysisModal.toString());
  }, [showTransferAnalysisModal]);

  useEffect(() => {
    localStorage.setItem('global_analysis_by_product', JSON.stringify(globalAnalysisByProduct));
  }, [globalAnalysisByProduct]);

  useEffect(() => {
    if (globalAnalysisResult) localStorage.setItem('global_analysis_result', globalAnalysisResult);
    else localStorage.removeItem('global_analysis_result');
  }, [globalAnalysisResult]);

  useEffect(() => {
    localStorage.setItem('global_analysis_view', globalAnalysisView);
  }, [globalAnalysisView]);

  useEffect(() => {
    localStorage.setItem('staged_global_transfers', JSON.stringify(stagedGlobalTransfers));
  }, [stagedGlobalTransfers]);

  useEffect(() => {
    if (globalAnalysisGlobalStats) localStorage.setItem('global_analysis_global_stats', JSON.stringify(globalAnalysisGlobalStats));
    else localStorage.removeItem('global_analysis_global_stats');
  }, [globalAnalysisGlobalStats]);

  useEffect(() => {
    if (selectedProduct) localStorage.setItem('selected_product', JSON.stringify(selectedProduct));
    else localStorage.removeItem('selected_product');
  }, [selectedProduct]);

  useEffect(() => {
    localStorage.setItem('show_in_transit_details', showInTransitDetails.toString());
  }, [showInTransitDetails]);

  useEffect(() => { localStorage.setItem('stock_filter_deficient', showOnlyDeficient.toString()); }, [showOnlyDeficient]);
  useEffect(() => { localStorage.setItem('stock_filter_pending', showOnlyPending.toString()); }, [showOnlyPending]);
  useEffect(() => { localStorage.setItem('stock_filter_out_of_stock', showOnlyOutOfStock.toString()); }, [showOnlyOutOfStock]);
  useEffect(() => { localStorage.setItem('stock_filter_out_of_stock_pending', showOnlyOutOfStockWithPending.toString()); }, [showOnlyOutOfStockWithPending]);
  useEffect(() => {
    if (pendingDays !== null) localStorage.setItem('stock_filter_pending_days', pendingDays.toString());
    else localStorage.removeItem('stock_filter_pending_days');
  }, [pendingDays]);

  useEffect(() => { localStorage.setItem('show_pending_modal', showPendingModal.toString()); }, [showPendingModal]);
  useEffect(() => { localStorage.setItem('show_history_modal', showHistoryModal.toString()); }, [showHistoryModal]);

  // Limpiar hoja de trabajo si cambias de sucursal de origen (protección de stock)
  useEffect(() => {
    if (prevWarehouseIdRef.current !== null && prevWarehouseIdRef.current !== selectedWarehouseId) {
      setTransferQuantities({});
      // Si el destino es igual al nuevo origen, limpiar destino
      if (transferTargetWarehouse === selectedWarehouseId) {
        setTransferTargetWarehouse(null);
      }
    }
    prevWarehouseIdRef.current = selectedWarehouseId;
  }, [selectedWarehouseId, transferTargetWarehouse]);

  const [userProfile, setUserProfile] = useState({
    username: localStorage.getItem('stock_user') || '',
    avatar: null as string | null
  })

  // Custom Filters State
  const [activeDropdown, setActiveDropdown] = useState<'none' | 'category' | 'provider' | 'origin' | 'abc' | 'abc_store' | 'tag' | 'coverage'>('none')

  const handleDownloadTxt = (items: any[], filename: string) => {
    // Generate content: barcode,qty\n
    const content = items.map(item => {
      const barcode = item.product?.barcode || item.product?.product_barcode || '';
      return `${barcode},${item.qty}`;
    }).join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = () => {
    const isTransfers = currentView === 'transfers';
    const data = isTransfers ? transferFilteredProducts : filteredProducts;

    const dataToExport = data.map(p => {
      const base = {
        'Código': p.barcode || p.default_code || '',
        'Producto': p.name,
        'Proveedor': p.provider || '',
      };

      if (isTransfers) {
        // Source warehouse info
        const sourceWhId = transferTargetWarehouse;
        const sourceStock = sourceWhId ? (p.stock_by_wh?.[sourceWhId] || 0) : 0;
        const sourceSales = sourceWhId ? (p.sales_by_wh?.[sourceWhId] || 0) : 0;

        // Destination warehouse info (current selected warehouse)
        const destWhId = selectedWarehouseId;
        const destStock = destWhId ? (p.stock_by_wh?.[destWhId] || 0) : 0;
        const destSales = destWhId ? (p.sales_by_wh?.[destWhId] || 0) : 0;

        const coverage = (p as any).coverage_by_wh?.[selectedWarehouseId!] ?? 999999;

        return {
          ...base,
          'Stock Origen': Math.floor(sourceStock),
          'Venta Origen (30d)': sourceSales,
          'Stock Destino': Math.floor(destStock),
          'Venta Destino (30d)': destSales,
          'Cobertura Destino (Días)': coverage === 999999 ? 'SIN VENTAS' : Math.floor(coverage),
          'Cant. Traspaso': transferQuantities[p.id] || 0
        };
      } else {
        return {
          ...base,
          'ABC Global': p.abc_category || '',
          ...(selectedWarehouseId ? { 'ABC Sucursal': (p as any).abc_category_store || '' } : {}),
          'Stock': p.currentStock,
          'Venta (30d)': p.currentSales,
          'Cobertura (Días)': p.coverage === 999999 ? 'SIN VENTAS' : Math.floor(p.coverage),
          'Pendiente': p.currentPending || 0,
          'Estado': p.currentStatus
        };
      }
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isTransfers ? "Traspasos" : "Productos");
    XLSX.writeFile(wb, `Stock_Pro_${isTransfers ? 'Traspasos' : 'Productos'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowActionsDropdown(false);
  };

  // --- Excel Styling Helpers ---
  const getBranchStyle = (branchName: string) => {
    const name = branchName ? branchName.toUpperCase() : '';
    if (name.includes('ANDY') || name.includes('YAM')) {
      return { fill: { fgColor: { rgb: "FEE2E2" } }, font: { color: { rgb: "991B1B" } } }; // Red-ish
    } else if (name.includes('NUBA')) {
      return { fill: { fgColor: { rgb: "D1FAE5" } }, font: { color: { rgb: "065F46" } } }; // Green-ish
    } else if (name.includes('ALMACEN') || name.includes('CENTRAL')) {
      return { fill: { fgColor: { rgb: "FEF3C7" } }, font: { color: { rgb: "92400E" } } }; // Amber-ish
    }
    return { fill: { fgColor: { rgb: "FFFFFF" } }, font: { color: { rgb: "000000" } } }; // Default
  };

  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1E293B" } }, // Slate-900
    alignment: { horizontal: "center" }
  };

  const createStyledSheet = (data: any[], destinationKey: string) => {
    const ws = XLSX.utils.json_to_sheet(data);

    // Auto-width (naive)
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...data.map(d => (d[key] ? d[key].toString().length : 0))) + 2
    }));
    ws['!cols'] = colWidths;

    // Apply Styles
    const range = XLSX.utils.decode_range(ws['!ref']!);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) continue;

        if (R === 0) {
          // Header
          ws[cellRef].s = headerStyle;
        } else {
          // Body
          const rowData = data[R - 1]; // data is 0-indexed, rows are 1-indexed (with header at 0)
          const dest = rowData[destinationKey] || '';
          ws[cellRef].s = getBranchStyle(dest);
        }
      }
    }
    return ws;
  };

  const handleDownloadGlobalAnalysisExcel = () => {
    if (!filteredGlobalAnalysisByProduct || filteredGlobalAnalysisByProduct.length === 0) return;

    const exportData = filteredGlobalAnalysisByProduct.map((p: any) => {
      // Mejor recomendación (Plan propuesto o primer top source)
      const bestRec = (p.proposed_plan && p.proposed_plan.length > 0)
        ? p.proposed_plan[0]
        : (p.top_sources && p.top_sources.length > 0 ? p.top_sources[0] : null);

      const sourceName = bestRec ? bestRec.source_name : 'N/A';
      const destName = warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Destino';

      return {
        'Código': p.product_barcode || '',
        'Producto': p.product_name,
        'Stock Destino': p.dest_stock,
        'Cobertura Destino': p.dest_coverage_days?.toFixed(1) || '0',
        'Fase': p.phase,
        // Recommended Transfer
        'Origen Recomendado': sourceName,
        'Destino': destName,
        'Cantidad a Enviar': bestRec ? bestRec.qty : 0,
        'Stock Origen': bestRec ? (p.stock_by_wh?.[bestRec.source_id] || 0) : 0,
        'Cobertura Proyectada': bestRec ? bestRec.dest_post_coverage?.toFixed(1) : '-',
        'Score Match': bestRec ? `${bestRec.score}%` : '-',
        'Justificación': bestRec ? (bestRec.reason || 'IA') : ''
      };
    });

    const ws = createStyledSheet(exportData, 'Destino');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Global_IA");
    XLSX.writeFile(wb, `Analisis_Global_IA_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadTransferAnalysisExcel = () => {
    // For the single-source analysis modal
    if (!transferSuggestions || transferSuggestions.length === 0) return;

    const sourceName = warehouses.find(w => w.id === transferTargetWarehouse)?.name || 'Origen';
    const destName = warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Destino';

    const exportData = transferSuggestions.map((s: any) => {
      const prod = products.find(p => p.id === s.id);
      return {
        'Producto': s.name,
        'De (Origen)': sourceName,
        'A (Destino)': destName,
        'Cantidad Sugerida': s.qty,
        'Motivo': s.reason || 'IA',
        'Stock Destino': prod ? (prod.stock_by_wh?.[selectedWarehouseId!] || 0) : '?',
        'Venta Destino': prod ? (prod.sales_by_wh?.[selectedWarehouseId!] || 0) : '?'
      };
    });

    const ws = createStyledSheet(exportData, 'A (Destino)');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Traspasos_IA");
    XLSX.writeFile(wb, `Analisis_Traspasos_IA_${new Date().toISOString().split('T')[0]}.xlsx`);
  };


  // --- 1. Load Data ---
  useEffect(() => {
    // Check Auth
    let token = localStorage.getItem('stock_token')
    if (!token) {
      token = sessionStorage.getItem('stock_token')
    }

    if (!token) {
      setAuthChecking(false)
      return
    }

    // Verify Token (POST JSON as expected by backend)
    fetch('/api/verify_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') {
          setIsAuthenticated(true)
          setUserProfile({
            username: data.user || 'Usuario',
            avatar: data.avatar || null
          })
        }
        setAuthChecking(false)
      })
      .catch(() => setAuthChecking(false))

  }, [])

  const [initialLoad, setInitialLoad] = useState(true)
  const fetchProducts = useCallback((forceSync: boolean = false) => {
    if (forceSync || initialLoad) setLoading(true)
    const url = forceSync ? '/api/products?sync=true' : '/api/products'

    if (forceSync) {
      console.log("🔄 Iniciando sincronización forzada con Odoo... Esto puede tardar unos segundos.");
    } else {
      console.log("📦 Cargando datos de productos desde el caché...");
    }

    fetch(url)
      .then(async r => {
        const h_next = r.headers.get("X-Next-Sync");
        const h_sync = r.headers.get("X-Is-Syncing");
        const h_last = r.headers.get("X-Last-Update");
        const data = await r.json();
        return { data, h_next, h_sync, h_last };
      })
      .then(({ data, h_next, h_sync, h_last }) => {
        if (data.status === 'syncing') {
          setIsSyncing(true)
          console.log("⏳ El servidor ya está sincronizando. Reintentando en unos segundos...");
          if (data.products) {
            setLastUpdate(data.last_update)
            setNextSync(data.next_sync)
            const whs = data.warehouses || []
            setWarehouses([{ id: null, name: 'VISTA GLOBAL' }, ...whs])
            const loaded: Product[] = data.products.map((p: any) => ({
              ...p,
              currentStock: p.total_stock,
              currentSales: p.sales_30d,
              currentPending: p.total_pending,
              currentStatus: p.total_stock <= 0 ? 'Sin Stock' : 'Normal'
            }))
            setProducts(loaded)
          }
          setLoading(false)
          setTimeout(() => fetchProducts(false), 20000)
          return
        }

        // Use headers if available (faster/real-time), otherwise fallback to data
        const serverIsSyncing = h_sync ? h_sync === 'true' : (data.is_syncing === true);
        setIsSyncing(serverIsSyncing)

        const effectiveNextSync = h_next || data.next_sync;
        const effectiveLastUpdate = data.last_update; // Prefer body for last update as it matches data snapshot

        if (serverIsSyncing) {
          console.log("⏳ El backend reporta sincronización en curso (background)...")
          setTimeout(() => fetchProducts(false), 10000)
        }
        console.log(`✅ Datos recibidos: ${data.products?.length || 0} productos. Última sincro: ${effectiveLastUpdate}`);
        setLastUpdate(effectiveLastUpdate)
        setNextSync(effectiveNextSync)
        setGlobalStats(data.global_stats)
        const whs = data.warehouses || []
        setWarehouses([{ id: null, name: 'VISTA GLOBAL' }, ...whs])
        if (selectedWarehouseId === undefined) {
          setSelectedWarehouseId(null)
        }
        setAbcSummary(data.abc_summary)
        const loaded: Product[] = data.products.map((p: any) => ({
          ...p,
          currentStock: p.total_stock,
          currentSales: p.sales_30d,
          currentPending: p.total_pending,
          currentStatus: p.total_stock <= 0 ? 'Sin Stock' : 'Normal'
        }))
        setProducts(loaded)
        setLoading(false)
        setInitialLoad(false)
      })
      .catch(err => {
        console.error("❌ Error al cargar productos:", err)
        setLoading(false)
        setInitialLoad(false)
        setIsSyncing(false)
      })
  }, [selectedWarehouseId])

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts(false) // Use cache on initial load
    }
  }, [isAuthenticated, fetchProducts])

  // Track if user has active unsaved work to prevent interrupts
  const hasActiveWorkRef = useRef(false)
  useEffect(() => {
    const hasQty = Object.keys(transferQuantities).some(k => transferQuantities[Number(k)] && transferQuantities[Number(k)] !== '0')
    const hasStaged = stagedGlobalTransfers.length > 0
    hasActiveWorkRef.current = ((currentView === 'transfers' || currentView === 'ml') && hasQty) || hasStaged
  }, [currentView, transferQuantities, stagedGlobalTransfers])

  // Timer to refresh countdown and handle auto-polling
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => t + 1)

      // Auto-poll if next sync time is reached
      if (nextSync && !loading && !isSyncing && isAuthenticated) {
        // Prevent auto-refresh if user is actively building a transfer
        if (hasActiveWorkRef.current) {
          console.log("⏸️ Auto-sync paused due to active transfer work.")
          return
        }

        const now = new Date();
        const next = new Date(nextSync);
        if (next.getTime() - now.getTime() <= -5000) { // 5s grace period
          console.log("⏰ Sync time reached. Refreshing data...");
          fetchProducts(false);
        }
      }
    }, 30000) // Check every 30s
    return () => clearInterval(interval)
  }, [nextSync, loading, isSyncing, isAuthenticated, fetchProducts])

  // Filters Visibility Logic
  const hasActiveFilters = useMemo(() => {
    if (currentView === 'products') {
      return (
        productSearchTerm !== '' ||
        selectedProvider !== 'All' ||
        selectedCategory !== 'All' ||
        selectedTag !== 'All' ||
        selectedProductCategory !== 'All' ||
        selectedCategoryStore !== 'All' ||
        selectedStatus !== 'All' ||
        selectedProductType !== 'All' ||
        selectedBrand !== 'All' ||
        selectedCoverage !== 'All' ||
        selectedOrigin !== 'All' ||
        showOnlyDeficient ||
        showOnlyPending ||
        showOnlyOutOfStock ||
        showOnlyOutOfStockWithPending ||
        pendingDays !== null ||
        groupBy !== null
      );
    } else {
      // In Transfers view, check both transfer-specific and common filters
      return (
        transferSearchTerm !== '' ||
        transferCoverageFilter !== 'All' ||
        selectedProvider !== 'All' ||
        selectedOrigin !== 'All' ||
        selectedTag !== 'All' ||
        selectedCategory !== 'All' ||
        selectedProductCategory !== 'All' ||
        selectedCategoryStore !== 'All'
      );
    }
  }, [
    currentView,
    productSearchTerm, selectedProvider, selectedCategory, selectedTag,
    selectedProductCategory, selectedCategoryStore, selectedStatus,
    selectedProductType, selectedBrand, selectedCoverage, selectedOrigin,
    transferSearchTerm, transferCoverageFilter,
    showOnlyDeficient, showOnlyPending, showOnlyOutOfStock,
    showOnlyOutOfStockWithPending, pendingDays, groupBy
  ]);

  // --- 2. Update Product Data based on Warehouse ---
  const baseProcessedProducts = useMemo(() => {
    if (products.length === 0) return []

    return products.map(p => {
      const isGlobal = selectedWarehouseId === null

      const specificStock = isGlobal ? (p as any).total_stock : ((p as any).stock_by_wh?.[selectedWarehouseId!] ?? 0)
      const specificSales = isGlobal ? (p as any).sales_30d : ((p as any).sales_by_wh?.[selectedWarehouseId!] ?? 0)

      // Multi-format support for ABC (handles both new object format and legacy array format)
      const abcCat = (p as any).abc_category || 'E'

      // ABC Sucursal (Store-specific ABC)
      let abcStoreCat = 'E'
      if (!isGlobal && (p as any).abc_by_wh) {
        const whIdStr = selectedWarehouseId!.toString()
        const entry = (p as any).abc_by_wh[whIdStr]
        if (entry) abcStoreCat = entry.category || 'E'
      }

      const coverage = specificSales > 0 ? (specificStock / (specificSales / 30)) : 999

      let status: "Normal" | "Deficiente" | "Sin Stock" = "Normal"
      if (specificStock <= 0) status = "Sin Stock"
      else if (coverage < 7) status = "Deficiente"

      // Process Pending with Date Filter & Warehouse
      let pendingList = ((p as any).pending_orders || []).map((o: any) => ({
        ...o,
        // Keep original dates, don't overwrite with date_planned specifically
        date: o.date_order || o.create_date || o.date
      }))

      if (!isGlobal) {
        pendingList = pendingList.filter((o: any) => o.warehouse_id === selectedWarehouseId)
      }

      if (pendingDays !== null) {
        const now = new Date()
        const getLocalDateStr = (d: Date) => {
          const year = d.getFullYear()
          const month = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }

        const todayStr = getLocalDateStr(now)
        const yesterdayDate = new Date()
        yesterdayDate.setDate(now.getDate() - 1)
        const yesterdayStr = getLocalDateStr(yesterdayDate)

        const threeDaysDate = new Date()
        threeDaysDate.setDate(now.getDate() - 3)
        const threeDaysStr = getLocalDateStr(threeDaysDate)

        const sevenDaysDate = new Date()
        sevenDaysDate.setDate(now.getDate() - 7)
        const sevenDaysStr = getLocalDateStr(sevenDaysDate)

        pendingList = pendingList.filter((o: any) => {
          // STRICT: Only use date_order for age filter
          if (!o.date_order) return false

          const orderDatePart = o.date_order.substring(0, 10)

          if (pendingDays === 1) { // Solo Hoy
            return orderDatePart === todayStr
          } else if (pendingDays === 2) { // Ayer
            return orderDatePart === yesterdayStr
          } else if (pendingDays === 3) { // 3 días (excluyendo hoy y ayer)
            return orderDatePart < yesterdayStr && orderDatePart >= threeDaysStr
          } else if (pendingDays === 7) { // 1 semana (excluyendo hoy, ayer y hace 3 días)
            return orderDatePart < threeDaysStr && orderDatePart >= sevenDaysStr
          }
          return true
        })
      }

      const calculatedPending = pendingList.reduce((acc: number, curr: any) => acc + curr.qty, 0)

      return {
        ...p,
        currentStock: specificStock,
        currentSales: specificSales,
        currentSalesGlobal: (p as any).sales_30d,
        abc_category: abcCat || 'E',
        abc_category_store: abcStoreCat || 'E',
        coverage: Math.round(coverage),
        currentStatus: status,
        currentPending: calculatedPending,
        filteredPendingOrders: pendingList,
        // CLEAN CATEGORY NAME
        category_name: (p.category_name || '').replace(/^All products \/ /, '')
      }
    })
  }, [products, selectedWarehouseId, pendingDays])

  const processedProducts = useMemo(() => {
    return baseProcessedProducts.filter(p => {
      // If Global view, show all products
      if (selectedWarehouseId === null) return true

      // If a specific warehouse is selected, show products with recent sales OR existing stock
      // (This allows showing 'E' category products: Stock > 0 but Sales = 0)
      return p.currentSales > 0 || p.currentStock > 0
    })
  }, [baseProcessedProducts, selectedWarehouseId])


  // --- 3. Filter Logic ---
  // --- 3. Filter Logic & Dynamic Counts ---
  const productMatchStates = useMemo(() => {
    const baseProducts = (currentView === 'transfers' || currentView === 'ml')
      ? (selectedWarehouseId ? processedProducts : baseProcessedProducts)
      : processedProducts;

    return baseProducts.map((p: any) => {
      const providerName = p.provider || 'Sin Proveedor';
      const originName = p.origen || 'N/A';
      const bName = p.brand_name || 'N/A';
      const productSegment = ['FRUVER', 'CARNICERIA', 'GRANIPAN'].includes(bName) ? bName : 'Ninguno';
      const pCat = p.category_name || 'N/A';
      const tags = p.tags || [];
      const abcGlobal = p.abc_category || 'E';

      // En vista de traspasos: si el origen es un Almacén, usamos el ABC del DESTINO.
      // Si no es almacén (traspaso entre salas), usamos el ABC del ORIGEN.
      const abcStore = p.abc_category_store || 'E';

      const matchesProvider = selectedProvider === 'All' || providerName === selectedProvider;
      const matchesOrigin = selectedOrigin === 'All' || originName === selectedOrigin;
      const matchesTag = selectedTag === 'All' || tags.includes(selectedTag);
      const matchesCategory = selectedCategory === 'All' || abcGlobal === selectedCategory;
      const matchesProductCategory = selectedProductCategory === 'All' || pCat === selectedProductCategory;
      const matchesCategoryStore = selectedCategoryStore === 'All' || abcStore === selectedCategoryStore;

      if (currentView === 'transfers' || currentView === 'ml') {
        const matchesSearch = p.name.toLowerCase().includes(transferSearchTerm.toLowerCase()) ||
          (p.barcode && p.barcode.includes(transferSearchTerm));

        const stockInTarget = transferTargetWarehouse ? (p.stock_by_wh?.[transferTargetWarehouse] || 0) : 0;
        const hasStockSomewhere = p.total_stock > 0 ||
          Object.values(p.stock_by_wh || {}).some((s: any) => s > 0);

        const matchesStockMode = transferTargetWarehouse ? (stockInTarget > 0) : hasStockSomewhere;

        const totalStock = p.total_stock || 0;
        const totalSales = p.sales_30d || 0;
        const hasStockOrSales = totalStock > 0 || totalSales > 0;

        // Filtro de cobertura (calculado sobre el almacén de DESTINO)
        let matchesCoverage = true;
        if (transferCoverageFilter !== 'All' && selectedWarehouseId) {
          const currentStock = p.stock_by_wh?.[selectedWarehouseId] || 0;
          const currentSales = p.sales_by_wh?.[selectedWarehouseId] || 0;
          const coverage = currentSales > 0 ? (currentStock / (currentSales / 30)) : 999;

          switch (transferCoverageFilter) {
            case '0-1':
              matchesCoverage = coverage >= 0 && coverage <= 1;
              break;
            case '2-5':
              matchesCoverage = coverage >= 2 && coverage <= 5;
              break;
            case '5-7':
              matchesCoverage = coverage > 5 && coverage <= 7;
              break;
            case '8-10':
              matchesCoverage = coverage >= 8 && coverage <= 10;
              break;
            case '11-15':
              matchesCoverage = coverage >= 11 && coverage <= 15;
              break;
            case '16-20':
              matchesCoverage = coverage >= 16 && coverage <= 20;
              break;
            case '21-30':
              matchesCoverage = coverage >= 21 && coverage <= 30;
              break;
            case '+30':
              matchesCoverage = coverage > 30;
              break;
          }
        }

        return {
          p,
          matchesSearch,
          matchesProvider,
          matchesTag,
          matchesCategory,
          matchesProductCategory,
          matchesCategoryStore,
          matchesStock: matchesStockMode && hasStockOrSales,
          matchesCoverage,
          matchesOrigin,
          // For counts, we consider only Search and Stock as "Always Applied" for the base
          meta: { providerName, originName, bName, productSegment, pCat, tags, abcGlobal, abcStore }
        };
      } else {
        const matchesSearch = p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
          (p.barcode && p.barcode.includes(productSearchTerm));

        const matchesDeficient = !showOnlyDeficient || p.currentStatus === 'Deficiente' || p.currentStatus === 'Sin Stock';
        const matchesPending = !showOnlyPending || (p.currentPending ?? 0) > 0;
        const matchesOutOfStock = !showOnlyOutOfStock || ((p.currentStock ?? 0) <= 0 && (p.currentPending ?? 0) === 0 && (p.currentSales ?? 0) > 0);
        const matchesOutOfStockWithPending = !showOnlyOutOfStockWithPending || ((p.currentStock ?? 0) <= 0 && (p.currentPending ?? 0) > 0);
        const matchesStatus = selectedStatus === 'All' || p.currentStatus === selectedStatus;
        const matchesType = selectedProductType === 'All' || productSegment === selectedProductType;
        const matchesBrand = selectedBrand === 'All' || bName === selectedBrand;
        const matchesAge = pendingDays === null || (p.currentPending ?? 0) > 0;

        let matchesCoverage = true;
        if (selectedCoverage !== 'All') {
          const isGlobal = selectedWarehouseId === null;
          const specificStock = isGlobal ? p.total_stock : (p.stock_by_wh?.[selectedWarehouseId!] || 0);
          const specificSales = isGlobal ? p.sales_30d : (p.sales_by_wh?.[selectedWarehouseId!] || 0);
          const coverage = specificSales > 0 ? (specificStock / (specificSales / 30)) : 999;

          switch (selectedCoverage) {
            case '0-1': matchesCoverage = coverage >= 0 && coverage <= 1; break;
            case '2-5': matchesCoverage = coverage >= 2 && coverage <= 5; break;
            case '5-7': matchesCoverage = coverage > 5 && coverage <= 7; break;
            case '8-10': matchesCoverage = coverage >= 8 && coverage <= 10; break;
            case '11-15': matchesCoverage = coverage >= 11 && coverage <= 15; break;
            case '16-20': matchesCoverage = coverage >= 16 && coverage <= 20; break;
            case '21-30': matchesCoverage = coverage >= 21 && coverage <= 30; break;
            case '+30': matchesCoverage = coverage > 30; break;
          }
        }

        return {
          p,
          matchesSearch,
          matchesProvider,
          matchesTag,
          matchesCategory,
          matchesProductCategory,
          matchesCategoryStore,
          matchesDeficient,
          matchesPending,
          matchesOutOfStock,
          matchesOutOfStockWithPending,
          matchesStatus,
          matchesType,
          matchesBrand,
          matchesAge,
          matchesOrigin,
          matchesCoverage,
          meta: { providerName, originName, bName, productSegment, pCat, tags, abcGlobal, abcStore }
        };
      }
    });
  }, [baseProcessedProducts, processedProducts, currentView, warehouses, selectedWarehouseId, transferSearchTerm, productSearchTerm, selectedProvider, selectedOrigin, selectedTag, selectedCategory, selectedProductCategory, selectedCategoryStore, selectedCoverage, transferTargetWarehouse, transferCoverageFilter, showOnlyDeficient, showOnlyPending, showOnlyOutOfStock, showOnlyOutOfStockWithPending, selectedStatus, selectedProductType, selectedBrand, pendingDays]);

  const transferFilteredProducts = useMemo(() => {
    if (currentView !== 'transfers' && currentView !== 'ml') return [];
    return productMatchStates
      .filter(m => m.matchesSearch && m.matchesProvider && m.matchesOrigin && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesStock && m.matchesCoverage)
      .map(m => m.p);
  }, [productMatchStates, currentView]);

  const sortedTransferProducts = useMemo(() => {
    let products = [...transferFilteredProducts];
    if (!transferSortBy) return products;

    return products.sort((a: any, b: any) => {
      let valA = 0;
      let valB = 0;

      if (transferSortBy === 'origin_stock') {
        if (transferTargetWarehouse) {
          valA = a.stock_by_wh?.[transferTargetWarehouse] || 0;
          valB = b.stock_by_wh?.[transferTargetWarehouse] || 0;
        }
      } else if (transferSortBy === 'origin_coverage') {
        if (transferTargetWarehouse) {
          const stockA = a.stock_by_wh?.[transferTargetWarehouse] || 0;
          const salesA = a.sales_by_wh?.[transferTargetWarehouse] || 0;
          valA = salesA > 0 ? (stockA / (salesA / 30)) : 999;

          const stockB = b.stock_by_wh?.[transferTargetWarehouse] || 0;
          const salesB = b.sales_by_wh?.[transferTargetWarehouse] || 0;
          valB = salesB > 0 ? (stockB / (salesB / 30)) : 999;
        }
      } else if (transferSortBy === 'dest_stock') {
        if (selectedWarehouseId) {
          valA = a.stock_by_wh?.[selectedWarehouseId] || 0;
          valB = b.stock_by_wh?.[selectedWarehouseId] || 0;
        }
      } else if (transferSortBy === 'dest_coverage') {
        if (selectedWarehouseId) {
          const stockA = a.stock_by_wh?.[selectedWarehouseId] || 0;
          const salesA = a.sales_by_wh?.[selectedWarehouseId] || 0;
          valA = salesA > 0 ? (stockA / (salesA / 30)) : 999;

          const stockB = b.stock_by_wh?.[selectedWarehouseId] || 0;
          const salesB = b.sales_by_wh?.[selectedWarehouseId] || 0;
          valB = salesB > 0 ? (stockB / (salesB / 30)) : 999;
        }
      } else if (transferSortBy === 'transfer_qty') {
        valA = Number(transferQuantities[a.id] || 0);
        valB = Number(transferQuantities[b.id] || 0);
      } else if (transferSortBy === 'origin_sales') {
        if (transferTargetWarehouse) {
          valA = a.sales_by_wh?.[transferTargetWarehouse] || 0;
          valB = b.sales_by_wh?.[transferTargetWarehouse] || 0;
        }
      } else if (transferSortBy === 'dest_sales') {
        if (selectedWarehouseId) {
          valA = a.sales_by_wh?.[selectedWarehouseId] || 0;
          valB = b.sales_by_wh?.[selectedWarehouseId] || 0;
        }
      }

      if (valA < valB) return transferSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return transferSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transferFilteredProducts, transferSortBy, transferSortOrder, transferTargetWarehouse, selectedWarehouseId, transferQuantities]);

  const visibleWarehouses = useMemo(() => {
    return warehouses.filter(w => {
      if (w.id === null || w.id === selectedWarehouseId) return false;
      const name = w.name.toUpperCase();
      if (name === 'NUBA MEGACENTER') return false;
      const isCentral = name === 'ALMACEN CENTRAL';
      const isPiso3 = name.includes('ALMACEN PISO 3');
      const isSopocachi = name.includes('ALMACEN SOPOCACHI') || name.includes('NUBA SOPOCACHI');

      // Group validation
      const isNuba = name.includes('NUBA') || name.includes('EXPANDIA');
      const isAndyYY = name.includes('ANDY') || name.includes('YAM YAM');

      // Filter by group: Central shows in both. Piso 3 ONLY in Andys. Sopocachi ONLY in Nuba.
      if (warehouseColumnFilter === 'NUBA') {
        if (!isNuba && !isCentral && !isSopocachi) return false;
      } else if (warehouseColumnFilter === 'ANDYS') {
        if (!isAndyYY && !isCentral && !isPiso3) return false;
      } else if (warehouseColumnFilter === 'All') {
        if (!isNuba && !isAndyYY && !isCentral) return false;
      }

      // MANDATORY sales check, EXCEPT for Central, Piso 3, and Sopocachi
      if (isCentral || isPiso3 || isSopocachi) return true;

      const warehouseSales = transferFilteredProducts.reduce((total, product) => {
        const sales = (product as any).sales_by_wh?.[w.id] || 0;
        return total + sales;
      }, 0);

      return warehouseSales > 0;
    }).sort((a, b) => {
      // Custom sort: ALMACEN CENTRAL first, then ALMACEN PISO 3, then alphabetically
      const nameA = a.name.toUpperCase();
      const nameB = b.name.toUpperCase();

      const isCentralA = nameA === 'ALMACEN CENTRAL';
      const isCentralB = nameB === 'ALMACEN CENTRAL';
      const isPiso3A = nameA.includes('ALMACEN PISO 3');
      const isPiso3B = nameB.includes('ALMACEN PISO 3');

      if (isCentralA) return -1;
      if (isCentralB) return 1;
      if (isPiso3A) return -1;
      if (isPiso3B) return 1;

      return nameA.localeCompare(nameB);
    });
  }, [warehouses, selectedWarehouseId, warehouseColumnFilter, transferFilteredProducts]);


  const filteredProducts = useMemo(() => {
    if (currentView !== 'products') return [];
    let result = productMatchStates
      .filter(m => m.matchesSearch && m.matchesProvider && m.matchesOrigin && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesDeficient && m.matchesPending && m.matchesOutOfStock && m.matchesOutOfStockWithPending && m.matchesStatus && m.matchesType && m.matchesBrand && m.matchesAge && m.matchesCoverage)
      .map(m => m.p);

    if (sortBy) {
      result.sort((a, b) => {
        let valA: any = a[sortBy as keyof Product]
        let valB: any = b[sortBy as keyof Product]

        if (sortBy === 'abc_category' || sortBy === 'abc_category_store') {
          const order = { 'AA': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5 }
          if (sortBy === 'abc_category') {
            valA = order[valA as keyof typeof order] ?? 99
            valB = order[valB as keyof typeof order] ?? 99
          } else if (sortBy === 'abc_category_store') {
            const catA = selectedWarehouseId ? (a.abc_by_wh?.[selectedWarehouseId.toString()]?.category || 'E') : 'E'
            const catB = selectedWarehouseId ? (b.abc_by_wh?.[selectedWarehouseId.toString()]?.category || 'E') : 'E'
            valA = order[catA as keyof typeof order] ?? 99
            valB = order[catB as keyof typeof order] ?? 99
          }
        }
        if (sortBy === 'currentStatus') {
          const order = { 'Sin Stock': 0, 'Deficiente': 1, 'Normal': 2 }
          valA = order[valA as keyof typeof order] ?? 99
          valB = order[valB as keyof typeof order] ?? 99
        }
        if (valA === undefined || valA === null) return 1
        if (valB === undefined || valB === null) return -1
        if (typeof valA === 'string') valA = valA.toLowerCase()
        if (typeof valB === 'string') valB = valB.toLowerCase()
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
    }
    return result;
  }, [productMatchStates, currentView, sortBy, sortOrder, selectedWarehouseId]);

  const productTypes = useMemo(() => {
    const predefinedTypes = ['FRUVER', 'CARNICERIA', 'GRANIPAN', 'Ninguno']
    const counts: Record<string, number> = { 'FRUVER': 0, 'CARNICERIA': 0, 'GRANIPAN': 0, 'Ninguno': 0 }

    productMatchStates.forEach(m => {
      // Products view specific counts: matches everything except 'Type'
      const matchesOthers = m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesDeficient && m.matchesPending && m.matchesOutOfStock && m.matchesOutOfStockWithPending && m.matchesStatus && m.matchesBrand && m.matchesAge;
      if (matchesOthers) {
        counts[m.meta.productSegment] = (counts[m.meta.productSegment] || 0) + 1;
      }
    });

    return predefinedTypes.map(t => ({ name: t, count: counts[t] || 0 }))
  }, [productMatchStates])

  const brands = useMemo(() => {
    const counts: Record<string, number> = {}
    productMatchStates.forEach(m => {
      // Products view specific: matches everything except 'Brand'
      const matchesOthers = m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesDeficient && m.matchesPending && m.matchesOutOfStock && m.matchesOutOfStockWithPending && m.matchesStatus && m.matchesType && m.matchesAge;
      if (matchesOthers) {
        counts[m.meta.bName] = (counts[m.meta.bName] || 0) + 1;
      }
    });

    const allBrands = products.reduce((acc: Set<string>, p) => acc.add(p.brand_name || 'N/A'), new Set<string>());

    return ['All', ...Array.from(allBrands).sort()].map(b => ({
      name: b,
      count: b === 'All' ? filteredProducts.length : counts[b] || 0
    }))
  }, [products, productMatchStates, filteredProducts.length])

  const productCategories = useMemo(() => {
    const counts: Record<string, number> = {}
    productMatchStates.forEach(m => {
      const matchesOthers = (currentView === 'transfers' || currentView === 'ml')
        ? (m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesCategory && m.matchesCategoryStore && m.matchesStock)
        : (m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesCategory && m.matchesCategoryStore && m.matchesDeficient && m.matchesPending && m.matchesOutOfStock && m.matchesOutOfStockWithPending && m.matchesStatus && m.matchesType && m.matchesBrand && m.matchesAge);

      if (matchesOthers) {
        counts[m.meta.pCat] = (counts[m.meta.pCat] || 0) + 1;
      }
    });

    const allCats = products.reduce((acc: Set<string>, p) => acc.add((p.category_name || 'N/A').replace(/^All products \/ /, '')), new Set<string>());

    return ['All', ...Array.from(allCats).sort()].map(c => ({
      name: c,
      count: c === 'All'
        ? (currentView === 'transfers' ? transferFilteredProducts.length : filteredProducts.length)
        : counts[c] || 0
    })).filter(c => c.count > 0) // Solo mostrar categorías con productos

  }, [products, productMatchStates, currentView, transferFilteredProducts.length, filteredProducts.length])

  const providers = useMemo(() => {
    const counts: Record<string, number> = {}
    productMatchStates.forEach(m => {
      const matchesOthers = (currentView === 'transfers' || currentView === 'ml')
        ? (m.matchesSearch && m.matchesOrigin && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesStock)
        : (m.matchesSearch && m.matchesOrigin && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesDeficient && m.matchesPending && m.matchesOutOfStock && m.matchesOutOfStockWithPending && m.matchesStatus && m.matchesType && m.matchesBrand && m.matchesAge);

      if (matchesOthers) {
        counts[m.meta.providerName] = (counts[m.meta.providerName] || 0) + 1;
      }
    });

    const allProviders = products.reduce((acc: Set<string>, p) => acc.add(p.provider || 'Sin Proveedor'), new Set<string>());

    return ['All', ...Array.from(allProviders).sort()].map(prov => ({
      name: prov,
      count: prov === 'All'
        ? ((currentView === 'transfers' || currentView === 'ml') ? transferFilteredProducts.length : filteredProducts.length)
        : counts[prov] || 0
    })).filter(p => p.count > 0)

  }, [products, productMatchStates, currentView, transferFilteredProducts.length, filteredProducts.length, selectedOrigin])

  const origins = useMemo(() => {
    const counts: Record<string, number> = {}
    productMatchStates.forEach(m => {
      const matchesOthers = (currentView === 'transfers' || currentView === 'ml')
        ? (m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesStock)
        : (m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesDeficient && m.matchesPending && m.matchesOutOfStock && m.matchesOutOfStockWithPending && m.matchesStatus && m.matchesType && m.matchesBrand && m.matchesAge);

      if (matchesOthers) {
        counts[m.meta.originName] = (counts[m.meta.originName] || 0) + 1;
      }
    });

    const allOrigins = products.reduce((acc: Set<string>, p) => acc.add(p.origen || 'N/A'), new Set<string>());

    return ['All', ...Array.from(allOrigins).sort()].map(orig => ({
      name: orig,
      count: orig === 'All'
        ? ((currentView === 'transfers' || currentView === 'ml') ? transferFilteredProducts.length : filteredProducts.length)
        : counts[orig] || 0
    })).filter(o => o.count > 0)

  }, [products, productMatchStates, currentView, transferFilteredProducts.length, filteredProducts.length, selectedProvider])

  const productTags = useMemo(() => {
    const counts: Record<string, number> = {}
    productMatchStates.forEach(m => {
      const matchesOthers = (currentView === 'transfers' || currentView === 'ml')
        ? (m.matchesSearch && m.matchesProvider && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesStock && (m as any).matchesCoverage)
        : (m.matchesSearch && m.matchesProvider && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesDeficient && m.matchesPending && m.matchesOutOfStock && m.matchesOutOfStockWithPending && m.matchesStatus && m.matchesType && m.matchesBrand && m.matchesAge);

      if (matchesOthers) {
        m.meta.tags.forEach((t: string) => {
          counts[t] = (counts[t] || 0) + 1;
        });
      }
    });

    const allTags = products.reduce((acc: Set<string>, p) => {
      (p.tags || []).forEach(t => acc.add(t));
      return acc;
    }, new Set<string>());

    return ['All', ...Array.from(allTags).sort()].map(t => ({
      name: t,
      count: t === 'All'
        ? ((currentView === 'transfers' || currentView === 'ml') ? transferFilteredProducts.length : filteredProducts.length)
        : counts[t] || 0
    })).filter(t => t.count > 0);
  }, [products, productMatchStates, currentView, transferFilteredProducts.length, filteredProducts.length])

  const coverageOptions = useMemo(() => {
    const counts: Record<string, number> = {
      '0-1': 0, '2-5': 0, '5-7': 0, '8-10': 0, '11-15': 0, '16-20': 0, '21-30': 0, '+30': 0
    };

    productMatchStates.forEach(m => {
      const matchesOthers = (currentView === 'transfers' || currentView === 'ml')
        ? (m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesStock)
        : (m.matchesSearch && m.matchesProvider && m.matchesOrigin && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesDeficient && m.matchesPending && m.matchesOutOfStock && m.matchesOutOfStockWithPending && m.matchesStatus && m.matchesType && m.matchesBrand && m.matchesAge);

      if (matchesOthers) {
        const isGlobal = selectedWarehouseId === null && currentView === 'products';
        const p = m.p;
        const stock = isGlobal ? p.total_stock : (p.stock_by_wh?.[selectedWarehouseId!] || 0);
        const sales = isGlobal ? p.sales_30d : (p.sales_by_wh?.[selectedWarehouseId!] || 0);
        const coverage = sales > 0 ? (stock / (sales / 30)) : 999;

        if (coverage <= 1) counts['0-1']++;
        else if (coverage <= 5) counts['2-5']++;
        else if (coverage <= 7) counts['5-7']++;
        else if (coverage <= 10) counts['8-10']++;
        else if (coverage <= 15) counts['11-15']++;
        else if (coverage <= 20) counts['16-20']++;
        else if (coverage <= 30) counts['21-30']++;
        else counts['+30']++;
      }
    });

    return [
      { name: 'All', count: (currentView === 'transfers' || currentView === 'ml') ? transferFilteredProducts.length : filteredProducts.length },
      { name: '0-1', count: counts['0-1'] },
      { name: '2-5', count: counts['2-5'] },
      { name: '5-7', count: counts['5-7'] },
      { name: '8-10', count: counts['8-10'] },
      { name: '11-15', count: counts['11-15'] },
      { name: '16-20', count: counts['16-20'] },
      { name: '21-30', count: counts['21-30'] },
      { name: '+30', count: counts['+30'] }
    ];
  }, [productMatchStates, currentView, selectedWarehouseId, transferFilteredProducts.length, filteredProducts.length]);

  const groupedProducts = useMemo(() => {
    if (!groupBy) return null;
    const groups: Record<string, Product[]> = {};

    filteredProducts.forEach(p => {
      let key = 'Otros';
      if (groupBy === 'type') {
        const bName = p.brand_name || '';
        key = ['FRUVER', 'CARNICERIA', 'GRANIPAN'].includes(bName) ? bName : 'Ninguno';
      } else if (groupBy === 'brand') {
        key = p.brand_name || 'Sin Marca';
      } else if (groupBy === 'category') {
        key = p.category_name || 'Sin Categoría';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    return Object.keys(groups).sort().reduce((obj, key) => {
      obj[key] = groups[key];
      return obj;
    }, {} as Record<string, Product[]>);
  }, [filteredProducts, groupBy]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleGroupByToggle = (field: 'type' | 'brand' | 'category') => {
    if (groupBy === field) {
      setGroupBy(null);
    } else {
      setGroupBy(field);
      setExpandedGroups({});
    }
  };

  const abcCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    productMatchStates.forEach(m => {
      const matchesOthers = (currentView === 'transfers' || currentView === 'ml')
        ? (m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesProductCategory && m.matchesCategoryStore && m.matchesStock)
        : (m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesProductCategory && m.matchesCategoryStore && m.matchesDeficient && m.matchesPending && m.matchesOutOfStock && m.matchesOutOfStockWithPending && m.matchesStatus && m.matchesType && m.matchesBrand && m.matchesAge);

      if (matchesOthers) {
        counts[m.meta.abcGlobal] = (counts[m.meta.abcGlobal] || 0) + 1;
      }
    });

    return ['All', 'AA', 'A', 'B', 'C', 'D', 'E'].map(c => ({
      name: c,
      count: c === 'All'
        ? (currentView === 'transfers' ? transferFilteredProducts.length : filteredProducts.length)
        : (counts[c] || 0)
    }));
  }, [productMatchStates, currentView, transferFilteredProducts.length, filteredProducts.length]);

  const abcStoreCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    productMatchStates.forEach(m => {
      // Para que sean complementarios, incluimos matchesCoverage en la validación de otros filtros
      const matchesOthers = (currentView === 'transfers' || currentView === 'ml')
        ? (m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesStock && (m as any).matchesCoverage)
        : (m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesDeficient && m.matchesPending && m.matchesOutOfStock && m.matchesOutOfStockWithPending && m.matchesStatus && m.matchesType && m.matchesBrand && m.matchesAge);

      if (matchesOthers) {
        counts[m.meta.abcStore] = (counts[m.meta.abcStore] || 0) + 1;
      }
    });

    return ['All', 'AA', 'A', 'B', 'C', 'D', 'E'].map(c => ({
      name: c,
      count: c === 'All'
        ? ((currentView === 'transfers' || currentView === 'ml') ? transferFilteredProducts.length : filteredProducts.length)
        : (counts[c] || 0)
    }));
  }, [productMatchStates, currentView, transferFilteredProducts.length, filteredProducts.length]);

  const abcCounts = useMemo(() => {
    const counts: Record<string, number> = { AA: 0, A: 0, B: 0, C: 0, D: 0, E: 0 };
    productMatchStates.forEach(m => {
      const matchesAll = (currentView === 'transfers' || currentView === 'ml')
        ? (m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesStock)
        : (m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesDeficient && m.matchesPending && m.matchesOutOfStock && m.matchesOutOfStockWithPending && m.matchesStatus && m.matchesType && m.matchesBrand && m.matchesAge);

      if (matchesAll) {
        const cat = selectedWarehouseId ? m.meta.abcStore : m.meta.abcGlobal;
        if (counts[cat] !== undefined) counts[cat]++;
      }
    });
    return counts;
  }, [productMatchStates, currentView, selectedWarehouseId]);


  // Handlers
  const toggleSort = (field: string) => {
    if (sortBy === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else {
        setSortBy(null)
        setSortOrder('asc')
      }
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  // Explicitly named to indicate this should ONLY be triggered by USER action (clicking the button)
  // NEVER call this programmatically during sync or data load.
  const handleUserClearFilters = () => {
    // Products view filters
    setProductSearchTerm('');
    setSelectedProvider('All');
    setSelectedOrigin('All');
    setSelectedCategory('All');
    setSelectedTag('All');
    setSelectedProductCategory('All');
    setSelectedCategoryStore('All');
    setSelectedStatus('All');
    setSelectedProductType('All');
    setSelectedBrand('All');
    setSelectedCoverage('All');

    // Transfers view filters
    setTransferSearchTerm('');
    setTransferCoverageFilter('All');

    // Stat filters
    setShowOnlyDeficient(false);
    setShowOnlyPending(false);
    setShowOnlyOutOfStock(false);
    setShowOnlyOutOfStockWithPending(false);
    setPendingDays(null);

    // Grouping
    setGroupBy(null);
    setExpandedGroups({});

    // Reset All localStorage
    localStorage.removeItem('stock_filter_search');
    localStorage.removeItem('stock_filter_provider');
    localStorage.removeItem('stock_filter_origin');
    localStorage.removeItem('stock_filter_abc');
    localStorage.removeItem('stock_filter_status');
    localStorage.removeItem('stock_filter_type');
    localStorage.removeItem('stock_filter_brand');
    localStorage.removeItem('stock_filter_coverage');
    localStorage.removeItem('stock_filter_category');
    localStorage.removeItem('stock_filter_tag');
    localStorage.removeItem('stock_filter_abc_store');
    localStorage.removeItem('transfer_coverage_filter');
    localStorage.removeItem('transfer_filter_search');
  };

  const handleWhSelect = (id: number | null) => {
    setSelectedWarehouseId(id)
    setShowWhDropdown(false)
  }

  // Handlers
  const handleLogin = (token: string, user: string) => {
    setIsAuthenticated(true)
    setUserProfile(prev => ({ ...prev, username: user }))
    // If we have an avatar in localStorage (set after login refresh), it will load in useEffect
  }

  const handleLogout = () => {
    localStorage.removeItem('stock_token')
    localStorage.removeItem('stock_user')
    sessionStorage.removeItem('stock_token')
    sessionStorage.removeItem('stock_user')
    setIsAuthenticated(false)
    window.location.href = '/stock/login'
  }

  if (authChecking) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <RefreshCw className="animate-spin text-indigo-500" size={32} />
    </div>
  }

  if (!isAuthenticated) {
    const isLoginPage = window.location.pathname === '/stock/login' || window.location.pathname === '/stock/login/';
    if (!isLoginPage) {
      window.location.href = '/stock/login';
      return null;
    }
    return <Login onLogin={handleLogin} />
  }



  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-2 md:py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">

            {/* Logo Area */}
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setCurrentView('products')}>
              <div className="relative group">
                <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative bg-slate-900 border border-slate-700 p-2.5 rounded-2xl">
                  <Globe className="text-indigo-400 transform group-hover:rotate-12 transition-transform duration-500" size={28} />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">STOCK <span className="text-indigo-500">PRO</span></h1>
                <div className="flex items-center gap-2">
                  <span className="flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sistema de Gestión Inteligente</p>
                </div>
              </div>
            </div>

            {/* Warehouse Selector */}
            <div className="relative">
              <button
                onClick={() => setShowWhDropdown(!showWhDropdown)}
                className="flex items-center gap-3 bg-slate-900 border border-slate-700 hover:border-indigo-500/50 px-5 py-2.5 rounded-2xl transition-all group min-w-[240px] max-w-[320px]"
              >
                <div className="p-1.5 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                  {selectedWarehouseId === null ? (
                    <Globe size={16} className="text-indigo-400" />
                  ) : (
                    <Box size={16} className="text-indigo-400" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sucursal Actual</span>
                  <span className="block text-sm font-bold text-white truncate">
                    {warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Cargando...'}
                  </span>
                </div>
                <ChevronRight size={14} className={`text-slate-500 transition-transform ${showWhDropdown ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {showWhDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full mt-2 left-0 w-[320px] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl z-20 py-2 max-h-[60vh] overflow-y-auto custom-scrollbar"
                  >
                    {/* Filter Buttons */}
                    <div className="px-3 py-2 border-b border-slate-800/50 mb-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setWarehouseGroupFilter('All')}
                          className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${warehouseGroupFilter === 'All'
                            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                          Todas
                        </button>
                        <button
                          onClick={() => setWarehouseGroupFilter('NUBA')}
                          className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${warehouseGroupFilter === 'NUBA'
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                          NUBA
                        </button>
                        <button
                          onClick={() => setWarehouseGroupFilter('ANDYS')}
                          className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${warehouseGroupFilter === 'ANDYS'
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                          ANDYS/YY
                        </button>
                      </div>
                    </div>

                    {warehouses.filter(wh => {
                      const name = wh.name.toUpperCase();
                      if (name === 'NUBA MEGACENTER') return false;
                      const isCentral = name === 'ALMACEN CENTRAL';
                      const isPiso3 = name.includes('ALMACEN PISO 3');
                      const isSopocachi = name.includes('ALMACEN SOPOCACHI');

                      const isNuba = name.includes('NUBA') || name.includes('EXPANDIA');
                      const isAndyYY = name.includes('ANDY') || name.includes('YAM YAM');

                      // In products view, show all warehouses
                      if (currentView === 'products') {
                        // Apply warehouse group filter
                        if (warehouseGroupFilter === 'NUBA') {
                          if (wh.id === null) return false; // Exclude Global
                          return isNuba || isCentral;
                        } else if (warehouseGroupFilter === 'ANDYS') {
                          if (wh.id === null) return false; // Exclude Global
                          return isAndyYY || isCentral || isPiso3;
                        }
                        return true; // Show all including Global
                      }

                      // In transfers view, filter to allowed warehouses
                      if (wh.id === null) return false; // No Global in transfers

                      // Keep Sopocachi hidden
                      if (isSopocachi) return false;

                      // MANDATORY sales check (Except for Central and Piso 3)
                      if (!isCentral && !isPiso3) {
                        const warehouseSales = transferFilteredProducts.reduce((total, product) => {
                          const sales = (product as any).sales_by_wh?.[wh.id] || 0;
                          return total + sales;
                        }, 0);
                        if (warehouseSales <= 0) return false;
                      }

                      // Apply group filtering
                      if (warehouseGroupFilter === 'NUBA') {
                        return isNuba || isCentral;
                      } else if (warehouseGroupFilter === 'ANDYS') {
                        return isAndyYY || isCentral || isPiso3;
                      }

                      // When "All" is selected: show any NUBA, ANDYS, YAM YAM, or Central
                      return isNuba || isAndyYY || isCentral;

                    }).map(wh => (
                      <button
                        key={wh.id}
                        onClick={() => handleWhSelect(wh.id)}
                        className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors flex items-center justify-between
                           ${selectedWarehouseId === wh.id ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                          `}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedWarehouseId === wh.id ? 'bg-indigo-500' : 'bg-slate-700'}`}></span>
                          {wh.name}
                        </div>
                        {wh.id === null ? <Globe size={14} className="opacity-50" /> : <Box size={14} className="opacity-50" />}
                      </button>
                    ))}

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Search Bar */}


            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:border-indigo-500/50 p-2 rounded-2xl transition-all group"
                title="Mi Perfil"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center overflow-hidden border border-indigo-500/30">
                  {userProfile.avatar ? (
                    <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} className="text-indigo-400" />
                  )}
                </div>
                <div className="text-left flex flex-col justify-center">
                  <span className="block text-[7px] text-slate-500 font-black uppercase tracking-[0.2em] leading-none mb-0.5">Sesión de</span>
                  <span className="block text-xs font-black text-white uppercase tracking-tight leading-none">
                    {userProfile.username || localStorage.getItem('stock_user') || 'Usuario'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => setShowAbcSummary(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                <BarChart3 size={18} />
                <span className="hidden sm:inline text-xs uppercase tracking-wider">Análisis ABC</span>
              </button>

              {/* Actions Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <Settings size={18} />
                  <span className="hidden sm:inline text-xs uppercase tracking-wider">Acciones</span>
                  <ChevronRight size={14} className={`transition-transform ${showActionsDropdown ? 'rotate-90' : ''}`} />
                </button>

                <AnimatePresence>
                  {showActionsDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowActionsDropdown(false)}></div>
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full mt-2 right-0 w-[220px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-20 py-2 overflow-hidden"
                      >
                        <button
                          onClick={() => {
                            setCurrentView('transfers');
                            setShowActionsDropdown(false);
                            // Reset to overview mode initially
                            setTransferTargetWarehouse(null);

                            // Ensure a specific warehouse IS selected as CURRENT (destination)
                            // Always default to ANDYS SAN MIGUEL for transfers
                            const andysSanMiguel = warehouses.find(w =>
                              w.name && w.name.toUpperCase().includes('ANDYS SAN MIGUEL')
                            );

                            if (andysSanMiguel) {
                              setSelectedWarehouseId(andysSanMiguel.id);
                            } else if (selectedWarehouseId === null || selectedWarehouseId === undefined) {
                              // Fallback to first real warehouse if ANDYS SAN MIGUEL not found
                              const firstRealWh = warehouses.find(w => w.id !== null);
                              if (firstRealWh) setSelectedWarehouseId(firstRealWh.id);
                            }
                          }}

                          className="w-full text-left px-4 py-3 text-xs font-bold transition-colors text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 flex items-center gap-3"
                        >
                          <ArrowRightLeft size={16} />
                          <span>Traspasos</span>
                        </button>

                        <button
                          onClick={() => {
                            setCurrentView('ml');
                            setShowActionsDropdown(false);
                            // Initial setup for ML view (similar to transfers)
                            setTransferTargetWarehouse(null);
                            const andysSanMiguel = warehouses.find(w =>
                              w.name && w.name.toUpperCase().includes('ANDYS SAN MIGUEL')
                            );
                            if (andysSanMiguel) {
                              setSelectedWarehouseId(andysSanMiguel.id);
                            }
                          }}
                          className="w-full text-left px-4 py-3 text-xs font-bold transition-colors text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-400 flex items-center gap-3"
                        >
                          <BrainCircuit size={16} />
                          <span>Machine Learning</span>
                        </button>

                        {currentView === 'products' && (
                          <button
                            onClick={handleDownloadExcel}
                            className="w-full text-left px-4 py-3 text-xs font-bold transition-colors text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 flex items-center gap-3 border-t border-slate-800"
                          >
                            <FileSpreadsheet size={16} />
                            <span>Exportar Excel</span>
                          </button>
                        )}

                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleLogout}
                className="p-3 bg-slate-900 border border-slate-700 hover:bg-rose-500/10 hover:border-rose-500/50 hover:text-rose-500 rounded-2xl transition-all text-slate-400"
                title="Cerrar Sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {currentView === 'products' ? (
        <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 md:py-8 space-y-6 md:space-y-8">

          {/* Filter Bar */}
          <section className="bg-slate-900/40 border border-slate-800 p-1.5 rounded-3xl relative z-40">
            <div className="flex items-center gap-2 w-full flex-wrap p-2 shadow-sm">

              {/* Refresh & Sync Info */}
              <div className="flex items-center gap-3 bg-slate-800/50 px-3 py-1.5 rounded-2xl border border-slate-700/50">
                <button
                  onClick={() => {
                    fetchProducts(true) // Force sync from Odoo
                    // REMOVED: Auto-clearing filters as it frustrates users
                  }}

                  className={cn(
                    "p-2 hover:bg-slate-700 rounded-xl transition-all",
                    loading ? "text-indigo-400" : "text-slate-400 hover:text-white"
                  )}
                  title="Actualizar datos y limpiar filtros"
                  disabled={loading || isSyncing}
                >
                  <RefreshCw size={18} className={cn((loading || isSyncing) && "animate-spin")} />
                </button>

                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">Última Sincro</span>
                  <span className="text-xs font-mono text-indigo-400 font-bold leading-none">
                    {lastUpdate ? new Date(lastUpdate).toLocaleString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: 'short'
                    }) : '--:--'}
                  </span>
                </div>

                {nextSync && !loading && !isSyncing && (
                  <div className="flex flex-col border-l border-slate-700/50 pl-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">Próxima Sincro</span>
                    <span className={cn(
                      "text-[10px] font-mono font-bold leading-none",
                      (() => {
                        const now = new Date();
                        const next = new Date(nextSync);
                        return next.getTime() - now.getTime() <= 0 ? "text-amber-400 animate-pulse" : "text-slate-400"
                      })()
                    )}>
                      {(() => {
                        const now = new Date();
                        const next = new Date(nextSync);
                        const diffMs = next.getTime() - now.getTime();
                        const diffMin = Math.max(0, Math.ceil(diffMs / 60000));
                        return diffMin <= 0 ? "Sincronizando..." : `En ${diffMin} min`;
                      })()}
                    </span>
                  </div>
                )}

                {isSyncing && (
                  <div className="flex items-center gap-2 border-l border-indigo-500/20 pl-3 animate-pulse">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter text-nowrap">Sincro en curso...</span>
                  </div>
                )}
              </div>

              <div className="w-px h-8 bg-slate-800 mx-1"></div>



              {/* Dropdowns Group */}
              <div className="flex items-center gap-3 flex-wrap">

                <FilterDropdown
                  label="Categoría"
                  icon={ListFilter}
                  value={selectedProductCategory}
                  options={productCategories.filter(c => c.name !== 'All')}
                  onChange={setSelectedProductCategory}
                  isOpen={activeDropdown === 'category'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'category' ? 'none' : 'category')}
                  variant="orange"
                />

                <FilterDropdown
                  label="Proveedor"
                  icon={Users}
                  value={selectedProvider}
                  options={providers.filter(p => p.name !== 'All')}
                  onChange={setSelectedProvider}
                  isOpen={activeDropdown === 'provider'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'provider' ? 'none' : 'provider')}
                  variant="emerald"
                />

                <FilterDropdown
                  label="Origen"
                  icon={Globe}
                  value={selectedOrigin}
                  options={origins.filter(o => o.name !== 'All')}
                  onChange={setSelectedOrigin}
                  isOpen={activeDropdown === 'origin'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'origin' ? 'none' : 'origin')}
                  variant="emerald"
                />

                <FilterDropdown
                  label="Análisis ABC"
                  icon={BarChart3}
                  value={selectedCategory}
                  options={abcCategories.filter(a => a.name !== 'All')}
                  onChange={setSelectedCategory}
                  isOpen={activeDropdown === 'abc'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'abc' ? 'none' : 'abc')}
                  variant="indigo"
                />

                <FilterDropdown
                  label="Etiqueta"
                  icon={Archive}
                  value={selectedTag}
                  options={productTags.filter(t => t.name !== 'All')}
                  onChange={setSelectedTag}
                  isOpen={activeDropdown === 'tag'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'tag' ? 'none' : 'tag')}
                  variant="amber"
                />

                {selectedWarehouseId && (
                  <FilterDropdown
                    label="ABC Sucursal"
                    icon={Store}
                    value={selectedCategoryStore}
                    options={abcStoreCategories.filter(a => a.name !== 'All')}
                    onChange={setSelectedCategoryStore}
                    isOpen={activeDropdown === 'abc_store'}
                    onToggle={() => setActiveDropdown(activeDropdown === 'abc_store' ? 'none' : 'abc_store')}
                    variant="amber"
                  />
                )}

                <FilterDropdown
                  label="Cobertura"
                  icon={Clock}
                  value={selectedCoverage}
                  options={coverageOptions.filter(o => o.name !== 'All')}
                  onChange={setSelectedCoverage}
                  isOpen={activeDropdown === 'coverage'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'coverage' ? 'none' : 'coverage')}
                  variant="cyan"
                />

                {/* Search Bar - Moved Here */}
                <div className="relative group ml-4 flex-1 min-w-[300px] transition-all duration-300">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700/50 text-white pl-10 pr-4 py-2.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-bold text-xs placeholder:text-slate-600"
                  />
                </div>

                <AnimatePresence>
                  {hasActiveFilters && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8, x: -10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: -10 }}
                      onClick={handleUserClearFilters}
                      className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-500 text-rose-500 hover:text-white px-4 py-2.5 rounded-2xl transition-all group active:scale-95 shadow-lg shadow-rose-500/10"
                      title="Limpiar todos los filtros"
                    >
                      <FilterX size={16} className="transition-transform group-hover:rotate-12" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Limpiar filtros</span>
                    </motion.button>
                  )}
                </AnimatePresence>

              </div>

              {/* Optional Filters */}
              {showOnlyPending && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-2xl ml-4">
                  <Clock size={16} className="text-amber-500" />
                  <span className="text-[10px] font-black text-amber-500/70 uppercase tracking-tighter">Vencimiento:</span>
                  <select
                    value={pendingDays === null ? '' : pendingDays}
                    onChange={(e) => setPendingDays(e.target.value === '' ? null : Number(e.target.value))}
                    className="bg-transparent text-xs font-bold text-amber-200 focus:outline-none cursor-pointer appearance-none"
                  >
                    <option value="" className="bg-slate-900">Toda Antigüedad</option>
                    <option value="1" className="bg-slate-900">Hoy</option>
                    <option value="2" className="bg-slate-900">Ayer</option>
                    <option value="3" className="bg-slate-900">3 días</option>
                    <option value="7" className="bg-slate-900">1 semana</option>
                  </select>
                </div>
              )}
            </div>
          </section >

          {/* Stats Grid */}
          < div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4" >
            <StatCard
              label="Total Items"
              value={loading ? '...' : filteredProducts.length}
              subtext="En vista actual"
              icon={Package}
              color="text-slate-400"
              delay={0.1}
              onClick={() => {
                setShowOnlyDeficient(false);
                setShowOnlyPending(false);
                setShowOnlyOutOfStock(false);
                setShowOnlyOutOfStockWithPending(false);
                setPendingDays(null);
              }}
            />

            <StatCard
              label="Stock Crítico"
              value={loading ? '...' : filteredProducts.filter(p => p.currentStatus !== 'Normal').length}
              subtext="Requieren atención"
              icon={AlertTriangle}
              color="text-rose-500"
              delay={0.2}
              active={showOnlyDeficient}
              onClick={() => setShowOnlyDeficient(!showOnlyDeficient)}
            />

            <StatCard
              label="Solicitudes de Pedidos"
              value={loading ? '...' : filteredProducts.filter(p => (p.currentPending ?? 0) > 0).length}
              subtext="Solicitudes de Cotización"
              icon={Truck}
              color="text-amber-500"
              delay={0.3}
              active={showOnlyPending}
              onClick={() => {
                if (showOnlyPending) setPendingDays(null);
                setShowOnlyPending(!showOnlyPending);
              }}
            />

            <StatCard
              label="En Quiebre"
              value={loading ? '...' : filteredProducts.filter(p => (p.currentStock || 0) <= 0 && (p.currentPending || 0) === 0 && (p.currentSales || 0) > 0).length}
              subtext="Sin Pedido / Con Venta"
              icon={Archive}
              color="text-rose-500"
              delay={0.4}
              active={showOnlyOutOfStock}
              onClick={() => {
                setShowOnlyOutOfStock(!showOnlyOutOfStock);
                setShowOnlyOutOfStockWithPending(false);
              }}
            />

            <StatCard
              label="Quiebre / Pedido"
              value={loading ? '...' : filteredProducts.filter(p => (p.currentStock || 0) <= 0 && (p.currentPending || 0) > 0).length}
              subtext="En camino / Sin Stock"
              icon={Truck}
              color="text-indigo-400"
              delay={0.5}
              active={showOnlyOutOfStockWithPending}
              onClick={() => {
                setShowOnlyOutOfStockWithPending(!showOnlyOutOfStockWithPending);
                setShowOnlyOutOfStock(false);
              }}
            />
          </div >

          {/* Product Table */}
          <div className="flex-1 bg-slate-900/40 border border-slate-800/50 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm relative">
            <div className="h-[calc(100vh-380px)] overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800">
                  <tr className="text-slate-500 text-[10px] uppercase tracking-[0.1em] font-black">
                    <th className="px-4 py-4 w-[90px]">Código</th>
                    <th className="px-4 py-4 cursor-pointer hover:text-indigo-400 group/h" onClick={() => toggleSort('name')}>
                      <div className="flex items-center gap-2">
                        Producto
                        <div className="flex flex-col">
                          <ArrowUpDown size={12} className={cn("transition-colors", sortBy === 'name' ? "text-indigo-500 opacity-100" : "opacity-30 group-hover/h:opacity-60")} />
                          {sortBy === 'name' && <div className="h-0.5 w-full bg-indigo-500 mt-0.5 rounded-full" />}
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-4 cursor-pointer hover:text-indigo-400 group/h w-[100px]" onClick={() => toggleSort('provider')}>
                      <div className="flex items-center gap-2">
                        Proveedor
                        <div className="flex flex-col">
                          <ArrowUpDown size={12} className={cn("transition-colors", sortBy === 'provider' ? "text-indigo-500 opacity-100" : "opacity-30 group-hover/h:opacity-60")} />
                          {sortBy === 'provider' && <div className="h-0.5 w-full bg-indigo-500 mt-0.5 rounded-full" />}
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-4 text-center cursor-pointer hover:text-indigo-400 group/h w-[55px]" onClick={() => toggleSort('abc_category')}>
                      <div className="flex items-center justify-center gap-2" title="ABC Global">
                        <Globe size={14} className="opacity-50" />
                        <div className="flex flex-col">
                          <ArrowUpDown size={12} className={cn("transition-colors", sortBy === 'abc_category' ? "text-indigo-500 opacity-100" : "opacity-30 group-hover/h:opacity-60")} />
                          {sortBy === 'abc_category' && <div className="h-0.5 w-full bg-indigo-500 mt-0.5 rounded-full" />}
                        </div>
                      </div>
                    </th>
                    {selectedWarehouseId && (
                      <th className="px-4 py-4 text-center cursor-pointer hover:text-indigo-400 group/h w-[55px]" onClick={() => toggleSort('abc_category_store' as any)}>
                        <div className="flex items-center justify-center gap-2" title="ABC Sucursal">
                          <Store size={14} className={cn("opacity-50", sortBy === 'abc_category_store' ? "text-indigo-500 opacity-100" : "text-indigo-400")} />
                          <div className="flex flex-col">
                            <ArrowUpDown size={12} className={cn("transition-colors", sortBy === 'abc_category_store' ? "text-indigo-500 opacity-100" : "opacity-30 group-hover/h:opacity-60")} />
                            {sortBy === 'abc_category_store' && <div className="h-0.5 w-full bg-indigo-500 mt-0.5 rounded-full" />}
                          </div>
                        </div>
                      </th>
                    )}
                    <th className="px-4 py-4 text-center cursor-pointer hover:text-indigo-400 group/h w-[75px]" onClick={() => toggleSort('currentStock')}>
                      <div className="flex items-center justify-center gap-2">
                        Stock
                        <div className="flex flex-col">
                          <ArrowUpDown size={12} className={cn("transition-colors", sortBy === 'currentStock' ? "text-indigo-500 opacity-100" : "opacity-30 group-hover/h:opacity-60")} />
                          {sortBy === 'currentStock' && <div className="h-0.5 w-full bg-indigo-500 mt-0.5 rounded-full" />}
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-4 text-center cursor-pointer hover:text-indigo-400 group/h w-[75px]" onClick={() => toggleSort('currentSales')}>
                      <div className="flex items-center justify-center gap-2">
                        Venta
                        <div className="flex flex-col">
                          <ArrowUpDown size={12} className={cn("transition-colors", sortBy === 'currentSales' ? "text-indigo-500 opacity-100" : "opacity-30 group-hover/h:opacity-60")} />
                          {sortBy === 'currentSales' && <div className="h-0.5 w-full bg-indigo-500 mt-0.5 rounded-full" />}
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-4 text-center cursor-pointer hover:text-indigo-400 group/h w-[75px]" onClick={() => toggleSort('coverage')}>
                      <div className="flex items-center justify-center gap-2">
                        Cobert.
                        <div className="flex flex-col">
                          <ArrowUpDown size={12} className={cn("transition-colors", sortBy === 'coverage' ? "text-indigo-500 opacity-100" : "opacity-30 group-hover/h:opacity-60")} />
                          {sortBy === 'coverage' && <div className="h-0.5 w-full bg-indigo-500 mt-0.5 rounded-full" />}
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-4 text-center cursor-pointer hover:text-indigo-400 group/h w-[75px]" onClick={() => toggleSort('currentPending')}>
                      <div className="flex items-center justify-center gap-2">
                        Pend.
                        <div className="flex flex-col">
                          <ArrowUpDown size={12} className={cn("transition-colors", sortBy === 'currentPending' ? "text-indigo-500 opacity-100" : "opacity-30 group-hover/h:opacity-60")} />
                          {sortBy === 'currentPending' && <div className="h-0.5 w-full bg-indigo-500 mt-0.5 rounded-full" />}
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-4 cursor-pointer hover:text-indigo-400 group/h w-[145px]" onClick={() => toggleSort('currentStatus')}>
                      <div className="flex items-center gap-2 justify-center">
                        Estado
                        <div className="flex flex-col">
                          <ArrowUpDown size={12} className={cn("transition-colors", sortBy === 'currentStatus' ? "text-indigo-500 opacity-100" : "opacity-30 group-hover/h:opacity-60")} />
                          {sortBy === 'currentStatus' && <div className="h-0.5 w-full bg-indigo-500 mt-0.5 rounded-full" />}
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {loading ? (
                    <tr><td colSpan={9} className="py-20 text-center"><RefreshCw className="animate-spin inline-block text-indigo-500" size={32} /></td></tr>
                  ) : (groupBy && groupedProducts) ? (
                    // Grouped Mode
                    Object.keys(groupedProducts).map(groupName => (
                      <React.Fragment key={groupName}>
                        {/* Group Header */}
                        <tr
                          onClick={() => toggleGroup(groupName)}
                          className="bg-slate-900/80 hover:bg-slate-800 transition-colors cursor-pointer border-b border-slate-800"
                        >
                          <td colSpan={9} className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <ChevronRight size={16} className={`text-slate-400 transition-transform ${expandedGroups[groupName] ? 'rotate-90' : ''}`} />
                              <span className="text-sm font-black text-white uppercase tracking-wider">{groupName}</span>
                              <span className="text-xs font-mono text-slate-500">({groupedProducts[groupName].length})</span>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded Items */}
                        {expandedGroups[groupName] && groupedProducts[groupName].map(p => (
                          <ProductRow key={p.id} p={p} setSelectedProduct={setSelectedProduct} setActiveTooltip={handleTooltipAction} selectedWarehouseId={selectedWarehouseId} />
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    // Flat List (No Group)
                    <>
                      {filteredProducts.slice(0, displayLimit).map(p => (
                        <ProductRow key={p.id} p={p} setSelectedProduct={setSelectedProduct} setActiveTooltip={handleTooltipAction} selectedWarehouseId={selectedWarehouseId} />
                      ))}
                      {filteredProducts.length > displayLimit && (
                        <tr>
                          <td colSpan={9} className="text-center py-6">
                            <button onClick={() => setDisplayLimit(l => l + 500)} className="text-indigo-400 hover:text-indigo-300 font-bold text-xs uppercase tracking-widest">
                              Cargar más ({filteredProducts.length - displayLimit} restantes)
                            </button>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      ) : currentView === 'transfers' ? (
        /* Transfers Section */
        <main className="max-w-[1600px] mx-auto px-2 md:px-6 py-4 md:py-8 space-y-4 md:space-y-8">
          {/* Header Bar */}
          <section className="bg-slate-900/40 border border-slate-800 p-3 md:p-6 rounded-3xl relative z-40">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-4">
                <button
                  onClick={() => setCurrentView('products')}
                  className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
                  title="Volver a Productos"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                    <ArrowRightLeft size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2 md:gap-3">
                      Gestión de Traspasos
                      <span className="text-[12px] md:text-[14px] font-black text-emerald-400 bg-emerald-500/10 px-2 md:px-3 py-0.5 rounded-full border border-emerald-500/20">
                        {transferFilteredProducts.length}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{transferTargetWarehouse ? 'Modo Traspaso' : 'Comparación de stock entre sucursales'}</p>
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex flex-wrap items-center gap-2 md:gap-4">
                {/* Warehouse Column Filter Buttons */}
                {!transferTargetWarehouse && (
                  <div className="flex items-center gap-2 bg-slate-800/30 px-3 py-2 rounded-2xl border border-slate-700/50">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Mostrar:</span>
                    <button
                      onClick={() => setWarehouseColumnFilter('All')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'All'
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      Todas
                    </button>
                    <button
                      onClick={() => setWarehouseColumnFilter('NUBA')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'NUBA'
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      NUBA
                    </button>
                    <button
                      onClick={() => setWarehouseColumnFilter('ANDYS')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'ANDYS'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      ANDYS/YY
                    </button>
                  </div>
                )}

                <AnimatePresence>
                  {transferTargetWarehouse && Object.values(transferQuantities).some(q => Number(q) > 0) && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2"
                    >
                      <button
                        onClick={() => setTransferQuantities({})}
                        className="p-3 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Limpiar todo"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          const itemsToTransfer = products
                            .filter(p => Number(transferQuantities[p.id] || 0) > 0)
                            .map(p => ({ product: p, qty: Number(transferQuantities[p.id]) }));

                          // Invertido: Pedir Stock (Destino = Actual, Origen = Dropdown)
                          const targetName = warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Principal';
                          const sourceWh = warehouses.find(w => w.id === transferTargetWarehouse);

                          setTransferToConfirm({
                            items: itemsToTransfer,
                            fromName: sourceWh?.name || 'Origen',
                            toName: targetName,
                            fromId: transferTargetWarehouse!,
                            toId: selectedWarehouseId!
                          });
                        }}
                        className="bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/30 text-emerald-400 hover:text-white font-black uppercase tracking-widest text-[11px] px-6 py-2.5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
                      >
                        <Check size={16} strokeWidth={3} />
                        Confirmar {Object.values(transferQuantities).filter(q => Number(q) > 0).length}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>



                <button
                  onClick={() => setShowPendingModal(true)}
                  className="p-2.5 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-slate-400 hover:text-emerald-400 rounded-xl transition-all flex items-center gap-2 relative group"
                  title="Ver traspasos en camino"
                >
                  <Truck size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">En Camino</span>
                  {pendingTransfers.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[8px] font-black flex items-center justify-center rounded-full shadow-lg border border-slate-900 animate-pulse">
                      {pendingTransfers.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="p-2.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-slate-400 hover:text-indigo-400 rounded-xl transition-all flex items-center gap-2 relative group"
                  title="Ver historial de traspasos"
                >
                  <History size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Historial</span>
                </button>

                {transferTargetWarehouse && selectedWarehouseId && (
                  <button
                    onClick={() => setShowAnalysisConfirmModal(true)}
                    className="px-4 py-2.5 bg-indigo-600/90 hover:bg-indigo-600 border border-indigo-500/50 text-white rounded-xl transition-all flex items-center gap-2 relative group shadow-lg shadow-indigo-500/20"
                    title="Analizar situación de traspasos con IA"
                  >
                    <BrainCircuit size={18} className={cn(isAnalyzingTransfers && "animate-pulse")} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Análisis IA</span>
                  </button>
                )}

                {/* Solo mostrar Análisis Global cuando hay 3+ sucursales Y no hay origen/destino seleccionado */}
                {warehouses.filter(w => w.id !== null).length >= 3 && !transferTargetWarehouse && (
                  <button
                    onClick={() => setShowGlobalAnalysisConfirmModal(true)}
                    className="px-4 py-2.5 bg-emerald-600/90 hover:bg-emerald-600 border border-emerald-500/50 text-white rounded-xl transition-all flex items-center gap-2 relative group shadow-lg shadow-emerald-500/20"
                    title="Analizar mejores traspasos desde TODAS las sucursales"
                  >
                    <BrainCircuit size={18} className={cn(isAnalyzingGlobalTransfers && "animate-pulse")} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Análisis Global IA</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filters & Search Bar */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <FilterDropdown
                label="Categoría"
                icon={ListFilter}
                value={selectedProductCategory}
                options={productCategories.filter(c => c.name !== 'All')}
                onChange={setSelectedProductCategory}
                isOpen={activeDropdown === 'category'}
                onToggle={() => setActiveDropdown(activeDropdown === 'category' ? 'none' : 'category')}
                variant="orange"
              />

              <FilterDropdown
                label="Proveedor"
                icon={Users}
                value={selectedProvider}
                options={providers.filter(p => p.name !== 'All')}
                onChange={setSelectedProvider}
                isOpen={activeDropdown === 'provider'}
                onToggle={() => setActiveDropdown(activeDropdown === 'provider' ? 'none' : 'provider')}
                variant="emerald"
              />

              <FilterDropdown
                label="Origen"
                icon={Globe}
                value={selectedOrigin}
                options={origins.filter(o => o.name !== 'All')}
                onChange={setSelectedOrigin}
                isOpen={activeDropdown === 'origin'}
                onToggle={() => setActiveDropdown(activeDropdown === 'origin' ? 'none' : 'origin')}
                variant="emerald"
              />

              <FilterDropdown
                label="Análisis ABC"
                icon={BarChart3}
                value={selectedCategory}
                options={abcCategories.filter(a => a.name !== 'All')}
                onChange={setSelectedCategory}
                isOpen={activeDropdown === 'abc'}
                onToggle={() => setActiveDropdown(activeDropdown === 'abc' ? 'none' : 'abc')}
                variant="indigo"
              />

              <FilterDropdown
                label="Etiqueta"
                icon={Archive}
                value={selectedTag}
                options={productTags.filter(t => t.name !== 'All')}
                onChange={setSelectedTag}
                isOpen={activeDropdown === 'tag'}
                onToggle={() => setActiveDropdown(activeDropdown === 'tag' ? 'none' : 'tag')}
                variant="amber"
              />

              {selectedWarehouseId && (
                <FilterDropdown
                  label="ABC Sucursal"
                  icon={Store}
                  value={selectedCategoryStore}
                  options={abcStoreCategories.filter(a => a.name !== 'All')}
                  onChange={setSelectedCategoryStore}
                  isOpen={activeDropdown === 'abc_store'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'abc_store' ? 'none' : 'abc_store')}
                  variant="amber"
                />
              )}

              <FilterDropdown
                label="Cobertura"
                icon={Clock}
                value={transferCoverageFilter}
                options={coverageOptions.filter(o => o.name !== 'All')}
                onChange={setTransferCoverageFilter}
                isOpen={activeDropdown === 'coverage'}
                onToggle={() => setActiveDropdown(activeDropdown === 'coverage' ? 'none' : 'coverage')}
                variant="cyan"
              />

              <div className="relative group flex-1 min-w-[200px] md:min-w-[300px]">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search className="text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={transferSearchTerm}
                  onChange={(e) => setTransferSearchTerm(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 text-white pl-10 pr-4 py-2.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-bold text-sm placeholder:text-slate-600"
                />
              </div>

              <AnimatePresence>
                {hasActiveFilters && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 20 }}
                    onClick={handleUserClearFilters}
                    className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-500 text-rose-500 hover:text-white px-4 py-2.5 rounded-2xl transition-all group active:scale-95 shadow-lg shadow-rose-500/10"
                    title="Limpiar todos los filtros"
                  >
                    <FilterX size={16} className="transition-transform group-hover:rotate-12" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Limpiar filtros</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

          </section>

          {/* Products Comparison Table */}
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="h-[calc(100vh-320px)] overflow-auto custom-scrollbar relative">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-30 bg-slate-950 border-b border-slate-800 shadow-xl">
                  {/* Group header row - shows "SUCURSAL ACTUAL" label in comparison mode */}
                  {!transferTargetWarehouse && (
                    <tr className="bg-slate-950 border-b border-slate-800/40">
                      <th className="sticky left-0 bg-slate-950 z-40 w-[80px] min-w-[80px]"></th>
                      <th className="sticky left-[80px] bg-slate-950 z-40 w-[300px] min-w-[300px] md:w-[450px] md:min-w-[450px]"></th>
                      <th colSpan={2} className="sticky left-[380px] md:left-[530px] bg-slate-950 z-40 px-2 py-1 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                        <div className="flex items-center justify-center gap-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-2 py-0.5 mx-1">
                          <span className="text-[8px] text-cyan-400 font-black uppercase tracking-widest">◆ Sucursal Actual</span>
                        </div>
                      </th>
                      {visibleWarehouses.map((wh: any, i: number) => (
                        <th key={wh.id} className={`bg-slate-950 ${i === 0 ? 'border-l-2 border-slate-700/60' : ''}`}></th>
                      ))}
                    </tr>
                  )}
                  <tr className="text-slate-500 text-[10px] uppercase tracking-[0.1em] font-black">
                    <th className="px-3 py-2 w-[80px] min-w-[80px] sticky left-0 bg-slate-950 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Código</th>
                    <th className="px-3 py-2 w-[300px] min-w-[300px] md:w-[450px] md:min-w-[450px] sticky left-[80px] bg-slate-950 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.3)] text-left">Producto</th>
                    {transferTargetWarehouse ? (
                      <>
                        <th className="px-2 py-2 text-center w-[70px] min-w-[70px] sticky left-[380px] md:left-[530px] bg-slate-950 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.3)] cursor-pointer hover:bg-slate-900 group" onClick={() => handleTransferSort('origin_coverage')}>
                          <div className="flex flex-col items-center bg-cyan-500/5 py-1 rounded-lg relative">
                            <Clock size={12} className="mb-1 text-cyan-400/70" />
                            <span className="text-cyan-500/70">Cobert.</span>
                            {transferSortBy === 'origin_coverage' && (
                              <div className="absolute top-1 right-1 text-cyan-500">
                                {transferSortOrder === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                              </div>
                            )}
                          </div>
                        </th>
                        <th className="px-1 py-2 text-center w-[140px] min-w-[140px] sticky left-[450px] md:left-[600px] bg-slate-950 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.3)] cursor-pointer group relative"
                          onClick={() => setShowTransferSourceDropdown(!showTransferSourceDropdown)}
                        >
                          <div className="flex flex-col items-center bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors py-1 rounded-lg relative overflow-hidden px-2">
                            {/* Sorting controls overlay */}
                            <div className="absolute top-0 right-0 p-1 flex items-center gap-0.5 z-10">
                              <div onClick={(e) => { e.stopPropagation(); handleTransferSort('origin_stock'); }} className="p-0.5 hover:bg-cyan-500/20 rounded cursor-pointer transition-colors" title="Ordenar por Stock">
                                {transferSortBy === 'origin_stock' ? (
                                  transferSortOrder === 'asc' ? <ArrowUp size={8} className="text-cyan-400" /> : <ArrowDown size={8} className="text-cyan-400" />
                                ) : (
                                  <ArrowUpDown size={8} className="text-cyan-500/30 hover:text-cyan-400" />
                                )}
                              </div>
                              <div onClick={(e) => { e.stopPropagation(); handleTransferSort('origin_sales'); }} className="p-0.5 hover:bg-cyan-500/20 rounded cursor-pointer transition-colors" title="Ordenar por Ventas">
                                {transferSortBy === 'origin_sales' ? (
                                  transferSortOrder === 'asc' ? <SortAsc size={8} className="text-cyan-400" /> : <TrendingUp size={8} className="text-cyan-400" />
                                ) : (
                                  <TrendingUp size={8} className="text-cyan-500/30 hover:text-cyan-400" />
                                )}
                              </div>
                            </div>

                            <Store size={14} className="mb-0.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                            <div className="flex items-center gap-1 text-cyan-400 group-hover:text-cyan-300">
                              <span className="font-bold border-b border-dashed border-cyan-500/30 whitespace-nowrap px-1">
                                {warehouses.find(w => w.id === transferTargetWarehouse)?.name}
                              </span>
                              <ChevronDown size={10} className={`text-cyan-500/70 transition-transform ${showTransferSourceDropdown ? 'rotate-180' : ''}`} />
                            </div>
                            <span className="text-[7px] text-cyan-500/70 uppercase font-bold mt-0.5">Origen</span>
                          </div>

                          <AnimatePresence>
                            {showTransferSourceDropdown && (
                              <>
                                <div className="fixed inset-0 z-[50]" onClick={(e) => { e.stopPropagation(); setShowTransferSourceDropdown(false); }}></div>
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute top-full mt-2 left-0 w-[220px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-[60] py-2 max-h-[300px] overflow-y-auto custom-scrollbar text-left"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => {
                                      setTransferTargetWarehouse(null);
                                      setShowTransferSourceDropdown(false);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-[10px] font-bold transition-colors flex items-center gap-2 text-slate-400 hover:bg-slate-800 hover:text-white border-b border-slate-800/50 mb-1 pb-2"
                                  >
                                    <LayoutGrid size={12} className="opacity-50" />
                                    -- Volver a Comparar --
                                  </button>
                                  {visibleWarehouses.map(wh => (
                                    <button
                                      key={wh.id}
                                      onClick={() => {
                                        setTransferTargetWarehouse(wh.id);
                                        setShowTransferSourceDropdown(false);
                                      }}
                                      className={`w-full text-left px-4 py-2.5 text-[10px] font-bold transition-colors flex items-center gap-2
                                         ${transferTargetWarehouse === wh.id ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                                       `}
                                    >
                                      <Store size={12} className={transferTargetWarehouse === wh.id ? 'text-emerald-500' : 'opacity-50'} />
                                      {wh.name}
                                    </button>
                                  ))}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </th>
                        <th className="px-4 py-2 text-center w-[110px] bg-slate-950 cursor-pointer hover:bg-slate-900 group" onClick={() => handleTransferSort('transfer_qty')}>
                          <div className="flex flex-col items-center bg-slate-800/50 py-1 rounded-lg relative">
                            <ArrowRight size={12} className="mb-0.5 text-slate-400" />
                            <span className="text-slate-400">Cantidad</span>
                            {transferSortBy === 'transfer_qty' && (
                              <div className="absolute top-1 right-1 text-emerald-500">
                                {transferSortOrder === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                              </div>
                            )}
                          </div>
                        </th>
                        <th className="px-1 py-2 text-center w-auto min-w-[160px] bg-slate-950 cursor-pointer group relative"
                          onClick={() => setShowTransferDestDropdown(!showTransferDestDropdown)}
                        >
                          <div className="flex flex-col items-center bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors py-1 rounded-lg relative overflow-hidden px-2">
                            {/* Sorting controls overlay */}
                            <div className="absolute top-0 right-0 p-1 flex items-center gap-0.5 z-10">
                              <div onClick={(e) => { e.stopPropagation(); handleTransferSort('dest_stock'); }} className="p-0.5 hover:bg-indigo-500/20 rounded cursor-pointer transition-colors" title="Ordenar por Stock">
                                {transferSortBy === 'dest_stock' ? (
                                  transferSortOrder === 'asc' ? <ArrowUp size={8} className="text-indigo-400" /> : <ArrowDown size={8} className="text-indigo-400" />
                                ) : (
                                  <ArrowUpDown size={8} className="text-indigo-500/30 hover:text-indigo-400" />
                                )}
                              </div>
                              <div onClick={(e) => { e.stopPropagation(); handleTransferSort('dest_sales'); }} className="p-0.5 hover:bg-indigo-500/20 rounded cursor-pointer transition-colors" title="Ordenar por Ventas">
                                {transferSortBy === 'dest_sales' ? (
                                  transferSortOrder === 'asc' ? <SortAsc size={8} className="text-indigo-400" /> : <TrendingUp size={8} className="text-indigo-400" />
                                ) : (
                                  <TrendingUp size={8} className="text-indigo-500/30 hover:text-indigo-400" />
                                )}
                              </div>
                            </div>

                            <Store size={14} className="mb-0.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                            <div className="flex items-center gap-1 text-indigo-400 group-hover:text-indigo-300">
                              <span className="font-bold border-b border-dashed border-indigo-500/30 whitespace-nowrap px-1">
                                {warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Principal'}
                              </span>
                              <ChevronDown size={10} className={`text-indigo-500/70 transition-transform ${showTransferDestDropdown ? 'rotate-180' : ''}`} />
                            </div>
                            <span className="text-[7px] text-indigo-500/70 uppercase font-bold mt-0.5">Destino</span>
                          </div>

                          <AnimatePresence>
                            {showTransferDestDropdown && (
                              <>
                                <div className="fixed inset-0 z-[50]" onClick={(e) => { e.stopPropagation(); setShowTransferDestDropdown(false); }}></div>
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute top-full mt-2 left-0 w-[220px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-[60] py-2 max-h-[300px] overflow-y-auto custom-scrollbar text-left"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {visibleWarehouses.map(wh => (
                                    <button
                                      key={wh.id}
                                      onClick={() => {
                                        setSelectedWarehouseId(wh.id);
                                        setShowTransferDestDropdown(false);
                                      }}
                                      className={`w-full text-left px-4 py-2.5 text-[10px] font-bold transition-colors flex items-center gap-2
                                         ${selectedWarehouseId === wh.id ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                                       `}
                                    >
                                      <Store size={12} className={selectedWarehouseId === wh.id ? 'text-indigo-500' : 'opacity-50'} />
                                      {wh.name}
                                    </button>
                                  ))}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </th>
                        <th className="px-2 py-2 text-center w-[70px] bg-slate-950 cursor-pointer hover:bg-slate-900 group" onClick={() => handleTransferSort('dest_coverage')}>
                          <div className="flex flex-col items-center bg-indigo-500/5 py-1 rounded-lg relative">
                            <Clock size={12} className="mb-1 text-indigo-400/70" />
                            <span className="text-indigo-500/70">Cobert.</span>
                            {transferSortBy === 'dest_coverage' && (
                              <div className="absolute top-1 right-1 text-indigo-500">
                                {transferSortOrder === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                              </div>
                            )}
                          </div>
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="px-2 py-2 text-center w-[70px] min-w-[70px] sticky left-[380px] md:left-[530px] bg-slate-950 z-40 cursor-pointer hover:bg-slate-900 group shadow-[2px_0_5px_rgba(0,0,0,0.3)]" onClick={() => handleTransferSort('dest_coverage')}>
                          <div className="flex flex-col items-center bg-cyan-500/5 py-1 rounded-lg relative">
                            <Clock size={12} className="mb-1 text-cyan-400/70" />
                            <span className="text-cyan-500/70">Cobert.</span>
                            {transferSortBy === 'dest_coverage' && (
                              <div className="absolute top-1 right-1 text-cyan-500">
                                {transferSortOrder === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                              </div>
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-2 text-center w-[140px] min-w-[140px] sticky left-[450px] md:left-[600px] bg-slate-950 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                          <div className="flex flex-col items-center py-1">
                            <Store size={11} className="mb-1 text-cyan-400" />
                            <span className="text-[9px] text-cyan-300 text-center leading-tight max-w-[120px] font-bold">
                              {warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Principal'}
                            </span>
                            <span className="text-[7px] text-cyan-500/80 uppercase font-black mt-0.5 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 rounded-full">◆ Actual</span>
                          </div>
                        </th>
                        {visibleWarehouses.map((wh, index) => (
                          <th key={wh.id} className={`px-4 py-2 text-center min-w-[100px] cursor-pointer hover:bg-emerald-500/10 group transition-colors ${index === 0 ? 'border-l-2 border-slate-700/60' : ''}`}
                            onClick={() => setTransferTargetWarehouse(wh.id)}
                            title="Haz clic para solicitar traspaso desde esta sucursal"
                          >
                            <div className="flex flex-col items-center">
                              <Store size={11} className="text-slate-500 group-hover:text-emerald-400 mb-1" />
                              <span className="text-[9px] text-slate-400 group-hover:text-emerald-300 text-center leading-tight max-w-[90px]">{wh.name}</span>
                              <span className="text-[7px] text-slate-600 group-hover:text-emerald-500 uppercase font-bold mt-0.5 border border-transparent group-hover:border-emerald-500/30 px-1 rounded">Pedir Aquí</span>
                            </div>
                          </th>
                        ))}
                      </>
                    )}


                  </tr>
                </thead>
                <tbody>
                  {sortedTransferProducts.slice(0, displayLimitTransfer).map((p: any, idx: number) => (
                    <TransferRow
                      key={p.id}
                      index={idx}
                      p={p}
                      sourceStock={p.stock_by_wh?.[selectedWarehouseId!] || 0}
                      transferTargetWarehouse={transferTargetWarehouse}
                      transferQty={Number(transferQuantities[p.id] || 0)}
                      setTransferQuantities={setTransferQuantities}
                      selectedWarehouseId={selectedWarehouseId}
                      warehouses={warehouses}
                      setTransferTargetWarehouse={setTransferTargetWarehouse}
                      warehouseColumnFilter={warehouseColumnFilter}
                      visibleWarehouses={visibleWarehouses}
                      suggestion={transferSuggestions.find(s => s.id === p.id) || transferOpportunities.find(o => o.id === p.id)}
                      isOpportunity={transferOpportunities.some(o => o.id === p.id)}
                      setActiveTooltip={handleTooltipAction}
                      currentView={currentView}
                      showMLExplanations={showMLExplanations}
                      useML={useML}
                      showMLColumns={showMLColumns}
                    />
                  ))}

                  {sortedTransferProducts.length > displayLimitTransfer && (
                    <tr>
                      <td colSpan={25} className="text-center py-6">
                        <button
                          onClick={() => setDisplayLimitTransfer(l => l + 500)}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                        >
                          Cargar más ({sortedTransferProducts.length - displayLimitTransfer} restantes)
                        </button>
                      </td>
                    </tr>
                  )}


                </tbody>
              </table>
            </div>
          </div>
        </main>
      ) : (
        <main className="max-w-[1600px] mx-auto px-2 md:px-6 py-4 md:py-8 space-y-4 md:space-y-8">
          {/* Header Bar */}
          <section className="bg-slate-900/40 border border-slate-800 p-3 md:p-6 rounded-3xl relative z-40">
            {/* Fila 1: Título + Botón Análisis Global IA prominente */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-4">
                <button
                  onClick={() => setCurrentView('products')}
                  className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
                  title="Volver a Productos"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                    <BrainCircuit size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2 md:gap-3">
                      Machine Learning Analysis
                      <span className="text-[12px] md:text-[14px] font-black text-indigo-400 bg-indigo-500/10 px-2 md:px-3 py-0.5 rounded-full border border-indigo-500/20">
                        {transferFilteredProducts.length}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">{transferTargetWarehouse ? 'Análisis Predictivo' : 'Comparación de stock inteligente'}</p>
                  </div>
                </div>
              </div>

              {/* Acciones de cabecera */}
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <AnimatePresence>
                  {transferTargetWarehouse && Object.values(transferQuantities).some(q => Number(q) > 0) && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2"
                    >
                      <button
                        onClick={() => setTransferQuantities({})}
                        className="p-3 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Limpiar todo"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          const itemsToTransfer = products
                            .filter(p => Number(transferQuantities[p.id] || 0) > 0)
                            .map(p => ({ product: p, qty: Number(transferQuantities[p.id]) }));

                          const targetName = warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Principal';
                          const sourceWh = warehouses.find(w => w.id === transferTargetWarehouse);

                          setTransferToConfirm({
                            items: itemsToTransfer,
                            fromName: sourceWh?.name || 'Origen',
                            toName: targetName,
                            fromId: transferTargetWarehouse!,
                            toId: selectedWarehouseId!
                          });
                        }}
                        className="bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-500/30 text-indigo-400 hover:text-white font-black uppercase tracking-widest text-[11px] px-6 py-2.5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
                      >
                        <Check size={16} strokeWidth={3} />
                        Confirmar {Object.values(transferQuantities).filter(q => Number(q) > 0).length}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={() => setShowPendingModal(true)}
                  className="p-2.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-slate-400 hover:text-indigo-400 rounded-xl transition-all flex items-center gap-2 relative group"
                  title="Ver traspasos en camino"
                >
                  <Truck size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">En Camino</span>
                  {pendingTransfers.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white text-[8px] font-black flex items-center justify-center rounded-full shadow-lg border border-slate-900 animate-pulse">
                      {pendingTransfers.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="p-2.5 bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-purple-500/5 text-slate-400 hover:text-purple-400 rounded-xl transition-all flex items-center gap-2 relative group"
                  title="Ver historial de traspasos"
                >
                  <History size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Historial</span>
                </button>

                {transferTargetWarehouse && selectedWarehouseId && (
                  <button
                    onClick={() => setShowAnalysisConfirmModal(true)}
                    className="px-4 py-2.5 bg-purple-600/90 hover:bg-purple-600 border border-purple-500/50 text-white rounded-xl transition-all flex items-center gap-2 relative group shadow-lg shadow-purple-500/20"
                    title="Analizar situación de traspasos con IA"
                  >
                    <BrainCircuit size={18} className={cn(isAnalyzingTransfers && "animate-pulse")} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Análisis IA</span>
                  </button>
                )}

                {/* Botón Análisis Global IA - destacado como acción principal */}
                {warehouses.filter(w => w.id !== null).length >= 3 && !transferTargetWarehouse && (
                  <button
                    onClick={() => setShowGlobalAnalysisConfirmModal(true)}
                    className="relative px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl flex items-center gap-3 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 transition-all duration-300 active:scale-95 group overflow-hidden"
                    title="Analizar mejores traspasos desde TODAS las sucursales"
                  >
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all duration-300 rounded-2xl" />
                    <BrainCircuit size={20} className={cn("relative z-10 flex-shrink-0", isAnalyzingGlobalTransfers && "animate-pulse")} />
                    <div className="flex flex-col items-start relative z-10">
                      <span className="text-[11px] font-black uppercase tracking-widest leading-tight">Análisis Global IA</span>
                      <span className="text-[8px] text-indigo-200/70 font-bold uppercase tracking-widest">Todas las sucursales</span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Fila 2: Configuración ML + Filtro de sucursales */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              {/* Switches ML en sección propia */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-800/30 rounded-2xl px-3 py-2 border border-slate-700/40">
                <div className="flex items-center gap-1.5 pr-1">
                  <Sparkles size={10} className="text-indigo-400/70" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Configuración ML</span>
                </div>
                <div className="w-px h-4 bg-slate-700/80 self-center" />
                <button
                  onClick={() => setUseML(!useML)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${useML ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.15)]' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-slate-600'}`}
                >
                  <Sparkles size={12} className={useML ? 'text-indigo-400 animate-pulse' : 'text-slate-500'} />
                  <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Usar ML</span>
                  <div className={`w-7 h-4 rounded-full relative transition-all duration-500 flex-shrink-0 ${useML ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-500 shadow-sm ${useML ? 'left-[14px]' : 'left-0.5'}`} />
                  </div>
                </button>

                <button
                  onClick={() => setShowMLExplanations(!showMLExplanations)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${showMLExplanations ? 'bg-purple-500/10 border-purple-500/50 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.15)]' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-slate-600'}`}
                >
                  <Info size={12} className={showMLExplanations ? 'text-purple-400' : 'text-slate-500'} />
                  <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Explicaciones</span>
                  <div className={`w-7 h-4 rounded-full relative transition-all duration-500 flex-shrink-0 ${showMLExplanations ? 'bg-purple-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-500 shadow-sm ${showMLExplanations ? 'left-[14px]' : 'left-0.5'}`} />
                  </div>
                </button>

                <button
                  onClick={() => setShowMLColumns(!showMLColumns)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${showMLColumns ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-slate-600'}`}
                >
                  {showMLColumns ? <Eye size={12} className="text-cyan-400" /> : <EyeOff size={12} className="text-slate-500" />}
                  <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Columnas ML</span>
                  <div className={`w-7 h-4 rounded-full relative transition-all duration-500 flex-shrink-0 ${showMLColumns ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-500 shadow-sm ${showMLColumns ? 'left-[14px]' : 'left-0.5'}`} />
                  </div>
                </button>
              </div>

              {/* Filtro de columnas por sucursal */}
              {!transferTargetWarehouse && (
                <div className="flex items-center gap-2 bg-slate-800/30 px-3 py-2 rounded-2xl border border-slate-700/50">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Mostrar:</span>
                  <button
                    onClick={() => setWarehouseColumnFilter('All')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'All'
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setWarehouseColumnFilter('NUBA')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'NUBA'
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                  >
                    NUBA
                  </button>
                  <button
                    onClick={() => setWarehouseColumnFilter('ANDYS')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'ANDYS'
                      ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                  >
                    ANDYS/YY
                  </button>
                </div>
              )}
            </div>

            {/* Fila 3: Filtros y búsqueda */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <FilterDropdown
                label="Categoría"
                icon={ListFilter}
                value={selectedProductCategory}
                options={productCategories.filter(c => c.name !== 'All')}
                onChange={setSelectedProductCategory}
                isOpen={activeDropdown === 'category'}
                onToggle={() => setActiveDropdown(activeDropdown === 'category' ? 'none' : 'category')}
                variant="orange"
              />

              <FilterDropdown
                label="Proveedor"
                icon={Users}
                value={selectedProvider}
                options={providers.filter(p => p.name !== 'All')}
                onChange={setSelectedProvider}
                isOpen={activeDropdown === 'provider'}
                onToggle={() => setActiveDropdown(activeDropdown === 'provider' ? 'none' : 'provider')}
                variant="indigo"
              />

              <FilterDropdown
                label="Origen"
                icon={Globe}
                value={selectedOrigin}
                options={origins.filter(o => o.name !== 'All')}
                onChange={setSelectedOrigin}
                isOpen={activeDropdown === 'origin'}
                onToggle={() => setActiveDropdown(activeDropdown === 'origin' ? 'none' : 'origin')}
                variant="indigo"
              />

              <FilterDropdown
                label="Análisis ABC"
                icon={BarChart3}
                value={selectedCategory}
                options={abcCategories.filter(a => a.name !== 'All')}
                onChange={setSelectedCategory}
                isOpen={activeDropdown === 'abc'}
                onToggle={() => setActiveDropdown(activeDropdown === 'abc' ? 'none' : 'abc')}
                variant="indigo"
              />

              <FilterDropdown
                label="Etiqueta"
                icon={Archive}
                value={selectedTag}
                options={productTags.filter(t => t.name !== 'All')}
                onChange={setSelectedTag}
                isOpen={activeDropdown === 'tag'}
                onToggle={() => setActiveDropdown(activeDropdown === 'tag' ? 'none' : 'tag')}
                variant="amber"
              />

              {selectedWarehouseId && (
                <FilterDropdown
                  label="ABC Sucursal"
                  icon={Store}
                  value={selectedCategoryStore}
                  options={abcStoreCategories.filter(a => a.name !== 'All')}
                  onChange={setSelectedCategoryStore}
                  isOpen={activeDropdown === 'abc_store'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'abc_store' ? 'none' : 'abc_store')}
                  variant="amber"
                />
              )}

              <FilterDropdown
                label="Cobertura"
                icon={Clock}
                value={transferCoverageFilter}
                options={coverageOptions.filter(o => o.name !== 'All')}
                onChange={setTransferCoverageFilter}
                isOpen={activeDropdown === 'coverage'}
                onToggle={() => setActiveDropdown(activeDropdown === 'coverage' ? 'none' : 'coverage')}
                variant="cyan"
              />

              <div className="relative group flex-1 min-w-[200px] md:min-w-[300px]">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search className="text-slate-500 group-focus-within:text-purple-400 transition-colors" size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={transferSearchTerm}
                  onChange={(e) => setTransferSearchTerm(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 text-white pl-10 pr-4 py-2.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-bold text-sm placeholder:text-slate-600"
                />
              </div>

              <AnimatePresence>
                {hasActiveFilters && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 20 }}
                    onClick={handleUserClearFilters}
                    className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-500 text-rose-500 hover:text-white px-4 py-2.5 rounded-2xl transition-all group active:scale-95 shadow-lg shadow-rose-500/10"
                    title="Limpiar todos los filtros"
                  >
                    <FilterX size={16} className="transition-transform group-hover:rotate-12" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Limpiar filtros</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

          </section>

          {/* Products Comparison Table */}
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="h-[calc(100vh-320px)] overflow-auto custom-scrollbar relative">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-30 bg-slate-950 border-b border-slate-800 shadow-xl">
                  {/* Group header row - shows "SUCURSAL ACTUAL" label in comparison mode */}
                  {!transferTargetWarehouse && (
                    <tr className="bg-slate-950 border-b border-slate-800/40">
                      <th className="sticky left-0 bg-slate-950 z-40 w-[80px] min-w-[80px]"></th>
                      <th className="sticky left-[80px] bg-slate-950 z-40 w-[300px] min-w-[300px] md:w-[450px] md:min-w-[450px]"></th>
                      <th colSpan={2 + (showMLColumns ? 3 : 0)} className="sticky left-[380px] md:left-[530px] bg-slate-950 z-40 px-2 py-1 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                        <div className="flex items-center justify-center gap-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-2 py-0.5 mx-1">
                          <span className="text-[8px] text-cyan-400 font-black uppercase tracking-widest">◆ Sucursal Actual</span>
                        </div>
                      </th>
                      {visibleWarehouses.map((wh: any, i: number) => (
                        <th key={wh.id} className={`bg-slate-950 ${i === 0 ? 'border-l-2 border-slate-700/60' : ''}`}></th>
                      ))}
                    </tr>
                  )}
                  <tr className="text-slate-500 text-[10px] uppercase tracking-[0.1em] font-black">
                    <th className="px-3 py-2 w-[80px] min-w-[80px] sticky left-0 bg-slate-950 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Código</th>
                    <th className="px-3 py-2 w-[300px] min-w-[300px] md:w-[450px] md:min-w-[450px] sticky left-[80px] bg-slate-950 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.3)] text-left">Producto</th>
                    {transferTargetWarehouse ? (
                      <>
                        <th className="px-2 py-2 text-center w-[70px] min-w-[70px] sticky left-[380px] md:left-[530px] bg-slate-950 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.3)] cursor-pointer hover:bg-slate-900 group" onClick={() => handleTransferSort('origin_coverage')}>
                          <div className="flex flex-col items-center bg-indigo-500/5 py-1 rounded-lg relative">
                            <Clock size={12} className="mb-1 text-indigo-400/70" />
                            <span className="text-indigo-500/70">Cobert.</span>
                            {transferSortBy === 'origin_coverage' && (
                              <div className="absolute top-1 right-1 text-indigo-500">
                                {transferSortOrder === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                              </div>
                            )}
                          </div>
                        </th>
                        <th className="px-1 py-2 text-center w-[140px] min-w-[140px] sticky left-[450px] md:left-[600px] bg-slate-950 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.3)] cursor-pointer group relative"
                          onClick={() => setShowTransferSourceDropdown(!showTransferSourceDropdown)}
                        >
                          <div className="flex flex-col items-center bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors py-1 rounded-lg relative overflow-hidden px-2">
                            {/* Sorting controls overlay */}
                            <div className="absolute top-0 right-0 p-1 flex items-center gap-0.5 z-10">
                              <div onClick={(e) => { e.stopPropagation(); handleTransferSort('origin_stock'); }} className="p-0.5 hover:bg-indigo-500/20 rounded cursor-pointer transition-colors" title="Ordenar por Stock">
                                {transferSortBy === 'origin_stock' ? (
                                  transferSortOrder === 'asc' ? <ArrowUp size={8} className="text-indigo-400" /> : <ArrowDown size={8} className="text-indigo-400" />
                                ) : (
                                  <ArrowUpDown size={8} className="text-indigo-500/30 hover:text-indigo-400" />
                                )}
                              </div>
                              <div onClick={(e) => { e.stopPropagation(); handleTransferSort('origin_sales'); }} className="p-0.5 hover:bg-indigo-500/20 rounded cursor-pointer transition-colors" title="Ordenar por Ventas">
                                {transferSortBy === 'origin_sales' ? (
                                  transferSortOrder === 'asc' ? <SortAsc size={8} className="text-indigo-400" /> : <TrendingUp size={8} className="text-indigo-400" />
                                ) : (
                                  <TrendingUp size={8} className="text-indigo-500/30 hover:text-indigo-400" />
                                )}
                              </div>
                            </div>

                            <Store size={14} className="mb-0.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                            <div className="flex items-center gap-1 text-indigo-400 group-hover:text-indigo-300">
                              <span className="font-bold border-b border-dashed border-indigo-500/30 whitespace-nowrap px-1">
                                {warehouses.find(w => w.id === transferTargetWarehouse)?.name}
                              </span>
                              <ChevronDown size={10} className={`text-indigo-500/70 transition-transform ${showTransferSourceDropdown ? 'rotate-180' : ''}`} />
                            </div>
                            <span className="text-[7px] text-indigo-500/70 uppercase font-bold mt-0.5">Origen</span>
                          </div>

                          <AnimatePresence>
                            {showTransferSourceDropdown && (
                              <>
                                <div className="fixed inset-0 z-[50]" onClick={(e) => { e.stopPropagation(); setShowTransferSourceDropdown(false); }}></div>
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute top-full mt-2 left-0 w-[220px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-[60] py-2 max-h-[300px] overflow-y-auto custom-scrollbar text-left"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => {
                                      setTransferTargetWarehouse(null);
                                      setShowTransferSourceDropdown(false);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-[10px] font-bold transition-colors flex items-center gap-2 text-slate-400 hover:bg-slate-800 hover:text-white border-b border-slate-800/50 mb-1 pb-2"
                                  >
                                    <LayoutGrid size={12} className="opacity-50" />
                                    -- Volver a Comparar --
                                  </button>
                                  {visibleWarehouses.map(wh => (
                                    <button
                                      key={wh.id}
                                      onClick={() => {
                                        setTransferTargetWarehouse(wh.id);
                                        setShowTransferSourceDropdown(false);
                                      }}
                                      className={`w-full text-left px-4 py-2.5 text-[10px] font-bold transition-colors flex items-center gap-2
                                         ${transferTargetWarehouse === wh.id ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                                       `}
                                    >
                                      <Store size={12} className={transferTargetWarehouse === wh.id ? 'text-indigo-500' : 'opacity-50'} />
                                      {wh.name}
                                    </button>
                                  ))}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </th>
                        <th className="px-4 py-2 text-center w-[110px] bg-slate-950 cursor-pointer hover:bg-slate-900 group" onClick={() => handleTransferSort('transfer_qty')}>
                          <div className="flex flex-col items-center bg-slate-800/50 py-1 rounded-lg relative">
                            <ArrowRight size={12} className="mb-0.5 text-slate-400" />
                            <span className="text-slate-400">Cantidad</span>
                            {transferSortBy === 'transfer_qty' && (
                              <div className="absolute top-1 right-1 text-indigo-500">
                                {transferSortOrder === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                              </div>
                            )}
                          </div>
                        </th>
                        <th className="px-1 py-2 text-center w-auto min-w-[160px] bg-slate-950 cursor-pointer group relative"
                          onClick={() => setShowTransferDestDropdown(!showTransferDestDropdown)}
                        >
                          <div className="flex flex-col items-center bg-purple-500/10 hover:bg-purple-500/20 transition-colors py-1 rounded-lg relative overflow-hidden px-2">
                            {/* Sorting controls overlay */}
                            <div className="absolute top-0 right-0 p-1 flex items-center gap-0.5 z-10">
                              <div onClick={(e) => { e.stopPropagation(); handleTransferSort('dest_stock'); }} className="p-0.5 hover:bg-purple-500/20 rounded cursor-pointer transition-colors" title="Ordenar por Stock">
                                {transferSortBy === 'dest_stock' ? (
                                  transferSortOrder === 'asc' ? <ArrowUp size={8} className="text-purple-400" /> : <ArrowDown size={8} className="text-purple-400" />
                                ) : (
                                  <ArrowUpDown size={8} className="text-purple-500/30 hover:text-purple-400" />
                                )}
                              </div>
                              <div onClick={(e) => { e.stopPropagation(); handleTransferSort('dest_sales'); }} className="p-0.5 hover:bg-purple-500/20 rounded cursor-pointer transition-colors" title="Ordenar por Ventas">
                                {transferSortBy === 'dest_sales' ? (
                                  transferSortOrder === 'asc' ? <SortAsc size={8} className="text-purple-400" /> : <TrendingUp size={8} className="text-purple-400" />
                                ) : (
                                  <TrendingUp size={8} className="text-purple-500/30 hover:text-purple-400" />
                                )}
                              </div>
                            </div>

                            <Store size={14} className="mb-0.5 text-purple-400 group-hover:scale-110 transition-transform" />
                            <div className="flex items-center gap-1 text-purple-400 group-hover:text-purple-300">
                              <span className="font-bold border-b border-dashed border-purple-500/30 whitespace-nowrap px-1">
                                {warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Principal'}
                              </span>
                              <ChevronDown size={10} className={`text-purple-500/70 transition-transform ${showTransferDestDropdown ? 'rotate-180' : ''}`} />
                            </div>
                            <span className="text-[7px] text-purple-500/70 uppercase font-bold mt-0.5">Destino</span>
                          </div>

                          <AnimatePresence>
                            {showTransferDestDropdown && (
                              <>
                                <div className="fixed inset-0 z-[50]" onClick={(e) => { e.stopPropagation(); setShowTransferDestDropdown(false); }}></div>
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute top-full mt-2 left-0 w-[220px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-[60] py-2 max-h-[300px] overflow-y-auto custom-scrollbar text-left"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {visibleWarehouses.map(wh => (
                                    <button
                                      key={wh.id}
                                      onClick={() => {
                                        setSelectedWarehouseId(wh.id);
                                        setShowTransferDestDropdown(false);
                                      }}
                                      className={`w-full text-left px-4 py-2.5 text-[10px] font-bold transition-colors flex items-center gap-2
                                         ${selectedWarehouseId === wh.id ? 'bg-purple-500/10 text-purple-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                                       `}
                                    >
                                      <Store size={12} className={selectedWarehouseId === wh.id ? 'text-purple-500' : 'opacity-50'} />
                                      {wh.name}
                                    </button>
                                  ))}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </th>
                        <th className="px-2 py-2 text-center w-[70px] bg-slate-950 cursor-pointer hover:bg-slate-900 group" onClick={() => handleTransferSort('dest_coverage')}>
                          <div className="flex flex-col items-center bg-purple-500/5 py-1 rounded-lg relative">
                            <Clock size={12} className="mb-1 text-purple-400/70" />
                            <span className="text-purple-500/70">Cobert.</span>
                            {transferSortBy === 'dest_coverage' && (
                              <div className="absolute top-1 right-1 text-purple-500">
                                {transferSortOrder === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                              </div>
                            )}
                          </div>
                        </th>
                        {currentView === 'ml' && showMLColumns && (
                          <>
                            <th className="px-3 py-3 text-center min-w-[100px] bg-slate-900 border-l border-indigo-500/20 border-b border-indigo-500/20">
                              <div className="flex flex-col items-center">
                                <TrendingUp size={12} className="mb-1 text-indigo-400" />
                                <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Predicción</span>
                              </div>
                            </th>
                            <th className="px-3 py-3 text-center min-w-[80px] bg-slate-900 border-b border-purple-500/20">
                              <div className="flex flex-col items-center">
                                <Clock size={12} className="mb-1 text-purple-400" />
                                <span className="text-[9px] text-purple-400 font-black uppercase tracking-widest">LeadTime</span>
                              </div>
                            </th>
                            <th className="px-3 py-3 text-center min-w-[90px] bg-slate-900 border-b border-rose-500/20">
                              <div className="flex flex-col items-center">
                                <AlertTriangle size={12} className="mb-1 text-rose-400" />
                                <span className="text-[9px] text-rose-400 font-black uppercase tracking-widest">Riesgo</span>
                              </div>
                            </th>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <th className="px-2 py-2 text-center w-[70px] min-w-[70px] sticky left-[380px] md:left-[530px] bg-slate-950 z-40 cursor-pointer hover:bg-slate-900 group shadow-[2px_0_5px_rgba(0,0,0,0.3)]" onClick={() => handleTransferSort('dest_coverage')}>
                          <div className="flex flex-col items-center bg-cyan-500/5 py-1 rounded-lg relative">
                            <Clock size={12} className="mb-1 text-cyan-400/70" />
                            <span className="text-cyan-500/70">Cobert.</span>
                            {transferSortBy === 'dest_coverage' && (
                              <div className="absolute top-1 right-1 text-cyan-500">
                                {transferSortOrder === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                              </div>
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-2 text-center w-[140px] min-w-[140px] sticky left-[450px] md:left-[600px] bg-slate-950 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                          <div className="flex flex-col items-center py-1">
                            <Store size={11} className="mb-1 text-cyan-400" />
                            <span className="text-[9px] text-cyan-300 text-center leading-tight max-w-[120px] font-bold">
                              {warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Principal'}
                            </span>
                            <span className="text-[7px] text-cyan-500/80 uppercase font-black mt-0.5 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 rounded-full">◆ Actual</span>
                          </div>
                        </th>

                        {/* Machine Learning Headers */}
                        {currentView === 'ml' && showMLColumns && (
                          <>
                            <th className="px-3 py-3 text-center min-w-[100px] bg-slate-950 border-l border-indigo-500/20">
                              <div className="flex flex-col items-center">
                                <TrendingUp size={12} className="mb-1 text-indigo-400" />
                                <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Predicción</span>
                              </div>
                            </th>
                            <th className="px-3 py-3 text-center min-w-[80px] bg-slate-950">
                              <div className="flex flex-col items-center">
                                <Clock size={12} className="mb-1 text-purple-400" />
                                <span className="text-[9px] text-purple-400 font-black uppercase tracking-widest">LeadTime</span>
                              </div>
                            </th>
                            <th className="px-3 py-3 text-center min-w-[90px] bg-slate-950">
                              <div className="flex flex-col items-center">
                                <AlertTriangle size={12} className="mb-1 text-rose-400" />
                                <span className="text-[9px] text-rose-400 font-black uppercase tracking-widest">Riesgo</span>
                              </div>
                            </th>
                          </>
                        )}
                        {visibleWarehouses.map((wh, index) => (
                          <th key={wh.id} className={`px-4 py-2 text-center min-w-[100px] cursor-pointer hover:bg-indigo-500/10 group transition-colors ${index === 0 ? 'border-l-2 border-slate-700/60' : ''}`}
                            onClick={() => setTransferTargetWarehouse(wh.id)}
                            title="Haz clic para solicitar traspaso desde esta sucursal"
                          >
                            <div className="flex flex-col items-center">
                              <Store size={11} className="text-slate-500 group-hover:text-indigo-400 mb-1" />
                              <span className="text-[9px] text-slate-400 group-hover:text-indigo-300 text-center leading-tight max-w-[90px]">{wh.name}</span>
                              <span className="text-[7px] text-slate-600 group-hover:text-indigo-500 uppercase font-bold mt-0.5 border border-transparent group-hover:border-indigo-500/30 px-1 rounded">Pedir Aquí</span>
                            </div>
                          </th>
                        ))}
                      </>
                    )}


                  </tr>
                </thead>
                <tbody>
                  {sortedTransferProducts.slice(0, displayLimitTransfer).map((p: any, idx: number) => (
                    <TransferRow
                      key={p.id}
                      index={idx}
                      p={p}
                      sourceStock={p.stock_by_wh?.[selectedWarehouseId!] || 0}
                      transferTargetWarehouse={transferTargetWarehouse}
                      transferQty={Number(transferQuantities[p.id] || 0)}
                      setTransferQuantities={setTransferQuantities}
                      selectedWarehouseId={selectedWarehouseId}
                      warehouses={warehouses}
                      setTransferTargetWarehouse={setTransferTargetWarehouse}
                      warehouseColumnFilter={warehouseColumnFilter}
                      visibleWarehouses={visibleWarehouses}
                      suggestion={transferSuggestions.find(s => s.id === p.id) || transferOpportunities.find(o => o.id === p.id)}
                      isOpportunity={transferOpportunities.some(o => o.id === p.id)}
                      setActiveTooltip={handleTooltipAction}
                      currentView={currentView}
                      showMLExplanations={showMLExplanations}
                      useML={useML}
                      showMLColumns={showMLColumns}
                    />
                  ))}

                  {sortedTransferProducts.length > displayLimitTransfer && (
                    <tr>
                      <td colSpan={25} className="text-center py-6">
                        <button
                          onClick={() => setDisplayLimitTransfer(l => l + 500)}
                          className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                        >
                          Cargar más ({sortedTransferProducts.length - displayLimitTransfer} restantes)
                        </button>
                      </td>
                    </tr>
                  )}


                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* ABC Modal */}
      <AnimatePresence>
        {
          showAbcSummary && abcSummary && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAbcSummary(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-xl">
                      <BarChart3 className="text-indigo-400" size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">Análisis de Inventario</h2>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Procedimiento de Clasificación ABC</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAbcSummary(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-all">
                    <X className="text-slate-500" />
                  </button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                  <div className="space-y-6">
                    <div className="flex items-end justify-between">
                      <div>
                        <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Resumen de Categorización Final</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Distribución de productos según su calificación combinada</p>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-black text-white">{abcCounts.AA + abcCounts.A}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase ml-2">Productos Clave (AA+A)</span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 h-6 w-full rounded-2xl overflow-hidden bg-slate-950 p-1.5 shadow-inner">
                      {['AA', 'A', 'B', 'C', 'D', 'E'].map(cat => {
                        const count = abcCounts[cat] || 0;
                        const total = Object.values(abcCounts).reduce((a, b) => a + b, 0);
                        const pct = total > 0 ? (count / total) * 100 : 0;
                        if (pct === 0) return null;
                        return (
                          <div
                            key={cat}
                            style={{ width: `${pct}%` }}
                            className={`h-full rounded-lg transition-all hover:brightness-125 cursor-help ${cat === 'AA' ? 'bg-indigo-500' :
                              cat === 'A' ? 'bg-blue-500' :
                                cat === 'B' ? 'bg-emerald-500' :
                                  cat === 'C' ? 'bg-amber-500' :
                                    cat === 'D' ? 'bg-orange-500' :
                                      'bg-slate-700'
                              }`}
                            title={`${cat}: ${count} productos (${pct.toFixed(1)}%)`}
                          />
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {['AA', 'A', 'B', 'C', 'D', 'E'].map(cat => {
                        const count = abcCounts[cat] || 0;
                        const total = Object.values(abcCounts).reduce((a, b) => a + b, 0);
                        const pct = total > 0 ? (count / total) * 100 : 0;
                        return (
                          <div key={cat} className="bg-slate-950/50 p-4 rounded-3xl border border-slate-800/50 flex flex-col items-center relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                            <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 ${cat === 'AA' ? 'from-indigo-500/20' : cat === 'A' ? 'from-blue-500/20' : 'from-slate-500/10'}`}></div>

                            <span className={`text-xs font-black mb-2 px-3 py-1 rounded-full border ${cat === 'AA' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' :
                              cat === 'A' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                                cat === 'B' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                  'bg-slate-800 text-slate-500 border-slate-700'
                              }`}>{cat}</span>

                            <span className="text-3xl font-black text-white tracking-tight">{count}</span>
                            <span className="text-[10px] text-slate-500 font-mono mt-1">{pct.toFixed(1)}% del catálogo</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-slate-950/30 border-t border-slate-800 flex justify-between items-center text-slate-500">
                  <div className="flex-1"></div>
                  <button
                    onClick={() => setShowAbcSummary(false)}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >

      {/* Tooltip */}
      {
        activeTooltip && (
          <div
            className="fixed z-[100] bg-slate-900 border border-blue-500/30 p-4 rounded-2xl shadow-2xl min-w-[320px] max-w-[450px] backdrop-blur-xl bg-opacity-95"
            style={{
              top: Math.max(20, Math.min(activeTooltip.y - 120, window.innerHeight - 450)),
              left: activeTooltip.x > window.innerWidth / 2 ? activeTooltip.x - 470 : activeTooltip.x + 40
            }}
            onMouseEnter={() => {
              if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current)
            }}
            onMouseLeave={() => {
              tooltipTimeoutRef.current = setTimeout(() => setActiveTooltip(null), 300)
            }}
          >
            <div className="flex flex-col gap-2 mb-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-blue-400" />
                <span className="font-black text-white text-[10px] uppercase tracking-widest">Solicitudes de Pedidos</span>
              </div>
              <div className="text-sm font-bold text-indigo-400 leading-tight">
                {activeTooltip.product.name}
              </div>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-auto custom-scrollbar pr-1">
              {activeTooltip.product.filteredPendingOrders && activeTooltip.product.filteredPendingOrders.length > 0 ? (
                activeTooltip.product.filteredPendingOrders.map((o, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white uppercase tracking-tighter">
                          {o.order_name || 'N/A'}
                        </span>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mt-1.5 bg-slate-950/20 p-2 rounded-xl border border-slate-700/30">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[7px] font-black text-slate-500 uppercase leading-none mb-1">Origen</span>
                            <span className="text-[9px] font-bold text-indigo-400 uppercase leading-tight whitespace-normal" title={o.supplier}>{o.supplier || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-center bg-slate-900 w-5 h-5 rounded-full border border-slate-700/50">
                            <ArrowRight size={8} className="text-slate-500" />
                          </div>
                          <div className="flex flex-col min-w-0 text-right">
                            <span className="text-[7px] font-black text-slate-500 uppercase leading-none mb-1">Destino</span>
                            <span className="text-[9px] font-bold text-emerald-400 uppercase leading-tight whitespace-normal" title={warehouses.find(w => w.id === o.warehouse_id)?.name}>
                              {warehouses.find(w => w.id === o.warehouse_id)?.name || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-0 border-t border-slate-800/50 pt-2">
                        <div className="flex flex-col items-center border-r border-slate-800/50">
                          <span className="text-[7px] font-bold text-slate-600 uppercase mb-0.5">Fecha Pedido</span>
                          <span className="text-[10px] font-mono text-slate-400 font-bold">
                            {o.date_order ? o.date_order.substring(0, 10) : (o.create_date ? o.create_date.substring(0, 10) : '-')}
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[7px] font-bold text-emerald-500/70 uppercase mb-0.5">Llegada Estimada</span>
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">
                            {o.date_planned ? o.date_planned.substring(0, 10) : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right bg-slate-900/50 p-2 rounded-xl border border-slate-700/30 min-w-[50px]">
                      <span className="text-[7px] font-black text-slate-500 uppercase block mb-0.5">Cant.</span>
                      <span className="text-sm font-black text-white leading-none">{o.qty}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 italic py-2">No hay detalles disponibles</div>
              )}
            </div>
          </div>
        )
      }

      {/* Transfer Confirm Modal */}
      <AnimatePresence>
        {transferToConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTransferToConfirm(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 pb-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                    <ArrowRightLeft size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Confirmar Traspaso</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Verifica los detalles del movimiento</p>
                  </div>
                </div>

                <div className="space-y-4 max-h-[350px] overflow-auto custom-scrollbar pr-2 py-1">
                  {transferToConfirm.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800/50 flex items-center justify-between gap-4 group">
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-0.5">Producto</span>
                        <span className="text-xs font-bold text-white leading-tight block">
                          {item.product?.name || item.product?.product_name || 'Producto Desconocido'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right flex flex-col items-end">
                          <span className="text-[9px] text-rose-500/70 font-black uppercase tracking-widest block mb-0.5">Dispo.</span>
                          <span className="text-[11px] font-black text-rose-400 font-mono bg-slate-950 border border-rose-500/20 px-2 py-1 rounded-lg shadow-inner">
                            {Math.floor(item.product.stock_by_wh?.[transferToConfirm.fromId] || 0)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end mr-2">
                          <span className="text-[9px] text-emerald-500/70 font-black uppercase tracking-widest block mb-0.5 text-right">Cant.</span>
                          <input
                            type="number"
                            min="1"
                            max={Math.floor(item.product.stock_by_wh?.[transferToConfirm.fromId] || 999999)}
                            value={modalQuantities[item.product.id] || ''}
                            onChange={(e) => {
                              const maxVal = Math.floor(item.product.stock_by_wh?.[transferToConfirm.fromId] || 0);
                              const rawVal = e.target.value;

                              if (rawVal === '') {
                                setModalQuantities(prev => ({ ...prev, [item.product.id]: '' }));
                                return;
                              }

                              const parsed = parseInt(rawVal, 10);
                              let newQty = isNaN(parsed) ? 1 : parsed;

                              if (newQty > maxVal) newQty = maxVal;
                              if (newQty < 1) newQty = 1;

                              setModalQuantities(prev => ({ ...prev, [item.product.id]: newQty.toString() }));

                              const newItems = [...transferToConfirm.items];
                              newItems[idx] = { ...newItems[idx], qty: newQty };
                              setTransferToConfirm({ ...transferToConfirm, items: newItems });
                              setTransferQuantities(prev => ({ ...prev, [item.product.id]: newQty.toString() }));
                            }}
                            onBlur={() => {
                              if (modalQuantities[item.product.id] === '' || modalQuantities[item.product.id] === '0') {
                                const defaultQty = 1;
                                setModalQuantities(prev => ({ ...prev, [item.product.id]: defaultQty.toString() }));
                                const newItems = [...transferToConfirm.items];
                                newItems[idx] = { ...newItems[idx], qty: defaultQty };
                                setTransferToConfirm({ ...transferToConfirm, items: newItems });
                                setTransferQuantities(prev => ({ ...prev, [item.product.id]: defaultQty.toString() }));
                              }
                            }}
                            placeholder="0"
                            className="w-14 bg-slate-900 border border-slate-700/50 rounded-lg text-center text-white py-1 font-mono text-sm font-black focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-slate-700"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const newItems = transferToConfirm.items.filter((_, i) => i !== idx);
                            // Sincronizar borrado con la tabla principal
                            setTransferQuantities(prev => ({ ...prev, [item.product.id]: '' }));

                            if (newItems.length === 0) {
                              setTransferToConfirm(null);
                            } else {
                              setTransferToConfirm({ ...transferToConfirm, items: newItems });
                            }
                          }}
                          className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                          title="Eliminar del traspaso"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800/50">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1 text-center">De:</span>
                    <span className="text-xs font-bold text-rose-400 block text-center truncate">{transferToConfirm.fromName}</span>
                  </div>
                  <div className="p-4 bg-slate-950/40 rounded-2xl border border-emerald-500/20">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1 text-center">A:</span>
                    <span className="text-xs font-bold text-emerald-400 block text-center truncate">{transferToConfirm.toName}</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                  <AlertCircle size={14} className="text-blue-400 shrink-0" />
                  <p className="text-[10px] text-blue-300 font-medium leading-tight">
                    Esta acción registrará el traspaso de stock entre sucursales dentro de Odoo.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-slate-950/30 border-t border-slate-800 flex gap-3">
                <button
                  onClick={() => setTransferToConfirm(null)}
                  className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    // 1. Guardar como Pendiente (En Camino)
                    const now = new Date();
                    const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
                    const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

                    const newOrder: TransferOrder = {
                      id: `TR-${timeStr}-${randomPart}`,
                      items: transferToConfirm.items,
                      fromName: transferToConfirm.fromName,
                      toName: transferToConfirm.toName,
                      fromId: transferToConfirm.fromId,
                      toId: transferToConfirm.toId,
                      timestamp: now.toISOString(),
                      status: 'pending'
                    };

                    setPendingTransfers(prev => [newOrder, ...prev]);

                    // Log to history
                    logTransferHistory('created', newOrder);

                    // 2. Simular envío (Crea el envío en tránsito en el sistema)
                    alert(`¡${transferToConfirm.items.length} productos en camino a ${transferToConfirm.toName}!`);
                    setTransferToConfirm(null);
                    setTransferQuantities({}); // Limpiar hoja de trabajo
                  }}
                  className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-900/40 active:scale-95 font-bold"
                >
                  Confirmar {transferToConfirm.items.length} Traspasos
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pending Transfers Modal (List Only) */}
      <AnimatePresence>
        {showPendingModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPendingModal(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-3xl max-h-[80vh] bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 shadow-inner">
                    <Truck size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Traspasos en Camino</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Mercadería en tránsito hacia su destino</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPendingModal(false)}
                  className="p-3 hover:bg-slate-800 rounded-2xl transition-all group"
                >
                  <X className="text-slate-500 group-hover:text-white" size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                {pendingTransfers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-600 border-2 border-dashed border-slate-800 rounded-[2rem]">
                    <div className="p-6 bg-slate-800/30 rounded-full mb-4">
                      <Archive size={48} className="opacity-20 text-emerald-500" />
                    </div>
                    <p className="font-bold uppercase tracking-widest text-xs">No hay envíos en tránsito actualmente</p>
                  </div>
                ) : (
                  pendingTransfers.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedTransferForDetails(order)}
                      className="w-full cursor-pointer text-left bg-slate-950/40 border border-slate-800/50 rounded-3xl p-5 flex items-center justify-between hover:border-emerald-500/30 hover:bg-slate-900/50 transition-all shadow-lg group"
                    >
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col gap-1 shrink-0">
                          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-lg border border-emerald-500/20 whitespace-nowrap w-fit">
                            {order.id}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-slate-500 uppercase ml-1">
                            {new Date(order.timestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>

                        <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-rose-400 uppercase tracking-tight">{order.fromName}</span>
                            <ArrowRight size={10} className="text-slate-600" />
                            <span className="text-xs font-black text-emerald-400 uppercase tracking-tight">{order.toName}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                            {order.items.length} {order.items.length === 1 ? 'Producto' : 'Productos'} en tránsito
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`¿Confirmas que la mercadería de ${order.id} ha llegado correctamente?`)) {
                                setPendingTransfers(prev => prev.filter(t => t.id !== order.id));
                                logTransferHistory('confirmed', order);
                                alert('Stock actualizado. Los productos ya están disponibles en ' + order.toName);
                              }
                            }}
                            className="h-8 w-8 flex items-center justify-center border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"
                            title="Confirmar Recepción"
                          >
                            <Check size={14} strokeWidth={3} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('¿Estás seguro de que quieres cancelar este traspaso? Se eliminará del registro.')) {
                                setPendingTransfers(prev => prev.filter(t => t.id !== order.id));
                                logTransferHistory('deleted', order);
                              }
                            }}
                            className="h-8 w-8 flex items-center justify-center border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadTxt(order.items, `${order.id}.txt`);
                            }}
                            className="h-8 flex items-center gap-2 px-3 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all border border-slate-700/50 hover:border-slate-600 group/btn"
                            title="Descargar TXT"
                          >
                            <FileSpreadsheet size={14} className="group-hover/btn:text-emerald-400 transition-colors" />
                            <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">TXT</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTransferForDetails(order);
                            }}
                            className="h-8 flex items-center gap-2 px-3 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all border border-slate-700/50 hover:border-slate-600 group/btn"
                          >
                            <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline group-hover/btn:text-emerald-400 transition-colors">VER</span>
                            <ChevronRight size={14} className="group-hover/btn:text-emerald-400 transition-colors" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-8 bg-slate-950/30 border-t border-slate-800 flex justify-between items-center text-slate-500">
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {pendingTransfers.length} Envío(s) activo(s)
                </span>
                <button
                  onClick={() => setShowPendingModal(false)}
                  className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Selected Transfer Detail Modal */}
      <AnimatePresence>
        {selectedTransferForDetails && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTransferForDetails(null)}
              className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                    <Package size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight whitespace-nowrap">{selectedTransferForDetails.id}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Desglose de productos y confirmación de llegada</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTransferForDetails(null)}
                  className="p-3 hover:bg-slate-800 rounded-2xl transition-all"
                >
                  <X className="text-slate-500" size={20} />
                </button>
              </div>

              <div className="px-8 pt-8 pb-4 bg-slate-900/40 border-b border-slate-800/50">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/40 p-5 rounded-3xl border border-rose-500/10">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Origen</span>
                    <span className="text-sm font-black text-white uppercase">{selectedTransferForDetails.fromName}</span>
                  </div>
                  <div className="bg-slate-950/40 p-5 rounded-3xl border border-emerald-500/10">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Destino</span>
                    <span className="text-sm font-black text-white uppercase">{selectedTransferForDetails.toName}</span>
                  </div>
                </div>
              </div>

              <div className="p-8 pt-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                <div className="space-y-3">
                  <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Contenido del Envío ({selectedTransferForDetails.items.length})</h4>
                  <div className="flex flex-col rounded-3xl border border-slate-800/50 relative isolate overflow-y-auto custom-scrollbar max-h-[500px]">
                    <div className="sticky top-0 z-10 flex items-center p-3 bg-slate-900 border-b border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-wider rounded-t-3xl shadow-sm">
                      <div className="w-[120px] shrink-0">Código</div>
                      <div className="flex-1">Producto</div>
                      <div className="w-[60px] text-center">Cant.</div>
                    </div>
                    {selectedTransferForDetails.items.map((item, idx) => {
                      // Robust extraction of product data
                      const itemProduct = item.product || {};
                      let product = itemProduct;

                      // If name is missing, try to find it in the global products list by ID
                      if (!product.name || product.name === 'Producto Desconocido') {
                        const productId = product.id || product.product_id;
                        if (productId) {
                          const found = products.find(p => String(p.id) === String(productId));
                          if (found) product = found;
                        }
                      }

                      // Final fallback if name is still missing
                      if (!product.name) {
                        product = { ...product, name: 'Producto Desconocido', barcode: product.barcode || '-' };
                      }

                      return (
                        <div key={idx} className="flex items-center p-4 bg-slate-950/40 border-b border-slate-800/50 last:border-0 last:rounded-b-3xl hover:bg-slate-900/50 transition-colors">
                          <div className="w-[120px] shrink-0 mr-4">
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-800">{product.barcode || '-'}</span>
                          </div>
                          <div className="flex-1 min-w-0 mr-4">
                            <span className="text-[11px] font-bold text-slate-200 block line-clamp-2 leading-tight">{product.name}</span>
                          </div>
                          <div className="w-[60px] flex justify-center shrink-0">
                            <div className="bg-slate-900 px-3 py-1 rounded-xl border border-slate-800 text-center min-w-[50px]">
                              <span className="text-sm font-black text-emerald-400 font-mono">{item.qty}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-950/30 border-t border-slate-800 grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    if (confirm('¿Estás seguro de que quieres cancelar este traspaso? Se eliminará del registro.')) {
                      setPendingTransfers(prev => prev.filter(t => t.id !== selectedTransferForDetails.id));
                      logTransferHistory('deleted', selectedTransferForDetails);
                      setSelectedTransferForDetails(null);
                    }
                  }}
                  className="px-6 py-4 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-rose-900/40 flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} strokeWidth={3} />
                  Eliminar
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Confirmas que la mercadería de ${selectedTransferForDetails.id} ha llegado correctamente?`)) {
                      setPendingTransfers(prev => prev.filter(t => t.id !== selectedTransferForDetails.id));
                      logTransferHistory('confirmed', selectedTransferForDetails);
                      setSelectedTransferForDetails(null);
                      alert('Stock actualizado. Los productos ya están disponibles en ' + selectedTransferForDetails.toName);
                    }
                  }}
                  className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-2"
                >
                  <Check size={16} strokeWidth={3} />
                  Confirmar Recepción
                </button>
                <button
                  onClick={() => handleDownloadTxt(selectedTransferForDetails.items, `${selectedTransferForDetails.id}.txt`)}
                  className="col-span-2 px-6 py-3 bg-slate-900/50 border border-slate-700/50 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet size={16} />
                  Descargar Código de Barras (TXT)
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Stock Report Modal (Vista Global) */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                    <Box size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight line-clamp-1">{selectedProduct.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedProduct.barcode}</span>
                      <span className="text-slate-700">•</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedProduct.provider}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-3 hover:bg-slate-800 rounded-2xl transition-all"
                >
                  <X className="text-slate-500" size={20} />
                </button>
              </div>

              {/* Stats Overview */}
              <div className="p-8 pb-4 grid grid-cols-4 gap-4">
                <div className="bg-slate-950/40 p-5 rounded-3xl border border-slate-800/50 flex flex-col">
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Stock Global</span>
                  <span className="text-2xl font-black text-white">{Number((selectedProduct.total_stock ?? selectedProduct.currentStock).toFixed(3))}</span>
                </div>
                <div className="bg-slate-950/40 p-5 rounded-3xl border border-slate-800/50 flex flex-col">
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Ventas (30d)</span>
                  <span className="text-2xl font-black text-indigo-400">{Number((selectedProduct.currentSalesGlobal || 0).toFixed(3))}</span>
                </div>
                <div className="bg-slate-950/40 p-5 rounded-3xl border border-slate-800/50 flex flex-col">
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Cobertura</span>
                  {(() => {
                    const cov = selectedProduct.coverage_global || selectedProduct.coverage;
                    const colorClass = cov < 7 ? "text-rose-500" : cov < 15 ? "text-amber-500" : "text-emerald-400";
                    const isNoSales = cov >= 999;
                    return (
                      <span className={`text-2xl font-black ${colorClass} flex flex-col justify-end h-full`}>
                        {isNoSales ? (
                          <span className="text-sm font-black uppercase tracking-tight">SIN VENTAS</span>
                        ) : (
                          <>
                            {Math.round(cov)} <span className="text-[10px] text-slate-600">DÍAS</span>
                          </>
                        )}
                      </span>
                    );
                  })()}
                </div>
                <div
                  onClick={() => setShowInTransitDetails(!showInTransitDetails)}
                  className={`p-5 rounded-3xl border flex flex-col cursor-pointer transition-all ${showInTransitDetails ? 'bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/20' : 'bg-slate-950/40 border-slate-800/50 hover:bg-slate-900/40'}`}
                >
                  <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${showInTransitDetails ? 'text-blue-400' : 'text-slate-500'}`}>En Tránsito</span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-blue-400">{selectedProduct.currentPending || 0}</span>
                    <ChevronRight size={16} className={`text-blue-400 transition-transform ${showInTransitDetails ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </div>

              {/* AI Analysis Section */}
              <div className="px-8 pb-4">
                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-3xl border border-indigo-500/20 p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                    <BrainCircuit size={64} className="text-indigo-400" />
                  </div>

                  <div className="flex items-center justify-between mb-4 relative z-20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/30">
                        <BrainCircuit size={18} className="text-white" />
                      </div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest">Asistente Estratégico IA</h4>
                    </div>

                    {!aiAnalysis && !isAnalyzing && (
                      <button
                        onClick={handleAnalyzeProduct}
                        className="text-[10px] font-black text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500 px-4 py-2 rounded-xl transition-all border border-indigo-500/30 active:scale-95"
                      >
                        GENERAR ANÁLISIS
                      </button>
                    )}
                  </div>

                  <div className="relative z-10">
                    {isAnalyzing ? (
                      <div className="flex items-center gap-3 py-2">
                        <RefreshCw size={16} className="animate-spin text-indigo-400" />
                        <p className="text-xs text-indigo-300 font-bold animate-pulse">Analizando datos del producto...</p>
                      </div>
                    ) : aiAnalysis ? (
                      <p className="text-sm text-slate-200 font-medium leading-relaxed italic">
                        "{aiAnalysis.replace(/\.0\b/g, '')}"
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">
                        Haz clic en el botón para obtener una recomendación logística basada en IA.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
                <AnimatePresence mode="wait">
                  {showInTransitDetails ? (
                    <motion.div
                      key="transit-view"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex-1 overflow-y-auto custom-scrollbar px-8 py-2 min-h-0"
                    >
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-[2.5rem] p-6 space-y-4 shadow-inner">
                        <div className="flex items-center gap-3 mb-2">
                          <Truck size={18} className="text-blue-400" />
                          <h4 className="text-xs font-black text-white uppercase tracking-widest">Pedidos y Traspasos en Curso</h4>
                        </div>

                        <div className="flex flex-col gap-2">
                          {selectedProduct.pending_orders && selectedProduct.pending_orders.length > 0 ? (
                            selectedProduct.pending_orders.map((o, idx) => (
                              <div key={idx} className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-lg hover:border-blue-500/30 transition-colors">
                                <div className="flex flex-col min-w-[120px]">
                                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter mb-1">{o.order_name || 'Pedido'}</span>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500 uppercase">
                                      <Clock size={10} className="shrink-0" />
                                      <span>PEDIDO: {o.date_order ? o.date_order.substring(0, 10) : '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[8px] font-bold text-emerald-400 uppercase mt-0.5">
                                      <Calendar size={10} className="shrink-0" />
                                      <span>LLEGADA: {o.date_planned ? o.date_planned.substring(0, 10) : '-'}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-slate-950/30 px-5 py-3 rounded-2xl border border-slate-800/50">
                                  <div className="flex flex-col">
                                    <span className="text-[7px] text-slate-500 font-bold uppercase leading-none mb-1">Origen</span>
                                    <span className="text-[10px] text-white font-bold uppercase leading-tight">{o.supplier || 'N/A'}</span>
                                  </div>
                                  <div className="bg-slate-900 p-1.5 rounded-full border border-slate-800 shadow-inner">
                                    <ArrowRight size={12} className="text-slate-600" />
                                  </div>
                                  <div className="flex flex-col text-right">
                                    <span className="text-[7px] text-slate-500 font-bold uppercase leading-none mb-1">Destino</span>
                                    <span className="text-[10px] text-emerald-400 font-bold uppercase leading-tight">
                                      {warehouses.find(w => w.id === o.warehouse_id)?.name || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <span className="text-[7px] font-black text-slate-500 uppercase block mb-0.5">Cant.</span>
                                    <span className="text-sm font-black text-white">{o.qty} <span className="text-[8px] text-blue-400">U.</span></span>
                                  </div>
                                  <span className={`px-2 py-1 rounded-lg border text-[8px] font-black tracking-widest ${o.state === 'purchase' || o.state === 'confirmed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                                    {(() => {
                                      const states: any = { 'draft': 'BORRADOR', 'sent': 'ENVIADO', 'to approve': 'POR APROBAR', 'purchase': 'PEDIDO', 'done': 'RECIBIDO', 'cancel': 'CANCELADO', 'confirmed': 'CONFIRMADO' };
                                      return states[o.state || ''] || (o.state || 'PENDIENTE').toUpperCase();
                                    })()}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-8 text-center bg-slate-950/20 rounded-2xl border border-dashed border-slate-800">
                              <Archive size={24} className="mx-auto text-slate-700 mb-2 opacity-50" />
                              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">
                                No hay pedidos activos reflejados en el sistema
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="table-view"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex-1 overflow-y-auto custom-scrollbar px-8 py-2 min-h-0"
                    >
                      <div className="rounded-3xl border border-slate-800/50 overflow-hidden bg-slate-950/20 shadow-inner">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-4">
                            <tr className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                              <th className="px-6 py-4">Sucursal</th>
                              <th className="px-4 py-4 text-center">ABC</th>
                              <th className="px-4 py-4 text-center">Stock</th>
                              <th className="px-4 py-4 text-center">Ventas (30d)</th>
                              <th className="px-6 py-4 text-center">Cobertura</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {warehouses.filter(w => {
                              if (w.id === null) return false;
                              const stock = selectedProduct.stock_by_wh?.[w.id] || 0;
                              const sales = selectedProduct.sales_by_wh?.[w.id] || 0;
                              return stock > 0 || sales > 0;
                            }).map((wh) => {
                              const stock = selectedProduct.stock_by_wh?.[wh.id] || 0;
                              const sales = selectedProduct.sales_by_wh?.[wh.id] || 0;
                              const abc = selectedProduct.abc_by_wh?.[wh.id]?.category || 'E';
                              const cov = sales > 0 ? Math.round(stock / (sales / 30)) : (stock > 0 ? 999 : 0);
                              const displayCov = cov > 999 ? 999 : cov;
                              return (
                                <tr key={wh.id} className="hover:bg-slate-800/30 transition-colors group">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-slate-800 rounded-xl group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-colors">
                                        <Store size={14} />
                                      </div>
                                      <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors uppercase">{wh.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <span className={`inline-flex w-7 h-7 items-center justify-center rounded-lg text-[9px] font-black uppercase border
                                ${abc === 'AA' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                                        abc === 'A' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
                                          abc === 'B' ? 'bg-slate-800 text-slate-400 border-slate-700' :
                                            'bg-slate-900 text-slate-600 border-slate-800'}`}>
                                      {abc}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <span className={`text-sm font-black font-mono ${stock <= 0 ? "text-rose-500" : "text-white"}`}>
                                      {Math.floor(stock)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-center text-sm font-bold text-slate-400">
                                    {Math.floor(sales)}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex justify-center">
                                      <div className={`inline-flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl border min-w-[70px] ${displayCov < 7 ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                                        displayCov < 15 ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                          "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                        }`}>
                                        <span className={displayCov >= 999 ? "text-[8px] font-black uppercase leading-tight text-center" : "text-xs font-black"}>
                                          {displayCov >= 999 ? "SIN VENTAS" : displayCov}
                                        </span>
                                        {displayCov < 999 && <span className="text-[8px] uppercase tracking-tighter opacity-70">Días</span>}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="p-8 bg-slate-950/30 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="px-10 py-3 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
                >
                  Cerrar Reporte
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transfer History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                    <History size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Historial de Traspasos</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Registro de todas las acciones</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {(() => {
                  const isAdmin = userProfile.username?.toLowerCase() === 'admin';
                  const displayedHistory = isAdmin
                    ? transferHistory
                    : transferHistory.filter(h => h.user === userProfile.username);

                  if (displayedHistory.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <History size={48} className="text-slate-700 mb-4" />
                        <p className="text-slate-500 font-bold">No hay historial de traspasos aún</p>
                        <p className="text-slate-600 text-sm mt-2">Las acciones aparecerán aquí cuando crees, confirmes o elimines traspasos</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {displayedHistory.map((entry) => {
                        const date = new Date(entry.timestamp);
                        const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                        const dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

                        const actionConfig = {
                          created: {
                            label: 'Creado',
                            icon: ArrowRightLeft,
                            color: 'text-emerald-400',
                            bg: 'bg-emerald-500/10',
                            border: 'border-emerald-500/30'
                          },
                          confirmed: {
                            label: 'Confirmado',
                            icon: Check,
                            color: 'text-indigo-400',
                            bg: 'bg-indigo-500/10',
                            border: 'border-indigo-500/30'
                          },
                          deleted: {
                            label: 'Eliminado',
                            icon: Trash2,
                            color: 'text-rose-400',
                            bg: 'bg-rose-500/10',
                            border: 'border-rose-500/30'
                          }
                        };

                        const config = actionConfig[entry.action];
                        const Icon = config.icon;

                        return (
                          <div
                            key={entry.id}
                            className="py-3 border-b border-slate-800/50 flex flex-col md:flex-row items-start md:items-center gap-4 group hover:bg-slate-800/20 px-4 transition-colors"
                          >
                            <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
                              <div className={`${config.color} opacity-80 shrink-0`}>
                                <Icon size={16} />
                              </div>
                              <span className={`text-[10px] font-black ${config.color} uppercase w-[80px] shrink-0`}>
                                {config.label}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0 w-full flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                              <div className="flex items-center gap-2 text-xs text-slate-300">
                                <span className="truncate max-w-[150px]">{entry.fromName}</span>
                                <ArrowRight size={10} className="text-slate-600 shrink-0" />
                                <span className="truncate max-w-[150px] font-bold text-emerald-400">{entry.toName}</span>
                              </div>
                              <span className="hidden md:inline text-slate-700 text-[10px]">|</span>
                              <div className="flex items-center gap-4 text-[10px] text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Package size={12} className="text-slate-600" />
                                  {entry.itemCount} prod.
                                </span>
                                <span className="flex items-center gap-1">
                                  <User size={12} className="text-slate-600" />
                                  {entry.user}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono w-full md:w-auto justify-end mt-1 md:mt-0">
                              <span>{dateStr}</span>
                              <span className="font-bold text-slate-400">{timeStr}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              {transferHistory.length > 0 && (
                <div className="p-4 border-t border-slate-800 bg-slate-950/40">
                  <button
                    onClick={() => {
                      if (confirm('¿Estás seguro de que quieres borrar todo el historial?')) {
                        setTransferHistory([]);
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-slate-800 hover:bg-rose-500/10 border border-slate-700 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} />
                    Limpiar Historial
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Analysis Confirmation Modal */}
      <AnimatePresence>
        {showAnalysisConfirmModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-8 relative"
            >
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 blur-[100px] pointer-events-none"></div>

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="p-5 bg-indigo-500/10 rounded-[28px] text-indigo-400 border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
                  <BrainCircuit size={40} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">¿Iniciar Análisis IA?</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-loose">
                    Estás por analizar <span className="text-indigo-400">{transferFilteredProducts.length}</span> productos filtrados.
                  </p>
                </div>

                <div className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>Límite Máximo</span>
                    <span className="text-slate-400">{ANALYSIS_LIMIT} ítems</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        transferFilteredProducts.length > ANALYSIS_LIMIT ? "bg-rose-500" : "bg-indigo-500"
                      )}
                      style={{ width: `${Math.min(100, (transferFilteredProducts.length / ANALYSIS_LIMIT) * 100)}%` }}
                    ></div>
                  </div>
                  {transferFilteredProducts.length > ANALYSIS_LIMIT && (
                    <div className="flex items-center gap-2 text-rose-500 text-[9px] font-bold uppercase tracking-tighter">
                      <AlertTriangle size={12} />
                      Excediste el límite. Aplica filtros para reducir la lista.
                    </div>
                  )}
                </div>

                <div className="flex flex-col w-full gap-3 pt-2">
                  <button
                    disabled={transferFilteredProducts.length > ANALYSIS_LIMIT}
                    onClick={() => {
                      setShowAnalysisConfirmModal(false);
                      handleAnalyzeTransfers();
                    }}
                    className={cn(
                      "w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl",
                      transferFilteredProducts.length > ANALYSIS_LIMIT
                        ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                    )}
                  >
                    Confirmar Análisis
                  </button>
                  <button
                    onClick={() => setShowAnalysisConfirmModal(false)}
                    className="w-full py-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global AI Analysis Confirmation Modal */}
      <AnimatePresence>
        {showGlobalAnalysisConfirmModal && (() => {
          const analysisWhs = warehouses.filter(w => {
            if (w.id === null) return false;
            const name = w.name.toUpperCase();

            // Exclusiones generales de ubicaciones no vendibles
            // (Aplicamos esto primero para limpiar cualquier cosa rara)
            if (name.includes('TRANSITO') ||
              name.includes('MERMA') ||
              name.includes('VIRTUAL') ||
              name.includes('DEVOLUCION') ||
              name.includes('RESERVA') ||
              name.includes('CONTINGENCIA') ||
              name.includes('PRUEBA')
            ) return false;

            if (warehouseColumnFilter === 'NUBA') {
              // Whitelist EXACTA solicitada por el usuario
              const nubaWhitelist = [
                'NUBA 21',
                'ALMACEN CENTRAL',
                'ALMACEN SOPOCACHI',
                'EXPANDIA ALMACEN CENTRAL LPZ',
                'EXPANDIA NUBA AMERICA CBBA',
                'EXPANDIA NUBA BENI SCZ',
                'EXPANDIA NUBA CINEBOL',
                'EXPANDIA NUBA EQUIPETROL SCZ',
                'EXPANDIA NUBA MEGACENTER',
                'EXPANDIA NUBA MULTICINE',
                'EXPANDIA NUBA SAN MARTIN CBBA',
                'EXPANDIA NUBA VELARDE SCZ',
                'EXPANDIA NUBA VENTURA SCZ',
                'NUBA 06',
                'NUBA COMERCIO',
                'NUBA LOS PINOS',
                'NUBA PRADO',
                'NUBA SHOPPING',
                'NUBA SUCRE'
              ];
              // Usamos includes para permitir flexibilidad mínima pero segura
              return nubaWhitelist.some(allowed => name.includes(allowed));
            }

            const isCentral = name === 'ALMACEN CENTRAL';
            const isPiso3 = name.includes('ALMACEN PISO 3');
            const isNuba = (name.includes('NUBA') || name.includes('EXPANDIA')) && !name.includes('ANDY');
            const isAndyYY = name.includes('ANDY') || name.includes('YAM YAM');

            if (warehouseColumnFilter === 'ANDYS') return isAndyYY || isCentral || isPiso3;

            return isNuba || isAndyYY || isCentral;
          });
          const activeWhCount = analysisWhs.length;
          const combinationsPerProduct = activeWhCount * (activeWhCount - 1);
          // Reducimos presupuesto a 100k para mayor estabilidad y añadimos Hard Cap de 2500 productos
          const calcLimit = Math.floor(100000 / Math.max(1, combinationsPerProduct));
          const dynamicLimit = Math.min(2500, calcLimit);
          const isOverLimit = transferFilteredProducts.length > dynamicLimit;

          return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-8 relative"
              >
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 blur-[100px] pointer-events-none"></div>

                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="p-5 bg-emerald-500/10 rounded-[28px] text-emerald-400 border border-emerald-500/20 shadow-xl shadow-emerald-500/5">
                    <BrainCircuit size={40} />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">¿Iniciar Análisis Global?</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-loose">
                      La IA buscará traspasos entre <span className="text-emerald-400">{activeWhCount} sucursales</span> para los <span className="text-emerald-400">{transferFilteredProducts.length}</span> ítems filtrados.
                    </p>
                  </div>

                  <div className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <span>Límite (Dinámico)</span>
                      <span className="text-slate-400">{dynamicLimit} ítems</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          isOverLimit ? "bg-rose-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(100, (transferFilteredProducts.length / dynamicLimit) * 100)}%` }}
                      ></div>
                    </div>
                    {isOverLimit && (
                      <div className="flex items-center gap-2 text-rose-500 text-[9px] font-bold uppercase tracking-tighter text-left">
                        <AlertTriangle size={12} className="shrink-0" />
                        <span>Demasiados productos para {activeWhCount} sucursales. Aplica más filtros.</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col w-full gap-3 pt-2">
                    <button
                      disabled={isOverLimit}
                      onClick={() => {
                        setShowGlobalAnalysisConfirmModal(false);
                        handleAnalyzeAllTransfers();
                      }}
                      className={cn(
                        "w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl",
                        isOverLimit
                          ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                      )}
                    >
                      🚀 ANALIZAR TODA LA RED
                    </button>
                    <button
                      onClick={() => setShowGlobalAnalysisConfirmModal(false)}
                      className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )
        })()}
      </AnimatePresence>

      {/* Global Analysis Results Modal */}
      <AnimatePresence>
        {(isAnalyzingGlobalTransfers || globalAnalysisResult) && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[160] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isAnalyzingGlobalTransfers) setGlobalAnalysisResult(null);
              }}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={cn(
                "bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl w-full overflow-hidden flex flex-col max-h-[90vh] relative z-10 transition-[max-width,transform,opacity] duration-300 ease-in-out",
                globalAnalysisResult && !isAnalyzingGlobalTransfers ? "max-w-7xl" : "max-w-2xl"
              )}
            >
              <div className="p-8 border-b border-slate-800 bg-slate-950/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                    <BrainCircuit size={28} className={cn(isAnalyzingGlobalTransfers && "animate-spin")} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">
                        {isAnalyzingGlobalTransfers ? 'Procesando Análisis...' : 'Análisis Inteligente Global'}
                      </h3>
                      {!isAnalyzingGlobalTransfers && Array.isArray(globalAnalysisByProduct) && globalAnalysisByProduct.length > 0 && (
                        <div className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg border border-emerald-500/30 shadow-lg shadow-emerald-500/5 animate-in fade-in zoom-in duration-500">
                          {globalAnalysisByProduct.length} PRODUCTOS
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Procedimiento de Optimización Logística</p>
                  </div>
                </div>
                {!isAnalyzingGlobalTransfers && (
                  <div className="flex items-center gap-3">
                    <div className="flex bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700/50">
                      <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-400">
                        Top 5 Orígenes por Producto
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadGlobalAnalysisExcel}
                      className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all border border-slate-700 hover:border-emerald-500/50"
                      title="Descargar Excel"
                    >
                      <Download size={20} />
                    </button>
                    <button
                      onClick={() => setGlobalAnalysisResult(null)}
                      className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all border border-slate-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-hidden flex min-h-0">
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  {isAnalyzingGlobalTransfers ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-6">
                      <div className="relative">
                        <div className="w-20 h-20 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ArrowRightLeft className="text-emerald-500 animate-pulse" size={24} />
                        </div>
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-sm font-black text-white uppercase tracking-widest">Analizando miles de combinaciones</p>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Comparando stock y ventas en todas las salas...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-12">
                      <div className="flex flex-col gap-6">
                        {/* Filters centered above stats */}
                        <div className="flex items-center gap-3 bg-slate-900/40 p-1.5 rounded-2xl border border-slate-800/50 w-fit mx-auto shadow-sm">
                          <button
                            onClick={() => setGlobalAnalysisPhaseFilter('ALL')}
                            className={cn(
                              "px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all",
                              globalAnalysisPhaseFilter === 'ALL'
                                ? "bg-slate-700 text-white shadow-lg shadow-black/20"
                                : "text-slate-500 hover:text-slate-300"
                            )}
                          >
                            Todos <span className="ml-1 opacity-50">({globalAnalysisByProduct?.length || 0})</span>
                          </button>
                          <button
                            onClick={() => setGlobalAnalysisPhaseFilter('RESCATE')}
                            className={cn(
                              "px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
                              globalAnalysisPhaseFilter === 'RESCATE'
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : "text-slate-500 hover:text-rose-400"
                            )}
                          >
                            Rescate <span className="opacity-50 text-[8px]">({globalAnalysisByProduct?.filter((p: any) => p.phase === 'RESCATE').length || 0})</span>
                          </button>
                          <button
                            onClick={() => setGlobalAnalysisPhaseFilter('NORMALIZACIÓN')}
                            className={cn(
                              "px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
                              globalAnalysisPhaseFilter === 'NORMALIZACIÓN'
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "text-slate-500 hover:text-emerald-400"
                            )}
                          >
                            Normalización <span className="opacity-50 text-[8px]">({globalAnalysisByProduct?.filter((p: any) => p.phase === 'NORMALIZACIÓN').length || 0})</span>
                          </button>
                        </div>

                        {/* Summary Card with Stats */}
                        <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-[2rem] shadow-xl">
                          {globalAnalysisGlobalStats && (
                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-slate-900/50 border border-slate-800/80 p-3 rounded-2xl flex flex-col gap-1">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Analizados</span>
                                <div className="flex items-center gap-2">
                                  <Search size={14} className="text-indigo-400" />
                                  <span className="text-lg font-black text-white">{globalAnalysisGlobalStats.total}</span>
                                </div>
                              </div>
                              <div className="bg-slate-900/50 border border-slate-800/80 p-3 rounded-2xl flex flex-col gap-1">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">En Traspaso</span>
                                <div className="flex items-center gap-2">
                                  <Truck size={14} className="text-emerald-400" />
                                  <span className="text-lg font-black text-white">{globalAnalysisGlobalStats.withSuggestions}</span>
                                </div>
                              </div>
                              <div className="bg-slate-900/50 border border-slate-800/80 p-3 rounded-2xl flex flex-col gap-1">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Descartados</span>
                                <div className="flex items-center gap-2">
                                  <XCircle size={14} className="text-rose-400" />
                                  <span className="text-lg font-black text-white">{globalAnalysisGlobalStats.discarded}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-6">
                        {filteredGlobalAnalysisByProduct.length > 0 ? (
                          <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-xl animate-in fade-in duration-700">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-950/50 border-b border-slate-800/80">
                                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Información del Producto</th>
                                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Recomendación de Traspaso</th>
                                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Otras Fuentes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/20">
                                {filteredGlobalAnalysisByProduct.map((prod: any, idx: number) => (
                                  <tr
                                    key={prod.product_id}
                                    className={cn(
                                      "group/row transition-colors hover:bg-indigo-500/[0.05]",
                                      idx % 2 === 0 ? "bg-slate-950/50" : "bg-transparent"
                                    )}
                                  >
                                    <td className="px-6 py-5">
                                      <div className="flex flex-col gap-1">
                                        <h4 className="text-[11px] font-black text-white uppercase tracking-tight leading-tight">
                                          {prod.product_name}
                                        </h4>
                                        <div className="flex items-center gap-4 mt-2">
                                          <div className="flex flex-col">
                                            <span className="text-base font-black text-white tabular-nums leading-none lowercase whitespace-nowrap">{prod.dest_stock} u</span>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Stock Actual</span>
                                          </div>
                                          <div className="w-px h-8 bg-slate-800" />
                                          <div className="flex flex-col">
                                            <span className={cn(
                                              "text-base font-black tabular-nums leading-none lowercase",
                                              prod.dest_coverage_days <= 2 ? "text-rose-400" : "text-indigo-400"
                                            )}>
                                              {formatCoverage(prod.dest_coverage_days)}
                                            </span>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Cobertura</span>
                                          </div>
                                          {prod.phase === 'RESCATE' && (
                                            <div className="ml-1 self-center">
                                              <span className="text-[8px] font-black px-2 py-1 rounded bg-rose-500 text-white border border-rose-400 uppercase shadow-lg shadow-rose-500/20">
                                                CRÍTICO
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-5">
                                      {prod.proposed_plan && prod.proposed_plan.length > 0 ? (
                                        <div className="flex flex-col gap-2">
                                          {prod.proposed_plan.map((sug: any, sIdx: number) => {
                                            const isStaged = stagedKeys.has(`${prod.product_id}-${sug.source_id}`);
                                            const destShort = getCleanWhName(warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Destino');
                                            const sourceShort = getCleanWhName(sug.source_name);

                                            return (
                                              <button
                                                key={sIdx}
                                                onClick={() => handleStageGlobalTransfer(sug, prod)}
                                                title={`Eficiencia del Match: ${sug.score}% — Mover de ${sug.source_name} a ${warehouses.find(w => w.id === selectedWarehouseId)?.name}`}
                                                className={cn(
                                                  "flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all relative group/btn",
                                                  isStaged
                                                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                                                    : "bg-slate-800 border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-white hover:bg-slate-700/50"
                                                )}
                                              >
                                                <div className="flex flex-col items-start gap-1.5 flex-1 w-full">
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-[7px] font-black bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/20 uppercase whitespace-nowrap">DE: {sourceShort}</span>
                                                    <ArrowRight size={10} className="text-slate-600 shrink-0" />
                                                    <span className="text-[7px] font-black bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase whitespace-nowrap">A: {destShort}</span>
                                                  </div>

                                                  <div className="flex items-center gap-4 w-full">
                                                    <div className="flex flex-col flex-1">
                                                      <span className="text-sm font-black">
                                                        Mover <span className="text-base text-indigo-400 group-hover/btn:text-white transition-colors underline decoration-indigo-500/30 underline-offset-4 lowercase whitespace-nowrap">{sug.qty} u</span>
                                                      </span>
                                                      {showMLExplanations && sug.reason && (
                                                        <span className="text-[9px] font-bold text-slate-500 mt-1 italic leading-tight group-hover/btn:text-slate-300 transition-colors">
                                                          {sug.reason}
                                                        </span>
                                                      )}
                                                    </div>

                                                    <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-700 group-hover/btn:border-indigo-500/50 transition-colors shrink-0 shadow-inner">
                                                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Impacto:</span>
                                                      <div className="flex items-center gap-3">
                                                        <span className="text-xs font-black text-slate-400 tabular-nums lowercase">{formatCoverage(prod.dest_coverage_days)}</span>
                                                        <ArrowRight size={12} className="text-indigo-500" />
                                                        <span className="text-xs font-black text-emerald-400 tabular-nums lowercase">{formatCoverage(sug.dest_post_coverage)}</span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="shrink-0">
                                                  {isStaged ? (
                                                    <CheckCircle2 size={18} className="text-white" />
                                                  ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center group-hover/btn:border-emerald-500 transition-colors">
                                                      <Plus size={16} className="text-emerald-500 group-hover/btn:scale-125 transition-transform" />
                                                    </div>
                                                  )}
                                                </div>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <span className="text-[10px] font-bold text-slate-600 uppercase italic">Sin excedentes en red</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-5">
                                      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                        {prod.top_sources
                                          ?.filter((s: any) => !prod.proposed_plan?.some((p: any) => p.source_id === s.source_id))
                                          .slice(0, 4)
                                          .map((sug: any, sIdx: number) => {
                                            const isStaged = stagedKeys.has(`${prod.product_id}-${sug.source_id}`);
                                            const shortName = getCleanWhName(sug.source_name);
                                            return (
                                              <button
                                                key={sIdx}
                                                onClick={() => handleStageGlobalTransfer(sug, prod)}
                                                className={cn(
                                                  "px-2.5 py-1.5 rounded-xl border text-[9px] font-black transition-all flex items-center gap-2",
                                                  isStaged
                                                    ? "bg-indigo-600 border-indigo-500 text-white"
                                                    : "bg-slate-950/40 border-slate-800 text-slate-500 hover:border-slate-500"
                                                )}
                                                title={`Match: ${sug.score}% — Mover ${sug.qty} u desde ${sug.source_name}`}
                                              >
                                                <span className="opacity-60 text-[8px] uppercase">{shortName}</span>
                                                <span className="text-white text-sm font-black tabular-nums underline decoration-slate-700 lowercase whitespace-nowrap">{sug.qty} u</span>
                                                <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 lowercase">+{formatCoverage(sug.dest_post_coverage)}</span>
                                                {isStaged && <Check size={12} className="text-emerald-400" />}
                                              </button>
                                            );
                                          })}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="py-24 text-center bg-slate-900/10 rounded-[2rem] border-2 border-dashed border-slate-800 flex flex-col items-center justify-center space-y-3">
                            <Package size={40} className="text-slate-800" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No hay recomendaciones para estos filtros</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Sidebar for staged transfers */}
                {!isAnalyzingGlobalTransfers && globalAnalysisResult && (
                  <div className="w-80 border-l border-slate-800 bg-slate-950/20 flex flex-col">
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/30">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Lista de Trabajo</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-indigo-400 font-black uppercase truncate max-w-[150px]">
                            {stagedGlobalTransfers.length > 0 ? stagedGlobalTransfers[0].dest_name : 'Sin destino'}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-black rounded-lg border border-indigo-500/30">
                            {stagedGlobalTransfers.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      {stagedGlobalTransfers.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-3 p-8">
                          <PlusCircle size={32} />
                          <p className="text-[10px] font-bold uppercase tracking-widest">Selecciona sugerencias para agregarlas aquí</p>
                        </div>
                      ) : (
                        stagedGlobalTransfers.map((t, idx) => (
                          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 relative group animate-in slide-in-from-right-4 duration-300">
                            <button
                              onClick={() => setStagedGlobalTransfers(prev => prev.filter(item => item.product_id !== t.product_id))}
                              className="absolute top-2 right-2 text-slate-600 hover:text-rose-500 transition-colors"
                            >
                              <X size={12} />
                            </button>
                            <h5 className="text-[10px] font-black text-white uppercase truncate pr-4">{t.product_name}</h5>
                            <div className="flex flex-col gap-1.5 mt-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] font-bold text-rose-400 uppercase bg-rose-400/5 px-1.5 py-0.5 rounded border border-rose-400/10 shrink-0">
                                    {getCleanWhName(t.source_name)}
                                  </span>
                                  <ArrowRight size={8} className="text-slate-600 shrink-0" />
                                  <span className="text-[8px] font-bold text-emerald-400 uppercase bg-emerald-400/5 px-1.5 py-0.5 rounded border border-emerald-400/10 truncate">
                                    {getCleanWhName(t.dest_name)}
                                  </span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-[7px] font-black text-slate-500 uppercase">Proyectado</span>
                                  <span className="text-[9px] font-black text-emerald-400">{formatCoverage(t.post_coverage_days)}</span>
                                </div>
                              </div>
                              <div className="text-right flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  className="w-12 bg-slate-950/50 border border-slate-700/50 rounded text-right text-sm font-black text-white px-1 py-0.5 focus:outline-none focus:border-indigo-500 transition-colors"
                                  value={t.qty}
                                  onChange={(e) => handleUpdateStagedQuantity(t.product_id, t.source_id, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  placeholder="0"
                                />
                                <span className="text-[9px] text-indigo-400 font-bold">u.</span>

                                {/* Stock Remaining Indicator with Colorimetry */}
                                {(() => {
                                  const remaining = (t.max_source_stock || 9999) - (typeof t.qty === 'number' ? t.qty : 0);
                                  let colorClass = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"; // Default Healthy

                                  if (remaining < 5) {
                                    colorClass = "bg-rose-500/10 border-rose-500/20 text-rose-500"; // Critical
                                  } else if (remaining < 15) {
                                    colorClass = "bg-amber-500/10 border-amber-500/20 text-amber-500"; // Warning
                                  }

                                  return (
                                    <div className={cn(
                                      "absolute -top-2 left-0 border px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm uppercase tracking-tight transition-colors duration-300",
                                      colorClass
                                    )}>
                                      <span className="text-[6px] font-black">Queda: {remaining}</span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-4 border-t border-slate-800 space-y-3">
                      <button
                        disabled={stagedGlobalTransfers.length === 0}
                        onClick={handleApplyStagedGlobalTransfers}
                        className={cn(
                          "w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl flex items-center justify-center gap-2",
                          stagedGlobalTransfers.length === 0
                            ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 active:scale-95"
                        )}
                      >
                        <CheckCircle2 size={16} />
                        Confirmar {stagedGlobalTransfers.length} Traspasos a {stagedGlobalTransfers[0]?.dest_name?.split(' ').slice(-2).join(' ')}
                      </button>
                      <button
                        onClick={() => setStagedGlobalTransfers([])}
                        disabled={stagedGlobalTransfers.length === 0}
                        className="w-full py-2 text-[9px] font-bold text-slate-500 hover:text-rose-400 uppercase tracking-widest transition-colors"
                      >
                        Vaciar Todo
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {!isAnalyzingGlobalTransfers && stagedGlobalTransfers.length === 0 && (
                <div className="p-8 border-t border-slate-800 bg-slate-950/20 flex justify-center">
                  <button
                    onClick={() => setGlobalAnalysisResult(null)}
                    className="w-full max-w-xs py-4 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl border border-slate-700 active:scale-95"
                  >
                    Cerrar Análisis Global
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        username={userProfile.username}
        avatar={userProfile.avatar}
        onUpdate={(data: any) => setUserProfile((prev: any) => ({ ...prev, ...data }))}
      />

      {/* AI Transfer Analysis Modal */}
      <AnimatePresence>
        {showTransferAnalysisModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col relative"
            >
              {/* Glow effect */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 blur-[100px] pointer-events-none"></div>

              {/* Header */}
              <div className="p-8 border-b border-slate-800/50 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-900/10">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                    <BrainCircuit size={32} className={isAnalyzingTransfers ? "animate-spin-slow" : ""} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">Análisis Estratégico</h3>
                      {!isAnalyzingTransfers && (transferSuggestions.length > 0 || transferOpportunities.length > 0) && (
                        <div className="flex items-center gap-1.5">
                          <div className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-black rounded-lg shadow-lg shadow-indigo-500/20">
                            {transferSuggestions.length + transferOpportunities.length}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sugerencias Masivas de Traspaso</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadTransferAnalysisExcel}
                    className="p-3 text-slate-500 hover:text-white hover:bg-slate-800 rounded-2xl transition-all border border-transparent hover:border-slate-700"
                    title="Descargar Excel"
                  >
                    <Download size={24} />
                  </button>
                  <button
                    onClick={() => setShowTransferAnalysisModal(false)}
                    className="p-3 text-slate-500 hover:text-white hover:bg-slate-800 rounded-2xl transition-all border border-transparent hover:border-slate-700"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-8 flex-1 overflow-auto custom-scrollbar max-h-[70vh]">
                {isAnalyzingTransfers ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-6">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-indigo-500/20 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-black uppercase tracking-widest text-xs animate-pulse">Procesando Datos...</p>
                      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter mt-2">La IA está evaluando ventas, stock y coberturas</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Visual Distribution Chart */}
                    {transferAnalysisStats && (() => {
                      const total = transferAnalysisStats.total_aprobados + transferAnalysisStats.total_oportunidades + transferAnalysisStats.total_rechazados;
                      return (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                          <div className="flex justify-between items-end">
                            <div className="space-y-1">
                              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] block">
                                Gráfico de Distribución
                              </span>
                              <h4 className="text-xl font-black text-white">Salud del Inventario</h4>
                            </div>
                            <div className="text-right">
                              <span className="text-[24px] font-black text-white">{total}</span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Ítems Evaluados</span>
                            </div>
                          </div>

                          {/* Complex Distribution Bar */}
                          <div className="relative pt-2 pb-8">
                            <div className="h-4 w-full bg-slate-800/50 rounded-full flex overflow-hidden border border-slate-700/50 shadow-2xl">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(transferAnalysisStats.total_aprobados / total) * 100}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] relative group"
                              />
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(transferAnalysisStats.total_oportunidades / total) * 100}%` }}
                                transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                              />
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(transferAnalysisStats.total_rechazados / total) * 100}%` }}
                                transition={{ duration: 1.4, ease: "easeOut", delay: 0.4 }}
                                className="h-full bg-slate-700"
                              />
                            </div>

                            {/* Legend with Micro-stats */}
                            <div className="grid grid-cols-3 gap-4 mt-6">
                              <div className="bg-slate-900/40 border border-emerald-500/10 p-3 rounded-2xl">
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Aprobados</span>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-lg font-black text-white">{transferAnalysisStats.total_aprobados}</span>
                                  <span className="text-[10px] text-slate-500">{Math.round((transferAnalysisStats.total_aprobados / total) * 100)}%</span>
                                </div>
                              </div>
                              <div className="bg-slate-900/40 border border-amber-500/10 p-3 rounded-2xl">
                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-1">Oportunidades</span>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-lg font-black text-white">{transferAnalysisStats.total_oportunidades}</span>
                                  <span className="text-[10px] text-slate-500">{Math.round((transferAnalysisStats.total_oportunidades / total) * 100)}%</span>
                                </div>
                              </div>
                              <div className="bg-slate-900/40 border border-rose-500/10 p-3 rounded-2xl">
                                <span className="text-[9px] font-black text-rose-500/50 uppercase tracking-widest block mb-1">Rechazados</span>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-lg font-black text-white/40">{transferAnalysisStats.total_rechazados}</span>
                                  <span className="text-[10px] text-slate-600 font-bold">{Math.round((transferAnalysisStats.total_rechazados / total) * 100)}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Text Summary/Explanation from AI */}
                    {transferAnalysisResult && (
                      <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-[28px] relative overflow-hidden group shadow-inner shadow-indigo-500/5">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <BrainCircuit size={48} />
                        </div>
                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                          <Info size={14} />
                          Análisis Estratégico v2.0
                        </p>
                        <p className="text-[13px] text-slate-200 font-medium leading-relaxed whitespace-pre-wrap">
                          {transferAnalysisResult.replace(/\.0\b/g, '')}
                        </p>
                      </div>
                    )}

                    {/* Suggestions Table */}
                    {transferSuggestions.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-emerald-500/20"></div>
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                            Sugerencias Principales ({transferSuggestions.length})
                          </span>
                          <div className="h-px flex-1 bg-emerald-500/20"></div>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl shadow-xl relative overflow-auto">
                          <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead>
                              <tr className="bg-slate-900/80 border-b border-slate-800">
                                <th className="px-5 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Producto</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Cant.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transferSuggestions.map((s, idx) => (
                                <tr key={idx} className="border-b border-slate-800/30 hover:bg-emerald-500/5 transition-all group/row relative">
                                  <td className="px-5 py-3">
                                    <span className="text-[11px] font-bold text-slate-200 block">{s.name}</span>
                                  </td>
                                  <td className="px-5 py-3 text-center">
                                    <div className="relative inline-block group/tip">
                                      <div className="inline-flex items-center justify-center px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl cursor-help">
                                        <span className="text-xs font-mono font-black text-emerald-400">{s.qty}</span>
                                      </div>
                                      <div className={`absolute ${idx < 2 ? 'top-0' : 'bottom-0'} right-full mr-6 w-72 p-4 bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl opacity-0 group-hover/tip:opacity-100 transition-all z-[110] pointer-events-none transform select-none`}>
                                        <p className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                          <Info size={12} /> Análisis IA
                                        </p>
                                        <p className="text-[11px] text-slate-200 font-medium leading-relaxed">{s.reason}</p>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Opportunities Table */}
                    {transferOpportunities.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-amber-500/20"></div>
                          <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">
                            Oportunidades (Llenar camión) ({transferOpportunities.length})
                          </span>
                          <div className="h-px flex-1 bg-amber-500/20"></div>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl shadow-xl relative overflow-auto">
                          <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead>
                              <tr className="bg-slate-900/80 border-b border-slate-800">
                                <th className="px-5 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Producto</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Cant.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transferOpportunities.map((s, idx) => (
                                <tr key={idx} className="border-b border-slate-800/30 hover:bg-amber-500/5 transition-all group/row relative">
                                  <td className="px-5 py-3">
                                    <span className="text-[11px] font-bold text-slate-300 block">{s.name}</span>
                                  </td>
                                  <td className="px-5 py-3 text-center">
                                    <div className="relative inline-block group/tip">
                                      <div className="inline-flex items-center justify-center px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl cursor-help">
                                        <span className="text-xs font-mono font-black text-amber-500">{s.qty}</span>
                                      </div>
                                      <div className={`absolute ${idx < 2 ? 'top-0' : 'bottom-0'} right-full mr-6 w-72 p-4 bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl opacity-0 group-hover/tip:opacity-100 transition-all z-[110] pointer-events-none transform select-none`}>
                                        <p className="text-[9px] text-amber-500 font-extrabold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                          <Info size={12} /> Micro-traspaso
                                        </p>
                                        <p className="text-[11px] text-slate-200 font-medium leading-relaxed">{s.reason}</p>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {transferSuggestions.length === 0 && transferOpportunities.length === 0 && (
                      <div className="py-12 flex flex-col items-center justify-center space-y-4 border-2 border-dashed border-slate-800 rounded-[32px] bg-slate-900/20">
                        <div className="p-4 bg-slate-800/50 rounded-full text-slate-600">
                          <CheckCircle2 size={32} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-400">No se encontraron productos críticos con stock disponible</p>
                          <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mt-1">La sucursal destino parece estar bien abastecida para estos items o el origen no tiene excedentes.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              {!isAnalyzingTransfers && (
                <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex justify-end gap-3 md:gap-4">
                  <button
                    onClick={() => setShowTransferAnalysisModal(false)}
                    className="px-6 md:px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
                  >
                    Descartar
                  </button>
                  {transferSuggestions.length > 0 && transferOpportunities.length > 0 && (
                    <button
                      onClick={() => applyAISuggestions(false)}
                      className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center gap-2 border border-slate-700"
                    >
                      Solo Prioritarios ({transferSuggestions.length})
                    </button>
                  )}
                  {(transferSuggestions.length > 0 || transferOpportunities.length > 0) && (
                    <button
                      onClick={() => applyAISuggestions(true)}
                      className="px-8 md:px-10 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-3 group"
                    >
                      <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                      {transferOpportunities.length > 0
                        ? `Preparar Todo (${transferSuggestions.length + transferOpportunities.length})`
                        : `Preparar Traspaso (${transferSuggestions.length})`
                      }
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div >
  )
}

const formatCoverage = (days: number | undefined) => {
  if (days === undefined || days === null) return "--";
  if (days >= 999) return "SIN VENTAS";
  return `${Math.round(days)}d`;
};

// Helper component for Suggestions in the Global Modal
const SuggestionCard = memo(({ sug, onApply, compact = false, rank, destName, isStaged }: { sug: any, onApply: () => void, compact?: boolean, rank?: number, destName?: string, isStaged?: boolean }) => (
  <div className={cn(
    "bg-slate-950/40 border p-3 rounded-2xl transition-[background-color,border-color,box-shadow] duration-200 group relative overflow-hidden flex flex-col hover:shadow-xl transform-gpu",
    isStaged ? "border-indigo-500/50 bg-indigo-500/5 shadow-lg shadow-indigo-500/10" : "border-slate-800/80 hover:border-emerald-500/30"
  )}>
    <div className="flex items-center justify-between gap-4 relative z-10">
      <div className="flex-1 min-w-0">
        {/* Removed h5 for sug.name */}
        <div className={`flex items-center gap-2 ${rank && !compact ? 'ml-12' : ''}`}>
          <span className="text-[9px] font-bold text-rose-400 uppercase bg-rose-400/5 px-1.5 py-0.5 rounded shadow-sm border border-rose-400/10">
            {sug.source_name}
            {sug.source_post_coverage !== undefined && (
              <span className="ml-1 opacity-50 tabular-nums">({formatCoverage(sug.source_post_coverage)})</span>
            )}
          </span>
          {!compact && (
            <>
              <ArrowRight size={8} className="text-slate-700" />
              <span className="text-[9px] font-bold text-emerald-400 uppercase bg-emerald-400/5 px-1.5 py-0.5 rounded shadow-sm border border-emerald-400/10">
                {destName || 'Destino'}
                {sug.dest_post_coverage !== undefined && (
                  <span className="ml-1 opacity-50 tabular-nums">({formatCoverage(sug.dest_post_coverage)})</span>
                )}
              </span>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[8px] font-black text-indigo-400 uppercase bg-indigo-500/10 px-1.5 py-0.5 rounded-md border border-indigo-500/20">
              {sug.score}% Match
            </span>
            <Info size={12} className="text-slate-600 group-hover:text-indigo-400 transition-colors cursor-help" />
          </div>
        </div>
        {/* Removed sug.post_coverage_days */}
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          {/* Removed "Mover" label */}
          <span className="text-base font-black text-white tabular-nums tracking-tighter">{sug.qty} <span className="text-[9px] text-emerald-500 uppercase font-bold ml-1">u</span></span>
        </div>
        <button
          onClick={onApply}
          className={cn(
            "p-2.5 rounded-xl transition-all active:scale-90 border group/btn",
            isStaged
              ? "bg-indigo-600 border-indigo-500 text-white"
              : "bg-slate-800 hover:bg-emerald-600 text-slate-400 hover:text-white border-slate-700 hover:border-emerald-500"
          )}
        >
          {isStaged ? (
            <CheckCircle2 size={16} strokeWidth={3} className="text-white" />
          ) : (
            <Plus size={16} strokeWidth={3} className="group-hover/btn:rotate-90 transition-transform" />
          )}
        </button>
      </div>
    </div>

    {/* Details - Hidden by default, shows on hover */}
    {((sug.reasons && sug.reasons.length > 0) || sug.source_initial_coverage !== undefined) && (
      <div className="max-h-0 opacity-0 group-hover:max-h-60 group-hover:opacity-100 transition-all duration-300 ease-in-out overflow-hidden">
        <div className="border-t border-slate-800/50 mt-2 pt-2 space-y-3">
          {/* Coverage Impact Comparison */}
          {sug.source_initial_coverage !== undefined && (
            <div className="grid grid-cols-2 gap-4 bg-slate-900/40 p-2 rounded-xl border border-slate-800/50">
              <div className="space-y-1">
                <span className="text-[7px] text-slate-500 font-black uppercase tracking-tighter block">Cobertura Origen</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-slate-400">{formatCoverage(sug.source_initial_coverage)}</span>
                  <ArrowRight size={8} className="text-slate-600" />
                  <span className="text-[9px] font-black text-rose-400">{formatCoverage(sug.source_post_coverage)}</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[7px] text-slate-500 font-black uppercase tracking-tighter block">Cobertura Destino</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-slate-400">{formatCoverage(sug.dest_initial_coverage)}</span>
                  <ArrowRight size={8} className="text-slate-600" />
                  <span className="text-[9px] font-black text-emerald-400">{formatCoverage(sug.dest_post_coverage)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Reasons list */}
          {sug.reasons && sug.reasons.length > 0 && (
            <div className="space-y-1 px-1">
              {sug.reasons.map((reason: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-indigo-500/50 mt-1.5 shrink-0 animate-pulse"></div>
                  <p className="text-[9px] text-slate-400 font-medium leading-tight">{reason.replace(/\.0\b/g, '').replace(/(\d+)u\b/g, '$1 u')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}

  </div>
));

export default App;
