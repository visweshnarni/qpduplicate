'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera } from 'lucide-react'
import QRScanner from '@/app/components/security/QRScanner'

interface SecurityStats {
    totalScanned: number
    todayScanned: number
    pendingVerification: number
    failedScans: number
}

export default function SecurityDashboardPage() {
    const router = useRouter()

    const [userData, setUserData] = useState<any>({
        name: 'Security Staff',
        email: 'security@example.com',
        role: 'security'
    })

    const [loading, setLoading] = useState(false)

    // 👇 NEW: control scanner start
    const [startScanner, setStartScanner] = useState(false)

    useEffect(() => {
        const user = localStorage.getItem('user')
        if (user) {
            try {
                setUserData(JSON.parse(user))
            } catch {
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

    return (
        <div className="p-6 space-y-6 overflow-y-auto h-full">

            {/* Header */}
            <div className="bg-gradient-to-r from-[#1F8941] to-[#1a7a39] text-white rounded-xl p-6">
                <h1 className="text-2xl font-bold mb-2">
                    Welcome, {userData?.name?.split(' ')[0]}! 👋
                </h1>
                <p className="text-green-100">
                    Security Staff • Gate Exit Scanner
                </p>
            </div>

            {/* Scanner Section */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">

                <div className="mb-6">
                    <div className="flex items-center space-x-3 mb-2">
                        <Camera className="w-6 h-6 text-[#1F8941]" />
                        <h2 className="text-xl font-bold text-gray-900">
                            Student Exit Verification
                        </h2>
                    </div>
                    <p className="text-gray-600 text-sm">
                        Scan QR codes or enter roll number
                    </p>
                </div>

                {/* 👇 IMPORTANT: button for mobile + desktop */}
                {!startScanner ? (
                    <button
                        onClick={() => setStartScanner(true)}
                        className="w-full bg-[#1F8941] text-white py-3 rounded-lg font-semibold hover:bg-[#166f34]"
                    >
                        Start Camera Scanner
                    </button>
                ) : (
                    <QRScanner />
                )}

            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-3">How to Use</h3>
                <ul className="space-y-2 text-blue-800 text-sm">
                    <li>1. Scan QR OR enter roll number</li>
                    <li>2. System verifies student</li>
                    <li>3. Exit is marked</li>
                    <li>4. Confirmation appears</li>
                </ul>
            </div>
        </div>
    )
}