"use client";

import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateAppointmentStatus } from "@/modules/appointments/actions/appointmentActions";
import { AppointmentStatus } from "@/modules/appointments/models/Appointment";
import { STATUS_LABELS } from "@/modules/appointments/types";
import { MoreHorizontal } from "lucide-react";

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["checked_in", "cancelled", "no_show"],
  checked_in: ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};

interface StatusUpdaterProps {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  onUpdate: () => void;
}

export function StatusUpdater({
  appointmentId,
  currentStatus,
  onUpdate,
}: StatusUpdaterProps) {
  const [isPending, startTransition] = useTransition();
  const next = TRANSITIONS[currentStatus];

  if (next.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        className="p-1 rounded hover:bg-muted transition-colors"
      >
        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {next.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() =>
              startTransition(async () => {
                await updateAppointmentStatus(appointmentId, status);
                onUpdate();
              })
            }
          >
            Mark as {STATUS_LABELS[status]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}