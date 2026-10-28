import { NextResponse } from "next/server";
import { listApiKeys, createNewApiKey } from "@/lib/services/lifecycle-service";
import { resolveCaller } from "@/lib/api/auth-helper";

export async function GET(req: Request) {
  const caller = await resolveCaller(req);
  if (!caller) {
    return NextResponse.json(
      { ok: false, error: "Authentication required. Please sign in or provide a valid Bearer API key." },
      { status: 401 }
    );
  }

  const keys = await listApiKeys(caller.userId);
  return NextResponse.json({ ok: true, keys });
}

export async function POST(req: Request) {
  try {
    const caller = await resolveCaller(req);
    if (!caller) {
      return NextResponse.json(
        { ok: false, error: "Authentication required. Please sign in or provide a valid Bearer API key." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const created = await createNewApiKey(
      body.name || "Coding Agent Skill Key",
      caller.userId
    );
    return NextResponse.json({ ok: true, key: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 400 }
    );
  }
}
