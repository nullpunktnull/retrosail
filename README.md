# RetroSail

Team-Retros als Segelreise: Ziel auf der Insel, Wind / Anker / Felsen.

## Lokal

```bash
npm install
npx prisma migrate dev
npm run dev
```

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
