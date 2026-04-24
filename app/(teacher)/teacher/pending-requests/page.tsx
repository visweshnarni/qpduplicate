'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  User,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Bot
} from 'lucide-react'

interface PendingSummary {
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
  
  // ✅ All 3 contact numbers
  parentContact?: string
  secondaryParentContact?: string
  alternateContact?: string
  
  exitTime?: string
  returnTime?: string
  requestedAt?: string
  isEmergency?: boolean
  
  // ✅ New Tracking Fields
  status: string
  mlDecision?: string
  mlExplanation?: string
  parentVerificationStatus?: string
  parentVerifiedBy?: string
}

type FilterOption = 'all' | 'myclass'

// 1. Rename the main component to act as the inner content
function PendingRequestsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const filterParam = searchParams.get('filter') === 'myclass' ? 'myclass' : 'all'

  const [summary, setSummary] = useState<PendingSummary>({ pending: 0, urgent: 0 })
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  // Tracks if the faculty manually checked the box
  const [parentVerifiedMap, setParentVerifiedMap] = useState<Record<string, boolean>>({})

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

  const fetchPendingRequests = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) {
          setLoading(true)
        } else {
          setRefreshing(true)
        }
        setError(null)

        const token = localStorage.getItem('token')
        if (!token) {
          throw new Error('Authentication required. Please log in again.')
        }

        const url = new URL(`${apiUrl}/api/faculty/pending-requests`)
        url.searchParams.set('filter', filterParam)

        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.message || 'Failed to load pending requests')
        }

        const data = await res.json()
        const requestsData: PendingRequest[] = Array.isArray(data.requests) ? data.requests : []

        setSummary(data.summary || { pending: 0, urgent: 0 })
        setRequests(requestsData)
        
        // Initialize the map based on whether the IVR already approved it
        setParentVerifiedMap(
          requestsData.reduce((acc, request) => {
            acc[request.requestId] = request.parentVerificationStatus === 'approved'
            return acc
          }, {} as Record<string, boolean>)
        )
      } catch (err: any) {
        console.error('Error fetching pending requests:', err)
        setSummary({ pending: 0, urgent: 0 })
        setRequests([])
        setParentVerifiedMap({})
        setError(err.message || 'Unable to fetch pending requests. Please try again later.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [apiUrl, filterParam]
  )

  useEffect(() => {
    fetchPendingRequests()
  }, [fetchPendingRequests])

  const handleFilterChange = (value: FilterOption) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('filter')
    } else {
      params.set('filter', value)
    }
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : '?')
  }

  const toggleParentVerified = (requestId: string, alreadyApproved: boolean) => {
    // Prevent unchecking if the IVR already approved it
    if (alreadyApproved) return;
    setParentVerifiedMap(prev => ({ ...prev, [requestId]: !prev[requestId] }))
  }

  const handleProcess = async (
    request: PendingRequest,
    action: 'approve' | 'reject'
  ) => {
    if (action === 'reject') {
      const reason = window.prompt('Please provide a reason for rejection:')
      if (!reason) return
      await submitAction(request.requestId, action, { rejectionReason: reason })
    } else {
      await submitAction(request.requestId, action, {
        parentVerified: !!parentVerifiedMap[request.requestId]
      })
    }
  }

  const submitAction = async (
    requestId: string,
    action: 'approve' | 'reject',
    payload: { parentVerified?: boolean; rejectionReason?: string }
  ) => {
    try {
      setProcessingId(requestId)
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication required. Please log in again.')
      }

      const res = await fetch(`${apiUrl}/api/faculty/outpass/${requestId}/action`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          ...(action === 'approve'
            ? { parentVerified: !!payload.parentVerified }
            : { rejectionReason: payload.rejectionReason })
        })
      })

      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(body?.message || `Failed to ${action} request`)
      }

      window.alert(body?.message || `Request ${action}d successfully.`)
      await fetchPendingRequests(false)
    } catch (err: any) {
      console.error(`Error during ${action}:`, err)
      window.alert(err.message || `Unable to ${action} this request. Please try again.`)
    } finally {
      setProcessingId(null)
    }
  }

  const pendingPreview = useMemo(() => requests, [requests])

  const renderRequestCard = (request: PendingRequest) => {
    const isProcessing = processingId === request.requestId
    const isEmergency = request.isEmergency
    const attendance = request.attendanceAtApply ?? null
    
    const isIvrApproved = request.parentVerificationStatus === 'approved'

    return (
      <div
        key={request.requestId}
        className={`border rounded-xl p-5 space-y-4 shadow-sm ${isEmergency ? 'border-red-300 bg-red-50/60' : 'border-gray-200 bg-white'}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isEmergency ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
              <User className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-gray-900">{request.studentName}</h3>
              <p className="text-sm text-gray-600">{request.rollNumber} • {request.class}</p>
              
              {/* ✅ DYNAMIC BADGES ROW */}
              <div className="flex flex-wrap gap-2 mt-2">
                  {request.mlDecision === 'AUTO_APPROVE' && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold uppercase tracking-wide rounded bg-blue-50 text-blue-700 border border-blue-200">
                          <Bot className="w-3 h-3 mr-1" /> ML Approved
                      </span>
                  )}
                  
                  {request.status === 'pending_parent' ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-orange-50 text-orange-700 border border-orange-200 animate-pulse">
                          <Phone className="w-3 h-3 mr-1" /> Waiting for Parent IVR
                      </span>
                  ) : isIvrApproved ? (
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
          <div className="flex flex-col items-end space-y-2 text-xs text-gray-500">
            {request.requestedAt && <span>{request.requestedAt}</span>}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-gray-900 uppercase tracking-wide text-xs">{request.reasonCategory}: </span> 
            {request.reason}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Exit Time</span>
            <span className="font-medium text-gray-900">{request.exitTime || '—'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Return Time</span>
            <span className="font-medium text-gray-900">{request.returnTime || '—'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Attendance</span>
            {attendance !== null ? (
                <span className={`font-medium ${request.lowAttendance ? 'text-red-600' : 'text-gray-900'}`}>
                    {attendance}% {request.lowAttendance && '(Low)'}
                </span>
            ) : <span>—</span>}
          </div>
          
          {/* ✅ Contact Numbers Display */}
          <div className="flex flex-col col-span-2 md:col-span-1">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Contacts</span>
            <div className="flex flex-col gap-1 mt-1">
                {request.parentContact && <span className="text-xs font-medium text-blue-600">P: {request.parentContact}</span>}
                {request.secondaryParentContact && <span className="text-xs font-medium text-blue-600">S: {request.secondaryParentContact}</span>}
                {request.alternateContact && <span className="text-xs font-medium text-blue-600">A: {request.alternateContact}</span>}
                {!request.parentContact && !request.alternateContact && <span>—</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-4">
          <label className={`inline-flex items-center gap-2 text-sm ${isIvrApproved ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}>
            <input
              type="checkbox"
              className={`h-5 w-5 rounded border-gray-300 text-[#1F8941] focus:ring-[#1F8941] ${isIvrApproved ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              checked={!!parentVerifiedMap[request.requestId]}
              onChange={() => toggleParentVerified(request.requestId, isIvrApproved)}
              disabled={isIvrApproved}
            />
            {isIvrApproved ? 'Parent automatically verified (IVR)' : 'Mark as manually verified'}
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleProcess(request, 'approve')}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1F8941] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a7a39] disabled:cursor-wait disabled:opacity-60 transition-colors"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve
            </button>
            <button
              onClick={() => handleProcess(request, 'reject')}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 transition-colors"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Reject
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Requests</h1>
          <p className="text-sm text-gray-500">
            Review, approve, or reject student outpass requests awaiting faculty action.
          </p>
        </div>
        <button
          onClick={() => fetchPendingRequests(false)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 bg-white shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh List
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <span className="text-sm font-medium text-gray-700">Filter View:</span>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-6 py-2 text-sm font-medium transition-colors ${filterParam === 'all' ? 'bg-[#1F8941] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Entire Department
          </button>
          <button
            onClick={() => handleFilterChange('myclass')}
            className={`px-6 py-2 text-sm font-medium transition-colors ${filterParam === 'myclass' ? 'bg-[#1F8941] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            My Class Only
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-500 font-medium">Total Pending Requests</p>
                <p className="text-3xl font-bold text-[#1F8941] mt-1">{summary.pending}</p>
            </div>
            <Clock className="w-10 h-10 text-[#1F8941] opacity-20" />
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-red-600 font-medium">Urgent Requests</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{summary.urgent}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-600 opacity-20" />
        </div>
      </div>

      <section className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-gray-200">
            <Loader2 className="w-8 h-8 animate-spin text-[#1F8941]" />
            <p className="mt-4 text-sm text-gray-500">Loading pending requests…</p>
          </div>
        ) : pendingPreview.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200">
            <CheckCircle className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-900">All caught up!</p>
            <p className="text-sm text-gray-500 mt-1">No pending outpass requests found for this filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingPreview.map(renderRequestCard)}
          </div>
        )}
      </section>
    </div>
  )
}

// 2. Export the Suspense wrapper as the default component
export default function PendingRequestsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading requests...</div>}>
      <PendingRequestsContent />
    </Suspense>
  )
}