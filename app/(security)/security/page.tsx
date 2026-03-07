'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, CheckCircle, AlertCircle, BarChart3, Clock } from 'lucide-react'
import QRScanner from '@/app/components/security/QRScanner'

interface SecurityStats {
    totalScanned: number
    todayScanned: number
    pendingVerification: number
    failedScans: number
}

export default function SecurityDashboardPage() {
    const router = useRouter()
    // Dummy data for now - will be replaced with real API calls later
    const [stats, setStats] = useState<SecurityStats>({
        totalScanned: 47,
        todayScanned: 12,
        pendingVerification: 8,
        failedScans: 2
    })
    const [userData, setUserData] = useState<any>({
        name: 'Security Staff',
        email: 'security@example.com',
        role: 'security'
    })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        // Load user from localStorage if available
        const user = localStorage.getItem('user')
        if (user) {
            try {
                setUserData(JSON.parse(user))
            } catch (err) {
                console.log('Using default user data')
            }
        }
    }, [])

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1F8941] mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    // Use dummy user name for fallback

    return (
        <div className="p-6 space-y-6 overflow-y-auto h-full">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-[#1F8941] to-[#1a7a39] text-white rounded-xl p-6">
                <div>
                    <h1 className="text-2xl font-bold mb-2">
                        Welcome, {userData?.name?.split(' ')[0]}! 👋
                    </h1>
                    <p className="text-green-100">
                        Security Staff • Gate Exit Scanner
                    </p>
                </div>
            </div>

            {/* QR Scanner Section */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="mb-6">
                    <div className="flex items-center space-x-3 mb-2">
                        <Camera className="w-6 h-6 text-[#1F8941]" />
                        <h2 className="text-xl font-bold text-gray-900">Student Exit Verification</h2>
                    </div>
                    <p className="text-gray-600 text-sm">
                        Scan QR codes or enter roll number to mark students as exited from the campus
                    </p>
                </div>
                <QRScanner />
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-3">How to Use</h3>
                <ul className="space-y-2 text-blue-800 text-sm">
                    <li className="flex items-start space-x-2">
                        <span className="font-bold">1.</span>
                        <span>Either scan the student's QR code using the scanner</span>
                    </li>
                    <li className="flex items-start space-x-2">
                        <span className="font-bold">2.</span>
                        <span>Or enter the student's roll number manually</span>
                    </li>
                    <li className="flex items-start space-x-2">
                        <span className="font-bold">3.</span>
                        <span>System will verify and mark the student as exited</span>
                    </li>
                    <li className="flex items-start space-x-2">
                        <span className="font-bold">4.</span>
                        <span>A confirmation message will appear on successful verification</span>
                    </li>
                </ul>
            </div>
        </div>
    )
}
