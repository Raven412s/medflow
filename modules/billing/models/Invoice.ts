import mongoose, { Schema, Document, Model } from "mongoose";

export type PaymentStatus = "pending" | "paid" | "partial" | "cancelled";
export type PaymentMethod = "cash" | "card" | "upi" | "insurance" | "other";

export interface ILineItem {
  description: string;
  type: "consultation" | "medicine" | "lab" | "procedure" | "other";
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  prescriptionId?: mongoose.Types.ObjectId;
  invoiceNumber: string;
  lineItems: ILineItem[];
  subtotal: number;
  gstRate: number;      // percentage e.g. 18
  gstAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LineItemSchema = new Schema<ILineItem>(
  {
    description: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["consultation", "medicine", "lab", "procedure", "other"],
      required: true,
    },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    prescriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Prescription",
    },
    invoiceNumber: {
      type: String,
      required: true,
    },
    lineItems: {
      type: [LineItemSchema],
      default: [],
    },
    subtotal: { type: Number, required: true, default: 0 },
    gstRate: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partial", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "upi", "insurance", "other"],
    },
    paymentDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

InvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ tenantId: 1, patientId: 1 });
InvoiceSchema.index({ tenantId: 1, paymentStatus: 1 });
InvoiceSchema.index({ tenantId: 1, createdAt: -1 });

const Invoice: Model<IInvoice> =
  mongoose.models.Invoice ??
  mongoose.model<IInvoice>("Invoice", InvoiceSchema);

export default Invoice;