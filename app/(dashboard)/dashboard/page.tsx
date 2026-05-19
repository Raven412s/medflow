import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { connectDB } from "@/lib/db";
import Patient from "@/modules/patients/models/Patient";
import Appointment from "@/modules/appointments/models/Appointment";
import Invoice from "@/modules/billing/models/Invoice";
import LabOrder from "@/modules/lab/models/LabOrder";
import RadiologyOrder from "@/modules/radiology/models/RadiologyOrder";
import mongoose from "mongoose";
import {
  Users,
  CalendarDays,
  Receipt,
  FlaskConical,
  TrendingUp,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

async function getDashboardData(tenantId: string) {
  await connectDB();
  const tid = new mongoose.Types.ObjectId(tenantId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    totalPatients,
    todayAppointments,
    pendingBills,
    pendingLabOrders,
    recentPatients,
    todayAppointmentList,
    totalRevenue,
  ] = await Promise.all([
    Patient.countDocuments({ tenantId: tid, isActive: true }),
    Appointment.countDocuments({
      tenantId: tid,
      date: { $gte: today, $lte: todayEnd },
      status: { $nin: ["cancelled", "no_show"] },
    }),
    Invoice.countDocuments({
      tenantId: tid,
      paymentStatus: { $in: ["pending", "partial"] },
    }),
    LabOrder.countDocuments({
      tenantId: tid,
      status: { $in: ["ordered", "sample_collected", "processing"] },
    }),
    Patient.find({ tenantId: tid, isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name patientId phone createdAt")
      .lean(),
    Appointment.find({
      tenantId: tid,
      date: { $gte: today, $lte: todayEnd },
      status: { $nin: ["cancelled", "no_show"] },
    })
      .populate("patientId", "name")
      .populate("doctorId", "name")
      .sort({ timeSlot: 1 })
      .limit(8)
      .lean(),
    Invoice.aggregate([
      {
        $match: {
          tenantId: tid,
          paymentStatus: { $ne: "cancelled" },
        },
      },
      { $group: { _id: null, total: { $sum: "$paidAmount" } } },
    ]),
  ]);

  return {
    totalPatients,
    todayAppointments,
    pendingBills,
    pendingLabOrders,
    recentPatients: JSON.parse(JSON.stringify(recentPatients)),
    todayAppointmentList: JSON.parse(JSON.stringify(todayAppointmentList)),
    totalRevenue: totalRevenue[0]?.total ?? 0,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const data = await getDashboardData(session.user.tenantId);

  const stats = [
    {
      label: "Total Patients",
      value: data.totalPatients.toLocaleString("en-IN"),
      icon: Users,
      color: "text-blue-500",
      href: "/patients",
    },
    {
      label: "Today's Appointments",
      value: data.todayAppointments.toLocaleString("en-IN"),
      icon: CalendarDays,
      color: "text-violet-500",
      href: "/appointments",
    },
    {
      label: "Pending Bills",
      value: data.pendingBills.toLocaleString("en-IN"),
      icon: Receipt,
      color: "text-amber-500",
      href: "/billing",
    },
    {
      label: "Pending Lab Orders",
      value: data.pendingLabOrders.toLocaleString("en-IN"),
      icon: FlaskConical,
      color: "text-teal-500",
      href: "/lab",
    },
    {
      label: "Total Revenue",
      value: `₹${data.totalRevenue.toLocaleString("en-IN")}`,
      icon: TrendingUp,
      color: "text-green-500",
      href: "/billing",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">
          Good morning, {session.user.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening at your clinic today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="p-4 space-y-2 hover:shadow-sm transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {stat.label}
                  </span>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="text-2xl font-semibold">{stat.value}</div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's appointments */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium">Today&apos;s Appointments</h2>
            <Link
              href="/appointments"
              className="text-xs text-muted-foreground hover:text-primary"
            >
              View all →
            </Link>
          </div>
          {data.todayAppointmentList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No appointments scheduled for today.
            </p>
          ) : (
            <div className="space-y-0">
              {data.todayAppointmentList.map(
                (appt: {
                  _id: string;
                  patientId: { name: string };
                  doctorId: { name: string };
                  timeSlot: string;
                  token?: number;
                  status: string;
                  type: string;
                }) => (
                  <div
                    key={appt._id}
                    className="flex items-center gap-3 py-2.5 border-b last:border-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                      {appt.token ?? "—"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {appt.patientId?.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {appt.doctorId?.name} · {appt.type?.replace("_", " ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono">{appt.timeSlot}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {appt.status.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </Card>

        {/* Recent patients */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium">Recent Patients</h2>
            <Link
              href="/patients"
              className="text-xs text-muted-foreground hover:text-primary"
            >
              View all →
            </Link>
          </div>
          {data.recentPatients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No patients registered yet.
            </p>
          ) : (
            <div className="space-y-0">
              {data.recentPatients.map(
                (patient: {
                  _id: string;
                  name: string;
                  patientId: string;
                  phone: string;
                  createdAt: string;
                }) => (
                  <Link
                    key={patient._id}
                    href={`/patients/${patient._id}`}
                    className="flex items-center gap-3 py-2.5 border-b last:border-0 hover:text-primary transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                      {patient.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {patient.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {patient.patientId} · {patient.phone}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {formatDate(patient.createdAt)}
                    </p>
                  </Link>
                )
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="p-5">
        <h2 className="text-sm font-medium mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/patients">
            <div className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm hover:bg-muted transition-colors cursor-pointer">
              <Users className="w-4 h-4 text-blue-500" />
              Add Patient
            </div>
          </Link>
          <Link href="/appointments">
            <div className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm hover:bg-muted transition-colors cursor-pointer">
              <CalendarDays className="w-4 h-4 text-violet-500" />
              Book Appointment
            </div>
          </Link>
          <Link href="/prescriptions">
            <div className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm hover:bg-muted transition-colors cursor-pointer">
              <Clock className="w-4 h-4 text-amber-500" />
              New Prescription
            </div>
          </Link>
          <Link href="/billing">
            <div className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm hover:bg-muted transition-colors cursor-pointer">
              <Receipt className="w-4 h-4 text-teal-500" />
              Create Invoice
            </div>
          </Link>
          <Link href="/lab">
            <div className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm hover:bg-muted transition-colors cursor-pointer">
              <FlaskConical className="w-4 h-4 text-green-500" />
              New Lab Order
            </div>
          </Link>
        </div>
      </Card>
    </div>
  );
}