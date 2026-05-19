"use server";

import { connectDB } from "@/lib/db";
import Patient from "@/modules/patients/models/Patient";
import Appointment from "@/modules/appointments/models/Appointment";
import Invoice from "@/modules/billing/models/Invoice";
import Prescription from "@/modules/prescriptions/models/Prescription";
import LabOrder from "@/modules/lab/models/LabOrder";
import RadiologyOrder from "@/modules/radiology/models/RadiologyOrder";
import { auth } from "@/auth";
import mongoose from "mongoose";

// ── Helpers ────────────────────────────────────────────────────────────────

function getLast12Months() {
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleString("en-IN", { month: "short", year: "2-digit" }),
    });
  }
  return months;
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().split("T")[0],
      label: d.toLocaleString("en-IN", { weekday: "short" }),
    });
  }
  return days;
}

// ── Main analytics fetch ───────────────────────────────────────────────────

export async function getAnalyticsData() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();
  const tid = new mongoose.Types.ObjectId(session.user.tenantId);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  try {
    const [
      // Overview KPIs
      totalPatients,
      newPatientsThisMonth,
      newPatientsLastMonth,
      totalAppointmentsThisMonth,
      totalAppointmentsLastMonth,
      completedAppointmentsThisMonth,
      revenueThisMonth,
      revenueLastMonth,
      pendingAmount,

      // Charts
      patientsByMonth,
      appointmentsByMonth,
      revenueByMonth,
      appointmentsByStatus,
      appointmentsByType,
      labOrdersByStatus,
      radiologyOrdersByStatus,

      // Top diagnoses
      topDiagnoses,

      // Weekly activity
      appointmentsLast7Days,
      patientsLast7Days,
    ] = await Promise.all([
      // KPIs
      Patient.countDocuments({ tenantId: tid, isActive: true }),

      Patient.countDocuments({
        tenantId: tid,
        createdAt: { $gte: startOfMonth },
      }),

      Patient.countDocuments({
        tenantId: tid,
        createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      }),

      Appointment.countDocuments({
        tenantId: tid,
        date: { $gte: startOfMonth },
        status: { $nin: ["cancelled", "no_show"] },
      }),

      Appointment.countDocuments({
        tenantId: tid,
        date: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        status: { $nin: ["cancelled", "no_show"] },
      }),

      Appointment.countDocuments({
        tenantId: tid,
        date: { $gte: startOfMonth },
        status: "completed",
      }),

      Invoice.aggregate([
        {
          $match: {
            tenantId: tid,
            createdAt: { $gte: startOfMonth },
            paymentStatus: { $ne: "cancelled" },
          },
        },
        { $group: { _id: null, total: { $sum: "$paidAmount" } } },
      ]),

      Invoice.aggregate([
        {
          $match: {
            tenantId: tid,
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
            paymentStatus: { $ne: "cancelled" },
          },
        },
        { $group: { _id: null, total: { $sum: "$paidAmount" } } },
      ]),

      Invoice.aggregate([
        {
          $match: {
            tenantId: tid,
            paymentStatus: { $in: ["pending", "partial"] },
          },
        },
        { $group: { _id: null, total: { $sum: "$balanceAmount" } } },
      ]),

      // Patients by month (last 12)
      Patient.aggregate([
        {
          $match: {
            tenantId: tid,
            createdAt: { $gte: startOfYear },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
      ]),

      // Appointments by month (last 12)
      Appointment.aggregate([
        {
          $match: {
            tenantId: tid,
            date: { $gte: startOfYear },
            status: { $nin: ["cancelled", "no_show"] },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" },
            },
            count: { $sum: 1 },
          },
        },
      ]),

      // Revenue by month (last 12)
      Invoice.aggregate([
        {
          $match: {
            tenantId: tid,
            createdAt: { $gte: startOfYear },
            paymentStatus: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            revenue: { $sum: "$paidAmount" },
          },
        },
      ]),

      // Appointments by status
      Appointment.aggregate([
        { $match: { tenantId: tid } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Appointments by type
      Appointment.aggregate([
        { $match: { tenantId: tid } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),

      // Lab orders by status
      LabOrder.aggregate([
        { $match: { tenantId: tid } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Radiology orders by status
      RadiologyOrder.aggregate([
        { $match: { tenantId: tid } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Top diagnoses from prescriptions
      Prescription.aggregate([
        { $match: { tenantId: tid } },
        { $group: { _id: "$diagnosis", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),

      // Appointments last 7 days
      Appointment.aggregate([
        {
          $match: {
            tenantId: tid,
            date: {
              $gte: new Date(new Date().setDate(new Date().getDate() - 6)),
            },
            status: { $nin: ["cancelled", "no_show"] },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$date" },
            },
            count: { $sum: 1 },
          },
        },
      ]),

      // New patients last 7 days
      Patient.aggregate([
        {
          $match: {
            tenantId: tid,
            createdAt: {
              $gte: new Date(new Date().setDate(new Date().getDate() - 6)),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // ── Format chart data ──────────────────────────────────────────────────

    const months = getLast12Months();

    const patientChartData = months.map((m) => {
      const found = patientsByMonth.find(
        (p: { _id: { year: number; month: number }; count: number }) =>
          p._id.year === m.year && p._id.month === m.month
      );
      return { label: m.label, value: found?.count ?? 0 };
    });

    const appointmentChartData = months.map((m) => {
      const found = appointmentsByMonth.find(
        (p: { _id: { year: number; month: number }; count: number }) =>
          p._id.year === m.year && p._id.month === m.month
      );
      return { label: m.label, value: found?.count ?? 0 };
    });

    const revenueChartData = months.map((m) => {
      const found = revenueByMonth.find(
        (p: { _id: { year: number; month: number }; revenue: number }) =>
          p._id.year === m.year && p._id.month === m.month
      );
      return { label: m.label, value: found?.revenue ?? 0 };
    });

    const days = getLast7Days();

    const weeklyAppointments = days.map((d) => {
      const found = appointmentsLast7Days.find(
        (a: { _id: string; count: number }) => a._id === d.date
      );
      return { label: d.label, value: found?.count ?? 0 };
    });

    const weeklyPatients = days.map((d) => {
      const found = patientsLast7Days.find(
        (p: { _id: string; count: number }) => p._id === d.date
      );
      return { label: d.label, value: found?.count ?? 0 };
    });

    // Completion rate
    const completionRate =
      totalAppointmentsThisMonth > 0
        ? Math.round(
            (completedAppointmentsThisMonth / totalAppointmentsThisMonth) * 100
          )
        : 0;

    // MoM changes
    const patientGrowth =
      newPatientsLastMonth > 0
        ? Math.round(
            ((newPatientsThisMonth - newPatientsLastMonth) /
              newPatientsLastMonth) *
              100
          )
        : 0;

    const revenueGrowth =
      (revenueLastMonth[0]?.total ?? 0) > 0
        ? Math.round(
            (((revenueThisMonth[0]?.total ?? 0) -
              (revenueLastMonth[0]?.total ?? 0)) /
              (revenueLastMonth[0]?.total ?? 0)) *
              100
          )
        : 0;

    const appointmentGrowth =
      totalAppointmentsLastMonth > 0
        ? Math.round(
            ((totalAppointmentsThisMonth - totalAppointmentsLastMonth) /
              totalAppointmentsLastMonth) *
              100
          )
        : 0;

    return {
      success: true,
      data: {
        kpis: {
          totalPatients,
          newPatientsThisMonth,
          patientGrowth,
          totalAppointmentsThisMonth,
          appointmentGrowth,
          completionRate,
          revenueThisMonth: revenueThisMonth[0]?.total ?? 0,
          revenueGrowth,
          pendingAmount: pendingAmount[0]?.total ?? 0,
        },
        charts: {
          patientChartData,
          appointmentChartData,
          revenueChartData,
          weeklyAppointments,
          weeklyPatients,
          appointmentsByStatus: appointmentsByStatus.map(
            (s: { _id: string; count: number }) => ({
              label: s._id.replace("_", " "),
              value: s.count,
            })
          ),
          appointmentsByType: appointmentsByType.map(
            (s: { _id: string; count: number }) => ({
              label: s._id.replace("_", " "),
              value: s.count,
            })
          ),
          labOrdersByStatus: labOrdersByStatus.map(
            (s: { _id: string; count: number }) => ({
              label: s._id.replace("_", " "),
              value: s.count,
            })
          ),
          radiologyOrdersByStatus: radiologyOrdersByStatus.map(
            (s: { _id: string; count: number }) => ({
              label: s._id.replace("_", " "),
              value: s.count,
            })
          ),
          topDiagnoses: topDiagnoses.map(
            (d: { _id: string; count: number }) => ({
              label: d._id,
              value: d.count,
            })
          ),
        },
      },
    };
  } catch (error) {
    console.error("[getAnalyticsData]", error);
    return { success: false, error: "Failed to fetch analytics" };
  }
}
