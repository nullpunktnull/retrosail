import { notFound } from "next/navigation";
import { RetroSailApp } from "@/components/RetroSailApp";
import { getSurvey, listSurveys } from "@/lib/actions";
import { readSiteSession } from "@/lib/site-session";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

/** Feature 3 — Direkter Teilen-Link `/s/[id]`. */
export default async function SurveySharePage({ params }: Props) {
  const { id } = await params;
  const session = await readSiteSession();
  const accessToken = session.accessToken ?? undefined;
  const space = session.space ?? "TEAM";

  const [surveys, survey] = await Promise.all([
    listSurveys({ space, accessToken }),
    getSurvey(id, accessToken),
  ]);
  if (!survey) notFound();

  // Staff opening a survey from the other space: list that space
  const listSpace = survey.space;
  const list =
    listSpace === space
      ? surveys
      : await listSurveys({ space: listSpace, accessToken });

  return (
    <RetroSailApp
      initialSurveys={list}
      initialSurvey={survey}
      initialSpace={listSpace}
      initialRole={session.role}
    />
  );
}
