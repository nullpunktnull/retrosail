# RetroSail

Team-Retros als Segelreise: Ziel auf der Insel, Wind / Anker / Felsen.

## Lokal

```bash
npm install
npx prisma migrate dev
npm run dev
```

## Features (einzeln korrigierbar)

1. **Zusammenfassung** — Ziel-Box → „Zusammenfassung“ (Markdown kopieren)  
   Dateien: `src/lib/course-summary.ts`, `src/components/CourseSummaryModal.tsx`
2. **Live-Aktualisierung** — Poll alle 4s solange Tab sichtbar  
   Datei: `src/hooks/useLiveSurvey.ts` (verdrahtet in `RetroSailApp.tsx`)
3. **Teilen-Link** — `/s/[id]` + „Link teilen“ in der Ziel-Box  
   Dateien: `src/app/s/[id]/`, `src/components/ShareLinkButton.tsx`
4. **Atmosphäre (A1–A6)** — Overlays über dem Fixbild (Wasserlinie ~60%)  
   Datei: `src/components/SceneAtmosphere.tsx` + CSS `.atm-*`  
   - **A1** Wind-Striche am Himmel  
   - **A2** Schimmer auf der Wasserlinie  
   - **A3** Lichtflecken unter Wasser  
   - **A4** Glitzerpunkte im Wasser  
   - **A5** Vögel am Himmel  
   - **A6** Sonnenblitz am Horizont (rechts)  
   Sag z.B. „A5 und A4 raus, A2 stärker“.
5. **Fokus-Modus** — Button „Fokus“ pro Zone  
   Datei: `src/components/FocusMode.tsx`

## Infomaniak / Server


Projektroot hochladen (ohne `node_modules` / `.next`), dann:

```bash
npm install
npm run build
npm start
```

Im Dashboard:
- Start: `npm start` (oder PM2 mit `APP_FILE=ecosystem.config.cjs`)
- `DATABASE_URL=file:./dev.db` (Pfad relativ zu `prisma/`)
- `NODE_ENV=production` — **nicht** `development` (sonst scheitert der Build)
- Port kommt von Infomaniak via `PORT`

`npm run build` setzt `NODE_ENV=production`, generiert Prisma und führt `migrate deploy` aus.
