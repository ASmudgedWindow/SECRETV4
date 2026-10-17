// SecretV4 settings you can edit WITHOUT rebuilding the site.
// Leave a value empty ("") to hide or turn off that feature.
window.SECRETV4_SITE = {
  // Where the "Report" button in the game player sends people.
  // Use a Google Form link (https://forms.gle/...) or an email like "mailto:you@example.com"
  reportUrl: "https://forms.gle/Y44WG7Rqkao6Knou7",

  // Address of your play counter (the Cloudflare Worker), for the site-wide top 10.
  // Looks like "https://secretv4-stats.yourname.workers.dev" (no slash at the end).
  statsUrl: "https://secretv4-stats.micahrbrubaker.workers.dev",

  // Other addresses of your site, shown in Stuff > About in case one gets blocked.
  // Example: { name: "Backup site", url: "https://yourname.pages.dev/" },
  mirrors: [
  ],
};
