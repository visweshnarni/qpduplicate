'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Zap, Settings, LogOut } from 'lucide-react'

const menuItems = [
    { label: 'Scan Outpasses', path: '/security', icon: Zap }
]

export default function SecuritySidebar() {
    const router = useRouter()
    const pathname = usePathname()

    const handleLogout = () => {
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        router.push('/login')
    }

    return (
        <aside className="bg-white rounded-lg p-4 h-full flex flex-col space-y-2">
            {/* Menu Items */}
            <nav className="space-y-2 flex-1">
                {menuItems.map((item) => {
                    const IconComponent = item.icon
                    const isActive = pathname === item.path
                    return (
                        <button
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                                isActive
                                    ? 'bg-[#1F8941] text-white font-semibold'
                                    : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            <IconComponent className="w-5 h-5" />
                            <span>{item.label}</span>
                        </button>
                    )
                })}
            </nav>

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all border-t border-gray-200 pt-4"
            >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
            </button>
        </aside>
    )
}
