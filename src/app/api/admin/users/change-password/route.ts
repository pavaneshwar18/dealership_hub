import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  // 1. Authenticate admin session
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, newPassword } = body;

  // 3. Validate input parameters
  if (!userId || !newPassword) {
    return NextResponse.json(
      { error: "User ID and new password are required" },
      { status: 400 },
    );
  }

  if (typeof newPassword !== "string" || newPassword.trim().length < 6) {
    return NextResponse.json(
      { error: "New password must be at least 6 characters long" },
      { status: 400 },
    );
  }

  try {
    // 4. Verify user exists in the database
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 5. Hash new password and save to DB
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error updating user password:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
