import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById, updateUsername } from "@/lib/services/lifecycle-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        image: user.image,
      },
    },
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Field 'username' is required and must be a string." },
        { status: 400 }
      );
    }

    const result = await updateUsername(session.user.id, username);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      data: {
        username: result.username,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to update username." },
      { status: 500 }
    );
  }
}
