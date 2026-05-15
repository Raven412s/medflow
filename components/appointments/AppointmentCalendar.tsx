"use client";

import { useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { AppointmentRow, STATUS_COLORS, STATUS_LABELS } from "@/modules/appointments/types";
import { cn } from "@/lib/utils";

interface AppointmentCalendarProps {
  appointments: AppointmentRow[];
  selectedDate: string;
  onStatusUpdate: () => void;
}

export function AppointmentCalendar({
  appointments,
  selectedDate,
}: AppointmentCalendarProps) {
  const calendarRef = useRef(null);

  // Map appointments to FullCalendar event format
  const events = appointments.map((appt) => {
    const [hours, minutes] = appt.timeSlot.split(":").map(Number);
    const start = new Date(appt.date);
    start.setHours(hours, minutes, 0, 0);

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + (appt.duration ?? 30));

    return {
      id: appt._id,
      title: appt.patientName,
      start: start.toISOString(),
      end: end.toISOString(),
      extendedProps: {
        doctorName: appt.doctorName,
        status: appt.status,
        token: appt.token,
        type: appt.type,
      },
    };
  });

  return (
    <div className="border rounded-lg overflow-hidden p-4 fc-wrapper">
      <style>{`
        .fc-wrapper .fc { font-family: inherit; font-size: 13px; }
        .fc-wrapper .fc-toolbar-title { font-size: 15px; font-weight: 600; }
        .fc-wrapper .fc-button {
          background: hsl(var(--primary)) !important;
          border-color: hsl(var(--primary)) !important;
          font-size: 12px !important;
          padding: 4px 10px !important;
          border-radius: 6px !important;
          box-shadow: none !important;
        }
        .fc-wrapper .fc-button:focus { box-shadow: none !important; }
        .fc-wrapper .fc-button-active {
          background: hsl(var(--primary) / 0.8) !important;
        }
        .fc-wrapper .fc-col-header-cell { background: hsl(var(--muted) / 0.5); }
        .fc-wrapper .fc-timegrid-slot { height: 40px !important; }
        .fc-wrapper .fc-event { border: none !important; cursor: pointer; }
        .fc-wrapper .fc-event:focus { box-shadow: none !important; }
        .fc-wrapper a { color: inherit !important; text-decoration: none !important; }
      `}</style>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridDay"
        initialDate={selectedDate}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        eventContent={(eventInfo) => {
          const { status, doctorName, token, type } = eventInfo.event.extendedProps;
          return (
            <div className={cn(
              "px-2 py-1 rounded text-xs w-full h-full overflow-hidden border",
              STATUS_COLORS[status as keyof typeof STATUS_COLORS]
            )}>
              <div className="font-semibold truncate">
                {token ? `#${token} ` : ""}{eventInfo.event.title}
              </div>
              <div className="truncate opacity-80">{doctorName}</div>
              <div className="truncate opacity-70 capitalize">
                {type?.replace("_", " ")} · {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
              </div>
            </div>
          );
        }}
        slotMinTime="08:00:00"
        slotMaxTime="21:00:00"
        allDaySlot={false}
        height="auto"
        nowIndicator={true}
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }}
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }}
      />
    </div>
  );
}