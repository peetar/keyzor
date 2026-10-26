import { NextResponse } from "next/server";
import { listApiKeys, createNewApiKey } from "@/lib/services/lifecycle-service";

export async function GET() {
  const keys = await listApiKeys();
  return NextResponse.json({ ok: true, keys });
}

export async function POST(req: Request) {
  const body = await req.json();
  const created = await createNewApiKey(body.name || "Coding Agent Skill Key");
  return NextResponse.json({ ok: true, key: created }, { status: 201 });
}
