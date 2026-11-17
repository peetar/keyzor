import React from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProjectByCreatorAndSlug } from "@/lib/services/lifecycle-service";
import { KeyzorDashboard } from "@/components/keyzor-dashboard";

export const dynamic = "force-dynamic";

interface FeaturePageProps {
  params: Promise<{
    creator: string;
    project: string;
    feature: string;
  }>;
}

export default async function FeaturePage(props: FeaturePageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { creator, project: projectSlug, feature: rawFeatureSlug } =
    await props.params;

  const featureSlug = decodeURIComponent(rawFeatureSlug);

  const projectData = await getProjectByCreatorAndSlug(
    creator,
    projectSlug,
    session.user.id
  );

  if (!projectData) {
    notFound();
  }

  const foundFeature = projectData.features.find(
    (f) =>
      f.slug.toLowerCase() === featureSlug.toLowerCase() ||
      f.id === featureSlug
  );

  if (!foundFeature) {
    notFound();
  }

  const userEmail = session.user.email || "";
  const userName = session.user.name || "Architect";

  return (
    <KeyzorDashboard
      mode="feature"
      initialProjects={[projectData]}
      initialSelectedProjectId={projectData.id}
      focusedFeatureId={foundFeature.id}
      creatorSlug={projectData.creatorSlug || creator}
      projectSlug={projectData.slug}
      defaultApiKey=""
      userEmail={userEmail}
      userName={userName}
      currentUserId={session.user.id}
    />
  );
}
