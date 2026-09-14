import React, { useEffect, useState } from "react";
import { Radio, Clock3, ExternalLink, AlertCircle } from "lucide-react";
import { fetchTabFeed, parseTabUrl, tabItemUrl, posterFor, startLabel } from "../utils/liveTabs";
import { LANDSCAPE_GRID } from "../utils/posterGrid";

/* Fixtures behind the player's tabs, on the live page.
 *
 * The admin saves a tab URL (see the Tab links form in the live-channels
 * admin); this reads the same feed the player reads and lists what is on now
 * and what is next. Nothing is stored about the fixtures themselves — they
 * change hourly, and a copy would be wrong by the time anyone looked. */

const Card = ({ item, href, live, fallbackPoster }) => {
  const poster = posterFor(item, fallbackPoster);
  const when = startLabel(item);

  /* Upcoming rows have no URL because they are not signed yet. Rendering them
     as links would promise something that can only fail, so they are plain. */
  const Tag = href ? "a" : "div";
  const linkProps = href
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Tag
      {...linkProps}
      className={`group relative block overflow-hidden rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06]
                  ${href ? "hover:ring-white/20 transition-shadow" : "cursor-default"}`}
    >
      <div className="relative aspect-video bg-black/40">
        {poster ? (
          <img
            src={poster}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : null}

        <span
          className={`absolute top-2 left-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5
                      text-[10px] font-black uppercase tracking-widest
                      ${live ? "bg-red-600 text-white" : "bg-black/70 text-gray-200 ring-1 ring-white/15"}`}
        >
          {live ? <Radio className="w-3 h-3" aria-hidden="true" />
                : <Clock3 className="w-3 h-3" aria-hidden="true" />}
          {live ? "Live" : "Upcoming"}
        </span>

        {href && (
          <span className="absolute inset-0 hidden items-center justify-center bg-black/45 group-hover:flex">
            <ExternalLink className="w-6 h-6 text-white" aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="p-3">
        <p className="text-sm font-bold leading-snug line-clamp-2">{item.name}</p>
        <p className="mt-1 text-[11px] text-gray-500 line-clamp-1">
          {[item.event, item.category, item.lang, !live && when].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Tag>
  );
};

const Section = ({ row }) => {
  const parsed = parseTabUrl(row.bundle_url);
  const [state, setState] = useState({ loading: true, live: [], upcoming: [], error: null });

  useEffect(() => {
    if (!parsed) return;
    let alive = true;
    (async () => {
      try {
        const { live, upcoming } = await fetchTabFeed(parsed.key);
        if (alive) setState({ loading: false, live, upcoming, error: null });
      } catch (e) {
        if (alive) setState({ loading: false, live: [], upcoming: [], error: e.message });
      }
    })();
    return () => { alive = false; };
  // parsed is derived from row.bundle_url, so that is the real dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.bundle_url]);

  if (!parsed) return null;

  const { loading, live, upcoming, error } = state;
  const total = live.length + upcoming.length;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight italic">
          {row.name || parsed.def.label}
        </h2>
        {!loading && !error && (
          <span className="text-[11px] font-bold text-gray-500">
            {live.length} live{upcoming.length ? ` · ${upcoming.length} upcoming` : ""}
          </span>
        )}
        <a
          href={tabItemUrl(parsed.base, parsed.key)}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-white"
        >
          Open tab
        </a>
      </div>

      {loading && (
        <div className={LANDSCAPE_GRID}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <p className="flex items-center gap-2 text-xs text-amber-400">
          <AlertCircle className="w-4 h-4" aria-hidden="true" />
          {parsed.def.label} feed is unavailable right now.
        </p>
      )}

      {!loading && !error && total === 0 && (
        <p className="text-xs text-gray-500">Nothing scheduled on {parsed.def.label} right now.</p>
      )}

      {!loading && !error && total > 0 && (
        <div className={LANDSCAPE_GRID}>
          {live.map((m) => (
            <Card key={`l-${m.id}`} item={m} live
                  href={tabItemUrl(parsed.base, parsed.key, m.id)}
                  fallbackPoster={row.thumbnail} />
          ))}
          {upcoming.map((m, i) => (
            <Card key={`u-${m.id || i}`} item={m} live={false}
                  href={null} fallbackPoster={row.thumbnail} />
          ))}
        </div>
      )}
    </section>
  );
};

/* Given every saved row, render only the ones that are tab URLs. Bundles are
   drawn elsewhere on the page and are left alone here. */
const LiveTabsSection = ({ rows }) => {
  const tabRows = (rows || []).filter((r) => parseTabUrl(r.bundle_url));
  if (!tabRows.length) return null;

  return (
    <div className="mt-10">
      {tabRows.map((row) => <Section key={row.id} row={row} />)}
    </div>
  );
};

export default LiveTabsSection;
