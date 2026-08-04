"use client";

/**
 * Must stay free of layout providers / shared context.
 * Next prerenders this route during production builds.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f3f7f4",
          color: "#1a2a32",
        }}
      >
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Etwas ist schiefgelaufen</h1>
          <p style={{ opacity: 0.7, marginBottom: 16 }}>
            RetroSail konnte die Seite nicht laden.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: 0,
              borderRadius: 8,
              padding: "10px 16px",
              background: "#2f6f7e",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Erneut versuchen
          </button>
        </main>
      </body>
    </html>
  );
}
