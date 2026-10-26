import React from "react";
import { listProjects } from "@/lib/services/lifecycle-service";
import { DEMO_API_KEY } from "@/db";
import { auth } from "@/auth";
import { KazorDashboard } from "@/components/kazor-dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const projects = await listProjects();

  const userEmail = session?.user?.email || "architect@kazor.app";
  const userName = session?.user?.name || "Lead Architect (CPO / Dev)";

  return (
    <KazorDashboard
      initialProjects={projects}
      defaultApiKey={DEMO_API_KEY}
      userEmail={userEmail}
      userName={userName}
    />
  );
}
