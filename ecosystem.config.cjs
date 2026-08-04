/**
 * Infomaniak / Jelastic (PM2): set APP_FILE to ecosystem.config.cjs
 * Next.js listens on process.env.PORT (Infomaniak injects this).
 */
module.exports = {
  apps: [
    {
      name: "retrosail",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
