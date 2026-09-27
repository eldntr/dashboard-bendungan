import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminToken } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  if (isValidAdminToken(token)) {
    return NextResponse.json({ authenticated: true });
  }

  return NextResponse.json({ authenticated: false });
}
