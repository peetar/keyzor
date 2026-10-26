import React from "react";
import { listProjects } from "@/lib/services/lifecycle-service";
import { auth } from "@/auth";
import { KeyzorDashboard } from "@/components/keyzor-dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const projects = await listProjects();

  const userEmail = session?.user?.email || "architect@keyzor.vercel.app";
  const userName = session?.user?.name || "Lead Architect (CPO / Dev)";

  return (
    <KeyzorDashboard
      initialProjects={projects}
      defaultApiKey=""
      userEmail={userEmail}
      userName={userName}
    />
  );
}
