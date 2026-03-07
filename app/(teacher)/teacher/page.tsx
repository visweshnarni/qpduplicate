'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    User,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Phone,
    Shield,
    History,
    FileText,
    Bot // ✅ ADDED BOT ICON
} from 'lucide-react'

interface PendingRequestSummary {
    pending: number
    urgent: number
}

interface PendingRequest {
    requestId: string
    studentName: string
    rollNumber: string
    email: string
    phone: string
    class: string
    department: string
    reasonCategory: string
    reason: string
    attendanceAtApply?: number
    lowAttendance?: boolean
    parentName?: string
    parentContact?: string
    alternateContact?: string
    exitTime?: string
    returnTime?: string
    requestedAt?: string
    isEmergency?: boolean
    // ✅ NEW BACKEND FIELDS ADDED
    status: string
    mlDecision?: string
    mlExplanation?: string
    parentVerificationStatus?: string
    parentVerifiedBy?: string
}

export default function TeacherDashboardPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const filterParam = searchParams.get('filter') === 'myclass' ? 'myclass' : 'all'

    const [summary, setSummary] = useState<PendingRequestSummary>({ pending: 0, urgent: 0 })
    const [requests, setRequests] = useState<PendingRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchPendingRequests = async () => {
            try {
                setLoading(true)
                setError(null)

                const token = localStorage.getItem('token')
                if (!token) {
                    setError('Authentication required. Please log in again.')
                    setSummary({ pending: 0, urgent: 0 })
                    setRequests([])
                    return
                }

                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
                const url = new URL(`${apiUrl}/api/faculty/pending-requests`)
                url.searchParams.set('filter', filterParam)

                const res = await fetch(url.toString(), {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })

                if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    throw new Error(body?.message || 'Failed to load pending requests')
                }

                const data = await res.json()

                setSummary(data.summary || { pending: 0, urgent: 0 })
                setRequests(Array.isArray(data.requests) ? data.requests : [])
            } catch (err: any) {
                console.error('Failed to fetch pending requests:', err)
                setError(err.message || 'Unable to fetch pending requests. Please try again later.')
                setSummary({ pending: 0, urgent: 0 })
                setRequests([])
            } finally {
                setLoading(false)
            }
        }

        fetchPendingRequests()
    }, [filterParam])

    const handleFilterChange = (value: 'all' | 'myclass') => {
        const params = new URLSearchParams(searchParams.toString())
        if (value === 'all') {
            params.delete('filter')
        } else {
            params.set('filter', value)
        }
        const queryString = params.toString()
        router.replace(queryString ? `?${queryString}` : '?')
    }

    const pendingRequests = useMemo(() => {
        return requests.slice(0, 3)
    }, [requests])

    const emergencyRequests = useMemo(() => {
        return requests.filter(request => request.isEmergency).slice(0, 2)
    }, [requests])

    return (
        <div className="p-6 space-y-6">
            {/* ... Existing Banner & Filter Buttons remain unchanged ... */}
            <div className="bg-gradient-to-r from-[#1F8941] to-[#1a7a39] text-white rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">Pending Outpass Requests</h1>
                        <p className="text-green-100">Filter: {filterParam === 'myclass' ? 'My Class' : 'Entire Department'}</p>
                    </div>
                    <div className="hidden md:flex items-center space-x-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold">{summary.pending}</div>
                            <div className="text-sm text-green-100">Pending</div>
                        </div>
                        <div className="w-px h-12 bg-green-400"></div>
                        <div className="text-center">
                            <div className="text-2xl font-bold">{summary.urgent}</div>
                            <div className="text-sm text-green-100">Urgent</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-gray-600">Show requests for:</span>
                <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                    <button
                        onClick={() => handleFilterChange('all')}
                        className={`px-4 py-2 text-sm font-medium ${filterParam === 'all' ? 'bg-[#1F8941] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        Department
                    </button>
                    <button
                        onClick={() => handleFilterChange('myclass')}
                        className={`px-4 py-2 text-sm font-medium ${filterParam === 'myclass' ? 'bg-[#1F8941] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        My Class
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Pending Requests</p>
                            <p className="text-2xl font-bold text-green-600">{summary.pending}</p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-lg">
                            <Clock className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Urgent Requests</p>
                            <p className="text-2xl font-bold text-red-600">{summary.urgent}</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Awaiting Review (Preview)</p>
                            <p className="text-2xl font-bold text-gray-700">{pendingRequests.length}</p>
                        </div>
                        <div className="bg-gray-100 p-3 rounded-lg">
                            <FileText className="w-6 h-6 text-gray-700" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-[#1F8941]" />
                                Pending Requests
                            </h2>
                            <button
                                onClick={() => router.push('/teacher/pending-requests')}
                                className="text-sm text-[#1F8941] hover:text-[#1a7a39] font-medium"
                            >
                                View All →
                            </button>
                        </div>

                        <div className="space-y-3">
                            {loading ? (
                                <p className="text-sm text-gray-500">Loading pending requests…</p>
                            ) : pendingRequests.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    No pending requests to display.
                                </p>
                            ) : (
                                pendingRequests.map((request) => (
                                    <div key={request.requestId} className="border border-gray-200 rounded-lg p-4">
                                        
                                        {/* Header Row: Student Info & Badges */}
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-3">
                                            <div className="flex items-start space-x-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                                    <User className="w-5 h-5 text-gray-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{request.studentName}</h3>
                                                    <p className="text-sm text-gray-500">{request.rollNumber} • {request.class}</p>
                                                    
                                                    {/* ✅ NEW DYNAMIC BADGES ROW */}
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {request.mlDecision === 'AUTO_APPROVE' && (
                                                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-blue-50 text-blue-700 border border-blue-200">
                                                                <Bot className="w-3 h-3 mr-1" /> ML Approved
                                                            </span>
                                                        )}
                                                        
                                                        {request.status === 'pending_parent' ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                                                                <Phone className="w-3 h-3 mr-1" /> Waiting for Parent IVR
                                                            </span>
                                                        ) : request.parentVerificationStatus === 'approved' ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                                                                <CheckCircle className="w-3 h-3 mr-1" /> Parent Verified
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                                                                <Clock className="w-3 h-3 mr-1" /> Needs Review
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-700 mb-3 bg-gray-50 p-2 rounded">
                                            <span className="font-semibold text-gray-900">{request.reasonCategory}:</span> {request.reason}
                                        </p>
                                        
                                        <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2 border-t pt-2 mt-2">
                                            <div className="flex space-x-4">
                                                <span><strong className="text-gray-700">Exit:</strong> {request.exitTime || '—'}</span>
                                                <span><strong className="text-gray-700">Return:</strong> {request.returnTime || '—'}</span>
                                            </div>
                                            {request.lowAttendance && (
                                                <span className="inline-flex items-center text-red-600 font-medium">
                                                    Low attendance ({request.attendanceAtApply ?? '—'}%)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Shield className="w-5 h-5 mr-2 text-[#1F8941]" />
                            Quick Actions
                        </h2>
                        <div className="space-y-3">
                            <button
                                onClick={() => router.push('/teacher/pending-requests')}
                                className="w-full bg-[#1F8941] text-white px-4 py-3 rounded-lg font-medium hover:bg-[#1a7a39] transition-colors flex items-center justify-center space-x-2"
                            >
                                <Clock className="w-4 h-4" />
                                <span>Review Pending</span>
                            </button>
                            <button
                                onClick={() => router.push('/teacher/history')}
                                className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                            >
                                <History className="w-4 h-4" />
                                <span>View History</span>
                            </button>
                        </div>
                    </div>

                    {/* Emergency Alerts */}
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                            Emergency Alerts
                        </h2>
                        <div className="space-y-3">
                            {loading ? (
                                <p className="text-sm text-gray-500">Checking for emergencies…</p>
                            ) : emergencyRequests.length === 0 ? (
                                <p className="text-sm text-gray-500">No urgent alerts or emergency requests.</p>
                            ) : (
                                emergencyRequests.map((request) => (
                                    <div key={request.requestId} className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <p className="text-sm text-red-800">
                                            <span className="font-medium">{request.studentName}</span> needs immediate attention for: {request.reason}
                                        </p>
                                        <p className="text-xs text-red-600 mt-1">{request.requestedAt || 'Just now'}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}