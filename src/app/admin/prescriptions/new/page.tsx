"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, Trash2, Printer, Save, ArrowLeft, Download } from "lucide-react"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

type Patient = {
    id: string
    name: string
    age: number
    gender: string
    phone: string
}

type Medicine = {
    id?: string
    name: string
    dosage: string
    frequency: string
    duration: string
    instructions: string
}

function NewPrescriptionContent() {
    const searchParams = useSearchParams()
    const patientId = searchParams.get('patientId')
    const router = useRouter()
    const supabase = createClient()

    const [patient, setPatient] = useState<Patient | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    // Prescription Form State
    const [diagnosis, setDiagnosis] = useState("")
    const [notes, setNotes] = useState("")
    const [medicines, setMedicines] = useState<Medicine[]>([
        { name: "", dosage: "", frequency: "", duration: "", instructions: "" }
    ])
    const [rxId, setRxId] = useState("")

    const printRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!patientId) {
            router.push('/admin/patients')
            return
        }

        async function fetchPatientAndInit() {
            try {
                setLoading(true)
                // Fetch patient
                const { data, error } = await supabase
                    .from('patients')
                    .select('*')
                    .eq('id', patientId)
                    .single()

                if (error) throw error
                setPatient(data)

                // Fetch next sequential Rx ID
                // The DB schema automatically generates the Rx ID on insert.
                // We'll set a temporary format here to show on the UI until saved.
                const today = new Date()
                const year = today.getFullYear()
                setRxId(`RX-${year}-XXXX`)

            } catch (err) {
                console.error("Error loading patient:", err)
                setError("Failed to load patient information.")
            } finally {
                setLoading(false)
            }
        }

        fetchPatientAndInit()
    }, [patientId, router])

    const addMedicine = () => {
        setMedicines([...medicines, { name: "", dosage: "", frequency: "", duration: "", instructions: "" }])
    }

    const removeMedicine = (index: number) => {
        const newMeds = [...medicines]
        newMeds.splice(index, 1)
        setMedicines(newMeds)
    }

    const updateMedicine = (index: number, field: keyof Medicine, value: string) => {
        const newMeds = [...medicines]
        newMeds[index][field] = value
        setMedicines(newMeds)
    }

    const handleSaveAndPrint = async () => {
        if (!patient) return

        // Filter out empty medicines
        const validMeds = medicines.filter(m => m.name.trim() !== "")
        if (validMeds.length === 0 && !diagnosis.trim()) {
            setError("Please add at least one medicine or diagnosis")
            return
        }

        setSaving(true)
        setError("")

        try {
            const DOCTOR_ID = "daece02f-137c-4818-bc05-64383c3920b1"

            // 1. Save Prescription metadata
            const { data: rxData, error: rxError } = await supabase
                .from('prescriptions')
                .insert([{
                    doctor_id: DOCTOR_ID,
                    patient_id: patient.id,
                    diagnosis,
                    treatment: notes
                    // removed prescription_id to let the postgres DEFAULT nextval('prescription_seq') take over
                }])
                .select()
                .single()

            if (rxError) throw rxError

            // 2. Save Medicines linked to Rx
            if (validMeds.length > 0) {
                const medsToInsert = validMeds.map(m => ({
                    prescription_id: rxData.id,
                    name: m.name,
                    dosage: m.dosage,
                    frequency: m.frequency,
                    duration: m.duration,
                    instructions: m.instructions
                }))

                const { error: medsError } = await supabase
                    .from('medicines')
                    .insert(medsToInsert)

                if (medsError) throw medsError
            }

            // Sync the generated Rx ID back to state so the PDF prints the correct DB assigned number
            if (rxData?.prescription_id) {
                setRxId(rxData.prescription_id);
            }

            // 3. Generate PDF
            await generatePDF(rxData?.prescription_id || rxId)

            // Redirect to history or patient page
            setTimeout(() => {
                router.push('/admin/prescriptions')
            }, 1500)

        } catch (err: any) {
            console.error(err)
            setError(err.message || "Failed to save prescription")
            setSaving(false) // Only reset if failed. If success, we keep it true until redirect
        }
    }

    const generatePDF = async (finalRxId: string) => {
        if (!printRef.current) return

        try {
            // Small trick: Wait a tick for rendering anomalies before snapshotting
            await new Promise(resolve => setTimeout(resolve, 100))

            const canvas = await html2canvas(printRef.current, {
                scale: 2, // higher res
                useCORS: true,
                logging: false
            })

            const imgData = canvas.toDataURL('image/png')
            // Standard A4 dimensions
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
            pdf.save(`${patient?.name.replace(/\s+/g, '_')}_${finalRxId}.pdf`)

        } catch (err) {
            console.error("PDF Gen Error:", err)
            throw new Error("Failed to generate PDF document")
        }
    }

    if (loading) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#2563eb]" />
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">

            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="mr-2 h-10 w-10 p-0 rounded-full hover:bg-[#e2e8f0]"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-[#0f172a] tracking-tight">New E-Prescription</h1>
                        <p className="text-[#64748b] mt-1">Generate a digital prescription for {patient?.name}</p>
                    </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <Button onClick={handleSaveAndPrint} disabled={saving} className="flex-1 sm:flex-none bg-[#2563eb] hover:bg-[#1d4ed8] h-11 px-6 shadow-md rounded-xl">
                        {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                        Save & Generate PDF
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-[#fef2f2] text-[#b91c1c] rounded-xl text-sm border border-[#fee2e2] flex items-center">
                    <Loader2 className="w-5 h-5 mr-2" /> {error}
                </div>
            )}

            {/* Editor & Preview Split Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left: Input Form */}
                <div className="space-y-6">
                    <div className="bg-[#ffffff] p-6 rounded-3xl shadow-sm border border-[#e2e8f0]">
                        <h3 className="text-lg font-bold text-[#0f172a] mb-4 border-b border-[#f1f5f9] pb-3">Clinical Notes</h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="diagnosis" className="text-[#475569] font-semibold">Diagnosis / Chief Complaint</Label>
                                <Input
                                    id="diagnosis"
                                    value={diagnosis}
                                    onChange={(e) => setDiagnosis(e.target.value)}
                                    placeholder="e.g. Acute Viral Pharyngitis"
                                    className="h-11 bg-[#f8fafc]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes" className="text-[#475569] font-semibold">General Advice / Next Visit</Label>
                                <Textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="e.g. Drink plenty of warm fluids. Review after 5 days."
                                    className="min-h-[100px] resize-none bg-[#f8fafc]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#ffffff] p-6 rounded-3xl shadow-sm border border-[#e2e8f0]">
                        <div className="flex items-center justify-between mb-4 border-b border-[#f1f5f9] pb-3">
                            <h3 className="text-lg font-bold text-[#0f172a]">Medications</h3>
                            <Button onClick={addMedicine} variant="outline" size="sm" className="h-8 rounded-lg text-[#2563eb] border-[#bfdbfe] hover:bg-[#eff6ff]">
                                <Plus className="w-4 h-4 mr-1" /> Add
                            </Button>
                        </div>

                        <div className="space-y-6">
                            {medicines.map((med, index) => (
                                <div key={index} className="relative p-4 rounded-2xl bg-[#f8fafc] border border-[#f1f5f9] group transition-all">

                                    {medicines.length > 1 && (
                                        <button
                                            onClick={() => removeMedicine(index)}
                                            className="absolute -right-2 -top-2 w-7 h-7 bg-[#ffffff] rounded-full text-[#ef4444] shadow-sm border border-[#e2e8f0] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#fef2f2]"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                        <div className="md:col-span-12">
                                            <Label className="text-xs text-[#64748b] mb-1 block">Medicine Name</Label>
                                            <Input
                                                value={med.name}
                                                onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                                                placeholder="e.g. Tab. Paracetamol 500mg"
                                                className="h-10 bg-[#ffffff]"
                                            />
                                        </div>

                                        <div className="md:col-span-4">
                                            <Label className="text-xs text-[#64748b] mb-1 block">Dosage</Label>
                                            <Input
                                                value={med.dosage}
                                                onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                                                placeholder="1 Tablet"
                                                className="h-10 bg-[#ffffff]"
                                            />
                                        </div>

                                        <div className="md:col-span-4">
                                            <Label className="text-xs text-[#64748b] mb-1 block">Frequency</Label>
                                            <Input
                                                value={med.frequency}
                                                onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                                                placeholder="1-0-1 (Morning-Night)"
                                                className="h-10 bg-[#ffffff]"
                                            />
                                        </div>

                                        <div className="md:col-span-4">
                                            <Label className="text-xs text-[#64748b] mb-1 block">Duration</Label>
                                            <Input
                                                value={med.duration}
                                                onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                                                placeholder="5 Days"
                                                className="h-10 bg-[#ffffff]"
                                            />
                                        </div>

                                        <div className="md:col-span-12 mt-1">
                                            <Input
                                                value={med.instructions}
                                                onChange={(e) => updateMedicine(index, 'instructions', e.target.value)}
                                                placeholder="Instructions: e.g. Take after meals"
                                                className="h-9 text-sm bg-[#ffffff] border-dashed"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Live Preview Rendering Area for PDF Snapshot */}
                {/* We keep this block isolated and styled exactly like a physical A4 sheet so HTML2Canvas captures it perfectly */}
                <div className="bg-[#e2e8f0] p-4 md:p-8 rounded-3xl overflow-auto flex justify-center items-start shadow-inner min-h-[800px]">

                    <div className="shadow-xl origin-top sm:scale-[0.8] md:scale-[0.6] lg:scale-[0.7] xl:scale-95 transition-transform border border-[#e2e8f0]">
                        <div
                            ref={printRef}
                            className="bg-[#ffffff] w-[210mm] min-h-[297mm]"
                            style={{
                                padding: '24mm 20mm', // standard margins
                                boxSizing: 'border-box',
                                color: '#000',
                                fontFamily: 'system-ui, -apple-system, sans-serif'
                            }}
                        >
                            {/* Header / Letterhead */}
                            <div className="flex justify-between items-start border-b-2 border-[#0f172a] pb-6 mb-6">
                                <div>
                                    <h1 className="text-3xl font-black text-[#0f172a] truncate">DR. SMITH CLINIC</h1>
                                    <p className="text-sm font-semibold text-[#334155] mt-1">Dr. John Smith, MD, FACP</p>
                                    <p className="text-xs text-[#64748b]">Board Certified General Physician</p>
                                    <p className="text-xs text-[#64748b] mt-1">Reg No: MED-12345-NY</p>
                                </div>
                                <div className="text-right text-xs text-[#475569]">
                                    <p>123 Health Avenue, Medical District</p>
                                    <p>Cityville, ST 12345</p>
                                    <p className="mt-1 font-semibold">Ph: 1-800-123-4567</p>
                                    <p>info@drsmithclinic.com</p>
                                </div>
                            </div>

                            {/* Patient Info Row */}
                            <div className="grid grid-cols-2 gap-4 text-sm mb-8">
                                <div>
                                    <span className="text-[#64748b] mr-2">Patient Name:</span>
                                    <span className="font-bold border-b border-dotted border-[#94a3b8] block pb-1">{patient?.name || '______________________'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <span className="text-[#64748b] mr-2">Age/Sex:</span>
                                        <span className="font-bold border-b border-dotted border-[#94a3b8] inline-block pb-1 min-w-[50px]">{patient?.age} / {patient?.gender.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <span className="text-[#64748b] mr-2">Date:</span>
                                        <span className="font-bold border-b border-dotted border-[#94a3b8] inline-block pb-1 min-w-[80px]">{new Date().toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[#64748b] mr-2">Phone No:</span>
                                    <span className="font-bold border-b border-dotted border-[#94a3b8] block pb-1">{patient?.phone || '______________________'}</span>
                                </div>
                                <div>
                                    <span className="text-[#64748b] mr-2">Rx ID:</span>
                                    <span className="font-bold text-[#1e293b]">{rxId}</span>
                                </div>
                            </div>

                            {/* Diagnosis Module */}
                            {(diagnosis || notes) && (
                                <div className="mb-8 p-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] text-sm">
                                    {diagnosis && (
                                        <div className="mb-2">
                                            <span className="font-bold text-[#334155] block mb-1">Diagnosis:</span>
                                            <p className="text-[#0f172a]">{diagnosis}</p>
                                        </div>
                                    )}
                                    {notes && (
                                        <div>
                                            <span className="font-bold text-[#334155] block mb-1">Notes / Instructions:</span>
                                            <p className="text-[#0f172a] whitespace-pre-wrap">{notes}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Rx Symbol */}
                            <div className="text-4xl font-serif italic text-[#1e293b] mb-6 px-2">Rx</div>

                            {/* Medicine Loop */}
                            <div className="space-y-6 px-4 min-h-[200px]">
                                {medicines.map((med, idx) => (
                                    med.name && (
                                        <div key={idx} className="border-b border-[#f1f5f9] pb-4 last:border-0 relative pl-6">
                                            <span className="absolute left-0 top-0 font-bold text-[#94a3b8]">{idx + 1}.</span>
                                            <h4 className="font-bold text-lg text-[#0f172a]">{med.name}</h4>
                                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#334155] mt-1">
                                                {med.dosage && <span><span className="text-[#64748b]">Dosage:</span> {med.dosage}</span>}
                                                {med.frequency && <span><span className="text-[#64748b]">Frequency:</span> {med.frequency}</span>}
                                                {med.duration && <span><span className="text-[#64748b]">Duration:</span> {med.duration}</span>}
                                            </div>
                                            {med.instructions && (
                                                <p className="text-xs text-[#475569] mt-2 bg-[#f8fafc] inline-block py-1 rounded">
                                                    <strong className="text-[#64748b] mr-1">Instructions:</strong> {med.instructions}
                                                </p>
                                            )}
                                        </div>
                                    )
                                ))}

                                {/* Empty state purely for visual effect if completely blank */}
                                {medicines.filter(m => !!m.name).length === 0 && (
                                    <div className="text-[#cbd5e1] italic">No medications prescribed...</div>
                                )}
                            </div>

                            {/* Footer / Signature Box */}
                            <div className="mt-32 pt-8 flex justify-between items-end border-t border-[#e2e8f0]">
                                <div className="text-xs text-[#94a3b8]">
                                    Valid only when signed and stamped.<br />
                                    Keep medicines out of reach of children.
                                </div>
                                <div className="text-center w-48">
                                    <div className="border-b border-[#1e293b] h-16 mb-2 flex items-end justify-center pb-2">
                                        {/* In a real app we could overlay a transparent PNG signature here */}
                                        <span className="italic text-[#cbd5e1] font-serif text-2xl">Digital Signature</span>
                                    </div>
                                    <h5 className="font-bold text-[#0f172a] text-sm">Dr. John Smith</h5>
                                    <p className="text-xs text-[#64748b]">Signature & Seal</p>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>

            </div>
        </div>
    )
}

export default function NewPrescriptionPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>}>
            <NewPrescriptionContent />
        </Suspense>
    )
}
