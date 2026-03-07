'use client'

import { JSX, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
    Calendar,
    CheckCircle,
    Clock,
    FileText,
    Loader2,
    RefreshCw,
    User,
    XCircle,
    LogOut // ✅ ADD THIS
} from 'lucide-react'

import {
    outpassService,
    OutpassHistoryPagination,
    OutpassHistoryRecord,
    OutpassHistorySummary
} from '@/lib/outpassService'
import { useAuth } from '@/hooks/useAuth'

const PAGE_LIMIT = 5

type StatusFilter = 'all' | 'approved' | 'rejected' | 'cancelled'
type SortOrder = 'newest' | 'oldest'

const DEFAULT_SUMMARY: OutpassHistorySummary = {
    total: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0
}

const DEFAULT_PAGINATION: OutpassHistoryPagination = {
    currentPage: 1,
    totalPages: 0,
    totalRecords: 0,
    hasNextPage: false,
    hasPrevPage: false
}

const STATUS_THEME: Record<
    string,
    {
        badgeBg: string
        badgeBorder: string
        badgeText: string
        icon: JSX.Element
        noteBg: string
        noteBorder: string
        noteTitleColor: string
        noteTextColor: string
    }
> = {
    approved: {
        badgeBg: 'bg-green-50',
        badgeBorder: 'border-green-200',
        badgeText: 'text-green-600',
        icon: <CheckCircle className="w-3 h-3" />,
        noteBg: 'bg-green-50',
        noteBorder: 'border-green-200',
        noteTitleColor: 'text-green-800',
        noteTextColor: 'text-green-700'
    },
    rejected: {
        badgeBg: 'bg-red-50',
        badgeBorder: 'border-red-200',
        badgeText: 'text-red-600',
        icon: <XCircle className="w-3 h-3" />,
        noteBg: 'bg-red-50',
        noteBorder: 'border-red-200',
        noteTitleColor: 'text-red-800',
        noteTextColor: 'text-red-700'
    },
    cancelled: {
        badgeBg: 'bg-gray-50',
        badgeBorder: 'border-gray-200',
        badgeText: 'text-gray-600',
        icon: <Clock className="w-3 h-3" />,
        noteBg: 'bg-gray-50',
        noteBorder: 'border-gray-200',
        noteTitleColor: 'text-gray-700',
        noteTextColor: 'text-gray-600'
    },
    // ✅ ADD THIS EXITED BLOCK
    exited: {
        badgeBg: 'bg-teal-50',
        badgeBorder: 'border-teal-200',
        badgeText: 'text-teal-600',
        icon: <LogOut className="w-3 h-3" />,
        noteBg: 'bg-teal-50',
        noteBorder: 'border-teal-200',
        noteTitleColor: 'text-teal-800',
        noteTextColor: 'text-teal-700'
    },
}

const CATEGORY_EMOJI: Record<string, string> = {
    emergency: '🚨',
    medical: '🩺',
    personal: '🏡',
    academics: '📚',
    academic: '📚',
    travel: '🧳',
    family: '👨‍👩‍👧‍👦',
    default: '📄'
}

const VALID_STATUS_VALUES: StatusFilter[] = ['all', 'approved', 'rejected', 'cancelled']
const VALID_SORT_VALUES: SortOrder[] = ['newest', 'oldest']

const parseStatusParam = (value: string | null): StatusFilter => {
    if (!value) return 'all'
    return VALID_STATUS_VALUES.includes(value as StatusFilter)
        ? (value as StatusFilter)
        : 'all'
}

const parseSortParam = (value: string | null): SortOrder => {
    if (!value) return 'newest'
    return VALID_SORT_VALUES.includes(value as SortOrder)
        ? (value as SortOrder)
        : 'newest'
}

const parseMonthParam = (monthValue: string | null, yearValue: string | null): string => {
    if (!monthValue || !yearValue) return ''
    const monthNumber = Number(monthValue)
    if (!Number.isFinite(monthNumber) || monthNumber < 1 || monthNumber > 12) return ''
    return `${yearValue}-${String(monthNumber).padStart(2, '0')}`
}

const parsePageParam = (value: string | null): number => {
    const pageNumber = Number(value)
    if (!Number.isFinite(pageNumber) || pageNumber < 1) return 1
    return Math.floor(pageNumber)
}

const splitMonthInput = (value: string) => {
    if (!value) return { year: null as string | null, month: null as string | null }
    const [year, month] = value.split('-')
    if (!year || !month) return { year: null, month: null }
    return { year, month }
}

const toTitleCase = (value: string) =>
    value
        .split(/[\s_-]+/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')

const formatDisplayValue = (value?: string | null) => {
    if (!value) return 'N/A'
    return value
}

const getCategoryEmoji = (category: string) => {
    const key = category.toLowerCase()
    return CATEGORY_EMOJI[key] ?? CATEGORY_EMOJI.default
}

const getStatusTheme = (status: string) => {
    const normalized = status.toLowerCase()
    return STATUS_THEME[normalized] ?? {
        badgeBg: 'bg-gray-50',
        badgeBorder: 'border-gray-200',
        badgeText: 'text-gray-600',
        icon: <Clock className="w-3 h-3" />,
        noteBg: 'bg-gray-50',
        noteBorder: 'border-gray-200',
        noteTitleColor: 'text-gray-700',
        noteTextColor: 'text-gray-600'
    }
}

const buildPageNumbers = (totalPages: number, currentPage: number) => {
    if (totalPages <= 1) return [1]

    const maxVisible = 5
    const pages: number[] = []
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let end = start + maxVisible - 1

    if (end > totalPages) {
        end = totalPages
        start = Math.max(1, end - maxVisible + 1)
    }

    for (let page = start; page <= end; page += 1) {
        pages.push(page)
    }

    return pages
}

export default function History() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { token, loading: authLoading, isAuthenticated } = useAuth()

    const [history, setHistory] = useState<OutpassHistoryRecord[]>([])
    const [summary, setSummary] = useState<OutpassHistorySummary>(DEFAULT_SUMMARY)
    const [pagination, setPagination] =
        useState<OutpassHistoryPagination>(DEFAULT_PAGINATION)
    const [currentPage, setCurrentPage] = useState<number>(() =>
        parsePageParam(searchParams.get('page'))
    )

    const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
        parseStatusParam(searchParams.get('status'))
    )
    const [sortOrder, setSortOrder] = useState<SortOrder>(() =>
        parseSortParam(searchParams.get('sort'))
    )
    const [monthFilter, setMonthFilter] = useState<string>(() =>
        parseMonthParam(searchParams.get('month'), searchParams.get('year'))
    )
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const tabs = useMemo(
        () => [
            { key: 'all' as StatusFilter, label: 'All Requests', count: summary.total },
            { key: 'approved' as StatusFilter, label: 'Approved', count: summary.approved },
            { key: 'rejected' as StatusFilter, label: 'Rejected', count: summary.rejected },
            { key: 'cancelled' as StatusFilter, label: 'Cancelled', count: summary.cancelled }
        ],
        [summary]
    )

    const applyUrlFilters = useCallback(
        (updates: { status?: StatusFilter; sort?: SortOrder; month?: string; page?: number }) => {
            const params = new URLSearchParams(searchParams.toString())

            if (updates.status !== undefined) {
                if (updates.status === 'all') {
                    params.delete('status')
                } else {
                    params.set('status', updates.status)
                }
            }

            if (updates.sort !== undefined) {
                if (updates.sort === 'newest') {
                    params.delete('sort')
                } else {
                    params.set('sort', updates.sort)
                }
            }

            if (updates.month !== undefined) {
                if (!updates.month) {
                    params.delete('month')
                    params.delete('year')
                } else {
                    const { year, month } = splitMonthInput(updates.month)
                    if (year && month) {
                        params.set('year', year)
                        params.set('month', String(parseInt(month, 10)))
                    }
                }
            }

            if (updates.page !== undefined) {
                if (updates.page <= 1) {
                    params.delete('page')
                } else {
                    params.set('page', String(updates.page))
                }
            }

            const searchString = params.toString()
            router.replace(searchString ? `${pathname}?${searchString}` : pathname, {
                scroll: false
            })
        },
        [pathname, router, searchParams]
    )

    const fetchHistory = useCallback(
        async (page: number, options?: { refresh?: boolean }) => {
            if (!token) {
                setHistory([])
                setSummary(DEFAULT_SUMMARY)
                setPagination(DEFAULT_PAGINATION)
                setLoading(false)
                setRefreshing(false)
                return
            }

            try {
                setError(null)
                if (options?.refresh) {
                    setRefreshing(true)
                } else {
                    setLoading(true)
                }

                const response = await outpassService.getHistory(
                    {
                        page,
                        limit: PAGE_LIMIT,
                        status: statusFilter,
                        sort: sortOrder,
                        month: monthFilter
                    },
                    token
                )

                setHistory(response.records)
                setSummary(response.summary)
                setPagination(response.pagination)
            } catch (err: any) {
                console.error('Failed to fetch outpass history:', err)
                setError(err?.message || 'Failed to load outpass history. Please try again.')
            } finally {
                setLoading(false)
                setRefreshing(false)
            }
        },
        [token, statusFilter, sortOrder, monthFilter]
    )

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login')
        }
    }, [authLoading, isAuthenticated, router])

    useEffect(() => {
        if (authLoading) return
        fetchHistory(currentPage)
    }, [authLoading, currentPage, fetchHistory])

    // We intentionally only react to search param changes to keep local state driven by the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const statusParam = parseStatusParam(searchParams.get('status'))
        if (statusParam !== statusFilter) {
            setStatusFilter(statusParam)
        }

        const sortParam = parseSortParam(searchParams.get('sort'))
        if (sortParam !== sortOrder) {
            setSortOrder(sortParam)
        }

        const monthParam = parseMonthParam(searchParams.get('month'), searchParams.get('year'))
        if (monthParam !== monthFilter) {
            setMonthFilter(monthParam)
        }

        const pageParam = parsePageParam(searchParams.get('page'))
        if (pageParam !== currentPage) {
            setCurrentPage(pageParam)
        }
    }, [searchParams])

    const handleTabChange = (key: StatusFilter) => {
        setCurrentPage(1)
        setStatusFilter(key)
        applyUrlFilters({ status: key, page: 1 })
    }

    const handleSortChange = (value: SortOrder) => {
        setCurrentPage(1)
        setSortOrder(value)
        applyUrlFilters({ sort: value, page: 1 })
    }

    const handleMonthChange = (value: string) => {
        setCurrentPage(1)
        setMonthFilter(value)
        applyUrlFilters({ month: value, page: 1 })
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        applyUrlFilters({ page })
    }

    const handleRefresh = () => {
        fetchHistory(currentPage, { refresh: true })
    }

    return (
        <div className="p-6 space-y-6">
            <section className="bg-white rounded-xl shadow-sm border p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <FileText className="w-6 h-6 mr-3 text-[#1F8941]" />
                        Outpass History
                    </h1>
                    <p className="text-gray-600 mt-1">
                        View your previous outpass requests and their status
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        Total: {summary.total} | Approved: {summary.approved} | Rejected: {summary.rejected} | Cancelled: {summary.cancelled}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={refreshing || loading}
                        className="border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center px-4 py-2 text-sm text-gray-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {refreshing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin text-[#1F8941]" />
                        ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Refresh
                    </button>

                    <select
                        value={sortOrder}
                        onChange={event => handleSortChange(event.target.value as SortOrder)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F8941] text-sm text-gray-700 bg-white"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>

                    <input
                        type="month"
                        value={monthFilter}
                        onChange={event => handleMonthChange(event.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F8941] text-sm text-gray-700 bg-white"
                    />
                </div>
            </section>

            <nav className="flex space-x-8 px-6 border-b border-gray-200">
                {tabs.map(tab => {
                    const isActive = statusFilter === tab.key
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => handleTabChange(tab.key)}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${isActive
                                    ? 'text-[#1F8941] border-[#1F8941]'
                                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    )
                })}
            </nav>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            <section className="space-y-4">
                {loading ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-10 flex flex-col items-center justify-center text-center">
                        <Loader2 className="w-8 h-8 text-[#1F8941] animate-spin" />
                        <p className="mt-3 text-sm text-gray-600">Loading outpass history...</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-10">
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500">No requests found</p>
                            <p className="text-sm text-gray-400">
                                Your outpass history will appear here
                            </p>
                        </div>
                    </div>
                ) : (
                    history.map(record => {
                        const theme = getStatusTheme(record.status)

                        const details = [
                            {
                                icon: <Calendar className="w-4 h-4 mr-2 text-gray-500" />,
                                label: 'Requested',
                                value: formatDisplayValue(record.requestedAt)
                            },
                            {
                                icon: <Clock className="w-4 h-4 mr-2 text-gray-500" />,
                                label: 'Last Updated',
                                value: formatDisplayValue(record.lastUpdatedAt)
                            },
                            {
                                icon: <Clock className="w-4 h-4 mr-2 text-gray-500" />,
                                label: 'Exit Time',
                                value: formatDisplayValue(record.exitTime)
                            },
                            {
                                icon: <Clock className="w-4 h-4 mr-2 text-gray-500" />,
                                label: 'Return Time',
                                value: formatDisplayValue(record.returnTime)
                            },
                            {
                                icon: <CheckCircle className="w-4 h-4 mr-2 text-green-600" />,
                                label: 'Teacher Approved',
                                value: formatDisplayValue(record.teacherApprovedAt)
                            },
                            {
                                icon: <CheckCircle className="w-4 h-4 mr-2 text-green-600" />,
                                label: 'HOD Approved',
                                value: formatDisplayValue(record.hodApprovedAt)
                            },
                            {
                                icon: <User className="w-4 h-4 mr-2 text-gray-500" />,
                                label: 'Approved By',
                                value: formatDisplayValue(record.approvedBy)
                            }
                        ].filter(detail => detail.value !== 'N/A')

                        const approvalNotes = Array.isArray(record.approvalNotes)
                            ? record.approvalNotes.filter(Boolean)
                            : []

                        const metadata = record.metadata as Record<string, unknown> | undefined
                        const metadataRejection = metadata ? metadata['rejectionReason'] : undefined
                        const metadataCancellation = metadata ? metadata['cancellationReason'] : undefined

                        const rejectionReason =
                            record.rejectionReason ||
                            (typeof metadataRejection === 'string' ? metadataRejection : null)

                        const cancellationNote =
                            typeof metadataCancellation === 'string' ? metadataCancellation : null

                        return (
                            <article
                                key={record.id}
                                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-2xl">
                                            {getCategoryEmoji(record.reasonCategory)}
                                        </span>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 capitalize">
                                                {toTitleCase(record.reasonCategory)}
                                            </h3>
                                            <p className="text-sm text-gray-500">#{record.requestId}</p>
                                        </div>
                                    </div>

                                    <div
                                        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 border ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}
                                    >
                                        {theme.icon}
                                        <span className="capitalize">{record.status}</span>
                                    </div>
                                </div>

                                {record.reason && (
                                    <p className="text-sm text-gray-700 mb-3">{record.reason}</p>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2 text-sm">
                                        {details.length > 0 ? (
                                            details.map(detail => (
                                                <div
                                                    key={detail.label}
                                                    className="flex items-center text-gray-600"
                                                >
                                                    {detail.icon}
                                                    <span className="font-medium mr-2">{detail.label}:</span>
                                                    <span>{detail.value}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-500">No additional timing details.</p>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {record.status === 'approved' && approvalNotes.length > 0 && (
                                            <div
                                                className={`p-3 rounded-lg border ${theme.noteBg} ${theme.noteBorder}`}
                                            >
                                                <p className={`text-sm font-medium mb-1 ${theme.noteTitleColor}`}>
                                                    Approval Notes:
                                                </p>
                                                <ul className={`text-sm space-y-1 ${theme.noteTextColor}`}>
                                                    {approvalNotes.map((note, index) => (
                                                        <li key={index}>{note}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {record.status === 'rejected' && rejectionReason && (
                                            <div
                                                className="bg-red-50 border border-red-200 p-3 rounded-lg"
                                            >
                                                <p className="text-sm font-medium text-red-800 mb-1">
                                                    Rejection Reason:
                                                </p>
                                                <p className="text-sm text-red-700">{rejectionReason}</p>
                                            </div>
                                        )}

                                        {record.status === 'cancelled' && (cancellationNote || record.reason) && (
                                            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                                                <p className="text-sm font-medium text-gray-700 mb-1">
                                                    Cancellation Note:
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {cancellationNote || 'Cancelled by student'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </article>
                        )
                    })
                )}
            </section>

            {pagination.totalPages > 1 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                        <p className="text-sm text-gray-700">
                            Showing {(pagination.currentPage - 1) * PAGE_LIMIT + 1} to{' '}
                            {Math.min(pagination.currentPage * PAGE_LIMIT, pagination.totalRecords)} of{' '}
                            {pagination.totalRecords} results
                        </p>
                        <div className="flex space-x-2">
                            <button
                                type="button"
                                disabled={!pagination.hasPrevPage}
                                onClick={() => handlePageChange(Math.max(1, pagination.currentPage - 1))}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>

                            {buildPageNumbers(pagination.totalPages, pagination.currentPage).map(page => (
                                <button
                                    key={page}
                                    type="button"
                                    onClick={() => handlePageChange(page)}
                                    className={`px-3 py-1 border rounded-md text-sm ${page === pagination.currentPage
                                            ? 'border-[#1F8941] bg-[#1F8941] text-white'
                                            : 'border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                type="button"
                                disabled={!pagination.hasNextPage}
                                onClick={() =>
                                    handlePageChange(
                                        pagination.hasNextPage
                                            ? Math.min(pagination.totalPages, pagination.currentPage + 1)
                                            : pagination.currentPage
                                    )
                                }
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}


