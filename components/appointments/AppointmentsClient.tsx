"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddAppointmentDrawer } from "@/components/appointments/AddAppointmentDrawer";
import { StatusUpdater } from "@/components/appointments/StatusUpdater";
import { getAppointments } from "@/modules/appointments/actions/appointmentActions";
import { AppointmentRow, STATUS_COLORS, STATUS_LABELS } from "@/modules/appointments/types";
import { cn, formatDate } from "@/lib/utils";
import { CalendarDays, List, Plus } from "lucide-react";

import dynamic from "next/dynamic";

const AppointmentCalendar = dynamic(
  () => import("@/components/appointments/AppointmentCalendar").then(m => m.AppointmentCalendar),
  { ssr: false, loading: () => (
    <div className="border rounded-lg p-12 text-center text-sm text-muted-foreground">
      Loading calendar...
    </div>
  )}
);

interface AppointmentsClientProps {
  initialAppointments: AppointmentRow[];
  today: string;
}

export function AppointmentsClient({
  initialAppointments,
  today,
}: AppointmentsClientProps) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [appointments, setAppointments] =
    useState<AppointmentRow[]>(initialAppointments);
  const [selectedDate, setSelectedDate] = useState(today);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function refresh(date?: string) {
    startTransition(async () => {
      const result = await getAppointments({
        date: date ?? selectedDate,
        limit: 50,
      });
      if (result.success) setAppointments(result.data ?? []);
    });
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    refresh(date);
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Date picker */}
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-44"
          />
          {/* View toggle */}
          <div className="flex items-center border rounded-md overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={cn(
                "px-3 py-2 text-sm flex items-center gap-1.5 transition-colors",
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              onClick={() => setView("calendar")}
              className={cn(
                "px-3 py-2 text-sm flex items-center gap-1.5 transition-colors",
                view === "calendar"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Calendar
            </button>
          </div>
        </div>

        <Button onClick={() => setDrawerOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Book Appointment
        </Button>
      </div>

      {/* Date label */}
      <p className="text-sm text-muted-foreground -mt-2">
        {selectedDate === today ? "Today" : formatDate(selectedDate)} —{" "}
        <span className="font-medium text-foreground">
          {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}
        </span>
      </p>

      {/* Views */}
      {view === "list" ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-16">Token</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    No appointments for this date.
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((appt) => (
                  <TableRow key={appt._id}>
                    <TableCell>
                      <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {appt.token ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{appt.patientName}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {appt.doctorName}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {appt.timeSlot}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">
                        {appt.type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-xs border", STATUS_COLORS[appt.status])}
                      >
                        {STATUS_LABELS[appt.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusUpdater
                        appointmentId={appt._id}
                        currentStatus={appt.status}
                        onUpdate={() => refresh()}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <AppointmentCalendar
          appointments={appointments}
          selectedDate={selectedDate}
          onStatusUpdate={() => refresh()}
        />
      )}

      <AddAppointmentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => { setDrawerOpen(false); refresh(); }}
        defaultDate={selectedDate}
      />
    </>
  );
}