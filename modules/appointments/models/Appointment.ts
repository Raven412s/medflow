import mongoose, { Schema, Document, Model } from "mongoose";

export type AppointmentStatus =
  | "scheduled"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface IAppointment extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  date: Date;
  timeSlot: string; // "10:00", "10:30" etc
  duration: number; // in minutes, default 30
  status: AppointmentStatus;
  type: "consultation" | "follow_up" | "emergency" | "procedure";
  token?: number;
  notes?: string;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
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
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      default: 30,
    },
    status: {
      type: String,
      enum: ["scheduled", "checked_in", "in_progress", "completed", "cancelled", "no_show"],
      default: "scheduled",
    },
    type: {
      type: String,
      enum: ["consultation", "follow_up", "emergency", "procedure"],
      default: "consultation",
    },
    token: {
      type: Number,
    },
    notes: String,
    cancelReason: String,
  },
  { timestamps: true }
);

AppointmentSchema.index({ tenantId: 1, date: -1 });
AppointmentSchema.index({ tenantId: 1, doctorId: 1, date: 1 });
AppointmentSchema.index({ tenantId: 1, patientId: 1 });
// Prevent double-booking same doctor at same slot
AppointmentSchema.index(
  { tenantId: 1, doctorId: 1, date: 1, timeSlot: 1 },
  { unique: true, partialFilterExpression: { status: { $nin: ["cancelled", "no_show"] } } }
);

const Appointment: Model<IAppointment> =
  mongoose.models.Appointment ??
  mongoose.model<IAppointment>("Appointment", AppointmentSchema);

export default Appointment;