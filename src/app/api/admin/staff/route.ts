import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId");

  try {
    const staff = await prisma.staff.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        branch: true,
      },
      orderBy: [
        { branch: { name: "asc" } },
        { name: "asc" },
      ],
    });

    return NextResponse.json(staff);
  } catch (err) {
    console.error("Error fetching staff:", err);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, role, branchId, salary } = body;

  if (!name || !role || !branchId) {
    return NextResponse.json(
      { error: "Name, role, and branchId are required" },
      { status: 400 },
    );
  }

  try {
    const newStaff = await prisma.staff.create({
      data: {
        name: name.trim(),
        role: role.trim(),
        branchId,
        salary: salary !== undefined ? (typeof salary === "number" ? salary : parseFloat(salary) || 0) : 0,
      },
    });

    return NextResponse.json(newStaff);
  } catch (err) {
    console.error("Error creating staff:", err);
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, name, role, branchId, active, salary } = body;

  if (!id || !name || !role || !branchId) {
    return NextResponse.json(
      { error: "Id, name, role, and branchId are required" },
      { status: 400 },
    );
  }

  try {
    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: {
        name: name.trim(),
        role: role.trim(),
        branchId,
        active: typeof active === "boolean" ? active : undefined,
        salary: salary !== undefined ? (typeof salary === "number" ? salary : parseFloat(salary) || 0) : undefined,
      },
    });

    return NextResponse.json(updatedStaff);
  } catch (err) {
    console.error("Error updating staff:", err);
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Id is required" }, { status: 400 });
  }

  try {
    await prisma.staff.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting staff:", err);
    return NextResponse.json({ error: "Failed to delete staff" }, { status: 500 });
  }
}
