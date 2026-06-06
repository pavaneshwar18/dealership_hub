import { NextResponse } from "next/server";
import { loginWithCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "");
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await loginWithCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  return NextResponse.json({
    role: user.role,
    redirectTo: user.role === "ADMIN" ? "/admin" : "/dashboard",
  });
}
