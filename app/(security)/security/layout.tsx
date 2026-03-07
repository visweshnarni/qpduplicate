"use client";

import SecurityHeader from "@/app/components/common/SecurityHeader";
import SecuritySidebar from "@/app/components/common/SecuritySidebar";
import Footer from "@/app/components/common/Footer";

export default function SecurityLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#FFFFFF] m-0 p-0 flex flex-col">
            {/* Top header */}
            <SecurityHeader />

            {/* Sidebar + Content - flex-1 to take remaining space */}
            <div className="flex px-3 flex-1 gap-3">
                {/* Sidebar with fixed width */}
                <div className="w-72 flex-shrink-0">
                    <SecuritySidebar />
                </div>

                {/* Main content area */}
                <main className="flex-1 relative overflow-hidden">
                    {children}
                </main>
            </div>
            
            {/* Footer */}
            <Footer />
        </div>
    );
}
