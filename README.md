# RetroSail

Team-Retros als Segelreise: Ziel auf der Insel, Wind (Treiber), Anker (Bremsen) und Felsen (Blocker).

## Stack

- **Next.js 16** (App Router)
- **Prisma 6.19.3** + **SQLite** (bewusst ohne Prisma 7 / Driver-Adapter)
- React 19, Tailwind CSS 4

## Lokal

```bash
npm install
npx prisma migrate dev
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

SQLite: `prisma/dev.db` (`DATABASE_URL=file:./dev.db`).

**Wichtig:** `NODE_ENV` nie auf `development` in `.env` oder Server-Variablen setzen, sonst scheitert `next build` (Next.js-16-Bug bei `/_global-error`).

## Infomaniak (Node.js / Jelastic)

Im Manager / Dashboard der Node.js-Umgebung:

1. **Ausführungsordner** = Projektroot (dort wo `package.json` liegt), z.B. `./` bzw. `/home/jelastic/ROOT`
2. **Build-Befehl:** `npm run build`  
   (setzt intern `NODE_ENV=production`, generiert Prisma Client, führt `migrate deploy` aus)
3. **Start-Befehl** — eine der Varianten:
   - `npm start` (einfach, Process Manager = npm), oder
   - Process Manager = **PM2**, `APP_FILE` = `ecosystem.config.cjs`
4. **Umgebungsvariablen** in der UI setzen:
   - `DATABASE_URL=file:./dev.db` (oder absoluter Pfad unter dem Projekt, der persistent ist)
   - `NODE_ENV=production` (empfohlen)
   - **kein** `NODE_ENV=development`
5. Port: Next.js nutzt automatisch `PORT` von Infomaniak — nichts hartcodieren.
6. App im Dashboard **neu starten**, damit Build + Start greifen.

Nach einem Server-Reboot startet die Node.js-Umgebung die App über den hinterlegten Start-Befehl / PM2 von selbst — in der Konsole musst du dafür nichts dauerhaft laufen lassen.

### Einmalig nach Upload

```bash
npm install
npm run build
```

Danach reicht Neustart über das Dashboard.

## Nutzung

1. **Neue Umfrage** — Ziel bei der Insel. Ersteller-Token in `localStorage`; Ersteller kann alles in der Umfrage bearbeiten.
2. Ohne Login: Name + Kommentar bei Wind / Anker / Felsen. Eigene Einträge über denselben Browser-Token.
3. Header-Flyout: aktiv vs. archiviert (Drag & Drop), globale Suche.

Text: Emojis (☺-Picker) und `**fett**` (Button B).
