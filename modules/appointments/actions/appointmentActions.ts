"use server";

import { connectDB } from "@/lib/db";
import Appointment from "@/modules/appointments/models/Appointment";
import Patient from "@/modules/patients/models/Patient";
import User from "@/modules/auth/models/User";
import { auth } from "@/auth";
import { createAuditLog } from "@/modules/audit-logs/actions/createAuditLog";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import mongoose from "mongoose";

const AppointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  date: z.string().min(1, "Date is required"),
  timeSlot: z.string().min(1, "Time slot is required"),
  duration: z.number().default(30),
  type: z.enum(["consultation", "follow_up", "emergency", "procedure"]),
  notes: z.string().optional(),
});

// CREATE
export async function createAppointment(input: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = AppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectDB();

  try {
    // Get next token for the day
    const startOfDay = new Date(parsed.data.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsed.data.date);
    endOfDay.setHours(23, 59, 59, 999);

    const tokenCount = await Appointment.countDocuments({
      tenantId: session.user.tenantId,
      doctorId: parsed.data.doctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ["cancelled", "no_show"] },
    });

    const appointment = await Appointment.create({
      ...parsed.data,
      tenantId: session.user.tenantId,
      date: new Date(parsed.data.date),
      token: tokenCount + 1,
    });

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "create",
      resource: "appointment",
      resourceId: appointment._id.toString(),
      description: `Scheduled appointment token #${appointment.token}`,
    });

    revalidatePath("/appointments");
    return { success: true, appointmentId: appointment._id.toString() };
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 11000) {
      return { success: false, error: "This time slot is already booked for this doctor" };
    }
    console.error("[createAppointment]", error);
    return { success: false, error: "Failed to create appointment" };
  }
}

// GET ALL with patient + doctor names
export async function getAppointments({
  page = 1,
  limit = 20,
  date,
  doctorId,
  status,
}: {
  page?: number;
  limit?: number;
  date?: string;
  doctorId?: string;
  status?: string;
}) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const query: Record<string, unknown> = {
      tenantId: new mongoose.Types.ObjectId(session.user.tenantId),
    };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    if (doctorId) query.doctorId = new mongoose.Types.ObjectId(doctorId);
    if (status) query.status = status;

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate("patientId", "name patientId phone")
        .populate("doctorId", "name specialization")
        .sort({ date: 1, timeSlot: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Appointment.countDocuments(query),
    ]);

    const mapped = appointments.map((a: unknown) => {
      const appt = a as {
        _id: mongoose.Types.ObjectId;
        patientId: { _id: mongoose.Types.ObjectId; name: string; patientId: string; phone: string };
        doctorId: { _id: mongoose.Types.ObjectId; name: string };
        date: Date;
        timeSlot: string;
        duration: number;
        status: string;
        type: string;
        token?: number;
        notes?: string;
      };
      return {
        _id: appt._id.toString(),
        patientId: appt.patientId._id.toString(),
        patientName: appt.patientId.name,
        patientPhone: appt.patientId.phone,
        doctorId: appt.doctorId._id.toString(),
        doctorName: appt.doctorId.name,
        date: appt.date.toISOString(),
        timeSlot: appt.timeSlot,
        duration: appt.duration,
        status: appt.status,
        type: appt.type,
        token: appt.token,
        notes: appt.notes,
      };
    });

    return {
      success: true,
      data: JSON.parse(JSON.stringify(mapped)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("[getAppointments]", error);
    return { success: false, error: "Failed to fetch appointments" };
  }
}

// UPDATE STATUS
export async function updateAppointmentStatus(
  id: string,
  status: string,
  cancelReason?: string
) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const update: Record<string, unknown> = { status };
    if (cancelReason) update.cancelReason = cancelReason;

    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, tenantId: session.user.tenantId },
      update,
      { new: true }
    );

    if (!appointment) return { success: false, error: "Appointment not found" };

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "update",
      resource: "appointment",
      resourceId: id,
      description: `Updated appointment status to ${status}`,
    });

    revalidatePath("/appointments");
    return { success: true };
  } catch (error) {
    console.error("[updateAppointmentStatus]", error);
    return { success: false, error: "Failed to update status" };
  }
}

// GET DOCTORS for dropdown
export async function getDoctors() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const doctors = await User.find({
      tenantId: session.user.tenantId,
      role: "doctor",
      isActive: true,
    })
      .select("name specialization")
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(doctors)) };
  } catch (error) {
    console.error("[getDoctors]", error);
    return { success: false, error: "Failed to fetch doctors" };
  }
}