"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { createLabOrder } from "@/modules/lab/actions/labActions";
import { searchPatients } from "@/modules/prescriptions/actions/prescriptionActions";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const Schema = z.object({
    patientId: z.string().min(1, "Patient required"),
    testIds: z.array(z.string()).min(1, "Select at least one test"),
    notes: z.string().optional(),
});

type FormInput = z.infer<typeof Schema>;

interface LabTest {
    _id: string;
    name: string;
    code: string;
    category: string;
    price: number;
}

interface Patient {
    _id: string;
    name: string;
    patientId: string;
    phone: string;
}

export function NewLabOrderDrawer({
    open,
    tests,
    onClose,
    onSuccess,
}: {
    open: boolean;
    tests: LabTest[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [serverError, setServerError] = useState<string | null>(null);
    const [patientSearch, setPatientSearch] = useState("");
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [selectedTests, setSelectedTests] = useState<string[]>([]);
    const [searching, setSearching] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormInput>({ resolver: zodResolver(Schema) });

    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    const handlePatientSearch = useCallback((value: string) => {
        setPatientSearch(value);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (value.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            const r = await searchPatients(value);
            if (r.success) setSearchResults(r.data ?? []);
            setSearching(false);
        }, 300);
    }, []);

    function toggleTest(id: string) {
        const updated = selectedTests.includes(id)
            ? selectedTests.filter((t) => t !== id)
            : [...selectedTests, id];
        setSelectedTests(updated);
        setValue("testIds", updated);
    }

    function handleClose() {
        reset();
        setPatientSearch("");
        setSearchResults([]);
        setSelectedPatient(null);
        setSelectedTests([]);
        setServerError(null);
        onClose();
    }

    async function onSubmit(data: FormInput) {
        setServerError(null);
        const result = await createLabOrder(data);
        if (!result.success) {
            setServerError(result.error ?? "Failed");
            return;
        }
        handleClose();
        onSuccess();
    }

    // Group tests by category
    const grouped = tests.reduce<Record<string, LabTest[]>>((acc, t) => {
        if (!acc[t.category]) acc[t.category] = [];
        acc[t.category].push(t);
        return acc;
    }, {});

    const totalPrice = selectedTests.reduce((sum, id) => {
        const test = tests.find((t) => t._id === id);
        return sum + (test?.price ?? 0);
    }, 0);

    return (
        <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="mb-5">
                    <SheetTitle>New Lab Order</SheetTitle>
                    <SheetDescription>
                        Order lab tests for a patient.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* Patient */}
                    <div className="space-y-2">
                        <Label>Patient *</Label>
                        {selectedPatient ? (
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/40">
                                <div>
                                    <p className="text-sm font-medium">{selectedPatient.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedPatient.patientId} · {selectedPatient.phone}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        setSelectedPatient(null);
                                        setValue("patientId", "");
                                    }}
                                >
                                    Change
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        className="pl-9"
                                        placeholder="Search patient..."
                                        value={patientSearch}
                                        onChange={(e) => handlePatientSearch(e.target.value)}
                                    />
                                </div>
                                {patientSearch.length >= 2 && (
                                    <div className="border rounded-lg overflow-hidden">
                                        {searching ? (
                                            <div className="p-3 text-sm text-center text-muted-foreground">Searching...</div>
                                        ) : searchResults.length === 0 ? (
                                            <div className="p-3 text-sm text-center text-muted-foreground">No patients found</div>
                                        ) : (
                                            searchResults.map((p) => (
                                                <button
                                                    key={p._id}
                                                    type="button"
                                                    className="w-full text-left px-3 py-2.5 hover:bg-muted text-sm border-b last:border-0"
                                                    onClick={() => {
                                                        setSelectedPatient(p);
                                                        setValue("patientId", p._id);
                                                        setPatientSearch("");
                                                        setSearchResults([]);
                                                    }}
                                                >
                                                    <span className="font-medium">{p.name}</span>
                                                    <span className="text-muted-foreground ml-2 text-xs">{p.phone}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        {errors.patientId && (
                            <p className="text-xs text-destructive">{errors.patientId.message}</p>
                        )}
                    </div>

                    <Separator />

                    {/* Test selection */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Select Tests *</Label>
                            {selectedTests.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                    {selectedTests.length} selected · ₹{totalPrice.toLocaleString("en-IN")}
                                </span>
                            )}
                        </div>

                        {tests.length === 0 ? (
                            <p className="text-sm text-muted-foreground bg-muted/40 rounded p-3">
                                No tests in catalogue. Ask admin to add tests first.
                            </p>
                        ) : (
                            Object.entries(grouped).map(([category, categoryTests]) => (
                                <div key={category} className="space-y-1.5">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        {category}
                                    </p>
                                    <div className="space-y-1">
                                        {categoryTests.map((test) => {
                                            const isSelected = selectedTests.includes(test._id);
                                            return (
                                                <button
                                                    key={test._id}
                                                    type="button"
                                                    onClick={() => toggleTest(test._id)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-colors",
                                                        isSelected
                                                            ? "border-primary bg-primary/5 text-primary"
                                                            : "border-border hover:bg-muted"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                                                            isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                                                        )}>
                                                            {isSelected && (
                                                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <span className="font-mono text-xs text-muted-foreground w-12 shrink-0">
                                                            {test.code}
                                                        </span>
                                                        <span>{test.name}</span>
                                                    </div>
                                                    <span className="text-muted-foreground text-xs">
                                                        ₹{test.price.toLocaleString("en-IN")}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}

                        {errors.testIds && (
                            <p className="text-xs text-destructive">{errors.testIds.message}</p>
                        )}

                        {selectedTests.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {selectedTests.map((id) => {
                                    const test = tests.find((t) => t._id === id);
                                    if (!test) return null;
                                    return (
                                        <Badge key={id} variant="secondary" className="text-xs gap-1">
                                            {test.code}
                                            <button type="button" onClick={() => toggleTest(id)}>
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <Separator />

                    <div className="space-y-1.5">
                        <Label>Notes</Label>
                        <textarea
                            placeholder="Clinical notes, urgent flag, special instructions..."
                            className="flex min-h-15 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                            {...register("notes")}
                        />
                    </div>

                    {serverError && (
                        <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                            {serverError}
                        </p>
                    )}

                    <div className="flex gap-3 pt-1">
                        <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1" disabled={isSubmitting}>
                            {isSubmitting ? "Creating..." : "Create Order"}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}