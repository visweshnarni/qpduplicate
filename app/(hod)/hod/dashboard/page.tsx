"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    Shield,
    Clock,
    CheckCircle,
    XCircle,
    Users,
    TrendingUp,
    FileText,
    History,
    AlertCircle,
    Zap,
    Bot // ✅ Added Bot icon for ML status
} from "lucide-react"

type HodDetails = {
    name: string
    email: string
    department: string
    role: string
    totalFaculty: number
    totalStudents: number
}

type HodStats = {
    pendingApprovals: number
    approvedToday: number
    rejectedToday: number
    totalFaculty: number
}

type PendingApproval = {
    requestId: string
    studentName: string
    rollNumber: string
    class: string
    department: string
    reasonCategory: string
    reason: string
    teacherApprover: string
    parentContact: string
    attendanceAtApply: number
    attendanceStatus: string
    exitTime: string
    returnTime: string
    requestedAt: string
    urgency: string
    mlDecision?: string // ✅ New ML field
    mlExplanation?: string
    parentVerification?: {
        status: boolean
        verifiedBy?: string
        verifiedAt?: string
    }
}

type UrgentAlert = {
    requestId: string
    message: string
    class: string
    timeAgo: string
    parentVerified?: boolean
}

type HodDashboardResponse = {
    hodDetails: HodDetails
    stats: HodStats
    recentPendingApprovals: PendingApproval[]
    urgentAlerts: UrgentAlert[]
}

const API_BASE =
    (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") as string) || "http://localhost:5000"

const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
        case "high":
            return "text-red-700 bg-red-100 border-red-300"
        case "normal":
            return "text-blue-700 bg-blue-100 border-blue-300"
        case "low":
            return "text-gray-700 bg-gray-100 border-gray-300"
        default:
            return "text-gray-600 bg-gray-100 border-gray-200"
    }
}

const getPriorityLabel = (priority?: string) => priority?.toUpperCase() ?? "NORMAL"

const ParentVerifiedBadge = ({ verified, verifiedBy }: { verified: boolean, verifiedBy?: string }) => {
    if (!verified) return null
    return (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 border border-emerald-300">
            <CheckCircle className="mr-1 h-3 w-3" />
            Parent Verified {verifiedBy ? `(${verifiedBy.toUpperCase()})` : ''}
        </span>
    )
}

export default function HodDashboardPage() {
    const router = useRouter()
    const [dashboardData, setDashboardData] = useState<HodDashboardResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const controller = new AbortController()

        const fetchDashboard = async () => {
            try {
                const token =
                    typeof window !== "undefined" ? window.localStorage.getItem("token") : null

                if (!token) {
                    setError("Authentication required. Please log in again.")
                    setLoading(false)
                    return
                }

                const response = await fetch(`${API_BASE}/api/hod/dashboard`, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    cache: "no-store",
                    signal: controller.signal
                })

                if (!response.ok) {
                    const body = await response.json().catch(() => null)
                    throw new Error(
                        body?.message ||
                            `Failed to load dashboard data (status ${response.status})`
                    )
                }

                const data: HodDashboardResponse = await response.json()
                setDashboardData(data)
            } catch (err: unknown) {
                if ((err as Error)?.name === "AbortError") {
                    return
                }
                setError((err as Error)?.message ?? "Something went wrong while loading dashboard.")
            } finally {
                setLoading(false)
            }
        }

        fetchDashboard()

        return () => controller.abort()
    }, [])

    if (loading) {
        return <div className="p-6 text-gray-600 flex items-center gap-2"><Clock className="animate-spin w-5 h-5"/> Loading dashboard...</div>
    }

    if (error) {
        return (
            <div className="p-6 text-red-600">
                {error}
            </div>
        )
    }

    if (!dashboardData) {
        return (
            <div className="p-6 text-gray-600">
                No dashboard data available.
            </div>
        )
    }

    const { hodDetails, stats, recentPendingApprovals, urgentAlerts } = dashboardData
    const lastName = hodDetails.name?.split(" ").slice(-1)[0] ?? hodDetails.name

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="bg-gradient-to-r from-[#1F8941] to-[#1a7a39] text-white rounded-xl p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">
                            Welcome back, {lastName}! 👋
                        </h1>
                        <p className="text-green-100 font-medium tracking-wide">
                            HOD, {hodDetails.department}
                        </p>
                    </div>
                    <div className="hidden md:flex items-center space-x-6 bg-white/10 p-3 rounded-lg">
                        <div className="text-center">
                            <div className="text-3xl font-bold">{stats.pendingApprovals}</div>
                            <div className="text-xs text-green-50 uppercase tracking-wide mt-1">Pending Approvals</div>
                        </div>
                        <div className="w-px h-12 bg-white/30" />
                        <div className="text-center">
                            <div className="text-3xl font-bold">{stats.totalFaculty}</div>
                            <div className="text-xs text-green-50 uppercase tracking-wide mt-1">Faculty Members</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Pending Approvals</p>
                        <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pendingApprovals}</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                        <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Approved Today</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{stats.approvedToday}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Rejected Today</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejectedToday}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                        <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Total Students</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{hodDetails.totalStudents}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <Users className="w-6 h-6 text-blue-600" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-[#1F8941]" />
                                Awaiting HOD Approval
                            </h2>
                            <button
                                onClick={() => router.push("/hod/pending-approvals")}
                                className="text-sm text-[#1F8941] hover:text-[#1a7a39] font-medium transition-colors"
                            >
                                View All →
                            </button>
                        </div>

                        <div className="space-y-4">
                            {recentPendingApprovals.length === 0 && (
                                <div className="rounded-xl border border-dashed border-gray-200 p-10 flex flex-col items-center justify-center text-center">
                                    <CheckCircle className="w-10 h-10 text-gray-300 mb-3" />
                                    <p className="text-gray-500 font-medium">All caught up!</p>
                                    <p className="text-xs text-gray-400 mt-1">No pending approvals at the moment.</p>
                                </div>
                            )}
                            {recentPendingApprovals.map((request) => (
                                <div key={request.requestId} className="border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow bg-gray-50/50">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div className="flex items-start space-x-3">
                                            <div className="w-10 h-10 bg-white border border-gray-200 shadow-sm rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                                <Shield className="w-5 h-5 text-[#1F8941]" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 text-lg">{request.studentName}</h3>
                                                <p className="text-sm text-gray-600 font-medium">
                                                    {request.rollNumber} • {request.class}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Approved by: <span className="font-medium text-gray-700">{request.teacherApprover}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center md:justify-end gap-2">
                                            <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${getPriorityColor(request.urgency)}`}>
                                                {getPriorityLabel(request.urgency)}
                                            </span>
                                            
                                            {/* ✅ ML BADGE FOR HOD PREVIEW */}
                                            {request.mlDecision === 'AUTO_APPROVE' && (
                                                <span className="inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-50 text-blue-700 border border-blue-200">
                                                    <Bot className="w-3 h-3 mr-1" /> ML Safe
                                                </span>
                                            )}

                                            <ParentVerifiedBadge 
                                                verified={Boolean(request.parentVerification?.status)} 
                                                verifiedBy={request.parentVerification?.verifiedBy}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4 bg-white border border-gray-100 rounded-lg p-3">
                                        <p className="text-sm text-gray-700">
                                            <span className="font-semibold text-gray-900 uppercase tracking-wide text-xs">{request.reasonCategory}:</span>{" "}
                                            {request.reason}
                                        </p>
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
                                        <div className="flex space-x-4">
                                            <span><strong className="text-gray-700 font-medium">Exit:</strong> {request.exitTime}</span>
                                            <span><strong className="text-gray-700 font-medium">Return:</strong> {request.returnTime}</span>
                                        </div>
                                        <div className="flex space-x-4">
                                            <span className={request.attendanceStatus === 'Low Attendance' ? 'text-red-600 font-medium' : ''}>
                                                Attendance: {request.attendanceAtApply}%
                                            </span>
                                            <span>Requested: {request.requestedAt}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Zap className="w-5 h-5 mr-2 text-[#1F8941]" />
                            Quick Actions
                        </h2>
                        <div className="space-y-3">
                            <button
                                onClick={() => router.push("/hod/pending-approvals")}
                                className="w-full bg-[#1F8941] text-white px-4 py-3 rounded-lg font-medium hover:bg-[#1a7a39] transition-colors flex items-center justify-center space-x-2 shadow-sm"
                            >
                                <Clock className="w-4 h-4" />
                                <span>Review Pending</span>
                            </button>

                            <button
                                onClick={() => router.push("/hod/bulk-actions")}
                                className="w-full border border-[#1F8941] text-[#1F8941] px-4 py-3 rounded-lg font-medium hover:bg-[#1F8941] hover:text-white transition-colors flex items-center justify-center space-x-2"
                            >
                                <Users className="w-4 h-4" />
                                <span>Bulk Approve</span>
                            </button>

                            <button
                                onClick={() => router.push("/hod/reports")}
                                className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                            >
                                <TrendingUp className="w-4 h-4" />
                                <span>View Reports</span>
                            </button>

                            <button
                                onClick={() => router.push("/hod/history")}
                                className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                            >
                                <History className="w-4 h-4" />
                                <span>View History</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                            Urgent Alerts
                        </h2>
                        <div className="space-y-3">
                            {urgentAlerts.length === 0 && (
                                <div className="rounded-lg border border-dashed border-red-200 bg-red-50/30 p-6 text-center text-sm text-red-400 font-medium">
                                    No urgent alerts right now.
                                </div>
                            )}
                            {urgentAlerts.map((alert) => (
                                <div key={alert.requestId} className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
                                    <p className="text-sm text-red-800 font-medium leading-relaxed">{alert.message}</p>
                                    <div className="flex items-center justify-between mt-3">
                                        <p className="text-xs text-red-600 font-medium">
                                            {alert.class} • {alert.timeAgo}
                                        </p>
                                        {alert.parentVerified && (
                                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-800 border border-red-200">
                                                Parent Verified
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}