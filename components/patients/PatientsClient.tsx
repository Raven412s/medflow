"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddPatientDrawer } from "@/components/patients/AddPatientDrawer";
import { getPatients } from "@/modules/patients/actions/patientActions";
import { PatientRow } from "@/modules/patients/types";
import { formatDate } from "@/lib/utils";
import { Search, UserPlus, ChevronRight, Users } from "lucide-react";

interface PatientsClientProps {
  initialPatients: PatientRow[];
  totalPatients: number;
}

export function PatientsClient({
  initialPatients,
  totalPatients,
}: PatientsClientProps) {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientRow[]>(initialPatients);
  const [total, setTotal] = useState(totalPatients);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setSearch(value);
    startTransition(async () => {
      const result = await getPatients({ search: value, page: 1 });
      if (result.success) {
        setPatients(result.data);
        setTotal(result.total ?? 0);
      }
    });
  }

  function handlePatientAdded() {
    setDrawerOpen(false);
    startTransition(async () => {
      const result = await getPatients({ search, page: 1 });
      if (result.success) {
        setPatients(result.data);
        setTotal(result.total ?? 0);
      }
    });
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, ID..."
            className="pl-9"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setDrawerOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-32">Patient ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Blood Group</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                  Searching...
                </TableCell>
              </TableRow>
            ) : patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16">
                  <div className="text-center space-y-2">
                    <Users className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {search ? "No patients found" : "No patients yet"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {search
                        ? `No results for "${search}"`
                        : "Add your first patient to get started"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient) => (
                <TableRow
                  key={patient._id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/patients/${patient._id}`)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {patient.patientId}
                  </TableCell>
                  <TableCell className="font-medium">{patient.name}</TableCell>
                  <TableCell className="text-muted-foreground">{patient.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">
                      {patient.gender}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {patient.bloodGroup ? (
                      <Badge variant="secondary" className="text-xs">
                        {patient.bloodGroup}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(patient.createdAt)}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer count */}
      {total > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {patients.length} of {total} patients
        </p>
      )}

      <AddPatientDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={handlePatientAdded}
      />
    </>
  );
}