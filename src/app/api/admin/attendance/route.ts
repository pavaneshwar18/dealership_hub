import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfDayIST, formatDateToISTString } from "@/lib/format";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const branchId = searchParams.get("branchId");

  if (!branchId) {
    return NextResponse.json({ error: "branchId is required" }, { status: 400 });
  }

  try {
    if (mode === "matrix") {
      const monthParam = searchParams.get("month"); // e.g. "2026-06"
      if (!monthParam) {
        return NextResponse.json({ error: "month parameter is required for matrix mode" }, { status: 400 });
      }

      const [yearStr, monthStr] = monthParam.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr); // 1-indexed

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return NextResponse.json({ error: "Invalid month format. Expected YYYY-MM" }, { status: 400 });
      }

      // Determine days of the month
      const numDays = new Date(year, month, 0).getDate();
      const days: string[] = [];
      for (let i = 1; i <= numDays; i++) {
        // Create date in local timezone YYYY-MM-DD
        const paddedMonth = String(month).padStart(2, "0");
        const paddedDay = String(i).padStart(2, "0");
        days.push(`${year}-${paddedMonth}-${paddedDay}`);
      }

      const startDate = startOfDayIST(new Date(year, month - 1, 1));
      const endDate = startOfDayIST(new Date(year, month - 1, numDays));

      // Fetch all staff members in this branch
      const staffMembers = await prisma.staff.findMany({
        where: { branchId },
        orderBy: { name: "asc" },
      });

      // Fetch all attendance for this branch in the selected month
      const attendance = await prisma.attendance.findMany({
        where: {
          staff: { branchId },
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Map attendance to quick lookup by staffId & date string
      const staffAttendanceMap = staffMembers.map((s) => {
        const records: Record<string, string> = {};
        
        // Populate records
        attendance
          .filter((att) => att.staffId === s.id)
          .forEach((att) => {
            // Match the YYYY-MM-DD date key in local/IST time
            const dateStr = formatDateToISTString(att.date);
            records[dateStr] = att.status;
          });

        return {
          id: s.id,
          name: s.name,
          role: s.role,
          salary: s.salary,
          active: s.active,
          records,
        };
      });

      return NextResponse.json({
        days,
        staff: staffAttendanceMap,
      });
    } else {
      // Default Mode: Daily Status List for a single date
      const dateParam = searchParams.get("date"); // YYYY-MM-DD
      if (!dateParam) {
        return NextResponse.json({ error: "date parameter is required" }, { status: 400 });
      }

      const targetDate = startOfDayIST(new Date(dateParam));

      // Fetch staff who were active or had attendance logged for this date
      const staffMembers = await prisma.staff.findMany({
        where: {
          branchId,
          OR: [
            { active: true },
            { attendance: { some: { date: targetDate } } },
          ],
        },
        include: {
          attendance: {
            where: { date: targetDate },
          },
        },
        orderBy: { name: "asc" },
      });

      const formattedAttendance = staffMembers.map((s) => {
        const record = s.attendance[0] || null;
        return {
          id: s.id,
          name: s.name,
          role: s.role,
          status: record ? record.status : null,
          notes: record ? (record.notes ?? "") : "",
        };
      });

      return NextResponse.json(formattedAttendance);
    }
  } catch (err) {
    console.error("Error generating admin attendance report:", err);
    return NextResponse.json({ error: "Failed to generate attendance report" }, { status: 500 });
  }
}
