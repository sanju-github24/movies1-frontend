import React, { useEffect, useMemo, useState } from "react";
import { backendUrl } from "../utils/api";

/* The wall of posters behind the sign-in page: what we uploaded ourselves
   (/api/movies, newest first) mixed with what has just come out elsewhere
   (/api/fresh), and TMDB's trending titles if both come up short. Columns
   drift up and down, slowly; with "reduce motion" they hold still. */

const TMDB_PATH = /^\/[A-Za-z0-9]{20,}\.(?:jpe?g|png|webp)$/;
const key = (t) => String(t || "").toLowerCase().split("(")[0].replace(/[^a-z0-9]+/g, " ").trim();

/* A poster URL worth showing, light enough for a phone: TMDB's big sizes become w342. */
const clean = (src) => {
    if (!src || typeof src !== "string") return "";
    let u = src.trim();
    if (TMDB_PATH.test(u)) u = `https://image.tmdb.org/t/p/w342${u}`;
    if (!/^https?:\/\//i.test(u)) return "";
    return u.replace(/\/t\/p\/(?:original|w1280|w780|w500)\//, "/t/p/w342/");
};

let cache = null;   // one fetch per visit, however often the page switches modes
async function loadPosters() {
    const get = (path) => fetch(`${backendUrl}${path}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const [mine, fresh] = await Promise.all([get("/api/movies"), get("/api/fresh")]);

    const local = (Array.isArray(mine?.data) ? mine.data : []).slice(0, 40)
        .map((m) => ({ title: m.title, src: clean(m.poster) }));
    const other = (Array.isArray(fresh?.items) ? fresh.items : [])
        .map((f) => ({ title: f.title, src: clean(f.poster || f.cover_poster) }));

    // Ours and theirs, taking turns, so neither source crowds the other out.
    const mixed = [];
    for (let i = 0; i < Math.max(local.length, other.length); i++) {
        if (local[i]) mixed.push(local[i]);
        if (other[i]) mixed.push(other[i]);
    }

    if (mixed.filter((p) => p.src).length < 15) {
        const t = await get("/api/tmdb-trending");
        (Array.isArray(t?.results) ? t.results : []).forEach((x) => mixed.push({ title: x.title, src: clean(x.poster_url) }));
    }

    const seenTitle = new Set(); const seenSrc = new Set();
    return mixed.filter((p) => {
        if (!p.src || seenSrc.has(p.src)) return false;
        const k = key(p.title);
        if (k && seenTitle.has(k)) return false;
        seenSrc.add(p.src); if (k) seenTitle.add(k);
        return true;
    }).slice(0, 45);
}

const STYLE = `
@keyframes pw-up   { from { transform: translateY(0) }    to { transform: translateY(-50%) } }
@keyframes pw-down { from { transform: translateY(-50%) } to { transform: translateY(0) } }
.pw-track { will-change: transform; animation-timing-function: linear; animation-iteration-count: infinite; }
@media (prefers-reduced-motion: reduce) { .pw-track { animation: none !important; } }
`;

function Column({ posters, dir, seconds, className }) {
    // The list twice over, so the loop has no seam; at least 6 a half so a short list still fills a tall screen.
    const half = useMemo(() => {
        const out = [];
        while (out.length < 6) out.push(...posters);
        return out;
    }, [posters]);
    return (
        <div className={`overflow-hidden ${className}`}>
            <div className="pw-track flex flex-col gap-3 sm:gap-4" style={{ animationName: dir === "up" ? "pw-up" : "pw-down", animationDuration: `${seconds}s` }}>
                {[...half, ...half].map((p, i) => (
                    <div key={i} className="aspect-[2/3] shrink-0 rounded-xl sm:rounded-2xl overflow-hidden bg-white/[0.06]">
                        <img src={p.src} alt="" loading="lazy" decoding="async" draggable="false"
                            onError={(e) => { e.currentTarget.parentElement.style.visibility = "hidden"; }}
                            className="w-full h-full object-cover" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function PosterWall({ className = "" }) {
    const [posters, setPosters] = useState(() => cache || []);
    useEffect(() => {
        if (cache) return;
        let alive = true;
        loadPosters().then((list) => { cache = list; if (alive) setPosters(list); }).catch(() => { });
        return () => { alive = false; };
    }, []);

    // Round-robin into five columns.
    const cols = useMemo(() => {
        const c = [[], [], [], [], []];
        posters.forEach((p, i) => c[i % 5].push(p));
        return c;
    }, [posters]);

    if (posters.length < 5) return <div className={className} aria-hidden="true" />;
    const dirs = ["up", "down", "up", "down", "up"];
    const secs = [95, 80, 105, 88, 98];
    /* Phones get three columns, tablets four, desktops five. */
    const show = ["", "", "", "hidden sm:block", "hidden lg:block"];
    return (
        <div className={`${className} flex gap-3 sm:gap-4 px-3 sm:px-4 overflow-hidden`} aria-hidden="true">
            <style>{STYLE}</style>
            {cols.map((list, i) => list.length > 0 && (
                <Column key={i} posters={list} dir={dirs[i]} seconds={secs[i]} className={`flex-1 min-w-0 ${show[i]} ${i % 2 ? "-mt-24" : ""}`} />
            ))}
        </div>
    );
}