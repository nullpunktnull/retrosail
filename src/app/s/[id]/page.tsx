import { notFound } from "next/navigation";
import { RetroSailApp } from "@/components/RetroSailApp";
import { getSurvey, listSurveys } from "@/lib/actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

/** Feature 3 — Direkter Teilen-Link `/s/[id]`. */
export default async function SurveySharePage({ params }: Props) {
  const { id } = await params;
  const [surveys, survey] = await Promise.all([listSurveys(), getSurvey(id)]);
  if (!survey) notFound();

  return <RetroSailApp initialSurveys={surveys} initialSurvey={survey} />;
}
