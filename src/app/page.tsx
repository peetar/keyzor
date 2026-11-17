import React from "react";
import { redirect } from "next/navigation";
import { listProjects } from "@/lib/services/lifecycle-service";
import { auth } from "@/auth";
import { KeyzorDashboard } from "@/components/keyzor-dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage(props: {
  searchParams?: Promise<{ project?: string; joined?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const projects = await listProjects(userId);

  const userEmail = session.user.email || "";
  const userName = session.user.name || "Architect";
  const creatorSlug = (session.user as any).username || (userEmail ? userEmail.split("@")[0] : "creator");

  return (
    <KeyzorDashboard
      mode="home"
      initialProjects={projects}
      initialSelectedProjectId={searchParams?.project}
      creatorSlug={creatorSlug}
      defaultApiKey=""
      userEmail={userEmail}
      userName={userName}
      currentUserId={userId}
    />
  );
}
