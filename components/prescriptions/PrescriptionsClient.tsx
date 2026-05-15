"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { getPrescriptions } from "@/modules/prescriptions/actions/prescriptionActions";
import { formatDate } from "@/lib/utils";
import { FilePlus, ChevronRight, ImageIcon } from "lucide-react";
import { NewPrescriptionWizard } from "@/components/prescriptions/NewPrescriptionWizard";

interface Prescription {
  _id: string;
  prescriptionNumber: string;
  patientId: { name: string; patientId: string };
  doctorId: { name: string; specialization?: string };
  diagnosis: string;
  medicines: { name: string }[];
  scannedImageUrl?: string;
  createdAt: string;
}

interface PrescriptionsClientProps {
  initialPrescriptions: Prescription[];
}

export function PrescriptionsClient({
  initialPrescriptions,
}: PrescriptionsClientProps) {
  const router = useRouter();
  const [prescriptions, setPrescriptions] =
    useState<Prescription[]>(initialPrescriptions);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const result = await getPrescriptions({ page: 1, limit: 20 });
      if (result.success) setPrescriptions(result.data ?? []);
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setWizardOpen(true)}>
          <FilePlus className="w-4 h-4 mr-2" />
          New Prescription
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-44">Rx Number</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Diagnosis</TableHead>
              <TableHead>Medicines</TableHead>
              <TableHead>Scan</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                  Loading...
                </TableCell>
              </TableRow>
            ) : prescriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                  No prescriptions yet. Create your first one.
                </TableCell>
              </TableRow>
            ) : (
              prescriptions.map((rx) => (
                <TableRow
                  key={rx._id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/prescriptions/${rx._id}`)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {rx.prescriptionNumber}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{rx.patientId?.name}</div>
                    <div className="text-xs text-muted-foreground">{rx.patientId?.patientId}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {rx.doctorId?.name}
                  </TableCell>
                  <TableCell className="text-sm max-w-40 truncate">
                    {rx.diagnosis}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {rx.medicines?.length ?? 0} medicine{rx.medicines?.length !== 1 ? "s" : ""}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {rx.scannedImageUrl ? (
                      <ImageIcon className="w-4 h-4 text-teal-500" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(rx.createdAt)}
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

      <NewPrescriptionWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={() => {
          setWizardOpen(false);
          refresh();
        }}
      />
    </>
  );
}