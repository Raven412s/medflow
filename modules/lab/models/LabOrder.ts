import mongoose, { Schema, Document, Model } from "mongoose";

export type LabOrderStatus =
  | "ordered"
  | "sample_collected"
  | "processing"
  | "completed"
  | "cancelled";

// Snapshot of one parameter's result
export interface IParameterResult {
  parameterCode: string;
  parameterName: string;
  value: string;
  unit: string;          // snapshot from LabTest at time of result entry
  normalRange: string;   // snapshot — won't break if test range changes later
  isAbnormal: boolean;
  notes?: string;
}

// One test's complete result (may have multiple parameters)
export interface ILabResult {
  testId: mongoose.Types.ObjectId;
  testName: string;      // snapshot
  testCode: string;      // snapshot
  parameterResults: IParameterResult[];
}

export interface ILabOrder extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  prescriptionId?: mongoose.Types.ObjectId;
  orderedBy: mongoose.Types.ObjectId;
  labTechId?: mongoose.Types.ObjectId;
  orderNumber: string;
  tests: mongoose.Types.ObjectId[];
  status: LabOrderStatus;
  sampleCollectedAt?: Date;
  processingStartedAt?: Date;
  completedAt?: Date;
  results: ILabResult[];
  reportUrl?: string;
  reportPublicId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParameterResultSchema = new Schema<IParameterResult>(
  {
    parameterCode: { type: String, required: true },
    parameterName: { type: String, required: true },
    value: { type: String, required: true },
    unit: { type: String, default: "" },
    normalRange: { type: String, default: "" },
    isAbnormal: { type: Boolean, default: false },
    notes: { type: String },
  },
  { _id: false }
);

const LabResultSchema = new Schema<ILabResult>(
  {
    testId: { type: Schema.Types.ObjectId, ref: "LabTest", required: true },
    testName: { type: String, required: true },
    testCode: { type: String, required: true },
    parameterResults: { type: [ParameterResultSchema], default: [] },
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
      enum: [
        "ordered",
        "sample_collected",
        "processing",
        "completed",
        "cancelled",
      ],
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
  mongoose.models.LabOrder ?? mongoose.model<ILabOrder>("LabOrder", LabOrderSchema);

export default LabOrder;