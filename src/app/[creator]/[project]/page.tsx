import React from "react";
import { notFound, redirect } from "next/navigation";
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

  const userEmail = session.user.email || "";
  const userName = session.user.name || "Architect";

  return (
    <KeyzorDashboard
      mode="project"
      initialProjects={[projectData]}
      initialSelectedProjectId={projectData.id}
      creatorSlug={projectData.creatorSlug || creator}
      projectSlug={projectData.slug}
      defaultApiKey=""
      userEmail={userEmail}
      userName={userName}
      currentUserId={session.user.id}
    />
  );
}
