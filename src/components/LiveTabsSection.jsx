import React, { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { Radio, Clock3, Play, X, AlertCircle } from "lucide-react";
import { fetchTabFeed, parseTabUrl, tabItemUrl, posterFor, startLabel } from "../utils/liveTabs";
import { LANDSCAPE_GRID } from "../utils/posterGrid";

/* Fixtures behind the player's tabs, on the live page.
 *
 * The admin saves a tab URL (see the Tab links form in the live-channels
 * admin); this reads the same feed the player reads and lists what is on now
 * and what is next. Nothing is stored about the fixtures themselves — they
 * change hourly, and a copy would be wrong by the time anyone looked. */

const Card = ({ item, href, live, fallbackPoster, onPlay }) => {
  const poster = posterFor(item, fallbackPoster);
  const when = startLabel(item);

  /* Upcoming rows have no URL because they are not signed yet. Rendering them
     as playable would promise something that can only fail, so they are plain.

     A live one is a button rather than a link: it plays here, in the page the
     viewer is already on, instead of handing them off to another site. */
  const Tag = href ? "button" : "div";
  const linkProps = href
    ? { type: "button", onClick: () => onPlay(item, href) }
    : {};

  return (
    <Tag
      {...linkProps}
      className={`group relative block w-full text-left overflow-hidden rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06]
                  ${href ? "hover:ring-white/20 transition-shadow cursor-pointer" : "cursor-default"}`}
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
            <Play className="w-7 h-7 text-white fill-white" aria-hidden="true" />
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

/* Plays without leaving the site.
 *
 * The stream itself is the player's problem, not this page's: these CDNs want
 * headers a browser will not set, a token that rotates hourly, and for two of
 * them an Indian address — all of which the player and its proxy already
 * handle. Reimplementing that here would mean maintaining it twice and having
 * it break in two places. So the player runs in a frame, addressed by the tab
 * link, and the viewer stays on AnchorHD. */
const Viewer = ({ open, title, src, onClose }) => {
  /* Escape closes it, and the page behind must not scroll while it is up. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-sm flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 shrink-0">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-0.5
                         text-[10px] font-black uppercase tracking-widest text-white">
          <Radio className="w-3 h-3" aria-hidden="true" /> Live
        </span>
        <p className="text-sm font-bold text-white truncate">{title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close player"
          className="ml-auto shrink-0 rounded-lg p-2 text-gray-300 hover:bg-white/10 hover:text-white
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 min-h-0 px-2 sm:px-6 pb-4 sm:pb-6">
        <iframe
          key={src}
          src={src}
          title={title}
          className="w-full h-full rounded-xl bg-black ring-1 ring-white/10"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
};

const Section = ({ row }) => {
  const parsed = parseTabUrl(row.bundle_url);
  const [state, setState] = useState({ loading: true, live: [], upcoming: [], error: null });
  const [playing, setPlaying] = useState(null);

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
        <button
          type="button"
          onClick={() => setPlaying({
            title: row.name || parsed.def.label,
            src: tabItemUrl(parsed.base, parsed.key),
          })}
          className="ml-auto text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-white"
        >
          Browse all
        </button>
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
                  fallbackPoster={row.thumbnail}
                  onPlay={(item, src) => setPlaying({ title: item.name, src })} />
          ))}
          {upcoming.map((m, i) => (
            <Card key={`u-${m.id || i}`} item={m} live={false}
                  href={null} fallbackPoster={row.thumbnail} />
          ))}
        </div>
      )}

      <Viewer
        open={!!playing}
        title={playing?.title || ""}
        src={playing?.src || ""}
        onClose={() => setPlaying(null)}
      />
    </section>
  );
};

/* Render the saved rows that are tab URLs, leaving bundles to whoever draws
   those.

   Rows may be handed in by a page that has already loaded them, or fetched
   here when the page has not — that way this drops onto any page without
   that page needing to know the table exists. */
const LiveTabsSection = ({ rows, heading }) => {
  const [fetched, setFetched] = useState(null);
  const given = Array.isArray(rows);

  useEffect(() => {
    if (given) return;
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("live_channel_bundles")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (alive) setFetched(error ? [] : data || []);
    })();
    return () => { alive = false; };
  }, [given]);

  const source = given ? rows : fetched;
  // Still loading its own rows: say nothing rather than flash an empty heading.
  if (!source) return null;

  const tabRows = source.filter((r) => parseTabUrl(r.bundle_url));
  if (!tabRows.length) return null;

  return (
    <div className="mt-10">
      {heading && (
        <h2 className="text-xl font-semibold tracking-wide flex items-center gap-2 mb-6 text-red-400">
          <Radio className="w-5 h-5" aria-hidden="true" /> {heading}
        </h2>
      )}
      {tabRows.map((row) => <Section key={row.id} row={row} />)}
    </div>
  );
};

export default LiveTabsSection;
