"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
    LayoutDashboard,
    CalendarCheck,
    Users,
    FileText,
    Settings,
    LogOut,
    Menu,
    X
} from "lucide-react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    // Doctor details (could be fetched from DB)
    const doctorName = "Dr. Smith"
    const doctorSpecialty = "General Physician"

    const navItems = [
        { name: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard className="w-5 h-5 mr-3" /> },
        { name: "Appointments", href: "/admin/appointments", icon: <CalendarCheck className="w-5 h-5 mr-3" /> },
        { name: "Patients & Walk-ins", href: "/admin/patients", icon: <Users className="w-5 h-5 mr-3" /> },
        { name: "Prescriptions", href: "/admin/prescriptions", icon: <FileText className="w-5 h-5 mr-3" /> },
        { name: "Security Settings", href: "/admin/settings/mfa", icon: <Settings className="w-5 h-5 mr-3" /> },
    ]

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">

            {/* Mobile Header */}
            <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50">
                <div className="font-bold text-lg">SBK Healthcare Centre</div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Sidebar Navigation */}
            <div className={`
        ${isMobileMenuOpen ? "flex" : "hidden"}
        md:flex flex-col w-full md:w-64 bg-slate-900 text-slate-300 min-h-screen fixed md:sticky top-0 z-40 transition-all
      `}>
                <div className="p-6 border-b border-slate-800 hidden md:block">
                    <h2 className="text-white font-bold text-xl tracking-tight">SBK Healthcare Centre</h2>
                    <p className="text-slate-400 text-sm mt-1">Management Portal</p>
                </div>

                <div className="p-6 border-b border-slate-800 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold mr-3">
                        {doctorName.charAt(4)}
                    </div>
                    <div>
                        <div className="text-white font-medium text-sm">{doctorName}</div>
                        <div className="text-xs text-slate-400">{doctorSpecialty}</div>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch={false}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`
                  flex items-center px-4 py-3 rounded-xl transition-colors
                  ${isActive
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                                        : "hover:bg-slate-800 hover:text-white"
                                    }
                `}
                            >
                                {item.icon}
                                <span className="font-medium text-sm">{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        <span className="font-medium text-sm">Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto">
                    {children}
                </main>
            </div>

        </div>
    )
}
