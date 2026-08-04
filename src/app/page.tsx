import { RetroSailApp } from "@/components/RetroSailApp";
import { getLatestActiveSurvey, listSurveys } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [surveys, initialSurvey] = await Promise.all([
    listSurveys(),
    getLatestActiveSurvey(),
  ]);

  return (
    <RetroSailApp initialSurveys={surveys} initialSurvey={initialSurvey} />
  );
}
