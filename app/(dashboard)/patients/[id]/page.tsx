import { getPatientById } from "@/modules/patients/actions/patientActions";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import { User, Phone, Mail, MapPin, AlertCircle, Heart } from "lucide-react";
import { getPrescriptions } from "@/modules/prescriptions/actions/prescriptionActions";
import { getAppointments } from "@/modules/appointments/actions/appointmentActions";
import Link from "next/link";
import { FileText, CalendarDays } from "lucide-react";

export default async function PatientProfilePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const result = await getPatientById(id);

    const [apptResult, rxResult] = await Promise.all([
        getAppointments({ page: 1, limit: 5 }),
        getPrescriptions({ page: 1, limit: 5, patientId: id }),
    ]);

    const patientAppointments = (apptResult.data ?? []).filter(
        (a: { patientId: string }) => a.patientId === id
    );
    const patientPrescriptions = rxResult.data ?? [];

    if (!result.success || !result.data) notFound();

    const p = result.data;

    const dob = new Date(p.dateOfBirth);
    const today = new Date();
    const age = Math.floor(
        (today.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    );

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-xl font-semibold">{p.name}</h1>
                        {p.bloodGroup && (
                            <Badge variant="secondary">{p.bloodGroup}</Badge>
                        )}
                        <Badge variant="outline" className="capitalize">{p.gender}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                        <span className="text-sm text-muted-foreground font-mono">
                            {p.patientId}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            {age} years old · DOB {formatDate(p.dateOfBirth)}
                        </span>
                    </div>
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact */}
                <Card className="p-5 space-y-4">
                    <h2 className="text-sm font-medium">Contact Information</h2>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span>{p.phone}</span>
                        </div>
                        {p.email && (
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span>{p.email}</span>
                            </div>
                        )}
                        {p.address?.city && (
                            <div className="flex items-center gap-3 text-sm">
                                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span>
                                    {[p.address.line1, p.address.city, p.address.state, p.address.pincode]
                                        .filter(Boolean)
                                        .join(", ")}
                                </span>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Medical */}
                <Card className="p-5 space-y-4">
                    <h2 className="text-sm font-medium">Medical Information</h2>
                    <div className="space-y-3">
                        {p.allergies?.length > 0 && (
                            <div className="flex items-start gap-3 text-sm">
                                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Allergies</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {p.allergies.map((a: string) => (
                                            <Badge key={a} variant="outline" className="text-xs text-amber-600 border-amber-300">
                                                {a}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {p.medicalHistory && (
                            <div className="flex items-start gap-3 text-sm">
                                <Heart className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Medical History</p>
                                    <p>{p.medicalHistory}</p>
                                </div>
                            </div>
                        )}
                        {!p.allergies?.length && !p.medicalHistory && (
                            <p className="text-sm text-muted-foreground">No medical info recorded.</p>
                        )}
                    </div>
                </Card>
            </div>

            {/* Visit History */}
            <Card className="p-5 space-y-4">
                <h2 className="text-sm font-medium">Recent Appointments</h2>
                {patientAppointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No appointments yet.</p>
                ) : (
                    <div className="space-y-2">
                        {patientAppointments.map((a: {
                            _id: string;
                            date: string;
                            timeSlot: string;
                            doctorName: string;
                            status: string;
                        }) => (
                            <div key={a._id} className="flex items-center gap-3 text-sm py-2 border-b last:border-0">
                                <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span>{formatDate(a.date)}</span>
                                <span className="text-muted-foreground">{a.timeSlot}</span>
                                <span className="text-muted-foreground">{a.doctorName}</span>
                                <Badge variant="outline" className="text-xs capitalize ml-auto">
                                    {a.status}
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Card className="p-5 space-y-4">
                <h2 className="text-sm font-medium">Recent Prescriptions</h2>
                {patientPrescriptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No prescriptions yet.</p>
                ) : (
                    <div className="space-y-2">
                        {patientPrescriptions.map((rx: {
                            _id: string;
                            prescriptionNumber: string;
                            diagnosis: string;
                            createdAt: string;
                            medicines: { name: string }[];
                        }) => (
                            <Link
                                key={rx._id}
                                href={`/prescriptions/${rx._id}`}
                                className="flex items-center gap-3 text-sm py-2 border-b last:border-0 hover:text-primary transition-colors"
                            >
                                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="font-mono text-xs text-muted-foreground">
                                    {rx.prescriptionNumber}
                                </span>
                                <span>{rx.diagnosis}</span>
                                <span className="text-muted-foreground ml-auto">
                                    {formatDate(rx.createdAt)}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}