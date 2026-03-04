"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
    Users,
    Calendar,
    CheckCircle2,
    Clock,
    TrendingUp,
    Loader2,
    CalendarDays,
    Activity,
    FileText
} from "lucide-react"

import AppointmentsTable from "../components/AppointmentsTable"

type DashboardStats = {
    totalPatients: number
    todayAppointments: number
    completedToday: number
    pendingToday: number
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats>({
        totalPatients: 0,
        todayAppointments: 0,
        completedToday: 0,
        pendingToday: 0
    })
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    // Define DOCTOR_ID or get it from auth session
    // Assuming a single doctor for this portfolio
    const DOCTOR_ID = "daece02f-137c-4818-bc05-64383c3920b1"

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                setLoading(true)
                const today = new Date().toISOString().split('T')[0]

                // 1. Get total patients
                const { count: patientsCount } = await supabase
                    .from('patients')
                    .select('*', { count: 'exact', head: true })

                // 2. Get today's appointments
                const { data: todayApps } = await supabase
                    .from('appointments')
                    .select('*')
                    .eq('doctor_id', DOCTOR_ID)
                    .eq('appointment_date', today)

                const apps = todayApps || []

                setStats({
                    totalPatients: patientsCount || 0,
                    todayAppointments: apps.length,
                    completedToday: apps.filter((a: any) => a.status === 'completed').length,
                    pendingToday: apps.filter((a: any) => a.status === 'pending').length,
                })

            } catch (error) {
                console.error("Error fetching dashboard data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()

        // Polling fallback to keep data semi-fresh without risking WebSocket crashes in Firefox
        const interval = setInterval(() => {
            fetchDashboardData()
        }, 30000) // Refresh every 30 seconds

        return () => clearInterval(interval)
    }, [])

    if (loading) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    // Common styles for stat cards to ensure rich aesthetics
    const statCardClasses = "bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center transition-all hover:shadow-md hover:border-slate-200 group"

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back, Dr. Smith</h1>
                    <p className="text-slate-500 mt-1">Here is what is happening today at the clinic.</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 shadow-sm flex items-center">
                    <CalendarDays className="w-4 h-4 mr-2 text-blue-600" />
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                <div className={statCardClasses}>
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mr-5 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                        <Users className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Total Patients</p>
                        <h3 className="text-3xl font-bold text-slate-900">{stats.totalPatients}</h3>
                    </div>
                </div>

                <div className={statCardClasses}>
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-5 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                        <Calendar className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Today's Appointments</p>
                        <h3 className="text-3xl font-bold text-slate-900">{stats.todayAppointments}</h3>
                    </div>
                </div>

                <div className={statCardClasses}>
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mr-5 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                        <Clock className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Pending Check-ins</p>
                        <h3 className="text-3xl font-bold text-slate-900">{stats.pendingToday}</h3>
                    </div>
                </div>

                <div className={statCardClasses}>
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mr-5 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                        <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Completed Today</p>
                        <h3 className="text-3xl font-bold text-slate-900">{stats.completedToday}</h3>
                    </div>
                </div>

            </div>

            {/* Main Content Area - Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Upcoming Schedule (Takes up 2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center">
                                <Activity className="w-5 h-5 mr-2 text-blue-600" />
                                Live Schedule
                            </h2>
                            <button
                                onClick={() => window.location.href = '/admin/appointments'}
                                className="text-sm text-blue-600 font-medium hover:underline"
                            >
                                View All
                            </button>
                        </div>

                        <div className="space-y-4">
                            <AppointmentsTable />
                        </div>
                    </div>
                </div>

                {/* Right Column: Quick Actions (Takes up 1/3) */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-3xl p-6 shadow-xl shadow-blue-900/10 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-xl font-bold mb-2">Quick Actions</h2>
                            <p className="text-slate-400 text-sm mb-6">Manage patients rapidly.</p>

                            <div className="space-y-3">
                                <button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl p-4 flex items-center transition-all active:scale-[0.98]">
                                    <div className="bg-blue-500/20 p-2 rounded-lg mr-3">
                                        <Users className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-sm">Walk-in Patient</div>
                                        <div className="text-xs text-slate-400 mt-0.5">Register a new arrival</div>
                                    </div>
                                </button>

                                <button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl p-4 flex items-center transition-all active:scale-[0.98]">
                                    <div className="bg-emerald-500/20 p-2 rounded-lg mr-3">
                                        <FileText className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-sm">New Prescription</div>
                                        <div className="text-xs text-slate-400 mt-0.5">Generate E-Prescription</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-blue-600/20 blur-3xl pointer-events-none"></div>
                    </div>
                </div>

            </div>

        </div>
    )
}
