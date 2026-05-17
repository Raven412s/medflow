import mongoose, { Schema, Document, Model } from "mongoose";

export type RadiologyOrderStatus =
  | "ordered"
  | "imaging_done"
  | "reported"
  | "completed"
  | "cancelled";

export type ImagingType =
  | "x_ray"
  | "mri"
  | "ct_scan"
  | "ultrasound"
  | "echo"
  | "mammography"
  | "dexa"
  | "other";

export interface IRadiologyOrder extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  prescriptionId?: mongoose.Types.ObjectId;
  orderedBy: mongoose.Types.ObjectId;
  orderNumber: string;
  imagingType: ImagingType;
  bodyPart: string;           // e.g. "Chest", "Left Knee", "Abdomen"
  clinicalHistory?: string;   // doctor ke notes
  contrast: boolean;          // contrast diya ya nahi
  status: RadiologyOrderStatus;
  imagingDoneAt?: Date;
  reportedAt?: Date;
  completedAt?: Date;
  findings?: string;          // radiologist ki findings
  impression?: string;        // radiologist ka conclusion
  imageUrls: string[];        // Cloudinary URLs — multiple images ho sakti hain
  reportUrl?: string;         // final PDF report
  reportPublicId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RadiologyOrderSchema = new Schema<IRadiologyOrder>(
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
    orderNumber: { type: String, required: true },
    imagingType: {
      type: String,
      enum: [
        "x_ray", "mri", "ct_scan", "ultrasound",
        "echo", "mammography", "dexa", "other",
      ],
      required: true,
    },
    bodyPart: { type: String, required: true, trim: true },
    clinicalHistory: { type: String },
    contrast: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["ordered", "imaging_done", "reported", "completed", "cancelled"],
      default: "ordered",
    },
    imagingDoneAt: { type: Date },
    reportedAt: { type: Date },
    completedAt: { type: Date },
    findings: { type: String },
    impression: { type: String },
    imageUrls: { type: [String], default: [] },
    reportUrl: { type: String },
    reportPublicId: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

RadiologyOrderSchema.index({ tenantId: 1, orderNumber: 1 }, { unique: true });
RadiologyOrderSchema.index({ tenantId: 1, patientId: 1 });
RadiologyOrderSchema.index({ tenantId: 1, status: 1 });
RadiologyOrderSchema.index({ tenantId: 1, createdAt: -1 });

const RadiologyOrder: Model<IRadiologyOrder> =
  mongoose.models.RadiologyOrder ??
  mongoose.model<IRadiologyOrder>("RadiologyOrder", RadiologyOrderSchema);

export default RadiologyOrder;