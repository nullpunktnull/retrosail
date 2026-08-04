export default function SurveyNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--foam)] px-6 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        Umfrage nicht gefunden
      </h1>
      <p className="text-sm text-[var(--ink-muted)]">
        Der Link ist ungültig oder die Umfrage wurde gelöscht.
      </p>
      <a
        href="/"
        className="mt-2 rounded-md bg-[var(--sea)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--sea-deep)]"
      >
        Zur Übersicht
      </a>
    </div>
  );
}
