'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Bell, User, LogOut, Shield } from 'lucide-react'

export default function SecurityHeader() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [userData, setUserData] = useState<any>({
        name: 'Security Staff',
        email: 'security@example.com'
    })
    const dropdownRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        // Try to load user from localStorage, but don't fail if not available
        try {
            const user = localStorage.getItem('user')
            if (user) {
                const parsedUser = JSON.parse(user)
                setUserData(parsedUser)
            }
        } catch (err) {
            // Use default dummy data
        }
    }, [])

    // Close profile dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        router.push('/login')
    }

    return (
        <header className="w-full font-poppins space-y-3 mt-3 mb-3 p-0 px-3">
            {/* Banner Section */}
            <div className="relative w-full bg-black">
                <Image
                    src="/images/title.png"
                    alt="Banner"
                    width={1920}
                    height={500}
                    style={{
                        width: '100%',
                        height: 'auto',
                        objectFit: 'contain',
                    }}
                    priority
                    onError={() => {
                        // If image fails to load, still show the header
                        console.log('Image failed to load')
                    }}
                />
            </div>

            {/* Horizontal Divider */}
            <div className="w-full border-t border-gray-400"></div>

            {/* Navigation Bar */}
            <nav className="w-full bg-[#1F8941] text-white p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Shield className="w-6 h-6" />
                    <span className="font-bold text-lg">Security Portal</span>
                </div>

                <div className="flex items-center space-x-6">
                    {/* Notifications */}
                    <button className="relative hover:bg-green-700 p-2 rounded-lg transition-colors">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setOpen(!open)}
                            className="flex items-center space-x-2 hover:bg-green-700 p-2 rounded-lg transition-colors"
                        >
                            <User className="w-5 h-5" />
                            <span className="text-sm">{userData?.name || 'Security Staff'}</span>
                        </button>

                        {open && (
                            <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-lg shadow-lg z-50">
                                <div className="p-4 border-b border-gray-200">
                                    <p className="font-semibold">{userData?.name}</p>
                                    <p className="text-sm text-gray-600">{userData?.email}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>
        </header>
    )
}
