'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    User,
    FileText,
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle,
    Loader2,
    Phone,
    GraduationCap,
    Mail,
    Upload,
    X
} from 'lucide-react'

interface StudentProfile {
    _id?: string
    name: string
    email: string
    rollNumber: string
    collegeId?: string
    class?: string
    department: string
    year: number
    phone: string
    attendancePercentage?: number
    primaryParentContact?: string
    alternateParentContact?: string
}

interface FormData {
    reasonCategory: string
    detailedReason: string
    exitDate: string
    startTime: string
    endTime: string
    primaryContact: string
    alternateContact: string
    termsAccepted: boolean
}

interface FormErrors {
    [key: string]: string
}

const reasonCategories = [
    { value: 'emergency', label: 'Emergency', icon: '🚨' },
    { value: 'personal', label: 'Personal/Travel', icon: '✈️' },
    { value: 'appointment', label: 'Appointments', icon: '📅' },
    { value: 'religious', label: 'Religious', icon: '🕌' },
    { value: 'academic', label: 'Academic', icon: '📚' }
]

export default function ApplyOutpassPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [profileError, setProfileError] = useState<string | null>(null)
    const [hasActiveRequest, setHasActiveRequest] = useState(false)
    const [activeRequestId, setActiveRequestId] = useState<string | null>(null)

    const [studentProfile, setStudentProfile] = useState<StudentProfile>({
        _id: '',
        name: '',
        email: '',
        rollNumber: '',
        collegeId: '',
        class: '',
        department: '',
        year: 1,
        phone: '',
        attendancePercentage: 0,
        primaryParentContact: '',
        alternateParentContact: ''
    })

    const [formData, setFormData] = useState<FormData>({
        reasonCategory: '',
        detailedReason: '',
        exitDate: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        primaryContact: '',
        alternateContact: '',
        termsAccepted: false
    })

    const [errors, setErrors] = useState<FormErrors>({})
    const [proofFile, setProofFile] = useState<File | null>(null)
    const [databaseParentPhone, setDatabaseParentPhone] = useState<string | null>(null)

    const sanitizePhoneNumber = (phone?: string | null) =>
        phone ? phone.replace(/\D/g, '').slice(-10) : ''

    useEffect(() => {
        fetchApplyDetails()
        checkActiveRequest()
    }, [])

    const fetchApplyDetails = async () => {
        try {
            setLoading(true)
            setProfileError(null)

            const token = localStorage.getItem('token')
            if (!token) {
                router.push('/login')
                return
            }

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const res = await fetch(`${apiUrl}/api/student/apply-details`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (res.ok) {
                const data = await res.json()

                // Map the response to our student profile structure
                const sanitizedPrimaryContact = sanitizePhoneNumber(
                    data.primaryParentContact
                )
                const sanitizedAlternateContact = sanitizePhoneNumber(
                    data.alternateParentContact
                )

                setStudentProfile({
                    _id: data._id || '',
                    name: data.name || '',
                    email: data.email || '',
                    rollNumber: data.collegeId || data.rollNumber || '',
                    collegeId: data.collegeId || '',
                    class: data.class || '',
                    department: data.department || '',
                    year: data.year || 1,
                    phone: data.phone || '',
                    attendancePercentage: data.attendancePercentage || 0,
                    primaryParentContact: sanitizedPrimaryContact || '',
                    alternateParentContact: sanitizedAlternateContact || ''
                })

                // Store parent phone from database for validation and reflect in form
                if (sanitizedPrimaryContact) {
                    setDatabaseParentPhone(sanitizedPrimaryContact)
                }

                setFormData(prev => ({
                    ...prev,
                    primaryContact:
                        sanitizedPrimaryContact || prev.primaryContact || '',
                    alternateContact:
                        prev.alternateContact ||
                        sanitizedAlternateContact ||
                        ''
                }))
            } else {
                throw new Error('Failed to fetch apply details')
            }
        } catch (err: any) {
            setProfileError(err.message || 'Failed to load student details')
        } finally {
            setLoading(false)
        }
    }

    const checkActiveRequest = async () => {
        try {
            const token = localStorage.getItem('token')
            if (!token) {
                setHasActiveRequest(false)
                setActiveRequestId(null)
                return
            }

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const res = await fetch(`${apiUrl}/api/outpass/current`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (res.status === 404) {
                setHasActiveRequest(false)
                setActiveRequestId(null)
                return
            }

            if (!res.ok) {
                console.error('Failed to check current outpass:', res.status)
                setHasActiveRequest(false)
                setActiveRequestId(null)
                return
            }

            const json = await res.json().catch(() => null)
            const payload = json?.data || json

            if (payload) {
                setHasActiveRequest(true)
                setActiveRequestId(payload.requestId || payload._id || null)
            } else {
                setHasActiveRequest(false)
                setActiveRequestId(null)
            }
        } catch (err) {
            console.error('Error checking current outpass:', err)
            setHasActiveRequest(false)
            setActiveRequestId(null)
        }
    }

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {}

        if (!formData.reasonCategory) {
            newErrors.reasonCategory = 'Please select a reason category'
        }

        if (!formData.detailedReason) {
            newErrors.detailedReason = 'Please provide a detailed reason'
        } else if (formData.detailedReason.length < 10) {
            newErrors.detailedReason = 'Please provide at least 10 characters'
        } else if (formData.detailedReason.length > 500) {
            newErrors.detailedReason = 'Detailed reason cannot exceed 500 characters'
        }

        if (!formData.exitDate) {
            newErrors.exitDate = 'Please select an exit date'
        } else {
            const exitDate = new Date(formData.exitDate)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            exitDate.setHours(0, 0, 0, 0)

            if (exitDate.getTime() !== today.getTime()) {
                newErrors.exitDate = 'You can only apply for today\'s date'
            }
        }

        const now = new Date()
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        const currentTime = currentHour * 60 + currentMinute // Convert to minutes
        const minTime = 0
        const maxTime = 24 * 60

        // Validate start time
        if (!formData.startTime) {
            newErrors.startTime = 'Please select a start time'
        } else {
            const [startHour, startMinute] = formData.startTime.split(':').map(Number)
            const startTimeMinutes = startHour * 60 + startMinute

            if (formData.exitDate === new Date().toISOString().split('T')[0]) {
                if (startTimeMinutes <= currentTime) {
                    newErrors.startTime = 'Start time must be after the current time'
                }
            }

            if (startTimeMinutes < minTime || startTimeMinutes > maxTime) {
                newErrors.startTime = 'Start time must be within a valid range'
            }
        }

        // Validate end time
        if (!formData.endTime) {
            newErrors.endTime = 'Please select an end time'
        } else if (formData.startTime) {
            const [startHour, startMinute] = formData.startTime.split(':').map(Number)
            const [endHour, endMinute] = formData.endTime.split(':').map(Number)
            const startTimeMinutes = startHour * 60 + startMinute
            const endTimeMinutes = endHour * 60 + endMinute

            if (endTimeMinutes <= startTimeMinutes) {
                newErrors.endTime = 'End time must be after start time'
            }

            if (endTimeMinutes > maxTime) {
                newErrors.endTime = 'End time must be within a valid range'
            }
        }

        if (!formData.primaryContact) {
            newErrors.primaryContact = 'Primary contact is required'
        } else if (!/^[0-9]{10}$/.test(formData.primaryContact.replace(/\D/g, ''))) {
            newErrors.primaryContact = 'Please enter a valid 10-digit phone number'
        } else if (databaseParentPhone) {
            // Validate that entered primary contact matches database
            const enteredPhone = formData.primaryContact.replace(/\D/g, '')
            const dbPhone = databaseParentPhone.replace(/\D/g, '')
            if (enteredPhone !== dbPhone) {
                newErrors.primaryContact = 'Primary contact does not match the contact number in our records'
            }
        }

        if (formData.alternateContact && !/^[0-9]{10}$/.test(formData.alternateContact.replace(/\D/g, ''))) {
            newErrors.alternateContact = 'Please enter a valid 10-digit phone number'
        }

        if (!formData.termsAccepted) {
            newErrors.termsAccepted = 'Please accept the terms and conditions'
        }

        // // Validate proof file for categories that require it
        // const requiresProof = ['personal', 'appointment', 'academic'].includes(formData.reasonCategory)
        // if (requiresProof && !proofFile) {
        //     newErrors.proofFile = 'Please upload proof document (JPEG or PDF)'
        // }

        // Validate file type and size if file is uploaded
        if (proofFile) {
            const fileExtension = proofFile.name.split('.').pop()?.toLowerCase()
            const validExtensions = ['jpg', 'jpeg', 'pdf']
            if (!fileExtension || !validExtensions.includes(fileExtension)) {
                newErrors.proofFile = 'Please upload a JPEG or PDF file'
            } else if (proofFile.size > 5 * 1024 * 1024) { // 5MB limit
                newErrors.proofFile = 'File size must be less than 5MB'
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            // Scroll to first error
            const firstErrorField = Object.keys(errors)[0]
            if (firstErrorField) {
                const element = document.querySelector(`[name="${firstErrorField}"]`)
                element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
            return
        }

        setIsSubmitting(true)

        // 1. Get Geolocation (Required for Backend Campus Radius Check)
        let latitude = "";
        let longitude = "";

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error("Geolocation is not supported by your browser."));
                }
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });
            latitude = position.coords.latitude.toString();
            longitude = position.coords.longitude.toString();
            // ✅ ADD THIS CONSOLE LOG HERE
            console.log("📍 Captured Location -> Latitude:", latitude, "Longitude:", longitude);
        } catch (geoError: any) {
            setErrors({ general: 'Location access is required to apply for an outpass. Please enable location services in your browser settings.' });
            setIsSubmitting(false);
            return;
        }

        // 2. Prepare API Request
        const token = localStorage.getItem('token')
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

            const reasonCategoryLabel = reasonCategories.find(c => c.value === formData.reasonCategory)?.label || formData.reasonCategory

            const convertTo12Hour = (time24: string): string => {
                const [hours, minutes] = time24.split(':')
                const hour = parseInt(hours, 10)
                const ampm = hour >= 12 ? 'PM' : 'AM'
                const hour12 = hour % 12 || 12
                return `${hour12}:${minutes} ${ampm}`
            }

            const timeOfExit = convertTo12Hour(formData.startTime)
            const timeOfReturn = convertTo12Hour(formData.endTime)
            const dateOfExit = formData.exitDate

            const formDataToSend = new FormData()

            // Text fields
            formDataToSend.append('reasonCategory', reasonCategoryLabel)
            formDataToSend.append('reason', formData.detailedReason)
            formDataToSend.append('dateOfExit', dateOfExit)
            formDataToSend.append('timeOfExit', timeOfExit)
            formDataToSend.append('timeOfReturn', timeOfReturn)
            
            // Appending Geolocation data
            formDataToSend.append('latitude', latitude)
            formDataToSend.append('longitude', longitude)

            if (formData.alternateContact) {
                formDataToSend.append('alternateContact', formData.alternateContact)
            }

            const requiresProof = ['personal', 'appointment', 'academic'].includes(formData.reasonCategory)
            if (requiresProof && proofFile) {
                formDataToSend.append('supportingDocument', proofFile) // Changed to 'file' to match backend req.file convention
            }

            // 3. Fire API Call
            const res = await fetch(`${apiUrl}/api/outpass/apply`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Do NOT set Content-Type header manually when sending FormData
                },
                body: formDataToSend
            })

            const contentType = res.headers.get('content-type')
            const isJson = contentType && contentType.includes('application/json')

            if (res.ok) {
                if (isJson) {
                    try {
                        const data = await res.json()
                        console.log('Outpass request submitted successfully:', data)
                        
                        // Check if ML rejected it automatically
                        if (data.message === "Outpass rejected automatically") {
                             setErrors({ general: `Your request was automatically rejected: ${data.reason}` })
                             return;
                        }

                        alert('Outpass request submitted successfully!')
                        router.push('/student/status')
                    } catch (parseError) {
                        setErrors({ general: 'Server returned invalid response. Please check the console.' })
                    }
                } else {
                    setErrors({ general: 'Server returned an unexpected response. Please check the console.' })
                }
            } else {
                if (isJson) {
                    try {
                        const error = await res.json()
                        setErrors({ general: error.message || error.error || 'Failed to submit outpass request' })
                    } catch (parseError) {
                        setErrors({ general: `Server error (${res.status}). Please check the console.` })
                    }
                } else {
                    setErrors({ general: `Server error (${res.status}). The server may be down or the endpoint may not exist.` })
                }
            }
        } catch (err: any) {
            console.error('Network or server error:', err)
            setErrors({ general: `Network or server error: ${err.message || 'Please try again.'}` })
        } finally {
            setIsSubmitting(false)
        }
    }
    const handleInputChange = (field: keyof FormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[field]
                return newErrors
            })
        }
        // Clear proof file when switching away from categories that require it
        if (field === 'reasonCategory') {
            const requiresProof = ['personal', 'appointment', 'academic'].includes(value)
            if (!requiresProof) {
                setProofFile(null)
            }
        }
        // Validate primary contact in real-time if database phone is available
        if (field === 'primaryContact' && databaseParentPhone && value) {
            const enteredPhone = value.replace(/\D/g, '')
            const dbPhone = databaseParentPhone.replace(/\D/g, '')
            // Only validate if user has entered 10 digits
            if (enteredPhone.length === 10) {
                if (enteredPhone !== dbPhone) {
                    setErrors(prev => ({
                        ...prev,
                        primaryContact: 'Primary contact does not match the contact number in our records'
                    }))
                } else {
                    // Clear error if it matches
                    setErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.primaryContact
                        return newErrors
                    })
                }
            }
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setProofFile(file)
            if (errors.proofFile) {
                setErrors(prev => {
                    const newErrors = { ...prev }
                    delete newErrors.proofFile
                    return newErrors
                })
            }
        }
    }

    const handleRemoveFile = () => {
        setProofFile(null)
        // Reset file input
        const fileInput = document.getElementById('proofFile') as HTMLInputElement
        if (fileInput) {
            fileInput.value = ''
        }
    }

    const isWithinApplicationWindow = () => {
        return true
    }

    if (loading) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#1F8941] mx-auto mb-4" />
                        <p className="text-gray-600">Loading your information...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (profileError) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Profile</h2>
                    <p className="text-red-600 mb-4">{profileError}</p>
                    <button
                        onClick={fetchApplyDetails}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    if (hasActiveRequest) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-yellow-800 mb-2">Active Request in Progress</h2>
                    <p className="text-yellow-700 mb-4">
                        You already have an active outpass request {activeRequestId && `(${activeRequestId.slice(-6)})`}.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => router.push('/student/status')}
                            className="bg-[#1F8941] text-white px-6 py-2 rounded-lg hover:bg-[#1a7a39] transition-colors"
                        >
                            View Current Status
                        </button>
                        <button
                            onClick={() => router.push('/student/history')}
                            className="border border-[#1F8941] text-[#1F8941] px-6 py-2 rounded-lg hover:bg-[#1F8941] hover:text-white transition-colors"
                        >
                            View History
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const detailedReasonCount = formData.detailedReason.length

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <FileText className="w-6 h-6 mr-3 text-[#1F8941]" />
                        Apply for Outpass
                    </h1>
                    <p className="text-gray-600 mt-1">Fill out the form below to request an outpass</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {/* Student Information Section */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <User className="w-5 h-5 mr-2 text-[#1F8941]" />
                            Student Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={studentProfile.name}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    College ID
                                </label>
                                <input
                                    type="text"
                                    value={studentProfile.collegeId || studentProfile.rollNumber}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Class
                                </label>
                                <input
                                    type="text"
                                    value={studentProfile.class || `Year ${studentProfile.year}`}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Department
                                </label>
                                <input
                                    type="text"
                                    value={studentProfile.department}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Request Details Section */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-[#1F8941]" />
                            Request Details
                        </h2>
                        <div className="space-y-6">
                            {/* Reason Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Reason Category <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {reasonCategories.map((category) => (
                                        <button
                                            key={category.value}
                                            type="button"
                                            onClick={() => handleInputChange('reasonCategory', category.value)}
                                            className={`p-4 border-2 rounded-lg text-center transition-all ${formData.reasonCategory === category.value
                                                ? 'border-[#1F8941] bg-green-50 text-[#1F8941]'
                                                : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                        >
                                            <div className="text-2xl mb-2">{category.icon}</div>
                                            <div className="text-sm font-medium">{category.label}</div>
                                        </button>
                                    ))}
                                </div>
                                {errors.reasonCategory && (
                                    <p className="mt-2 text-sm text-red-600 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {errors.reasonCategory}
                                    </p>
                                )}
                            </div>

                            {/* Proof Upload - Conditional */}
                            {['personal', 'appointment', 'academic'].includes(formData.reasonCategory) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Upload Proof Document <span className="text-red-500">*</span>
                                    </label>
                                    <div className="space-y-2">
                                        {!proofFile ? (
                                            <label
                                                htmlFor="proofFile"
                                                className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                                            >
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                                    <p className="mb-2 text-sm text-gray-500">
                                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        JPEG or PDF (MAX. 5MB)
                                                    </p>
                                                </div>
                                                <input
                                                    id="proofFile"
                                                    name="proofFile"
                                                    type="file"
                                                    accept=".jpeg,.jpg,.pdf"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />
                                            </label>
                                        ) : (
                                            <div className="flex items-center justify-between p-4 border border-gray-300 rounded-lg bg-gray-50">
                                                <div className="flex items-center space-x-3">
                                                    <FileText className="w-5 h-5 text-[#1F8941]" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {proofFile.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {(proofFile.size / 1024).toFixed(2)} KB
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveFile}
                                                    className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {errors.proofFile && (
                                        <p className="mt-2 text-sm text-red-600 flex items-center">
                                            <AlertCircle className="w-4 h-4 mr-1" />
                                            {errors.proofFile}
                                        </p>
                                    )}
                                    <p className="mt-2 text-xs text-gray-500">
                                        {formData.reasonCategory === 'personal' && 'Upload proof of travel (ticket, booking confirmation, etc.)'}
                                        {formData.reasonCategory === 'appointment' && 'Upload proof of appointment (appointment letter, medical certificate, etc.)'}
                                        {formData.reasonCategory === 'academic' && 'Upload proof of academic requirement (conference invitation, academic event, etc.)'}
                                    </p>
                                </div>
                            )}

                            {/* Date and Time */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Outpass Date <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                        <input
                                            type="date"
                                            name="exitDate"
                                            value={formData.exitDate}
                                            onChange={(e) => handleInputChange('exitDate', e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            max={new Date().toISOString().split('T')[0]}
                                            className={`w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-[#1F8941] focus:outline-none ${errors.exitDate ? 'border-red-300' : 'border-gray-300'
                                                }`}
                                            required
                                            readOnly
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Applications are allowed only for today&apos;s date.
                                    </p>
                                    {errors.exitDate && (
                                        <p className="mt-1 text-sm text-red-600 flex items-center">
                                            <AlertCircle className="w-4 h-4 mr-1" />
                                            {errors.exitDate}
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Start Time <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                            <input
                                                type="time"
                                                name="startTime"
                                                value={formData.startTime}
                                                onChange={(e) => handleInputChange('startTime', e.target.value)}
                                                className={`w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-[#1F8941] focus:outline-none ${errors.startTime ? 'border-red-300' : 'border-gray-300'
                                                    }`}
                                                required
                                            />
                                        </div>
                                        {errors.startTime && (
                                            <p className="mt-1 text-sm text-red-600 flex items-center">
                                                <AlertCircle className="w-4 h-4 mr-1" />
                                                {errors.startTime}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            End Time <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                            <input
                                                type="time"
                                                name="endTime"
                                                value={formData.endTime}
                                                onChange={(e) => handleInputChange('endTime', e.target.value)}
                                                min={formData.startTime || undefined}
                                                className={`w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-[#1F8941] focus:outline-none ${errors.endTime ? 'border-red-300' : 'border-gray-300'
                                                    }`}
                                                required
                                            />
                                        </div>
                                        {errors.endTime && (
                                            <p className="mt-1 text-sm text-red-600 flex items-center">
                                                <AlertCircle className="w-4 h-4 mr-1" />
                                                {errors.endTime}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-xs text-blue-700 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-2" />
                                        <span>
                                            <strong>Note:</strong> Applications can only be submitted between 8:00 AM and 4:00 PM.
                                            End time must be after start time.
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Detailed Reason */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Detailed Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    name="detailedReason"
                                    rows={4}
                                    value={formData.detailedReason}
                                    onChange={(e) => handleInputChange('detailedReason', e.target.value)}
                                    placeholder="Please provide a detailed explanation..."
                                    className={`w-full px-3 py-2 border rounded-md resize-none focus:ring-2 focus:ring-[#1F8941] focus:outline-none ${errors.detailedReason ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    required
                                />
                                <div className="flex items-center justify-between mt-1">
                                    <div>
                                        {errors.detailedReason && (
                                            <p className="text-sm text-red-600 flex items-center">
                                                <AlertCircle className="w-4 h-4 mr-1" />
                                                {errors.detailedReason}
                                            </p>
                                        )}
                                    </div>
                                    <span
                                        className={`text-xs ${detailedReasonCount > 500
                                            ? 'text-red-600'
                                            : detailedReasonCount < 10
                                                ? 'text-yellow-600'
                                                : 'text-gray-500'
                                            }`}
                                    >
                                        {detailedReasonCount}/500
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Parent Contact Information */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Phone className="w-5 h-5 mr-2 text-[#1F8941]" />
                            Parent Contact Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Primary Contact <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    name="primaryContact"
                                    value={formData.primaryContact}
                                    onChange={(e) => handleInputChange('primaryContact', e.target.value)}
                                    placeholder="Enter parent's registered phone number"
                                    maxLength={10}
                                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#1F8941] focus:outline-none ${errors.primaryContact ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    required
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Enter the primary contact number registered in your profile.
                                    {databaseParentPhone && (
                                        <span className="ml-1">
                                            Registered number:&nbsp;
                                            <span className="font-medium text-gray-700">
                                                {databaseParentPhone}
                                            </span>
                                        </span>
                                    )}
                                </p>
                                {errors.primaryContact && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {errors.primaryContact}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Alternate Contact <span className="text-gray-500">(Optional)</span>
                                </label>
                                <input
                                    type="tel"
                                    name="alternateContact"
                                    value={formData.alternateContact}
                                    onChange={(e) => handleInputChange('alternateContact', e.target.value)}
                                    placeholder="10-digit phone number"
                                    maxLength={10}
                                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#1F8941] focus:outline-none ${errors.alternateContact ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                />
                                {errors.alternateContact && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {errors.alternateContact}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Terms and Conditions */}
                    <div>
                        <div
                            onClick={() => handleInputChange('termsAccepted', !formData.termsAccepted)}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.termsAccepted
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-200'
                                }`}
                        >
                            <div className="flex items-start space-x-3">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={formData.termsAccepted}
                                    onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
                                    className="mt-1 w-4 h-4 text-[#1F8941] border-gray-300 rounded focus:ring-[#1F8941]"
                                />
                                <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
                                    I confirm that the information provided above is accurate and complete. I understand that providing false information may result in disciplinary action and that I am responsible for following all college rules during my outpass period.
                                    <span className="text-red-500"> *</span>
                                </label>
                            </div>
                            {formData.termsAccepted && (
                                <div className="mt-2 flex items-center text-green-700">
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    <span className="text-sm font-medium">✓ Accepted</span>
                                </div>
                            )}
                        </div>
                        {errors.termsAccepted && (
                            <p className="mt-2 text-sm text-red-600 flex items-center">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                {errors.termsAccepted}
                            </p>
                        )}
                    </div>

                    {!isWithinApplicationWindow() && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-700 flex items-center">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                <span>
                                    <strong>Application Window:</strong> Applications can only be submitted between 8:00 AM and 4:00 PM.
                                    Please try again during these hours.
                                </span>
                            </p>
                        </div>
                    )}

                    {/* Error Message */}
                    {errors.general && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-red-600 flex items-center">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                {errors.general}
                            </p>
                        </div>
                    )}

                    {/* Submit Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.termsAccepted || !isWithinApplicationWindow()}
                            className="flex-1 bg-[#1F8941] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#1a7a39] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Submitting...</span>
                                </>
                            ) : !formData.termsAccepted ? (
                                <>
                                    <AlertCircle className="w-4 h-4" />
                                    <span>Accept Terms to Submit</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Submit Request</span>
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 sm:flex-initial border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
