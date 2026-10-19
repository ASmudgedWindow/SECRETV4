// SecretV4 settings you can edit WITHOUT rebuilding the site.
// Leave a value empty ("") to hide or turn off that feature.
window.SECRETV4_SITE = {
  // Where the "Report" button in the game player sends people.
  // Use a Google Form link (https://forms.gle/...) or an email like "mailto:you@example.com"
  reportUrl: "",

  // Address of your play counter (the Cloudflare Worker), for the site-wide top 10, ratings
  // and the owner dashboard. Looks like "https://secretv4-stats.yourname.workers.dev" (no slash at the end).
  statsUrl: "",

  // Other addresses of your site, shown in Stuff > About in case one gets blocked.
  // Example: { name: "Backup site", url: "https://yourname.pages.dev/" },
  mirrors: [
  ],

  // Owner dashboard: set to false to stop browsers checking in (saves Cloudflare requests).
  ownerTools: true,

  // How often (in seconds) an open tab checks in for the dashboard. Minimum 15.
  pulseSeconds: 30,
};
