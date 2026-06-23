import React, { useState, useEffect, useMemo, useCallback, useRef, memo, startTransition } from 'react'
import XLSX from 'xlsx-js-style'
import {
  Package, Search, Filter, ArrowUpDown, BrainCircuit, RefreshCw,
  TrendingUp, AlertTriangle, X, ChevronRight, BarChart3,
  Calendar, Info, Box, Archive, Table, FileSpreadsheet, Lock, Eye, EyeOff,
  LogOut, Truck, Clock, ArrowUpRight, SortAsc, LayoutGrid, Users, ListFilter, Globe,
  User, Camera, Key, Save, Store, Settings, ArrowRightLeft, ArrowRight, ArrowLeft, Check, AlertCircle, Trash2, History, CalendarClock, ChevronDown, ArrowUp, ArrowDown, Quote, Plus, CheckCircle2,
  FilterX, PlusCircle, XCircle, Sparkles, Download, ShoppingCart, CheckSquare, Sun, Moon
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import Login from './Login'

// --- Utility: cn ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function getTransferStickyLeftStyle(offset = 0): React.CSSProperties {
  return {
    left: offset === 0 ? 'var(--transfer-sticky-base-left)' : `calc(var(--transfer-sticky-base-left) + ${offset}px)`
  }
}

function getTransferCurrentBranchExtraStickyOffsets({
  showExtraSales,
  showExtraCoverage,
  showExtraABC,
  showMinMax,
  showMLColumns,
  showCost,
  showSalePrice,
  showMargin,
  showListPrice,
  showPrevListPrice,
  showPriceHistory,
}: {
  showExtraSales: boolean
  showExtraCoverage: boolean
  showExtraABC: boolean
  showMinMax: boolean
  showMLColumns: boolean
  showCost?: boolean
  showSalePrice?: boolean
  showMargin?: boolean
  showListPrice?: boolean
  showPrevListPrice?: boolean
  showPriceHistory?: boolean
}) {
  let nextOffset = 170
  const sales = nextOffset
  if (showExtraSales) nextOffset += 52

  const coverage = nextOffset
  if (showExtraCoverage) nextOffset += 55

  const abc = nextOffset
  if (showExtraABC) nextOffset += 48

  const minMax = nextOffset
  if (showMinMax) nextOffset += 58

  const cost = nextOffset
  if (showCost) nextOffset += 50

  const salePrice = nextOffset
  if (showSalePrice) nextOffset += 50

  const margin = nextOffset
  if (showMargin) nextOffset += 55

  const listPrice = nextOffset
  if (showListPrice) nextOffset += 50

  const prevListPrice = nextOffset
  if (showPrevListPrice) nextOffset += 50

  const priceHistory = nextOffset
  if (showPriceHistory) nextOffset += 50

  const prediction = nextOffset
  if (showMLColumns) nextOffset += 100

  const leadTime = nextOffset
  if (showMLColumns) nextOffset += 80

  const risk = nextOffset
  if (showMLColumns) nextOffset += 90

  return { sales, coverage, abc, minMax, cost, salePrice, margin, listPrice, prevListPrice, priceHistory, prediction, leadTime, risk }
}

function getTransferConsolidatedStickyOffsets({
  showExtraSales,
  showExtraCoverage,
  showExtraABC,
  showMinMax,
  showMLColumns,
  showCost,
  showSalePrice,
  showMargin,
  showListPrice,
  showPrevListPrice,
  showPriceHistory,
}: {
  showExtraSales: boolean
  showExtraCoverage: boolean
  showExtraABC: boolean
  showMinMax: boolean
  showMLColumns: boolean
  showCost?: boolean
  showSalePrice?: boolean
  showMargin?: boolean
  showListPrice?: boolean
  showPrevListPrice?: boolean
  showPriceHistory?: boolean
}) {
  let nextOffset = 85
  const sales = nextOffset
  if (showExtraSales) nextOffset += 52

  const coverage = nextOffset
  if (showExtraCoverage) nextOffset += 55

  const abc = nextOffset
  if (showExtraABC) nextOffset += 48

  const minMax = nextOffset
  if (showMinMax) nextOffset += 58

  const cost = nextOffset
  if (showCost) nextOffset += 50

  const salePrice = nextOffset
  if (showSalePrice) nextOffset += 50

  const margin = nextOffset
  if (showMargin) nextOffset += 55

  const listPrice = nextOffset
  if (showListPrice) nextOffset += 50

  const prevListPrice = nextOffset
  if (showPrevListPrice) nextOffset += 50

  const priceHistory = nextOffset
  if (showPriceHistory) nextOffset += 50

  const prediction = nextOffset
  if (showMLColumns) nextOffset += 100

  const leadTime = nextOffset
  if (showMLColumns) nextOffset += 80

  const risk = nextOffset
  if (showMLColumns) nextOffset += 90

  return { sales, coverage, abc, minMax, cost, salePrice, margin, listPrice, prevListPrice, priceHistory, prediction, leadTime, risk, end: nextOffset }
}

const normalizeStockValue = (value: unknown) => {
  const numericValue = Number(value)
  return Number.isNaN(numericValue) ? 0 : Math.abs(numericValue)
}

const normalizeExportText = (value: unknown) => {
  if (value === null || value === undefined) return ''

  return String(value)
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
}

const normalizeStockByWarehouse = (stockByWh?: Record<string, number>) => {
  if (!stockByWh) return undefined

  return Object.fromEntries(
    Object.entries(stockByWh).map(([warehouseId, stock]) => [warehouseId, normalizeStockValue(stock)])
  ) as Record<string, number>
}

const normalizeProductStock = (p: any): Product => {
  const totalStock = normalizeStockValue(p.total_stock)

  return {
    ...p,
    provider: normalizeExportText(p.provider),
    total_stock: totalStock,
    stock_by_wh: normalizeStockByWarehouse(p.stock_by_wh),
    currentStock: totalStock,
    currentSales: p.sales_30d,
    currentPending: p.total_pending,
    currentStatus: totalStock <= 0 ? 'Sin Stock' : 'Normal'
  }
}

type PurchaseSuggestionWarehouseData = {
  abc?: string
  sales?: number
  stock?: number
  sugerido?: number
  cob_actual?: number
  cob_con_sugerido?: number
}

type PurchaseSuggestionRow = {
  barcode?: string
  default_code?: string
  name?: string
  full_name?: string
  tags?: string[]
  uom_package?: number
  abc?: string
  per_wh?: Record<string, PurchaseSuggestionWarehouseData>
  stock_transito?: number
  all_sales?: number
  all_stock?: number
  sugerido_total?: number
  precio_lista?: number
  prev_price?: number
  fecha_actualizada?: string
  sub_total?: number
}

type SuggestedTransfer = {
  source: string
  destination: string
  qty: number
}

const formatCoverageValue = (coverage: number) => {
  return coverage >= 999 ? 'SIN VENTAS' : Math.round(coverage * 10) / 10
}

const getPurchaseAnalysisBaseRow = (rowData: PurchaseSuggestionRow, sellerLabel: string) => ({
  'CODIGO EAN': rowData.barcode || '',
  'CODIGO PROD': rowData.default_code || '',
  'ETIQUETA': (rowData.tags || []).join(', ') || '',
  'DESCRIPCION': rowData.name || rowData.full_name || '',
  'U x C': rowData.uom_package ?? '',
  'ABC': rowData.abc || 'E',
  'SELLER': sellerLabel,
})

const getTransferSafeQuantity = (quantity: number, packSize: number) => {
  if (quantity <= 0) return 0
  if (packSize <= 1) return Math.floor(quantity)
  return Math.floor(quantity / packSize) * packSize
}

// Classify a warehouse name as 'almacén' (main warehouse) vs 'sala' (selling room)
const isAlmacenWarehouse = (name: string): boolean => {
  const u = name.toUpperCase()
  return u.includes('ALM') || u.includes('CENTRAL') || u.includes('ALMACEN')
}

const SALA_SUB_COLS  = ['Sell Out', 'Stock', 'Sug', 'Cob']
const ALMACEN_SUB_COLS = ['Stock']

/**
 * Builds purchase + transfer XLSX sheets with a 2-row merged header.
 * Row 1: warehouse name (merged across its sub-columns)
 * Row 2: sub-column names (Sell Out / Stock / Sug / Cob for salas; Stock only for almacenes)
 * Order: almacenes first, then salas.
 */
const buildPurchaseAnalysisSheet = ({
  rows,
  warehouseNames,
  abcCoverage,
  sellerLabel,
  days,
}: {
  rows: PurchaseSuggestionRow[]
  warehouseNames: string[]
  abcCoverage: Record<string, number>
  sellerLabel: string
  days: number
}): { purchaseSheet: XLSX.WorkSheet; transferSheet: XLSX.WorkSheet } => {
  // Sort: almacenes first, then salas (preserving relative order within each group)
  const sortedWarehouses = [
    ...warehouseNames.filter(isAlmacenWarehouse),
    ...warehouseNames.filter(w => !isAlmacenWarehouse(w)),
  ]

  const BASE_COLS    = ['CODIGO EAN', 'CODIGO PROD', 'ETIQUETA', 'DESCRIPCION', 'U x C', 'ABC', 'SELLER']
  const SUMMARY_COLS = ['Stk. Tránsito', 'SUGERIDO']
  // TOTAL section mirrors a sala: same 4 sub-cols + price/date info
  const TOTAL_SUB_COLS = ['Sell Out', 'Stock', 'Sug', 'Cob', 'F. Actualización', 'P. Anterior', 'P. Lista']

  // --- Build header rows ---
  // Row 1: only sala names (first sub-col of each sala). Everything else empty.
  // Row 2: all actual column labels.
  const hdr1: any[] = BASE_COLS.map(() => '')
  const hdr2: any[] = BASE_COLS.map(h => h)

  const merges: XLSX.Range[] = []

  let colIdx = BASE_COLS.length

  // Warehouse columns — NO merges on sala sub-columns so each is independently searchable/filterable
  for (const wh of sortedWarehouses) {
    const isAlmacen = isAlmacenWarehouse(wh)
    const subCols = isAlmacen ? ALMACEN_SUB_COLS : SALA_SUB_COLS

    if (isAlmacen) {
      hdr1.push('')   // row 1 empty
      hdr2.push(wh)   // label in row 2
      colIdx += 1
    } else {
      // Salas: Row 1 = Name only in first sub-col, rest empty. Row 2 = Sub-headers.
      for (let i = 0; i < subCols.length; i++) {
        hdr1.push(i === 0 ? wh : '')
        hdr2.push(subCols[i])
      }
      colIdx += subCols.length
    }
  }

  // Summary columns (Stk. Tránsito, SUGERIDO) — label in row 2
  const summaryStartCol = colIdx
  for (let i = 0; i < SUMMARY_COLS.length; i++) {
    hdr1.push('')
    hdr2.push(SUMMARY_COLS[i])
    colIdx += 1
  }

  // TOTAL section — merge Row 1 across all TOTAL_SUB_COLS, then sub-headers in Row 2
  const totalSectionStartCol = colIdx
  for (let i = 0; i < TOTAL_SUB_COLS.length; i++) {
    hdr1.push(i === 0 ? 'TOTAL' : '')
    hdr2.push(TOTAL_SUB_COLS[i])
  }
  // Merge 'TOTAL' label across its sub-columns in row 1
  if (TOTAL_SUB_COLS.length > 1) {
    merges.push({
      s: { r: 0, c: totalSectionStartCol },
      e: { r: 0, c: totalSectionStartCol + TOTAL_SUB_COLS.length - 1 },
    })
  }

  // --- Styles ---
  const styleHdr1: any = {
    font: { bold: true, sz: 9, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E293B' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  }
  const styleHdr2: any = {
    font: { bold: true, sz: 8, color: { rgb: 'CBD5E1' } },
    fill: { fgColor: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  }
  const styleData: any = {
    font: { sz: 8 },
    alignment: { vertical: 'center', wrapText: true },
  }
  const styleDataRight: any = {
    font: { sz: 8 },
    alignment: { vertical: 'center', horizontal: 'right', wrapText: false },
  }

  // --- Build purchase data rows (AoA) ---
  const purchaseAoa: any[][] = [hdr1, hdr2]
  // Transfer sheet: single-header flat rows
  const TRANSFER_HEADERS = ['CODIGO EAN','CODIGO PROD','ETI','DESCRIPCION','U x C','ABC','SELLER','DESDE','HACIA','CANTIDAD','COB ANTIGUA','COB NUEVA','P. LISTA','SUBTOTAL']
  const transferAoa: any[][] = [TRANSFER_HEADERS]

  for (const rowData of rows) {
    const perWh      = rowData.per_wh || {}
    const rowAbc     = (rowData.abc || 'E').toUpperCase()
    const covDays    = Number(abcCoverage[rowAbc] || 0)
    const packSize   = Math.max(1, Number(rowData.uom_package) || 1)

    // Transfer logic (same algorithm as before)
    const deficits = warehouseNames
      .map(wh => { const d = perWh[wh] || {}; const sug = Math.max(0, Number(d.sugerido) || 0); return { wh, remainingNeed: sug, sug } })
      .filter(x => x.remainingNeed > 0)
      .sort((a, b) => b.remainingNeed - a.remainingNeed)

    const donors = warehouseNames
      .map(wh => {
        const d = perWh[wh] || {}
        const sales = Math.max(0, Number(d.sales) || 0)
        const stock = Math.max(0, Number(d.stock) || 0)
        const daily = days > 0 ? sales / days : 0
        const available = getTransferSafeQuantity(Math.max(0, stock - daily * covDays), packSize)
        return { wh, availableQty: available }
      })
      .filter(x => x.availableQty > 0)
      .sort((a, b) => b.availableQty - a.availableQty)

    const transfers: SuggestedTransfer[] = []
    const transferredByDest: Record<string, number> = {}
    for (const deficit of deficits) {
      for (const donor of donors) {
        if (deficit.remainingNeed <= 0) break
        if (donor.availableQty   <= 0) continue
        if (donor.wh === deficit.wh)   continue
        const qty = getTransferSafeQuantity(Math.min(deficit.remainingNeed, donor.availableQty), packSize)
        if (qty <= 0) continue
        donor.availableQty  -= qty
        deficit.remainingNeed -= qty
        transferredByDest[deficit.wh] = (transferredByDest[deficit.wh] || 0) + qty
        transfers.push({ source: donor.wh, destination: deficit.wh, qty })
      }
    }

    // Base columns data
    const baseData: any[] = [
      rowData.barcode || '',
      rowData.default_code || '',
      (rowData.tags || []).join(', ') || '',
      rowData.name || rowData.full_name || '',
      rowData.uom_package ?? '',
      rowData.abc || 'E',
      sellerLabel,
    ]

    // Warehouse columns data (sorted order)
    let totalSugerido = 0
    const whCells: any[] = []
    for (const wh of sortedWarehouses) {
      const d           = perWh[wh] || {}
      const transferred = transferredByDest[wh] || 0
      const remaining   = Math.max(0, (Number(d.sugerido) || 0) - transferred)
      totalSugerido    += remaining
      if (isAlmacenWarehouse(wh)) {
        whCells.push(d.stock ?? 0)
      } else {
        // Cobertura con sugerido: valor directo del servidor
        const cobVal = (d.cob_con_sugerido !== undefined && d.cob_con_sugerido !== null)
          ? d.cob_con_sugerido
          : (d.cob_actual ?? 999)
        whCells.push(
          d.sales ?? 0,
          d.stock ?? 0,
          remaining,
          formatCoverageValue(cobVal),
        )
      }
    }

    // Stock TOTAL excludes warehouses with 'PISO' in the name (already counted in San Miguel)
    const stockTotalSinPiso = sortedWarehouses.reduce((sum, wh) => {
      if (wh.toUpperCase().includes('PISO')) return sum
      const d = perWh[wh] || {}
      return sum + (Number(d.stock) || 0)
    }, 0)
    const totalSellOut = Number(rowData.all_sales) || 0
    const dailySellOut = days > 0 ? totalSellOut / days : 0
    const cobConSug = dailySellOut > 0
      ? formatCoverageValue((stockTotalSinPiso + totalSugerido) / dailySellOut)
      : 'SIN VENTAS'
    const summaryData: any[] = [rowData.stock_transito ?? 0, totalSugerido]
    const totalSectionData: any[] = [
      totalSellOut,
      Math.round(stockTotalSinPiso * 100) / 100,
      totalSugerido,
      cobConSug,
      rowData.fecha_actualizada || '',
      rowData.prev_price ?? '',
      rowData.precio_lista ?? '',
    ]

    purchaseAoa.push([...baseData, ...whCells, ...summaryData, ...totalSectionData])

    const precio = Number(rowData.precio_lista) || 0
    // Transfer rows
    const cumulativeDest: Record<string, number> = {}
    for (const tr of transfers) {
      const dd        = perWh[tr.destination] || { sales: 0, stock: 0, cob_actual: 999 }
      const ddSales   = Math.max(0, Number(dd.sales) || 0)
      const ddStock   = Math.max(0, Number(dd.stock) || 0)
      const ddDaily   = days > 0 ? ddSales / days : 0
      const ddOldCov  = Number(dd.cob_actual ?? 999)
      cumulativeDest[tr.destination] = (cumulativeDest[tr.destination] || 0) + tr.qty
      const ddNewStock = ddStock + cumulativeDest[tr.destination]
      const ddNewCov   = ddDaily > 0 ? ddNewStock / ddDaily : 999
      const trSubtotal = Math.round(precio * tr.qty * 100) / 100
      transferAoa.push([
        rowData.barcode || '', rowData.default_code || '',
        (rowData.tags || []).join(', ') || '',
        rowData.name || rowData.full_name || '',
        rowData.uom_package ?? '', rowData.abc || 'E', sellerLabel,
        tr.source, tr.destination, tr.qty,
        formatCoverageValue(ddOldCov), formatCoverageValue(ddNewCov),
        rowData.precio_lista ?? '', trSubtotal,
      ])
    }
  }

  // --- Assemble purchase sheet ---
  const purchaseSheet = XLSX.utils.aoa_to_sheet(purchaseAoa)
  purchaseSheet['!merges'] = merges
  purchaseSheet['!rows']   = [{ hpt: 14 }, { hpt: 22 }]

  // Column widths — compact: base cols by content, warehouse sub-cols narrow
  const baseColWidths: Record<string, number> = {
    'CODIGO EAN': 14, 'CODIGO PROD': 11, 'ETIQUETA': 10, 'DESCRIPCION': 28,
    'U x C': 5, 'ABC': 4, 'SELLER': 8,
  }
  const totalCols = hdr1.length
  purchaseSheet['!cols'] = Array.from({ length: totalCols }, (_, c) => {
    const h1 = String(hdr1[c] || '')
    const h2 = String(hdr2[c] || '')
    // Base columns
    if (c < BASE_COLS.length) return { wch: baseColWidths[BASE_COLS[c]] || 10 }
    // Summary columns (Stk. Tránsito, SUGERIDO) and TOTAL section — same compact widths as salas
    if (c >= summaryStartCol) return { wch: Math.min(14, Math.max(h2.length, 6) + 1) }
    // Warehouse sub-columns: compact
    if (h2 === 'Sell Out') return { wch: 8 }
    if (h2 === 'Stock') return { wch: 7 }
    if (h2 === 'Sug') return { wch: 6 }
    if (h2 === 'Cob') return { wch: 10 }
    // Almacen stock columns
    return { wch: Math.min(12, Math.max(h1.length, 6)) }
  })

  // Apply cell styles — TOTAL section uses the same styles as regular sala columns
  const pr = XLSX.utils.decode_range(purchaseSheet['!ref'] || 'A1')
  for (let r = pr.s.r; r <= pr.e.r; r++) {
    for (let c = pr.s.c; c <= pr.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      if (!purchaseSheet[addr]) continue
      if (r === 0) purchaseSheet[addr].s = styleHdr1
      else if (r === 1) purchaseSheet[addr].s = styleHdr2
      else if (!purchaseSheet[addr].f) {
        const isNumeric = typeof purchaseSheet[addr].v === 'number'
        purchaseSheet[addr].s = isNumeric ? styleDataRight : styleData
      }
    }
  }

  // --- Assemble transfer sheet ---
  const transferSheet = XLSX.utils.aoa_to_sheet(transferAoa)
  // Column widths for transfer
  if (transferAoa.length > 0) {
    transferSheet['!cols'] = TRANSFER_HEADERS.map((h, c) => {
      const maxData = transferAoa.slice(1).reduce((mx, row) => Math.max(mx, String(row[c] ?? '').length), 0)
      return { wch: Math.min(35, Math.max(h.length, maxData, 4) + 1) }
    })
  }
  const tr2 = XLSX.utils.decode_range(transferSheet['!ref'] || 'A1')
  for (let r = tr2.s.r; r <= tr2.e.r; r++) {
    for (let c = tr2.s.c; c <= tr2.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      if (!transferSheet[addr]) continue
      transferSheet[addr].s = r === 0 ? styleHdr1 : (typeof transferSheet[addr].v === 'number' ? styleDataRight : styleData)
    }
  }

  return { purchaseSheet, transferSheet }
}

const buildPurchaseAnalysisWorkbookData = ({
  rows,
  warehouseNames,
  abcCoverage,
  sellerLabel,
  days,
}: {
  rows: PurchaseSuggestionRow[]
  warehouseNames: string[]
  abcCoverage: Record<string, number>
  sellerLabel: string
  days: number
}) => {
  const purchaseRows: Record<string, any>[] = []
  const transferRows: Record<string, any>[] = []

  for (const rowData of rows) {
    const baseRow = getPurchaseAnalysisBaseRow(rowData, sellerLabel)
    const rowAbc = (rowData.abc || 'E').toUpperCase()
    const coverageDays = Number(abcCoverage[rowAbc] || 0)
    const packSize = Math.max(1, Number(rowData.uom_package) || 1)
    const perWh = rowData.per_wh || {}

    const deficits = warehouseNames
      .map((warehouseName) => {
        const warehouseData = perWh[warehouseName] || {}
        const suggestedQty = Math.max(0, Number(warehouseData.sugerido) || 0)
        return { warehouseName, remainingNeed: suggestedQty, suggestedQty }
      })
      .filter((item) => item.remainingNeed > 0)
      .sort((a, b) => b.remainingNeed - a.remainingNeed)

    const donors = warehouseNames
      .map((warehouseName) => {
        const warehouseData = perWh[warehouseName] || {}
        const salesQty = Math.max(0, Number(warehouseData.sales) || 0)
        const stockQty = Math.max(0, Number(warehouseData.stock) || 0)
        const dailySales = days > 0 ? (salesQty / days) : 0
        const targetStock = dailySales * coverageDays
        const transferableQty = getTransferSafeQuantity(Math.max(0, stockQty - targetStock), packSize)
        return { warehouseName, availableQty: transferableQty }
      })
      .filter((item) => item.availableQty > 0)
      .sort((a, b) => b.availableQty - a.availableQty)

    const transfers: SuggestedTransfer[] = []
    const transferredByDestination: Record<string, number> = {}

    for (const deficit of deficits) {
      for (const donor of donors) {
        if (deficit.remainingNeed <= 0) break
        if (donor.availableQty <= 0) continue
        if (donor.warehouseName === deficit.warehouseName) continue

        const transferQty = getTransferSafeQuantity(
          Math.min(deficit.remainingNeed, donor.availableQty),
          packSize
        )

        if (transferQty <= 0) continue

        donor.availableQty -= transferQty
        deficit.remainingNeed -= transferQty
        transferredByDestination[deficit.warehouseName] = (transferredByDestination[deficit.warehouseName] || 0) + transferQty
        transfers.push({
          source: donor.warehouseName,
          destination: deficit.warehouseName,
          qty: transferQty,
        })
      }
    }

    let remainingSuggestedTotal = 0
    const purchaseRow: Record<string, any> = { ...baseRow }

    for (const warehouseName of warehouseNames) {
      const warehouseData = perWh[warehouseName] || { abc: 'E', sales: 0, stock: 0, sugerido: 0, cob_actual: 999 }
      const currentCoverage = warehouseData.cob_actual ?? 999
      const projectedCoverage = warehouseData.cob_con_sugerido ?? currentCoverage
      const transferredQty = transferredByDestination[warehouseName] || 0
      const remainingSuggested = Math.max(0, (Number(warehouseData.sugerido) || 0) - transferredQty)

      purchaseRow[`${warehouseName} ABC`] = warehouseData.abc || 'E'
      purchaseRow[`${warehouseName} Cob.Actual`] = currentCoverage >= 999 ? 'SIN VENTAS' : currentCoverage
      purchaseRow[`${warehouseName} Cob.Con Sugerido`] = projectedCoverage >= 999 ? 'SIN VENTAS' : projectedCoverage
      purchaseRow[`${warehouseName} Sales`] = warehouseData.sales ?? 0
      purchaseRow[`${warehouseName} Stock`] = warehouseData.stock ?? 0
      purchaseRow[`${warehouseName} Sugerido`] = remainingSuggested
      remainingSuggestedTotal += remainingSuggested
    }

    const descMonto = 0
    const bonif = 0
    const subtotal = Math.round(((Number(rowData.precio_lista) || 0) * remainingSuggestedTotal) * 100) / 100

    purchaseRow['Stock Transito'] = rowData.stock_transito ?? 0
    purchaseRow['ALL Sales'] = rowData.all_sales ?? 0
    purchaseRow['ALL Stock'] = rowData.all_stock ?? 0
    purchaseRow['SUGERIDO'] = remainingSuggestedTotal
    purchaseRow['P. ANTERIOR'] = rowData.prev_price ?? ''
    purchaseRow['F. ACTUALIZACIÓN'] = rowData.fecha_actualizada || ''
    purchaseRow['P. LISTA'] = rowData.precio_lista ?? ''
    purchaseRow['SUBTOTAL'] = subtotal - descMonto + bonif

    purchaseRows.push(purchaseRow)

    const cumulativeTransferredByDestination: Record<string, number> = {}
    for (const transfer of transfers) {
      const destinationData = perWh[transfer.destination] || { sales: 0, stock: 0, cob_actual: 999 }
      const destinationSales = Math.max(0, Number(destinationData.sales) || 0)
      const destinationStock = Math.max(0, Number(destinationData.stock) || 0)
      const destinationDailySales = days > 0 ? (destinationSales / days) : 0
      const destinationOldCoverage = Number(destinationData.cob_actual ?? 999)
      cumulativeTransferredByDestination[transfer.destination] = (cumulativeTransferredByDestination[transfer.destination] || 0) + transfer.qty
      const destinationNewStock = destinationStock + cumulativeTransferredByDestination[transfer.destination]
      const destinationNewCoverage = destinationDailySales > 0 ? (destinationNewStock / destinationDailySales) : 999

      const transferRow: Record<string, any> = {
        ...baseRow,
        'DESDE SUCURSAL': transfer.source,
        'HACIA SUCURSAL': transfer.destination,
        'CANTIDAD TRASPASO': transfer.qty,
        'COBERTURA ANTIGUA': formatCoverageValue(destinationOldCoverage),
        'COBERTURA NUEVA': formatCoverageValue(destinationNewCoverage),
      }

      for (const warehouseName of warehouseNames) {
        const warehouseData = perWh[warehouseName] || { abc: 'E', sales: 0, stock: 0, sugerido: 0, cob_actual: 999 }
        const currentCoverage = warehouseData.cob_actual ?? 999
        const projectedCoverage = warehouseData.cob_con_sugerido ?? currentCoverage

        transferRow[`${warehouseName} ABC`] = warehouseData.abc || 'E'
        transferRow[`${warehouseName} Cob.Actual`] = currentCoverage >= 999 ? 'SIN VENTAS' : currentCoverage
        transferRow[`${warehouseName} Cob.Con Sugerido`] = projectedCoverage >= 999 ? 'SIN VENTAS' : projectedCoverage
        transferRow[`${warehouseName} Sales`] = warehouseData.sales ?? 0
        transferRow[`${warehouseName} Stock`] = warehouseData.stock ?? 0
        transferRow[`${warehouseName} Sugerido`] = warehouseData.sugerido ?? 0
      }

      transferRow['Stock Transito'] = rowData.stock_transito ?? 0
      transferRow['ALL Sales'] = rowData.all_sales ?? 0
      transferRow['ALL Stock'] = rowData.all_stock ?? 0
      transferRow['SUGERIDO'] = transfer.qty
      transferRow['P. ANTERIOR'] = rowData.prev_price ?? ''
      transferRow['F. ACTUALIZACIÓN'] = rowData.fecha_actualizada || ''
      transferRow['P. LISTA'] = rowData.precio_lista ?? ''
      transferRow['SUBTOTAL'] = Math.round(((Number(rowData.precio_lista) || 0) * transfer.qty) * 100) / 100

      transferRows.push(transferRow)
    }
  }

  return { purchaseRows, transferRows }
}

const applyAutoColumnWidths = (sheet: XLSX.WorkSheet, data: Record<string, any>[]) => {
  if (!data.length) return

  sheet['!cols'] = Object.keys(data[0]).map((key: string) => ({
    wch: Math.min(40, Math.max(key.length, ...data.slice(0, 100).map((item: Record<string, any>) => String(item[key] ?? '').length)) + 2)
  }))
}

const applyCompactColumnWidths = (sheet: XLSX.WorkSheet, data: Record<string, any>[]) => {
  if (!data.length) return
  sheet['!cols'] = Object.keys(data[0]).map((key: string) => ({
    wch: Math.min(18, Math.max(key.length, ...data.slice(0, 100).map((item: Record<string, any>) => String(item[key] ?? '').length)) + 1)
  }))
}

const applyExcelFormatting = (sheet: XLSX.WorkSheet, data: Record<string, any>[]) => {
  if (!data.length) return
  const cellStyle = { font: { sz: 9 }, alignment: { wrapText: true, vertical: 'center' } }
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      if (!sheet[addr]) continue
      sheet[addr].s = cellStyle
    }
  }
}

const warehouseAbbreviations: Record<string, string> = {
  'ANDYS OBRAJES': 'ANDYS OBRAJES',
  'ANDYS OBRAJES 2': 'ANDYS OBRAJES 2',
  'ANDYS NORTE': 'ANDYS NTE',
  'ANDYS SUR': 'ANDYS SUR',
  'ANDYS PILAR': 'ANDYS PLR',
  'ANDYS SAN ISIDRO': 'ANDYS SI',
  'ANDYS VINECA': 'ANDYS VNC',
  'ALMACEN CENTRAL': 'ALM CEN',
  'ALMACEN CENTRAL 2': 'ALM CEN2',
}

const getWarehouseAbbreviation = (name: string): string => {
  const cleaned = name.split(':')[0].trim().toUpperCase()
  return warehouseAbbreviations[cleaned] || name.split(':')[0].trim()
}

const DebouncedSearchInput = React.memo(({ value, onChange, placeholder, className, icon: Icon, focusColor, children }: any) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="flex-1 min-w-[300px] transition-all duration-300">
      <div className="flex items-center gap-2">
        <div className="relative group flex-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Icon className={cn("text-slate-500 transition-colors", focusColor)} size={16} />
          </div>
          <input
            type="text"
            placeholder={placeholder}
            value={localValue}
            onChange={handleChange}
            className={className}
          />
        </div>
      </div>
      {children}
    </div>
  );
});

DebouncedSearchInput.displayName = 'DebouncedSearchInput';

const isSimpleWarehouseName = (name = '') => {
  const upper = name.toUpperCase()
  return upper.includes('ALMACEN') || upper.includes('PISO') || upper.includes('INVENTARIO')
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
  if (upper.includes('CINEBOL')) return 'NUBA CINEBOL';
  if (upper.includes('MEGACENTER')) return 'NUBA MEGACENTER';
  if (upper.includes('MULTICINE')) return 'NUBA MULTICINE';
  if (upper.includes('SAN MARTIN')) return 'NUBA SAN MARTIN';
  if (upper.includes('VELARDE') || upper === 'EALMV' || upper === 'ENVEL') return 'ALMACEN VELARDE SCZ';
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

type WarehouseCompanyFilter = 'EXPANDIA' | 'ATI' | 'WAREHOME' | 'COQUETA'
type WarehouseBaseGroup = 'All' | 'NUBA' | 'ANDYS' | WarehouseCompanyFilter
type WarehouseColumnFilter = WarehouseBaseGroup | 'TOTAL_NUBA' | 'TOTAL_ANDYS' | 'TOTAL_ALL'
type ScopedWarehouseBaseGroup = Exclude<WarehouseBaseGroup, 'All'>
type WarehouseAccessMode = 'ALL' | 'ANDYS_ONLY'

const WAREHOUSE_COMPANY_FILTERS: WarehouseCompanyFilter[] = ['EXPANDIA', 'ATI', 'WAREHOME', 'COQUETA']
const SCOPED_WAREHOUSE_BASE_GROUPS: ScopedWarehouseBaseGroup[] = ['NUBA', 'ANDYS', ...WAREHOUSE_COMPANY_FILTERS]

const normalizeWarehouseAccess = (access?: string | null): WarehouseAccessMode =>
  access === 'ANDYS_ONLY' ? 'ANDYS_ONLY' : 'ALL'

const getAllowedWarehouseColumnFiltersForAccess = (access: WarehouseAccessMode): WarehouseColumnFilter[] => {
  if (access === 'ANDYS_ONLY') {
    return ['ANDYS', 'TOTAL_ANDYS']
  }

  return ['All', 'TOTAL_ALL', 'NUBA', 'TOTAL_NUBA', 'EXPANDIA', 'ATI', 'ANDYS', 'TOTAL_ANDYS', 'WAREHOME', 'COQUETA']
}

const getAllowedWarehouseBaseGroupsForAccess = (access: WarehouseAccessMode): WarehouseBaseGroup[] => {
  if (access === 'ANDYS_ONLY') {
    return ['ANDYS']
  }

  return ['All', 'NUBA', 'ANDYS', ...WAREHOUSE_COMPANY_FILTERS]
}

const getDefaultWarehouseColumnFilterForAccess = (access: WarehouseAccessMode): WarehouseColumnFilter =>
  access === 'ANDYS_ONLY' ? 'ANDYS' : 'All'

const createWarehouseAliasSet = (aliases: string[]) => new Set(aliases.map(alias => alias.toUpperCase()))

const COMPANY_WAREHOUSE_ALIASES: Record<WarehouseCompanyFilter, Set<string>> = {
  EXPANDIA: createWarehouseAliasSet([
    'ALMACEN SANTA CRUZ',
    'ALMACEN SOPOCACHI',
    'CBAME',
    'EACEN',
    'EALMV',
    'ENAME',
    'ENCNB',
    'ENMC',
    'ENMUL',
    'ENSMC',
    'ENVEL',
    'EXPANDIA ALMACEN CENTRAL LPZ',
    'EXPANDIA ALMACEN VELARDE',
    'EXPANDIA ALMACEN VELARDE SCZ',
    'EXPANDIA CENTRAL LA PAZ'
  ]),
  ATI: createWarehouseAliasSet([
    'ACH',
    'ANDYS ACHUMANI',
    'ANDYS OBRAJES',
    'ANDYS SAN MIGUEL',
    'CEN',
    'FRUVE',
    'FRUVER',
    'GRANIPAN',
    'N06',
    'N21',
    'NCOR',
    'NPIN',
    'NPRA',
    'NSH',
    'NSUC',
    'NUBA SUCRE',
    'OBR',
    'PAN',
    'PISO3',
    'SM',
    'SOP',
    'YAM YAM POTOSI',
    'YAM YAM SOPOCACHI',
    'YYP',
    'YYS'
  ]),
  WAREHOME: createWarehouseAliasSet([
    'ADPT1',
    'ALMACEN ADAPTIA SAN MIGUEL',
    'ALMACEN ADAPTIA VELARDE',
    'CENTRAL ADAPTIA',
    'WAREHOME MONTENEGRO',
    'WAREHOME VELARDE',
    'WMO',
    'WVE'
  ]),
  COQUETA: createWarehouseAliasSet([
    'CCAP',
    'CTUM'
  ])
}

const getWarehouseNameUpper = (warehouse: any) => String(warehouse?.name || '').toUpperCase()
const getWarehouseCodeUpper = (warehouse: any) => String(warehouse?.code || '').toUpperCase()

const isNubaMegacenterWarehouse = (warehouse: any) => getWarehouseNameUpper(warehouse) === 'NUBA MEGACENTER'
const isCentralWarehouse = (warehouse: any) => getWarehouseNameUpper(warehouse) === 'ALMACEN CENTRAL'
const isPiso3Warehouse = (warehouse: any) => getWarehouseNameUpper(warehouse).includes('ALMACEN PISO 3')
const isSopocachiWarehouse = (warehouse: any) => {
  const name = getWarehouseNameUpper(warehouse)
  return name.includes('ALMACEN SOPOCACHI') || name.includes('NUBA SOPOCACHI')
}
const isVelardeWarehouse = (warehouse: any) => {
  const name = getWarehouseNameUpper(warehouse)
  return name.includes('VELARDE') || name.includes('ALMACEN VELARDE') || name === 'EALMV' || name === 'ENVEL'
}
const matchesWarehouseCompany = (warehouse: any, company: WarehouseCompanyFilter) => {
  const aliases = COMPANY_WAREHOUSE_ALIASES[company]
  if (!aliases) return false

  const name = getWarehouseNameUpper(warehouse)
  const code = getWarehouseCodeUpper(warehouse)
  return aliases.has(name) || aliases.has(code)
}

const isNubaWarehouse = (warehouse: any) => {
  const name = getWarehouseNameUpper(warehouse)
  return name.includes('NUBA') || name.includes('EXPANDIA') || matchesWarehouseCompany(warehouse, 'EXPANDIA')
}

const isAndysWarehouse = (warehouse: any) => {
  const name = getWarehouseNameUpper(warehouse)
  return name.includes('ANDY') || name.includes('YAM YAM')
}

const isAndysSanMiguelWarehouse = (warehouse: any) => {
  const name = getWarehouseNameUpper(warehouse)
  return isAndysWarehouse(warehouse) && name.includes('SAN MIGUEL')
}

const isInventarioObservadoWarehouse = (warehouse: any) =>
  getWarehouseNameUpper(warehouse).includes('INVENTARIO OBSERVADO')

const isStorageWarehouse = (warehouse: any) => (
  isCentralWarehouse(warehouse) || isPiso3Warehouse(warehouse) || isSopocachiWarehouse(warehouse) || isVelardeWarehouse(warehouse)
)

const getWarehouseBaseGroupFromColumnFilter = (filter: WarehouseColumnFilter): WarehouseBaseGroup => {
  if (filter === 'TOTAL_NUBA') return 'NUBA'
  if (filter === 'TOTAL_ANDYS') return 'ANDYS'
  if (filter === 'TOTAL_ALL') return 'All'
  return filter
}

const isConsolidatedWarehouseColumnFilter = (filter: WarehouseColumnFilter) => (
  filter === 'TOTAL_NUBA' || filter === 'TOTAL_ANDYS' || filter === 'TOTAL_ALL'
)

const isCompanyWarehouseColumnFilter = (filter: WarehouseColumnFilter): filter is WarehouseCompanyFilter =>
  WAREHOUSE_COMPANY_FILTERS.includes(filter as WarehouseCompanyFilter)

const matchesWarehouseBaseGroup = (warehouse: any, group: WarehouseBaseGroup) => {
  if (!warehouse || warehouse.id === null) return group === 'All'
  if (isNubaMegacenterWarehouse(warehouse)) return false

  if (group === 'All') return true
  if (group === 'NUBA') return isNubaWarehouse(warehouse)
  if (group === 'ANDYS') return isAndysWarehouse(warehouse)
  return matchesWarehouseCompany(warehouse, group)
}

const isObservadoWarehouse = (warehouse: any) => getWarehouseNameUpper(warehouse).includes('OBSERVADO')

const matchesWarehouseColumnScope = (warehouse: any, filter: WarehouseColumnFilter) => {
  if (!warehouse || warehouse.id === null) return false
  if (isNubaMegacenterWarehouse(warehouse)) return false
  if (isObservadoWarehouse(warehouse)) return false

  const group = getWarehouseBaseGroupFromColumnFilter(filter)
  if (group === 'All') {
    return isNubaWarehouse(warehouse) || isAndysWarehouse(warehouse) || isStorageWarehouse(warehouse)
  }
  if (group === 'NUBA') {
    return isNubaWarehouse(warehouse) || isCentralWarehouse(warehouse) || isSopocachiWarehouse(warehouse)
  }
  if (group === 'ANDYS') {
    return isAndysWarehouse(warehouse) || isCentralWarehouse(warehouse) || isPiso3Warehouse(warehouse)
  }
  return matchesWarehouseCompany(warehouse, group)
}

const WAREHOME_VIRTUAL_DEFS = [
  {
    id: 'vwh_central_adaptia',
    name: 'CENTRAL ADAPTIA',
    code: 'CADP',
    _is_virtual: true,
    _member_aliases: new Set(['ADPT1', 'ALMACEN ADAPTIA SAN MIGUEL', 'ALMACEN ADAPTIA VELARDE', 'CENTRAL ADAPTIA', 'WAREHOME MONTENEGRO', 'WAREHOME VELARDE', 'WMO', 'WVE']),
  },
  {
    id: 'vwh_montenegro',
    name: 'WAREHOME MONTENEGRO',
    code: 'WMO',
    _is_virtual: true,
    _member_aliases: new Set(['WAREHOME MONTENEGRO', 'WMO', 'ALMACEN ADAPTIA SAN MIGUEL', 'ADPT1']),
  },
  {
    id: 'vwh_velarde',
    name: 'WAREHOME VELARDE',
    code: 'WVE',
    _is_virtual: true,
    _member_aliases: new Set(['WAREHOME VELARDE', 'WVE', 'ALMACEN ADAPTIA VELARDE']),
  },
];

const buildWAREHOMEVirtualWarehouses = (allWarehouses: any[]) => {
  return WAREHOME_VIRTUAL_DEFS.map(def => {
    const constituentIds = allWarehouses
      .filter(w => def._member_aliases.has(getWarehouseNameUpper(w)) || def._member_aliases.has(getWarehouseCodeUpper(w)))
      .map(w => w.id)
      .filter((id): id is number => typeof id === 'number');
    return { ...def, _constituent_ids: constituentIds };
  });
};

const getWhStock = (p: any, wh: any): number => {
  if (wh._constituent_ids) {
    return wh._constituent_ids.reduce((s: number, id: number) => s + (p.stock_by_wh?.[id] || 0), 0);
  }
  return p.stock_by_wh?.[wh.id] || 0;
};

const getWhSales = (p: any, wh: any, periodDays: number): number => {
  if (wh._constituent_ids) {
    return wh._constituent_ids.reduce((s: number, id: number) => {
      const wid = String(id);
      return s + (periodDays === 90 ? (p.sales_by_wh_90d?.[wid] || 0)
        : periodDays === 180 ? (p.sales_by_wh_180d?.[wid] || 0)
        : (p.sales_by_wh?.[id] || 0));
    }, 0);
  }
  const wid = String(wh.id);
  return periodDays === 90 ? (p.sales_by_wh_90d?.[wid] || 0)
    : periodDays === 180 ? (p.sales_by_wh_180d?.[wid] || 0)
    : (p.sales_by_wh?.[wh.id] || 0);
};

const getDisplayedWarehouseStock = (p: any, wh: any, warehouses: any[]) => {
  const whName = getWarehouseNameUpper(wh)
  const isVirtual = !!wh?._is_virtual
  const isSanMiguelCol = !isVirtual && whName.includes('MIGUEL')
  const piso3Wh = isSanMiguelCol ? warehouses.find((warehouse: any) => isPiso3Warehouse(warehouse)) : null
  const piso3Stock = piso3Wh ? (p.stock_by_wh?.[piso3Wh.id] || 0) : 0
  return getWhStock(p, wh) + (isVirtual ? 0 : piso3Stock)
}

const getConsolidatedStockForFilter = (
  p: any,
  warehouses: any[],
  filter: 'TOTAL_NUBA' | 'TOTAL_ANDYS' | 'TOTAL_ALL'
) => {
  const consolidatedWhs = getConsolidatedScopeWarehouses(warehouses, filter)

  if (filter !== 'TOTAL_ANDYS') {
    return consolidatedWhs.reduce((sum: number, wh: any) => sum + (p.stock_by_wh?.[wh.id] || 0), 0)
  }

  return consolidatedWhs.reduce((sum: number, wh: any) => {
    if (isPiso3Warehouse(wh) || isInventarioObservadoWarehouse(wh)) {
      return sum
    }
    return sum + getDisplayedWarehouseStock(p, wh, warehouses)
  }, 0)
}

const getWarehouseExportLabel = (warehouse: any, fallback = 'Destino') => {
  if (!warehouse) return fallback
  if (warehouse._is_virtual) return String(warehouse.name || fallback).trim() || fallback
  const code = String(warehouse.code || '').trim()
  if (code) return code.toUpperCase()
  return String(warehouse.name || fallback).trim() || fallback
}

const getCoverageDays = (stock: number, sales: number, periodDays: number) => {
  if (sales <= 0) return null
  return Math.round((stock * periodDays) / sales)
}

const getVisibleRoundedStock = (stock: number) => {
  const numericStock = Number(stock) || 0
  return Math.max(0, Math.round(numericStock))
}

const getCoverageDaysFromVisibleStock = (stock: number, sales: number, periodDays: number) => {
  const visibleStock = getVisibleRoundedStock(stock)
  if (sales <= 0) return null
  if (visibleStock <= 0) return 0
  return Math.round((visibleStock * periodDays) / sales)
}

const getConsolidatedScopeWarehouses = (warehouses: any[], filter: 'TOTAL_NUBA' | 'TOTAL_ANDYS' | 'TOTAL_ALL') => {
  const baseGroup = getWarehouseBaseGroupFromColumnFilter(filter)
  return warehouses.filter((warehouse) => {
    if (!matchesWarehouseColumnScope(warehouse, baseGroup)) return false
    if (filter === 'TOTAL_ANDYS') {
      const shouldExcludeAsStorage =
        (isPiso3Warehouse(warehouse) && !isAndysSanMiguelWarehouse(warehouse)) ||
        isInventarioObservadoWarehouse(warehouse)
      if (shouldExcludeAsStorage) return false
    }
    return true
  })
}

const COVERAGE_FILTER_OPTIONS = ['0-7', '7-14', '14-30', '>30', '>60', '>90', '>120', '>180'] as const
type CoverageFilterOption = typeof COVERAGE_FILTER_OPTIONS[number]

const LEGACY_COVERAGE_FILTER_MAP: Record<string, CoverageFilterOption> = {
  '0-1': '0-7',
  '2-5': '0-7',
  '5-7': '0-7',
  '8-10': '7-14',
  '11-15': '14-30',
  '16-20': '14-30',
  '21-30': '14-30',
  '+30': '>30',
}

function normalizeCoverageFilter(value: string): CoverageFilterOption | null {
  if ((COVERAGE_FILTER_OPTIONS as readonly string[]).includes(value)) {
    return value as CoverageFilterOption
  }
  return LEGACY_COVERAGE_FILTER_MAP[value] || null
}

function loadCoverageFilter(key: string): CoverageFilterOption[] {
  const saved = localStorage.getItem(key)
  if (!saved || saved === 'All') return []

  try {
    const parsed = JSON.parse(saved)
    if (Array.isArray(parsed)) {
      return Array.from(new Set(parsed
        .map((value) => normalizeCoverageFilter(String(value)))
        .filter((value): value is CoverageFilterOption => value !== null)))
    }
  } catch {
    // Fall through to legacy string parsing.
  }

  const normalized = normalizeCoverageFilter(saved)
  return normalized ? [normalized] : []
}

function loadMultiFilter(key: string): string[] {
  const saved = localStorage.getItem(key)
  if (!saved || saved === 'All') return []

  try {
    const parsed = JSON.parse(saved)
    if (Array.isArray(parsed)) {
      return Array.from(new Set(parsed.map((value) => String(value)).filter(Boolean)))
    }
  } catch {
    // Fall back to the legacy single-string value.
  }

  return [saved]
}

function saveMultiFilter(key: string, values: any[]) {
  localStorage.setItem(key, JSON.stringify(values));
}

function matchesCoverageOption(coverage: number, option: CoverageFilterOption): boolean {
  switch (option) {
    case '0-7':
      return coverage >= 0 && coverage <= 7
    case '7-14':
      return coverage > 7 && coverage <= 14
    case '14-30':
      return coverage > 14 && coverage <= 30
    case '>30':
      return coverage > 30
    case '>60':
      return coverage > 60
    case '>90':
      return coverage > 90
    case '>120':
      return coverage > 120
    case '>180':
      return coverage > 180
    default:
      return false
  }
}

function getMultiFilterLabel(values: string[]): string {
  if (values.length === 0) return 'Todos'
  if (values.length <= 2) return values.join(', ')
  return `${values.length} seleccionados`
}

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
  sales_90d?: number
  sales_by_wh_90d?: Record<string, number>
  sales_120d?: number
  sales_by_wh_120d?: Record<string, number>
  sales_180d?: number
  sales_by_wh_180d?: Record<string, number>
  orderpoints_by_wh?: Record<string, {
    min: number
    max: number
  }>
  type_name?: string
  brand_name?: string
  category_name?: string
  tags?: string[]
  cost_price?: number
  sale_price?: number
  sale_price_by_wh?: Record<string, number>
  list_price?: number
  prev_list_price?: number
  price_update_date?: string
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

      <AnimatePresence mode="wait">
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

function MultiFilterDropdown({
  label,
  icon: Icon,
  values,
  allCount,
  options,
  onChange,
  isOpen,
  onToggle,
  variant = 'orange'
}: {
  label: string
  icon: any
  values: string[]
  allCount: number
  options: { name: string, count: number }[]
  onChange: (values: string[]) => void
  isOpen: boolean
  onToggle: () => void
  variant: 'orange' | 'emerald' | 'indigo' | 'amber' | 'cyan'
}) {
  const styles = filterVariants[variant]
  const [searchTerm, setSearchTerm] = useState('')
  const isActive = isOpen || values.length > 0

  useEffect(() => {
    if (!isOpen) setSearchTerm('')
  }, [isOpen])

  const filteredOptions = options.filter(opt =>
    opt.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter(item => item !== value))
      return
    }
    onChange([...values, value])
  }

  return (
    <div className="relative">
      {isOpen && <div className="fixed inset-0 z-10" onClick={onToggle}></div>}

      <button
        onClick={onToggle}
        className={`
          flex items-center gap-3 pl-3 pr-4 py-2 rounded-2xl border transition-all duration-300 shadow-lg backdrop-blur-md z-20 relative group
          ${isActive
            ? styles.btnActive
            : 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 text-slate-400'}
        `}
      >
        <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-800'}`}>
          <Icon size={14} className={isActive ? 'text-white' : styles.iconInactive} />
        </div>

        <div className="flex flex-col items-start gap-0.5 text-left">
          <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-white/70' : 'text-slate-500'}`}>{label}</span>
          <span className={`text-xs font-bold max-w-[140px] truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
            {getMultiFilterLabel(values)}
          </span>
        </div>

        <ChevronRight size={14} className={`ml-2 transition-transform opacity-50 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute top-full mt-2 left-0 min-w-[300px] w-auto max-w-[500px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 pb-2 max-h-[400px] overflow-y-auto custom-scrollbar ring-1 ring-white/10"
          >
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
                onClick={() => onChange([])}
                className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors hover:bg-slate-800 flex items-center justify-between ${values.length === 0 ? styles.optionActive : 'text-slate-400'}`}
              >
                <span>Todos</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${values.length === 0 ? 'bg-white/20 text-current' : 'bg-slate-800 text-slate-500'}`}>
                  {allCount}
                </span>
              </button>
            </div>

            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => {
                const isSelected = values.includes(opt.name)
                return (
                  <button
                    key={opt.name}
                    onClick={() => toggleValue(opt.name)}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors hover:bg-slate-800 flex justify-between group items-center ${isSelected ? styles.optionActive : 'text-slate-300'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-4 h-4 rounded-md border flex items-center justify-center ${isSelected ? 'border-current bg-white/15' : 'border-slate-700 bg-slate-800'}`}>
                        {isSelected && <Check size={11} className="text-current" />}
                      </span>
                      <span className="truncate max-w-[500px]">{opt.name}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${isSelected ? 'bg-white/20 text-current' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'}`}>
                      {opt.count}
                    </span>
                  </button>
                )
              })
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

const ProductRow = React.memo(({ p, setSelectedProduct, setActiveTooltip, selectedWarehouseId, onAddProduct, isPinned }: any) => (
  <tr
    onClick={() => setSelectedProduct(p)}
    className="hover:bg-slate-800/20 transition-all cursor-pointer group relative hover:z-20 border-b border-slate-800/50"
  >
    <td className="px-4 py-4">
      <span className="text-xs font-mono text-slate-500">{p.barcode || '-'}</span>
    </td>
    <td className="px-4 py-4 min-w-[200px]">
      <div className="flex items-start gap-3">
        {onAddProduct && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onAddProduct(p)
            }}
            disabled={isPinned}
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-all ${
              isPinned
                ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                : 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 hover:text-white'
            }`}
            title={isPinned ? 'Producto ya agregado' : 'Agregar producto'}
          >
            {isPinned ? <Check size={14} /> : <Plus size={14} />}
          </button>
        )}
        <span className="font-semibold text-white group-hover:text-indigo-400 transition-colors leading-tight block whitespace-normal" title={p.name}>{p.name}</span>
      </div>
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
          {p.abc_category || '-'}
        </span>
      </div>
    </td>
    {selectedWarehouseId && (
      <td className="px-4 py-4 text-center">
        <div className="flex flex-col items-center gap-1">
          {(() => {
            const localAbc = p.abc_by_wh?.[selectedWarehouseId.toString()]?.category ?? '';
            return (
              <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black uppercase tracking-tight shadow-sm border
                                  ${localAbc === 'AA' ? 'bg-amber-500 text-slate-900 border-amber-300' :
                  localAbc === 'A' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
                    localAbc === 'B' ? 'light-contrast-abc-b bg-slate-700/50 text-slate-300 border-slate-600' :
                      'bg-slate-800/10 text-slate-600 border-slate-800/50'}`}
                title={`ABC Sucursal: ${localAbc || 'Sin ventas'}`}>
                {localAbc || '-'}
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
  showMLColumns,
  showExtraABC,
  showExtraCoverage,
  showExtraSales,
  showMinMax,
  showCost,
  showSalePrice,
  showMargin,
  showListPrice,
  showPrevListPrice,
  showPriceHistory,
  salesPeriodDays,
  consolidatedView = false,
  currentBranchStickyOffsets,
  consolidatedStickyOffsets,
  onAddProduct,
  isPinned
}: any) => {
  const [showAIReason, setShowAIReason] = useState(false)
  const selectedWarehouseKey = String(selectedWarehouseId ?? '')
  const selectedWarehouseName = warehouses.find((w: any) => w.id === selectedWarehouseId)?.name || ''
  const isSelectedWarehouseSimple = isSimpleWarehouseName(selectedWarehouseName)
  const destSales = salesPeriodDays === 90 ? (p.sales_by_wh_90d?.[selectedWarehouseKey] || 0)
    : salesPeriodDays === 180 ? (p.sales_by_wh_180d?.[selectedWarehouseKey] || 0)
      : (p.sales_by_wh?.[selectedWarehouseId!] || 0)
  const destDailyRate = destSales / salesPeriodDays
  const destCoverage = Math.min(999, getCoverageDaysFromVisibleStock(sourceStock, destSales, salesPeriodDays) ?? 999)
  const projectedDestCoverage = Math.min(999, getCoverageDaysFromVisibleStock(sourceStock + transferQty, destSales, salesPeriodDays) ?? 999)
  const destAbc = p.abc_by_wh?.[selectedWarehouseKey]?.category
  const destMin = p.orderpoints_by_wh?.[selectedWarehouseKey]?.min
  const destMax = p.orderpoints_by_wh?.[selectedWarehouseKey]?.max
  return (
    <tr className="hover:bg-slate-800/20 transition-all border-b border-slate-800/50">
      <td className="px-3 py-1.5 sticky left-0 bg-slate-900 z-10 w-[80px] min-w-[80px]">
        <span className="text-[10px] font-mono text-slate-400">{p.barcode || '-'}</span>
      </td>
      <td className="px-3 py-1.5 sticky left-[80px] bg-slate-900 z-10 w-[300px] min-w-[300px] md:w-[450px] md:min-w-[450px]">
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              {onAddProduct && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddProduct(p)
                  }}
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all ${
                    isPinned
                      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30'
                      : 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 hover:text-white'
                  }`}
                  title={isPinned ? 'Quitar de la lista' : 'Agregar producto'}
                >
                  {isPinned ? <Check size={10} /> : <Plus size={10} />}
                </button>
              )}
              <span className="font-semibold text-white text-[13px] leading-tight whitespace-normal">{p.name}</span>
            </div>
            <span className={`text-[8px] font-black px-1.5 rounded border shrink-0 ${(() => {
              // In transfers view, show ABC from source warehouse
              const abcToShow = transferTargetWarehouse
                ? (p.abc_by_wh?.[transferTargetWarehouse.toString()]?.category || p.abc_category)
                : p.abc_category;

              return abcToShow === 'AA' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                abcToShow === 'A' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
                  abcToShow === 'B' ? 'light-contrast-abc-b bg-slate-800 text-slate-400 border-slate-700' :
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
            const wid_t = String(wh.id);
            const targetStock = p.stock_by_wh?.[wh.id] || 0;
            const targetSales = salesPeriodDays === 90 ? (p.sales_by_wh_90d?.[wid_t] || 0)
              : salesPeriodDays === 180 ? (p.sales_by_wh_180d?.[wid_t] || 0)
                : (p.sales_by_wh?.[wh.id] || 0);
            const targetCov = getCoverageDaysFromVisibleStock(targetStock, targetSales, salesPeriodDays) ?? 999;
            const displayCov = targetCov > 999 ? 999 : targetCov;

            const projTargetCov = getCoverageDaysFromVisibleStock(targetStock - transferQty, targetSales, salesPeriodDays) ?? 999;
            const displayProjCov = projTargetCov > 999 ? 999 : projTargetCov;

            const colorBase = currentView === 'ml' ? 'indigo' : 'emerald';
            return (
              <React.Fragment key={wh.id}>
                <td className="px-2 py-1.5 text-center bg-slate-900 w-[70px] min-w-[70px] sticky left-[380px] md:left-[530px] z-10">
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
                <td className="px-3 py-1.5 text-center bg-slate-900 w-[140px] min-w-[140px] sticky left-[450px] md:left-[600px] z-10">
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
                          <Truck size={14} className="animate-pulse" />
                        </div>
                      );
                    })()}
                  </div>
                </td>

                {/* Machine Learning Specific Columns */}
                {currentView === 'ml' && showMLColumns && (
                  <>
                    <td className="px-3 py-1.5 text-center bg-slate-900 border-l border-indigo-500/10 min-w-[100px] sticky z-10" style={getTransferStickyLeftStyle(currentBranchStickyOffsets.prediction)}>
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-400 line-through opacity-50">{(targetSales / salesPeriodDays).toFixed(2)}</span>
                          <ArrowRight size={8} className="text-indigo-400" />
                          <span className="text-xs font-black text-indigo-400">
                            {suggestion?.ml_data?.v_ml ? suggestion.ml_data.v_ml.toFixed(2) : (targetSales / salesPeriodDays).toFixed(2)}
                          </span>
                        </div>
                        <span className="text-[7px] text-indigo-500/50 uppercase font-black tracking-tighter">Predicción</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-center bg-slate-900 min-w-[80px] sticky z-10" style={getTransferStickyLeftStyle(currentBranchStickyOffsets.leadTime)}>
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-purple-400">
                          {suggestion?.ml_data?.lead_time ? `${suggestion.ml_data.lead_time}d` : '---'}
                        </span>
                        <span className="text-[7px] text-purple-500/50 uppercase font-black tracking-tighter">LeadTime</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-center bg-slate-900 min-w-[90px] sticky z-10" style={getTransferStickyLeftStyle(currentBranchStickyOffsets.risk)}>
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
                {showExtraSales && (
                  <td className="px-3 py-1.5 text-center bg-cyan-950/30 min-w-[70px] sticky z-10" style={getTransferStickyLeftStyle(currentBranchStickyOffsets.sales)}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-black text-cyan-300">{Math.round(targetSales)}</span>
                      <span className="text-[6px] text-cyan-700 uppercase font-black tracking-tighter">VTA {salesPeriodDays}d</span>
                    </div>
                  </td>
                )}
                {showExtraCoverage && (
                  <td className="px-3 py-1.5 text-center bg-emerald-950/30 min-w-[70px] sticky z-10" style={getTransferStickyLeftStyle(currentBranchStickyOffsets.coverage)}>
                    <div className="flex flex-col items-center gap-0.5">
                      {(() => {
                        const cov = Math.min(999, getCoverageDaysFromVisibleStock(targetStock, targetSales, salesPeriodDays) ?? 999);
                        return (
                          <div className={`inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg border ${cov < 7 ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : cov < 15 ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                            <span className={`${cov >= 999 ? 'text-[7px]' : 'text-[10px]'} font-black`}>
                              {cov >= 999 ? 'SIN VENTAS' : cov}
                            </span>
                            {cov < 999 && <span className="text-[8px] uppercase tracking-tighter opacity-70">Días</span>}
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                )}
                {showExtraABC && (
                  <td className="px-3 py-1.5 text-center bg-indigo-950/30 min-w-[70px] sticky z-10" style={getTransferStickyLeftStyle(currentBranchStickyOffsets.abc)}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`text-[10px] font-black px-1.5 rounded border ${p.abc_category === 'AA' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : p.abc_category === 'A' ? 'bg-amber-500/20 border-amber-500/30 text-amber-500' : p.abc_category === 'B' ? 'light-contrast-abc-b bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                        {p.abc_category || '-'}
                      </span>
                      <span className="text-[6px] text-indigo-700 uppercase font-black tracking-tighter">ABC</span>
                    </div>
                  </td>
                )}
                {showMinMax && (
                  <td className="px-3 py-1.5 text-center bg-slate-800/20 min-w-[90px] sticky z-10" style={getTransferStickyLeftStyle(currentBranchStickyOffsets.minMax)}>
                    <div className="flex flex-col items-center gap-0">
                      <span className="text-[10px] font-black text-slate-300">
                        {(() => { const op = p.orderpoints_by_wh?.[wid_t]; return op ? `${Math.round(op.min)}/${Math.round(op.max)}` : '-/-'; })()}
                      </span>
                      <span className="text-[6px] text-slate-600 uppercase font-black tracking-tighter">min/max</span>
                    </div>
                  </td>
                )}
                {showCost && (
                  <td className="px-1 py-1.5 text-center bg-violet-950/20 min-w-[50px] sticky z-10" style={getTransferStickyLeftStyle(currentBranchStickyOffsets.cost)}>
                    <div className="flex flex-col items-center px-1.5">
                      <span className="text-[10px] font-black text-slate-300">{p.cost_price?.toFixed(2) || '0.00'}</span>
                      <span className="text-[6px] text-violet-500/70 uppercase font-black tracking-tighter">Costo</span>
                    </div>
                  </td>
                )}
                {showSalePrice && (
                  <td className="px-1 py-1.5 text-center bg-violet-950/20 min-w-[50px] sticky z-10" style={getTransferStickyLeftStyle(currentBranchStickyOffsets.salePrice)}>
                    <div className="flex flex-col items-center px-1.5">
                      {(() => {
                        const effectivePrice = p.sale_price_by_wh?.[wid_t] ?? p.sale_price;
                        const hasCustom = !!p.sale_price_by_wh?.[wid_t];
                        return (
                          <>
                            <span className={`text-[10px] font-black ${hasCustom ? 'text-amber-300' : 'text-white'}`}>
                              {effectivePrice?.toFixed(2) || '0.00'}
                            </span>
                            <span className="text-[6px] text-violet-500/70 uppercase font-black tracking-tighter">
                              {hasCustom ? 'P.Lista' : 'Precio'}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                )}
                {showMargin && (
                  <td className="px-1 py-1.5 text-center bg-violet-950/20 min-w-[55px] sticky z-10" style={getTransferStickyLeftStyle(currentBranchStickyOffsets.margin)}>
                    <div className="flex flex-col items-center px-1.5">
                      {(() => {
                        const cost = p.cost_price || 0;
                        const sale = p.sale_price_by_wh?.[wid_t] ?? p.sale_price ?? 0;
                        const margin = sale > 0 ? ((sale - cost) / sale) * 100 : 0;
                        const isNegative = margin < 0;
                        return (
                          <>
                            <span className={`text-[10px] font-black ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {margin.toFixed(1)}%
                            </span>
                            <span className="text-[6px] text-violet-500/70 uppercase font-black tracking-tighter">Margen</span>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                )}
                {/* P.Lista/P.Ant/F.Act solo en columna TOTAL consolidado */}
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

                        <AnimatePresence mode="wait">
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
                <span className="text-[9px] font-bold text-indigo-500">{destSales.toFixed(0)} <span className="text-[7px] uppercase opacity-60">VTA {salesPeriodDays}d</span></span>
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
                    <Truck size={14} className="animate-pulse" />
                  </div>
                );
              })()}
            </div>
          </td>
          <td className="px-2 py-1.5 text-center bg-indigo-500/10 w-[70px]">
            <div className={`inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg border transition-all duration-300 ${projectedDestCoverage < 7 ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
              projectedDestCoverage < 15 ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              }`}>
              <div className="flex items-center gap-1">
                <span className={`${destCoverage >= 999 ? 'text-[7px]' : 'text-[10px]'} font-black ${transferQty > 0 ? 'opacity-40 line-through scale-90' : ''}`}>
                  {destCoverage >= 999 ? 'SIN VENTAS' : destCoverage}
                </span>
                {transferQty > 0 && (
                  <>
                    <ArrowRight size={8} className="text-emerald-400" />
                    <span className={`${projectedDestCoverage >= 999 ? 'text-[7px]' : 'text-[10px]'} font-black animate-pulse`}>
                      {projectedDestCoverage >= 999 ? 'SIN VENTAS' : projectedDestCoverage}
                    </span>
                  </>
                )}
              </div>
              {projectedDestCoverage < 999 && <span className="text-[8px] uppercase tracking-tighter opacity-70">Días</span>}
            </div>
          </td>
        </>
      ) : (
        <>
          {!consolidatedView && (
            <>
              <td
                className="px-2 py-1.5 text-center bg-slate-950 w-[70px] min-w-[70px] sticky z-10"
                style={getTransferStickyLeftStyle(0)}
              >
                <div className={`inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg border ${destCoverage < 7 ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                  destCoverage < 15 ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                    "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  }`}>
                  <span className={`${destCoverage >= 999 ? 'text-[7px]' : 'text-[10px]'} font-black`}>{destCoverage >= 999 ? 'SIN VENTAS' : destCoverage}</span>
                  {destCoverage < 999 && <span className="text-[8px] uppercase tracking-tighter opacity-70">Días</span>}
                </div>
              </td>
              <td
                className="px-2 py-1.5 text-center bg-slate-950 w-[100px] min-w-[100px] sticky z-10"
                style={getTransferStickyLeftStyle(70)}
              >
                <span className={`text-sm font-black font-mono ${sourceStock <= 0 ? "text-slate-700" : "text-indigo-400"}`}>
                  {Math.round(sourceStock)}
                </span>
              </td>
              {!isSelectedWarehouseSimple && showExtraSales && (
                <td
                  className="px-1 py-2 text-center min-w-[52px] bg-slate-950 sticky z-10"
                  style={getTransferStickyLeftStyle(currentBranchStickyOffsets.sales)}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] font-black text-cyan-300">{Math.round(destSales)}</span>
                    <span className="text-[6px] text-cyan-700 uppercase font-black tracking-tighter">{salesPeriodDays}d</span>
                  </div>
                </td>
              )}
              {!isSelectedWarehouseSimple && showExtraCoverage && (
                <td
                  className="px-1 py-1.5 text-center min-w-[55px] bg-slate-950 sticky z-10"
                  style={getTransferStickyLeftStyle(currentBranchStickyOffsets.coverage)}
                >
                  <div className={`inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg border ${destCoverage < 7 ? "bg-rose-500/10 border-rose-500/20 text-rose-500" : destCoverage < 15 ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"}`}>
                    <span className={`${destCoverage >= 999 ? 'text-[7px]' : 'text-[10px]'} font-black`}>{destCoverage >= 999 ? 'SIN VENTAS' : destCoverage}</span>
                    {destCoverage < 999 && <span className="text-[8px] uppercase tracking-tighter opacity-70">Días</span>}
                  </div>
                </td>
              )}
              {!isSelectedWarehouseSimple && showExtraABC && (
                <td
                  className="px-1 py-2 text-center min-w-[48px] bg-slate-950 sticky z-10"
                  style={getTransferStickyLeftStyle(currentBranchStickyOffsets.abc)}
                >
                  <span className={`text-[9px] font-black px-1 rounded border ${destAbc === 'AA' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : destAbc === 'A' ? 'bg-amber-500/20 border-amber-500/30 text-amber-500' : destAbc === 'B' ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                    {destAbc || '-'}
                  </span>
                </td>
              )}
              {!isSelectedWarehouseSimple && showMinMax && (
                <td
                  className="px-1 py-2 text-center min-w-[58px] bg-slate-950 sticky z-10"
                  style={getTransferStickyLeftStyle(currentBranchStickyOffsets.minMax)}
                >
                  <div className="flex flex-col items-center gap-0">
                    <span className="text-[9px] font-black text-slate-300">
                      {destMin !== undefined ? Math.round(destMin) : '-'}/{destMax !== undefined ? Math.round(destMax) : '-'}
                    </span>
                    <span className="text-[6px] text-slate-600 uppercase">min/max</span>
                  </div>
                </td>
              )}
              {!isSelectedWarehouseSimple && showCost && (
                <td
                  className="px-1 py-2 text-center min-w-[50px] relative sticky z-10 bg-slate-950"
                  style={getTransferStickyLeftStyle(currentBranchStickyOffsets.cost)}
                >
                  <div className="flex flex-col items-center px-1.5 relative z-10">
                    <span className="text-[9px] font-black text-slate-400">{p.cost_price?.toFixed(2) || '0.00'}</span>
                    <span className="text-[5px] text-violet-500/70 uppercase font-black">Costo</span>
                  </div>
                </td>
              )}
              {!isSelectedWarehouseSimple && showSalePrice && (
                <td
                  className="px-1 py-2 text-center min-w-[50px] relative sticky z-10 bg-slate-950"
                  style={getTransferStickyLeftStyle(currentBranchStickyOffsets.salePrice)}
                >
                  <div className="flex flex-col items-center px-1.5 relative z-10">
                    {(() => {
                      const destId = String(selectedWarehouseId);
                      const effectivePrice = p.sale_price_by_wh?.[destId] ?? p.sale_price;
                      const hasCustom = !!p.sale_price_by_wh?.[destId];
                      return (
                        <>
                          <span className={`text-[9px] font-black ${hasCustom ? 'text-amber-300' : 'text-slate-300'}`}>
                            {effectivePrice?.toFixed(2) || '0.00'}
                          </span>
                          <span className="text-[5px] text-violet-500/70 uppercase font-black">
                            {hasCustom ? 'P.Lista' : 'Precio'}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </td>
              )}
              {!isSelectedWarehouseSimple && showMargin && (
                <td
                  className="px-1 py-2 text-center min-w-[55px] relative sticky z-10 bg-slate-950"
                  style={getTransferStickyLeftStyle(currentBranchStickyOffsets.margin)}
                >
                  <div className="flex flex-col items-center px-1.5 relative z-10">
                    {(() => {
                      const cost = p.cost_price || 0;
                      const destId = String(selectedWarehouseId);
                      const sale = p.sale_price_by_wh?.[destId] ?? p.sale_price ?? 0;
                      const margin = sale > 0 ? ((sale - cost) / sale) * 100 : 0;
                      const isNegative = margin < 0;
                      return (
                        <>
                          <span className={`text-[9px] font-black ${isNegative ? 'text-rose-400' : 'text-slate-300'}`}>
                            {margin.toFixed(1)}%
                          </span>
                          <span className="text-[5px] text-violet-500/70 uppercase font-black">Margen</span>
                        </>
                      );
                    })()}
                  </div>
                </td>
              )}
              {/* P.Lista/P.Ant/F.Act solo en columna TOTAL consolidado */}
            </>
          )}
          {currentView === 'ml' && showMLColumns && (
            <>
              <td
                className="px-3 py-1.5 text-center bg-slate-900 border-l border-indigo-500/10 min-w-[100px] sticky z-10"
                style={getTransferStickyLeftStyle(currentBranchStickyOffsets.prediction)}
              >
                <div className="flex flex-col items-center">
                  <span className="text-xs font-black text-indigo-400">
                    {suggestion?.ml_data?.v_ml ? suggestion.ml_data.v_ml.toFixed(2) : destDailyRate.toFixed(2)}
                  </span>
                  <span className="text-[7px] text-indigo-500/50 uppercase font-black tracking-tighter">Predicción</span>
                </div>
              </td>
              <td
                className="px-3 py-1.5 text-center bg-slate-900 min-w-[80px] sticky z-10"
                style={getTransferStickyLeftStyle(currentBranchStickyOffsets.leadTime)}
              >
                <div className="flex flex-col items-center">
                  <span className="text-xs font-black text-purple-400">
                    {suggestion?.ml_data?.lead_time ? `${suggestion.ml_data.lead_time}d` : '---'}
                  </span>
                  <span className="text-[7px] text-purple-500/50 uppercase font-black tracking-tighter">LeadTime</span>
                </div>
              </td>
              <td
                className="px-3 py-1.5 text-center bg-slate-900 min-w-[90px] sticky z-10"
                style={getTransferStickyLeftStyle(currentBranchStickyOffsets.risk)}
              >
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
          {consolidatedView && (() => {
            const isTotalAll = warehouseColumnFilter === 'TOTAL_ALL';
            const consolidatedWhs = getConsolidatedScopeWarehouses(warehouses, warehouseColumnFilter as 'TOTAL_NUBA' | 'TOTAL_ANDYS' | 'TOTAL_ALL');
            const totalStock = getConsolidatedStockForFilter(p, warehouses, warehouseColumnFilter as 'TOTAL_NUBA' | 'TOTAL_ANDYS' | 'TOTAL_ALL');
            const totalSales = consolidatedWhs.reduce((s: number, wh: any) => {
              const wid = String(wh.id);
              return s + (salesPeriodDays === 90 ? (p.sales_by_wh_90d?.[wid] || 0) : salesPeriodDays === 180 ? (p.sales_by_wh_180d?.[wid] || 0) : (p.sales_by_wh?.[wh.id] || 0));
            }, 0);
            const avgCov = getCoverageDaysFromVisibleStock(totalStock, totalSales, salesPeriodDays);
            const totalMin = visibleWarehouses.reduce((s: number, wh: any) => s + (p.orderpoints_by_wh?.[String(wh.id)]?.min || 0), 0);
            const totalMax = visibleWarehouses.reduce((s: number, wh: any) => s + (p.orderpoints_by_wh?.[String(wh.id)]?.max || 0), 0);
            const abc = p.abc_category || '-';
            return (
              <React.Fragment key="consolidated">
                <td
                  className={`px-4 py-2 text-center w-[85px] min-w-[85px] border-l-2 relative sticky z-10 ${isTotalAll ? 'bg-slate-950 border-indigo-500/30' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'bg-slate-950 border-emerald-500/30' : 'bg-slate-950 border-amber-500/30'}`}
                  style={getTransferStickyLeftStyle(0)}
                >
                  <div className={`absolute inset-0 opacity-20 pointer-events-none ${isTotalAll ? 'bg-gradient-to-r from-indigo-500/20 to-transparent' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'bg-gradient-to-r from-emerald-500/20 to-transparent' : 'bg-gradient-to-r from-amber-500/20 to-transparent'}`}></div>
                  <span className={`text-[13px] font-black font-mono relative z-10 ${totalStock <= 0 ? 'text-slate-700' : (isTotalAll ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]' : 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]')}`}>{Math.round(totalStock)}</span>
                </td>
                {showExtraSales && (
                  <td
                    className="px-1 py-2 text-center w-[52px] min-w-[52px] relative sticky z-10 bg-slate-950"
                    style={getTransferStickyLeftStyle(consolidatedStickyOffsets.sales)}
                  >
                    <div className="flex flex-col items-center gap-0.5 relative z-10">
                      <span className="text-[10px] font-black text-white">{Math.round(totalSales)}</span>
                      <span className={`text-[6px] uppercase font-black tracking-tighter ${isTotalAll ? 'text-indigo-500/60' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'text-emerald-500/60' : 'text-amber-500/60'}`}>{salesPeriodDays}D VTA</span>
                    </div>
                  </td>
                )}
                {showExtraCoverage && (
                  <td
                    className="px-1 py-1.5 text-center w-[55px] min-w-[55px] relative sticky z-10 bg-slate-950"
                    style={getTransferStickyLeftStyle(consolidatedStickyOffsets.coverage)}
                  >
                    <div className={`inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg border relative z-10 ${avgCov === null ? "bg-slate-800/70 border-slate-700 text-slate-400" : avgCov < 7 ? "bg-rose-500/10 border-rose-500/20 text-rose-500" : avgCov < 15 ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"}`}>
                      <span className={`${avgCov === null ? 'text-[7px]' : 'text-[10px]'} font-black`}>{avgCov === null ? 'SIN VENTAS' : avgCov}</span>
                      {avgCov !== null && <span className="text-[8px] uppercase tracking-tighter opacity-70">Días</span>}
                    </div>
                  </td>
                )}
                {showExtraABC && (
                  <td
                    className="px-1 py-2 text-center w-[48px] min-w-[48px] relative sticky z-10 bg-slate-950"
                    style={getTransferStickyLeftStyle(consolidatedStickyOffsets.abc)}
                  >
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border relative z-10 ${abc === 'AA' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : abc === 'A' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : abc === 'B' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-900 border-slate-800 text-slate-500 blur-[0.3px]'}`}>{abc}</span>
                  </td>
                )}
                {showMinMax && (
                  <td
                    className="px-1 py-2 text-center w-[58px] min-w-[58px] relative sticky z-10 bg-slate-950"
                    style={getTransferStickyLeftStyle(consolidatedStickyOffsets.minMax)}
                  >
                    <div className="flex flex-col items-center gap-0 relative z-10">
                      <span className="text-[9px] font-black text-slate-400">{Math.round(totalMin)}/{Math.round(totalMax)}</span>
                      <span className="text-[5px] text-slate-600 uppercase font-black">M/M</span>
                    </div>
                  </td>
                )}
                {showCost && (
                  <td
                    className="px-1 py-2 text-center w-[50px] min-w-[50px] relative sticky z-10 bg-slate-950"
                    style={getTransferStickyLeftStyle(consolidatedStickyOffsets.cost)}
                  >
                    <div className="flex flex-col items-center px-1.5 relative z-10">
                      <span className="text-[9px] font-black text-slate-400">{p.cost_price?.toFixed(2) || '0.00'}</span>
                      <span className="text-[5px] text-violet-500/70 uppercase font-black">Costo</span>
                    </div>
                  </td>
                )}
                {showSalePrice && (
                  <td
                    className="px-1 py-2 text-center w-[50px] min-w-[50px] relative sticky z-10 bg-slate-950"
                    style={getTransferStickyLeftStyle(consolidatedStickyOffsets.salePrice)}
                  >
                    <div className="flex flex-col items-center px-1.5 relative z-10">
                      <span className="text-[9px] font-black text-slate-300">{p.sale_price?.toFixed(2) || '0.00'}</span>
                      <span className="text-[5px] text-violet-500/70 uppercase font-black">Precio</span>
                    </div>
                  </td>
                )}
{showMargin && (
                    <td
                      className="px-1 py-2 text-center w-[55px] min-w-[55px] relative sticky z-10 bg-slate-950"
                      style={getTransferStickyLeftStyle(consolidatedStickyOffsets.margin)}
                    >
                      <div className="flex flex-col items-center px-1.5 relative z-10">
                        {(() => {
                          const cost = p.cost_price || 0;
                          const sale = p.sale_price || 0;
                          const margin = sale > 0 ? ((sale - cost) / sale) * 100 : 0;
                          const isNegative = margin < 0;
                          return (
                            <>
                              <span className={`text-[9px] font-black ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {margin.toFixed(1)}%
                              </span>
                              <span className="text-[5px] text-violet-500/70 uppercase font-black">Margen</span>
                            </>
                          );
                        })()}
                    </div>
                  </td>
                )}
                {showListPrice && (
                  <td
                    className="px-1 py-2 text-center w-[50px] min-w-[50px] relative sticky z-10 bg-slate-950"
                    style={getTransferStickyLeftStyle(consolidatedStickyOffsets.listPrice)}
                  >
                    <div className="flex flex-col items-center px-1.5 relative z-10">
                      <span className="text-[9px] font-black text-white">{p.list_price?.toFixed(2) || '0.00'}</span>
                      <span className="text-[5px] text-cyan-500/70 uppercase font-black">P.L</span>
                    </div>
                  </td>
                )}
                {showPrevListPrice && (
                  <td
                    className="px-1 py-2 text-center w-[50px] min-w-[50px] relative sticky z-10 bg-slate-950"
                    style={getTransferStickyLeftStyle(consolidatedStickyOffsets.prevListPrice)}
                  >
                    <div className="flex flex-col items-center px-1.5 relative z-10">
                      <span className="text-[9px] font-black text-white">{p.prev_list_price != null && p.prev_list_price > 0 ? p.prev_list_price.toFixed(2) : '—'}</span>
                      <span className="text-[5px] text-blue-500/70 uppercase font-black">P.A</span>
                    </div>
                  </td>
                )}
                {showPriceHistory && (
                  <td
                    className="px-1 py-2 text-center w-[60px] min-w-[60px] relative sticky z-10 bg-slate-950"
                    style={getTransferStickyLeftStyle(consolidatedStickyOffsets.priceHistory)}
                  >
                    <div className="flex flex-col items-center px-1.5 relative z-10">
                      <span className="text-[9px] font-black text-amber-300">{p.price_update_date || '—'}</span>
                      <span className="text-[5px] text-amber-500/70 uppercase font-black">F.Act</span>

                    </div>
                  </td>
                )}
                <td
                  className="p-0 w-[2px] min-w-[2px] sticky z-10 pointer-events-none bg-transparent"
                  style={getTransferStickyLeftStyle(consolidatedStickyOffsets.end)}
                ></td>
              </React.Fragment>
            );
          })()}
          {visibleWarehouses.map((wh: any) => {
            const wid = String(wh.id);
            const whName = (wh.name || '').toUpperCase();
            const isVirtual = !!wh._is_virtual;
            const targetStock = getDisplayedWarehouseStock(p, wh, warehouses);
            const isSimple = isSimpleWarehouseName(whName);
            const salesRaw = getWhSales(p, wh, salesPeriodDays);
            const whAbc = p.abc_by_wh?.[wid]?.category;
            const whCov = Math.min(999, getCoverageDaysFromVisibleStock(targetStock, salesRaw, salesPeriodDays) ?? 999);
            const whMin = p.orderpoints_by_wh?.[wid]?.min;
            const whMax = p.orderpoints_by_wh?.[wid]?.max;
            const whOrders = isVirtual
              ? (p.pending_orders || []).filter((o: any) => wh._constituent_ids.includes(o.warehouse_id))
              : (p.pending_orders || []).filter((o: any) => o.warehouse_id === wh.id);
            const totalPending = whOrders.reduce((acc: number, curr: any) => acc + curr.qty, 0);
            return (
              <React.Fragment key={wh.id}>
                {/* STK */}
                <td className={`px-4 py-2 text-center transition-all group relative border-l border-slate-800/30 ${isVirtual ? 'cursor-default' : 'hover:bg-emerald-500/5 cursor-pointer'}`}
                  onClick={() => !isVirtual && setTransferTargetWarehouse(wh.id)}
                >
                  <div className="flex flex-col items-center">
                    <span className={`text-[12px] font-black font-mono transition-colors ${targetStock <= 0 ? "text-slate-700" : "text-white"}`}>
                      {Math.round(targetStock)}
                    </span>
                  </div>
                  {totalPending > 0 && (
                    <div
                      className="absolute right-1 top-1 text-rose-500 cursor-help"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setActiveTooltip({ product: { ...p, filteredPendingOrders: whOrders }, x: rect.left, y: rect.top });
                      }}
                      onMouseLeave={() => setActiveTooltip(null)}
                    >
                      <Truck size={14} className="animate-pulse" />
                    </div>
                  )}
                </td>
                {/* VTA */}
                {!isSimple && showExtraSales && (
                  <td className="px-1 py-2 text-center min-w-[52px] bg-cyan-950/30">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-black text-cyan-300">{Math.round(salesRaw)}</span>
                      <span className="text-[6px] text-cyan-700 uppercase font-black tracking-tighter">{salesPeriodDays}d</span>
                    </div>
                  </td>
                )}
                {/* COV */}
                {!isSimple && showExtraCoverage && (
                  <td className="px-1 py-1.5 text-center min-w-[55px] bg-emerald-950/30">
                    <div className={`inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg border ${whCov < 7 ? "bg-rose-500/10 border-rose-500/20 text-rose-500" : whCov < 15 ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"}`}>
                      <span className={`${whCov >= 999 ? 'text-[7px]' : 'text-[10px]'} font-black`}>{whCov >= 999 ? 'SIN VENTAS' : whCov}</span>
                      {whCov < 999 && <span className="text-[8px] uppercase tracking-tighter opacity-70">Días</span>}
                    </div>
                  </td>
                )}
                {/* ABC */}
                {!isSimple && showExtraABC && (
                  <td className="px-1 py-2 text-center min-w-[48px] bg-indigo-950/30">
                    <span className={`text-[9px] font-black px-1 rounded border ${whAbc === 'AA' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : whAbc === 'A' ? 'bg-amber-500/20 border-amber-500/30 text-amber-500' : whAbc === 'B' ? 'light-contrast-abc-b bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                      {whAbc || '-'}
                    </span>
                  </td>
                )}
                {/* MIN/MAX */}
                {!isSimple && showMinMax && (
                  <td className="px-1 py-2 text-center min-w-[58px] bg-slate-800/20">
                    <div className="flex flex-col items-center gap-0">
                      <span className="text-[9px] font-black text-slate-300">
                        {whMin !== undefined ? Math.round(whMin) : '-'}/{whMax !== undefined ? Math.round(whMax) : '-'}
                      </span>
                      <span className="text-[6px] text-slate-600 uppercase">min/max</span>
                    </div>
                  </td>
                )}
                {/* COSTO */}
                {!isSimple && showCost && (
                  <td className="px-1 py-2 text-center min-w-[50px] bg-violet-950/10">
                    <div className="flex flex-col items-center gap-0">
                      <span className="text-[9px] font-black text-violet-300">{p.cost_price?.toFixed(2) || '0.00'}</span>
                      <span className="text-[6px] text-violet-600 uppercase">Costo</span>
                    </div>
                  </td>
                )}
                {/* PRECIO */}
                {!isSimple && showSalePrice && (
                  <td className="px-1 py-2 text-center min-w-[50px] bg-fuchsia-950/10">
                    <div className="flex flex-col items-center gap-0">
                      {(() => {
                        const effectivePrice = p.sale_price_by_wh?.[wid] ?? p.sale_price;
                        const hasCustom = !!p.sale_price_by_wh?.[wid];
                        return (
                          <>
                            <span className={`text-[9px] font-black ${hasCustom ? 'text-amber-300' : 'text-fuchsia-300'}`}>
                              {effectivePrice?.toFixed(2) || '0.00'}
                            </span>
                            <span className="text-[6px] text-fuchsia-600 uppercase">
                              {hasCustom ? 'P.Lista' : 'Precio'}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                )}
                {/* MARGEN */}
                {!isSimple && showMargin && (
                  <td className="px-1 py-2 text-center min-w-[55px] bg-pink-950/10">
                    <div className="flex flex-col items-center gap-0">
                      {(() => {
                        const cost = p.cost_price || 0;
                        const sale = p.sale_price_by_wh?.[wid] ?? p.sale_price ?? 0;
                        const margin = sale > 0 ? ((sale - cost) / sale) * 100 : 0;
                        const isNegative = margin < 0;
                        return (
                          <>
                            <span className={`text-[9px] font-black ${isNegative ? 'text-rose-400' : 'text-pink-300'}`}>
                              {margin.toFixed(1)}%
                            </span>
                            <span className="text-[6px] text-pink-600 uppercase">Margen</span>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                )}
                {/* P. LISTA — solo en columna TOTAL, no en salas individuales */}
                {/* P. ANTERIOR — solo en columna TOTAL, no en salas individuales */}
                {/* F. ACTUALIZACIÓN — solo en columna TOTAL, no en salas individuales */}
              </React.Fragment>
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
    const savedColumnFilter = localStorage.getItem('stock_filter_wh_column');

    // En modo consolidado (TOTAL_ALL / All / TOTAL_NUBA / TOTAL_ANDYS) siempre VISTA GLOBAL
    if (
      savedColumnFilter === 'TOTAL_ALL' ||
      savedColumnFilter === 'All' ||
      savedColumnFilter === 'TOTAL_NUBA' ||
      savedColumnFilter === 'TOTAL_ANDYS'
    ) {
      return null;
    }

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
  const initialWarehouseGroupDefaultAppliedRef = useRef(false)
  // Ref to track sync-polling timer — prevents multiple timers from accumulating
  const syncPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFetchingRef = useRef(false)

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
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('')
  const [transferSearchTerm, setTransferSearchTerm] = useState(() => localStorage.getItem('transfer_filter_search') || '')
  const [debouncedTransferSearch, setDebouncedTransferSearch] = useState('')

  // Debounce search terms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedProductSearch(productSearchTerm), 150);
    return () => clearTimeout(timer);
  }, [productSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTransferSearch(transferSearchTerm), 150);
    return () => clearTimeout(timer);
  }, [transferSearchTerm]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>(() => {
    const values = loadMultiFilter('stock_filter_selected_products')
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
    return Array.from(new Set(values))
  })
  const [providerSearchTerm, setProviderSearchTerm] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<string[]>(() => loadMultiFilter('stock_filter_provider'))

  const [showOnlyDeficient, setShowOnlyDeficient] = useState(() => localStorage.getItem('stock_filter_deficient') === 'true')
  const [showOnlyPending, setShowOnlyPending] = useState(() => localStorage.getItem('stock_filter_pending') === 'true')
  const [showOnlyOutOfStock, setShowOnlyOutOfStock] = useState(() => localStorage.getItem('stock_filter_out_of_stock') === 'true') // Quiebre Sin Pedido
  const [showOnlyOutOfStockWithPending, setShowOnlyOutOfStockWithPending] = useState(() => localStorage.getItem('stock_filter_out_of_stock_pending') === 'true') // Quiebre Con Pedido
  const [pendingDays, setPendingDays] = useState<number | null>(() => {
    const saved = localStorage.getItem('stock_filter_pending_days');
    return saved ? parseInt(saved) : null;
  })
  // Switch: when false (default), only products with has_activity=true are shown.
  // When true, ALL products are shown regardless of stock/sales activity.
  const [showAllProducts, setShowAllProducts] = useState(() => localStorage.getItem('stock_filter_show_all') === 'true')

  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const [selectedCategory, setSelectedCategory] = useState<string[]>(() => loadMultiFilter('stock_filter_abc'))
  const [selectedOrigin, setSelectedOrigin] = useState<string[]>(() => loadMultiFilter('stock_filter_origin'))
  const [selectedStatus, setSelectedStatus] = useState<string>(() => localStorage.getItem('stock_filter_status') || 'All')
  const [selectedCoverage, setSelectedCoverage] = useState<CoverageFilterOption[]>(() => loadCoverageFilter('stock_filter_coverage'))

  // New Filters
  const [selectedProductType, setSelectedProductType] = useState<string>(() => localStorage.getItem('stock_filter_type') || 'All')
  const [selectedBrand, setSelectedBrand] = useState<string>(() => localStorage.getItem('stock_filter_brand') || 'All')
  const [selectedProductCategory, setSelectedProductCategory] = useState<string[]>(() => loadMultiFilter('stock_filter_category'))
  const [selectedTag, setSelectedTag] = useState<string[]>(() => loadMultiFilter('stock_filter_tag'))
  const [selectedCategoryStore, setSelectedCategoryStore] = useState<string[]>(() => loadMultiFilter('stock_filter_abc_store'))
  const [warehouseGroupFilter, setWarehouseGroupFilter] = useState<WarehouseBaseGroup>(() => (localStorage.getItem('stock_filter_wh_group') as any) || 'All')
  const [hiddenColumnWarehouseIds, setHiddenColumnWarehouseIds] = useState<Set<number>>(() => new Set())
  const [warehouseColumnFilter, setWarehouseColumnFilter] = useState<WarehouseColumnFilter>(() => {
    const stored = localStorage.getItem('stock_filter_wh_column');
    // Migrate legacy 'All' (individual columns) → 'TOTAL_ALL' (consolidated global)
    return (stored === 'All' ? 'TOTAL_ALL' : stored as any) || 'TOTAL_ALL';
  })


  // Grouping State
  const [groupBy, setGroupBy] = useState<'type' | 'brand' | 'category' | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [timer, setTimer] = useState(0) // Used to force refresh "Next sync in X min" every min


  // Auth States
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)

  // Theme State
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('stock_dark_mode') !== 'false')
  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev
      localStorage.setItem('stock_dark_mode', String(next))
      return next
    })
  }

  // Apply/remove class on root html element for light mode
  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.classList.remove('light-mode')
    } else {
      root.classList.add('light-mode')
    }
  }, [darkMode])

  // UI States
  const [currentView, setCurrentView] = useState<'products' | 'transfers' | 'ml' | 'purchases'>(() => {
    const saved = localStorage.getItem('stock_app_view');
    return (saved === 'products' || saved === 'transfers' || saved === 'ml' || saved === 'purchases') ? saved as 'products' | 'transfers' | 'ml' | 'purchases' : 'products';
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

  // Purchase Orders States
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [purchasesLoading, setPurchasesLoading] = useState(false)
  const [purchasesError, setPurchasesError] = useState<string | null>(null)
  const [purchasesLoaded, setPurchasesLoaded] = useState(false)
  const [purchasesSortKey, setPurchasesSortKey] = useState<string>('date_order')
  const [purchasesSortDir, setPurchasesSortDir] = useState<'asc' | 'desc'>('desc')
  const [purchasesFilterState, setPurchasesFilterState] = useState<string>('all')
  const [purchasesSearch, setPurchasesSearch] = useState('')
  const [purchasesDateFrom, setPurchasesDateFrom] = useState('')
  const [purchasesDateTo, setPurchasesDateTo] = useState('')
  const [purchasesVisibleCount, setPurchasesVisibleCount] = useState(500)

  // Purchase Analysis modal state
  const [showPurchaseAnalysisModal, setShowPurchaseAnalysisModal] = useState(false)
  const [paDateFrom, setPaDateFrom] = useState('')
  const [paDateTo, setPaDateTo] = useState('')
  const [paCategories, setPaCategories] = useState<string[]>([])
  const [paWarehouses, setPaWarehouses] = useState<string[]>([])
  const [paSuppliers, setPaSuppliers] = useState<string[]>([])
  const [paCategorySearch, setPaCategorySearch] = useState('')
  const [paSupplierSearch, setPaSupplierSearch] = useState('')
  const [paWarehouseSearch, setPaWarehouseSearch] = useState('')
  const [paStep, setPaStep] = useState<1 | 2>(1)
  const [paCoverage, setPaCoverage] = useState<Record<string, string>>({})
  const [paExporting, setPaExporting] = useState(false)

  const [showExtraABC, setShowExtraABC] = useState(() => localStorage.getItem('stock_extra_abc') === 'true')
  const [showExtraCoverage, setShowExtraCoverage] = useState(() => localStorage.getItem('stock_extra_coverage') === 'true')
  const [showExtraSales, setShowExtraSales] = useState(() => localStorage.getItem('stock_extra_sales') === 'true')
  const [showMinMax, setShowMinMax] = useState(() => localStorage.getItem('stock_extra_minmax') === 'true')
  const [showCost, setShowCost] = useState(() => localStorage.getItem('stock_extra_cost') === 'true')
  const [showSalePrice, setShowSalePrice] = useState(() => localStorage.getItem('stock_extra_saleprice') === 'true')
  const [showMargin, setShowMargin] = useState(() => localStorage.getItem('stock_extra_margin') === 'true')
  const [showListPrice, setShowListPrice] = useState(() => localStorage.getItem('stock_extra_listprice') === 'true')
  const [showPriceHistory, setShowPriceHistory] = useState(() => localStorage.getItem('stock_extra_price_history') === 'true')
  const [showPrevListPrice, setShowPrevListPrice] = useState(() => localStorage.getItem('stock_extra_prev_listprice') === 'true')
  const [salesPeriodDays, setSalesPeriodDays] = useState<30 | 90 | 180>(() => (Number(localStorage.getItem('stock_extra_sales_period')) || 30) as 30 | 90 | 180)
  const salesPeriodDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setSalesPeriodDaysDebounced = useCallback((days: 30 | 90 | 180) => {
    if (salesPeriodDebounceRef.current) clearTimeout(salesPeriodDebounceRef.current)
    salesPeriodDebounceRef.current = setTimeout(() => {
      setSalesPeriodDays(days)
      setDisplayLimitTransfer(200) // Reduce limit during transition to avoid overload
    }, 150)
  }, [])

  useEffect(() => { localStorage.setItem('stock_extra_abc', String(showExtraABC)); }, [showExtraABC]);
  useEffect(() => { localStorage.setItem('stock_extra_coverage', String(showExtraCoverage)); }, [showExtraCoverage]);
  useEffect(() => { localStorage.setItem('stock_extra_sales', String(showExtraSales)); }, [showExtraSales]);
  useEffect(() => { localStorage.setItem('stock_extra_minmax', String(showMinMax)); }, [showMinMax]);
  useEffect(() => { localStorage.setItem('stock_extra_cost', String(showCost)); }, [showCost]);
  useEffect(() => { localStorage.setItem('stock_extra_saleprice', String(showSalePrice)); }, [showSalePrice]);
  useEffect(() => { localStorage.setItem('stock_extra_margin', String(showMargin)); }, [showMargin]);
  useEffect(() => { localStorage.setItem('stock_extra_listprice', String(showListPrice)); }, [showListPrice]);
  useEffect(() => { localStorage.setItem('stock_extra_price_history', String(showPriceHistory)); }, [showPriceHistory]);
  useEffect(() => { localStorage.setItem('stock_extra_prev_listprice', String(showPrevListPrice)); }, [showPrevListPrice]);
  useEffect(() => { localStorage.setItem('stock_extra_sales_period', String(salesPeriodDays)); }, [salesPeriodDays]);
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
          const wid = String(selectedWarehouseId!)
          const salesA = salesPeriodDays === 90 ? (a.sales_by_wh_90d?.[wid] || 0)
            : salesPeriodDays === 180 ? (a.sales_by_wh_180d?.[wid] || 0)
              : (a.sales_by_wh?.[selectedWarehouseId!] || 0);
          const stockA = a.stock_by_wh?.[selectedWarehouseId!] || 0;
          const covA = getCoverageDaysFromVisibleStock(stockA, salesA, salesPeriodDays) ?? 999;

          const salesB = salesPeriodDays === 90 ? (b.sales_by_wh_90d?.[wid] || 0)
            : salesPeriodDays === 180 ? (b.sales_by_wh_180d?.[wid] || 0)
              : (b.sales_by_wh?.[selectedWarehouseId!] || 0);
          const stockB = b.stock_by_wh?.[selectedWarehouseId!] || 0;
          const covB = getCoverageDaysFromVisibleStock(stockB, salesB, salesPeriodDays) ?? 999;

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
        return matchesWarehouseColumnScope(w, warehouseColumnFilter);
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
  const [displayLimitTransfer, setDisplayLimitTransfer] = useState(50)
  const [showWhDropdown, setShowWhDropdown] = useState(false)
  const [showTransferSourceDropdown, setShowTransferSourceDropdown] = useState(false)
  const [showTransferDestDropdown, setShowTransferDestDropdown] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showActionsDropdown, setShowActionsDropdown] = useState(false)
  const [transferSourceWarehouse, setTransferSourceWarehouse] = useState<number | null>(null)
  const [transferCoverageFilter, setTransferCoverageFilter] = useState<CoverageFilterOption[]>(() => loadCoverageFilter('transfer_coverage_filter'))

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
  useEffect(() => {
    if (selectedProductIds.length > 0) {
      localStorage.setItem('stock_filter_selected_products', JSON.stringify(selectedProductIds));
    } else {
      localStorage.removeItem('stock_filter_selected_products');
    }
  }, [selectedProductIds]);
  useEffect(() => {
    if (selectedProvider.length > 0) {
      localStorage.setItem('stock_filter_provider', JSON.stringify(selectedProvider));
    } else {
      localStorage.removeItem('stock_filter_provider');
    }
  }, [selectedProvider]);
  useEffect(() => {
    if (selectedCategory.length > 0) {
      localStorage.setItem('stock_filter_abc', JSON.stringify(selectedCategory));
    } else {
      localStorage.removeItem('stock_filter_abc');
    }
  }, [selectedCategory]);
  useEffect(() => { localStorage.setItem('stock_filter_brand', selectedBrand); }, [selectedBrand]);
  useEffect(() => {
    if (selectedProductCategory.length > 0) {
      localStorage.setItem('stock_filter_category', JSON.stringify(selectedProductCategory));
    } else {
      localStorage.removeItem('stock_filter_category');
    }
  }, [selectedProductCategory]);
  useEffect(() => {
    if (selectedTag.length > 0) {
      localStorage.setItem('stock_filter_tag', JSON.stringify(selectedTag));
    } else {
      localStorage.removeItem('stock_filter_tag');
    }
  }, [selectedTag]);
  useEffect(() => {
    if (selectedOrigin.length > 0) {
      localStorage.setItem('stock_filter_origin', JSON.stringify(selectedOrigin));
    } else {
      localStorage.removeItem('stock_filter_origin');
    }
  }, [selectedOrigin]);
  useEffect(() => { localStorage.setItem('stock_filter_status', selectedStatus); }, [selectedStatus]);
  useEffect(() => { localStorage.setItem('stock_filter_type', selectedProductType); }, [selectedProductType]);
  useEffect(() => {
    if (selectedCategoryStore.length > 0) {
      localStorage.setItem('stock_filter_abc_store', JSON.stringify(selectedCategoryStore));
    } else {
      localStorage.removeItem('stock_filter_abc_store');
    }
  }, [selectedCategoryStore]);
  useEffect(() => { localStorage.setItem('stock_filter_wh_group', warehouseGroupFilter); }, [warehouseGroupFilter]);
  useEffect(() => { localStorage.setItem('stock_filter_wh_column', warehouseColumnFilter); }, [warehouseColumnFilter]);
  useEffect(() => {
    if (selectedCoverage.length > 0) {
      localStorage.setItem('stock_filter_coverage', JSON.stringify(selectedCoverage));
    } else {
      localStorage.removeItem('stock_filter_coverage');
    }
  }, [selectedCoverage]);
  useEffect(() => { localStorage.setItem('transfer_filter_search', transferSearchTerm); }, [transferSearchTerm]);
  useEffect(() => {
    if (transferCoverageFilter.length > 0) {
      localStorage.setItem('transfer_coverage_filter', JSON.stringify(transferCoverageFilter));
    } else {
      localStorage.removeItem('transfer_coverage_filter');
    }
  }, [transferCoverageFilter]);

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
  useEffect(() => { localStorage.setItem('stock_filter_show_all', showAllProducts.toString()); }, [showAllProducts]);
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
    avatar: null as string | null,
    warehouseAccess: 'ALL' as WarehouseAccessMode
  })

  const allowedWarehouseColumnFilters = useMemo(
    () => getAllowedWarehouseColumnFiltersForAccess(userProfile.warehouseAccess),
    [userProfile.warehouseAccess]
  )
  const allowedWarehouseBaseGroups = useMemo(
    () => getAllowedWarehouseBaseGroupsForAccess(userProfile.warehouseAccess),
    [userProfile.warehouseAccess]
  )

  // Custom Filters State
  const [activeDropdown, setActiveDropdown] = useState<'none' | 'category' | 'provider' | 'origin' | 'abc' | 'abc_store' | 'tag' | 'coverage'>('none')

  const effectiveProductSearchTerm = debouncedProductSearch.trim()

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
    const isTransfers = currentView === 'transfers' || currentView === 'ml';
    const data = isTransfers ? sortedTransferProducts : filteredProducts;

    if (!isTransfers) {
      // --- PRODUCTS VIEW: simple export ---
      const dataToExport = data.map((p: any) => ({
        'Código': p.barcode || p.default_code || '',
        'Producto': p.name,
        'Proveedor': normalizeExportText(p.provider),
        'ABC Global': p.abc_category || '',
        ...(selectedWarehouseId ? { 'ABC Sucursal': p.abc_category_store || '' } : {}),
        'Stock': p.currentStock,
        [`Venta (${salesPeriodDays}d)`]: p.currentSales,
        'Cobertura (Días)': p.coverage >= 999 ? 'SIN VENTAS' : Math.floor(p.coverage),
        'Pendiente': p.currentPending || 0,
        'Estado': p.currentStatus
      }));
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Productos');
      XLSX.writeFile(wb, `Stock_Pro_Productos_${new Date().toISOString().split('T')[0]}.xlsx`);
      setShowActionsDropdown(false);
      return;
    }

    // --- TRANSFERS / ML VIEW: export exactly what's visible in the table ---
    const destWarehouse = warehouses.find((w: any) => w.id === selectedWarehouseId);
    const destWarehouseName = destWarehouse?.name || 'Destino';
    const destWarehouseExportLabel = getWarehouseExportLabel(destWarehouse, 'Destino');
    const isSimpleDest = isSimpleWarehouseName(destWarehouseName);
    const isConsolidated = warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ANDYS' || warehouseColumnFilter === 'TOTAL_ALL';
    const consolidatedLabel = warehouseColumnFilter === 'TOTAL_ALL' ? 'Total Global' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'Total NUBA' : 'Total ANDYS';

    const dataToExport = data.map((p: any) => {
      const selectedKey = String(selectedWarehouseId ?? '');

      // --- Destination (current branch) columns ---
      const destStock = selectedWarehouseId ? (p.stock_by_wh?.[selectedWarehouseId] || 0) : 0;
      const destSalesRaw = salesPeriodDays === 90 ? (p.sales_by_wh_90d?.[selectedKey] || 0)
        : salesPeriodDays === 180 ? (p.sales_by_wh_180d?.[selectedKey] || 0)
          : (p.sales_by_wh?.[selectedWarehouseId!] || 0);
      const destCoverage = Math.min(999, getCoverageDaysFromVisibleStock(destStock, destSalesRaw, salesPeriodDays) ?? 999);
      const destAbc = p.abc_by_wh?.[selectedKey]?.category || p.abc_category || '-';
      const destMin = p.orderpoints_by_wh?.[selectedKey]?.min;
      const destMax = p.orderpoints_by_wh?.[selectedKey]?.max;

      const row: Record<string, any> = {
        'Código': p.barcode || p.default_code || '',
        'Producto': p.name,
        'Proveedor': normalizeExportText(p.provider),
        'Origen': p.origen || '',
        'ABC Global': p.abc_category || '-',
      };

      // Cobertura destino (columna COBERT. sticky)
      if (!isConsolidated) {
        row[`${destWarehouseExportLabel} - Stock`] = Math.round(destStock);
        if (!isSimpleDest && showExtraSales) row[`${destWarehouseExportLabel} - Venta (${salesPeriodDays}d)`] = Math.round(destSalesRaw);
        if (!isSimpleDest && showExtraCoverage) row[`${destWarehouseExportLabel} - Cobertura (Días)`] = destCoverage >= 999 ? 'SIN VENTAS' : destCoverage;
        if (!isSimpleDest && showExtraABC) row[`${destWarehouseExportLabel} - ABC`] = destAbc;
        if (!isSimpleDest && showMinMax) row[`${destWarehouseExportLabel} - Min`] = destMin !== undefined ? Math.round(destMin) : '-';
        if (!isSimpleDest && showMinMax) row[`${destWarehouseExportLabel} - Max`] = destMax !== undefined ? Math.round(destMax) : '-';
      }

      // Cant. Traspaso
      row['Cant. Traspaso'] = transferQuantities[p.id] || 0;

      if (isConsolidated) {
        const consolidatedWhs = getConsolidatedScopeWarehouses(warehouses, warehouseColumnFilter as 'TOTAL_NUBA' | 'TOTAL_ANDYS' | 'TOTAL_ALL');
        const totalStock = getConsolidatedStockForFilter(p, warehouses, warehouseColumnFilter);
        const totalSales = consolidatedWhs.reduce((s: number, wh: any) => {
          const wid = String(wh.id);
          return s + (salesPeriodDays === 90 ? (p.sales_by_wh_90d?.[wid] || 0) : salesPeriodDays === 180 ? (p.sales_by_wh_180d?.[wid] || 0) : (p.sales_by_wh?.[wh.id] || 0));
        }, 0);
        const avgCov = getCoverageDaysFromVisibleStock(totalStock, totalSales, salesPeriodDays);
        const totalMin = visibleWarehouses.reduce((s: number, wh: any) => s + (p.orderpoints_by_wh?.[String(wh.id)]?.min || 0), 0);
        const totalMax = visibleWarehouses.reduce((s: number, wh: any) => s + (p.orderpoints_by_wh?.[String(wh.id)]?.max || 0), 0);

        row[`${consolidatedLabel} - Stock`] = Math.round(totalStock);
        if (showExtraSales) row[`${consolidatedLabel} - Venta (${salesPeriodDays}d)`] = Math.round(totalSales);
        if (showExtraCoverage) row[`${consolidatedLabel} - Cobertura (Días)`] = avgCov === null ? 'SIN VENTAS' : avgCov;
        if (showExtraABC) row[`${consolidatedLabel} - ABC`] = p.abc_category || '-';
        if (showMinMax) row[`${consolidatedLabel} - Min`] = Math.round(totalMin);
        if (showMinMax) row[`${consolidatedLabel} - Max`] = Math.round(totalMax);
      }

      // Individual warehouse columns (always shown, just like on screen)
      visibleWarehouses.forEach((wh: any) => {
        const wid = String(wh.id);
        const whName = wh.name || wid;
        const whExportLabel = getWarehouseExportLabel(wh, wid);
        const isSimpleWh = isSimpleWarehouseName(whName);
        const targetStock = getWhStock(p, wh);
        const salesRaw = getWhSales(p, wh, salesPeriodDays);
        const whCov = Math.min(999, getCoverageDaysFromVisibleStock(targetStock, salesRaw, salesPeriodDays) ?? 999);
        const whAbc = p.abc_by_wh?.[wid]?.category || '-';
        const whMin = p.orderpoints_by_wh?.[wid]?.min;
        const whMax = p.orderpoints_by_wh?.[wid]?.max;

        row[`${whExportLabel} - Stock`] = Math.round(targetStock);
        if (!isSimpleWh && showExtraSales) row[`${whExportLabel} - Venta (${salesPeriodDays}d)`] = Math.round(salesRaw);
        if (!isSimpleWh && showExtraCoverage) row[`${whExportLabel} - Cobertura (Días)`] = whCov >= 999 ? 'SIN VENTAS' : whCov;
        if (!isSimpleWh && showExtraABC) row[`${whExportLabel} - ABC`] = whAbc;
        if (!isSimpleWh && showMinMax) row[`${whExportLabel} - Min`] = whMin !== undefined ? Math.round(whMin) : '-';
        if (!isSimpleWh && showMinMax) row[`${whExportLabel} - Max`] = whMax !== undefined ? Math.round(whMax) : '-';
      });

      if (showListPrice) row['P. LISTA'] = p.list_price ?? '';
      if (showPrevListPrice) row['P. ANTERIOR'] = p.prev_list_price && p.prev_list_price > 0 ? p.prev_list_price : '';
      if (showPriceHistory) row['F. ACTUALIZACIÓN'] = p.price_update_date || '';

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);

    // Auto column widths
    if (dataToExport.length > 0) {
      const colWidths = Object.keys(dataToExport[0]).map(key => ({
        wch: Math.min(40, Math.max(key.length, ...dataToExport.slice(0, 50).map((d: any) => String(d[key] ?? '').length)) + 2)
      }));
      ws['!cols'] = colWidths;
    }

    const wb = XLSX.utils.book_new();
    const sheetName = currentView === 'ml' ? 'ML_Traspasos' : 'Traspasos';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `Stock_Pro_${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`);
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

  const handleDownloadPurchasesExcel = () => {
    if (!purchaseOrders.length) return;
    // Use filtered + sorted data
    const dataToExport = (filteredPurchaseOrders.length ? filteredPurchaseOrders : purchaseOrders).map((line: any) => ({
      'Líneas de la orden/Referencia de L.':                   line.order_ref,
      'Líneas de la orden/Barcode':                            line.barcode,
      'Líneas de la orden/Descripción':                        line.description,
      'Líneas de la orden/Cantidad':                           line.qty,
      'Fecha límite de la orden':                              line.date_planned ? line.date_planned.slice(0, 10) : '',
      'Líneas de la orden/Líneas de factura/Fecha de la orden': line.date_order ? line.date_order.slice(0, 10) : '',
      'Proveedor':                                             normalizeExportText(line.supplier),
      'Estado':                                                line.state_label,
      'Estado de entrega':                                     line.delivery_status,
      'Comprador':                                             line.buyer,
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    // Auto-width columns
    if (dataToExport.length > 0) {
      const colWidths = Object.keys(dataToExport[0]).map((key: string) => ({
        wch: Math.min(50, Math.max(key.length, ...dataToExport.slice(0, 200).map((d: any) => String(d[key] ?? '').length)) + 2)
      }));
      ws['!cols'] = colWidths;
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Compras');
    XLSX.writeFile(wb, `Stock_Pro_Compras_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowActionsDropdown(false);
  };

  const handlePurchaseAnalysisExport = async () => {
    if (paExporting) return;
    setPaExporting(true);
    try {
      const token = localStorage.getItem('stock_token') || sessionStorage.getItem('stock_token') || '';

      // Clean warehouse names: "ALMACEN CENTRAL: Recepciones" → "ALMACEN CENTRAL"
      const cleanWhNames = paWarehouses.map(wh => wh.split(':')[0].trim());

      // Solo mandar categorías si el usuario seleccionó un SUBCONJUNTO explícito.
      // Si seleccionó todas (o ninguna), no filtrar por categoría en el backend.
      const effectiveCategoryFilter =
        paCategories.length > 0 && paCategories.length < paAvailableCategories.length
          ? paCategories
          : [];

      const body = {
        date_from:        paDateFrom,
        date_to:          paDateTo,
        warehouse_names:  cleanWhNames,
        category_names:   effectiveCategoryFilter,
        supplier_names:   paSuppliers,
        product_barcodes: [],
        abc_coverage:     Object.fromEntries(
          Object.entries(paCoverage).map(([k, v]) => [k, Number(v) || 0])
        ),
      };

      const res = await fetch('/api/purchase-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Token': token },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const { rows, warehouses: whNames, days } = data as {
        rows: any[];
        warehouses: string[];
        days: number;
      };

      if (!rows?.length) {
        alert('No hay datos para exportar con los filtros seleccionados.');
        return;
      }

      // Seller: si hay un único proveedor seleccionado usarlo, sino blank
      const sellerLabel = paSuppliers.length === 1 ? paSuppliers[0] : '';
      const abbrevWhNames = whNames.map(getWarehouseAbbreviation)

      const { purchaseSheet, transferSheet } = buildPurchaseAnalysisSheet({
        rows: rows as PurchaseSuggestionRow[],
        warehouseNames: abbrevWhNames,
        abcCoverage: Object.fromEntries(
          Object.entries(paCoverage).map(([key, value]) => [key.toUpperCase(), Number(value) || 0])
        ),
        sellerLabel,
        days,
      })

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, purchaseSheet, 'Pedido Sugerido')
      XLSX.utils.book_append_sheet(wb, transferSheet, 'Traspaso Sugerido')
      XLSX.writeFile(wb, `Pedido_Sugerido_${paDateFrom}_${paDateTo}.xlsx`);
      setShowPurchaseAnalysisModal(false);
      setPaStep(1);
    } catch (err: any) {
      alert(`Error al exportar: ${err.message || 'Error desconocido'}`);
    } finally {
      setPaExporting(false);
    }
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

    // Verify Token — retry up to 5 times on network/502 errors
    const verifyWithRetry = (attemptsLeft: number) => {
      fetch('/api/verify_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
        .then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then(data => {
          if (data.status === 'success') {
            setIsAuthenticated(true)
            setUserProfile({
              username: data.user || 'Usuario',
              avatar: data.avatar || null,
              warehouseAccess: normalizeWarehouseAccess(data.warehouse_access)
            })
          }
          setAuthChecking(false)
        })
        .catch(() => {
          if (attemptsLeft > 1) {
            console.log(`⏳ Backend no disponible, reintentando... (${attemptsLeft - 1} intentos restantes)`)
            setTimeout(() => verifyWithRetry(attemptsLeft - 1), 4000)
          } else {
            console.warn("⚠️ No se pudo conectar al backend tras varios intentos.")
            setAuthChecking(false)
          }
        })
    }
    verifyWithRetry(5)

  }, [])

  const [initialLoad, setInitialLoad] = useState(true)
  const fetchProducts = useCallback((forceSync: boolean = false) => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    // Cancel any previous timer to prevent multiple polling loops
    if (syncPollTimerRef.current) {
      clearTimeout(syncPollTimerRef.current);
      syncPollTimerRef.current = null;
    }

    // Only set loading on initial load or forced sync - never on automatic refresh
    if (forceSync || initialLoad) setLoading(true)
    const url = forceSync ? '/api/products?sync=true' : '/api/products'
    const token = localStorage.getItem('stock_token') || sessionStorage.getItem('stock_token') || ''

    if (forceSync) {
      console.log("🔄 Iniciando sincronización forzada con Odoo... Esto puede tardar unos segundos.");
    } else {
      console.log("📦 Cargando datos de productos desde el caché...");
    }

    fetch(url, {
      headers: { 'X-Token': token }
    })
      .then(async r => {
        if (!r.ok) {
          // Backend temporarily down (502/503/etc) — retry silently
          isFetchingRef.current = false
          syncPollTimerRef.current = setTimeout(() => fetchProducts(false), 15000)
          return null
        }
        const h_sync = r.headers.get("X-Is-Syncing");
        const data = await r.json();
        return { data, h_sync };
      })
      .then((result) => {
        if (!result) return
        const { data, h_sync } = result
        // Handle "syncing" response status
        if (data.status === 'syncing') {
          setIsSyncing(true)
          console.log("⏳ El servidor ya está sincronizando. Reintentando en unos segundos...");
          if (data.products) {
            setLastUpdate(data.last_update)
            setNextSync(data.next_sync)
            setWarehouses([{ id: null, name: 'VISTA GLOBAL' }, ...(data.warehouses || [])])
            setProducts(data.products.map(normalizeProductStock))
          }
          setLoading(false)
          isFetchingRef.current = false
          // Keep polling until sync finishes — without ?sync=true to avoid re-triggering
          syncPollTimerRef.current = setTimeout(() => fetchProducts(false), 15000)
          return
        }

        const serverIsSyncing = h_sync ? h_sync === 'true' : (data.is_syncing === true);
        setIsSyncing(serverIsSyncing)

        if (serverIsSyncing) {
          console.log("⏳ El backend reporta sincronización en curso (background)...")
          syncPollTimerRef.current = setTimeout(() => fetchProducts(false), 15000)
        }

        console.log(`✅ Datos recibidos: ${data.products?.length || 0} productos. Última sincro: ${data.last_update}`);

        setLastUpdate(data.last_update)
        setNextSync(data.next_sync)
        setGlobalStats(data.global_stats)
        setAbcSummary(data.abc_summary)

        const whs = data.warehouses || []
        setWarehouses([{ id: null, name: 'VISTA GLOBAL' }, ...whs])

        // Ensure selectedWarehouseId is set if not already
        if (selectedWarehouseId === undefined) {
          setSelectedWarehouseId(null)
        }

        const loaded: Product[] = data.products.map(normalizeProductStock)

        setProducts(loaded)
        setLoading(false)
        setInitialLoad(false)
        isFetchingRef.current = false
      })
      .catch(err => {
        console.error("❌ Error al cargar productos:", err)
        setLoading(false)
        setInitialLoad(false)
        isFetchingRef.current = false
        // Retry on network error
        syncPollTimerRef.current = setTimeout(() => fetchProducts(false), 30000)
      })
      // Safety timeout: ensure loading resets after 60 seconds
      .finally(() => {
        const safetyTimeout = setTimeout(() => {
          if (isFetchingRef.current) {
            console.warn("⚠️ Safety timeout: resetting stuck fetch state")
            isFetchingRef.current = false
            setLoading(false)
          }
        }, 60000)
        return () => clearTimeout(safetyTimeout)
      })
  }, [selectedWarehouseId, initialLoad])

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts(false) // Use cache on initial load
    }
  }, [isAuthenticated, fetchProducts])

  const fetchPurchaseOrders = useCallback(async () => {
    if (purchasesLoading) return;
    setPurchasesLoading(true);
    setPurchasesError(null);
    try {
      const token = localStorage.getItem('stock_token') || sessionStorage.getItem('stock_token') || '';
      const res = await fetch('/api/purchase-orders', {
        headers: { 'X-Token': token }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPurchaseOrders(data.lines || []);
      setPurchasesLoaded(true);
    } catch (err: any) {
      setPurchasesError(err.message || 'Error al cargar órdenes de compra');
    } finally {
      setPurchasesLoading(false);
    }
  }, [purchasesLoading]);

  // Auto-fetch purchases when view opens or modal opens
  useEffect(() => {
    if ((currentView === 'purchases' || showPurchaseAnalysisModal) && !purchasesLoaded && !purchasesLoading) {
      fetchPurchaseOrders();
    }
  }, [currentView, showPurchaseAnalysisModal, purchasesLoaded, purchasesLoading, fetchPurchaseOrders]);

  useEffect(() => {
    setPurchasesVisibleCount(500);
  }, [purchasesFilterState, purchasesSearch, purchasesDateFrom, purchasesDateTo]);

  // Track if user has active unsaved work to prevent interrupts
  const hasActiveWorkRef = useRef(false)
  useEffect(() => {
    const hasQty = Object.keys(transferQuantities).some(k => transferQuantities[Number(k)] && transferQuantities[Number(k)] !== '0')
    const hasStaged = stagedGlobalTransfers.length > 0
    hasActiveWorkRef.current = ((currentView === 'transfers' || currentView === 'ml') && hasQty) || hasStaged
  }, [currentView, transferQuantities, stagedGlobalTransfers])

  // Timer to refresh countdown (disabled - was causing unwanted refreshes)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => t + 1)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Filters Visibility Logic
  const hasActiveFilters = useMemo(() => {
    if (currentView === 'products') {
      return (
        productSearchTerm !== '' ||
        selectedProductIds.length > 0 ||
        selectedProvider.length > 0 ||
        selectedCategory.length > 0 ||
        selectedTag.length > 0 ||
        selectedProductCategory.length > 0 ||
        selectedCategoryStore.length > 0 ||
        selectedStatus !== 'All' ||
        selectedProductType !== 'All' ||
        selectedBrand !== 'All' ||
        selectedCoverage.length > 0 ||
        selectedOrigin.length > 0 ||
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
        transferCoverageFilter.length > 0 ||
        selectedProvider.length > 0 ||
        selectedOrigin.length > 0 ||
        selectedTag.length > 0 ||
        selectedCategory.length > 0 ||
        selectedProductCategory.length > 0 ||
        selectedCategoryStore.length > 0
      );
    }
  }, [
    currentView,
    productSearchTerm, selectedProductIds, selectedProvider, selectedCategory, selectedTag,
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
      const searchStr = `${p.name} ${p.barcode || ''}`.toLowerCase();
      const isGlobal = selectedWarehouseId === null

      const specificStock = isGlobal ? (p as any).total_stock : ((p as any).stock_by_wh?.[selectedWarehouseId!] ?? 0)
      const wid = selectedWarehouseId != null ? String(selectedWarehouseId) : ''
      const specificSales = isGlobal
        ? (salesPeriodDays === 90 ? ((p as any).sales_90d || 0) : salesPeriodDays === 180 ? ((p as any).sales_180d || 0) : ((p as any).sales_30d || 0))
        : (salesPeriodDays === 90 ? ((p as any).sales_by_wh_90d?.[wid] ?? 0) : salesPeriodDays === 180 ? ((p as any).sales_by_wh_180d?.[wid] ?? 0) : ((p as any).sales_by_wh?.[selectedWarehouseId!] ?? 0))

      // Multi-format support for ABC (handles both new object format and legacy array format)
      const abcCat = (p as any).abc_category || 'E'

      // ABC Sucursal (Store-specific ABC)
      let abcStoreCat = 'E'
      if (!isGlobal && (p as any).abc_by_wh) {
        const whIdStr = selectedWarehouseId!.toString()
        const entry = (p as any).abc_by_wh[whIdStr]
        if (entry) abcStoreCat = entry.category || 'E'
      }

      const coverage = getCoverageDays(specificStock, specificSales, salesPeriodDays) ?? 999

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
        currentSalesGlobal: salesPeriodDays === 90 ? ((p as any).sales_90d || 0) : salesPeriodDays === 180 ? ((p as any).sales_180d || 0) : ((p as any).sales_30d || 0),
        abc_category: abcCat || 'E',
        abc_category_store: abcStoreCat || 'E',
        coverage: Math.round(coverage),
        currentStatus: status,
        currentPending: calculatedPending,
        filteredPendingOrders: pendingList,
        _searchStr: searchStr,
        // CLEAN CATEGORY NAME
        category_name: (p.category_name || '').replace(/^All products \/ /, '')
      }
    })
  }, [products, selectedWarehouseId, pendingDays, salesPeriodDays])

  const processedProducts = useMemo(() => {
    return baseProcessedProducts; // Removed filter to ensure all products are visible
  }, [baseProcessedProducts])

  const warehouseIdsByScopedGroup = useMemo(() => {
    return SCOPED_WAREHOUSE_BASE_GROUPS.reduce((acc, group) => {
      acc[group] = warehouses
        .filter((warehouse) => matchesWarehouseBaseGroup(warehouse, group))
        .map((warehouse) => warehouse.id)
        .filter((id): id is number => typeof id === 'number');
      return acc;
    }, {} as Record<ScopedWarehouseBaseGroup, number[]>);
  }, [warehouses]);

  const productMetricsByScopedGroup = useMemo(() => {
    return SCOPED_WAREHOUSE_BASE_GROUPS.reduce((acc, group) => {
      const warehouseIds = warehouseIdsByScopedGroup[group];
      const metrics = new Map<number, { stock: number, sales30: number, sales90: number, sales180: number }>();

      products.forEach((product: any) => {
        let stock = 0;
        let sales30 = 0;
        let sales90 = 0;
        let sales180 = 0;

        warehouseIds.forEach((warehouseId) => {
          const wid = String(warehouseId);
          stock += product.stock_by_wh?.[warehouseId] || 0;
          sales30 += product.sales_by_wh?.[warehouseId] || 0;
          sales90 += product.sales_by_wh_90d?.[wid] || 0;
          sales180 += product.sales_by_wh_180d?.[wid] || 0;
        });

        metrics.set(product.id, { stock, sales30, sales90, sales180 });
      });

      acc[group] = metrics;
      return acc;
    }, {} as Record<ScopedWarehouseBaseGroup, Map<number, { stock: number, sales30: number, sales90: number, sales180: number }>>);
  }, [products, warehouseIdsByScopedGroup]);


  // --- 3. Filter Logic ---
  // --- 3. Filter Logic & Dynamic Counts ---
  const productMatchStates = useMemo(() => {
    const baseProducts = (currentView === 'transfers' || currentView === 'ml')
      ? (selectedWarehouseId ? processedProducts : baseProcessedProducts)
      : processedProducts;

    const lowProductSearch = productSearchTerm.trim().toLowerCase();
    const lowTransferSearch = transferSearchTerm.trim().toLowerCase();

    // Optimize: Pre-filter warehouses outside the main loop
    const isTransfersOrML = currentView === 'transfers' || currentView === 'ml';
    let groupWhsCoverage: any[] = [];
    if (isTransfersOrML && transferCoverageFilter.length > 0) {
      if (!selectedWarehouseId) {
        if (warehouseColumnFilter === 'TOTAL_ALL') {
          groupWhsCoverage = getConsolidatedScopeWarehouses(warehouses, 'TOTAL_ALL');
        } else if (warehouseColumnFilter === 'TOTAL_ANDYS' || warehouseColumnFilter === 'TOTAL_NUBA') {
          groupWhsCoverage = getConsolidatedScopeWarehouses(warehouses, warehouseColumnFilter);
        }
      }
    }

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

      const matchesProvider = selectedProvider.length === 0 || selectedProvider.includes(providerName);
      const matchesOrigin = selectedOrigin.length === 0 || selectedOrigin.includes(originName);
      const matchesTag = selectedTag.length === 0 || selectedTag.some(tag => tags.includes(tag));
      const matchesCategory = selectedCategory.length === 0 || selectedCategory.includes(abcGlobal);
      const matchesProductCategory = selectedProductCategory.length === 0 || selectedProductCategory.includes(pCat);
      const matchesCategoryStore = selectedCategoryStore.length === 0 || selectedCategoryStore.includes(abcStore);

      if (currentView === 'transfers' || currentView === 'ml') {
        const matchesSearch = lowTransferSearch === '' || p._searchStr.includes(lowTransferSearch);

        const stockInTarget = transferTargetWarehouse ? (p.stock_by_wh?.[transferTargetWarehouse] || 0) : 0;
        const hasStockSomewhere = p.total_stock > 0 || (p.stock_by_wh && Object.keys(p.stock_by_wh).length > 0);

        const matchesStockMode = transferTargetWarehouse ? (stockInTarget > 0) : hasStockSomewhere;

        const totalStock = p.total_stock || 0;
        const totalSales = salesPeriodDays === 90 ? ((p as any).sales_90d || 0) : salesPeriodDays === 180 ? ((p as any).sales_180d || 0) : (p.sales_30d || 0);
        const hasStockOrSales = totalStock > 0 || totalSales > 0;

        // Filtro de cobertura
        let matchesCoverage = true;
        if (transferCoverageFilter.length > 0) {
          let covStock: number;
          let covSales: number;
          if (selectedWarehouseId) {
            // Sucursal específica seleccionada
            const wid = String(selectedWarehouseId);
            covStock = p.stock_by_wh?.[selectedWarehouseId] || 0;
            covSales = salesPeriodDays === 90 ? (p.sales_by_wh_90d?.[wid] || 0) : salesPeriodDays === 180 ? (p.sales_by_wh_180d?.[wid] || 0) : (p.sales_by_wh?.[selectedWarehouseId] || 0);
          } else if (warehouseColumnFilter === 'TOTAL_ANDYS' || warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ALL') {
            // Grupo consolidado: sumar stock y ventas de las sucursales del grupo (sin almacenes de almacenaje)
            // Ya pre-filtramos groupWhsCoverage arriba
            covStock = getConsolidatedStockForFilter(p, warehouses, warehouseColumnFilter);
            covSales = groupWhsCoverage.reduce((s: number, w: any) => {
              const wid = String(w.id);
              return s + (salesPeriodDays === 90 ? (p.sales_by_wh_90d?.[wid] || 0) : salesPeriodDays === 180 ? (p.sales_by_wh_180d?.[wid] || 0) : (p.sales_by_wh?.[w.id] || 0));
            }, 0);
          } else {
            // Vista global: totales
            covStock = p.total_stock || 0;
            covSales = salesPeriodDays === 90 ? (p.sales_90d || 0) : salesPeriodDays === 180 ? (p.sales_180d || 0) : (p.sales_30d || 0);
          }
          const coverage = getCoverageDaysFromVisibleStock(covStock, covSales, salesPeriodDays);
          matchesCoverage = transferCoverageFilter.some(option => matchesCoverageOption(coverage ?? 999, option));
        }

        return {
          p,
          matchesSearch,
          matchesProvider,
          matchesTag,
          matchesCategory,
          matchesProductCategory,
          matchesCategoryStore,
          matchesStock: matchesStockMode && (showAllProducts || hasStockOrSales),
          matchesCoverage,
          matchesOrigin,
          matchesActivity: showAllProducts || ((p as any).has_activity !== false),
          // For counts, we consider only Search and Stock as "Always Applied" for the base
          meta: { providerName, originName, bName, productSegment, pCat, tags, abcGlobal, abcStore }
        };
      } else {
        const matchesSearch = lowProductSearch === '' || p._searchStr.includes(lowProductSearch);

        const matchesDeficient = !showOnlyDeficient || p.currentStatus === 'Deficiente' || p.currentStatus === 'Sin Stock';
        const matchesPending = !showOnlyPending || (p.currentPending ?? 0) > 0;
        const matchesOutOfStock = !showOnlyOutOfStock || ((p.currentStock ?? 0) <= 0 && (p.currentPending ?? 0) === 0 && (p.currentSales ?? 0) > 0);
        const matchesOutOfStockWithPending = !showOnlyOutOfStockWithPending || ((p.currentStock ?? 0) <= 0 && (p.currentPending ?? 0) > 0);
        const matchesStatus = selectedStatus === 'All' || p.currentStatus === selectedStatus;
        const matchesType = selectedProductType === 'All' || productSegment === selectedProductType;
        const matchesBrand = selectedBrand === 'All' || bName === selectedBrand;
        const matchesAge = pendingDays === null || (p.currentPending ?? 0) > 0;

        let matchesCoverage = true;
        if (selectedCoverage.length > 0) {
          const isGlobal = selectedWarehouseId === null;
          let specificStock: number;
          let specificSales: number;
          if (isGlobal && (warehouseColumnFilter === 'TOTAL_ANDYS' || warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ALL')) {
            const groupWhs = getConsolidatedScopeWarehouses(warehouses, warehouseColumnFilter);
            specificStock = groupWhs.reduce((s: number, w: any) => s + ((p as any).stock_by_wh?.[w.id] || 0), 0);
            specificSales = groupWhs.reduce((s: number, w: any) => {
              const wid = String(w.id);
              return s + (salesPeriodDays === 90 ? ((p as any).sales_by_wh_90d?.[wid] || 0) : salesPeriodDays === 180 ? ((p as any).sales_by_wh_180d?.[wid] || 0) : ((p as any).sales_by_wh?.[w.id] || 0));
            }, 0);
          } else if (isGlobal) {
            specificStock = (p as any).total_stock;
            specificSales = salesPeriodDays === 90 ? ((p as any).sales_90d || 0) : salesPeriodDays === 180 ? ((p as any).sales_180d || 0) : ((p as any).sales_30d || 0);
          } else {
            const wid = String(selectedWarehouseId);
            specificStock = (p as any).stock_by_wh?.[selectedWarehouseId!] || 0;
            specificSales = salesPeriodDays === 90 ? ((p as any).sales_by_wh_90d?.[wid] || 0) : salesPeriodDays === 180 ? ((p as any).sales_by_wh_180d?.[wid] || 0) : ((p as any).sales_by_wh?.[selectedWarehouseId!] || 0);
          }
          const coverage = getCoverageDays(specificStock, specificSales, salesPeriodDays);
          matchesCoverage = selectedCoverage.some(option => matchesCoverageOption(coverage ?? 999, option));
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
          // Activity filter: showAllProducts=true includes ALL, otherwise only has_activity!=false
          matchesActivity: showAllProducts || ((p as any).has_activity !== false),
          meta: { providerName, originName, bName, productSegment, pCat, tags, abcGlobal, abcStore }
        };
      }
    });
  }, [baseProcessedProducts, processedProducts, currentView, warehouses, selectedWarehouseId, transferSearchTerm, productSearchTerm, effectiveProductSearchTerm, selectedProvider, selectedOrigin, selectedTag, selectedCategory, selectedProductCategory, selectedCategoryStore, selectedCoverage, transferTargetWarehouse, transferCoverageFilter, showOnlyDeficient, showOnlyPending, showOnlyOutOfStock, showOnlyOutOfStockWithPending, selectedStatus, selectedProductType, selectedBrand, pendingDays, warehouseColumnFilter, salesPeriodDays, showAllProducts, selectedProductIds]);

  const matchesWarehouseGroupForProducts = useCallback((warehouse: any, group: WarehouseBaseGroup) => {
    return matchesWarehouseBaseGroup(warehouse, group);
  }, []);

  const getDefaultWarehouseIdForGroup = useCallback((group: WarehouseColumnFilter) => {
    if (isConsolidatedWarehouseColumnFilter(group)) return null;

    const effectiveGroup = getWarehouseBaseGroupFromColumnFilter(group);
    const preferredWarehouse = effectiveGroup === 'NUBA'
      ? warehouses.find(w => w.id !== null && w.name?.toUpperCase().includes('NUBA 21'))
      : effectiveGroup === 'ANDYS'
        ? warehouses.find(w => w.id !== null && w.name?.toUpperCase().includes('ANDYS SAN MIGUEL'))
        : warehouses.find(w => w.id !== null && matchesWarehouseGroupForProducts(w, effectiveGroup));

    if (preferredWarehouse?.id !== undefined) return preferredWarehouse.id;

    const fallbackWarehouse = warehouses.find(w => matchesWarehouseGroupForProducts(w, effectiveGroup) && w.id !== null);
    return fallbackWarehouse?.id ?? null;
  }, [warehouses, matchesWarehouseGroupForProducts]);

  const transferFilteredProducts = useMemo(() => {
    if (currentView !== 'transfers' && currentView !== 'ml') return [];
    // En modo consolidado (TOTAL_ANDYS / TOTAL_NUBA / TOTAL_ALL) con filtro de cobertura activo,
    // ignoramos m.matchesCoverage (se aplica post-filtro definitivo más abajo)
    const skipMatchesCoverage = transferCoverageFilter.length > 0 &&
      (warehouseColumnFilter === 'TOTAL_ANDYS' || warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ALL');
    const hasDraftSearch = transferSearchTerm !== '';
    let filtered = productMatchStates
      .filter(m => {
        const baseMatch = m.matchesProvider && m.matchesOrigin && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesStock && (skipMatchesCoverage || m.matchesCoverage) && (m as any).matchesActivity !== false;
        
        if (hasDraftSearch) {
          // Si hay búsqueda, mostrar fijados + resultados de búsqueda
          return (selectedProductIds.includes(Number(m.p.id)) || m.matchesSearch) && baseMatch;
        } else {
          // Si no hay búsqueda y hay fijados, mostrar solo fijados. Si no hay nada fijado, mostrar todo.
          if (selectedProductIds.length > 0) {
            return selectedProductIds.includes(Number(m.p.id)) && baseMatch;
          }
          return m.matchesSearch && baseMatch;
        }
      })
      .map(m => m.p);

    if (warehouseColumnFilter !== 'All' && warehouseColumnFilter !== 'TOTAL_ALL') {
      const group = getWarehouseBaseGroupFromColumnFilter(warehouseColumnFilter) as ScopedWarehouseBaseGroup;
      const groupMetrics = productMetricsByScopedGroup[group];
      filtered = filtered.filter(p => {
        const metrics = groupMetrics?.get(p.id);
        if (!metrics) return false;
        const totalGroupSales = salesPeriodDays === 90 ? metrics.sales90 : salesPeriodDays === 180 ? metrics.sales180 : metrics.sales30;
        return totalGroupSales > 0 || metrics.stock > 0;
      });
    }

    // Filtro de cobertura definitivo para TOTAL_ANDYS / TOTAL_NUBA / TOTAL_ALL: usa exactamente las mismas sucursales que muestra COV T
    if (transferCoverageFilter.length > 0 &&
      (warehouseColumnFilter === 'TOTAL_ANDYS' || warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ALL')) {
      const consolidatedWhs = getConsolidatedScopeWarehouses(warehouses, warehouseColumnFilter);
      filtered = filtered.filter((p: any) => {
        const totalStock = getConsolidatedStockForFilter(p, warehouses, warehouseColumnFilter);
        const totalSales = consolidatedWhs.reduce((s: number, w: any) => {
          const wid = String(w.id);
          return s + (salesPeriodDays === 90 ? (p.sales_by_wh_90d?.[wid] || 0) : salesPeriodDays === 180 ? (p.sales_by_wh_180d?.[wid] || 0) : (p.sales_by_wh?.[w.id] || 0));
        }, 0);
        const coverage = getCoverageDaysFromVisibleStock(totalStock, totalSales, salesPeriodDays);
        return transferCoverageFilter.some(option => matchesCoverageOption(coverage ?? 999, option));
      });
    }

    return filtered;
  }, [productMatchStates, currentView, warehouseColumnFilter, salesPeriodDays, transferCoverageFilter, productMetricsByScopedGroup, selectedProductIds]);

  const sortedTransferProducts = useMemo(() => {
    let products = [...transferFilteredProducts];
    return products.sort((a: any, b: any) => {
      // SIEMPRE fijados arriba
      const aPinned = selectedProductIds.includes(Number(a.id));
      const bPinned = selectedProductIds.includes(Number(b.id));
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (!transferSortBy) return 0;

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
          valA = getCoverageDaysFromVisibleStock(stockA, salesA, salesPeriodDays) ?? 999;

          const stockB = b.stock_by_wh?.[transferTargetWarehouse] || 0;
          const salesB = b.sales_by_wh?.[transferTargetWarehouse] || 0;
          valB = getCoverageDaysFromVisibleStock(stockB, salesB, salesPeriodDays) ?? 999;
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
          valA = getCoverageDaysFromVisibleStock(stockA, salesA, salesPeriodDays) ?? 999;

          const stockB = b.stock_by_wh?.[selectedWarehouseId] || 0;
          const salesB = b.sales_by_wh?.[selectedWarehouseId] || 0;
          valB = getCoverageDaysFromVisibleStock(stockB, salesB, salesPeriodDays) ?? 999;
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
  }, [transferFilteredProducts, transferSortBy, transferSortOrder, transferTargetWarehouse, selectedWarehouseId, transferQuantities, selectedProductIds]);

  const visibleWarehouses = useMemo(() => {
    if (warehouseColumnFilter === 'WAREHOME') {
      return buildWAREHOMEVirtualWarehouses(warehouses);
    }
    return warehouses.filter(w => {
      if (w.id === null || w.id === selectedWarehouseId) return false;
      if (!matchesWarehouseColumnScope(w, warehouseColumnFilter)) return false;

      const isStorage = isStorageWarehouse(w)

      // For the 4 new company buttons we preserve the exact CSV-defined warehouse list,
      // even if a branch still has no sales in the selected period.
      if (isStorage || isCompanyWarehouseColumnFilter(warehouseColumnFilter)) {
        return !hiddenColumnWarehouseIds.has(w.id!);
      }

      // Use ALL products (not filtered) so columns stay stable regardless of search/filters
      const warehouseSales = products.reduce((total, product) => {
        const wid = String(w.id);
        const sales = salesPeriodDays === 90 ? ((product as any).sales_by_wh_90d?.[wid] || 0)
          : salesPeriodDays === 180 ? ((product as any).sales_by_wh_180d?.[wid] || 0)
          : ((product as any).sales_by_wh?.[w.id] || 0);
        return total + sales;
      }, 0);

      if (!warehouseSales) return false;
      return !hiddenColumnWarehouseIds.has(w.id!);
    }).sort((a, b) => {
      // Custom sort: ALMACEN CENTRAL first, then ALMACEN VELARDE SCZ, then ALMACEN PISO 3, then alphabetically
      const nameA = a.name.toUpperCase();
      const nameB = b.name.toUpperCase();

      const isCentralA = nameA === 'ALMACEN CENTRAL';
      const isCentralB = nameB === 'ALMACEN CENTRAL';
      const isVelardeA = nameA === 'ALMACEN VELARDE SCZ';
      const isVelardeB = nameB === 'ALMACEN VELARDE SCZ';
      const isPiso3A = nameA.includes('ALMACEN PISO 3');
      const isPiso3B = nameB.includes('ALMACEN PISO 3');

      if (isCentralA) return -1;
      if (isCentralB) return 1;
      if (isVelardeA) return -1;
      if (isVelardeB) return 1;
      if (isPiso3A) return -1;
      if (isPiso3B) return 1;

      return nameA.localeCompare(nameB);
    });
  }, [warehouses, selectedWarehouseId, warehouseColumnFilter, products, salesPeriodDays, hiddenColumnWarehouseIds]);


  const filteredPurchaseOrders = useMemo(() => {
    let result = purchaseOrders;
    if (purchasesFilterState !== 'all') {
      result = result.filter((l: any) => l.state_raw === purchasesFilterState);
    }
    if (purchasesSearch.trim()) {
      const q = purchasesSearch.toLowerCase().trim();
      result = result.filter((l: any) =>
        l.order_ref?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        l.supplier?.toLowerCase().includes(q) ||
        l.barcode?.toLowerCase().includes(q) ||
        l.buyer?.toLowerCase().includes(q)
      );
    }
    if (purchasesDateFrom) {
      result = result.filter((l: any) => {
        const d = (l.date_order || '').slice(0, 10);
        return d >= purchasesDateFrom;
      });
    }
    if (purchasesDateTo) {
      result = result.filter((l: any) => {
        const d = (l.date_order || '').slice(0, 10);
        return d <= purchasesDateTo;
      });
    }
    return [...result].sort((a: any, b: any) => {
      const av = a[purchasesSortKey] ?? '';
      const bv = b[purchasesSortKey] ?? '';
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return purchasesSortDir === 'asc' ? cmp : -cmp;
    });
  }, [purchaseOrders, purchasesFilterState, purchasesSearch, purchasesDateFrom, purchasesDateTo, purchasesSortKey, purchasesSortDir]);


  const paAvailableWarehouses = useMemo(() => {
    const base = purchaseOrders as any[];
    const poWhs = base.map((l: any) => l.entregar_a).filter(Boolean) as string[];
    const globalWhs = warehouses.map((w: any) => w.name).filter(Boolean) as string[];

    const raw = [...new Set([...poWhs, ...globalWhs])];
    return raw
      .filter(wh => wh && wh.toUpperCase() !== 'VISTA GLOBAL' && wh.toUpperCase() !== 'DESTINO' && wh.toUpperCase() !== 'ORIGEN')
      .filter(wh => !wh.toUpperCase().includes('CIERRE CONSIGNACION') && !wh.toUpperCase().includes('VIRTUAL') && !wh.toUpperCase().includes('PARTNER'))
      .filter((wh) => {
        const upper = wh.toUpperCase();
        return upper.includes('ALMACEN') || upper.includes('NUBA') || upper.includes('ANDY') || upper.includes('YAM') || upper.includes('EXPANDIA');
      })
      .map(wh => wh.replace(/:\s*Recepciones$/i, '').trim())
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort();
  }, [purchaseOrders, warehouses]);
  
  const paAvailableSuppliers  = useMemo(() => {
    const base = purchaseOrders as any[];
    return [...new Set(base.map((l: any) => l.supplier).filter(Boolean))].sort() as string[];
  }, [purchaseOrders]);

  const paAvailableCategories = useMemo(() => {
    return [...new Set(
      processedProducts
        .map((p: any) => (p.category_name || '').replace(/^All products \/ /, '').trim())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'es'));
  }, [processedProducts]);

  const baseSelectableProducts = useMemo(() => {
    if (currentView !== 'products') return [];
    return productMatchStates
      .filter(m => m.matchesProvider && m.matchesOrigin && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesDeficient && m.matchesPending && m.matchesOutOfStock && m.matchesOutOfStockWithPending && m.matchesStatus && m.matchesType && m.matchesBrand && m.matchesAge && m.matchesCoverage && (m as any).matchesActivity !== false)
      .map(m => m.p);
  }, [productMatchStates, currentView]);

  const searchMatchedProducts = useMemo(() => {
    if (currentView !== 'products') return [];
    return productMatchStates
      .filter(m => m.matchesSearch && m.matchesProvider && m.matchesOrigin && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesDeficient && m.matchesPending && m.matchesOutOfStock && m.matchesOutOfStockWithPending && m.matchesStatus && m.matchesType && m.matchesBrand && m.matchesAge && m.matchesCoverage && (m as any).matchesActivity !== false)
      .map(m => m.p);
  }, [productMatchStates, currentView]);

  const filteredProducts = useMemo(() => {
    if (currentView !== 'products') return [];
    const hasDraftSearch = effectiveProductSearchTerm !== ''
    let result = selectedProductIds.length > 0
      ? (hasDraftSearch
        ? [...searchMatchedProducts]
        : baseSelectableProducts.filter((product) => selectedProductIds.includes(product.id)))
      : [...searchMatchedProducts];

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
  }, [baseSelectableProducts, searchMatchedProducts, currentView, sortBy, sortOrder, selectedWarehouseId, selectedProductIds, effectiveProductSearchTerm]);

  const selectedProducts = useMemo(() => {
    if (selectedProductIds.length === 0) return []
    return selectedProductIds
      .map((id) => products.find((product) => product.id === id))
      .filter((product): product is Product => Boolean(product))
  }, [selectedProductIds, products])

  const handlePinProduct = useCallback((product: Product) => {
    const id = Number(product.id);
    setSelectedProductIds((prev) => {
      const isPinned = prev.includes(id);
      const next = isPinned ? prev.filter((p) => p !== id) : [...prev, id];
      saveMultiFilter('stock_filter_selected_products', next);
      return next;
    });
    setProductSearchTerm('')
    setTransferSearchTerm('')
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedProductIds([]);
    saveMultiFilter('stock_filter_selected_products', []);
    setProductSearchTerm('')
    setTransferSearchTerm('')
  }, []);

  const handleRemoveSelectedProduct = useCallback((productId: number) => {
    setSelectedProductIds((prev) => {
      const next = prev.filter((id) => id !== productId);
      saveMultiFilter('stock_filter_selected_products', next);
      return next;
    });
  }, [])

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

  // Pre-computed set of product IDs eligible for the current warehouse group filter.
  // Used by dynamic filter count memos so their counts respect the active company/group view.
  const groupEligibleProductIds = useMemo((): Set<number> | null => {
    const isTransferView = currentView === 'transfers' || currentView === 'ml';
    if (!isTransferView || warehouseColumnFilter === 'All' || warehouseColumnFilter === 'TOTAL_ALL') return null;
    const group = getWarehouseBaseGroupFromColumnFilter(warehouseColumnFilter) as ScopedWarehouseBaseGroup;
    const groupMetrics = productMetricsByScopedGroup[group];
    const ids = new Set<number>();
    products.forEach((product: any) => {
      const metrics = groupMetrics?.get(product.id);
      const groupSales = salesPeriodDays === 90 ? (metrics?.sales90 || 0) : salesPeriodDays === 180 ? (metrics?.sales180 || 0) : (metrics?.sales30 || 0);
      if (groupSales > 0) ids.add(product.id);
    });
    return ids;
  }, [currentView, warehouseColumnFilter, products, salesPeriodDays, productMetricsByScopedGroup]);

  const productCategories = useMemo(() => {
    const counts: Record<string, number> = {}
    productMatchStates.forEach(m => {
      const matchesOthers = (currentView === 'transfers' || currentView === 'ml')
        ? (m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesCategory && m.matchesCategoryStore && m.matchesStock && (groupEligibleProductIds === null || groupEligibleProductIds.has(m.p.id)))
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

  }, [products, productMatchStates, currentView, groupEligibleProductIds, transferFilteredProducts.length, filteredProducts.length])

  const providers = useMemo(() => {
    const counts: Record<string, number> = {}
    productMatchStates.forEach(m => {
      const matchesOthers = (currentView === 'transfers' || currentView === 'ml')
        ? (m.matchesSearch && m.matchesOrigin && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesStock && (groupEligibleProductIds === null || groupEligibleProductIds.has(m.p.id)))
        : (m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesDeficient && m.matchesPending && m.matchesOutOfStock && m.matchesOutOfStockWithPending && m.matchesStatus && m.matchesType && m.matchesBrand && m.matchesAge);

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

  }, [products, productMatchStates, currentView, groupEligibleProductIds, transferFilteredProducts.length, filteredProducts.length, selectedOrigin])

  const origins = useMemo(() => {
    const counts: Record<string, number> = {}
    productMatchStates.forEach(m => {
      const matchesOthers = (currentView === 'transfers' || currentView === 'ml')
        ? (m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesStock && (groupEligibleProductIds === null || groupEligibleProductIds.has(m.p.id)))
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

  }, [products, productMatchStates, currentView, groupEligibleProductIds, transferFilteredProducts.length, filteredProducts.length, selectedProvider])

  const productTags = useMemo(() => {
    const counts: Record<string, number> = {}
    productMatchStates.forEach(m => {
      const matchesOthers = (currentView === 'transfers' || currentView === 'ml')
        ? (m.matchesSearch && m.matchesProvider && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesStock && (m as any).matchesCoverage && (groupEligibleProductIds === null || groupEligibleProductIds.has(m.p.id)))
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
  }, [products, productMatchStates, currentView, groupEligibleProductIds, transferFilteredProducts.length, filteredProducts.length])

  const coverageOptions = useMemo(() => {
    const counts = COVERAGE_FILTER_OPTIONS.reduce((acc, option) => {
      acc[option] = 0;
      return acc;
    }, {} as Record<CoverageFilterOption, number>);

    const isTransferView = currentView === 'transfers' || currentView === 'ml';
    const isConsolidatedGroup = isTransferView && (warehouseColumnFilter === 'TOTAL_ANDYS' || warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ALL');

    if (isConsolidatedGroup) {
      // Use the exact same pipeline as transferFilteredProducts (without the coverage post-filter)
      // so that option counts match the actual number of products that would be shown.
      const consolidatedWhs = getConsolidatedScopeWarehouses(warehouses, warehouseColumnFilter);

      productMatchStates
        .filter(m => m.matchesSearch && m.matchesProvider && m.matchesOrigin && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesStock)
        .map(m => m.p)
        .filter((p: any) => {
          const totalGroupSales = consolidatedWhs.reduce((sum: number, w: any) => {
            const wid = String(w.id);
            return sum + (salesPeriodDays === 90 ? (p.sales_by_wh_90d?.[wid] || 0) : salesPeriodDays === 180 ? (p.sales_by_wh_180d?.[wid] || 0) : (p.sales_by_wh?.[w.id] || 0));
          }, 0);
          return totalGroupSales > 0;
        })
        .forEach((p: any) => {
          const totalStock = getConsolidatedStockForFilter(p, warehouses, warehouseColumnFilter);
          const totalSales = consolidatedWhs.reduce((s: number, w: any) => {
            const wid = String(w.id);
            return s + (salesPeriodDays === 90 ? (p.sales_by_wh_90d?.[wid] || 0) : salesPeriodDays === 180 ? (p.sales_by_wh_180d?.[wid] || 0) : (p.sales_by_wh?.[w.id] || 0));
          }, 0);
          const coverage = getCoverageDaysFromVisibleStock(totalStock, totalSales, salesPeriodDays) ?? 999;
          COVERAGE_FILTER_OPTIONS.forEach(option => {
            if (matchesCoverageOption(coverage, option)) counts[option]++;
          });
        });
    } else {
      productMatchStates.forEach(m => {
        const matchesOthers = isTransferView
          ? (m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesStock && (groupEligibleProductIds === null || groupEligibleProductIds.has(m.p.id)))
          : (m.matchesSearch && m.matchesProvider && m.matchesOrigin && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesCategoryStore && m.matchesDeficient && m.matchesPending && m.matchesOutOfStock && m.matchesOutOfStockWithPending && m.matchesStatus && m.matchesType && m.matchesBrand && m.matchesAge);

        if (matchesOthers) {
          const p = m.p;
          let stock: number;
          let sales: number;
          if (selectedWarehouseId === null) {
            stock = (p as any).total_stock;
            sales = salesPeriodDays === 90 ? ((p as any).sales_90d || 0) : salesPeriodDays === 180 ? ((p as any).sales_180d || 0) : ((p as any).sales_30d || 0);
          } else {
            const wid = String(selectedWarehouseId);
            stock = (p as any).stock_by_wh?.[selectedWarehouseId!] || 0;
            sales = salesPeriodDays === 90 ? ((p as any).sales_by_wh_90d?.[wid] || 0) : salesPeriodDays === 180 ? ((p as any).sales_by_wh_180d?.[wid] || 0) : ((p as any).sales_by_wh?.[selectedWarehouseId!] || 0);
          }
          const coverage = getCoverageDays(stock, sales, salesPeriodDays) ?? 999;

          COVERAGE_FILTER_OPTIONS.forEach(option => {
            if (matchesCoverageOption(coverage, option)) counts[option]++;
          });
        }
      });
    }

    return [
      { name: 'All', count: (currentView === 'transfers' || currentView === 'ml') ? transferFilteredProducts.length : filteredProducts.length },
      ...COVERAGE_FILTER_OPTIONS.map(option => ({ name: option, count: counts[option] }))
    ];
  }, [productMatchStates, currentView, selectedWarehouseId, warehouseColumnFilter, warehouses, salesPeriodDays, groupEligibleProductIds, matchesWarehouseGroupForProducts, transferFilteredProducts.length, filteredProducts.length]);

  const coverageFilterChoices = useMemo(() =>
    coverageOptions.filter((option): option is { name: CoverageFilterOption, count: number } => option.name !== 'All')
    , [coverageOptions]);

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
        ? (m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesProductCategory && m.matchesCategoryStore && m.matchesStock && (groupEligibleProductIds === null || groupEligibleProductIds.has(m.p.id)))
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
  }, [productMatchStates, currentView, groupEligibleProductIds, transferFilteredProducts.length, filteredProducts.length]);

  const abcStoreCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    productMatchStates.forEach(m => {
      // Para que sean complementarios, incluimos matchesCoverage en la validación de otros filtros
      const matchesOthers = (currentView === 'transfers' || currentView === 'ml')
        ? (m.matchesSearch && m.matchesProvider && m.matchesTag && m.matchesCategory && m.matchesProductCategory && m.matchesStock && (m as any).matchesCoverage && (groupEligibleProductIds === null || groupEligibleProductIds.has(m.p.id)))
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
  }, [productMatchStates, currentView, groupEligibleProductIds, transferFilteredProducts.length, filteredProducts.length]);

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
    setSelectedProductIds([]);
    setSelectedProvider([]);
    setSelectedOrigin([]);
    setSelectedCategory([]);
    setSelectedTag([]);
    setSelectedProductCategory([]);
    setSelectedCategoryStore([]);
    setSelectedStatus('All');
    setSelectedProductType('All');
    setSelectedBrand('All');
    setSelectedCoverage([]);

    // Transfers view filters
    setTransferSearchTerm('');
    setTransferCoverageFilter([]);

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
    localStorage.removeItem('stock_filter_selected_products');
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
    // NOTE: showAllProducts is intentionally NOT reset by clear filters —
    // it's a persistent display preference, not a data filter.
  };



  const handleWarehouseGroupFilterChange = useCallback((group: WarehouseBaseGroup) => {
    if (!allowedWarehouseBaseGroups.includes(group)) return;

    const defaultWarehouseId = getDefaultWarehouseIdForGroup(group);
    startTransition(() => {
      setWarehouseGroupFilter(group);
      if (defaultWarehouseId !== null) {
        setSelectedWarehouseId(defaultWarehouseId);
      }
    });
  }, [allowedWarehouseBaseGroups, getDefaultWarehouseIdForGroup]);

  const getAvailableWarehouseCountForFilter = useCallback((filter: WarehouseColumnFilter) => {
    return warehouses.filter((warehouse) => matchesWarehouseColumnScope(warehouse, filter)).length;
  }, [warehouses]);

  const companyWarehouseAvailability = useMemo(() => ({
    EXPANDIA: getAvailableWarehouseCountForFilter('EXPANDIA'),
    ATI: getAvailableWarehouseCountForFilter('ATI'),
    WAREHOME: getAvailableWarehouseCountForFilter('WAREHOME'),
    COQUETA: getAvailableWarehouseCountForFilter('COQUETA'),
  }), [getAvailableWarehouseCountForFilter]);

  const handleWarehouseColumnFilterChange = useCallback((group: WarehouseColumnFilter) => {
    if (!allowedWarehouseColumnFilters.includes(group)) return;

    if (isCompanyWarehouseColumnFilter(group) && getAvailableWarehouseCountForFilter(group) === 0) {
      alert(`No hay sucursales cargadas para ${group} en la sincronizacion actual.`);
      return;
    }

    const defaultWarehouseId = getDefaultWarehouseIdForGroup(group);
    const newGroupFilter = getWarehouseBaseGroupFromColumnFilter(group);
    setHiddenColumnWarehouseIds(new Set()); // reset column selection on group change
    startTransition(() => {
      setWarehouseColumnFilter(group);
      setWarehouseGroupFilter(newGroupFilter);
      if (defaultWarehouseId !== null || isConsolidatedWarehouseColumnFilter(group)) {
        setSelectedWarehouseId(defaultWarehouseId);
      }
    });
  }, [allowedWarehouseColumnFilters, getDefaultWarehouseIdForGroup, getAvailableWarehouseCountForFilter]);

  useEffect(() => {
    if (currentView !== 'products') {
      initialWarehouseGroupDefaultAppliedRef.current = false
    }
  }, [currentView])

  useEffect(() => {
    if (currentView !== 'products' || warehouses.length === 0 || initialWarehouseGroupDefaultAppliedRef.current) return

    const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId)
    if (!selectedWarehouse || !matchesWarehouseGroupForProducts(selectedWarehouse, warehouseGroupFilter)) {
      const defaultWarehouseId = getDefaultWarehouseIdForGroup(warehouseGroupFilter)
      if (defaultWarehouseId !== null) {
        setSelectedWarehouseId(defaultWarehouseId)
      }
    }

    initialWarehouseGroupDefaultAppliedRef.current = true
  }, [currentView, warehouses, selectedWarehouseId, warehouseGroupFilter, getDefaultWarehouseIdForGroup, matchesWarehouseGroupForProducts])

  useEffect(() => {
    if (!isAuthenticated) return

    const defaultColumnFilter = getDefaultWarehouseColumnFilterForAccess(userProfile.warehouseAccess)
    const defaultGroupFilter = getWarehouseBaseGroupFromColumnFilter(defaultColumnFilter)

    if (!allowedWarehouseColumnFilters.includes(warehouseColumnFilter)) {
      const defaultWarehouseId = getDefaultWarehouseIdForGroup(defaultColumnFilter)
      setHiddenColumnWarehouseIds(new Set())
      startTransition(() => {
        setWarehouseColumnFilter(defaultColumnFilter)
        setWarehouseGroupFilter(defaultGroupFilter)
        setSelectedWarehouseId(defaultWarehouseId)
      })
      return
    }

    if (!allowedWarehouseBaseGroups.includes(warehouseGroupFilter)) {
      setWarehouseGroupFilter(defaultGroupFilter)
    }
  }, [
    isAuthenticated,
    userProfile.warehouseAccess,
    allowedWarehouseColumnFilters,
    allowedWarehouseBaseGroups,
    warehouseColumnFilter,
    warehouseGroupFilter,
    getDefaultWarehouseIdForGroup
  ])

  const handleWhSelect = (id: number | null) => {
    setShowWhDropdown(false)
    startTransition(() => {
      setSelectedWarehouseId(id)
    })
  }

  // Handlers
  const handleLogin = (_token: string, user: string, warehouseAccess?: string) => {
    setIsAuthenticated(true)
    setUserProfile(prev => ({
      ...prev,
      username: user,
      warehouseAccess: normalizeWarehouseAccess(warehouseAccess)
    }))
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
    return <div translate="no" className="notranslate min-h-screen bg-slate-950 flex items-center justify-center">
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

  const selectedWarehouseName = warehouses.find(w => w.id === selectedWarehouseId)?.name || ''
  const isTransferConsolidatedView = warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ANDYS' || warehouseColumnFilter === 'TOTAL_ALL'
  const isSelectedWarehouseSimple = isSimpleWarehouseName(selectedWarehouseName)
  const currentBranchStickyOffsets = getTransferCurrentBranchExtraStickyOffsets({
    showExtraSales,
    showExtraCoverage,
    showExtraABC,
    showMinMax,
    showCost,
    showSalePrice,
    showMargin,
    showListPrice,
    showPrevListPrice,
    showPriceHistory,
    showMLColumns: currentView === 'ml' && showMLColumns,
  })
  const currentBranchConsolidatedStickyOffsets = getTransferConsolidatedStickyOffsets({
    showExtraSales,
    showExtraCoverage,
    showExtraABC,
    showMinMax,
    showCost,
    showSalePrice,
    showMargin,
    showListPrice,
    showPrevListPrice,
    showPriceHistory,
    showMLColumns: currentView === 'ml' && showMLColumns,
  })


  return (
    <div translate="no" className={`notranslate flex flex-col h-screen overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200 ${darkMode ? 'bg-slate-950 text-slate-200' : 'light-mode bg-slate-100 text-slate-800'}`} style={{ zoom: '90%', height: '111.11vh' }}>

      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-colors duration-300 ${darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
        <div className="w-full mx-auto px-4 md:px-6 py-2 md:py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">

            {/* Logo Area */}
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setCurrentView('products'); setSelectedWarehouseId(null); setWarehouseColumnFilter('All'); }}>
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

              <AnimatePresence mode="wait">
                {showWhDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full mt-2 left-0 w-[320px] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl z-20 py-2 max-h-[60vh] overflow-y-auto custom-scrollbar"
                  >
                    {/* Filter Buttons */}
                    {!(isConsolidatedWarehouseColumnFilter(warehouseColumnFilter) || isCompanyWarehouseColumnFilter(warehouseColumnFilter)) && (
                      <div className="px-3 py-2 border-b border-slate-800/50 mb-2">
                        <div className="flex items-center gap-2">
                          {warehouseColumnFilter !== 'NUBA' && warehouseColumnFilter !== 'ANDYS' && allowedWarehouseBaseGroups.includes('All') && (
                          <button
                            onClick={() => handleWarehouseGroupFilterChange('All')}
                            className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${warehouseGroupFilter === 'All'
                              ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                              }`}
                          >
                            Todas
                          </button>
                          )}
                          {warehouseColumnFilter !== 'ANDYS' && allowedWarehouseBaseGroups.includes('NUBA') && (
                          <button
                            onClick={() => handleWarehouseGroupFilterChange('NUBA')}
                            className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${warehouseGroupFilter === 'NUBA'
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                              }`}
                          >
                            NUBA
                          </button>
                          )}
                          {warehouseColumnFilter !== 'NUBA' && allowedWarehouseBaseGroups.includes('ANDYS') && (
                          <button
                            onClick={() => handleWarehouseGroupFilterChange('ANDYS')}
                            className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${warehouseGroupFilter === 'ANDYS'
                              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                              }`}
                          >
                            ANDYS/YY
                          </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Select All / None quick buttons for specific company/group modes */}
                    {(!isConsolidatedWarehouseColumnFilter(warehouseColumnFilter) && warehouseColumnFilter !== 'All') && (() => {
                      const groupWhs = warehouses.filter(wh => {
                        return matchesWarehouseColumnScope(wh, warehouseColumnFilter);
                      });
                      const allVisible = groupWhs.every(w => !hiddenColumnWarehouseIds.has(w.id!));
                      return (
                        <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-800/50 mb-1">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Columnas en tabla</span>
                          <button
                            onClick={() => { const next = allVisible ? new Set(groupWhs.map(w => w.id!)) : new Set<number>(); startTransition(() => setHiddenColumnWarehouseIds(next)); }}
                            className="text-[9px] font-black uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            {allVisible ? 'Ocultar todas' : 'Mostrar todas'}
                          </button>
                        </div>
                      );
                    })()}

                    {warehouses.filter(wh => {
                      if (isConsolidatedWarehouseColumnFilter(warehouseColumnFilter)) {
                        return wh.id === null;
                      }

                      // In products view, show all warehouses
                      if (currentView === 'products') {
                        // Apply warehouse group filter
                        if (warehouseGroupFilter !== 'All') {
                          if (wh.id === null) return false; // Exclude Global
                          return matchesWarehouseGroupForProducts(wh, warehouseGroupFilter);
                        }
                        return true; // Show all including Global
                      }

                      // In transfers view, filter to allowed warehouses
                      if (wh.id === null) return false; // No Global in transfers

                      // When a specific group is selected, show all warehouses of that scope.
                      if (warehouseGroupFilter !== 'All') {
                        return matchesWarehouseColumnScope(wh, warehouseGroupFilter);
                      }

                      // Keep Sopocachi hidden in "All" view
                      if (isSopocachiWarehouse(wh)) return false;

                      // When "All" is selected, apply sales check to avoid showing irrelevant warehouses
                      if (!isCentralWarehouse(wh) && !isPiso3Warehouse(wh)) {
                        const warehouseSales = transferFilteredProducts.reduce((total, product) => {
                          const sales = (product as any).sales_by_wh?.[wh.id] || 0;
                          return total + sales;
                        }, 0);
                        if (warehouseSales <= 0) return false;
                      }

                      // When "All" is selected
                      return matchesWarehouseColumnScope(wh, 'All');

                    }).map(wh => {
                      const isColumnMode = !isConsolidatedWarehouseColumnFilter(warehouseColumnFilter) && warehouseColumnFilter !== 'All';
                      const isHidden = wh.id !== null && hiddenColumnWarehouseIds.has(wh.id);
                      const isSelected = selectedWarehouseId === wh.id;
                      return (
                        <div
                          key={wh.id}
                          className={`w-full text-left px-3 py-2.5 text-xs font-bold transition-colors flex items-center gap-2
                             ${isSelected ? 'bg-indigo-500/10 text-indigo-400' : isHidden ? 'opacity-40 text-slate-600' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                            `}
                        >
                          {/* Checkbox para visibilidad de columna */}
                          {isColumnMode && wh.id !== null && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const id = wh.id!;
                                startTransition(() => {
                                  setHiddenColumnWarehouseIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(id)) next.delete(id);
                                    else next.add(id);
                                    return next;
                                  });
                                });
                              }}
                              className={`flex-shrink-0 w-4 h-4 rounded border transition-colors ${isHidden ? 'border-slate-600 bg-transparent' : 'border-indigo-500 bg-indigo-500/80'}`}
                              title={isHidden ? 'Mostrar columna' : 'Ocultar columna'}
                            >
                              {!isHidden && <span className="flex items-center justify-center text-white text-[10px] leading-none font-black">✓</span>}
                            </button>
                          )}
                          {/* Nombre — click para seleccionar como SUCURSAL ACTUAL */}
                          <button
                            onClick={() => handleWhSelect(wh.id)}
                            className="flex-1 text-left flex items-center gap-2"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-indigo-500' : 'bg-slate-700'}`}></span>
                            {wh.name}
                          </button>
                          {wh.id === null ? <Globe size={14} className="opacity-50 flex-shrink-0" /> : <Box size={14} className="opacity-50 flex-shrink-0" />}
                        </div>
                      );
                    })}

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Search Bar */}


            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowProfileModal(true)}
                className={`flex items-center gap-2 border p-2 rounded-2xl transition-all group ${darkMode ? 'bg-slate-900 border-slate-700 hover:border-indigo-500/50' : 'bg-white border-slate-300 hover:border-indigo-400/60 shadow-sm'}`}
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
                  <span className={`block text-[7px] font-black uppercase tracking-[0.2em] leading-none mb-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Sesión de</span>
                  <span className={`block text-xs font-black uppercase tracking-tight leading-none ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    {userProfile.username || localStorage.getItem('stock_user') || 'Usuario'}
                  </span>
                </div>
              </button>

              {/* Dark/Light Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`relative p-2.5 rounded-2xl border transition-all duration-300 group active:scale-95 flex items-center justify-center ${
                  darkMode
                    ? 'bg-slate-900 border-slate-700 hover:border-amber-400/50 hover:bg-amber-400/10 text-slate-400 hover:text-amber-400'
                    : 'bg-white border-slate-200 hover:border-indigo-400/60 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 shadow-sm'
                }`}
                style={{ minWidth: '44px', minHeight: '44px' }}
                title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <Sun
                    size={20}
                    className={`absolute transition-all duration-500 transform ${
                      darkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'
                    }`}
                  />
                  <Moon
                    size={20}
                    className={`absolute transition-all duration-500 transform ${
                      darkMode ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                    }`}
                  />
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

                <AnimatePresence mode="wait">
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
                            setTransferTargetWarehouse(null);
                            // Entrar siempre en TODAS + VISTA GLOBAL
                            setWarehouseColumnFilter('TOTAL_ALL');
                            setSelectedWarehouseId(null);
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
                            setTransferTargetWarehouse(null);
                            // Entrar siempre en TODAS + VISTA GLOBAL
                            setWarehouseColumnFilter('TOTAL_ALL');
                            setSelectedWarehouseId(null);
                          }}
                          className="w-full text-left px-4 py-3 text-xs font-bold transition-colors text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-400 flex items-center gap-3"
                        >
                          <BrainCircuit size={16} />
                          <span>Machine Learning</span>
                        </button>

                        <button
                          onClick={() => {
                            setCurrentView('purchases');
                            setShowActionsDropdown(false);
                            if (!purchasesLoaded) fetchPurchaseOrders();
                          }}
                          className="w-full text-left px-4 py-3 text-xs font-bold transition-colors text-slate-300 hover:bg-amber-500/10 hover:text-amber-400 flex items-center gap-3"
                        >
                          <ShoppingCart size={16} />
                          <span>Compras</span>
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

                        {(currentView === 'transfers' || currentView === 'ml') && (
                          <button
                            onClick={handleDownloadExcel}
                            className="w-full text-left px-4 py-3 text-xs font-bold transition-colors text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 flex items-center gap-3 border-t border-slate-800"
                          >
                            <FileSpreadsheet size={16} />
                            <span>Exportar Excel</span>
                          </button>
                        )}

                        {currentView === 'purchases' && (
                          <button
                            onClick={handleDownloadPurchasesExcel}
                            className="w-full text-left px-4 py-3 text-xs font-bold transition-colors text-slate-300 hover:bg-amber-500/10 hover:text-amber-400 flex items-center gap-3 border-t border-slate-800"
                          >
                            <FileSpreadsheet size={16} />
                            <span>Exportar Excel</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setShowActionsDropdown(false);
                            if (!purchasesLoaded) fetchPurchaseOrders();
                            setShowPurchaseAnalysisModal(true);
                          }}
                          className="w-full text-left px-4 py-3 text-xs font-bold transition-colors text-slate-300 hover:bg-sky-500/10 hover:text-sky-400 flex items-center gap-3 border-t border-slate-800"
                        >
                          <BarChart3 size={16} />
                          <span>Análisis Compras</span>
                        </button>

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
        <main className="w-full mx-auto px-4 md:px-6 py-4 md:py-8 flex flex-col gap-6 md:gap-8 flex-1 min-h-0">

          {/* Filter Bar */}
          <section className="bg-slate-900/40 border border-slate-800 p-1.5 rounded-3xl relative z-40 flex-none">
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
                    {lastUpdate ? (() => { const d = new Date(lastUpdate); const pad = (n: number) => String(n).padStart(2,'0'); return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; })() : '--:--'}
                  </span>
                </div>

                {nextSync && !loading && !isSyncing && (
                  <div className="flex flex-col border-l border-slate-700/50 pl-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">Próxima Sincro</span>
                    <span className={cn(
                      "text-[10px] font-mono font-bold leading-none",
                      (() => {
                        const now = new Date();
                        const parseLocalISO = (s: string) => {
                          const [datePart, timePart] = s.split('T');
                          const [y, mo, d] = datePart.split('-').map(Number);
                          const [h, mi, sec] = (timePart || '00:00:00').split(':').map(Number);
                          return new Date(y, mo - 1, d, h, mi, Math.floor(sec || 0));
                        };
                        const next = parseLocalISO(nextSync);
                        return next.getTime() - now.getTime() <= 0 ? "text-slate-400" : "text-slate-400"
                      })()
                    )}>
                      {(() => {
                        const now = new Date();
                        // El backend genera timestamps sin zona horaria (hora local del servidor).
                        // JS los interpreta como UTC por defecto, lo que causa un error de 4h.
                        // Parseamos manualmente como hora local para evitar el desfase.
                        const parseLocalISO = (s: string) => {
                          const [datePart, timePart] = s.split('T');
                          const [y, mo, d] = datePart.split('-').map(Number);
                          const [h, mi, sec] = (timePart || '00:00:00').split(':').map(Number);
                          return new Date(y, mo - 1, d, h, mi, Math.floor(sec || 0));
                        };
                        const next = parseLocalISO(nextSync);
                        const diffMs = next.getTime() - now.getTime();
                        const diffMin = Math.max(0, Math.ceil(diffMs / 60000));
                        return diffMin <= 0 ? "Próxima sincro..." : `En ${diffMin} min`;
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

                <MultiFilterDropdown
                  label="Categoría"
                  icon={ListFilter}
                  values={selectedProductCategory}
                  allCount={productCategories.find(c => c.name === 'All')?.count || 0}
                  options={productCategories.filter(c => c.name !== 'All')}
                  onChange={setSelectedProductCategory}
                  isOpen={activeDropdown === 'category'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'category' ? 'none' : 'category')}
                  variant="orange"
                />

                <MultiFilterDropdown
                  label="Proveedor"
                  icon={Users}
                  values={selectedProvider}
                  allCount={providers.find(p => p.name === 'All')?.count || 0}
                  options={providers.filter(p => p.name !== 'All')}
                  onChange={setSelectedProvider}
                  isOpen={activeDropdown === 'provider'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'provider' ? 'none' : 'provider')}
                  variant="emerald"
                />

                <MultiFilterDropdown
                  label="Origen"
                  icon={Globe}
                  values={selectedOrigin}
                  allCount={origins.find(o => o.name === 'All')?.count || 0}
                  options={origins.filter(o => o.name !== 'All')}
                  onChange={setSelectedOrigin}
                  isOpen={activeDropdown === 'origin'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'origin' ? 'none' : 'origin')}
                  variant="emerald"
                />

                <MultiFilterDropdown
                  label="Análisis ABC"
                  icon={BarChart3}
                  values={selectedCategory}
                  allCount={abcCategories.find(a => a.name === 'All')?.count || 0}
                  options={abcCategories.filter(a => a.name !== 'All')}
                  onChange={setSelectedCategory}
                  isOpen={activeDropdown === 'abc'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'abc' ? 'none' : 'abc')}
                  variant="indigo"
                />

                <MultiFilterDropdown
                  label="Etiqueta"
                  icon={Archive}
                  values={selectedTag}
                  allCount={productTags.find(t => t.name === 'All')?.count || 0}
                  options={productTags.filter(t => t.name !== 'All')}
                  onChange={setSelectedTag}
                  isOpen={activeDropdown === 'tag'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'tag' ? 'none' : 'tag')}
                  variant="amber"
                />

                {selectedWarehouseId && (
                  <MultiFilterDropdown
                    label="ABC Sucursal"
                    icon={Store}
                    values={selectedCategoryStore}
                    allCount={abcStoreCategories.find(a => a.name === 'All')?.count || 0}
                    options={abcStoreCategories.filter(a => a.name !== 'All')}
                    onChange={setSelectedCategoryStore}
                    isOpen={activeDropdown === 'abc_store'}
                    onToggle={() => setActiveDropdown(activeDropdown === 'abc_store' ? 'none' : 'abc_store')}
                    variant="amber"
                  />
                )}

                <MultiFilterDropdown
                  label="Cobertura"
                  icon={Clock}
                  values={selectedCoverage}
                  allCount={coverageOptions.find(o => o.name === 'All')?.count || 0}
                  options={coverageFilterChoices}
                  onChange={(values) => setSelectedCoverage(values as CoverageFilterOption[])}
                  isOpen={activeDropdown === 'coverage'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'coverage' ? 'none' : 'coverage')}
                  variant="cyan"
                />

                {/* Search Bar - Moved Here */}
                <DebouncedSearchInput
                  value={productSearchTerm}
                  onChange={setProductSearchTerm}
                  placeholder={selectedProductIds.length > 0 ? "Buscar otro producto para agregar..." : "Buscar producto..."}
                  icon={Search}
                  focusColor="group-focus-within:text-indigo-400"
                  className="w-full bg-slate-900/50 border border-slate-700/50 text-white pl-10 pr-4 py-2.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-bold text-xs placeholder:text-slate-600"
                >
                  {selectedProducts.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedProducts.map((product) => (
                        <span
                          key={product.id}
                          className="inline-flex items-center gap-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-200"
                        >
                          {product.name}
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedProduct(product.id)}
                            className="rounded-full p-0.5 text-indigo-300 transition-colors hover:bg-indigo-500/20 hover:text-white"
                            title={`Quitar ${product.name}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </DebouncedSearchInput>

                {/* Show All Products Toggle */}
                <button
                  id="toggle-show-all-products"
                  onClick={() => setShowAllProducts(prev => !prev)}
                  title={showAllProducts ? 'Mostrando todos los productos (incluyendo sin stock ni ventas). Click para volver al filtro inteligente.' : `Filtro activo: solo productos con ventas en últimos ${salesPeriodDays} días. Click para ver todos.`}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all duration-300 active:scale-95 shrink-0 ${
                    showAllProducts
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {/* Toggle track */}
                  <div className={`relative w-8 h-4.5 rounded-full transition-colors duration-300 ${showAllProducts ? 'bg-emerald-500' : 'bg-slate-600'}`}
                    style={{ width: '32px', height: '18px', borderRadius: '9px', flexShrink: 0 }}>
                    <div
                      className="absolute top-0.5 rounded-full bg-white shadow transition-transform duration-300"
                      style={{
                        width: '14px',
                        height: '14px',
                        transform: showAllProducts ? 'translateX(14px)' : 'translateX(2px)',
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                    {showAllProducts ? 'Mostrando todos' : 'Solo activos'}
                  </span>
                </button>

                <AnimatePresence mode="wait">
                  {selectedProductIds.length > 0 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8, x: -10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: -10 }}
                      onClick={handleClearSelection}
                      className="flex items-center gap-2 bg-red-500/10 hover:bg-red-600 border border-red-500/30 hover:border-red-500 text-red-500 hover:text-white px-4 py-2.5 rounded-2xl transition-all group active:scale-95 shadow-lg shadow-red-500/10"
                      title="Quitar todos los productos seleccionados"
                    >
                      <Trash2 size={16} className="transition-transform group-hover:scale-110" />
                      <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Vaciar Lista</span>
                    </motion.button>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
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
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl shadow-2xl backdrop-blur-sm relative flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-auto custom-scrollbar">
              <table className="transfer-sticky-scope w-full text-left border-collapse min-w-[1000px]">
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
                          <ProductRow
                            key={p.id}
                            p={p}
                            setSelectedProduct={setSelectedProduct}
                            setActiveTooltip={handleTooltipAction}
                            selectedWarehouseId={selectedWarehouseId}
                            onAddProduct={handlePinProduct}
                            isPinned={selectedProductIds.includes(Number(p.id))}
                          />
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    // Flat List (No Group)
                    <>
                      {filteredProducts.slice(0, displayLimit).map(p => (
                        <ProductRow
                          key={p.id}
                          p={p}
                          setSelectedProduct={setSelectedProduct}
                          setActiveTooltip={handleTooltipAction}
                          selectedWarehouseId={selectedWarehouseId}
                          onAddProduct={handlePinProduct}
                          isPinned={selectedProductIds.includes(Number(p.id))}
                        />
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
        <main className="w-full mx-auto px-2 md:px-6 py-4 md:py-8 flex flex-col gap-4 md:gap-8 flex-1 min-h-0">
          {/* Header Bar */}
          <section className="bg-slate-900/40 border border-slate-800 p-3 md:p-6 rounded-3xl relative z-40 flex-none">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-4">
                <button
                  onClick={() => { setCurrentView('products'); setSelectedWarehouseId(null); setWarehouseColumnFilter('All'); }}
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
                  <div className="flex flex-wrap items-center gap-2 bg-slate-800/30 px-3 py-2 rounded-2xl border border-slate-700/50">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Mostrar:</span>
                    {allowedWarehouseColumnFilters.includes('All') && <button
                      onClick={() => handleWarehouseColumnFilterChange('TOTAL_ALL')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'TOTAL_ALL' || warehouseColumnFilter === 'All'
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      Todas
                    </button>}
                    {allowedWarehouseColumnFilters.includes('NUBA') && <button
                      onClick={() => handleWarehouseColumnFilterChange('NUBA')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'NUBA'
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      NUBA
                    </button>}
                    {allowedWarehouseColumnFilters.includes('TOTAL_NUBA') && <button
                      onClick={() => handleWarehouseColumnFilterChange('TOTAL_NUBA')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'TOTAL_NUBA'
                        ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-700/20'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      ∑ NUBA
                    </button>}
                    {allowedWarehouseColumnFilters.includes('EXPANDIA') && <button
                      onClick={() => handleWarehouseColumnFilterChange('EXPANDIA')}
                      disabled={companyWarehouseAvailability.EXPANDIA === 0}
                      title={companyWarehouseAvailability.EXPANDIA === 0 ? 'Sin sucursales cargadas en esta sincronizacion' : undefined}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'EXPANDIA'
                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                        : companyWarehouseAvailability.EXPANDIA === 0
                          ? 'bg-slate-900/60 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      Expandia
                    </button>}
                    {allowedWarehouseColumnFilters.includes('ATI') && <button
                      onClick={() => handleWarehouseColumnFilterChange('ATI')}
                      disabled={companyWarehouseAvailability.ATI === 0}
                      title={companyWarehouseAvailability.ATI === 0 ? 'Sin sucursales cargadas en esta sincronizacion' : undefined}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'ATI'
                        ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                        : companyWarehouseAvailability.ATI === 0
                          ? 'bg-slate-900/60 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      ATI
                    </button>}
                    {allowedWarehouseColumnFilters.includes('ANDYS') && <button
                      onClick={() => handleWarehouseColumnFilterChange('ANDYS')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'ANDYS'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      ANDYS/YY
                    </button>}
                    {allowedWarehouseColumnFilters.includes('TOTAL_ANDYS') && <button
                      onClick={() => handleWarehouseColumnFilterChange('TOTAL_ANDYS')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'TOTAL_ANDYS'
                        ? 'bg-amber-700 text-white shadow-lg shadow-amber-700/20'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      ∑ ANDYS
                    </button>}
                    {allowedWarehouseColumnFilters.includes('WAREHOME') && userProfile.username.toLowerCase() === 'pedro' && (
                      <button
                        onClick={() => handleWarehouseColumnFilterChange('WAREHOME')}
                        disabled={companyWarehouseAvailability.WAREHOME === 0}
                        title={companyWarehouseAvailability.WAREHOME === 0 ? 'Sin sucursales cargadas en esta sincronizacion' : undefined}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'WAREHOME'
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                          : companyWarehouseAvailability.WAREHOME === 0
                            ? 'bg-slate-900/60 text-slate-600 cursor-not-allowed'
                            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                          }`}
                      >
                        Adaptia
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 bg-slate-800/30 px-3 py-2 rounded-2xl border border-slate-700/50">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Extra:</span>
                  <button
                    onClick={() => setShowExtraABC(!showExtraABC)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${showExtraABC
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                  >
                    ABC
                  </button>
                  <button
                    onClick={() => setShowExtraCoverage(!showExtraCoverage)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${showExtraCoverage
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                  >
                    Cobert.
                  </button>
                  <div className={`flex items-center rounded-lg p-0.5 transition-all border ${showExtraSales
                    ? 'bg-cyan-950/40 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'bg-slate-800/50 border-transparent hover:bg-slate-800'
                    }`}>
                    <button
                      onClick={() => setShowExtraSales(!showExtraSales)}
                      className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${showExtraSales
                        ? 'text-cyan-400 hover:text-cyan-300'
                        : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      Ventas
                    </button>
                    <div className={`h-3.5 w-px mx-0.5 ${showExtraSales ? 'bg-cyan-500/30' : 'bg-slate-700'}`}></div>
                    <div className="flex gap-0.5 pl-0.5">
                      {([30, 90, 180] as const).map(d => (
                        <button
                          key={d}
                          onClick={() => {
                            setSalesPeriodDaysDebounced(d);
                            setShowExtraSales(true);
                          }}
                          className={`px-2 py-1 rounded-md text-[8px] font-black transition-all ${salesPeriodDays === d
                            ? (showExtraSales ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'bg-slate-700 text-slate-300')
                            : (showExtraSales ? 'text-cyan-700 hover:text-cyan-400 hover:bg-cyan-900/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50')
                            }`}
                          title={`Mostrar ventas de ${d} dias`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMinMax(!showMinMax)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${showMinMax
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/30'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                  >
                    Min/Max
                  </button>
                  {userProfile.username.toLowerCase() === 'pedro' && (
                    <>
                      <button
                        onClick={() => setShowCost(!showCost)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${showCost
                          ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                          : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                          }`}
                      >
                        Costo
                      </button>
                      <button
                        onClick={() => setShowSalePrice(!showSalePrice)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${showSalePrice
                          ? 'bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20'
                          : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                          }`}
                      >
                        P. Venta
                      </button>
                      <button
                        onClick={() => setShowMargin(!showMargin)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${showMargin
                          ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                          : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                          }`}
                      >
                        Margen
                      </button>
                    </>
                  )}
                  {(warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ANDYS') && (
                    <>
                      <button
                        onClick={() => setShowListPrice(!showListPrice)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${showListPrice
                          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                          : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                          }`}
                      >
                        P. Lista
                      </button>
                      <button
                        onClick={() => setShowPrevListPrice(!showPrevListPrice)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${showPrevListPrice
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                          : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                          }`}
                      >
                        P. Anterior
                      </button>
                      <button
                        onClick={() => setShowPriceHistory(!showPriceHistory)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${showPriceHistory
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                          : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                          }`}
                      >
                        F. Actualización
                      </button>
                    </>
                  )}

                </div>

                {/* Show All Products Toggle (Sync with main view) */}
                <button
                  onClick={() => setShowAllProducts(prev => !prev)}
                  title={showAllProducts ? 'Mostrando todos los productos. Click para filtrar solo activos.' : `Filtro activo: solo productos con ventas en últimos ${salesPeriodDays} días. Click para ver todos.`}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border transition-all duration-300 active:scale-95 shrink-0 ${
                    showAllProducts
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className={`relative w-8 h-4.5 rounded-full transition-colors duration-300 ${showAllProducts ? 'bg-emerald-500' : 'bg-slate-600'}`}
                    style={{ width: '30px', height: '16px', borderRadius: '8px', flexShrink: 0 }}>
                    <div
                      className="absolute top-0.5 rounded-full bg-white shadow transition-transform duration-300"
                      style={{
                        width: '12px',
                        height: '12px',
                        left: showAllProducts ? '16px' : '2px'
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {showAllProducts ? 'Mostrando todos' : 'Solo activos'}
                  </span>
                </button>


                <AnimatePresence mode="wait">
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
              <MultiFilterDropdown
                label="Categoría"
                icon={ListFilter}
                values={selectedProductCategory}
                allCount={productCategories.find(c => c.name === 'All')?.count || 0}
                options={productCategories.filter(c => c.name !== 'All')}
                onChange={setSelectedProductCategory}
                isOpen={activeDropdown === 'category'}
                onToggle={() => setActiveDropdown(activeDropdown === 'category' ? 'none' : 'category')}
                variant="orange"
              />

              <MultiFilterDropdown
                label="Proveedor"
                icon={Users}
                values={selectedProvider}
                allCount={providers.find(p => p.name === 'All')?.count || 0}
                options={providers.filter(p => p.name !== 'All')}
                onChange={setSelectedProvider}
                isOpen={activeDropdown === 'provider'}
                onToggle={() => setActiveDropdown(activeDropdown === 'provider' ? 'none' : 'provider')}
                variant="emerald"
              />

              <MultiFilterDropdown
                label="Origen"
                icon={Globe}
                values={selectedOrigin}
                allCount={origins.find(o => o.name === 'All')?.count || 0}
                options={origins.filter(o => o.name !== 'All')}
                onChange={setSelectedOrigin}
                isOpen={activeDropdown === 'origin'}
                onToggle={() => setActiveDropdown(activeDropdown === 'origin' ? 'none' : 'origin')}
                variant="emerald"
              />

              <MultiFilterDropdown
                label="Análisis ABC"
                icon={BarChart3}
                values={selectedCategory}
                allCount={abcCategories.find(a => a.name === 'All')?.count || 0}
                options={abcCategories.filter(a => a.name !== 'All')}
                onChange={setSelectedCategory}
                isOpen={activeDropdown === 'abc'}
                onToggle={() => setActiveDropdown(activeDropdown === 'abc' ? 'none' : 'abc')}
                variant="indigo"
              />

              <MultiFilterDropdown
                label="Etiqueta"
                icon={Archive}
                values={selectedTag}
                allCount={productTags.find(t => t.name === 'All')?.count || 0}
                options={productTags.filter(t => t.name !== 'All')}
                onChange={setSelectedTag}
                isOpen={activeDropdown === 'tag'}
                onToggle={() => setActiveDropdown(activeDropdown === 'tag' ? 'none' : 'tag')}
                variant="amber"
              />

              {selectedWarehouseId && (
                <MultiFilterDropdown
                  label="ABC Sucursal"
                  icon={Store}
                  values={selectedCategoryStore}
                  allCount={abcStoreCategories.find(a => a.name === 'All')?.count || 0}
                  options={abcStoreCategories.filter(a => a.name !== 'All')}
                  onChange={setSelectedCategoryStore}
                  isOpen={activeDropdown === 'abc_store'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'abc_store' ? 'none' : 'abc_store')}
                  variant="amber"
                />
              )}

              <MultiFilterDropdown
                label="Cobertura"
                icon={Clock}
                values={transferCoverageFilter}
                allCount={coverageOptions.find(o => o.name === 'All')?.count || 0}
                options={coverageFilterChoices}
                onChange={(values) => setTransferCoverageFilter(values as CoverageFilterOption[])}
                isOpen={activeDropdown === 'coverage'}
                onToggle={() => setActiveDropdown(activeDropdown === 'coverage' ? 'none' : 'coverage')}
                variant="cyan"
              />

              <DebouncedSearchInput
                value={transferSearchTerm}
                onChange={setTransferSearchTerm}
                placeholder={selectedProductIds.length > 0 ? "Buscar otro producto para agregar..." : "Buscar producto..."}
                icon={Search}
                focusColor="group-focus-within:text-emerald-400"
                className="w-full bg-slate-800/50 border border-slate-700/50 text-white pl-10 pr-4 py-2.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-bold text-sm placeholder:text-slate-600"
              />

              <AnimatePresence mode="wait">
                {selectedProductIds.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 20 }}
                    onClick={handleClearSelection}
                    className="flex items-center gap-2 bg-red-500/10 hover:bg-red-600 border border-red-500/30 hover:border-red-500 text-red-500 hover:text-white px-4 py-2.5 rounded-2xl transition-all group active:scale-95 shadow-lg shadow-red-500/10"
                    title="Quitar todos los productos seleccionados"
                  >
                    <Trash2 size={16} className="transition-transform group-hover:scale-110" />
                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Vaciar Lista</span>
                  </motion.button>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
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
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl shadow-2xl relative flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-auto custom-scrollbar">
              <table className="transfer-sticky-scope w-full text-left border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-30 bg-slate-950 border-b border-slate-800 shadow-xl">
                  <tr className="text-slate-500 text-[10px] uppercase tracking-[0.1em] font-black">
                    <th className="px-3 py-2 w-[80px] min-w-[80px] sticky left-0 bg-slate-950 z-40">Código</th>
                    <th className="px-3 py-2 w-[300px] min-w-[300px] md:w-[450px] md:min-w-[450px] sticky left-[80px] bg-slate-950 z-40 text-left">Producto</th>
                    {transferTargetWarehouse ? (
                      <>
                        <th className="px-2 py-2 text-center w-[70px] min-w-[70px] sticky left-[380px] md:left-[530px] bg-slate-950 z-40 cursor-pointer hover:bg-slate-900 group" onClick={() => handleTransferSort('origin_coverage')}>
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
                        {(() => {
                          const destWh = warehouses.find(w => w.id === selectedWarehouseId);
                          const isDestStockOnlyWh = destWh?.name?.toUpperCase().includes('ALMACEN CENTRAL') ||
                            destWh?.name?.toUpperCase().includes('SOPOCACHI') ||
                            destWh?.name?.toUpperCase().includes('ALMACEN VELARDE');
                          const colSpan = isDestStockOnlyWh ? 1 : ((showExtraSales ? 1 : 0) + 1 + (showExtraCoverage ? 1 : 0) + (showExtraABC ? 1 : 0) + (showMinMax ? 1 : 0) + (showCost ? 1 : 0) + (showSalePrice ? 1 : 0) + (showMargin ? 1 : 0));
                          const totalWidth = isDestStockOnlyWh ? 80 : ((showExtraSales ? 50 : 0) + 80 + (showExtraCoverage ? 55 : 0) + (showExtraABC ? 35 : 0) + (showMinMax ? 58 : 0) + (showCost ? 50 : 0) + (showSalePrice ? 50 : 0) + (showMargin ? 55 : 0));
                          return (
                            <th colSpan={colSpan}
                              className={`px-1 py-2 text-center sticky bg-slate-950 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.3)] transition-all duration-300 ${showExtraCoverage ? 'left-[600px]' : 'left-[530px]'}`}
                              style={{
                                width: totalWidth + 'px',
                                minWidth: totalWidth + 'px',
                                cursor: 'pointer'
                              }}
                              onClick={() => setShowTransferSourceDropdown(!showTransferSourceDropdown)}
                            >
                              <div className="flex flex-col items-center bg-cyan-600/20 hover:bg-cyan-600/30 transition-colors py-1.5 rounded-xl relative overflow-hidden px-2 ring-1 ring-cyan-500/20">
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
                                <div className="flex items-center gap-1 text-cyan-300 group-hover:text-cyan-200">
                                  <span className="font-black border-b border-dashed border-cyan-500/30 whitespace-nowrap px-1 uppercase text-[9px]">
                                    {warehouses.find(w => w.id === transferTargetWarehouse)?.name}
                                  </span>
                                  <ChevronDown size={10} className={`text-cyan-500/70 transition-transform ${showTransferSourceDropdown ? 'rotate-180' : ''}`} />
                                </div>
                                <span className="text-[7px] text-cyan-500 font-black uppercase tracking-widest mt-0.5">Surtidor (Origen)</span>
                              </div>

                              <AnimatePresence mode="wait">
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
                                        className="w-full px-4 py-3 text-left hover:bg-slate-800 transition-colors flex items-center gap-3 border-b border-slate-800/50"
                                      >
                                        <X size={14} className="text-rose-400" />
                                        <span className="text-slate-300 font-medium text-xs">Quitar Origen</span>
                                      </button>
                                      {warehouses.filter(w =>
                                        w.id !== null &&
                                        w.id !== selectedWarehouseId &&
                                        matchesWarehouseColumnScope(w, warehouseColumnFilter)
                                      ).map(wh => (
                                        <button
                                          key={wh.id}
                                          onClick={() => {
                                            setTransferTargetWarehouse(wh.id);
                                            setShowTransferSourceDropdown(false);
                                          }}
                                          className={`w-full px-4 py-3 text-left hover:bg-slate-800 transition-colors flex items-center gap-3 ${transferTargetWarehouse === wh.id ? 'bg-slate-800/50' : ''}`}
                                        >
                                          <Store size={14} className={transferTargetWarehouse === wh.id ? 'text-cyan-400' : 'text-slate-500'} />
                                          <div className="flex flex-col">
                                            <span className={`text-xs font-bold ${transferTargetWarehouse === wh.id ? 'text-cyan-400' : 'text-slate-300'}`}>{wh.name}</span>
                                          </div>
                                        </button>
                                      ))}
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                            </th>
                          );
                        })()}
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
                          <div className="flex flex-col items-center bg-indigo-600/20 hover:bg-indigo-600/30 transition-colors py-1.5 rounded-xl relative overflow-hidden px-2 ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-500/10">
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

                            <Store size={14} className="mb-0.5 text-indigo-300 group-hover:scale-110 transition-transform" />
                            <div className="flex items-center gap-1 text-indigo-300 group-hover:text-indigo-200">
                              <span className="font-black border-b border-dashed border-indigo-500/30 whitespace-nowrap px-1 uppercase text-[9px]">
                                {warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Principal'}
                              </span>
                              <ChevronDown size={10} className={`text-indigo-500/70 transition-transform ${showTransferDestDropdown ? 'rotate-180' : ''}`} />
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="flex w-1 h-1 rounded-full bg-indigo-400 animate-pulse"></span>
                              <span className="text-[7px] text-indigo-400 font-black uppercase tracking-widest">Sucursal Actual</span>
                            </div>
                          </div>

                          <AnimatePresence mode="wait">
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
                          <div className="light-contrast-mini-card flex flex-col items-center bg-indigo-500/5 py-1 rounded-lg relative">
                            <Clock size={12} className="light-contrast-mini-icon mb-1 text-indigo-400/70" />
                            <span className="light-contrast-mini-label text-indigo-500/70">Cobert.</span>
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
                        {!isTransferConsolidatedView && (
                          <>
                            <th
                              className="px-2 py-2 text-center w-[70px] min-w-[70px] sticky bg-slate-950 z-40 cursor-pointer hover:bg-slate-900 group"
                              onClick={() => handleTransferSort('dest_coverage')}
                              style={getTransferStickyLeftStyle(0)}
                            >
                              <div className="light-contrast-mini-card flex flex-col items-center bg-indigo-500/5 py-1 rounded-lg relative">
                                <Clock size={12} className="light-contrast-mini-icon mb-1 text-indigo-400/70" />
                                <span className="light-contrast-mini-label text-indigo-500/70">Cobert.</span>
                                {transferSortBy === 'dest_coverage' && (
                                  <div className="absolute top-1 right-1 text-indigo-500">
                                    {transferSortOrder === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                                  </div>
                                )}
                              </div>
                            </th>
                            <th
                              className="px-2 py-2 text-center w-[100px] min-w-[100px] sticky bg-slate-950 z-40"
                              style={getTransferStickyLeftStyle(70)}
                            >
                              <div className="light-contrast-current-branch flex flex-col items-center bg-indigo-500/20 py-1.5 rounded-xl ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-500/5 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent opacity-50"></div>
                                <Store size={14} className="light-contrast-current-branch-icon mb-1 text-indigo-300 relative z-10" />
                                <span className="light-contrast-current-branch-name text-indigo-200 text-[10px] font-black relative z-10 drop-shadow-sm truncate max-w-full px-1">
                                  {selectedWarehouseName || 'Principal'}
                                </span>
                                <div className="flex items-center gap-1 mt-0.5 relative z-10">
                                  <span className="flex w-1 h-1 rounded-full bg-indigo-400 animate-pulse"></span>
                                  <span className="light-contrast-current-branch-caption text-[7px] text-indigo-400/90 uppercase font-black tracking-widest">Sucursal Actual</span>
                                </div>
                              </div>
                            </th>
                            {!isSelectedWarehouseSimple && showExtraSales && (
                              <th
                                className="px-1 py-2 text-center min-w-[52px] bg-slate-950 sticky z-40"
                                style={getTransferStickyLeftStyle(currentBranchStickyOffsets.sales)}
                              >
                                <div className="flex flex-col items-center">
                                  <span className="text-[7px] font-black text-cyan-400 uppercase tracking-tighter">VTA</span>
                                  <span className="text-[6px] text-cyan-700">{salesPeriodDays}d</span>
                                </div>
                              </th>
                            )}
                            {!isSelectedWarehouseSimple && showExtraCoverage && (
                              <th
                                className="px-1 py-2 text-center min-w-[55px] bg-slate-950 sticky z-40"
                                style={getTransferStickyLeftStyle(currentBranchStickyOffsets.coverage)}
                              >
                                <div className="flex flex-col items-center">
                                  <span className="text-[7px] font-black text-emerald-400 uppercase tracking-tighter">COV</span>
                                  <span className="text-[6px] text-emerald-800">días</span>
                                </div>
                              </th>
                            )}
                            {!isSelectedWarehouseSimple && showExtraABC && (
                              <th
                                className="px-1 py-2 text-center min-w-[48px] bg-slate-950 sticky z-40"
                                style={getTransferStickyLeftStyle(currentBranchStickyOffsets.abc)}
                              >
                                <span className="light-contrast-colhead light-contrast-colhead-abc text-[7px] font-black text-indigo-400 uppercase tracking-tighter">ABC</span>
                              </th>
                            )}
                            {!isSelectedWarehouseSimple && showMinMax && (
                              <th
                                className="px-1 py-2 text-center min-w-[58px] bg-slate-950 sticky z-40"
                                style={getTransferStickyLeftStyle(currentBranchStickyOffsets.minMax)}
                              >
                                <span className="light-contrast-chip light-contrast-colhead light-contrast-colhead-minmax text-[7px] font-black text-slate-400 uppercase tracking-tighter">MIN/MAX</span>
                              </th>
                            )}
                            {!isSelectedWarehouseSimple && showCost && (
                              <th
                                className="px-1 py-2 text-center min-w-[50px] bg-slate-950 sticky z-40"
                                style={getTransferStickyLeftStyle(currentBranchStickyOffsets.cost)}
                              >
                                <span className="light-contrast-colhead light-contrast-colhead-cost text-[7px] font-black text-violet-400 uppercase tracking-tighter">COSTO (Bs.)</span>
                              </th>
                            )}
                            {!isSelectedWarehouseSimple && showSalePrice && (
                              <th
                                className="px-1 py-2 text-center min-w-[50px] bg-slate-950 sticky z-40"
                                style={getTransferStickyLeftStyle(currentBranchStickyOffsets.salePrice)}
                              >
                                <span className="light-contrast-colhead light-contrast-colhead-price text-[7px] font-black text-violet-400 uppercase tracking-tighter">PRECIO (Bs.)</span>
                              </th>
                            )}
                            {!isSelectedWarehouseSimple && showMargin && (
                              <th
                                className="px-1 py-2 text-center min-w-[55px] bg-slate-950 sticky z-40"
                                style={getTransferStickyLeftStyle(currentBranchStickyOffsets.margin)}
                              >
                                <span className="light-contrast-colhead light-contrast-colhead-margin text-[7px] font-black text-violet-400 uppercase tracking-tighter">MARGEN %</span>
                              </th>
                            )}
                            {false && !isSelectedWarehouseSimple && showListPrice && (
                              <th
                                className="px-1 py-2 text-center min-w-[50px] bg-slate-950 sticky z-40"
                                style={getTransferStickyLeftStyle(currentBranchStickyOffsets.listPrice)}
                              >
                                <span className="text-[7px] font-black text-cyan-400 uppercase tracking-tighter">P. Lista</span>
                              </th>
                            )}
                            {false && !isSelectedWarehouseSimple && showPrevListPrice && (
                              <th
                                className="px-1 py-2 text-center min-w-[50px] bg-slate-950 sticky z-40"
                                style={getTransferStickyLeftStyle(currentBranchStickyOffsets.prevListPrice)}
                              >
                                <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter">P. Ant.</span>
                              </th>
                            )}
                            {false && !isSelectedWarehouseSimple && showPriceHistory && (
                              <th
                                className="px-1 py-2 text-center min-w-[60px] bg-slate-950 sticky z-40"
                                style={getTransferStickyLeftStyle(currentBranchStickyOffsets.priceHistory)}
                              >
                                <span className="text-[7px] font-black text-amber-400 uppercase tracking-tighter">F. Act.</span>
                              </th>
                            )}
                          </>
                        )}
                        {isTransferConsolidatedView && (
                          <React.Fragment key="consolidated-header">
                            <th
                              className={`px-2 py-3 text-center w-[85px] min-w-[85px] border-l-2 relative overflow-hidden sticky z-40 ${warehouseColumnFilter === 'TOTAL_ALL' ? 'bg-slate-950 border-indigo-500/40' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'bg-slate-950 border-emerald-500/40' : 'bg-slate-950 border-amber-500/40'}`}
                              style={getTransferStickyLeftStyle(0)}
                            >
                              <div className={`absolute inset-0 opacity-30 ${warehouseColumnFilter === 'TOTAL_ALL' ? 'bg-gradient-to-b from-indigo-500/20 to-transparent' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'bg-gradient-to-b from-emerald-500/20 to-transparent' : 'bg-gradient-to-b from-amber-500/20 to-transparent'}`}></div>
                              <div className="flex flex-col items-center relative z-10">
                                <TrendingUp size={14} className={`mb-1 ${warehouseColumnFilter === 'TOTAL_ALL' ? 'text-indigo-400' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'text-emerald-400' : 'text-amber-400'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${warehouseColumnFilter === 'TOTAL_ALL' ? 'text-indigo-300 drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'text-emerald-300 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'text-amber-300 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]'}`}>
                                  {warehouseColumnFilter === 'TOTAL_ALL' ? 'TOTAL GLOBAL' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'TOTAL NUBA' : 'TOTAL ANDYS'}
                                </span>
                                <div className={`mt-1.5 px-2 py-0.5 rounded-full text-[7px] font-black text-white ${warehouseColumnFilter === 'TOTAL_ALL' ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]'}`}>CONSOLIDADO</div>
                              </div>
                            </th>
                            {showExtraSales && <th className="px-2 py-3 text-center w-[52px] min-w-[52px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.sales)}><div className="flex flex-col items-center"><span className="text-[8px] font-black text-white/90 uppercase tracking-tighter">VTA T</span><span className={`text-[6px] font-bold ${warehouseColumnFilter === 'TOTAL_ALL' ? 'text-indigo-500' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'text-emerald-500' : 'text-amber-500'}`}>{salesPeriodDays} DÍAS</span></div></th>}
                            {showExtraCoverage && <th className="px-2 py-3 text-center w-[55px] min-w-[55px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.coverage)}><div className="flex flex-col items-center"><span className="text-[8px] font-black text-white/90 uppercase tracking-tighter">COV T</span><span className={`text-[6px] font-bold ${warehouseColumnFilter === 'TOTAL_ALL' ? 'text-indigo-500' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'text-emerald-500' : 'text-amber-500'}`}>GLOBAL</span></div></th>}
                            {showExtraABC && <th className="px-2 py-3 text-center w-[48px] min-w-[48px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.abc)}><span className="text-[8px] font-black text-white/90 uppercase tracking-tighter">ABC T</span></th>}
                            {showMinMax && <th className="px-2 py-3 text-center w-[58px] min-w-[58px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.minMax)}><span className="text-[8px] font-black text-white/90 uppercase tracking-tighter">M/M T</span></th>}
                            {showCost && <th className="px-2 py-3 text-center w-[50px] min-w-[50px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.cost)}><span className="text-[8px] font-black text-violet-400 uppercase tracking-tighter">C. T</span></th>}
                            {showSalePrice && <th className="px-2 py-3 text-center w-[50px] min-w-[50px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.salePrice)}><span className="text-[8px] font-black text-violet-400 uppercase tracking-tighter">P. T</span></th>}
                            {showMargin && <th className="px-2 py-3 text-center w-[55px] min-w-[55px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.margin)}><span className="text-[8px] font-black text-violet-400 uppercase tracking-tighter">M. T</span></th>}
                            {showListPrice && (warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ANDYS') && <th className="px-2 py-3 text-center w-[50px] min-w-[50px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.listPrice)}><span className="text-[8px] font-black text-cyan-400 uppercase tracking-tighter">P.Lista</span></th>}
                            {showPrevListPrice && (warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ANDYS') && <th className="px-2 py-3 text-center w-[50px] min-w-[50px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.prevListPrice)}><span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">P.Ant</span></th>}
                            {showPriceHistory && (warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ANDYS') && <th className="px-2 py-3 text-center w-[60px] min-w-[60px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.priceHistory)}><span className="text-[8px] font-black text-amber-400 uppercase tracking-tighter">F.Act</span></th>}
                            <th className="p-0 w-[2px] min-w-[2px] sticky z-40 pointer-events-none bg-transparent" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.end)}></th>
                          </React.Fragment>
                        )}
                        {visibleWarehouses.map(wh => {
                          const whNameUp = (wh.name || '').toUpperCase();
                          const isSimple = isSimpleWarehouseName(whNameUp);
                          const isVirtualWh = !!(wh as any)._is_virtual;
                          return (
                            <React.Fragment key={wh.id}>
                              <th className={`px-2 py-2 text-center min-w-[90px] transition-colors border-l border-slate-800/50 group relative overflow-hidden ${isVirtualWh ? 'cursor-default' : 'cursor-pointer hover:bg-slate-800'}`}
                                onClick={() => !isVirtualWh && setTransferTargetWarehouse(wh.id)}
                                title={isVirtualWh ? wh.name : "Haz clic para solicitar traspaso desde esta sucursal"}
                              >
                                <div className={`absolute inset-x-0 top-0 h-0.5 transition-colors ${isVirtualWh ? 'bg-orange-500/30' : 'bg-slate-700/50 group-hover:bg-emerald-500/50'}`}></div>
                                <div className="flex flex-col items-center py-1">
                                  <Store size={11} className={`mb-0.5 transition-colors ${isVirtualWh ? 'text-orange-500/60' : 'text-slate-600 group-hover:text-emerald-400'}`} />
                                  <span className="text-[8px] font-black text-slate-500 group-hover:text-slate-300 text-center leading-tight max-w-[80px] mb-1 uppercase tracking-tighter transition-colors">{wh.name}</span>
                                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border transition-all ${isVirtualWh ? 'bg-orange-500/10 border-orange-500/20' : 'bg-slate-800/50 border-slate-700/30 group-hover:border-emerald-500/30'}`}>
                                    <span className={`text-[7px] font-black uppercase tracking-tighter ${isVirtualWh ? 'text-orange-400/70' : 'text-slate-400 group-hover:text-emerald-300'}`}>STOCK</span>
                                  </div>
                                  {!isVirtualWh && (
                                    <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <PlusCircle size={8} className="text-emerald-500" />
                                      <span className="text-[6px] text-emerald-500 uppercase font-black tracking-widest">Pedir</span>
                                    </div>
                                  )}
                                </div>
                              </th>
                              {!isSimple && showExtraSales && (
                                <th className="px-1 py-2 text-center min-w-[52px] bg-cyan-950/30">
                                  <div className="flex flex-col items-center">
                                    <span className="text-[7px] font-black text-cyan-400 uppercase tracking-tighter">VTA</span>
                                    <span className="text-[6px] text-cyan-700">{salesPeriodDays}d</span>
                                  </div>
                                </th>
                              )}
                              {!isSimple && showExtraCoverage && (
                                <th className="px-1 py-2 text-center min-w-[48px] bg-emerald-950/30">
                                  <div className="flex flex-col items-center">
                                    <span className="text-[7px] font-black text-emerald-400 uppercase tracking-tighter">COV</span>
                                    <span className="text-[6px] text-emerald-800">días</span>
                                  </div>
                                </th>
                              )}
                              {!isSimple && showExtraABC && (
                                <th className="px-1 py-2 text-center min-w-[48px] bg-indigo-950/30">
                                  <span className="light-contrast-colhead light-contrast-colhead-abc text-[7px] font-black text-indigo-400 uppercase tracking-tighter">ABC</span>
                                </th>
                              )}
                              {!isSimple && showMinMax && (
                                <th className="px-1 py-2 text-center min-w-[58px] bg-slate-800/20">
                                  <span className="light-contrast-chip light-contrast-colhead light-contrast-colhead-minmax text-[7px] font-black text-slate-400 uppercase tracking-tighter">MIN/MAX</span>
                                </th>
                              )}
                              {!isSimple && showCost && (
                                <th className="px-1 py-2 text-center min-w-[50px] bg-violet-950/20">
                                  <span className="light-contrast-colhead light-contrast-colhead-cost text-[7px] font-black text-violet-400 uppercase tracking-tighter">COSTO</span>
                                </th>
                              )}
                              {!isSimple && showSalePrice && (
                                <th className="px-1 py-2 text-center min-w-[50px] bg-fuchsia-950/20">
                                  <span className="text-[7px] font-black text-fuchsia-400 uppercase tracking-tighter">PRECIO</span>
                                </th>
                              )}
                              {!isSimple && showMargin && (
                                <th className="px-1 py-2 text-center min-w-[55px] bg-pink-950/20">
                                  <span className="text-[7px] font-black text-pink-400 uppercase tracking-tighter">MARGEN %</span>
                                </th>
                              )}
                              {/* P.Lista/P.Ant/F.Act solo en columna TOTAL, no en salas individuales */}
                            </React.Fragment>
                          );
                        })}
                      </>
                    )}


                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // currentView is narrowed to 'transfers' here, so showMLColumns is always false
const _cbso = getTransferCurrentBranchExtraStickyOffsets({ showExtraSales, showExtraCoverage, showExtraABC, showMinMax, showMLColumns: false, showCost, showSalePrice, showMargin, showListPrice, showPrevListPrice, showPriceHistory });
const _csso = getTransferConsolidatedStickyOffsets({ showExtraSales, showExtraCoverage, showExtraABC, showMinMax, showMLColumns: false, showCost, showSalePrice, showMargin, showListPrice, showPrevListPrice, showPriceHistory });
                    return sortedTransferProducts.slice(0, displayLimitTransfer).map((p: any, idx: number) => (
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
                        showExtraABC={showExtraABC}
                        showExtraCoverage={showExtraCoverage}
                        showExtraSales={showExtraSales}
                        showMLColumns={false}
                        showMinMax={showMinMax}
                        showCost={showCost}
                        showSalePrice={showSalePrice}
                        showMargin={showMargin}
                        showListPrice={showListPrice && (warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ANDYS')}
                        showPrevListPrice={showPrevListPrice && (warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ANDYS')}
                        showPriceHistory={showPriceHistory && (warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ANDYS')}
                        salesPeriodDays={salesPeriodDays}
                        consolidatedView={warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ANDYS' || warehouseColumnFilter === 'TOTAL_ALL'}
                        currentBranchStickyOffsets={_cbso}
                        consolidatedStickyOffsets={_csso}
                        onAddProduct={handlePinProduct}
                        isPinned={selectedProductIds.includes(Number(p.id))}
                      />
                    ));
                  })()}

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
      ) : currentView === 'ml' ? (
        <main className="w-full mx-auto px-2 md:px-6 py-4 md:py-8 flex flex-col gap-4 md:gap-8 flex-1 min-h-0">
          {/* Header Bar */}
          <section className="bg-slate-900/40 border border-slate-800 p-3 md:p-6 rounded-3xl relative z-40 flex-none">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-4">
                <button
                  onClick={() => { setCurrentView('products'); setSelectedWarehouseId(null); setWarehouseColumnFilter('All'); }}
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
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{transferTargetWarehouse ? 'Análisis Predictivo' : 'Comparación de stock inteligente'}</p>

                      <div className="flex flex-wrap items-center gap-4 pl-4 border-l border-slate-800">
                        <button
                          onClick={() => setUseML(!useML)}
                          className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all duration-300 ${useML ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-slate-600'
                            }`}
                        >
                          <Sparkles size={14} className={useML ? 'text-indigo-400 animate-pulse' : 'text-slate-500'} />
                          <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Usar ML para Demanda</span>
                          <div className={`w-9 h-5 rounded-full relative transition-all duration-500 ${useML ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-500 shadow-sm ${useML ? 'left-5' : 'left-1'}`} />
                          </div>
                        </button>

                        <button
                          onClick={() => setShowMLExplanations(!showMLExplanations)}
                          className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all duration-300 ${showMLExplanations ? 'bg-purple-500/10 border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-slate-600'
                            }`}
                        >
                          <Info size={14} className={showMLExplanations ? 'text-purple-400' : 'text-slate-500'} />
                          <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Explicaciones IA</span>
                          <div className={`w-9 h-5 rounded-full relative transition-all duration-500 ${showMLExplanations ? 'bg-purple-500' : 'bg-slate-700'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-500 shadow-sm ${showMLExplanations ? 'left-5' : 'left-1'}`} />
                          </div>
                        </button>

                        <button
                          onClick={() => setShowMLColumns(!showMLColumns)}
                          className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all duration-300 ${showMLColumns ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-slate-600'
                            }`}
                        >
                          {showMLColumns ? <Eye size={14} className="text-cyan-400" /> : <EyeOff size={14} className="text-slate-500" />}
                          <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Columnas ML</span>
                          <div className={`w-9 h-5 rounded-full relative transition-all duration-500 ${showMLColumns ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-500 shadow-sm ${showMLColumns ? 'left-5' : 'left-1'}`} />
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex flex-wrap items-center gap-2 md:gap-4">
                {/* Warehouse Column Filter Buttons */}
                {!transferTargetWarehouse && (
                  <div className="flex flex-wrap items-center gap-2 bg-slate-800/30 px-3 py-2 rounded-2xl border border-slate-700/50">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Mostrar:</span>
                    {allowedWarehouseColumnFilters.includes('All') && <button
                      onClick={() => handleWarehouseColumnFilterChange('TOTAL_ALL')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'TOTAL_ALL' || warehouseColumnFilter === 'All'
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      Todas
                    </button>}
                    {allowedWarehouseColumnFilters.includes('NUBA') && <button
                      onClick={() => handleWarehouseColumnFilterChange('NUBA')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'NUBA'
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      NUBA
                    </button>}
                    {allowedWarehouseColumnFilters.includes('TOTAL_NUBA') && <button
                      onClick={() => handleWarehouseColumnFilterChange('TOTAL_NUBA')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'TOTAL_NUBA'
                        ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-700/20'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      ∑ NUBA
                    </button>}
                    {allowedWarehouseColumnFilters.includes('EXPANDIA') && <button
                      onClick={() => handleWarehouseColumnFilterChange('EXPANDIA')}
                      disabled={companyWarehouseAvailability.EXPANDIA === 0}
                      title={companyWarehouseAvailability.EXPANDIA === 0 ? 'Sin sucursales cargadas en esta sincronizacion' : undefined}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'EXPANDIA'
                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                        : companyWarehouseAvailability.EXPANDIA === 0
                          ? 'bg-slate-900/60 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      Expandia
                    </button>}
                    {allowedWarehouseColumnFilters.includes('ATI') && <button
                      onClick={() => handleWarehouseColumnFilterChange('ATI')}
                      disabled={companyWarehouseAvailability.ATI === 0}
                      title={companyWarehouseAvailability.ATI === 0 ? 'Sin sucursales cargadas en esta sincronizacion' : undefined}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'ATI'
                        ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                        : companyWarehouseAvailability.ATI === 0
                          ? 'bg-slate-900/60 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      ATI
                    </button>}
                    {allowedWarehouseColumnFilters.includes('ANDYS') && <button
                      onClick={() => handleWarehouseColumnFilterChange('ANDYS')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'ANDYS'
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      ANDYS/YY
                    </button>}
                    {allowedWarehouseColumnFilters.includes('TOTAL_ANDYS') && <button
                      onClick={() => handleWarehouseColumnFilterChange('TOTAL_ANDYS')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'TOTAL_ANDYS'
                        ? 'bg-amber-700 text-white shadow-lg shadow-amber-700/20'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      ∑ ANDYS
                    </button>}
                    {allowedWarehouseColumnFilters.includes('WAREHOME') && userProfile.username.toLowerCase() === 'pedro' && (
                      <button
                        onClick={() => handleWarehouseColumnFilterChange('WAREHOME')}
                        disabled={companyWarehouseAvailability.WAREHOME === 0}
                        title={companyWarehouseAvailability.WAREHOME === 0 ? 'Sin sucursales cargadas en esta sincronizacion' : undefined}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${warehouseColumnFilter === 'WAREHOME'
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                          : companyWarehouseAvailability.WAREHOME === 0
                            ? 'bg-slate-900/60 text-slate-600 cursor-not-allowed'
                            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                          }`}
                      >
                        Adaptia
                      </button>
                    )}
                  </div>
                )}

                {/* Show All Products Toggle (ML view) */}
                <button
                  onClick={() => setShowAllProducts(prev => !prev)}
                  title={showAllProducts ? 'Mostrando todos los productos. Click para filtrar solo activos.' : `Filtro activo: solo productos con ventas en últimos ${salesPeriodDays} días. Click para ver todos.`}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border transition-all duration-300 active:scale-95 shrink-0 ${
                    showAllProducts
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className={`relative w-8 h-4.5 rounded-full transition-colors duration-300 ${showAllProducts ? 'bg-emerald-500' : 'bg-slate-600'}`}
                    style={{ width: '30px', height: '16px', borderRadius: '8px', flexShrink: 0 }}>
                    <div
                      className="absolute top-0.5 rounded-full bg-white shadow transition-transform duration-300"
                      style={{
                        width: '12px',
                        height: '12px',
                        left: showAllProducts ? '16px' : '2px'
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {showAllProducts ? 'Mostrando todos' : 'Solo activos'}
                  </span>
                </button>

                <AnimatePresence mode="wait">
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

                <button
                  onClick={() => fetchProducts(true)}
                  className="p-2.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-slate-400 hover:text-indigo-400 rounded-xl transition-all disabled:opacity-50"
                  disabled={loading || isSyncing}
                  title="Sincronizar con Odoo"
                >
                  <RefreshCw size={18} className={cn((loading || isSyncing) && "animate-spin")} />
                </button>

                <button
                  onClick={handleDownloadGlobalAnalysisExcel}
                  className="p-2.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-slate-400 hover:text-indigo-400 rounded-xl transition-all flex items-center gap-2 group"
                  title="Exportar Análisis ML a Excel"
                >
                  <FileSpreadsheet size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Excel ML</span>
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

                {warehouses.filter(w => w.id !== null).length >= 3 && !transferTargetWarehouse && (
                  <button
                    onClick={() => setShowGlobalAnalysisConfirmModal(true)}
                    className="px-4 py-2.5 bg-indigo-600/90 hover:bg-indigo-600 border border-indigo-500/50 text-white rounded-xl transition-all flex items-center gap-2 relative group shadow-lg shadow-indigo-500/20"
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
              <MultiFilterDropdown
                label="Categoría"
                icon={ListFilter}
                values={selectedProductCategory}
                allCount={productCategories.find(c => c.name === 'All')?.count || 0}
                options={productCategories.filter(c => c.name !== 'All')}
                onChange={setSelectedProductCategory}
                isOpen={activeDropdown === 'category'}
                onToggle={() => setActiveDropdown(activeDropdown === 'category' ? 'none' : 'category')}
                variant="orange"
              />

              <MultiFilterDropdown
                label="Proveedor"
                icon={Users}
                values={selectedProvider}
                allCount={providers.find(p => p.name === 'All')?.count || 0}
                options={providers.filter(p => p.name !== 'All')}
                onChange={setSelectedProvider}
                isOpen={activeDropdown === 'provider'}
                onToggle={() => setActiveDropdown(activeDropdown === 'provider' ? 'none' : 'provider')}
                variant="indigo"
              />

              <MultiFilterDropdown
                label="Origen"
                icon={Globe}
                values={selectedOrigin}
                allCount={origins.find(o => o.name === 'All')?.count || 0}
                options={origins.filter(o => o.name !== 'All')}
                onChange={setSelectedOrigin}
                isOpen={activeDropdown === 'origin'}
                onToggle={() => setActiveDropdown(activeDropdown === 'origin' ? 'none' : 'origin')}
                variant="indigo"
              />

              <MultiFilterDropdown
                label="Análisis ABC"
                icon={BarChart3}
                values={selectedCategory}
                allCount={abcCategories.find(a => a.name === 'All')?.count || 0}
                options={abcCategories.filter(a => a.name !== 'All')}
                onChange={setSelectedCategory}
                isOpen={activeDropdown === 'abc'}
                onToggle={() => setActiveDropdown(activeDropdown === 'abc' ? 'none' : 'abc')}
                variant="indigo"
              />

              <MultiFilterDropdown
                label="Etiqueta"
                icon={Archive}
                values={selectedTag}
                allCount={productTags.find(t => t.name === 'All')?.count || 0}
                options={productTags.filter(t => t.name !== 'All')}
                onChange={setSelectedTag}
                isOpen={activeDropdown === 'tag'}
                onToggle={() => setActiveDropdown(activeDropdown === 'tag' ? 'none' : 'tag')}
                variant="amber"
              />

              {selectedWarehouseId && (
                <MultiFilterDropdown
                  label="ABC Sucursal"
                  icon={Store}
                  values={selectedCategoryStore}
                  allCount={abcStoreCategories.find(a => a.name === 'All')?.count || 0}
                  options={abcStoreCategories.filter(a => a.name !== 'All')}
                  onChange={setSelectedCategoryStore}
                  isOpen={activeDropdown === 'abc_store'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'abc_store' ? 'none' : 'abc_store')}
                  variant="amber"
                />
              )}

              <MultiFilterDropdown
                label="Cobertura"
                icon={Clock}
                values={transferCoverageFilter}
                allCount={coverageOptions.find(o => o.name === 'All')?.count || 0}
                options={coverageFilterChoices}
                onChange={(values) => setTransferCoverageFilter(values as CoverageFilterOption[])}
                isOpen={activeDropdown === 'coverage'}
                onToggle={() => setActiveDropdown(activeDropdown === 'coverage' ? 'none' : 'coverage')}
                variant="cyan"
              />

              <DebouncedSearchInput
                value={transferSearchTerm}
                onChange={setTransferSearchTerm}
                placeholder={selectedProductIds.length > 0 ? "Buscar otro producto para agregar..." : "Buscar producto..."}
                icon={Search}
                focusColor="group-focus-within:text-purple-400"
                className="w-full bg-slate-800/50 border border-slate-700/50 text-white pl-10 pr-4 py-2.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-bold text-sm placeholder:text-slate-600"
              />

              <AnimatePresence mode="wait">
                {selectedProductIds.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 20 }}
                    onClick={handleClearSelection}
                    className="flex items-center gap-2 bg-red-500/10 hover:bg-red-600 border border-red-500/30 hover:border-red-500 text-red-500 hover:text-white px-4 py-2.5 rounded-2xl transition-all group active:scale-95 shadow-lg shadow-red-500/10"
                    title="Quitar todos los productos seleccionados"
                  >
                    <Trash2 size={16} className="transition-transform group-hover:scale-110" />
                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Vaciar Lista</span>
                  </motion.button>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
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
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl shadow-2xl relative flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-auto custom-scrollbar">
              <table className="transfer-sticky-scope w-full text-left border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-30 bg-slate-950 border-b border-slate-800 shadow-xl">
                  <tr className="text-slate-500 text-[10px] uppercase tracking-[0.1em] font-black">
                    <th className="px-3 py-2 w-[80px] min-w-[80px] sticky left-0 bg-slate-950 z-40">Código</th>
                    <th className="px-3 py-2 w-[300px] min-w-[300px] md:w-[450px] md:min-w-[450px] sticky left-[80px] bg-slate-950 z-40 text-left">Producto</th>
                    {transferTargetWarehouse ? (
                      <>
                        <th className="px-2 py-2 text-center w-[70px] min-w-[70px] sticky left-[380px] md:left-[530px] bg-slate-950 z-40 cursor-pointer hover:bg-slate-900 group" onClick={() => handleTransferSort('origin_coverage')}>
                          <div className="light-contrast-mini-card flex flex-col items-center bg-indigo-500/5 py-1 rounded-lg relative">
                            <Clock size={12} className="light-contrast-mini-icon mb-1 text-indigo-400/70" />
                            <span className="light-contrast-mini-label text-indigo-500/70">Cobert.</span>
                            {transferSortBy === 'origin_coverage' && (
                              <div className="absolute top-1 right-1 text-indigo-500">
                                {transferSortOrder === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                              </div>
                            )}
                          </div>
                        </th>
                        <th className="px-1 py-2 text-center w-[140px] min-w-[140px] sticky left-[450px] md:left-[600px] bg-slate-950 z-40 cursor-pointer group relative"
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

                          <AnimatePresence mode="wait">
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

                          <AnimatePresence mode="wait">
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
                          <div className="light-contrast-mini-card flex flex-col items-center bg-purple-500/5 py-1 rounded-lg relative">
                            <Clock size={12} className="light-contrast-mini-icon mb-1 text-purple-400/70" />
                            <span className="light-contrast-mini-label text-purple-500/70">Cobert.</span>
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
                        <th
                          className="px-2 py-2 text-center w-[70px] min-w-[70px] sticky bg-slate-950 z-40 cursor-pointer hover:bg-slate-900 group"
                          onClick={() => handleTransferSort('dest_coverage')}
                          style={getTransferStickyLeftStyle(0)}
                        >
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
                        <th
                          className="px-2 py-3 text-center w-[100px] min-w-[100px] sticky bg-slate-950 z-40"
                          style={getTransferStickyLeftStyle(70)}
                        >
                          <div className="light-contrast-current-branch light-contrast-current-branch-purple flex flex-col items-center bg-purple-500/20 py-1.5 rounded-xl ring-1 ring-purple-500/30 shadow-lg shadow-purple-500/5 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent opacity-50"></div>
                            <Store size={14} className="light-contrast-current-branch-icon mb-1 text-purple-300 relative z-10" />
                            <span className="light-contrast-current-branch-name text-purple-200 text-[10px] font-black relative z-10 drop-shadow-sm truncate max-w-full px-1">
                              {isTransferConsolidatedView
                                ? (warehouseColumnFilter === 'TOTAL_ALL' ? 'TOTAL GLOBAL' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'TOTAL NUBA' : 'TOTAL ANDYS')
                                : (selectedWarehouseName || 'Principal')}
                            </span>
                            <div className="flex items-center gap-1 mt-0.5 relative z-10">
                              <span className="flex w-1 h-1 rounded-full bg-purple-400 animate-pulse"></span>
                              <span className="light-contrast-current-branch-caption text-[7px] text-purple-400/90 uppercase font-black tracking-widest">Sucursal Actual</span>
                            </div>
                          </div>
                        </th>
                        {!isTransferConsolidatedView && !isSelectedWarehouseSimple && showExtraSales && (
                          <th
                            className="px-1 py-2 text-center min-w-[52px] bg-slate-950 sticky z-40"
                            style={getTransferStickyLeftStyle(currentBranchStickyOffsets.sales)}
                          >
                            <div className="flex flex-col items-center">
                              <span className="text-[7px] font-black text-cyan-400 uppercase tracking-tighter">VTA</span>
                              <span className="text-[6px] text-cyan-700">{salesPeriodDays}d</span>
                            </div>
                          </th>
                        )}
                        {!isTransferConsolidatedView && !isSelectedWarehouseSimple && showExtraCoverage && (
                          <th
                            className="px-1 py-2 text-center min-w-[55px] bg-slate-950 sticky z-40"
                            style={getTransferStickyLeftStyle(currentBranchStickyOffsets.coverage)}
                          >
                            <div className="flex flex-col items-center">
                              <span className="text-[7px] font-black text-emerald-400 uppercase tracking-tighter">COV</span>
                              <span className="text-[6px] text-emerald-800">días</span>
                            </div>
                          </th>
                        )}
                        {!isTransferConsolidatedView && !isSelectedWarehouseSimple && showExtraABC && (
                          <th
                            className="px-1 py-2 text-center min-w-[48px] bg-slate-950 sticky z-40"
                            style={getTransferStickyLeftStyle(currentBranchStickyOffsets.abc)}
                          >
                            <span className="light-contrast-colhead light-contrast-colhead-abc text-[7px] font-black text-indigo-400 uppercase tracking-tighter">ABC</span>
                          </th>
                        )}
                        {!isTransferConsolidatedView && !isSelectedWarehouseSimple && showMinMax && (
                          <th
                            className="px-1 py-2 text-center min-w-[58px] bg-slate-950 sticky z-40"
                            style={getTransferStickyLeftStyle(currentBranchStickyOffsets.minMax)}
                          >
                            <span className="light-contrast-chip light-contrast-colhead light-contrast-colhead-minmax text-[7px] font-black text-slate-400 uppercase tracking-tighter">MIN/MAX</span>
                          </th>
                        )}
                        {!isTransferConsolidatedView && !isSelectedWarehouseSimple && showCost && (
                          <th
                            className="px-1 py-2 text-center min-w-[50px] bg-slate-950 sticky z-40"
                            style={getTransferStickyLeftStyle(currentBranchStickyOffsets.cost)}
                          >
                            <span className="light-contrast-colhead light-contrast-colhead-cost text-[7px] font-black text-violet-400 uppercase tracking-tighter">COSTO (Bs.)</span>
                          </th>
                        )}
                        {!isTransferConsolidatedView && !isSelectedWarehouseSimple && showSalePrice && (
                          <th
                            className="px-1 py-2 text-center min-w-[50px] bg-slate-950 sticky z-40"
                            style={getTransferStickyLeftStyle(currentBranchStickyOffsets.salePrice)}
                          >
                            <span className="light-contrast-colhead light-contrast-colhead-price text-[7px] font-black text-violet-400 uppercase tracking-tighter">PRECIO (Bs.)</span>
                          </th>
                        )}
                        {!isTransferConsolidatedView && !isSelectedWarehouseSimple && showMargin && (
                          <th
                            className="px-1 py-2 text-center min-w-[55px] bg-slate-950 sticky z-40"
                            style={getTransferStickyLeftStyle(currentBranchStickyOffsets.margin)}
                          >
                            <span className="light-contrast-colhead light-contrast-colhead-margin text-[7px] font-black text-violet-400 uppercase tracking-tighter">MARGEN %</span>
                          </th>
                        )}
                        {!isSelectedWarehouseSimple && showListPrice && (
                          <th
                            className="px-1 py-2 text-center min-w-[50px] bg-slate-950 sticky z-40"
                            style={getTransferStickyLeftStyle(currentBranchStickyOffsets.listPrice)}
                          >
                            <span className="text-[7px] font-black text-cyan-400 uppercase tracking-tighter">P. Lista</span>
                          </th>
                        )}
                        {!isSelectedWarehouseSimple && showPrevListPrice && (
                          <th
                            className="px-1 py-2 text-center min-w-[50px] bg-slate-950 sticky z-40"
                            style={getTransferStickyLeftStyle(currentBranchStickyOffsets.prevListPrice)}
                          >
                            <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter">P. Ant.</span>
                          </th>
                        )}
                        {!isSelectedWarehouseSimple && showPriceHistory && (
                          <th
                            className="px-1 py-2 text-center min-w-[60px] bg-slate-950 sticky z-40"
                            style={getTransferStickyLeftStyle(currentBranchStickyOffsets.priceHistory)}
                          >
                            <span className="text-[7px] font-black text-amber-400 uppercase tracking-tighter">F. Act.</span>
                          </th>
                        )}

                        {/* Machine Learning Headers */}
                        {currentView === 'ml' && showMLColumns && (
                          <>
                            <th className="px-3 py-3 text-center min-w-[100px] bg-slate-900 border-l border-indigo-500/20 border-b border-indigo-500/20 sticky z-40"
                              style={getTransferStickyLeftStyle(currentBranchStickyOffsets.prediction)}
                            >
                              <div className="flex flex-col items-center">
                                <TrendingUp size={12} className="mb-1 text-indigo-400" />
                                <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Predicción</span>
                              </div>
                            </th>
                            <th className="px-3 py-3 text-center min-w-[80px] bg-slate-900 border-b border-purple-500/20 sticky z-40"
                              style={getTransferStickyLeftStyle(currentBranchStickyOffsets.leadTime)}
                            >
                              <div className="flex flex-col items-center">
                                <Clock size={12} className="mb-1 text-purple-400" />
                                <span className="text-[9px] text-purple-400 font-black uppercase tracking-widest">LeadTime</span>
                              </div>
                            </th>
                            <th className="px-3 py-3 text-center min-w-[90px] bg-slate-900 border-b border-rose-500/20 sticky z-40"
                              style={getTransferStickyLeftStyle(currentBranchStickyOffsets.risk)}
                            >
                              <div className="flex flex-col items-center">
                                <AlertTriangle size={12} className="mb-1 text-rose-400" />
                                <span className="text-[9px] text-rose-400 font-black uppercase tracking-widest">Riesgo</span>
                              </div>
                            </th>
                          </>
                        )}
                        {isTransferConsolidatedView && (
                          <React.Fragment key="consolidated-header-ml">
                            <th
                              className={`px-2 py-3 text-center w-[85px] min-w-[85px] border-l-2 relative overflow-hidden sticky z-40 ${warehouseColumnFilter === 'TOTAL_ALL' ? 'bg-slate-950 border-indigo-500/40' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'bg-slate-950 border-emerald-500/40' : 'bg-slate-950 border-amber-500/40'}`}
                              style={getTransferStickyLeftStyle(0)}
                            >
                              <div className={`absolute inset-0 opacity-30 ${warehouseColumnFilter === 'TOTAL_ALL' ? 'bg-gradient-to-b from-indigo-500/20 to-transparent' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'bg-gradient-to-b from-emerald-500/20 to-transparent' : 'bg-gradient-to-b from-amber-500/20 to-transparent'}`}></div>
                              <div className="flex flex-col items-center relative z-10">
                                <TrendingUp size={14} className={`mb-1 ${warehouseColumnFilter === 'TOTAL_ALL' ? 'text-indigo-400' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'text-emerald-400' : 'text-amber-400'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${warehouseColumnFilter === 'TOTAL_ALL' ? 'text-indigo-300 drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'text-emerald-300 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'text-amber-300 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]'}`}>
                                  {warehouseColumnFilter === 'TOTAL_ALL' ? 'TOTAL GLOBAL' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'TOTAL NUBA' : 'TOTAL ANDYS'}
                                </span>
                                <div className={`mt-1.5 px-2 py-0.5 rounded-full text-[7px] font-black text-white ${warehouseColumnFilter === 'TOTAL_ALL' ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]'}`}>CONSOLIDADO</div>
                              </div>
                            </th>
                            {showExtraSales && <th className="px-2 py-3 text-center w-[52px] min-w-[52px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.sales)}><div className="flex flex-col items-center"><span className="text-[8px] font-black text-white/90 uppercase tracking-tighter">VTA T</span><span className={`text-[6px] font-bold ${warehouseColumnFilter === 'TOTAL_ALL' ? 'text-indigo-500' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'text-emerald-500' : 'text-amber-500'}`}>{salesPeriodDays} DÍAS</span></div></th>}
                            {showExtraCoverage && <th className="px-2 py-3 text-center w-[55px] min-w-[55px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.coverage)}><div className="flex flex-col items-center"><span className="text-[8px] font-black text-white/90 uppercase tracking-tighter">COV T</span><span className={`text-[6px] font-bold ${warehouseColumnFilter === 'TOTAL_ALL' ? 'text-indigo-500' : warehouseColumnFilter === 'TOTAL_NUBA' ? 'text-emerald-500' : 'text-amber-500'}`}>GLOBAL</span></div></th>}
                            {showExtraABC && <th className="px-2 py-3 text-center w-[48px] min-w-[48px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.abc)}><span className="text-[8px] font-black text-white/90 uppercase tracking-tighter">ABC T</span></th>}
                            {showMinMax && <th className="px-2 py-3 text-center w-[58px] min-w-[58px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.minMax)}><span className="text-[8px] font-black text-white/90 uppercase tracking-tighter">M/M T</span></th>}
                            {showCost && <th className="px-2 py-3 text-center w-[50px] min-w-[50px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.cost)}><span className="text-[8px] font-black text-violet-400 uppercase tracking-tighter">C. T</span></th>}
                            {showSalePrice && <th className="px-2 py-3 text-center w-[50px] min-w-[50px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.salePrice)}><span className="text-[8px] font-black text-violet-400 uppercase tracking-tighter">P. T</span></th>}
                            {showMargin && <th className="px-2 py-3 text-center w-[55px] min-w-[55px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.margin)}><span className="text-[8px] font-black text-violet-400 uppercase tracking-tighter">M. T</span></th>}
                            {showListPrice && (warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ANDYS') && <th className="px-2 py-3 text-center w-[50px] min-w-[50px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.listPrice)}><span className="text-[8px] font-black text-cyan-400 uppercase tracking-tighter">P.Lista</span></th>}
                            {showPrevListPrice && (warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ANDYS') && <th className="px-2 py-3 text-center w-[50px] min-w-[50px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.prevListPrice)}><span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">P.Ant</span></th>}
                            {showPriceHistory && (warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ANDYS') && <th className="px-2 py-3 text-center w-[60px] min-w-[60px] border-b border-white/5 sticky z-40 bg-slate-950" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.priceHistory)}><span className="text-[8px] font-black text-amber-400 uppercase tracking-tighter">F.Act</span></th>}
                            <th className="p-0 w-[2px] min-w-[2px] sticky z-40 pointer-events-none bg-transparent" style={getTransferStickyLeftStyle(currentBranchConsolidatedStickyOffsets.end)}></th>
                          </React.Fragment>
                        )}
                        {visibleWarehouses.map(wh => {
                          const whNameUp = (wh.name || '').toUpperCase();
                          const isSimple = isSimpleWarehouseName(whNameUp);
                          const isVirtualWh = !!(wh as any)._is_virtual;
                          return (
                            <React.Fragment key={wh.id}>
                              <th className={`px-2 py-2 text-center min-w-[90px] transition-colors border-l border-slate-800/50 group relative overflow-hidden ${isVirtualWh ? 'cursor-default' : 'cursor-pointer hover:bg-slate-800'}`}
                                onClick={() => !isVirtualWh && setTransferTargetWarehouse(wh.id)}
                                title={isVirtualWh ? wh.name : "Haz clic para solicitar traspaso desde esta sucursal"}
                              >
                                <div className={`absolute inset-x-0 top-0 h-0.5 transition-colors ${isVirtualWh ? 'bg-orange-500/30' : 'bg-slate-700/50 group-hover:bg-indigo-500/50'}`}></div>
                                <div className="flex flex-col items-center py-1">
                                  <Store size={11} className={`mb-0.5 transition-colors ${isVirtualWh ? 'text-orange-500/60' : 'text-slate-600 group-hover:text-indigo-400'}`} />
                                  <span className="text-[8px] font-black text-slate-500 group-hover:text-slate-300 text-center leading-tight max-w-[80px] mb-1 uppercase tracking-tighter transition-colors">{wh.name}</span>
                                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border transition-all ${isVirtualWh ? 'bg-orange-500/10 border-orange-500/20' : 'bg-slate-800/50 border-slate-700/30 group-hover:border-indigo-500/30'}`}>
                                    <span className={`text-[7px] font-black uppercase tracking-tighter ${isVirtualWh ? 'text-orange-400/70' : 'text-slate-400 group-hover:text-indigo-300'}`}>STOCK</span>
                                  </div>
                                  {!isVirtualWh && (
                                    <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <PlusCircle size={8} className="text-indigo-500" />
                                      <span className="text-[6px] text-indigo-500 uppercase font-black tracking-widest">Pedir</span>
                                    </div>
                                  )}
                                </div>
                              </th>
                              {!isSimple && showExtraSales && (
                                <th className="px-1 py-2 text-center min-w-[52px] bg-cyan-950/30">
                                  <div className="flex flex-col items-center">
                                    <span className="text-[7px] font-black text-cyan-400 uppercase tracking-tighter">VTA</span>
                                    <span className="text-[6px] text-cyan-700">{salesPeriodDays}d</span>
                                  </div>
                                </th>
                              )}
                              {!isSimple && showExtraCoverage && (
                                <th className="px-1 py-2 text-center min-w-[48px] bg-emerald-950/30">
                                  <div className="flex flex-col items-center">
                                    <span className="text-[7px] font-black text-emerald-400 uppercase tracking-tighter">COV</span>
                                    <span className="text-[6px] text-emerald-800">días</span>
                                  </div>
                                </th>
                              )}
                              {!isSimple && showExtraABC && (
                                <th className="px-1 py-2 text-center min-w-[48px] bg-indigo-950/30">
                                  <span className="light-contrast-colhead light-contrast-colhead-abc text-[7px] font-black text-indigo-400 uppercase tracking-tighter">ABC</span>
                                </th>
                              )}
                              {!isSimple && showMinMax && (
                                <th className="px-1 py-2 text-center min-w-[58px] bg-slate-800/20">
                                  <span className="light-contrast-chip light-contrast-colhead light-contrast-colhead-minmax text-[7px] font-black text-slate-400 uppercase tracking-tighter">MIN/MAX</span>
                                </th>
                              )}
                              {!isTransferConsolidatedView && !isSimple && showCost && (
                                <th className="px-1 py-2 text-center min-w-[50px] bg-violet-950/20">
                                  <span className="light-contrast-colhead light-contrast-colhead-cost text-[7px] font-black text-violet-400 uppercase tracking-tighter">COSTO</span>
                                </th>
                              )}
                              {!isTransferConsolidatedView && !isSimple && showSalePrice && (
                                <th className="px-1 py-2 text-center min-w-[50px] bg-fuchsia-950/20">
                                  <span className="text-[7px] font-black text-fuchsia-400 uppercase tracking-tighter">PRECIO</span>
                                </th>
                              )}
                              {!isTransferConsolidatedView && !isSimple && showMargin && (
                                <th className="px-1 py-2 text-center min-w-[55px] bg-pink-950/20">
                                  <span className="text-[7px] font-black text-pink-400 uppercase tracking-tighter">MARGEN %</span>
                                </th>
                              )}
                              {false && !isTransferConsolidatedView && !isSimple && showListPrice && (
                                <th className="px-1 py-2 text-center min-w-[50px] bg-cyan-950/20">
                                  <span className="text-[7px] font-black text-cyan-400 uppercase tracking-tighter">P.Lista</span>
                                </th>
                              )}
                              {false && !isTransferConsolidatedView && !isSimple && showPrevListPrice && (
                                <th className="px-1 py-2 text-center min-w-[50px] bg-blue-950/20">
                                  <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter">P.Ant</span>
                                </th>
                              )}
                              {false && !isTransferConsolidatedView && !isSimple && showPriceHistory && (
                                <th className="px-1 py-2 text-center min-w-[60px] bg-amber-950/20">
                                  <span className="text-[7px] font-black text-amber-400 uppercase tracking-tighter">F.Act</span>
                                </th>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </>
                    )}


                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const isML = currentView === 'ml';
const _cbso = getTransferCurrentBranchExtraStickyOffsets({ showExtraSales, showExtraCoverage, showExtraABC, showMinMax, showMLColumns: isML && showMLColumns, showCost, showSalePrice, showMargin, showListPrice, showPrevListPrice, showPriceHistory });
const _csso = getTransferConsolidatedStickyOffsets({ showExtraSales, showExtraCoverage, showExtraABC, showMinMax, showMLColumns: isML && showMLColumns, showCost, showSalePrice, showMargin, showListPrice, showPrevListPrice, showPriceHistory });
                    return sortedTransferProducts.slice(0, displayLimitTransfer).map((p: any, idx: number) => (
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
                        showExtraABC={showExtraABC}
                        showExtraCoverage={showExtraCoverage}
                        showExtraSales={showExtraSales}
                        showMLColumns={showMLColumns}
                        showMinMax={showMinMax}
                        showCost={showCost}
                        showSalePrice={showSalePrice}
                        showMargin={showMargin}
                        showListPrice={showListPrice && (warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ANDYS')}
                        showPrevListPrice={showPrevListPrice && (warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ANDYS')}
                        showPriceHistory={showPriceHistory && (warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ANDYS')}
                        salesPeriodDays={salesPeriodDays}
                        consolidatedView={warehouseColumnFilter === 'TOTAL_NUBA' || warehouseColumnFilter === 'TOTAL_ANDYS' || warehouseColumnFilter === 'TOTAL_ALL'}
                        currentBranchStickyOffsets={_cbso}
                        consolidatedStickyOffsets={_csso}
                        onAddProduct={handlePinProduct}
                        isPinned={selectedProductIds.includes(Number(p.id))}
                      />
                    ));
                  })()}

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
      ) : currentView === 'purchases' ? (
        /* ===== PURCHASES VIEW ===== */
        <main className="w-full mx-auto px-2 md:px-6 py-4 md:py-8 space-y-4 md:space-y-8">

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
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                    <ShoppingCart size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                      Órdenes de Compra
                      {!purchasesLoading && purchasesLoaded && (
                        <span className="text-[12px] font-black text-amber-400 bg-amber-500/10 px-3 py-0.5 rounded-full border border-amber-500/20">
                          {filteredPurchaseOrders.length}
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                      Todas las órdenes de compra desde Odoo
                    </p>
                  </div>
                </div>
              </div>

              {/* Filters + Actions */}
              <div className="flex flex-wrap items-center gap-3">
                {/* State filter chips */}
                <div className="flex items-center gap-1.5 bg-slate-800/30 px-3 py-2 rounded-2xl border border-slate-700/50">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider mr-1">Estado:</span>
                  {[
                    { key: 'all',      label: 'Todos' },
                    { key: 'draft',    label: 'Borrador' },
                    { key: 'sent',     label: 'Enviado' },
                    { key: 'purchase', label: 'OC' },
                    { key: 'done',     label: 'Hecho' },
                    { key: 'cancel',   label: 'Cancelado' },
                  ].map(s => (
                    <button
                      key={s.key}
                      onClick={() => setPurchasesFilterState(s.key)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                        purchasesFilterState === s.key
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                          : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 bg-slate-800/30 px-3 py-2 rounded-2xl border border-slate-700/50">
                  <Search size={14} className="text-slate-500 shrink-0" />
                  <input
                    type="text"
                    value={purchasesSearch}
                    onChange={e => setPurchasesSearch(e.target.value)}
                    placeholder="Buscar OC, producto, proveedor..."
                    className="bg-transparent text-xs text-white placeholder-slate-600 outline-none w-44"
                  />
                  {purchasesSearch && (
                    <button onClick={() => setPurchasesSearch('')} className="text-slate-600 hover:text-white transition-colors">
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Date range filter */}
                <div className="flex items-center gap-2 bg-slate-800/30 px-3 py-2 rounded-2xl border border-slate-700/50">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Fecha:</span>
                  <input
                    type="date"
                    value={purchasesDateFrom}
                    onChange={e => setPurchasesDateFrom(e.target.value)}
                    className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer"
                    title="Desde"
                  />
                  <span className="text-slate-600 text-xs">—</span>
                  <input
                    type="date"
                    value={purchasesDateTo}
                    onChange={e => setPurchasesDateTo(e.target.value)}
                    className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer"
                    title="Hasta"
                  />
                  {(purchasesDateFrom || purchasesDateTo) && (
                    <button onClick={() => { setPurchasesDateFrom(''); setPurchasesDateTo(''); }} className="text-slate-600 hover:text-white transition-colors">
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Refresh */}
                <button
                  onClick={fetchPurchaseOrders}
                  disabled={purchasesLoading}
                  className="p-2 bg-slate-800/30 border border-slate-700/50 rounded-2xl text-slate-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all"
                  title="Recargar desde Odoo"
                >
                  <RefreshCw size={16} className={purchasesLoading ? 'animate-spin text-amber-400' : ''} />
                </button>
              </div>
            </div>
          </section>

          {/* Table */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden pb-2">
            {purchasesLoading && !purchasesLoaded ? (
              <div className="py-24 flex flex-col items-center gap-4">
                <RefreshCw size={32} className="animate-spin text-amber-400" />
                <p className="text-sm text-slate-400 font-black uppercase tracking-widest">Consultando Odoo...</p>
                <p className="text-xs text-slate-600">Esto puede tardar unos segundos</p>
              </div>
            ) : purchasesError ? (
              <div className="py-24 flex flex-col items-center gap-4">
                <AlertTriangle size={32} className="text-rose-500" />
                <p className="text-sm text-rose-400 font-bold">{purchasesError}</p>
                <button
                  onClick={fetchPurchaseOrders}
                  className="text-xs text-amber-400 underline hover:no-underline"
                >
                  Reintentar
                </button>
              </div>
            ) : !purchasesLoaded ? (
              <div className="py-24 flex flex-col items-center gap-4">
                <ShoppingCart size={32} className="text-slate-600" />
                <p className="text-sm text-slate-500 font-black uppercase tracking-widest">Sin datos</p>
                <button
                  onClick={fetchPurchaseOrders}
                  className="text-xs text-amber-400 underline hover:no-underline"
                >
                  Cargar órdenes
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800">
                    <tr>
                      {[
                        { key: 'order_ref',       label: 'Referencia' },
                        { key: 'barcode',         label: 'Cód. Barras' },
                        { key: 'description',     label: 'Descripción' },
                        { key: 'qty',             label: 'Cantidad' },
                        { key: 'qty_received',    label: 'Cant. Recibida' },
                        { key: 'qty_invoiced',    label: 'Cant. Facturada' },
                        { key: 'entregar_a',      label: 'Entregar A' },
                        { key: 'date_planned',    label: 'Fecha Límite' },
                        { key: 'date_approve',    label: 'Fecha Aprobación' },
                        { key: 'date_order',      label: 'Fecha Orden' },
                        { key: 'supplier',        label: 'Proveedor' },
                        { key: 'state_label',     label: 'Estado' },
                        { key: 'delivery_status', label: 'Estado Entrega' },
                        { key: 'buyer',           label: 'Comprador' },
                      ].map(col => (
                        <th
                          key={col.key}
                          className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.12em] cursor-pointer hover:text-amber-400 transition-colors whitespace-nowrap select-none"
                          onClick={() => {
                            if (purchasesSortKey === col.key) {
                              setPurchasesSortDir(d => d === 'asc' ? 'desc' : 'asc');
                            } else {
                              setPurchasesSortKey(col.key);
                              setPurchasesSortDir('desc');
                            }
                          }}
                        >
                          <span className="flex items-center gap-1">
                            {col.label}
                            {purchasesSortKey === col.key && (
                              purchasesSortDir === 'asc' ? <ArrowUp size={9} /> : <ArrowDown size={9} />
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredPurchaseOrders.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-16 text-center text-slate-600 font-black uppercase text-xs tracking-widest">
                          No hay órdenes de compra
                        </td>
                      </tr>
                    ) : filteredPurchaseOrders.slice(0, purchasesVisibleCount).map((line: any) => (
                      <tr key={line.line_id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-2 font-mono text-amber-400 font-black whitespace-nowrap">{line.order_ref}</td>
                        <td className="px-4 py-2 font-mono text-slate-500 text-[10px]">{line.barcode || '—'}</td>
                        <td className="px-4 py-2 text-white whitespace-nowrap">{line.description.replace(/^\[.*?\]\s*/, '')}</td>
                        <td className="px-4 py-2 text-center font-mono text-cyan-400 font-black">{Number(line.qty).toFixed(2)}</td>
                        <td className="px-4 py-2 text-center font-mono text-violet-400">{Number(line.qty_received).toFixed(2)}</td>
                        <td className="px-4 py-2 text-center font-mono text-slate-400">{Number(line.qty_invoiced).toFixed(2)}</td>
                        <td className="px-4 py-2 text-slate-300 whitespace-nowrap">{line.entregar_a || '—'}</td>
                        <td className="px-4 py-2 text-slate-400 whitespace-nowrap">{line.date_planned ? String(line.date_planned).slice(0, 10) : '—'}</td>
                        <td className="px-4 py-2 text-slate-400 whitespace-nowrap">{line.date_approve ? String(line.date_approve).slice(0, 16).replace('T', ' ') : '—'}</td>
                        <td className="px-4 py-2 text-slate-400 whitespace-nowrap">{line.date_order ? String(line.date_order).slice(0, 16).replace('T', ' ') : '—'}</td>
                        <td className="px-4 py-2 text-slate-300 whitespace-nowrap">{line.supplier || '—'}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-lg border text-[8px] font-black tracking-widest uppercase ${
                            line.state_raw === 'purchase' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : line.state_raw === 'done' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                            : line.state_raw === 'cancel' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            : line.state_raw === 'sent' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            : 'bg-slate-700/30 border-slate-600/30 text-slate-400'
                          }`}>
                            {line.state_label}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-400 text-[10px] whitespace-nowrap">{line.delivery_status || '—'}</td>
                        <td className="px-4 py-2 text-slate-300">{line.buyer || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Load more */}
          {purchasesLoaded && filteredPurchaseOrders.length > purchasesVisibleCount && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setPurchasesVisibleCount(v => v + 500)}
                className="px-6 py-2 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-xs font-black text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all uppercase tracking-wider"
              >
                Cargar más — {filteredPurchaseOrders.length - purchasesVisibleCount} restantes
              </button>
            </div>
          )}

          {/* Refresh overlay while re-loading */}
          {purchasesLoading && purchasesLoaded && (
            <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-2xl shadow-xl text-xs font-black uppercase tracking-wider">
              <RefreshCw size={14} className="animate-spin" />
              Actualizando...
            </div>
          )}
        </main>
      ) : null
      }

      {/* ABC Modal */}
      <AnimatePresence mode="wait">
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
      <AnimatePresence mode="wait">
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
      <AnimatePresence mode="wait">
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
                            {(() => { const d = new Date(order.timestamp); const pad = (n: number) => String(n).padStart(2,'0'); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; })()}
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
      <AnimatePresence mode="wait">
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
      <AnimatePresence mode="wait">
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
                    const cov = selectedProduct.coverage_global ?? selectedProduct.coverage;
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
                              const wid = String(w.id);
                              const sales = salesPeriodDays === 90 ? (selectedProduct.sales_by_wh_90d?.[wid] || 0)
                                : salesPeriodDays === 180 ? (selectedProduct.sales_by_wh_180d?.[wid] || 0)
                                  : (selectedProduct.sales_by_wh?.[w.id] || 0);
                              return stock > 0 || sales > 0;
                            }).map((wh) => {
                              const stock = selectedProduct.stock_by_wh?.[wh.id] || 0;
                              const wid = String(wh.id);
                              const sales = salesPeriodDays === 90 ? (selectedProduct.sales_by_wh_90d?.[wid] || 0)
                                : salesPeriodDays === 180 ? (selectedProduct.sales_by_wh_180d?.[wid] || 0)
                                  : (selectedProduct.sales_by_wh?.[wh.id] || 0);
                              const abc = selectedProduct.abc_by_wh?.[wh.id]?.category || 'E';
                              const cov = getCoverageDays(stock, sales, salesPeriodDays) ?? (stock > 0 ? 999 : 0);
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
      <AnimatePresence mode="wait">
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
      <AnimatePresence mode="wait">
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
      <AnimatePresence mode="wait">
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

            if (warehouseColumnFilter === 'NUBA' || warehouseColumnFilter === 'TOTAL_NUBA') {
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

            return matchesWarehouseColumnScope(w, warehouseColumnFilter);
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
      <AnimatePresence mode="wait">
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
      <AnimatePresence mode="wait">
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
                                <tr key={s.id != null ? s.id : (s.name ?? idx)} className="border-b border-slate-800/30 hover:bg-emerald-500/5 transition-all group/row relative">
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
                                <tr key={s.id != null ? s.id : (s.name ?? idx)} className="border-b border-slate-800/30 hover:bg-amber-500/5 transition-all group/row relative">
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

      {/* Purchase Analysis Modal */}
      <AnimatePresence mode="wait">
        {showPurchaseAnalysisModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setShowPurchaseAnalysisModal(false); setPaSupplierSearch(''); setPaWarehouseSearch(''); setPaCategorySearch(''); setPaStep(1); }} />
<motion.div
               key={showPurchaseAnalysisModal ? 'purchase-analysis-modal' : null}
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative z-10 w-full max-w-[95vw] md:max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
             >
              {/* Loading Overlay */}
              <AnimatePresence mode="wait">
                {paExporting && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center gap-4"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
                      <BarChart3 size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sky-400" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Analizando Datos</h3>
                      <p className="text-[10px] text-slate-400 font-medium">Consultando ventas en tiempo real con Odoo...</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-500/10 rounded-xl">
                    <BarChart3 size={18} className="text-sky-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white tracking-tight">Análisis de Compras</h2>
                    <p className="text-[10px] text-slate-500 font-medium">{paStep === 1 ? 'Paso 1 de 2 — Fechas, Almacenes y Proveedores' : 'Paso 2 de 2 — Cobertura por ABC'}</p>
                  </div>
                </div>
                <button onClick={() => { setShowPurchaseAnalysisModal(false); setPaSupplierSearch(''); setPaWarehouseSearch(''); setPaCategorySearch(''); setPaStep(1); }} className="p-2 hover:bg-slate-700 rounded-xl transition-colors text-slate-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
              {paStep === 2 ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">Definí cuántos días de cobertura corresponden a cada clasificación ABC. Estos valores se incluirán como columna en el Excel exportado.</p>
                  {(() => {
                    const abcOrder = ['AA', 'A', 'B', 'C', 'D', 'E'];
                    const abcClasses = abcOrder;
                    const abcColors: Record<string, string> = {
                      AA: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
                      A:  'border-amber-500/30 bg-amber-500/5 text-amber-500',
                      B:  'border-slate-600 bg-slate-800/50 text-slate-300',
                      C:  'border-slate-700 bg-slate-900/50 text-slate-400',
                      D:  'border-slate-700 bg-slate-900/30 text-slate-500',
                      E:  'border-slate-800 bg-slate-900/20 text-slate-600',
                    };
                    return abcClasses.map(cls => (
                      <div key={cls} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${abcColors[cls] || 'border-slate-700 bg-slate-900/20 text-slate-500'}`}>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-black w-8 text-center px-1.5 py-0.5 rounded border ${abcColors[cls] || 'border-slate-700 text-slate-500'}`}>{cls}</span>
                          <span className="text-xs text-slate-400 font-medium">Cobertura</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="—"
                            value={paCoverage[cls] ?? ''}
                            onChange={e => setPaCoverage(prev => ({ ...prev, [cls]: e.target.value }))}
                            className="w-24 bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-lg px-3 py-1.5 text-sm text-white text-right focus:outline-none transition-colors"
                          />
                          <span className="text-xs text-slate-500 w-8">días</span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              ) : !purchasesLoaded && purchasesLoading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12">
                   <div className="relative">
                      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                      <BarChart3 size={18} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400" />
                    </div>
                  <div className="text-center">
                    <p className="text-xs font-black text-white uppercase tracking-widest mb-1">Cargando Solicitudes</p>
                    <p className="text-[10px] text-slate-500 font-medium">Preparando base de datos para el análisis...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    {/* Date range */}
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Rango de Fechas (Fecha Orden)</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Desde</label>
                          <input
                            type="date"
                            value={paDateFrom}
                            onChange={e => setPaDateFrom(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Hasta</label>
                          <input
                            type="date"
                            value={paDateTo}
                            onChange={e => setPaDateTo(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Categorías */}
                    {paAvailableCategories.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Categorías <span className="text-slate-600 font-medium normal-case">{paCategories.length ? `(${paCategories.length} sel.)` : '(todas)'}</span></p>
                          <div className="flex items-center gap-2">
                            {paCategories.length < paAvailableCategories.length && (
                              <button
                                onClick={() => setPaCategories(paAvailableCategories)}
                                className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 hover:border-emerald-500/70 text-emerald-400 text-[11px] font-bold rounded-lg transition-all"
                              >
                                <CheckSquare size={12} />
                                Todas
                              </button>
                            )}
                            {paCategories.length > 0 && (
                              <button onClick={() => setPaCategories([])} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-500 text-slate-400 hover:text-white text-[11px] font-bold rounded-lg transition-all">
                                <X size={11} />
                                Limpiar
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="relative mb-2">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Buscar categoría..."
                            value={paCategorySearch}
                            onChange={e => setPaCategorySearch(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                          />
                          {paCategorySearch && (
                            <button onClick={() => setPaCategorySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-2 max-h-[30vh] overflow-y-auto space-y-0.5">
                          {paAvailableCategories
                            .filter(cat => cat.toLowerCase().includes(paCategorySearch.toLowerCase()))
                            .map((cat: string) => (
                              <label key={cat} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-700/50 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={paCategories.includes(cat)}
                                  onChange={e => setPaCategories(e.target.checked ? [...paCategories, cat] : paCategories.filter(c => c !== cat))}
                                  className="accent-sky-500 w-4 h-4"
                                />
                                <span className="text-sm text-slate-300 group-hover:text-white transition-colors truncate">{cat}</span>
                              </label>
                            ))}
                          {paAvailableCategories.filter(cat => cat.toLowerCase().includes(paCategorySearch.toLowerCase())).length === 0 && (
                            <p className="text-xs text-slate-500 text-center py-4">Sin resultados para "{paCategorySearch}"</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Almacenes */}
                    {paAvailableWarehouses.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Almacenes / Salas <span className="text-slate-600 font-medium normal-case">{paWarehouses.length ? `(${paWarehouses.length} sel.)` : '(todos)'}</span></p>
                          <div className="flex items-center gap-2">
                            {paWarehouses.length < paAvailableWarehouses.length && (
                              <button
                                onClick={() => { setPaWarehouses(paAvailableWarehouses) }}
                                className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 hover:border-emerald-500/70 text-emerald-400 text-[11px] font-bold rounded-lg transition-all"
                              >
                                <CheckSquare size={12} />
                                Todos
                              </button>
                            )}
                            {paWarehouses.length > 0 && (
                              <button onClick={() => { setPaWarehouses([]); setPaSuppliers([]); }} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-500 text-slate-400 hover:text-white text-[11px] font-bold rounded-lg transition-all">
                                <X size={11} />
                                Limpiar
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Buscador de Almacenes */}
                        <div className="relative mb-2">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Buscar almacén..."
                            value={paWarehouseSearch}
                            onChange={e => setPaWarehouseSearch(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                          />
                          {paWarehouseSearch && (
                            <button onClick={() => setPaWarehouseSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-2 max-h-[50vh] overflow-y-auto space-y-0.5">
                          {paAvailableWarehouses
                            .filter(wh => wh.toLowerCase().includes(paWarehouseSearch.toLowerCase()))
                            .map((wh: string) => (
                              <label key={wh} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-700/50 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={paWarehouses.includes(wh)}
                                  onChange={e => setPaWarehouses(e.target.checked ? [...paWarehouses, wh] : paWarehouses.filter(w => w !== wh))}
                                  className="accent-sky-500 w-4 h-4"
                                />
                                <span className="text-sm text-slate-300 group-hover:text-white transition-colors truncate">{wh}</span>
                              </label>
                            ))}
                          {paAvailableWarehouses.filter(wh => wh.toLowerCase().includes(paWarehouseSearch.toLowerCase())).length === 0 && (
                            <p className="text-xs text-slate-500 text-center py-4">Sin resultados para "{paWarehouseSearch}"</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Proveedores */}
                    {paAvailableSuppliers.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Proveedores <span className="text-slate-600 font-medium normal-case">{paSuppliers.length ? `(${paSuppliers.length} sel.)` : '(todos)'}</span></p>
                          <div className="flex items-center gap-2">
                            {paSuppliers.length < paAvailableSuppliers.length && (
                              <button
                                onClick={() => setPaSuppliers(paAvailableSuppliers)}
                                className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 hover:border-emerald-500/70 text-emerald-400 text-[11px] font-bold rounded-lg transition-all"
                              >
                                <CheckSquare size={12} />
                                Todos
                              </button>
                            )}
                            {paSuppliers.length > 0 && (
                              <button onClick={() => setPaSuppliers([])} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-500 text-slate-400 hover:text-white text-[11px] font-bold rounded-lg transition-all">
                                <X size={11} />
                                Limpiar
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Buscador */}
                        <div className="relative mb-2">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Buscar proveedor..."
                            value={paSupplierSearch}
                            onChange={e => setPaSupplierSearch(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                          />
                          {paSupplierSearch && (
                            <button onClick={() => setPaSupplierSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-2 max-h-[70vh] overflow-y-auto space-y-0.5">
                          {paAvailableSuppliers
                            .filter(sup => sup.toLowerCase().includes(paSupplierSearch.toLowerCase()))
                            .map((sup: string) => (
                              <label key={sup} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-700/50 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={paSuppliers.includes(sup)}
                                  onChange={e => setPaSuppliers(e.target.checked ? [...paSuppliers, sup] : paSuppliers.filter(s => s !== sup))}
                                  className="accent-sky-500 w-4 h-4"
                                />
                                <span className="text-sm text-slate-300 group-hover:text-white transition-colors truncate">{sup}</span>
                              </label>
                            ))}
                          {paAvailableSuppliers.filter(sup => sup.toLowerCase().includes(paSupplierSearch.toLowerCase())).length === 0 && (
                            <p className="text-xs text-slate-500 text-center py-4">Sin resultados para "{paSupplierSearch}"</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-800 flex items-center justify-between gap-3">
                <p className="text-[10px] text-slate-600 font-medium flex items-center gap-2">
                  {purchasesLoading ? (
                    <>
                      <RefreshCw size={10} className="animate-spin text-indigo-400" />
                      Cargando datos...
                    </>
                  ) : (
                    (() => {
                      let filtered = purchaseOrders as any[];
                      if (paDateFrom) filtered = filtered.filter((l: any) => (l.date_order || '').slice(0, 10) >= paDateFrom);
                      if (paDateTo)   filtered = filtered.filter((l: any) => (l.date_order || '').slice(0, 10) <= paDateTo);
                      if (paWarehouses.length) filtered = filtered.filter((l: any) => paWarehouses.includes((l.entregar_a || '').replace(/:\s*Recepciones$/i, '').trim()));
                      if (paSuppliers.length)  filtered = filtered.filter((l: any) => paSuppliers.includes(l.supplier));
                      if (paCategories.length) filtered = filtered.filter((l: any) => paCategories.includes(l.category));
                      return `${filtered.length} líneas a exportar`;
                    })()
                  )}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (paStep > 1) { setPaStep((paStep - 1) as 1 | 2); }
                      else { setShowPurchaseAnalysisModal(false); setPaSupplierSearch(''); setPaWarehouseSearch(''); setPaCategorySearch(''); setPaStep(1); }
                    }}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    {paStep > 1 ? 'Atrás' : 'Cancelar'}
                  </button>
                  {paStep === 1 ? (
                    <button
                      disabled={!paDateFrom || !paDateTo || !paWarehouses.length}
                      onClick={() => setPaStep(2)}
                      title={!paDateFrom || !paDateTo ? 'Seleccioná un rango de fechas' : !paWarehouses.length ? 'Seleccioná al menos un almacén' : ''}
                      className="px-7 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                      Siguiente →
                    </button>
                  ) : (
                    <button
                      onClick={handlePurchaseAnalysisExport}
                      disabled={paExporting || !paDateFrom || !paDateTo}
                      className="px-7 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-sky-500/20"
                    >
                      {paExporting
                        ? <><RefreshCw size={15} className="animate-spin" /> Generando...</>
                        : <><FileSpreadsheet size={15} /> Exportar Excel</>
                      }
                    </button>
                  )}
                </div>
              </div>
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
