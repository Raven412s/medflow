import mongoose, { Schema, Document, Model } from "mongoose";

export type LabOrderStatus =
  | "ordered"
  | "sample_collected"
  | "processing"
  | "completed"
  | "cancelled";

export interface ILabResult {
  testId: mongoose.Types.ObjectId;
  testName: string;
  testCode: string;
  value: string;
  unit?: string;
  normalRange?: string;
  isAbnormal: boolean;
  notes?: string;
}

export interface ILabOrder extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  prescriptionId?: mongoose.Types.ObjectId;
  orderedBy: mongoose.Types.ObjectId;    // doctor userId
  labTechId?: mongoose.Types.ObjectId;   // assigned lab tech
  orderNumber: string;
  tests: mongoose.Types.ObjectId[];      // LabTest ids
  status: LabOrderStatus;
  sampleCollectedAt?: Date;
  processingStartedAt?: Date;
  completedAt?: Date;
  results: ILabResult[];
  reportUrl?: string;          // Cloudinary URL
  reportPublicId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LabResultSchema = new Schema<ILabResult>(
  {
    testId: { type: Schema.Types.ObjectId, ref: "LabTest", required: true },
    testName: { type: String, required: true },
    testCode: { type: String, required: true },
    value: { type: String, required: true },
    unit: { type: String },
    normalRange: { type: String },
    isAbnormal: { type: Boolean, default: false },
    notes: { type: String },
  },
  { _id: false }
);

const LabOrderSchema = new Schema<ILabOrder>(
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
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
    prescriptionId: { type: Schema.Types.ObjectId, ref: "Prescription" },
    orderedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    labTechId: { type: Schema.Types.ObjectId, ref: "User" },
    orderNumber: { type: String, required: true },
    tests: [{ type: Schema.Types.ObjectId, ref: "LabTest" }],
    status: {
      type: String,
      enum: ["ordered", "sample_collected", "processing", "completed", "cancelled"],
      default: "ordered",
    },
    sampleCollectedAt: { type: Date },
    processingStartedAt: { type: Date },
    completedAt: { type: Date },
    results: { type: [LabResultSchema], default: [] },
    reportUrl: { type: String },
    reportPublicId: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

LabOrderSchema.index({ tenantId: 1, orderNumber: 1 }, { unique: true });
LabOrderSchema.index({ tenantId: 1, patientId: 1 });
LabOrderSchema.index({ tenantId: 1, status: 1 });
LabOrderSchema.index({ tenantId: 1, createdAt: -1 });

const LabOrder: Model<ILabOrder> =
  mongoose.models.LabOrder ??
  mongoose.model<ILabOrder>("LabOrder", LabOrderSchema);

export default LabOrder;