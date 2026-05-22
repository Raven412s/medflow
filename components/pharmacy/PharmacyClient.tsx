"use client";

import { AddMedicineDrawer } from "@/components/pharmacy/AddMedicineDrawer";
import { NewDispenseDrawer } from "@/components/pharmacy/NewDispenseDrawer";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDate } from "@/lib/utils";
import { getDispenses, getMedicines } from "@/modules/pharmacy/actions/pharmacyActions";
import { AlertTriangle, ChevronRight, Package, Pill, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface Medicine {
  _id: string;
  name: string;
  genericName?: string;
  category: string;
  form: string;
  strength?: string;
  unit: string;
  sellingPrice: number;
  currentStock: number;
  reorderLevel: number;
  expiryDate?: string;
  isActive: boolean;
}

interface Dispense {
  _id: string;
  dispenseNumber: string;
  patientId: {
    _id: string;
    name: string;
    patientId: string;
  };
  dispensedBy: { name: string };
  items: { medicineName: string; quantity: number; total: number }[];
  totalAmount: number;
  paymentStatus: "pending" | "paid" | "partial";
  createdAt: string;
}

const PAYMENT_STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  partial: "bg-blue-50 text-blue-700 border-blue-200",
};

// Calculate expiry cutoff date outside of render to avoid impure function calls
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const getExpiryWarningCutoff = () => new Date(Date.now() + THIRTY_DAYS_MS);

interface PharmacyClientProps {
  initialMedicines: Medicine[];
  lowStockMedicines: Medicine[];
  initialDispenses: Dispense[];
  isAdmin: boolean;
}

export function PharmacyClient({
  initialMedicines,
  lowStockMedicines,
  initialDispenses,
  isAdmin,
}: PharmacyClientProps) {
  const router = useRouter();
  const [medicines, setMedicines] = useState<Medicine[]>(initialMedicines);
  const [dispenses, setDispenses] = useState<Dispense[]>(initialDispenses);
  const [addMedicineOpen, setAddMedicineOpen] = useState(false);
  const [dispenseOpen, setDispenseOpen] = useState(false);
  const [, startTransition] = useTransition();

  function refreshMedicines() {
    startTransition(async () => {
      const r = await getMedicines();
      if (r.success) setMedicines(r.data ?? []);
    });
  }

  function refreshDispenses() {
    startTransition(async () => {
      const r = await getDispenses({ limit: 20 });
      if (r.success) setDispenses(r.data ?? []);
    });
  }

  return (
    <>
      {/* Low stock alert */}
      {lowStockMedicines.length > 0 && (
        <div className="flex items-start gap-3 p-4 border border-amber-200 rounded-lg bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              {lowStockMedicines.length} medicine{lowStockMedicines.length !== 1 ? "s" : ""} low on stock
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {lowStockMedicines.map((m) => `${m.name} (${m.currentStock} ${m.unit})`).join(", ")}
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="inventory">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="dispenses">Dispense History</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddMedicineOpen(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Medicine
              </Button>
            )}
            <Button onClick={() => setDispenseOpen(true)}>
              <Pill className="w-4 h-4 mr-2" />
              Dispense Medicines
            </Button>
          </div>
        </div>

        {/* Inventory tab */}
        <TabsContent value="inventory" className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Medicine</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Strength</TableHead>
                  <TableHead className="text-right">Price ₹</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medicines.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-12"
                    >
                      <div className="space-y-2">
                        <Package className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                        <p className="text-sm text-muted-foreground">
                          No medicines in inventory yet.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  medicines.map((med) => {
                    const isLow = med.currentStock <= med.reorderLevel;
                    const isExpiringSoon =
                      med.expiryDate &&
                      new Date(med.expiryDate) < getExpiryWarningCutoff();
                    return (
                      <TableRow key={med._id}>
                        <TableCell>
                          <div className="font-medium text-sm">{med.name}</div>
                          {med.genericName && (
                            <div className="text-xs text-muted-foreground">
                              {med.genericName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {med.category}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {med.form}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {med.strength ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">
                          ₹{med.sellingPrice.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "text-sm font-medium",
                              isLow ? "text-red-600" : "text-foreground"
                            )}
                          >
                            {med.currentStock} {med.unit}
                          </span>
                          {isLow && (
                            <span className="ml-1 text-xs text-red-500">
                              ↓ low
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {med.expiryDate ? (
                            <span
                              className={cn(
                                isExpiringSoon
                                  ? "text-amber-600 font-medium"
                                  : "text-muted-foreground"
                              )}
                            >
                              {formatDate(med.expiryDate)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              med.isActive
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-zinc-100 text-zinc-500"
                            )}
                          >
                            {med.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Dispenses tab */}
        <TabsContent value="dispenses" className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-44">Dispense No.</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Dispensed By</TableHead>
                  <TableHead className="text-right">Amount ₹</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                      No dispense records yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  dispenses.map((d) => (
                    <TableRow key={d._id} >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {d.dispenseNumber}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">
                          {d.patientId?.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {d.patientId?.patientId}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {d.items?.map((i) => `${i.medicineName} ×${i.quantity}`).join(", ")}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.dispensedBy?.name}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        ₹{d.totalAmount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs border capitalize",
                            PAYMENT_STATUS_STYLES[d.paymentStatus]
                          )}
                        >
                          {d.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(d.createdAt)}
                      </TableCell>
                      <TableCell className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/patients/${d.patientId._id}`)}>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <AddMedicineDrawer
        open={addMedicineOpen}
        onClose={() => setAddMedicineOpen(false)}
        onSuccess={() => {
          setAddMedicineOpen(false);
          refreshMedicines();
        }}
      />

      <NewDispenseDrawer
        open={dispenseOpen}
        medicines={medicines}
        onClose={() => setDispenseOpen(false)}
        onSuccess={() => {
          setDispenseOpen(false);
          refreshMedicines();
          refreshDispenses();
        }}
      />
    </>
  );
}