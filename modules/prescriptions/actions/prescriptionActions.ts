"use server";

import { connectDB } from "@/lib/db";
import Prescription from "@/modules/prescriptions/models/Prescription";
import Patient from "@/modules/patients/models/Patient";
import User from "@/modules/auth/models/User";
import { auth } from "@/auth";
import { createAuditLog } from "@/modules/audit-logs/actions/createAuditLog";
import { uploadFile } from "@/lib/cloudinary";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import mongoose from "mongoose";
import Appointment from "@/modules/appointments/models/Appointment";

const MedicineSchema = z.object({
  name: z.string().min(1, "Medicine name required"),
  dose: z.string().min(1, "Dose required"),
  frequency: z.string().min(1, "Frequency required"),
  duration: z.string().min(1, "Duration required"),
  instructions: z.string().optional(),
});

const PrescriptionSchema = z.object({
  patientId: z.string().min(1, "Patient required"),
  appointmentId: z.string().optional(),
  doctorId: z.string().min(1, "Doctor required"),
  diagnosis: z.string().min(1, "Diagnosis required"),
  medicines: z.array(MedicineSchema).min(1, "At least one medicine required"),
  generalInstructions: z.string().optional(),
  followUpDate: z.string().optional(),
  scannedImageBase64: z.string().optional(),
  scannedImageMimeType: z.string().optional(),
});

function generatePrescriptionNumber(tenantId: string): string {
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  const tenantSuffix = tenantId.slice(-4).toUpperCase();
  return `RX-${tenantSuffix}-${yy}${mm}${dd}-${rand}`;
}

// CREATE
export async function createPrescription(input: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = PrescriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectDB();

  try {
    let scannedImageUrl: string | undefined;
    let scannedImagePublicId: string | undefined;

    // Upload image to Cloudinary if provided
    if (parsed.data.scannedImageBase64 && parsed.data.scannedImageMimeType) {
      const base64Data = parsed.data.scannedImageBase64.replace(
        /^data:image\/\w+;base64,/,
        ""
      );
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `rx-${Date.now()}`;
      scannedImageUrl = await uploadFile(buffer, "prescriptions", fileName);
      scannedImagePublicId = `medflow/prescriptions/${fileName}`;
    }

    const prescriptionNumber = generatePrescriptionNumber(
      session.user.tenantId
    );

    const prescription = await Prescription.create({
      tenantId: session.user.tenantId,
      patientId: new mongoose.Types.ObjectId(parsed.data.patientId),
      appointmentId:
        parsed.data.appointmentId && parsed.data.appointmentId !== ""
          ? new mongoose.Types.ObjectId(parsed.data.appointmentId)
          : undefined,
      doctorId: new mongoose.Types.ObjectId(parsed.data.doctorId),
      prescriptionNumber,
      diagnosis: parsed.data.diagnosis,
      medicines: parsed.data.medicines,
      generalInstructions: parsed.data.generalInstructions,
      followUpDate: parsed.data.followUpDate
        ? new Date(parsed.data.followUpDate)
        : undefined,
      scannedImageUrl,
      scannedImagePublicId,
    });

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "create",
      resource: "prescription",
      resourceId: prescription._id.toString(),
      description: `Created prescription ${prescriptionNumber} for patient`,
    });

    revalidatePath("/prescriptions");
    return {
      success: true,
      prescriptionId: prescription._id.toString(),
      prescriptionNumber,
    };
  } catch (error) {
    console.error("[createPrescription]", error);
    return { success: false, error: "Failed to create prescription" };
  }
}

// GET ALL
export async function getPrescriptions({
  page = 1,
  limit = 20,
  patientId,
}: {
  page?: number;
  limit?: number;
  patientId?: string;
}) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const query: Record<string, unknown> = {
      tenantId: new mongoose.Types.ObjectId(session.user.tenantId),
    };

    if (patientId) {
      query.patientId = new mongoose.Types.ObjectId(patientId);
    }

    const [prescriptions, total] = await Promise.all([
      Prescription.find(query)
        .populate("patientId", "name patientId phone")
        .populate("doctorId", "name specialization")
        .populate("appointmentId", "date timeSlot")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Prescription.countDocuments(query),
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(prescriptions)),
      total,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("[getPrescriptions]", error);
    return { success: false, error: "Failed to fetch prescriptions" };
  }
}

// GET ONE
export async function getPrescriptionById(id: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const prescription = await Prescription.findOne({
      _id: id,
      tenantId: session.user.tenantId,
    })
      .populate("patientId", "name patientId phone gender dateOfBirth")
      .populate("doctorId", "name specialization")
      .lean();

    if (!prescription) return { success: false, error: "Not found" };

    return { success: true, data: JSON.parse(JSON.stringify(prescription)) };
  } catch (error) {
    console.error("[getPrescriptionById]", error);
    return { success: false, error: "Failed to fetch prescription" };
  }
}

// GET PATIENTS for search
export async function searchPatients(query: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const patients = await Patient.find({
      tenantId: session.user.tenantId,
      isActive: true,
      $or: [
        { name: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
        { patientId: { $regex: query, $options: "i" } },
      ],
    })
      .select("name patientId phone gender dateOfBirth")
      .limit(10)
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(patients)) };
  } catch (error) {
    console.error("[searchPatients]", error);
    return { success: false, error: "Failed to search" };
  }
}

// GET APPOINTMENTS for a patient
export async function getPatientAppointments(patientId: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const appointments = await Appointment.find({
      tenantId: session.user.tenantId,
      patientId: new mongoose.Types.ObjectId(patientId),
      status: { $in: ["checked_in", "in_progress", "completed"] },
    })
      .populate("doctorId", "name specialization")
      .sort({ date: -1 })
      .limit(10)
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(appointments)) };
  } catch (error) {
    console.error("[getPatientAppointments]", error);
    return { success: false, error: "Failed to fetch appointments" };
  }
}

// QUICK REGISTER patient from prescription page
export async function quickRegisterPatient(input: {
  name: string;
  phone: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
}) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const { generatePatientId } = await import("@/lib/utils");

    const existing = await Patient.findOne({
      tenantId: session.user.tenantId,
      phone: input.phone,
    });

    if (existing) {
      return {
        success: true,
        data: JSON.parse(JSON.stringify(existing)),
        message: "existing",
      };
    }

    const patient = await Patient.create({
      tenantId: session.user.tenantId,
      patientId: generatePatientId(),
      name: input.name,
      phone: input.phone,
      dateOfBirth: new Date(input.dateOfBirth),
      gender: input.gender,
      isActive: true,
    });

    return {
      success: true,
      data: JSON.parse(JSON.stringify(patient)),
      message: "created",
    };
  } catch (error) {
    console.error("[quickRegisterPatient]", error);
    return { success: false, error: "Failed to register patient" };
  }
}

// GET DOCTORS
export async function getPrescriptionDoctors() {
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
    return { success: false, error: "Failed to fetch doctors" };
  }
}
