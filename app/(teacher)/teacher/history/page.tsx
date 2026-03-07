'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  User,
  LogOut,
  XCircle
} from 'lucide-react'

const DEFAULT_LIMIT = 10
// Exited is grouped logically under "approved" in the backend, but we keep it here for specific tracking if needed
const STATUS_OPTIONS = ['all', 'approved', 'rejected', 'cancelled'] as const
const SORT_OPTIONS = ['newest', 'oldest'] as const

type StatusOption = (typeof STATUS_OPTIONS)[number]
type SortOption = (typeof SORT_OPTIONS)[number]

interface HistorySummary {
  total: number
  approved: number
  rejected: number
  cancelled: number
}

interface HistoryMeta {
  page: number
  limit: number
  totalPages: number
  totalMatching: number
}

interface HistoryStudent {
  name: string
  rollNumber: string
  class?: string
  department?: string
  email?: string
  phone?: string
  attendanceAtApply?: number
  parentName?: string
  parentContact?: string
}

interface HistoryOutpass {
  requestId: string
  status: string // 'approved' | 'rejected' | 'cancelled' | 'exited'
  reasonCategory: string
  reason?: string
  exitTime?: string
  returnTime?: string
  requestedAt?: string
  facultyApprover?: { id: string; name: string } | null
  hodApprover?: { id: string; name: string } | null
  rejectionReason?: string | null
  student: HistoryStudent
}

interface HistoryResponse {
  summary: HistorySummary
  meta: HistoryMeta
  count: number
  outpasses: HistoryOutpass[]
}

interface ClassesResponse {
  department: string
  classes: { name: string; year?: number }[]
}

const normalizeBooleanParam = (value: string | null) => value === 'true'
const normalizeStatusParam = (value: string | null): StatusOption =>
  STATUS_OPTIONS.includes((value as StatusOption) ?? 'all') ? ((value as StatusOption) ?? 'all') : 'all'
const normalizeSortParam = (value: string | null): SortOption =>
  SORT_OPTIONS.includes((value as SortOption) ?? 'newest') ? ((value as SortOption) ?? 'newest') : 'newest'
const normalizeNumberParam = (value: string | null, fallback: number) => {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

export default function FacultyHistoryPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

  const [summary, setSummary] = useState<HistorySummary>({
    total: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0
  })
  const [records, setRecords] = useState<HistoryOutpass[]>([])
  const [meta, setMeta] = useState<HistoryMeta>({ page: 1, limit: DEFAULT_LIMIT, totalPages: 0, totalMatching: 0 })
  const [classes, setClasses] = useState<ClassesResponse['classes']>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const statusFilter = normalizeStatusParam(searchParams.get('status'))
  const sortParam = normalizeSortParam(searchParams.get('sort'))
  const approvedByMe = normalizeBooleanParam(searchParams.get('approvedByMe'))
  const rejectedByMe = normalizeBooleanParam(searchParams.get('rejectedByMe'))
  const myClassOnly = normalizeBooleanParam(searchParams.get('myclass'))
  const studentRoll = searchParams.get('studentRoll')?.trim() || ''
  const classFilter = searchParams.get('class')?.trim() || ''
  const pageParam = normalizeNumberParam(searchParams.get('page'), 1)
  const limitParam = Math.min(normalizeNumberParam(searchParams.get('limit'), DEFAULT_LIMIT), 100)

  const setQueryParams = useCallback(
    (updates: Record<string, string | number | boolean | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '' || value === false) {
          params.delete(key)
        } else {
          params.set(key, String(value))
        }
      })
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname)
    },
    [pathname, router, searchParams]
  )

  const fetchClasses = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const res = await fetch(`${apiUrl}/api/faculty/classes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!res.ok) return
      const data: ClassesResponse = await res.json()
      setClasses(data.classes || [])
    } catch (err) {
      console.warn('Unable to fetch classes list:', err)
    }
  }, [apiUrl])

  const fetchHistory = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        setError(null)
        if (options?.silent) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }

        const token = localStorage.getItem('token')
        if (!token) {
          throw new Error('Authentication required. Please log in again.')
        }

        const url = new URL(`${apiUrl}/api/faculty/history`)
        if (statusFilter !== 'all') url.searchParams.set('status', statusFilter)
        if (approvedByMe) url.searchParams.set('approvedByMe', 'true')
        if (rejectedByMe) url.searchParams.set('rejectedByMe', 'true')
        if (studentRoll) url.searchParams.set('studentRoll', studentRoll)
        if (classFilter) url.searchParams.set('class', classFilter)
        if (myClassOnly) url.searchParams.set('myclass', 'true')
        if (sortParam !== 'newest') url.searchParams.set('sort', sortParam)
        if (pageParam > 1) url.searchParams.set('page', String(pageParam))
        if (limitParam !== DEFAULT_LIMIT) url.searchParams.set('limit', String(limitParam))

        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.message || 'Failed to fetch history records')
        }

        const payload: HistoryResponse = await res.json()
        setSummary(payload.summary || { total: 0, approved: 0, rejected: 0, cancelled: 0 })
        setRecords(Array.isArray(payload.outpasses) ? payload.outpasses : [])
        setMeta(payload.meta || { page: 1, limit: limitParam, totalPages: 0, totalMatching: 0 })
      } catch (err: any) {
        console.error('Failed to load history:', err)
        setSummary({ total: 0, approved: 0, rejected: 0, cancelled: 0 })
        setRecords([])
        setMeta({ page: 1, limit: limitParam, totalPages: 0, totalMatching: 0 })
        setError(err.message || 'Unable to load history. Please try again later.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [apiUrl, approvedByMe, classFilter, limitParam, myClassOnly, pageParam, rejectedByMe, sortParam, statusFilter, studentRoll]
  )

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const statusTabs = useMemo(
    () => [
      { key: 'all' as StatusOption, label: 'All', count: summary.total },
      { key: 'approved' as StatusOption, label: 'Approved', count: summary.approved },
      { key: 'rejected' as StatusOption, label: 'Rejected', count: summary.rejected },
      { key: 'cancelled' as StatusOption, label: 'Cancelled', count: summary.cancelled }
    ],
    [summary]
  )

  const categoryIcon = (category: string) => {
    const normalized = category.toLowerCase()
    if (normalized.includes('emergency')) return '🚨'
    if (normalized.includes('medical')) return '🩺'
    if (normalized.includes('travel')) return '🧳'
    if (normalized.includes('family')) return '👨‍👩‍👧‍👦'
    if (normalized.includes('academic')) return '📚'
    return '📄'
  }

  // ✅ UPDATED BADGE STYLING
  const statusClasses = (status: string) => {
    const normalized = status.toLowerCase()
    if (normalized === 'approved') return 'bg-green-50 text-green-600 border-green-200'
    if (normalized === 'exited') return 'bg-teal-50 text-teal-600 border-teal-200'
    if (normalized === 'rejected') return 'bg-red-50 text-red-600 border-red-200'
    if (normalized === 'cancelled') return 'bg-gray-50 text-gray-600 border-gray-200'
    return 'bg-gray-50 text-gray-500 border-gray-200'
  }

  // ✅ ADDED ICON FOR BADGE
  const getStatusIcon = (status: string) => {
    const normalized = status.toLowerCase()
    if (normalized === 'exited') return <LogOut className="w-3 h-3" />
    if (normalized === 'approved') return <CheckCircle className="w-3 h-3" />
    if (normalized === 'rejected') return <XCircle className="w-3 h-3" />
    return <Clock className="w-3 h-3" />
  }

  const handleRefresh = () => {
    fetchHistory({ silent: true })
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return
    setQueryParams({ page: newPage })
  }

  const classOptions = useMemo(() => classes.map(cls => cls.name), [classes])

  return (
    <div className="p-6 space-y-6">
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Outpass History</h1>
            <p className="text-sm text-gray-500">
              Review past outpass decisions across your department or your assigned class.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs uppercase text-gray-500">Total Requests</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.total}</p>
          </div>
          <div className="border border-green-200 rounded-lg p-4 bg-green-50">
            <p className="text-xs uppercase text-green-600">Approved</p>
            <p className="mt-1 text-2xl font-semibold text-green-700">{summary.approved}</p>
          </div>
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <p className="text-xs uppercase text-red-600">Rejected</p>
            <p className="mt-1 text-2xl font-semibold text-red-700">{summary.rejected}</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <p className="text-xs uppercase text-gray-600">Cancelled</p>
            <p className="mt-1 text-2xl font-semibold text-gray-700">{summary.cancelled}</p>
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</span>
          <div className="flex flex-wrap gap-2">
            {statusTabs.map(tab => {
              const active = statusFilter === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setQueryParams({ status: tab.key === 'all' ? null : tab.key, page: null })}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${active
                      ? 'bg-[#1F8941] text-white border-[#1F8941]'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  {tab.label} ({tab.count})
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Search by Roll</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={studentRoll}
                  onChange={e => setQueryParams({ studentRoll: e.target.value.trim() || null, page: null, class: null })}
                  placeholder="21CS1001"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8941]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Filter by Class</label>
            <select
              value={classFilter}
              onChange={e => setQueryParams({ class: e.target.value || null, studentRoll: null, page: null })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8941]"
            >
              <option value="">All classes</option>
              {classOptions.map(className => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sort</label>
            <select
              value={sortParam}
              onChange={e => setQueryParams({ sort: e.target.value === 'newest' ? null : e.target.value, page: null })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8941]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={approvedByMe}
              onChange={e => setQueryParams({ approvedByMe: e.target.checked || null, rejectedByMe: e.target.checked ? null : rejectedByMe ? 'true' : null, page: null })}
              className="h-4 w-4 rounded border-gray-300 text-[#1F8941] focus:ring-[#1F8941]"
            />
            Approved by me
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={rejectedByMe}
              onChange={e => setQueryParams({ rejectedByMe: e.target.checked || null, approvedByMe: e.target.checked ? null : approvedByMe ? 'true' : null, page: null })}
              className="h-4 w-4 rounded border-gray-300 text-[#1F8941] focus:ring-[#1F8941]"
            />
            Rejected by me
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={myClassOnly}
              onChange={e => setQueryParams({ myclass: e.target.checked || null, page: null })}
              className="h-4 w-4 rounded border-gray-300 text-[#1F8941] focus:ring-[#1F8941]"
            />
            Show mentor class only
          </label>
        </div>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <section className="space-y-4">
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-10 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 text-[#1F8941] animate-spin" />
            <p className="mt-3 text-sm text-gray-600">Loading outpass history…</p>
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-500">
            <Filter className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            No history records found
          </div>
        ) : (
          records.map(record => {
            const statusClass = statusClasses(record.status)
            return (
              <article key={record.requestId} className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                <header className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{categoryIcon(record.reasonCategory)}</span>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 capitalize">
                        {record.reasonCategory}
                      </h2>
                      <p className="text-sm text-gray-500">#{record.requestId}</p>
                    </div>
                  </div>
                  
                  {/* ✅ Renders dynamic icons for Exited vs Approved */}
                  <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full border ${statusClass}`}>
                    {getStatusIcon(record.status)}
                    <span className="capitalize">{record.status}</span>
                  </span>
                </header>

                {record.reason && (
                  <p className="mt-3 text-sm text-gray-700">{record.reason}</p>
                )}

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#1F8941]" />
                      <span className="font-medium text-gray-900">{record.student.name}</span>
                      <span>({record.student.rollNumber})</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {record.student.class} • {record.student.department}
                    </p>
                    <p className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      Requested at: {record.requestedAt || 'N/A'}
                    </p>
                    <p className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      Exit: {record.exitTime || 'N/A'}
                    </p>
                    <p className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      Return: {record.returnTime || 'N/A'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {record.student.email && (
                      <p className="text-xs text-gray-500">Email: {record.student.email}</p>
                    )}
                    {record.student.phone && (
                      <p className="text-xs text-gray-500">Phone: {record.student.phone}</p>
                    )}
                    {record.student.parentName && (
                      <p className="text-xs text-gray-500">Parent: {record.student.parentName}</p>
                    )}
                    {record.student.parentContact && (
                      <p className="text-xs text-gray-500">Parent Contact: {record.student.parentContact}</p>
                    )}
                    {typeof record.student.attendanceAtApply === 'number' && (
                      <p className="text-xs text-gray-500">
                        Attendance at apply: {record.student.attendanceAtApply}%
                      </p>
                    )}
                    {record.rejectionReason && (
                      <p className="text-xs text-red-600">Rejection reason: {record.rejectionReason}</p>
                    )}
                  </div>
                </div>

                <footer className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                  {record.facultyApprover && (
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      Faculty: {record.facultyApprover.name}
                    </span>
                  )}
                  {record.hodApprover && (
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      HOD: {record.hodApprover.name}
                    </span>
                  )}
                  {record.status === 'rejected' && (
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <AlertTriangle className="w-3 h-3" />
                      Rejected by {record.facultyApprover?.name || 'faculty'}
                    </span>
                  )}
                </footer>
              </article>
            )
          })
        )}
      </section>

      {meta.totalPages > 1 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <p className="text-sm text-gray-600">
            Showing {(meta.page - 1) * meta.limit + 1} –
            {Math.min(meta.page * meta.limit, meta.totalMatching)} of {meta.totalMatching}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(meta.page - 1)}
              disabled={meta.page <= 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            {Array.from({ length: meta.totalPages }, (_, index) => index + 1)
              .filter(page =>
                page === 1 ||
                page === meta.totalPages ||
                Math.abs(page - meta.page) <= 2
              )
              .map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 border rounded-md text-sm ${page === meta.page
                      ? 'bg-[#1F8941] text-white border-[#1F8941]'
                      : 'border-gray-300 hover:bg-gray-50'}`}
                >
                  {page}
                </button>
              ))}
            <button
              onClick={() => handlePageChange(meta.page + 1)}
              disabled={meta.page >= meta.totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}