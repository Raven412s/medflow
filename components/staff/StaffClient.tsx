"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddStaffDrawer } from "@/components/staff/AddStaffDrawer";
import { EditStaffDrawer } from "@/components/staff/EditStaffDrawer";
import { getStaff, toggleStaffStatus } from "@/modules/staff/actions/staffActions";
import { UserPlus, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  clinic_admin: "Clinic Admin",
  doctor: "Doctor",
  receptionist: "Receptionist",
  pharmacist: "Pharmacist",
  lab_tech: "Lab Technician",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  clinic_admin: "bg-blue-100 text-blue-700 border-blue-200",
  doctor: "bg-teal-100 text-teal-700 border-teal-200",
  receptionist: "bg-amber-100 text-amber-700 border-amber-200",
  pharmacist: "bg-green-100 text-green-700 border-green-200",
  lab_tech: "bg-rose-100 text-rose-700 border-rose-200",
};

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  specialization?: string;
  isActive: boolean;
}

interface StaffClientProps {
  initialStaff: StaffMember[];
  isAdmin: boolean;
}

export function StaffClient({ initialStaff, isAdmin }: StaffClientProps) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const result = await getStaff();
      if (result.success) setStaff(result.data ?? []);
    });
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      await toggleStaffStatus(id, !current);
      refresh();
    });
  }

  return (
    <>
      <div className="flex justify-end">
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Staff Member
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Specialization</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-muted-foreground text-sm"
                >
                  No staff members yet.
                </TableCell>
              </TableRow>
            ) : (
              staff.map((member) => (
                <TableRow key={member._id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs border",
                        ROLE_COLORS[member.role] ?? ""
                      )}
                    >
                      {ROLE_LABELS[member.role] ?? member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {member.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {member.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {member.specialization ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        member.isActive
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-zinc-100 text-zinc-500 border-zinc-200"
                      )}
                    >
                      {member.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 rounded hover:bg-muted transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditTarget(member)}
                          >
                            Edit details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className={
                              member.isActive
                                ? "text-destructive focus:text-destructive"
                                : "text-green-600 focus:text-green-600"
                            }
                            onClick={() =>
                              handleToggle(member._id, member.isActive)
                            }
                            disabled={isPending}
                          >
                            {member.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddStaffDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => { setAddOpen(false); refresh(); }}
      />

      {editTarget && (
        <EditStaffDrawer
          open={!!editTarget}
          staff={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => { setEditTarget(null); refresh(); }}
        />
      )}
    </>
  );
}