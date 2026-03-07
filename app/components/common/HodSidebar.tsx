'use client';

import { useRouter, usePathname } from 'next/navigation';

const menuItems = [
    { label: 'Dashboard', path: '/hod' },
    { label: 'Pending Approvals', path: '/hod/pending-approvals' },
    { label: 'Reports', path: '/hod/reports' },
    { label: 'History', path: '/hod/history' },
    { label: 'Logout', path: '/hod/logout' },
];

export default function HodSidebar() {
    const router = useRouter();
    const pathname = usePathname();

    return (
        <aside className="left-0 h-full w-full shadow p-0 z-40 hidden md:flex flex-col bg-[#1F8941] mb-6">

            {/* Menu Items */}
            <div className="space-y-1 flex-1 overflow-y-auto px-3 py-3">
                {menuItems.map((item) => (
                    <button
                        key={item.label}
                        type="button"
                        onClick={() => router.push(item.path)}
                        className={`cursor-pointer w-full flex items-center justify-center
        px-3 py-3 rounded-md text-[16px] font-normal 
        ${pathname === item.path
                                ? 'bg-white text-[#1F8941] font-semibold'
                                : 'text-white hover:bg-white hover:text-[#1F8941] hover:font-semibold'
                            }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

        </aside>
    );
}
