'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  RefreshCw,
  Search,
  Users,
  GraduationCap,
  Phone,
  Mail,
  User,
  ChevronsLeftRight,
  Loader2
} from 'lucide-react'

interface StudentSummary {
  heading: string
  subHeading?: string
  total: number
}

interface StudentRecord {
  name: string
  rollNumber: string
  class?: string
  department?: string
  email?: string
  phone?: string
  parentName?: string
  parentContact?: string
  attendance?: number
  attendancePercentage?: number
  year?: number
  joinedAt?: string
}

interface StudentsResponse {
  type: 'list' | 'class' | 'single'
  context?: string
  total?: number
  count?: number
  class?: string
  department?: string
  students?: StudentRecord[]
  student?: StudentRecord
}

interface ClassesResponse {
  department: string
  classes: { name: string; year?: number }[]
}

type FilterOption = 'department' | 'myclass'

// 1. Rename the main component to act as the inner content
function StudentProfilesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const filterParam = searchParams.get('filter') === 'myclass' ? 'myclass' : 'department'
  const rollParam = (searchParams.get('roll') || '').trim()
  const classParam = searchParams.get('class') || ''

  const [classes, setClasses] = useState<ClassesResponse['classes']>([])
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [summary, setSummary] = useState<StudentSummary>({ heading: 'No students', total: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [searchRoll, setSearchRoll] = useState<string>('')

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

  const tokenOrThrow = () => {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Authentication required. Please log in again.')
    }
    return token
  }

  const buildSummary = (payload: StudentsResponse): StudentSummary => {
    if (payload.type === 'single' && payload.student) {
      return {
        heading: payload.student.name,
        subHeading: payload.student.class ? `${payload.student.class} • ${payload.student.department || ''}`.trim() : undefined,
        total: 1
      }
    }

    if (payload.type === 'class') {
      return {
        heading: `Class ${payload.class || ''}`.trim(),
        subHeading: payload.department,
        total: payload.count || (payload.students?.length ?? 0)
      }
    }

    return {
      heading: payload.context === 'myclass' ? 'My Class' : 'Department Students',
      subHeading: payload.context === 'myclass' ? 'Students from your assigned mentor class' : 'Students across your department',
      total: payload.total || (payload.students?.length ?? 0)
    }
  }

  const parseStudents = (payload: StudentsResponse): StudentRecord[] => {
    if (payload.type === 'single' && payload.student) {
      return [payload.student]
    }
    return payload.students || []
  }

  const fetchClasses = useCallback(async () => {
    try {
      const token = tokenOrThrow()
      const res = await fetch(`${apiUrl}/api/faculty/classes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message || 'Unable to fetch class list')
      }
      const data: ClassesResponse = await res.json()
      setClasses(data.classes || [])
    } catch (err) {
      console.error('Failed to load classes:', err)
      // Do not block the page if classes fail to load
    }
  }, [apiUrl])

  const fetchStudents = useCallback(
    async (
      options: {
        roll?: string
        className?: string
        showSpinner?: boolean
      } = {}
    ) => {
      const { roll, className, showSpinner = true } = options
      try {
        if (showSpinner) {
          setLoading(true)
        } else {
          setRefreshing(true)
        }
        setError(null)

        const token = tokenOrThrow()
        const url = new URL(`${apiUrl}/api/faculty/student-profiles`)
        if (filterParam === 'myclass' || filterParam === 'department') {
          url.searchParams.set('filter', filterParam)
        }
        if (roll) url.searchParams.set('roll', roll.trim())
        if (className) url.searchParams.set('class', className)

        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.message || 'Failed to load student profiles')
        }

        const payload: StudentsResponse = await res.json()
        const parsed = parseStudents(payload)

        setStudents(parsed)
        setSummary(buildSummary(payload))
      } catch (err: any) {
        console.error('Failed to load students:', err)
        setStudents([])
        setSummary({ heading: 'No students', total: 0 })
        setError(err.message || 'Unable to fetch student profiles. Please try again later.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [apiUrl, filterParam]
  )

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  useEffect(() => {
    setSearchRoll(rollParam)
    setSelectedClass(classParam)
    fetchStudents({
      roll: rollParam || undefined,
      className: classParam || undefined,
      showSpinner: true
    })
  }, [fetchStudents, rollParam, classParam, filterParam])

  const handleFilterChange = (value: FilterOption) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'department') {
      params.set('filter', 'department')
    } else {
      params.set('filter', 'myclass')
    }
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : '?')
  }

  const handleSearchRoll = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (searchRoll.trim()) {
      params.set('roll', searchRoll.trim())
      params.delete('class')
    } else {
      params.delete('roll')
    }
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : '?')
  }

  const handleClassSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('class', value)
      params.delete('roll')
    } else {
      params.delete('class')
    }
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : '?')
  }

  const resetFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('roll')
    params.delete('class')
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : '?')
  }

  const classOptions = useMemo(() => classes.map(c => c.name), [classes])

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Profiles</h1>
          <p className="text-sm text-gray-500">Browse, filter, and search students under your supervision.</p>
        </div>
        <button
          onClick={() => fetchStudents({ showSpinner: false })}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">View Scope</span>
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => handleFilterChange('department')}
              className={`px-4 py-2 text-sm font-medium ${filterParam === 'department' ? 'bg-[#1F8941] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
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

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="rollSearch">Search by Roll</label>
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="rollSearch"
                type="text"
                value={searchRoll}
                onChange={(e) => setSearchRoll(e.target.value)}
                placeholder="Enter roll number"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8941]"
              />
            </div>
            <button
              onClick={handleSearchRoll}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1F8941] px-3 py-2 text-sm font-medium text-white hover:bg-[#1a7a39]"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="classSelect">Filter by Class</label>
          <div className="flex items-center gap-2">
            <select
              id="classSelect"
              value={selectedClass}
              onChange={(e) => handleClassSelect(e.target.value)}
              className="w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8941]"
            >
              <option value="">All classes</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <ChevronsLeftRight className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#1F8941]" />
              {summary.heading}
            </h2>
            {summary.subHeading && (
              <p className="text-sm text-gray-500">{summary.subHeading}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total students</p>
            <p className="text-2xl font-semibold text-[#1F8941]">{summary.total}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading student profiles…
          </div>
        ) : students.length === 0 ? (
          <p className="text-sm text-gray-500">No student records found for the selected filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr className="text-gray-600">
                  <th className="px-4 py-3 text-left font-medium">Student</th>
                  <th className="px-4 py-3 text-left font-medium">Class</th>
                  <th className="px-4 py-3 text-left font-medium">Attendance</th>
                  <th className="px-4 py-3 text-left font-medium">Contact</th>
                  <th className="px-4 py-3 text-left font-medium">Parent Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student) => (
                  <tr key={student.rollNumber} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <User className="w-5 h-5 text-[#1F8941]" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{student.name}</p>
                          <p className="text-xs text-gray-500">{student.rollNumber}</p>
                          {student.email && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {student.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="space-y-1">
                        <p>{student.class || '—'}</p>
                        {student.department && (
                          <p className="text-xs text-gray-400">{student.department}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {student.attendancePercentage ?? student.attendance ?? '—'}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 text-gray-600">
                        {student.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {student.phone}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="space-y-1 text-xs">
                        {student.parentName && (
                          <p className="font-medium text-gray-700">{student.parentName}</p>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {student.parentContact || '—'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

// 2. Export the Suspense wrapper as the default component
export default function StudentProfilesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading student profiles...</div>}>
      <StudentProfilesContent />
    </Suspense>
  )
}