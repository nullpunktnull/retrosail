import { RetroSailApp } from "@/components/RetroSailApp";
import { getLatestActiveSurvey, listSurveys } from "@/lib/actions";
import { readSiteSession } from "@/lib/site-session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await readSiteSession();
  const accessToken = session.accessToken ?? undefined;
  const space = session.space ?? "TEAM";

  const [surveys, initialSurvey] = await Promise.all([
    listSurveys({ space, accessToken }),
    getLatestActiveSurvey({ space, accessToken }),
  ]);

  return (
    <RetroSailApp
      initialSurveys={surveys}
      initialSurvey={initialSurvey}
      initialSpace={space}
      initialRole={session.role}
    />
  );
}
