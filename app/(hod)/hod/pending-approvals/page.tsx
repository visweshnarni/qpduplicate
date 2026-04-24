"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
    Search,
    Shield,
    User,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Download,
    Filter,
    Calendar,
    ChevronDown,
    Bot, // ✅ Added Bot Icon
    Loader2
} from "lucide-react"

type HodPendingSummary = {
    totalPending: number
    urgentCount: number
    department: string
}

type HodPendingRequest = {
    requestId: string
    studentName: string
    rollNumber: string
    class: string
    department: string
    facultyApprovedBy: string
    facultyApprovedAt: string
    attendanceAtApply: number
    attendanceStatus: string
    parentContact: string
    reasonCategory: string
    reason: string
    exitTime: string
    returnTime: string
    requestedAgo: string
    timeInHodQueue: string
    isEmergency: boolean
    // ✅ New Fields
    mlDecision?: string
    mlExplanation?: string
    parentVerification?: {
        status: boolean
        verifiedBy?: string
        verifiedAt?: string
    }
}

type HodPendingApprovalsResponse = {
    summary: HodPendingSummary
    requests: HodPendingRequest[]
}

const CATEGORY_OPTIONS = [
    { value: "all", label: "All Categories" },
    { value: "emergency", label: "Emergency" },
    { value: "personal", label: "Personal/Travel" },
    { value: "appointment", label: "Appointments" },
    { value: "religious", label: "Religious" },
    { value: "academic", label: "Academic" }
]
const API_BASE =
    (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") as string) || "http://localhost:5000"

const normalizeCategory = (value: string) =>
    value.toLowerCase().replace(/[^a-z]/g, "")

const findCategoryLabel = (value: string) =>
    CATEGORY_OPTIONS.find(option => option.value === value)?.label ?? value

// 1. Rename main function to an internal component
function HodPendingApprovalsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [searchTerm, setSearchTerm] = useState("")
    const [data, setData] = useState<HodPendingApprovalsResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [rejectionNote, setRejectionNote] = useState("")
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [selectedRejectId, setSelectedRejectId] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)

    const categoryParam = searchParams.get("category") ?? "all"
    // ✅ Placed it here, inside the component body!
    const [isBulkApproving, setIsBulkApproving] = useState(false)

    useEffect(() => {
        const controller = new AbortController()

        const fetchPendingApprovals = async () => {
            try {
                setLoading(true)
                setError(null)

                const token =
                    typeof window !== "undefined" ? window.localStorage.getItem("token") : null

                if (!token) {
                    setError("Authentication required. Please log in again.")
                    setLoading(false)
                    return
                }

                // Attach category directly to the URL
                const fetchUrl = new URL(`${API_BASE}/api/hod/pending-approvals`)
                if (categoryParam !== "all") {
                    fetchUrl.searchParams.append("category", categoryParam)
                }

                const response = await fetch(fetchUrl.toString(), {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    cache: "no-store",
                    signal: controller.signal
                })

                if (response.status === 404) {
                    // API returns 404 when no results match the category, handle it gracefully
                    setData({ summary: { totalPending: 0, urgentCount: 0, department: "Department" }, requests: [] })
                    return
                }

                if (!response.ok) {
                    const body = await response.json().catch(() => null)
                    throw new Error(
                        body?.message ||
                            `Failed to load pending approvals (status ${response.status})`
                    )
                }

                const payload: HodPendingApprovalsResponse = await response.json()
                setData(payload)
            } catch (err: unknown) {
                if ((err as Error)?.name === "AbortError") return
                setError((err as Error)?.message ?? "Unable to load pending approvals.")
            } finally {
                setLoading(false)
            }
        }

        fetchPendingApprovals()

        return () => controller.abort()
    }, [categoryParam])

    const filteredRequests = useMemo(() => {
        if (!data) return []
        return data.requests.filter(request => {
            const query = searchTerm.trim().toLowerCase()
            return (
                query.length === 0 ||
                request.studentName.toLowerCase().includes(query) ||
                request.rollNumber.toLowerCase().includes(query) ||
                request.reason.toLowerCase().includes(query)
            )
        })
    }, [data, searchTerm])

    const handleCategoryChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value === "all") {
            params.delete("category")
        } else {
            params.set("category", value)
        }
        router.push(`?${params.toString()}`, { scroll: false })
    }

    const refetchData = async () => {
        // Simple reload to let useEffect handle it
        window.location.reload()
    }

    const handleAction = async (
        id: string,
        action: "approve" | "reject",
        rejectionReason?: string
    ) => {
        const token =
            typeof window !== "undefined" ? window.localStorage.getItem("token") : null
        if (!token) {
            setActionError("Authentication required. Please log in again.")
            return
        }

        try {
            setProcessingId(id)
            setActionError(null)

            const response = await fetch(`${API_BASE}/api/hod/outpass/${id}/action`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(
                    action === "approve"
                        ? { action: "approve" }
                        : { action: "reject", rejectionReason: rejectionReason?.trim() }
                )
            })

            if (!response.ok) {
                const body = await response.json().catch(() => null)
                throw new Error(
                    body?.message ||
                        `Failed to ${action} request (status ${response.status})`
                )
            }

            await refetchData()
        } catch (err: unknown) {
            setActionError((err as Error)?.message ?? `Unable to ${action} request.`)
        } finally {
            setProcessingId(null)
        }
    }

    const handleApproveAll = async () => {
        if (filteredRequests.length === 0) return;

        if (!window.confirm(`Are you sure you want to approve all ${filteredRequests.length} displayed requests?`)) {
            return;
        }

        const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
        if (!token) {
            setActionError("Authentication required. Please log in again.");
            return;
        }

        try {
            setIsBulkApproving(true);
            setActionError(null);

            // Extract just the IDs of the currently filtered items on screen
            const requestIds = filteredRequests.map(req => req.requestId);

            const response = await fetch(`${API_BASE}/api/hod/outpass/bulk-approve`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ requestIds })
            });

            if (!response.ok) {
                const body = await response.json().catch(() => null);
                throw new Error(body?.message || "Failed to bulk approve requests");
            }

            const result = await response.json();
            window.alert(result.message);
            await refetchData(); // Refresh the list
        } catch (err: unknown) {
            setActionError((err as Error)?.message ?? "Unable to bulk approve requests.");
        } finally {
            setIsBulkApproving(false);
        }
    }

    if (loading) {
        return <div className="p-6 text-gray-600">Loading pending approvals...</div>
    }

    if (error) {
        return (
            <div className="p-6 text-red-600">
                {error}
            </div>
        )
    }

    if (!data) return null

    const { summary } = data

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#1F8941] to-[#1a7a39] text-white rounded-xl p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center mb-1">
                            <Shield className="w-6 h-6 mr-2" />
                            Pending HOD Approvals
                        </h1>
                        <p className="text-green-100">
                            Review teacher-verified requests for {summary.department}
                        </p>
                    </div>
                    <div className="text-center md:text-right bg-white/10 p-3 rounded-lg">
                        <div className="text-3xl font-semibold">
                            {summary.totalPending}
                        </div>
                        <div className="text-sm text-green-50 tracking-wide uppercase mt-1">
                            Awaiting Approval • {summary.urgentCount} urgent
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:space-x-6">
                <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search by student name, roll number, or reason..."
                            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F8941]"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <select
                            value={categoryParam}
                            onChange={event => handleCategoryChange(event.target.value)}
                            className="appearance-none rounded-lg border border-gray-300 py-2 pl-10 pr-12 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F8941] bg-white"
                        >
                            {CATEGORY_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                            <ChevronDown className="h-4 w-4" />
                        </span>
                    </div>
                </div>
                <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center md:gap-3">
                    <button
                        onClick={handleApproveAll}
                        disabled={filteredRequests.length === 0}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1F8941] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1a7a39] disabled:opacity-50"
                    >
                        <CheckCircle className="h-4 w-4" />
                        Approve All
                    </button>
                    <button
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* List of Requests */}
            <div className="space-y-4">
                {filteredRequests.length === 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-dashed p-12 text-center">
                        <Shield className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                        <p className="text-gray-600 font-medium text-lg">All Caught Up!</p>
                        <p className="text-gray-500 text-sm mt-1">
                            {categoryParam === "all"
                                ? "No pending approvals match your search."
                                : `No pending ${findCategoryLabel(categoryParam).toLowerCase()} requests right now.`}
                        </p>
                    </div>
                )}

                {filteredRequests.map((request) => (
                    <div key={request.requestId} className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow ${request.isEmergency ? 'border-red-300' : 'border-gray-200'}`}>
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex flex-1 items-start space-x-4">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${request.isEmergency ? 'bg-red-100' : 'bg-blue-100'}`}>
                                    <User className={`h-6 w-6 ${request.isEmergency ? 'text-red-600' : 'text-blue-600'}`} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {request.studentName}
                                        </h3>
                                        <span className="text-sm text-gray-500">
                                            ({request.rollNumber})
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        {request.class} • {request.department}
                                    </p>
                                    
                                    {/* ✅ BADGES */}
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {request.isEmergency && (
                                            <span className="inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-800 border border-red-200">
                                                <AlertTriangle className="mr-1 h-3 w-3" />
                                                Emergency
                                            </span>
                                        )}
                                        {request.parentVerification?.status && (
                                            <span className="inline-flex items-center rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 border border-emerald-300">
                                                <CheckCircle className="mr-1 h-3 w-3" />
                                                Parent Verified ({request.parentVerification.verifiedBy})
                                            </span>
                                        )}
                                        {request.attendanceAtApply < 75 && (
                                            <span className="inline-flex items-center rounded bg-yellow-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-800 border border-yellow-300">
                                                <AlertTriangle className="mr-1 h-3 w-3" />
                                                Low Attendance
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-left md:text-right space-y-1">
                                <p className="text-sm font-medium text-gray-700">
                                    Teacher: <span className="font-semibold text-gray-900">{request.facultyApprovedBy}</span>
                                </p>
                                <p className="text-xs text-gray-500 flex items-center md:justify-end">
                                    <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
                                    Approved {request.facultyApprovedAt}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">ID: #{request.requestId.slice(-6).toUpperCase()}</p>
                            </div>
                        </div>

                        {/* ✅ ML AI EXPLANATION BOX */}
                        <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Bot className="w-4 h-4 text-blue-600" />
                                <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                                    AI Analysis: {request.mlDecision?.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-sm text-blue-900 italic">
                                "{request.mlExplanation || 'No AI explanation available.'}"
                            </p>
                        </div>

                        <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 p-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Reason ({request.reasonCategory})</p>
                                    <p className="text-sm text-gray-900 font-medium">{request.reason}</p>
                                </div>
                                <div className="space-y-1 text-sm text-gray-900">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Schedule & Details</p>
                                    <p>Exit: <span className="font-medium">{request.exitTime}</span></p>
                                    <p>Return: <span className="font-medium">{request.returnTime}</span></p>
                                    <p>Attendance: <span className={`font-medium ${request.attendanceAtApply < 75 ? 'text-red-600' : 'text-green-600'}`}>{request.attendanceAtApply}%</span></p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end border-t border-gray-100 pt-4">
                            <button
                                onClick={() => {
                                    setSelectedRejectId(request.requestId)
                                    setRejectionNote("")
                                    setShowRejectModal(true)
                                    setActionError(null)
                                }}
                                className="flex items-center justify-center gap-2 rounded-lg border border-red-200 px-6 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                            >
                                <XCircle className="h-4 w-4" />
                                Reject
                            </button>
                            <button
                                onClick={() => handleAction(request.requestId, "approve")}
                                className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-8 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                                disabled={processingId === request.requestId}
                            >
                                {processingId === request.requestId ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                Approve Outpass
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showRejectModal && selectedRejectId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4 text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="text-lg font-bold">Provide Rejection Reason</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Please explain why this outpass request is being rejected. This note will be visible to the student and faculty.
                        </p>
                        <textarea
                            value={rejectionNote}
                            onChange={event => setRejectionNote(event.target.value)}
                            placeholder="e.g. Inadequate reason, low attendance..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[120px] bg-gray-50"
                        />
                        {actionError && (
                            <p className="mt-2 text-sm text-red-600 font-medium">
                                {actionError}
                            </p>
                        )}
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false)
                                    setSelectedRejectId(null)
                                    setRejectionNote("")
                                    setActionError(null)
                                }}
                                className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                disabled={processingId === selectedRejectId}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (!rejectionNote.trim()) {
                                        setActionError("Rejection reason is required.")
                                        return
                                    }
                                    setShowRejectModal(false)
                                    handleAction(selectedRejectId, "reject", rejectionNote)
                                }}
                                className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                                disabled={processingId === selectedRejectId}
                            >
                                {processingId === selectedRejectId ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// 2. Create the default export that wraps everything in Suspense
export default function HodPendingApprovalsPage() {
    return (
        <Suspense fallback={<div className="p-6 text-gray-600">Loading pending approvals...</div>}>
            <HodPendingApprovalsContent />
        </Suspense>
    )
}