import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { Radio, Clock3, Play, ExternalLink, AlertCircle } from "lucide-react";
import LiveViewer from "./LiveViewer";
import { oneperMatch } from "../utils/langs";
import { fetchTabFeed, parseTabUrl, tabItemUrl, posterFor, startLabel, fixtureKey, isIndiaFixture } from "../utils/liveTabs";
import { warmPlayer } from "../utils/liveSources";
import { LANDSCAPE_GRID } from "../utils/posterGrid";

/* Fixtures behind the player's tabs, on the live page.
 *
 * The admin saves a tab URL (see the Tab links form in the live-channels
 * admin); this reads the same feed the player reads and lists what is on now
 * and what is next. Nothing is stored about the fixtures themselves — they
 * change hourly, and a copy would be wrong by the time anyone looked. */

const Card = ({ item, href, live, fallbackPoster, badge, onPlay, allowExternal = true }) => {
  // Willow fixtures remain in the app even when no stream is available.
  const external = allowExternal && !href && item.link ? item.link : null;
  const poster = posterFor(item, fallbackPoster);
  const when = startLabel(item);

  /* Upcoming rows have no URL because they are not signed yet. Rendering them
     as playable would promise something that can only fail, so they are plain.

     A live one is a button rather than a link: it plays here, in the page the
     viewer is already on, instead of handing them off to another site. */
  const Tag = href ? "button" : external ? "a" : "div";
  const linkProps = href
    ? { type: "button", onClick: () => onPlay(item, href) }
    : external
      ? { href: external, target: "_blank", rel: "noopener noreferrer" }
      : {};

  return (
    <Tag
      {...linkProps}
      className={`group relative block w-full text-left overflow-hidden rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06]
                  ${href || external ? "hover:ring-white/20 transition-shadow cursor-pointer" : "cursor-default"}`}
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

        {/* Which publisher this came from — with everything merged into one
            row, the card is the only place left that can say. */}
        {badge && (
          <span className="absolute top-2 right-2 rounded-md bg-black/70 px-2 py-0.5
                           text-[10px] font-black uppercase tracking-widest text-gray-200
                           ring-1 ring-white/15">
            {badge}
          </span>
        )}

        {(href || external) && (
          <span className="absolute inset-0 hidden items-center justify-center bg-black/45 group-hover:flex">
            {href
              ? <Play className="w-7 h-7 text-white fill-white" aria-hidden="true" />
              : <ExternalLink className="w-6 h-6 text-white" aria-hidden="true" />}
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

/* One row of what is on, then a short list of what is next.
 *
 * It used to be a section per tab, each with its own live and upcoming rows.
 * That put the same match in two places when two publishers carried it, and
 * buried the handful of things playing now under forty fixtures that are not.
 *
 * So: everything live, merged and deduplicated, first — that is what someone
 * opening a sports page wants. Then what is coming up, a few at a time, with
 * the rest behind a button. */
const UPCOMING_SHOWN = 6;

const Group = (props) => {
  const Icon = props.icon;
  const { title, tone, count, children } = props;
  return (
    <section className="mb-8 sm:mb-10">
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <h2 className={`text-base sm:text-xl font-black uppercase tracking-tight italic ${tone}`}>
          <Icon className="inline w-4 h-4 sm:w-5 sm:h-5 mr-2 -mt-0.5" aria-hidden="true" />
          {title}
        </h2>
        {count > 0 && (
          <span className="text-[11px] font-bold text-gray-500 shrink-0">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
};

const LiveTabsSection = ({ rows, heading }) => {
  const [fetched, setFetched] = useState(null);
  const [feeds, setFeeds] = useState({});
  const [playing, setPlaying] = useState(null);
  const [showAllSoon, setShowAllSoon] = useState(false);
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
  const tabRows = useMemo(() => (source || []).filter((r) => parseTabUrl(r.bundle_url)), [source]);
  const keys = Array.from(new Set(tabRows.map((r) => parseTabUrl(r.bundle_url).key))).join(",");

  /* Somebody looking at a list of live fixtures is about to press play on
     one, so the player and the proxy connection are made ready while they
     read — out of idle time, not out of the first frame. */
  useEffect(() => { if (keys) warmPlayer(); }, [keys]);

  /* One fetch per tab. Two saved rows can point at the same one, and matching
     a fixture across publishers needs every feed in the same place anyway. */
  useEffect(() => {
    if (!keys) return;
    let alive = true;
    keys.split(",").forEach(async (key) => {
      try {
        const { live, upcoming } = await fetchTabFeed(key);
        if (alive) setFeeds((f) => ({ ...f, [key]: { loading: false, live, upcoming, error: null } }));
      } catch (e) {
        if (alive) setFeeds((f) => ({ ...f, [key]: { loading: false, live: [], upcoming: [], error: e.message } }));
      }
    });
    return () => { alive = false; };
  }, [keys]);

  /* Everything from every tab, each fixture once.
     A match two publishers carry becomes one card holding both, so the viewer
     picks a source in the player rather than guessing between two tiles. */
  const { live, soon, loading } = useMemo(() => {
    const liveBy = new Map();
    const soonBy = new Map();
    let pending = false;

    tabRows.forEach((r) => {
      const p = parseTabUrl(r.bundle_url);
      const f = feeds[p.key];
      if (!f) { pending = true; return; }

      /* Each commentary arrives as its own stream, and they share a name once
         the worker strips "[Hindi]" — so the merge below, which keeps one
         stream per publisher, kept whichever language was listed first and
         dropped the rest. Collapsed first instead, keeping the viewer's own
         language where the match has it; the player offers the others. */
      // The Willow/Prime worker returns live fixtures even before a stream is available.
      // A match page URL is not a media stream.
      const playableLive = (p.key === "willow" || p.key === "prime")
        ? (f.live || []).filter((m) => typeof m.url === "string" && /^https?:\/\//i.test(m.url.trim()))
        : (f.live || []);
      oneperMatch(playableLive).forEach((m) => {
        const k = fixtureKey(m);
        const at = liveBy.get(k) || { item: m, poster: posterFor(m, r.thumbnail), sources: [] };
        if (!at.sources.some((x) => x.key === p.key)) {
          at.sources.push({ key: p.key, label: p.def.label, src: tabItemUrl(p.base, p.key, m.id, true) });
        }
        liveBy.set(k, at);
      });

      oneperMatch(f.upcoming || []).forEach((m) => {
        const k = fixtureKey(m);
        if (liveBy.has(k)) return;           // already on: not "coming up"
        if (!soonBy.has(k)) {
          soonBy.set(k, { item: m, poster: posterFor(m, r.thumbnail), label: p.def.label, key: p.key });
        }
      });
    });

    /* India first in both, then as the feeds ordered them — roughly by start
       time, which is the only ordering they agree on. */
    const byIndia = (a, b) => Number(isIndiaFixture(b.item)) - Number(isIndiaFixture(a.item));
    return {
      live: [...liveBy.values()].sort(byIndia),
      soon: [...soonBy.entries()].filter(([key]) => !liveBy.has(key)).map(([, entry]) => entry).sort(byIndia),
      loading: pending,
    };
  }, [feeds, tabRows]);

  if (!source || !tabRows.length) return null;

  const shownSoon = showAllSoon ? soon : soon.slice(0, UPCOMING_SHOWN);
  const hidden = soon.length - shownSoon.length;
  const nothing = !loading && !live.length && !soon.length;

  return (
    <div className="mt-8 sm:mt-10">
      {heading && (
        <h2 className="text-lg sm:text-xl font-semibold tracking-wide flex items-center gap-2 mb-4 sm:mb-6 text-red-400">
          <Radio className="w-5 h-5 shrink-0" aria-hidden="true" /> {heading}
        </h2>
      )}

      {loading && (
        <div className={LANDSCAPE_GRID}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      )}

      {nothing && (
        <p className="flex items-center gap-2 text-xs text-gray-500">
          <AlertCircle className="w-4 h-4" aria-hidden="true" />
          Nothing is on right now, and nothing is scheduled.
        </p>
      )}

      {!loading && live.length > 0 && (
        <Group title="Live now" icon={Radio} tone="text-red-400" count={live.length}>
          <div className={LANDSCAPE_GRID}>
            {live.map((e) => (
              <Card
                key={`l-${e.sources[0].src}`}
                item={e.item}
                live
                href={e.sources[0].src}
                fallbackPoster={e.poster}
                badge={e.sources.length > 1
                  ? `${e.sources.length} sources`
                  : e.item.langCount > 1
                    ? `${e.sources[0].label} · ${e.item.langCount} languages`
                    : e.sources[0].label}
                onPlay={(item) => setPlaying({
                  title: item.name,
                  sources: e.sources.map(({ label, src }) => ({ label, src })),
                  poster: e.poster,
                })}
              />
            ))}
          </div>
        </Group>
      )}

      {!loading && soon.length > 0 && (
        <Group title="Coming up" icon={Clock3} tone="text-gray-300" count={soon.length}>
          <div className={LANDSCAPE_GRID}>
            {shownSoon.map((e, i) => (
              <Card key={`u-${e.item.id || i}`} item={e.item} live={false}
                href={null} fallbackPoster={e.poster} badge={e.label}
                allowExternal={e.key !== "willow" && e.key !== "prime"} />
            ))}
          </div>

          {/* The feeds together run to dozens of fixtures, most of them days
              out. A few, and the rest for whoever wants them. */}
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setShowAllSoon(true)}
              className="mt-4 w-full sm:w-auto rounded-xl bg-white/[0.06] px-5 py-2.5 text-[11px] font-black
                         uppercase tracking-widest text-gray-300 ring-1 ring-white/10
                         hover:bg-white/[0.12] hover:text-white transition-colors
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Explore {hidden} more
            </button>
          )}
          {showAllSoon && soon.length > UPCOMING_SHOWN && (
            <button
              type="button"
              onClick={() => setShowAllSoon(false)}
              className="mt-4 w-full sm:w-auto rounded-xl px-5 py-2.5 text-[11px] font-black
                         uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
            >
              Show fewer
            </button>
          )}
        </Group>
      )}

      <LiveViewer
        open={!!playing}
        title={playing?.title || ""}
        sources={playing?.sources}
        poster={playing?.poster}
        onClose={() => setPlaying(null)}
      />
    </div>
  );
};

export default LiveTabsSection;
