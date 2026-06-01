import { NextRequest, NextResponse } from "next/server";
import { signInAdmin } from "@/lib/authConfig";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const result = await signInAdmin(username, password);

    return NextResponse.json({
      user: result,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }
}