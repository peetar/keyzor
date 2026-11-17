import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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
  const creatorSlug = userUsername || (userEmail ? userEmail.split("@")[0] : "creator");

  return (
    <KeyzorDashboard
      mode="home"
      initialProjects={projects}
      initialSelectedProjectId={searchParams?.project}
      creatorSlug={creatorSlug}
      userUsername={userUsername}
      defaultApiKey=""
      userEmail={userEmail}
      userName={userName}
      currentUserId={userId}
      initialSortBy={initialSortBy}
      initialSortOrder={initialSortOrder}
    />
  );
}
