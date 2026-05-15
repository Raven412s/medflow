import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMedicine {
  name: string;
  dose: string;
  frequency: string; // e.g. "1-0-1", "1-1-1"
  duration: string;  // e.g. "5 days", "1 week"
  instructions?: string; // e.g. "after food"
}

export interface IPrescription extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  prescriptionNumber: string;
  diagnosis: string;
  medicines: IMedicine[];
  generalInstructions?: string;
  followUpDate?: Date;
  scannedImageUrl?: string;  // Cloudinary URL
  scannedImagePublicId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MedicineSchema = new Schema<IMedicine>(
  {
    name: { type: String, required: true, trim: true },
    dose: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    instructions: { type: String, trim: true },
  },
  { _id: false }
);

const PrescriptionSchema = new Schema<IPrescription>(
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
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    prescriptionNumber: {
      type: String,
      required: true,
    },
    diagnosis: {
      type: String,
      required: true,
      trim: true,
    },
    medicines: {
      type: [MedicineSchema],
      default: [],
    },
    generalInstructions: { type: String },
    followUpDate: { type: Date },
    scannedImageUrl: { type: String },
    scannedImagePublicId: { type: String },
  },
  { timestamps: true }
);

PrescriptionSchema.index({ tenantId: 1, patientId: 1 });
PrescriptionSchema.index({ tenantId: 1, createdAt: -1 });
PrescriptionSchema.index({ tenantId: 1, prescriptionNumber: 1 }, { unique: true });

const Prescription: Model<IPrescription> =
  mongoose.models.Prescription ??
  mongoose.model<IPrescription>("Prescription", PrescriptionSchema);

export default Prescription;