import { AppointmentStatus } from "../models/Appointment";

export interface AppointmentRow {
  _id: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  duration: number;
  status: AppointmentStatus;
  type: string;
  token?: number;
  notes?: string;
}

export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  checked_in: "bg-violet-100 text-violet-700 border-violet-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  no_show: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  checked_in: "Checked In",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export const TIME_SLOTS = Array.from({ length: 26 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 30; // start 8:00 AM, every 30 min
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const display = `${h > 12 ? h - 12 : h}:${m === 0 ? "00" : m} ${h >= 12 ? "PM" : "AM"}`;
  const value = `${String(h).padStart(2, "0")}:${m === 0 ? "00" : m}`;
  return { value, display };
});