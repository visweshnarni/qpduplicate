'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  GraduationCap,
  Users,
  FileText,
  History,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Droplet,
  Loader2,
  AlertCircle
} from 'lucide-react'

interface StudentProfile {
  _id: string
  name: string
  email: string
  rollNumber: string
  department: string
  year: number
  phone: string
  parentName: string
  parentPhone: string
  parentPhone2?: string
  profilePhoto?: string
  attendancePercentage?: number
  isActive?: boolean
  dateOfBirth?: string
  bloodGroup?: string
  address?: string
}

interface OutpassApplication {
  _id: string
  applicationId?: string
  status: string
  reason: string
  dateFrom: string
  dateTo: string
  facultyApproval?: {
    status: string
    timestamp?: string
  }
  hodApproval?: {
    status: string
    timestamp?: string
  }
  // FIXED: Changed studentId to studentInfo to match your state updates
  studentInfo?: {
    name: string
    rollNumber: string
    department: string
  }
  submittedAt?: string
  createdAt: string
}

export default function StudentProfilePage() {
  const router = useRouter()
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [currentOutpass, setCurrentOutpass] = useState<OutpassApplication | null>(null)
  const [recentActivity, setRecentActivity] = useState<OutpassApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [outpassLoading, setOutpassLoading] = useState(true)

  useEffect(() => {
    fetchStudentProfile()
    // fetchOutpassData is now integrated into fetchStudentProfile
  }, [])

  const fetchStudentProfile = async () => {
    try {
      setLoading(true)
      setProfileError(null)

      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      // Get API URL from environment variable
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await fetch(`${apiUrl}/api/student/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch profile')
      }

      const response = await res.json()
      
      // Extract profile from new response structure
      const profileData = response.profile || response
      
      // Normalize the data to match our interface
      const normalizedProfile: StudentProfile = {
        _id: profileData._id,
        name: profileData.name || '',
        email: profileData.email || '',
        rollNumber: profileData.rollNumber || '',
        department: profileData.department || '',
        year: profileData.year || 1,
        phone: profileData.phone || '',
        parentName: profileData.parentName || '',
        parentPhone: profileData.parentPhone || '',
        parentPhone2: profileData.parentPhone2,
        profilePhoto: profileData.profilePhoto,
        attendancePercentage: profileData.attendancePercentage || 0,
        isActive: profileData.isActive !== undefined ? profileData.isActive : true,
        dateOfBirth: profileData.dateOfBirth,
        bloodGroup: profileData.bloodGroup,
        address: profileData.address
      }

      setStudentProfile(normalizedProfile)
      
      // Set current outpass from response
      if (response.currentOutpass) {
        const outpass = response.currentOutpass
        setCurrentOutpass({
          _id: outpass._id,
          applicationId: outpass._id,
          status: outpass.status,
          reason: outpass.reason,
          dateFrom: outpass.dateFrom,
          dateTo: outpass.dateTo,
          facultyApproval: outpass.facultyApproval,
          hodApproval: outpass.hodApproval,
          studentInfo: {
            name: normalizedProfile.name,
            rollNumber: normalizedProfile.rollNumber,
            department: normalizedProfile.department
          },
          submittedAt: outpass.createdAt,
          createdAt: outpass.createdAt
        })
      } else {
        setCurrentOutpass(null)
      }
      
      // Set recent activity from response
      if (response.recentActivity && Array.isArray(response.recentActivity)) {
        const completed = response.recentActivity
          .filter(
            (outpass: any) =>
              outpass.status === 'approved' || outpass.status === 'rejected'
          )
          .map((outpass: any) => ({
            _id: outpass._id,
            applicationId: outpass._id,
            status: outpass.status,
            reason: outpass.reason,
            dateFrom: outpass.dateFrom,
            dateTo: outpass.dateTo,
            facultyApproval: outpass.facultyApproval,
            hodApproval: outpass.hodApproval,
            studentInfo: {
              name: normalizedProfile.name,
              rollNumber: normalizedProfile.rollNumber,
              department: normalizedProfile.department
            },
            submittedAt: outpass.createdAt,
            createdAt: outpass.createdAt
          }))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 5)
        setRecentActivity(completed)
      }
      
      setOutpassLoading(false)
    } catch (err: any) {
      setProfileError(err.message || 'Failed to load profile')
      setOutpassLoading(false)
    } finally {
      setLoading(false)
    }
  }

  // fetchOutpassData is now integrated into fetchStudentProfile
  // The API returns currentOutpass and recentActivity in the profile response

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          bg: 'bg-green-50',
          border: 'border-green-300',
          text: 'text-green-700',
          icon: <CheckCircle className="w-4 h-4" />
        }
      case 'rejected':
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          text: 'text-red-700',
          icon: <XCircle className="w-4 h-4" />
        }
      case 'pending_faculty':
      case 'submitted':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-300',
          text: 'text-blue-700',
          icon: <Clock className="w-4 h-4" />
        }
      case 'pending_hod':
      case 'under_review':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          text: 'text-yellow-700',
          icon: <Clock className="w-4 h-4" />
        }
      case 'teacher_approved':
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-300',
          text: 'text-purple-700',
          icon: <CheckCircle className="w-4 h-4" />
        }
      case 'hod_approved':
        return {
          bg: 'bg-indigo-50',
          border: 'border-indigo-300',
          text: 'text-indigo-700',
          icon: <CheckCircle className="w-4 h-4" />
        }
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-300',
          text: 'text-gray-700',
          icon: <Clock className="w-4 h-4" />
        }
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#1F8941] mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (profileError || !studentProfile) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-300 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
          <p className="text-red-700 mb-4">
            {profileError || 'No profile data available.'}
          </p>
          <button
            onClick={fetchStudentProfile}
            className="bg-[#1F8941] text-white px-6 py-2 rounded-lg hover:bg-[#1a7a39] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center space-x-6">
        <div className="relative">
          {studentProfile.profilePhoto ? (
            <img
              src={studentProfile.profilePhoto}
              alt={studentProfile.name}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#1F8941] flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
          )}
          {studentProfile.isActive && (
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {studentProfile.name}
            </h1>
            {studentProfile.isActive ? (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                Active Student
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                Inactive
              </span>
            )}
          </div>
          <p className="text-gray-600">
            {studentProfile.rollNumber} • {studentProfile.department} • Year {studentProfile.year}
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-2 mb-6">
            <User className="w-5 h-5 text-[#1F8941]" />
            <h2 className="text-lg font-semibold text-gray-900">
              Personal Information
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <User className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="text-gray-900 font-medium">{studentProfile.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-gray-900 font-medium">{studentProfile.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-gray-900 font-medium">{studentProfile.phone || 'N/A'}</p>
              </div>
            </div>
            {studentProfile.dateOfBirth && (
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="text-gray-900 font-medium">{formatDate(studentProfile.dateOfBirth)}</p>
                </div>
              </div>
            )}
            {studentProfile.bloodGroup && (
              <div className="flex items-center space-x-3">
                <Droplet className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Blood Group</p>
                  <p className="text-gray-900 font-medium">{studentProfile.bloodGroup}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Academic Information */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-2 mb-6">
            <GraduationCap className="w-5 h-5 text-[#1F8941]" />
            <h2 className="text-lg font-semibold text-gray-900">
              Academic Information
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Roll Number</p>
                <p className="text-gray-900 font-medium">{studentProfile.rollNumber}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <GraduationCap className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="text-gray-900 font-medium">{studentProfile.department}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Year</p>
                <p className="text-gray-900 font-medium">Year {studentProfile.year}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-4 h-4 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Attendance</p>
                <p className="text-gray-900 font-medium">
                  {studentProfile.attendancePercentage || 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Parent & Emergency Information */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Users className="w-5 h-5 text-[#1F8941]" />
          <h2 className="text-lg font-semibold text-gray-900">
            Parent & Emergency Information
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center space-x-3">
            <User className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Parent Name</p>
              <p className="text-gray-900 font-medium">{studentProfile.parentName || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Phone className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Parent Phone 1</p>
              <p className="text-gray-900 font-medium">{studentProfile.parentPhone || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Phone className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Parent Phone 2</p>
              <p className="text-gray-900 font-medium">
                {studentProfile.parentPhone2 || 'N/A'}
              </p>
            </div>
          </div>
          {studentProfile.address && (
            <div className="flex items-center space-x-3">
              <MapPin className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="text-gray-900 font-medium">{studentProfile.address}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Status & Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Status */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-2 mb-6">
            <FileText className="w-5 h-5 text-[#1F8941]" />
            <h2 className="text-lg font-semibold text-gray-900">Current Status</h2>
          </div>

          {outpassLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#1F8941]" />
            </div>
          ) : currentOutpass ? (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-lg border ${getStatusConfig(currentOutpass.status).bg} ${getStatusConfig(currentOutpass.status).border}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusConfig(currentOutpass.status).icon}
                    <span
                      className={`font-medium capitalize ${getStatusConfig(currentOutpass.status).text}`}
                    >
                      {currentOutpass.status.replace('_', ' ')}
                    </span>
                  </div>
                  {currentOutpass.applicationId && (
                    <span className="text-sm font-mono text-gray-600">
                      #{currentOutpass.applicationId}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 mb-2">{currentOutpass.reason}</p>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Exit: {formatDateTime(currentOutpass.dateFrom)}</span>
                  {currentOutpass.status === 'approved' && (
                    <span>Valid Until: {formatDateTime(currentOutpass.dateTo)}</span>
                  )}
                </div>
              </div>

              {currentOutpass.status === 'approved' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-green-800 flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5" />
                        <span>✓ Gatepass Active</span>
                      </h3>
                      <p className="text-sm text-green-700 mt-1">
                        Your gatepass is ready. Show this to security when exiting.
                      </p>
                    </div>
                    <button
                      onClick={() => router.push('/student/status')}
                      className="bg-[#1F8941] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1a7a39] transition-colors whitespace-nowrap"
                    >
                      View Gatepass →
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 mb-2 font-medium">No active requests</p>
              <p className="text-sm text-gray-400 mb-4">
                Apply for a new outpass to get started
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/student/apply')}
              className="w-full bg-[#1F8941] text-white px-4 py-3 rounded-lg hover:bg-[#1a7a39] flex items-center justify-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Apply New Outpass</span>
            </button>

            <button
              onClick={() => router.push('/student/status')}
              className="w-full border border-[#1F8941] text-[#1F8941] px-4 py-3 rounded-lg hover:bg-[#1F8941] hover:text-white flex items-center justify-center space-x-2 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>View Current Status</span>
            </button>

            <button
              onClick={() => router.push('/student/history')}
              className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 flex items-center justify-center space-x-2 transition-colors"
            >
              <History className="w-4 h-4" />
              <span>Check History</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-[#1F8941]" />
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          {recentActivity.length > 0 && (
            <button
              onClick={() => router.push('/student/history')}
              className="text-sm text-[#1F8941] hover:text-[#1a7a39] font-medium"
            >
              View All Activity →
            </button>
          )}
        </div>

        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((activity) => {
              const statusConfig = getStatusConfig(activity.status)
              return (
                <div
                  key={activity._id}
                  className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${statusConfig.bg} ${statusConfig.border} border`}
                  >
                    {statusConfig.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.reason}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(activity.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}
                  >
                    {activity.status.replace('_', ' ')}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  )
}