// Serve crawlers fully-rendered HTML.
//
// The site is a client-rendered SPA: index.html ships an empty <div id="root">,
// so a crawler that doesn't run JS sees a page with zero body text. Google does
// execute JS, but on a queue that can take hours or days — which is useless for
// a live scorecard, where the whole point is being findable while the match is
// on. prerender-node is configured on the API server, but pages are served from
// here, so it never ran on anything Google actually fetches.
//
// Bots get HTML rendered by our own /api/render — the API host already runs a
// Chromium, so this does prerender.io's job without the subscription. Humans are
// untouched and still get the SPA. Scoped by `matcher` to the sections we
// publish for search — sports, match centre, blogs and music.

export const config = {
  // Only these paths, and never static assets (anything with a file extension).
  matcher: [
    '/sports/:path*',
    '/match/:path*',        // the slug URLs the sitemap lists — the ones that must render
    '/match-center/:path*', // legacy hash links
    '/blogs/:path*',
    '/music/:path*',
  ],
};

// Search engines plus the link-preview fetchers (WhatsApp/Twitter/etc.), which
// also don't run JS and otherwise show a blank card.
const BOT_UA = /googlebot|bingbot|yandex(bot)?|duckduckbot|slurp|baiduspider|applebot|petalbot|twitterbot|facebookexternalhit|linkedinbot|whatsapp|telegrambot|discordbot|slackbot|embedly|quora link preview|redditbot|pinterest/i;

// Where the self-hosted renderer lives. Same host as the rest of the API.
const RENDER_ORIGIN = process.env.VITE_BACKEND_URL || 'https://movies1-backend.onrender.com';

export default async function middleware(request) {
  const ua = request.headers.get('user-agent') || '';

  // Probe: ?__mw=1 answers from the middleware itself, so we can tell "not
  // running" apart from "running and falling through" — they look identical from
  // outside otherwise.
  if (new URL(request.url).searchParams.get('__mw') === '1') {
    return new Response(
      JSON.stringify({ middleware: 'alive', botDetected: BOT_UA.test(ua), ua: ua.slice(0, 60) }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!BOT_UA.test(ua)) return; // Fall through to the normal SPA response.

  const url = new URL(request.url);
  const page = `${url.origin}${url.pathname}${url.search}`;
  const target = `${RENDER_ORIGIN}/api/render?url=${encodeURIComponent(page)}`;

  try {
    // The renderer sheds load with a 503 when it's already busy, and cold-starts
    // a browser on the first hit, so give it room before giving up.
    const res = await fetch(target, {
      headers: { 'User-Agent': ua },
      signal: AbortSignal.timeout(30000),
    });
    // Anything other than a clean render: fall through rather than hand a bot an
    // error page, which is worse for indexing than the shell.
    if (!res.ok) return;

    return new Response(await res.text(), {
      status: res.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Let the CDN keep a rendered copy briefly so repeat crawls are cheap,
        // but stay short: live scores go stale in minutes.
        'Cache-Control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600',
        'X-Prerendered': '1',
      },
    });
  } catch (_) {
    return; // Prerender unreachable — serve the SPA.
  }
}
