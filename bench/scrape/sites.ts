// Real, reachable design-relevant sites (checked at authoring time). CORPUS
// sites feed the shipped app's inspiration deck; HOLDOUT sites are kept out
// of src/ entirely and are only ever read by the hidden eval (bench/eval) —
// the generator is scored against designs it was never tuned on.
export const CORPUS_SITES: string[] = [
  "https://stripe.com",
  "https://linear.app",
  "https://vercel.com",
  "https://www.apple.com",
  "https://www.airbnb.com",
  "https://mailchimp.com",
  "https://www.notion.so",
  "https://www.figma.com",
  "https://www.spotify.com",
  "https://asana.com",
  "https://www.dropbox.com",
  "https://slack.com",
  "https://www.framer.com",
  "https://webflow.com",
  "https://css-tricks.com",
  "https://www.awwwards.com",
  "https://onepagelove.com",
  "https://minimal.gallery",
  "https://httpster.net",
  "https://saaslandingpage.com",
];

export const HOLDOUT_SITES: string[] = [
  "https://www.shopify.com",
  "https://www.squarespace.com",
  "https://www.mongodb.com",
  "https://www.cloudflare.com",
  "https://www.netlify.com",
  "https://supabase.com",
  "https://planetscale.com",
  "https://www.raycast.com",
  "https://superhuman.com",
  "https://arc.net",
];
