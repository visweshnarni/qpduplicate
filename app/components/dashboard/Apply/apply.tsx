"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Calendar, FileText, AlertCircle, CheckCircle } from 'lucide-react'

export default function Apply() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  // FIXED: Added type definition for errors object
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [user, setUser] = useState({
    name: '',
    email: '',
    rollNumber: '',
    department: ''
  })

  // Form state
  const [formData, setFormData] = useState({
    reason: '',
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: '',
    termsAccepted: false,
  })

  useEffect(() => {
    // Get user info from localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser)
      setUser({
        name: parsedUser.name || '',
        email: parsedUser.email || '',
        rollNumber: parsedUser.rollNumber || '',
        department: parsedUser.department || ''
      })
    }
  }, [])

  const validateForm = () => {
    // FIXED: Added type definition so TypeScript knows we can add string keys
    const newErrors: Record<string, string> = {}

    if (!formData.reason) {
      newErrors.reason = 'Please select a reason category'
    }

    if (!formData.dateTo) {
      newErrors.dateTo = 'Please select a return date'
    }

    const fromDate = new Date(formData.dateFrom)
    const toDate = new Date(formData.dateTo)
    const now = new Date()

    if (fromDate < new Date(now.setHours(0, 0, 0, 0))) {
      newErrors.dateFrom = 'Start date cannot be in the past'
    }

    if (toDate < fromDate) {
      newErrors.dateTo = 'Return date cannot be before start date'
    }

    if (!formData.termsAccepted) {
      newErrors.termsAccepted = 'You must accept the terms'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // FIXED: Added React.FormEvent type to prevent implicit 'any' error
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch('http://localhost:5000/api/outpass/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          rollNumber: user.rollNumber,
          department: user.department
        }),
      })

      if (res.ok) {
        const data = await res.json()
        console.log('Outpass request submitted successfully:', data)
        router.push('/student/status')
      } else {
        const error = await res.json()
        setErrors({ general: error.message || 'Failed to submit outpass' })
      }
    } catch (err) {
      console.error('Network or server error:', err)
      setErrors({ general: 'Network or server error. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // FIXED: Added string and any types to prevent implicit 'any' error
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

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
          {/* Student Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-[#1F8941]" />
              Student Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={user.name} disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="text" value={user.email} disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                <input type="text" value={user.rollNumber} disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input type="text" value={user.department} disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500" />
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-[#1F8941]" />
              Request Details
            </h2>
            <div className="space-y-4">
              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  placeholder="Please provide a detailed reason..."
                  className={`w-full px-3 py-2 border rounded-md resize-none focus:ring-2 focus:ring-[#1F8941] ${errors.reason ? 'border-red-300' : 'border-gray-300'}`}
                  required
                />
                {errors.reason && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.reason}
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date From <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dateFrom}
                    onChange={(e) => handleInputChange('dateFrom', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#1F8941] ${errors.dateFrom ? 'border-red-300' : 'border-gray-300'}`}
                    required
                  />
                  {errors.dateFrom && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.dateFrom}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date To <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dateTo}
                    onChange={(e) => handleInputChange('dateTo', e.target.value)}
                    min={formData.dateFrom}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#1F8941] ${errors.dateTo ? 'border-red-300' : 'border-gray-300'}`}
                    required
                  />
                  {errors.dateTo && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.dateTo}
                    </p>
                  )}
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={formData.termsAccepted}
                  onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
                  className="mt-1 w-4 h-4 text-[#1F8941] border-gray-300 rounded focus:ring-[#1F8941]"
                  required
                />
                <label htmlFor="terms" className="text-sm text-gray-700">
                  I confirm that the information provided is accurate. Providing false information may result in disciplinary action.
                  <span className="text-red-500"> *</span>
                </label>
              </div>
              {errors.termsAccepted && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.termsAccepted}
                </p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#1F8941] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#1a7a39] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
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

          {errors.general && (
            <p className="mt-4 text-sm text-red-600 text-center">{errors.general}</p>
          )}
        </form>
      </div>
    </div>
  )
}