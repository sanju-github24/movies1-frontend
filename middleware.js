// Serve crawlers fully-rendered HTML.
//
// The site is a client-rendered SPA: index.html ships an empty <div id="root">,
// so a crawler that doesn't run JS sees a page with zero body text. Google does
// execute JS, but on a queue that can take hours or days — which is useless for
// a live scorecard, where the whole point is being findable while the match is
// on. prerender-node is configured on the API server, but pages are served from
// here, so it never ran on anything Google actually fetches.
//
// Bots get HTML rendered by prerender.io; humans are untouched and still get the
// SPA. Scoped by `matcher` to the sections we publish for search — sports, match
// centre, blogs and music.

export const config = {
  // Only these paths, and never static assets (anything with a file extension).
  matcher: ['/sports/:path*', '/match-center/:path*', '/blogs/:path*', '/music/:path*'],
};

// Search engines plus the link-preview fetchers (WhatsApp/Twitter/etc.), which
// also don't run JS and otherwise show a blank card.
const BOT_UA = /googlebot|bingbot|yandex(bot)?|duckduckbot|slurp|baiduspider|applebot|petalbot|twitterbot|facebookexternalhit|linkedinbot|whatsapp|telegrambot|discordbot|slackbot|embedly|quora link preview|redditbot|pinterest/i;

export default async function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!BOT_UA.test(ua)) return; // Fall through to the normal SPA response.

  const token = process.env.PRERENDER_TOKEN;
  if (!token) return; // Not configured — better to serve the SPA than to fail.

  const url = new URL(request.url);
  const target = `https://service.prerender.io/${url.origin}${url.pathname}${url.search}`;

  try {
    const res = await fetch(target, {
      headers: { 'X-Prerender-Token': token, 'User-Agent': ua },
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
