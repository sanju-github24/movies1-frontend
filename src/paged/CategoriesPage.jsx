import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { studioBySlug } from "../utils/studios";
import { CATEGORY_STUDIOS, CATEGORY_LANGUAGES, CATEGORY_GENRES, MORE_GENRES, hsImg } from "../utils/categories";
import { absUrl } from "../utils/seo";

/* /categories — every way into the catalogue on one page, laid out like
   JioHotstar's: studios, languages, genres, each a row of wide tiles. A row
   wraps into a grid on a phone and scrolls sideways nowhere, so every tile is
   reachable without a swipe. Tiles carry JioHotstar's art (utils/categories)
   and link to our own pages: /studio/…, /category/<language>, /genre/<genre>. */

const Row = ({ title, children }) => (
  <section className="mb-10 sm:mb-12">
    <h2 className="text-lg sm:text-2xl font-bold text-white mb-3 sm:mb-4">{title}</h2>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">{children}</div>
  </section>
);

const tile = "group relative block aspect-[16/9] rounded-xl overflow-hidden bg-[#1a1c22] ring-1 ring-white/5 "
  + "hover:ring-white/30 focus-visible:ring-2 focus-visible:ring-white outline-none transition-all duration-300 hover:-translate-y-1 "
  + "hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)]";

const Art = ({ src, alt }) => (
  <img src={hsImg(src)} alt={alt} loading="lazy" decoding="async"
    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
    onError={(e) => { e.currentTarget.style.display = "none"; }} />
);

export default function CategoriesPage() {
  const studios = CATEGORY_STUDIOS.map((c) => ({ ...studioBySlug(c.slug), ...c })).filter((s) => s.slug && (s.art || s.logo));

  return (
    <div className="min-h-screen bg-[#0f1014] text-white px-4 sm:px-8 lg:px-12 pt-6 sm:pt-10 pb-24">
      <Helmet>
        <title>Categories — Movies & Web Series by Language, Genre and Studio | AnchorMovies</title>
        <meta name="description" content="Browse movies and web series by language (Tamil, Telugu, Hindi, Kannada, Malayalam and more), by genre, and by studio." />
        <link rel="canonical" href={absUrl("/categories")} />
      </Helmet>

      <div className="max-w-[1800px] mx-auto">
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-6 sm:mb-10">Categories</h1>

        <Row title="Studios">
          {studios.map((s) => (
            <Link key={s.slug} to={`/studio/${s.slug}`} className={tile} aria-label={s.name} title={s.name}>
              {s.art ? <Art src={s.art} alt={s.name} /> : (
                <span className="absolute inset-0 flex items-center justify-center p-6 sm:p-8"
                  style={{ background: `radial-gradient(120% 90% at 50% 30%, ${s.color}22, transparent 70%)` }}>
                  <img src={s.logo} alt={s.name} loading="lazy" className={`max-h-[46%] max-w-[70%] object-contain ${s.invert ? "invert" : ""}`} />
                </span>
              )}
            </Link>
          ))}
        </Row>

        <Row title="Popular Languages">
          {CATEGORY_LANGUAGES.map((l) => (
            <Link key={l.name} to={`/category/${encodeURIComponent(l.name)}`} className={tile}
              aria-label={`${l.name} movies and shows`} title={l.name}>
              {/* The art carries the name itself — the language in its own
                  script, the English word under it — so nothing is laid on top. */}
              <Art src={l.art} alt={`${l.native} ${l.name}`} />
            </Link>
          ))}
        </Row>

        <Row title="Popular Genres">
          {CATEGORY_GENRES.map((g) => (
            <Link key={g.name} to={`/genre/${encodeURIComponent(g.name)}`} className={tile}
              aria-label={`${g.name} movies and shows`} title={g.name}>
              <Art src={g.art} alt={g.name} />
            </Link>
          ))}
        </Row>

        <Row title="More Genres">
          {MORE_GENRES.map((g, i) => (
            <Link key={g.name} to={`/genre/${encodeURIComponent(g.name)}`} className={tile} aria-label={`${g.name} movies and shows`}
              style={{ background: `linear-gradient(135deg, hsl(${(i * 47 + 200) % 360} 35% 26%), hsl(${(i * 47 + 240) % 360} 30% 14%))` }}>
              <span className="absolute left-3 sm:left-5 bottom-2.5 sm:bottom-4 text-lg sm:text-3xl font-bold text-white/95">{g.name}</span>
            </Link>
          ))}
        </Row>
      </div>
    </div>
  );
}

