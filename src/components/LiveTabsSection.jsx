import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { Radio, Clock3, Play, ExternalLink, AlertCircle } from "lucide-react";
import LiveViewer from "./LiveViewer";
import { fetchTabFeed, parseTabUrl, tabItemUrl, posterFor, startLabel, fixtureKey } from "../utils/liveTabs";
import { LANDSCAPE_GRID } from "../utils/posterGrid";

/* Fixtures behind the player's tabs, on the live page.
 *
 * The admin saves a tab URL (see the Tab links form in the live-channels
 * admin); this reads the same feed the player reads and lists what is on now
 * and what is next. Nothing is stored about the fixtures themselves — they
 * change hourly, and a copy would be wrong by the time anyone looked. */

const Card = ({ item, href, live, fallbackPoster, onPlay }) => {
  /* Some fixtures have nowhere to play but somewhere to watch — the Willow
     schedule is all of these. An outward link is the honest action there:
     better than a dead card, and it does not pretend the site can play it. */
  const external = !href && item.link ? item.link : null;
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

const Section = ({ row, parsed, state, altSources, onPlay }) => {
  if (!parsed) return null;

  const { loading, live, upcoming, error } = state;
  const total = live.length + upcoming.length;

  /* Everywhere this fixture is carried, this tab first — the one the viewer
     pressed should be the one that starts. */
  const sourcesFor = (m) => {
    const here = { label: parsed.def.label, src: tabItemUrl(parsed.base, parsed.key, m.id, true) };
    const others = (altSources.get(fixtureKey(m)) || []).filter((o) => o.key !== parsed.key);
    return [here, ...others.map((o) => ({ label: o.label, src: o.src }))];
  };

  return (
    <section className="mb-8 sm:mb-10">
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <h2 className="text-base sm:text-xl font-black uppercase tracking-tight italic truncate">
          {row.name || parsed.def.label}
        </h2>
        {!loading && !error && (
          <span className="hidden sm:inline text-[11px] font-bold text-gray-500 shrink-0">
            {live.length} live{upcoming.length ? ` · ${upcoming.length} upcoming` : ""}
          </span>
        )}
        <button
          type="button"
          onClick={() => onPlay({
            title: row.name || parsed.def.label,
            src: tabItemUrl(parsed.base, parsed.key),
            poster: row.thumbnail || null,
          })}
          className="ml-auto shrink-0 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-white"
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
                  href={tabItemUrl(parsed.base, parsed.key, m.id, true)}
                  fallbackPoster={row.thumbnail}
                  onPlay={(item) => onPlay({
                    title: item.name,
                    sources: sourcesFor(item),
                    poster: posterFor(item, row.thumbnail),
                  })} />
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

const LiveTabsSection = ({ rows, heading }) => {
  const [fetched, setFetched] = useState(null);
  const [feeds, setFeeds] = useState({});
  const [playing, setPlaying] = useState(null);
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
  const tabRows = (source || []).filter((r) => parseTabUrl(r.bundle_url));

  /* One fetch per tab, here rather than in each section.
     Two rows can point at the same tab, and a section that fetched its own
     could not see what the others hold — which is what matching a fixture
     across publishers needs. */
  const keys = Array.from(new Set(tabRows.map((r) => parseTabUrl(r.bundle_url).key))).join(",");

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

  /* Which tabs carry each live fixture. Built from every feed at once, so a
     match on two publishers can be swapped between rather than hunted for. */
  const altSources = useMemo(() => {
    const map = new Map();
    tabRows.forEach((r) => {
      const p = parseTabUrl(r.bundle_url);
      const f = feeds[p.key];
      (f?.live || []).forEach((m) => {
        const k = fixtureKey(m);
        const at = map.get(k) || [];
        if (!at.some((o) => o.key === p.key)) {
          at.push({ key: p.key, label: p.def.label, src: tabItemUrl(p.base, p.key, m.id, true) });
        }
        map.set(k, at);
      });
    });
    return map;
  }, [feeds, keys]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!source) return null;      // still loading its own rows
  if (!tabRows.length) return null;

  const EMPTY = { loading: true, live: [], upcoming: [], error: null };

  return (
    <div className="mt-8 sm:mt-10">
      {heading && (
        <h2 className="text-lg sm:text-xl font-semibold tracking-wide flex items-center gap-2 mb-4 sm:mb-6 text-red-400">
          <Radio className="w-5 h-5 shrink-0" aria-hidden="true" /> {heading}
        </h2>
      )}

      {tabRows.map((row) => {
        const parsed = parseTabUrl(row.bundle_url);
        return (
          <Section
            key={row.id}
            row={row}
            parsed={parsed}
            state={feeds[parsed.key] || EMPTY}
            altSources={altSources}
            onPlay={setPlaying}
          />
        );
      })}

      <LiveViewer
        open={!!playing}
        title={playing?.title || ""}
        src={playing?.src || ""}
        sources={playing?.sources}
        poster={playing?.poster}
        onClose={() => setPlaying(null)}
      />
    </div>
  );
};

export default LiveTabsSection;
