import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfDayIST } from "@/lib/format";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "BRANCH_MANAGER" || !session.branchId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  if (!dateParam) {
    return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
  }

  const targetDate = startOfDayIST(new Date(dateParam));

  try {
    // Fetch all active staff or staff who have attendance recorded for this date (for history)
    const staffMembers = await prisma.staff.findMany({
      where: {
        branchId: session.branchId,
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

    const formattedStaff = staffMembers.map((s) => {
      const attRecord = s.attendance[0] || null;
      return {
        id: s.id,
        name: s.name,
        role: s.role,
        active: s.active,
        status: attRecord ? attRecord.status : null,
        notes: attRecord ? (attRecord.notes ?? "") : "",
      };
    });

    return NextResponse.json(formattedStaff);
  } catch (err) {
    console.error("Error fetching branch attendance:", err);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "BRANCH_MANAGER" || !session.branchId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { date, attendance } = body;

  if (!date || !Array.isArray(attendance)) {
    return NextResponse.json(
      { error: "Date and attendance array are required" },
      { status: 400 },
    );
  }

  const targetDate = startOfDayIST(new Date(date));

  try {
    // Perform bulk upsert of attendance records
    await prisma.$transaction(
      attendance.map((att: { staffId: string; status: string; notes?: string }) =>
        prisma.attendance.upsert({
          where: {
            staffId_date: {
              staffId: att.staffId,
              date: targetDate,
            },
          },
          update: {
            status: att.status,
            notes: att.notes || null,
          },
          create: {
            date: targetDate,
            status: att.status,
            notes: att.notes || null,
            staffId: att.staffId,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error saving branch attendance:", err);
    return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 });
  }
}
