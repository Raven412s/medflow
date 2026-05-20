import { getPatientById } from "@/modules/patients/actions/patientActions";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn, formatDate } from "@/lib/utils";
import { User, Phone, Mail, MapPin, AlertCircle, Heart, FlaskConical, Package } from "lucide-react";
import { getPrescriptions } from "@/modules/prescriptions/actions/prescriptionActions";
import { getAppointments } from "@/modules/appointments/actions/appointmentActions";
import Link from "next/link";
import { FileText, CalendarDays } from "lucide-react";

import LabOrder from "@/modules/lab/models/LabOrder";
import RadiologyOrder from "@/modules/radiology/models/RadiologyOrder";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Scan } from "lucide-react";

import { PatientSummaryButton } from "@/components/patients/PatientSummaryButton";
import Dispense from "@/modules/pharmacy/models/Dispense";


export default async function PatientProfilePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const result = await getPatientById(id);
    if (!result.success || !result.data) notFound();
    const p = result.data;

    await connectDB();
    const tid = new mongoose.Types.ObjectId(p.tenantId);
    const pid = new mongoose.Types.ObjectId(id)

    const [apptResult, rxResult, labResult, radResult, dispenseResult] = await Promise.all([
        getAppointments({ page: 1, limit: 5 }),
        getPrescriptions({ page: 1, limit: 5, patientId: id }),
        LabOrder.find({ tenantId: tid, patientId: pid })
            .populate("orderedBy", "name")
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),
        RadiologyOrder.find({ tenantId: tid, patientId: pid })
            .populate("orderedBy", "name")
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),
        Dispense.find({ tenantId: tid, patientId: pid })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),
    ]);

    const patientAppointments = (apptResult.data ?? []).filter(
        (a: { patientId: string }) => a.patientId === id
    );
    const patientPrescriptions = rxResult.data ?? [];
    const patientLabOrders = JSON.parse(JSON.stringify(labResult));
    const patientRadOrders = JSON.parse(JSON.stringify(radResult));
    
    const patientDispenses = JSON.parse(JSON.stringify(dispenseResult));
    if (!result.success || !result.data) notFound();



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
                    <PatientSummaryButton patientId={id} />
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

            {/* Lab Orders */}
            <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium">Recent Lab Orders</h2>
                    <Link href="/lab" className="text-xs text-muted-foreground hover:text-primary">
                        View all →
                    </Link>
                </div>
                {patientLabOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No lab orders yet.</p>
                ) : (
                    <div className="space-y-0">
                        {patientLabOrders.map((order: {
                            _id: string;
                            orderNumber: string;
                            status: string;
                            createdAt: string;
                            tests: { name: string; code: string }[];
                        }) => (
                            <Link
                                key={order._id}
                                href={`/lab/${order._id}`}
                                className="flex items-center gap-3 py-2.5 border-b last:border-0 hover:text-primary transition-colors"
                            >
                                <FlaskConical className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-mono text-xs text-muted-foreground">
                                        {order.orderNumber}
                                    </p>
                                    <p className="text-sm truncate">
                                        {order.tests?.map((t: { code: string }) => t.code).join(", ")}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <Badge variant="outline" className="text-xs capitalize">
                                        {order.status.replace("_", " ")}
                                    </Badge>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {formatDate(order.createdAt)}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </Card>

            {/* Radiology Orders */}
            <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium">Recent Radiology</h2>
                    <Link href="/radiology" className="text-xs text-muted-foreground hover:text-primary">
                        View all →
                    </Link>
                </div>
                {patientRadOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No radiology orders yet.</p>
                ) : (
                    <div className="space-y-0">
                        {patientRadOrders.map((order: {
                            _id: string;
                            orderNumber: string;
                            imagingType: string;
                            bodyPart: string;
                            status: string;
                            createdAt: string;
                        }) => (
                            <Link
                                key={order._id}
                                href={`/radiology/${order._id}`}
                                className="flex items-center gap-3 py-2.5 border-b last:border-0 hover:text-primary transition-colors"
                            >
                                <Scan className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-mono text-xs text-muted-foreground">
                                        {order.orderNumber}
                                    </p>
                                    <p className="text-sm truncate">
                                        {order.imagingType?.replace("_", " ").toUpperCase()} — {order.bodyPart}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <Badge variant="outline" className="text-xs capitalize">
                                        {order.status.replace("_", " ")}
                                    </Badge>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {formatDate(order.createdAt)}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </Card>

            {/* Pharmacy */}
            <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium">Pharmacy Purchases</h2>
                    <Link href="/pharmacy" className="text-xs text-muted-foreground hover:text-primary">
                        View all →
                    </Link>
                </div>
                {patientDispenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pharmacy purchases yet.</p>
                ) : (
                    <div className="space-y-0">
                        {patientDispenses.map((d: {
                            _id: string;
                            dispenseNumber: string;
                            items: { medicineName: string; quantity: number }[];
                            totalAmount: number;
                            paymentStatus: string;
                            createdAt: string;
                        }) => (
                            <div key={d._id}
                                className="flex items-center gap-3 py-2.5 border-b last:border-0 text-sm">
                                <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-mono text-xs text-muted-foreground">
                                        {d.dispenseNumber}
                                    </p>
                                    <p className="text-sm truncate">
                                        {d.items?.map((i) => `${i.medicineName} ×${i.quantity}`).join(", ")}
                                    </p>
                                </div>
                                <div className="text-right shrink-0 space-y-0.5">
                                    <p className="font-medium">₹{d.totalAmount.toLocaleString("en-IN")}</p>
                                    <Badge variant="outline" className={cn(
                                        "text-xs capitalize",
                                        d.paymentStatus === "paid"
                                            ? "bg-green-50 text-green-700 border-green-200"
                                            : "bg-amber-50 text-amber-700 border-amber-200"
                                    )}>
                                        {d.paymentStatus}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}