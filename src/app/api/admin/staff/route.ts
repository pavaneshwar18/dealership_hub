import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import path from "node:path";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { getUploadsDir } from "@/lib/upload-utils";

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

  const formData = await request.formData();
  const name = formData.get("name") as string | null;
  const role = formData.get("role") as string | null;
  const branchId = formData.get("branchId") as string | null;
  const salaryVal = formData.get("salary");
  const salary = salaryVal !== null ? parseFloat(salaryVal.toString()) || 0 : 0;
  
  const email = formData.get("email") as string | null;
  const phone = formData.get("phone") as string | null;
  const address = formData.get("address") as string | null;
  const emergencyContact = formData.get("emergencyContact") as string | null;
  const dob = formData.get("dob") as string | null;

  if (!name || !role || !branchId) {
    return NextResponse.json(
      { error: "Name, role, and branchId are required" },
      { status: 400 },
    );
  }

  // Handle photo upload
  let photoPath: string | null = null;
  const photoFile = formData.get("photo") as File | null;
  if (photoFile && photoFile.size > 0) {
    if (photoFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Photo must be under 5 MB" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(photoFile.type)) {
      return NextResponse.json(
        { error: "Photo must be JPEG, PNG, or WebP" },
        { status: 400 },
      );
    }

    const ext = photoFile.type.split("/")[1] === "jpeg" ? "jpg" : photoFile.type.split("/")[1];
    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = path.join(getUploadsDir(), "staff");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await photoFile.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);
    photoPath = `staff/${filename}`;
  }

  try {
    const newStaff = await prisma.staff.create({
      data: {
        name: name.trim(),
        role: role.trim(),
        branchId,
        salary,
        email: email ? email.trim() : null,
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        emergencyContact: emergencyContact ? emergencyContact.trim() : null,
        dob: dob ? dob.trim() : null,
        photoPath,
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

  const formData = await request.formData();
  const id = formData.get("id") as string | null;
  const name = formData.get("name") as string | null;
  const role = formData.get("role") as string | null;
  const branchId = formData.get("branchId") as string | null;
  const activeVal = formData.get("active");
  const active = activeVal !== null ? activeVal === "true" : undefined;
  const salaryVal = formData.get("salary");
  const salary = salaryVal !== null ? parseFloat(salaryVal.toString()) || 0 : undefined;

  const email = formData.get("email") as string | null;
  const phone = formData.get("phone") as string | null;
  const address = formData.get("address") as string | null;
  const emergencyContact = formData.get("emergencyContact") as string | null;
  const dob = formData.get("dob") as string | null;

  if (!id || !name || !role || !branchId) {
    return NextResponse.json(
      { error: "Id, name, role, and branchId are required" },
      { status: 400 },
    );
  }

  const existing = await prisma.staff.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  // Handle photo upload / replacement
  let photoPath = existing.photoPath;
  const photoFile = formData.get("photo") as File | null;
  const keepOldPhoto = formData.get("keepOldPhoto") === "true";
  
  if (photoFile && photoFile.size > 0) {
    if (photoFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Photo must be under 5 MB" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(photoFile.type)) {
      return NextResponse.json(
        { error: "Photo must be JPEG, PNG, or WebP" },
        { status: 400 },
      );
    }

    // Delete old file if exists
    if (existing.photoPath) {
      try {
        await unlink(path.join(getUploadsDir(), existing.photoPath));
      } catch {
        // ignore
      }
    }

    const ext = photoFile.type.split("/")[1] === "jpeg" ? "jpg" : photoFile.type.split("/")[1];
    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = path.join(getUploadsDir(), "staff");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await photoFile.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);
    photoPath = `staff/${filename}`;
  } else if (!keepOldPhoto) {
    // If we're not keeping the old photo, delete it
    if (existing.photoPath) {
      try {
        await unlink(path.join(getUploadsDir(), existing.photoPath));
      } catch {
        // ignore
      }
    }
    photoPath = null;
  }

  try {
    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: {
        name: name.trim(),
        role: role.trim(),
        branchId,
        active,
        salary,
        email: email ? email.trim() : null,
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        emergencyContact: emergencyContact ? emergencyContact.trim() : null,
        dob: dob ? dob.trim() : null,
        photoPath,
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
    const existing = await prisma.staff.findUnique({ where: { id } });
    if (existing && existing.photoPath) {
      try {
        await unlink(path.join(getUploadsDir(), existing.photoPath));
      } catch {
        // ignore
      }
    }

    await prisma.staff.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting staff:", err);
    return NextResponse.json({ error: "Failed to delete staff" }, { status: 500 });
  }
}
