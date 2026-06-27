/**
 * LastMinute AI — Cloudflare Worker reverse proxy
 * --------------------------------------------------
 * Makes mayank.store serve the Cloud Run app for FREE (no Load Balancer).
 *
 * Cloud Run only accepts requests whose Host header is its own *.run.app
 * hostname, so a plain proxied DNS record fails with a 404. This Worker
 * rewrites the request to the run.app origin and forwards everything
 * (method, path, query, headers, body) unchanged.
 *
 * IMPORTANT: redirect "manual" — so the backend's OAuth 302 (login callback ->
 * dashboard) is passed straight back to the browser. Using "follow" here makes
 * the Worker follow the redirect server-side and silently breaks Google login.
 *
 * Deploy: paste into a Cloudflare Worker (free plan), then add the routes
 * mayank.store/* and www.mayank.store/* under the Worker's Triggers tab.
 *
 * ORIGIN can be either Cloud Run URL form (both point to the same service):
 *   lastminute-ai-ummt2blwla-el.a.run.app
 *   lastminute-ai-214061471378.asia-south1.run.app
 */

const ORIGIN = "lastminute-ai-ummt2blwla-el.a.run.app";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.hostname = ORIGIN;
    url.port = "";
    // Pass 3xx responses (e.g. the OAuth callback redirect) back to the browser.
    return fetch(new Request(url.toString(), request), { redirect: "manual" });
  },
};
