import { NextResponse } from "next/server";
import {
  listApiKeys,
  createNewApiKey,
  revokeApiKey,
} from "@/lib/services/lifecycle-service";
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
  const safeKeys = keys.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    lastUsedAt: k.lastUsedAt,
    createdAt: k.createdAt,
  }));
  return NextResponse.json({ ok: true, keys: safeKeys });
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

export async function DELETE(req: Request) {
  try {
    const caller = await resolveCaller(req);
    if (!caller) {
      return NextResponse.json(
        { ok: false, error: "Authentication required. Please sign in or provide a valid Bearer API key." },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const keyId = url.searchParams.get("id") || body.id;

    if (!keyId) {
      return NextResponse.json(
        { ok: false, error: "Field 'id' is required to revoke an API key." },
        { status: 400 }
      );
    }

    const result = await revokeApiKey(keyId, caller.userId);
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 400 }
    );
  }
}
