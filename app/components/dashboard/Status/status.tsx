'use client'

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react' // ✅ ADDED THIS IMPORT
import {
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Shield,
  TimerReset,
  User,
  X,
  XCircle,
  Bot,
  PhoneCall,
  LogOut,
  QrCode
} from 'lucide-react'

type RawStatus =
  | 'pending_ml'
  | 'pending_parent'
  | 'pending_faculty'
  | 'pending_hod'
  | 'approved'
  | 'exited'
  | 'rejected'
  | 'cancelled_by_student'
  | 'unknown'

interface OutpassApplication {
  requestId: string
  status: RawStatus | string
  reasonCategory: string
  reason: string
  dateFrom: string
  dateTo: string
  exitTime: string
  returnTime: string
  supportingDocumentUrl?: string
  assignedFaculty: PersonContact | null
  assignedHod: PersonContact | null
  assignedMentors: PersonContact[]
  notifiedFaculty: PersonContact[]
  statusUpdates: StatusUpdate[]
}

interface StatusUpdate {
  time: string
  message: string
}

type StatusConfig = {
  title: string
  message: string
  cardBg: string
  border: string
  textColor: string
  iconBg: string
  iconColor: string
  icon: ReactNode
}

type UpdateTheme = {
  border: string
  background: string
  text: string
  icon: ReactNode
}

type NormalizedStatus = RawStatus

type PersonContact = {
  name: string
  email?: string
  phone?: string
}

// 1. Map backend statuses to our clean frontend types
const normalizeStatus = (status: RawStatus | string | undefined): NormalizedStatus => {
  if (!status) return 'unknown'
  const validStatuses: RawStatus[] = [
    'pending_ml', 'pending_parent', 'pending_faculty', 
    'pending_hod', 'approved', 'exited', 'rejected', 'cancelled_by_student'
  ]
  return validStatuses.includes(status as RawStatus) ? (status as RawStatus) : 'unknown'
}

// 2. Main Banner Configurations for each state
const statusConfigs: Record<NormalizedStatus, StatusConfig> = {
  pending_ml: {
    title: 'Analyzing Request',
    message: 'Our AI is currently analyzing your request details and documents.',
    cardBg: 'bg-blue-50',
    border: 'border-blue-100',
    textColor: 'text-blue-900',
    iconBg: 'bg-blue-100/80',
    iconColor: 'text-blue-600',
    icon: <Bot className="w-6 h-6" />
  },
  pending_parent: {
    title: 'Parent Verification Required',
    message: 'We are contacting your parents via an automated call. Waiting for them to press 1 to approve.',
    cardBg: 'bg-orange-50',
    border: 'border-orange-100',
    textColor: 'text-orange-900',
    iconBg: 'bg-orange-100/80',
    iconColor: 'text-orange-600',
    icon: <PhoneCall className="w-6 h-6" />
  },
  pending_faculty: {
    title: 'Under Faculty Review',
    message: 'Parent has approved. Your request is now being reviewed by your assigned faculty.',
    cardBg: 'bg-yellow-50',
    border: 'border-yellow-100',
    textColor: 'text-yellow-900',
    iconBg: 'bg-yellow-100/80',
    iconColor: 'text-yellow-600',
    icon: <AlertCircle className="w-6 h-6" />
  },
  pending_hod: {
    title: 'HOD Approval Required',
    message: 'Faculty has approved your request. Waiting for final review from the Head of Department.',
    cardBg: 'bg-purple-50',
    border: 'border-purple-100',
    textColor: 'text-purple-900',
    iconBg: 'bg-purple-100/80',
    iconColor: 'text-purple-600',
    icon: <CheckCircle className="w-6 h-6" />
  },
  approved: {
    title: 'Approved',
    message: 'Your outpass is fully approved. Generate your live QR code at the security gate to exit.',
    cardBg: 'bg-green-50',
    border: 'border-green-100',
    textColor: 'text-green-900',
    iconBg: 'bg-green-100/80',
    iconColor: 'text-green-600',
    icon: <CheckCircle className="w-6 h-6" />
  },
  exited: {
    title: 'Exited Campus',
    message: 'Security has verified your gatepass and you have successfully exited the campus.',
    cardBg: 'bg-teal-50',
    border: 'border-teal-100',
    textColor: 'text-teal-900',
    iconBg: 'bg-teal-100/80',
    iconColor: 'text-teal-600',
    icon: <LogOut className="w-6 h-6" />
  },
  rejected: {
    title: 'Request Rejected',
    message: 'Unfortunately, your request was rejected. See the updates below for details.',
    cardBg: 'bg-red-50',
    border: 'border-red-100',
    textColor: 'text-red-900',
    iconBg: 'bg-red-100/80',
    iconColor: 'text-red-600',
    icon: <XCircle className="w-6 h-6" />
  },
  cancelled_by_student: {
    title: 'Request Cancelled',
    message: 'You have cancelled this outpass request.',
    cardBg: 'bg-gray-50',
    border: 'border-gray-200',
    textColor: 'text-gray-800',
    iconBg: 'bg-gray-200/80',
    iconColor: 'text-gray-500',
    icon: <XCircle className="w-6 h-6" />
  },
  unknown: {
    title: 'Status Unavailable',
    message: 'We could not determine the current status. Try refreshing the page.',
    cardBg: 'bg-gray-50',
    border: 'border-gray-200',
    textColor: 'text-gray-600',
    iconBg: 'bg-gray-100/80',
    iconColor: 'text-gray-500',
    icon: <AlertCircle className="w-6 h-6" />
  }
}

// 3. Mini Timeline Update Themes
const updateThemes: Record<NormalizedStatus, UpdateTheme> = {
  pending_ml: { border: 'border-blue-200', background: 'bg-blue-50', text: 'text-blue-700', icon: <Bot className="w-5 h-5 text-blue-500" /> },
  pending_parent: { border: 'border-orange-200', background: 'bg-orange-50', text: 'text-orange-700', icon: <PhoneCall className="w-5 h-5 text-orange-500" /> },
  pending_faculty: { border: 'border-yellow-200', background: 'bg-yellow-50', text: 'text-yellow-700', icon: <AlertCircle className="w-5 h-5 text-yellow-500" /> },
  pending_hod: { border: 'border-purple-200', background: 'bg-purple-50', text: 'text-purple-700', icon: <CheckCircle className="w-5 h-5 text-purple-500" /> },
  approved: { border: 'border-green-200', background: 'bg-green-50', text: 'text-green-700', icon: <CheckCircle className="w-5 h-5 text-green-500" /> },
  exited: { border: 'border-teal-200', background: 'bg-teal-50', text: 'text-teal-700', icon: <LogOut className="w-5 h-5 text-teal-500" /> },
  rejected: { border: 'border-red-200', background: 'bg-red-50', text: 'text-red-700', icon: <XCircle className="w-5 h-5 text-red-500" /> },
  cancelled_by_student: { border: 'border-gray-200', background: 'bg-gray-50', text: 'text-gray-700', icon: <X className="w-5 h-5 text-gray-500" /> },
  unknown: { border: 'border-gray-200', background: 'bg-gray-50', text: 'text-gray-600', icon: <Clock className="w-5 h-5 text-gray-400" /> }
}

const getUpdateTheme = (message: string): UpdateTheme => {
  const lower = message.toLowerCase()
  if (lower.includes('rejected')) return updateThemes.rejected
  if (lower.includes('cancelled')) return updateThemes.cancelled_by_student
  if (lower.includes('exit') || lower.includes('security')) return updateThemes.exited
  if (lower.includes('hod')) return updateThemes.pending_hod
  if (lower.includes('faculty')) return updateThemes.pending_faculty
  if (lower.includes('parent')) return updateThemes.pending_parent
  if (lower.includes('approved')) return updateThemes.approved
  return updateThemes.pending_ml
}

// Formatters
const formatDate = (value?: string) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

const formatDateTime = (value?: string) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(value))
}

const reasonCategoryLabel = (category?: string) => {
  if (!category) return '—'
  return category.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

const sanitizeContacts = (contacts: any): PersonContact[] => {
  if (!contacts) return []
  const list = Array.isArray(contacts) ? contacts : [contacts]
  return list
    .map(contact => ({
      name: contact?.name?.trim?.() || '—',
      email: contact?.email?.trim?.() || undefined,
      phone: contact?.phone?.toString()?.replace(/\u202a|\u202c/g, '')?.trim() || undefined
    }))
    .filter(contact => contact.name !== '—')
}

export default function Status() {
  const router = useRouter()

  const [application, setApplication] = useState<OutpassApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [studentInfo, setStudentInfo] = useState({ name: '', rollNumber: '', department: '', year: '' })

  // ✅ QR Logic State
  const [qrData, setQrData] = useState<{ token: string; expiresAt: Date } | null>(null)
  const [generatingQr, setGeneratingQr] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:5000'

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        setStudentInfo({
          name: parsed?.name || '',
          rollNumber: parsed?.rollNumber || '',
          department: parsed?.department || '',
          year: parsed?.year ? `Year ${parsed.year}` : ''
        })
      }
    } catch (err) {}
  }, [])

  const fetchStatus = useCallback(
    async (isRefresh = false) => {
      try {
        setError(null)
        if (isRefresh) setRefreshing(true)
        else setLoading(true)

        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/login')
          return
        }

        const statusRes = await fetch(`${apiUrl}/api/outpass/current`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (statusRes.status === 404) {
          setApplication(null)
          return
        }

        const statusJson = await statusRes.json().catch(() => null)

        if (!statusRes.ok) {
          throw new Error(statusJson?.message || 'Failed to fetch current application status')
        }

        const rawApplication = statusJson?.data || statusJson || null
        if (!rawApplication) {
          setApplication(null)
          return
        }

        const facultyContacts = sanitizeContacts(rawApplication.assignedFaculty)
        const hodContacts = sanitizeContacts(rawApplication.assignedHod)
        const mentorContacts = sanitizeContacts(rawApplication.assignedMentors)
        const notifiedContacts = sanitizeContacts(rawApplication.notifiedFaculty)

        setApplication({
          requestId: rawApplication.requestId || '',
          status: rawApplication.status || 'unknown',
          reasonCategory: rawApplication.reasonCategory || '',
          reason: rawApplication.reason || '',
          dateFrom: rawApplication.dateFrom || '',
          dateTo: rawApplication.dateTo || '',
          exitTime: rawApplication.exitTime || '',
          returnTime: rawApplication.returnTime || '',
          supportingDocumentUrl: rawApplication.supportingDocumentUrl || '',
          assignedFaculty: facultyContacts[0] || null,
          assignedHod: hodContacts[0] || null,
          assignedMentors: mentorContacts,
          notifiedFaculty: notifiedContacts.length ? notifiedContacts : mentorContacts,
          statusUpdates: Array.isArray(rawApplication.statusUpdates) ? rawApplication.statusUpdates : []
        })
      } catch (err: any) {
        setError(err.message || 'Something went wrong. Please try again.')
      } finally {
        setLoading(false)
        setRefreshing(false)
        setCancelling(false)
      }
    },
    [apiUrl, router]
  )

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // ✅ Countdown Timer Effect for the QR Code
  useEffect(() => {
    if (!qrData) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = qrData.expiresAt.getTime();
      const difference = expires - now;

      if (difference <= 0) {
        setQrData(null);
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(Math.floor(difference / 1000)); // seconds
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [qrData]);

  // ✅ Generate Secure QR Token
  const handleGenerateQR = async () => {
    if (!application?.requestId) return;
    setGeneratingQr(true);
    setQrError(null);

    try {
      // 1. Get GPS Location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation is not supported by your browser."));
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000, maximumAge: 0
        });
      });

      const token = localStorage.getItem('token');
      
      // 2. Fetch Token from Backend
      const res = await fetch(`${apiUrl}/api/qr/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          outpassId: application.requestId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to generate QR");

      setQrData({
        token: data.token,
        expiresAt: new Date(data.expiresAt)
      });

    } catch (err: any) {
      setQrError(err.message || "Could not generate QR. Please check your location permissions.");
    } finally {
      setGeneratingQr(false);
    }
  };

  const normalizedStatus = useMemo(() => normalizeStatus(application?.status), [application?.status])
  const statusConfig = statusConfigs[normalizedStatus] ?? statusConfigs.unknown
  const submittedTimestamp = application?.statusUpdates?.[0]?.time || application?.dateFrom || ''

  // Dynamic Timeline Builder
  const timelineSteps = useMemo(() => {
    if (!application) return []

    return [
      {
        key: 'submitted',
        label: 'Request Evaluated',
        complete: true,
      },
      {
        key: 'parent',
        label: 'Parent Approval',
        complete: ['pending_faculty', 'pending_hod', 'approved', 'exited'].includes(normalizedStatus),
      },
      {
        key: 'college',
        label: 'College Review',
        complete: ['approved', 'exited'].includes(normalizedStatus),
      },
      {
        key: 'gatepass',
        label: 'Gatepass Ready',
        complete: ['approved', 'exited'].includes(normalizedStatus),
      }
    ]
  }, [application, normalizedStatus])

  const statusUpdatesList = useMemo(() => {
    if (!application?.statusUpdates) return []
    return [...application.statusUpdates].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    )
  }, [application])

  const canCancel = ['pending_ml', 'pending_parent', 'pending_faculty', 'pending_hod'].includes(normalizedStatus)

  const handleRefresh = () => fetchStatus(true)

  const handleCancelRequest = async () => {
    if (!application?.requestId) return
    if (!window.confirm('Are you sure you want to cancel this outpass request?')) return

    try {
      setCancelling(true)
      const token = localStorage.getItem('token')
      const res = await fetch(`${apiUrl}/api/outpass/${application.requestId}/cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      })

      if (!res.ok) throw new Error('Failed to cancel request')
      fetchStatus(true)
    } catch (err: any) {
      setError(err.message || 'Unable to cancel request. Please try again.')
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#1F8941]" />
          <p className="text-sm text-gray-600">Loading application status...</p>
        </div>
      </div>
    )
  }

  if (error && !application) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <div>
            <h2 className="text-lg font-semibold text-red-800">Unable to fetch status</h2>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button onClick={() => fetchStatus()} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center space-y-4">
          <TimerReset className="w-12 h-12 mx-auto text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-800">No Active Outpass Request</h2>
          <p className="text-sm text-gray-500">You do not have an active outpass for today. Apply now to get started.</p>
          <button onClick={() => router.push('/student/apply')} className="px-6 py-3 rounded-lg bg-[#1F8941] text-white hover:bg-[#1a7a39]">
            Apply for Outpass
          </button>
        </div>
      </div>
    )
  }

  const requestDetailsCard = (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <User className="w-5 h-5 text-[#1F8941]" /> Request Details
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DetailItem label="Reason Category" value={reasonCategoryLabel(application.reasonCategory)} />
        <DetailItem label="Exit Date" value={formatDate(application.dateFrom)} />
        <DetailItem label="Exit Time" value={application.exitTime || '—'} />
        <DetailItem label="Return Time" value={application.returnTime || '—'} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Detailed Reason</p>
        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-4">{application.reason || '—'}</p>
      </div>

      {application.supportingDocumentUrl && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Supporting Document</p>
          <a href={application.supportingDocumentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-medium text-[#1F8941] hover:underline">
            View uploaded document
          </a>
        </div>
      )}

      {application.notifiedFaculty.length > 0 && (
         <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notified Faculty</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {application.notifiedFaculty.map((faculty, idx) => (
              <ContactCard key={idx} contact={faculty} />
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const gatepassCard = ['approved', 'exited'].includes(normalizedStatus) && (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-900">
          <Shield className="w-5 h-5 text-[#1F8941]" />
          <h2 className="text-lg font-semibold">Digital Gatepass</h2>
        </div>
        {normalizedStatus === 'exited' && (
          <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2 py-1 rounded">USED</span>
        )}
      </div>

      <div className={`text-white rounded-lg p-6 space-y-4 shadow-inner ${normalizedStatus === 'exited' ? 'bg-gray-400' : 'bg-gradient-to-br from-[#1F8941] to-[#1a7a39]'}`}>
        <div>
          <p className="text-sm tracking-[0.3em] uppercase opacity-80">QuickPass</p>
          <p className="text-2xl font-bold mt-2">Gatepass</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">{studentInfo.name || '—'}</p>
          <p className="opacity-80">{studentInfo.rollNumber || '—'} • {studentInfo.department || '—'}</p>
          <p className="opacity-80">Exit: {formatDate(application.dateFrom)} at {application.exitTime || '—'}</p>
          <p className="tracking-[0.3em] text-xs uppercase opacity-70 mt-2">
            {application.requestId ? `QP-${application.requestId.slice(-6).toUpperCase()}` : 'QP-XXXXXX'}
          </p>
        </div>
        
        {/* ✅ DYNAMIC SECURE QR SECTION */}
        {normalizedStatus !== 'exited' && (
          <div className="flex flex-col items-center justify-center pt-4 border-t border-white/20 mt-4">
            {qrData ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="bg-white p-3 rounded-xl shadow-md">
                  <QRCodeSVG 
                    value={qrData.token} 
                    size={160} 
                    level="H" 
                    includeMargin={true}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Valid for Security Exit</p>
                  <p className="text-xs opacity-90 font-mono">
                    Expires in: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </p>
                </div>
                <p className="text-[10px] opacity-70 text-center px-4">
                  If this code expires before you reach the gate, click generate again.
                </p>
              </div>
            ) : (
              <div className="text-center space-y-3 py-2">
                <QrCode className="w-12 h-12 mx-auto opacity-70" />
                <p className="text-sm font-medium">Generate Live QR Code</p>
                <p className="text-xs opacity-80 px-4">
                  You can only generate this code <b>30 minutes</b> before your requested exit time, and you must be <b>at the gate</b>.
                </p>
                <button 
                  onClick={handleGenerateQR}
                  disabled={generatingQr}
                  className="mt-2 bg-white text-[#1F8941] px-6 py-2 rounded-full text-sm font-bold shadow-md hover:bg-gray-50 transition-colors disabled:opacity-80 flex items-center justify-center space-x-2 mx-auto"
                >
                  {generatingQr ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Location...</span>
                    </>
                  ) : (
                    <span>Generate Now</span>
                  )}
                </button>
                {qrError && (
                  <div className="bg-red-500/20 border border-red-500 text-white text-xs p-2 rounded text-left mt-3">
                    <AlertCircle className="w-3 h-3 inline mr-1 mb-[2px]" />
                    {qrError}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Request Status</h1>
            <p className="text-sm text-gray-500">Keep track of your application&apos;s live progress.</p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        <div className={`rounded-2xl border ${statusConfig.border} ${statusConfig.cardBg} px-6 py-5`}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${statusConfig.iconBg} ${statusConfig.iconColor}`}>
                {statusConfig.icon}
              </div>
              <div className={`space-y-2 ${statusConfig.textColor}`}>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide opacity-80">Current Stage</p>
                  <h2 className="text-xl font-semibold">{statusConfig.title}</h2>
                </div>
                <p className="text-sm leading-relaxed max-w-xl">{statusConfig.message}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Progress</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6">
          {timelineSteps.map((step, index) => {
            const isComplete = step.complete
            const previousStepsCompleted = timelineSteps.slice(0, index).every(prev => prev.complete)
            const isCurrent = !step.complete && previousStepsCompleted

            return (
              <div key={step.key} className="flex flex-col items-center text-center space-y-2 flex-1">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${isComplete ? 'border-[#1F8941] bg-[#E8F5EB] text-[#1F8941]' : isCurrent ? 'border-[#1F8941] border-dashed text-[#1F8941]' : 'border-gray-200 text-gray-400 bg-white'} shadow-sm`}>
                  {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <p className={`text-sm font-medium ${isComplete ? 'text-[#1F8941]' : 'text-gray-600'}`}>{step.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Request Details and Gatepass */}
      {gatepassCard ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {requestDetailsCard}
          {gatepassCard}
        </div>
      ) : (
        requestDetailsCard
      )}

      {/* Status Updates directly from Backend */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Live Status Log</h2>
        {statusUpdatesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center border border-dashed border-gray-200 rounded-lg py-10 space-y-3">
            <Clock className="w-6 h-6 text-gray-400" />
            <p className="text-sm text-gray-500">No status updates available yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {statusUpdatesList.map((update, index) => {
              const theme = getUpdateTheme(update.message)
              return (
                <div key={index} className={`flex items-start gap-3 rounded-lg border ${theme.border} ${theme.background} p-4`}>
                  <div className="mt-1">{theme.icon}</div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${theme.text}`}>{update.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{formatDateTime(update.time)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      {canCancel && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
          <p className="text-sm text-gray-500">You can cancel your request while it is still pending approval.</p>
          <button onClick={handleCancelRequest} disabled={cancelling} className="w-full inline-flex items-center justify-center gap-2 border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
            {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            <span>{cancelling ? 'Cancelling...' : 'Cancel Request'}</span>
          </button>
        </div>
      )}
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}

function ContactCard({ contact }: { contact: PersonContact }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 space-y-1">
      <p className="font-semibold text-gray-900">{contact.name}</p>
      {contact.email && <p className="text-xs text-gray-500">{contact.email}</p>}
      {contact.phone && <p className="text-xs text-gray-500">{contact.phone}</p>}
    </div>
  )
}