import { NextResponse } from "next/server";
import { verifyAdminPassword, getAdminToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Password wajib diisi" },
        { status: 400 }
      );
    }

    if (!verifyAdminPassword(password)) {
      return NextResponse.json(
        { success: false, error: "Password salah. Silakan coba lagi." },
        { status: 401 }
      );
    }

    const token = getAdminToken();
    const response = NextResponse.json({ success: true, message: "Berhasil masuk" });

    // Set HTTP-only cookie
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
