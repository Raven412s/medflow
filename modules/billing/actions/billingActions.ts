"use server";

import { connectDB } from "@/lib/db";
import Invoice from "@/modules/billing/models/Invoice";
import { auth } from "@/auth";
import { createAuditLog } from "@/modules/audit-logs/actions/createAuditLog";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import mongoose from "mongoose";

const LineItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  type: z.enum(["consultation", "medicine", "lab", "procedure", "other"]),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

const InvoiceSchema = z.object({
  patientId: z.string().min(1, "Patient required"),
  appointmentId: z.string().optional(),
  prescriptionId: z.string().optional(),
  lineItems: z.array(LineItemSchema).min(1, "Add at least one item"),
  gstRate: z.number().min(0).max(100).default(0),
  discountAmount: z.number().min(0).default(0),
  paidAmount: z.number().min(0).default(0),
  paymentMethod: z
    .enum(["cash", "card", "upi", "insurance", "other"])
    .optional(),
  notes: z.string().optional(),
});

function generateInvoiceNumber(tenantId: string): string {
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  const suffix = tenantId.slice(-4).toUpperCase();
  return `INV-${suffix}-${yy}${mm}${dd}-${rand}`;
}

function computeAmounts(
  lineItems: z.infer<typeof LineItemSchema>[],
  gstRate: number,
  discountAmount: number,
  paidAmount: number
) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const gstAmount = parseFloat(((subtotal * gstRate) / 100).toFixed(2));
  const totalAmount = parseFloat(
    (subtotal + gstAmount - discountAmount).toFixed(2)
  );
  const balanceAmount = parseFloat(
    Math.max(0, totalAmount - paidAmount).toFixed(2)
  );

  let paymentStatus: "pending" | "paid" | "partial" | "cancelled" = "pending";
  if (paidAmount >= totalAmount) paymentStatus = "paid";
  else if (paidAmount > 0) paymentStatus = "partial";

  return { subtotal, gstAmount, totalAmount, balanceAmount, paymentStatus };
}

// CREATE
export async function createInvoice(input: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = InvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectDB();

  try {
    const { subtotal, gstAmount, totalAmount, balanceAmount, paymentStatus } =
      computeAmounts(
        parsed.data.lineItems,
        parsed.data.gstRate,
        parsed.data.discountAmount,
        parsed.data.paidAmount
      );

    const invoiceNumber = generateInvoiceNumber(session.user.tenantId);

    const invoice = await Invoice.create({
      tenantId: session.user.tenantId,
      patientId: new mongoose.Types.ObjectId(parsed.data.patientId),
      appointmentId:
        parsed.data.appointmentId && parsed.data.appointmentId !== ""
          ? new mongoose.Types.ObjectId(parsed.data.appointmentId)
          : undefined,
      prescriptionId:
        parsed.data.prescriptionId && parsed.data.prescriptionId !== ""
          ? new mongoose.Types.ObjectId(parsed.data.prescriptionId)
          : undefined,
      invoiceNumber,
      lineItems: parsed.data.lineItems,
      subtotal,
      gstRate: parsed.data.gstRate,
      gstAmount,
      discountAmount: parsed.data.discountAmount,
      totalAmount,
      paidAmount: parsed.data.paidAmount,
      balanceAmount,
      paymentStatus,
      paymentMethod:
        parsed.data.paidAmount > 0 ? parsed.data.paymentMethod : undefined,
      paymentDate:
        parsed.data.paidAmount > 0 ? new Date() : undefined,
      notes: parsed.data.notes,
    });

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "create",
      resource: "invoice",
      resourceId: invoice._id.toString(),
      description: `Created invoice ${invoiceNumber} — ₹${totalAmount}`,
    });

    revalidatePath("/billing");
    return { success: true, invoiceId: invoice._id.toString(), invoiceNumber };
  } catch (error) {
    console.error("[createInvoice]", error);
    return { success: false, error: "Failed to create invoice" };
  }
}

// GET ALL
export async function getInvoices({
  page = 1,
  limit = 20,
  status,
  patientId,
}: {
  page?: number;
  limit?: number;
  status?: string;
  patientId?: string;
}) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const query: Record<string, unknown> = {
      tenantId: new mongoose.Types.ObjectId(session.user.tenantId),
    };

    if (status) query.paymentStatus = status;
    if (patientId)
      query.patientId = new mongoose.Types.ObjectId(patientId);

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate("patientId", "name patientId phone")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(query),
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(invoices)),
      total,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("[getInvoices]", error);
    return { success: false, error: "Failed to fetch invoices" };
  }
}

// GET ONE
export async function getInvoiceById(id: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const invoice = await Invoice.findOne({
      _id: id,
      tenantId: session.user.tenantId,
    })
      .populate("patientId", "name patientId phone address")
      .populate("appointmentId", "date timeSlot")
      .lean();

    if (!invoice) return { success: false, error: "Invoice not found" };

    return { success: true, data: JSON.parse(JSON.stringify(invoice)) };
  } catch (error) {
    console.error("[getInvoiceById]", error);
    return { success: false, error: "Failed to fetch invoice" };
  }
}

// RECORD PAYMENT
export async function recordPayment(
  id: string,
  input: {
    paidAmount: number;
    paymentMethod: string;
  }
) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const invoice = await Invoice.findOne({
      _id: id,
      tenantId: session.user.tenantId,
    });

    if (!invoice) return { success: false, error: "Invoice not found" };

    const newPaidAmount = invoice.paidAmount + input.paidAmount;
    const balanceAmount = Math.max(0, invoice.totalAmount - newPaidAmount);
    const paymentStatus: "pending" | "paid" | "partial" =
      newPaidAmount >= invoice.totalAmount
        ? "paid"
        : newPaidAmount > 0
        ? "partial"
        : "pending";

    invoice.paidAmount = newPaidAmount;
    invoice.balanceAmount = balanceAmount;
    invoice.paymentStatus = paymentStatus;
    invoice.paymentMethod = input.paymentMethod as "cash" | "card" | "upi" | "insurance" | "other";
    invoice.paymentDate = new Date();
    await invoice.save();

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "update",
      resource: "invoice",
      resourceId: id,
      description: `Recorded payment ₹${input.paidAmount} via ${input.paymentMethod}`,
    });

    revalidatePath("/billing");
    return { success: true };
  } catch (error) {
    console.error("[recordPayment]", error);
    return { success: false, error: "Failed to record payment" };
  }
}

// BILLING SUMMARY for dashboard
export async function getBillingSummary() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const tenantId = new mongoose.Types.ObjectId(session.user.tenantId);

    const [summary] = await Invoice.aggregate([
      { $match: { tenantId, paymentStatus: { $ne: "cancelled" } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$paidAmount" },
          totalPending: { $sum: "$balanceAmount" },
          totalInvoices: { $sum: 1 },
          pendingCount: {
            $sum: {
              $cond: [
                { $in: ["$paymentStatus", ["pending", "partial"]] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    return {
      success: true,
      data: summary ?? {
        totalRevenue: 0,
        totalPending: 0,
        totalInvoices: 0,
        pendingCount: 0,
      },
    };
  } catch (error) {
    console.error("[getBillingSummary]", error);
    return { success: false, error: "Failed to fetch summary" };
  }
}