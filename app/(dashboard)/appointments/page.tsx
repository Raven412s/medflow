import { getAppointments } from "@/modules/appointments/actions/appointmentActions";
import { AppointmentsClient } from "@/components/appointments/AppointmentsClient";

export default async function AppointmentsPage() {
  const today = new Date().toISOString().split("T")[0];
  const result = await getAppointments({ date: today, limit: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Appointments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage patient appointments and schedules
        </p>
      </div>
      <AppointmentsClient
        initialAppointments={result.data ?? []}
        today={today}
      />
    </div>
  );
}