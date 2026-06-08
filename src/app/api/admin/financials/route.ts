import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// GET: Fetch financials overview, stats, and unified ledger
export async function GET(request: Request) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);
    
    const branchId = searchParams.get("branchId"); // "ALL" or specific branch CUID
    const from = searchParams.get("from"); // YYYY-MM-DD
    const to = searchParams.get("to"); // YYYY-MM-DD

    const dateFilter: any = {};
    if (from) {
      dateFilter.gte = new Date(from + "T00:00:00.000Z");
    }
    if (to) {
      dateFilter.lte = new Date(to + "T23:59:59.999Z");
    }

    // 1. Query general dealership expenses
    const expenseWhere: any = {};
    if (Object.keys(dateFilter).length > 0) {
      expenseWhere.date = dateFilter;
    }
    if (branchId && branchId !== "ALL") {
      expenseWhere.branchId = branchId;
    }
    const generalExpenses = await prisma.dealershipExpense.findMany({
      where: expenseWhere,
      include: {
        branch: true,
        recordedBy: true,
      },
      orderBy: { date: "desc" },
    });

    // 2. Query daily reports (for sales and service revenue)
    const reportWhere: any = {};
    if (Object.keys(dateFilter).length > 0) {
      reportWhere.date = dateFilter;
    }
    if (branchId && branchId !== "ALL") {
      reportWhere.branchId = branchId;
    }
    const dailyReports = await prisma.dailyReport.findMany({
      where: reportWhere,
      include: { branch: true },
      orderBy: { date: "desc" },
    });

    // 3. Query cash sheets (for petty cash transactions)
    const sheetWhere: any = {
      status: "SUBMITTED",
    };
    if (Object.keys(dateFilter).length > 0) {
      sheetWhere.date = dateFilter;
    }
    if (branchId && branchId !== "ALL") {
      sheetWhere.branchId = branchId;
    }
    const cashSheets = await prisma.cashSheet.findMany({
      where: sheetWhere,
      include: {
        branch: true,
        transactions: true,
      },
      orderBy: { date: "desc" },
    });

    // 4. Query staff list for salary overhead calculation
    const staffWhere: any = { active: true };
    if (branchId && branchId !== "ALL") {
      staffWhere.branchId = branchId;
    }
    const activeStaff = await prisma.staff.findMany({
      where: staffWhere,
    });

    // Calculate aggregated totals
    let totalSalesRevenue = 0;
    let totalServiceRevenue = 0;
    let totalPettyCashIn = 0; // Debits in cash sheets
    let totalPettyCashOut = 0; // Credits in cash sheets
    let totalGeneralExpenses = 0;
    let estimatedStaffSalaries = 0;

    dailyReports.forEach((report) => {
      totalSalesRevenue += report.salesValue;
      totalServiceRevenue += report.serviceRevenue;
    });

    cashSheets.forEach((sheet) => {
      sheet.transactions.forEach((tx) => {
        if (tx.type === "DEBIT") {
          totalPettyCashIn += tx.amount;
        } else if (tx.type === "CREDIT") {
          totalPettyCashOut += tx.amount;
        }
      });
    });

    generalExpenses.forEach((exp) => {
      totalGeneralExpenses += exp.amount;
    });

    activeStaff.forEach((s) => {
      estimatedStaffSalaries += s.salary;
    });

    // Compile Unified Ledger (Tally Ledger)
    const ledgerItems: Array<{
      id: string;
      date: string;
      type: "inflow" | "outflow";
      source: string;
      description: string;
      amount: number;
      branchName: string;
    }> = [];

    // Add Sales & Service revenue from daily reports
    dailyReports.forEach((report) => {
      if (report.salesValue > 0) {
        ledgerItems.push({
          id: `report-sale-${report.id}`,
          date: report.date.toISOString(),
          type: "inflow",
          source: "sale",
          description: `Daily Sales Revenue (${report.vehiclesSold} sold)`,
          amount: report.salesValue,
          branchName: report.branch.name,
        });
      }
      if (report.serviceRevenue > 0) {
        ledgerItems.push({
          id: `report-service-${report.id}`,
          date: report.date.toISOString(),
          type: "inflow",
          source: "service",
          description: `Daily Service Revenue (${report.serviceJobs} jobs)`,
          amount: report.serviceRevenue,
          branchName: report.branch.name,
        });
      }
    });

    // Add branch cash sheets transactions
    cashSheets.forEach((sheet) => {
      sheet.transactions.forEach((tx) => {
        ledgerItems.push({
          id: `tx-${tx.id}`,
          date: sheet.date.toISOString(),
          type: tx.type === "DEBIT" ? "inflow" : "outflow",
          source: tx.type === "DEBIT" ? "petty_cash_in" : "petty_cash_out",
          description: `Petty Cash: ${tx.description}`,
          amount: tx.amount,
          branchName: sheet.branch.name,
        });
      });
    });

    // Add general dealership-wide expenses
    generalExpenses.forEach((exp) => {
      ledgerItems.push({
        id: `exp-${exp.id}`,
        date: exp.date.toISOString(),
        type: "outflow",
        source: "general_expense",
        description: `Expense [${exp.category}]: ${exp.title}${exp.description ? ` (${exp.description})` : ""}`,
        amount: exp.amount,
        branchName: exp.branch?.name || "Dealership HQ",
      });
    });

    // Sort ledger items chronologically (latest first or oldest first? In ledger, we usually sort by date desc for display, but running balance calculation needs asc. We'll send it desc)
    ledgerItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      generalExpenses,
      stats: {
        totalSalesRevenue,
        totalServiceRevenue,
        totalPettyCashIn,
        totalPettyCashOut,
        totalGeneralExpenses,
        estimatedStaffSalaries,
        totalInflow: totalSalesRevenue + totalServiceRevenue + totalPettyCashIn,
        totalOutflow: totalGeneralExpenses + totalPettyCashOut,
      },
      ledgerItems,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load financial records" },
      { status: 500 }
    );
  }
}

// POST: Add a new dealership expense
export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { date, title, description, amount, category, branchId, staffId } = body;

    if (!date || !title || !amount || !category) {
      return NextResponse.json(
        { error: "Date, title, amount, and category are required." },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number." },
        { status: 400 }
      );
    }

    const expense = await prisma.dealershipExpense.create({
      data: {
        date: new Date(date),
        title,
        description: description || null,
        amount: parsedAmount,
        category,
        recordedById: session.id,
        branchId: branchId && branchId !== "ALL" ? branchId : null,
        staffId: staffId && staffId !== "" ? staffId : null,
      },
    });

    return NextResponse.json(expense);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save financial record" },
      { status: 500 }
    );
  }
}
