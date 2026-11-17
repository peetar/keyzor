import React from "react";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getProjectByCreatorAndSlug } from "@/lib/services/lifecycle-service";
import { KeyzorDashboard } from "@/components/keyzor-dashboard";

export const dynamic = "force-dynamic";

interface ProjectPageProps {
  params: Promise<{
    creator: string;
    project: string;
  }>;
}

export default async function ProjectPage(props: ProjectPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { creator, project: projectSlug } = await props.params;

  const projectData = await getProjectByCreatorAndSlug(
    creator,
    projectSlug,
    session.user.id
  );

  if (!projectData) {
    notFound();
  }

  const cookieStore = await cookies();
  const sortPref = cookieStore.get("keyzor_table_sort")?.value || "";
  let initialSortBy: any = "incomplete_first";
  let initialSortOrder: "asc" | "desc" = "desc";
  if (sortPref) {
    const parts = decodeURIComponent(sortPref).split(":");
    if (["incomplete_first", "stage", "updated_at", "created_at", "title", "owner", "timeline"].includes(parts[0])) {
      initialSortBy = parts[0];
    }
    if (parts[1] === "asc" || parts[1] === "desc") {
      initialSortOrder = parts[1];
    }
  }

  const userEmail = session.user.email || "";
  const userName = session.user.name || "Architect";
  const userUsername = (session.user as any).username || "";

  return (
    <KeyzorDashboard
      mode="project"
      initialProjects={[projectData]}
      initialSelectedProjectId={projectData.id}
      creatorSlug={projectData.creatorSlug || creator}
      projectSlug={projectData.slug}
      userUsername={userUsername}
      defaultApiKey=""
      userEmail={userEmail}
      userName={userName}
      currentUserId={session.user.id}
      initialSortBy={initialSortBy}
      initialSortOrder={initialSortOrder}
    />
  );
}
