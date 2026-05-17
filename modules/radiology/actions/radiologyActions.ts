"use server";

import { connectDB } from "@/lib/db";
import RadiologyOrder from "@/modules/radiology/models/RadiologyOrder";
import { auth } from "@/auth";
import { createAuditLog } from "@/modules/audit-logs/actions/createAuditLog";
import { uploadFile } from "@/lib/cloudinary";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import mongoose from "mongoose";
import { IMAGING_LABELS } from "../constants";



function generateOrderNumber(tenantId: string): string {
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  const suffix = tenantId.slice(-4).toUpperCase();
  return `RAD-${suffix}-${yy}${mm}${dd}-${rand}`;
}

// CREATE ORDER
const CreateOrderSchema = z.object({
  patientId: z.string().min(1, "Patient required"),
  imagingType: z.enum([
    "x_ray", "mri", "ct_scan", "ultrasound",
    "echo", "mammography", "dexa", "other",
  ]),
  bodyPart: z.string().min(1, "Body part required"),
  clinicalHistory: z.string().optional(),
  contrast: z.boolean().default(false),
  appointmentId: z.string().optional(),
  notes: z.string().optional(),
});

export async function createRadiologyOrder(input: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = CreateOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectDB();

  try {
    const orderNumber = generateOrderNumber(session.user.tenantId);

    const order = await RadiologyOrder.create({
      tenantId: session.user.tenantId,
      patientId: new mongoose.Types.ObjectId(parsed.data.patientId),
      orderedBy: new mongoose.Types.ObjectId(session.user.id),
      appointmentId:
        parsed.data.appointmentId && parsed.data.appointmentId !== ""
          ? new mongoose.Types.ObjectId(parsed.data.appointmentId)
          : undefined,
      orderNumber,
      imagingType: parsed.data.imagingType,
      bodyPart: parsed.data.bodyPart,
      clinicalHistory: parsed.data.clinicalHistory,
      contrast: parsed.data.contrast,
      notes: parsed.data.notes,
      status: "ordered",
    });

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "create",
      resource: "radiology_order",
      resourceId: order._id.toString(),
      description: `Created radiology order ${orderNumber} — ${IMAGING_LABELS[parsed.data.imagingType]} ${parsed.data.bodyPart}`,
    });

    revalidatePath("/radiology");
    return { success: true, orderId: order._id.toString(), orderNumber };
  } catch (error) {
    console.error("[createRadiologyOrder]", error);
    return { success: false, error: "Failed to create order" };
  }
}

// GET ALL
export async function getRadiologyOrders({
  page = 1,
  limit = 20,
  status,
}: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const query: Record<string, unknown> = {
      tenantId: new mongoose.Types.ObjectId(session.user.tenantId),
    };
    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      RadiologyOrder.find(query)
        .populate("patientId", "name patientId phone")
        .populate("orderedBy", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      RadiologyOrder.countDocuments(query),
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(orders)),
      total,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("[getRadiologyOrders]", error);
    return { success: false, error: "Failed to fetch orders" };
  }
}

// GET ONE
export async function getRadiologyOrderById(id: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const order = await RadiologyOrder.findOne({
      _id: id,
      tenantId: session.user.tenantId,
    })
      .populate("patientId", "name patientId phone gender dateOfBirth")
      .populate("orderedBy", "name specialization")
      .lean();

    if (!order) return { success: false, error: "Order not found" };

    return { success: true, data: JSON.parse(JSON.stringify(order)) };
  } catch (error) {
    console.error("[getRadiologyOrderById]", error);
    return { success: false, error: "Failed to fetch order" };
  }
}

// UPDATE STATUS
export async function updateRadiologyStatus(
  id: string,
  status: RadiologyOrderStatus
) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const update: Record<string, unknown> = { status };
    if (status === "imaging_done") update.imagingDoneAt = new Date();
    if (status === "reported") update.reportedAt = new Date();
    if (status === "completed") update.completedAt = new Date();

    const order = await RadiologyOrder.findOneAndUpdate(
      { _id: id, tenantId: session.user.tenantId },
      update,
      { new: true }
    );

    if (!order) return { success: false, error: "Order not found" };

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "update",
      resource: "radiology_order",
      resourceId: id,
      description: `Radiology order status updated to ${status}`,
    });

    revalidatePath("/radiology");
    revalidatePath(`/radiology/${id}`);
    return { success: true };
  } catch (error) {
    console.error("[updateRadiologyStatus]", error);
    return { success: false, error: "Failed to update status" };
  }
}

// SAVE REPORT — findings + images + PDF
const ReportSchema = z.object({
  findings: z.string().min(1, "Findings required"),
  impression: z.string().min(1, "Impression required"),
  imageBase64List: z.array(z.string()).optional(),
  imageMimeTypes: z.array(z.string()).optional(),
  reportBase64: z.string().optional(),
  reportMimeType: z.string().optional(),
});

export async function saveRadiologyReport(id: string, input: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = ReportSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectDB();

  try {
    const imageUrls: string[] = [];

    // Upload images
    if (
      parsed.data.imageBase64List?.length &&
      parsed.data.imageMimeTypes?.length
    ) {
      for (let i = 0; i < parsed.data.imageBase64List.length; i++) {
        const base64 = parsed.data.imageBase64List[i];
        const mime = parsed.data.imageMimeTypes[i] ?? "image/jpeg";
        const cleaned = base64.replace(
          /^data:(image|application)\/\w+;base64,/,
          ""
        );
        const buffer = Buffer.from(cleaned, "base64");
        const fileName = `rad-${id}-img-${i}-${Date.now()}`;
        const url = await uploadFile(buffer, "radiology", fileName, mime);
        imageUrls.push(url);
      }
    }

    // Upload PDF report
    let reportUrl: string | undefined;
    let reportPublicId: string | undefined;

    if (parsed.data.reportBase64 && parsed.data.reportMimeType) {
      const cleaned = parsed.data.reportBase64.replace(
        /^data:(image|application)\/\w+;base64,/,
        ""
      );
      const buffer = Buffer.from(cleaned, "base64");
      const fileName = `rad-report-${id}-${Date.now()}`;
      reportUrl = await uploadFile(
        buffer,
        "radiology-reports",
        fileName,
        parsed.data.reportMimeType
      );
      reportPublicId = `medflow/radiology-reports/${fileName}`;
    }

    const update: Record<string, unknown> = {
      findings: parsed.data.findings,
      impression: parsed.data.impression,
      status: "completed",
      completedAt: new Date(),
      reportedAt: new Date(),
    };

    if (imageUrls.length > 0) update.imageUrls = imageUrls;
    if (reportUrl) {
      update.reportUrl = reportUrl;
      update.reportPublicId = reportPublicId;
    }

    const order = await RadiologyOrder.findOneAndUpdate(
      { _id: id, tenantId: session.user.tenantId },
      update,
      { new: true }
    );

    if (!order) return { success: false, error: "Order not found" };

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "update",
      resource: "radiology_order",
      resourceId: id,
      description: `Radiology report saved for order ${order.orderNumber}`,
    });

    revalidatePath("/radiology");
    revalidatePath(`/radiology/${id}`);
    return { success: true };
  } catch (error) {
    console.error("[saveRadiologyReport]", error);
    return { success: false, error: "Failed to save report" };
  }
}

type RadiologyOrderStatus =
  | "ordered"
  | "imaging_done"
  | "reported"
  | "completed"
  | "cancelled";

