"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
    MoreVertical,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Stethoscope
} from "lucide-react"

type Patient = {
    id: string
    name: string
    phone: string
    age: number
    gender: string
}

type Appointment = {
    id: string
    doctor_id: string
    patient_id: string
    appointment_date: string
    appointment_time: string
    status: 'pending' | 'completed' | 'cancelled'
    notes: string
    created_at: string
    patient: Patient
}

export default function AppointmentsTable() {
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const DOCTOR_ID = "daece02f-137c-4818-bc05-64383c3920b1"

    const fetchAppointments = async () => {
        try {
            const today = new Date().toISOString().split('T')[0]

            const { data, error } = await supabase
                .from('appointments')
                .select(`
          *,
          patient:patients (*)
        `)
                .eq('doctor_id', DOCTOR_ID)
                .eq('appointment_date', today)
                .order('appointment_time', { ascending: true })

            if (error) throw error

            // Format the data properly joining patient info
            const formattedData = data?.map(app => ({
                ...app,
                // Since we did a join, the patient data is nested
                patient: Array.isArray(app.patient) ? app.patient[0] : app.patient
            })) as Appointment[]

            setAppointments(formattedData || [])
        } catch (error) {
            console.error("Error fetching appointments:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAppointments()

        // Polling fallback to keep appointments fresh without risking WebSocket WSS crashes in Firefox
        const interval = setInterval(() => {
            fetchAppointments()
        }, 30000) // Polling every 30 seconds

        return () => clearInterval(interval)
    }, [])

    const updateStatus = async (id: string, newStatus: 'completed' | 'cancelled' | 'pending') => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: newStatus })
                .eq('id', id)

            if (error) throw error

            // Local optimistic update
            setAppointments(prev =>
                prev.map(app => app.id === id ? { ...app, status: newStatus } : app)
            )
        } catch (error) {
            console.error("Error updating status:", error)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle className="w-3 h-3 mr-1" /> Completed</span>
            case 'cancelled':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Cancelled</span>
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1" /> Pending</span>
        }
    }

    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-64 flex items-center justify-center">
                <div className="text-slate-400 flex flex-col items-center">
                    <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Loading today's schedule...
                </div>
            </div>
        )
    }

    if (appointments.length === 0) {
        return (
            <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-100 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-400 border border-slate-100">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">No Appointments Today</h3>
                <p className="text-slate-500 max-w-sm">There are currently no appointments scheduled for today. New bookings will appear here automatically.</p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow>
                            <TableHead className="w-[100px] font-semibold text-slate-900">Time</TableHead>
                            <TableHead className="font-semibold text-slate-900">Patient</TableHead>
                            <TableHead className="font-semibold text-slate-900 hidden md:table-cell">Contact</TableHead>
                            <TableHead className="font-semibold text-slate-900">Status</TableHead>
                            <TableHead className="text-right font-semibold text-slate-900">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {appointments.map((app) => (
                            <TableRow key={app.id} className="hover:bg-slate-50/50 transition-colors">
                                <TableCell className="font-medium">
                                    {app.appointment_time.substring(0, 5)}
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium text-slate-900">{app.patient?.name || 'Unknown Patient'}</div>
                                    <div className="text-xs text-slate-500 md:hidden">{app.patient?.phone}</div>
                                    {app.notes && (
                                        <div className="text-xs text-slate-400 truncate max-w-[150px] mt-1" title={app.notes}>
                                            Note: {app.notes}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-slate-600">
                                    {app.patient?.phone}
                                </TableCell>
                                <TableCell>
                                    {getStatusBadge(app.status)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full">
                                                <span className="sr-only">Open menu</span>
                                                <MoreVertical className="h-4 w-4 text-slate-500" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-lg border-slate-100">

                                            <DropdownMenuItem
                                                className="cursor-pointer flex items-center py-2"
                                                onClick={() => window.location.href = `/admin/prescriptions/new?patientId=${app.patient_id}`}
                                            >
                                                <Stethoscope className="mr-2 h-4 w-4 text-blue-600" />
                                                <span>Write Prescription</span>
                                            </DropdownMenuItem>

                                            <div className="h-px bg-slate-100 my-1"></div>

                                            {app.status !== 'completed' && (
                                                <DropdownMenuItem
                                                    className="cursor-pointer flex items-center py-2 text-emerald-600 focus:text-emerald-700"
                                                    onClick={() => updateStatus(app.id, 'completed')}
                                                >
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    <span>Mark Completed</span>
                                                </DropdownMenuItem>
                                            )}

                                            {app.status !== 'pending' && (
                                                <DropdownMenuItem
                                                    className="cursor-pointer flex items-center py-2 text-amber-600 focus:text-amber-700"
                                                    onClick={() => updateStatus(app.id, 'pending')}
                                                >
                                                    <Clock className="mr-2 h-4 w-4" />
                                                    <span>Mark Pending</span>
                                                </DropdownMenuItem>
                                            )}

                                            {app.status !== 'cancelled' && (
                                                <DropdownMenuItem
                                                    className="cursor-pointer flex items-center py-2 text-red-600 focus:text-red-700"
                                                    onClick={() => updateStatus(app.id, 'cancelled')}
                                                >
                                                    <XCircle className="mr-2 h-4 w-4" />
                                                    <span>Cancel Appointment</span>
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
