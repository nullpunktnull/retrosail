# RetroSail

Team-Retros als Segelreise: Ziel auf der Insel, Wind (Treiber), Anker (Bremsen) und Felsen (Blocker).

## Stack

- **Next.js 16** (App Router)
- **Prisma 6.19.3** + **SQLite** (bewusst ohne Prisma 7 / Driver-Adapter)
- React 19, Tailwind CSS 4

## Setup

```bash
npm install
npx prisma migrate dev
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

Die SQLite-Datei liegt unter `prisma/dev.db` (`DATABASE_URL=file:./dev.db`).

## Nutzung

1. **Neue Umfrage** — klares Ziel definieren (erscheint bei der Insel). Der Ersteller-Token wird in `localStorage` gespeichert; der Ersteller kann alles in der Umfrage bearbeiten.
2. Jeder kann ohne Login Name + Kommentar bei Wind / Anker / Felsen erfassen. Eigene Einträge sind über denselben Browser-Token editierbar.
3. Im Header-Flyout: aktive vs. archivierte Umfragen per Drag & Drop, plus globale Suche.

Text-Format: Emojis und `**fett**` (Button „B“ im Formular).
