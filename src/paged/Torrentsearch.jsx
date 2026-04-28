import { useState, useContext } from "react";
import { AppContext } from "../context/AppContext";

const LANGUAGES = [
  "Tamil", "Telugu", "Kannada", "Malayalam", "Hindi",
  "Bengali", "Marathi", "Punjabi", "English"
];

const SOURCES = ["1TamilMV", "PirateBay"];

/* ── Seeder color helper ── */
const seedColor = (n) => {
  if (!n || n === "N/A" || n === "0") return "#333";
  const c = parseInt(n, 10);
  return c > 200 ? "#00e676" : c > 50 ? "#ffea00" : "#ff5555";
};

/* ── Copy button ── */
function CopyBtn({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  const isValid = text && text !== "Not Available" && text !== "No Magnet Found";
  if (!isValid) return null;
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      style={{
        padding: "9px 16px",
        borderRadius: "6px",
        background: copied ? "#00e67618" : "#111",
        border: `1px solid ${copied ? "#00e676" : "#222"}`,
        color: copied ? "#00e676" : "#888",
        fontSize: "13px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}

/* ── Action Button (Magnet / Download / Direct) ── */
function ActionBtn({ href, label, icon, accent = "#00e676" }) {
  const isValid = href && href !== "Not Available" && href !== "No Magnet Found";
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "9px 18px",
    borderRadius: "6px",
    fontSize: "13px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontWeight: 600,
    textDecoration: "none",
    transition: "all 0.15s",
    cursor: isValid ? "pointer" : "default",
    whiteSpace: "nowrap",
  };

  if (!isValid) {
    return (
      <span style={{ ...base, background: "#0a0a0a", border: "1px solid #111", color: "#1e1e1e" }}>
        {icon} {label}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ ...base, background: `${accent}18`, border: `1px solid ${accent}55`, color: accent }}
      onMouseEnter={e => {
        e.currentTarget.style.background = `${accent}30`;
        e.currentTarget.style.borderColor = accent;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = `${accent}18`;
        e.currentTarget.style.borderColor = `${accent}55`;
      }}
    >
      {icon} {label}
    </a>
  );
}

/* ── Result Card — 1Flex style ── */
function ResultCard({ item, index }) {
  const hasMagnet  = item.magnet      && item.magnet      !== "No Magnet Found" && item.magnet !== "Not Available";
  const hasDirect  = item.direct_link && item.direct_link !== "Not Available";
  const hasTorrent = item.torrent_file && item.torrent_file !== "Not Available";
  const isTMV      = item.source === "1TamilMV";

  const sc = seedColor(item.seeders);

  return (
    <div
      style={{
        background: index % 2 === 0 ? "#0c0c0c" : "#090909",
        borderBottom: "1px solid #111",
        padding: "20px 24px",
        transition: "background 0.15s",
        animation: `fadeUp 0.3s ease ${Math.min(index * 0.06, 0.5)}s both`,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "#101010")}
      onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? "#0c0c0c" : "#090909")}
    >
      {/* ── Title row ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
        <h3 style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "15px",
          fontWeight: 600,
          color: "#e8e8e8",
          lineHeight: 1.5,
          margin: 0,
          flex: 1,
        }}>
          {item.quality || item.title || "Unknown"}
        </h3>

        {/* Source badge */}
        <span style={{
          flexShrink: 0,
          fontSize: "11px",
          padding: "3px 10px",
          borderRadius: "3px",
          background: isTMV ? "#ff3c3c18" : "#3c8fff18",
          color: isTMV ? "#ff5555" : "#55aaff",
          border: `1px solid ${isTMV ? "#ff555533" : "#55aaff33"}`,
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontWeight: 600,
          marginTop: "2px",
        }}>
          {item.source}
        </span>
      </div>

      {/* ── Metadata row: seeders / leechers / info ── */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "20px",
        marginBottom: "18px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        {/* Seeders */}
        {item.seeders && item.seeders !== "N/A" && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke={sc} strokeWidth="2" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke={sc} strokeWidth="2"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={sc} strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: "13px", color: sc, fontWeight: 500 }}>Seeders: {item.seeders}</span>
          </div>
        )}

        {/* Leechers */}
        {item.leechers && item.leechers !== "N/A" && item.leechers !== "0" && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="#ff5555" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="#ff5555" strokeWidth="2"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#ff5555" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: "13px", color: "#ff5555", fontWeight: 500 }}>Leechers: {item.leechers}</span>
          </div>
        )}

        {/* Extra info */}
        {item.info && (
          <span style={{
            fontSize: "12px",
            color: "#555",
            fontFamily: "system-ui, -apple-system, sans-serif",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "300px",
          }}>
            {item.info}
          </span>
        )}
      </div>

      {/* ── Action buttons row ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
        {/* Magnet Link */}
        <ActionBtn
          href={item.magnet}
          label="Magnet Link"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 15A6 6 0 1 0 18 15"/>
              <path d="M6 15V5h4v10M14 15V5h4v10M10 5h4"/>
            </svg>
          }
          accent="#00e676"
        />

        {/* Torrent Download */}
        <ActionBtn
          href={item.torrent_file}
          label="Download"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          }
          accent="#3c8fff"
        />

        {/* Direct Link */}
        {hasDirect && (
          <ActionBtn
            href={item.direct_link}
            label="Direct Link"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            }
            accent="#ff9500"
          />
        )}

        {/* Copy magnet */}
        {hasMagnet && <CopyBtn text={item.magnet} label="Copy Magnet" />}
      </div>


    </div>
  );
}

/* ════════════════════════════════════════
   Main Page
════════════════════════════════════════ */
export default function TorrentSearch() {
  const { backendUrl } = useContext(AppContext);

  const [movieName, setMovieName] = useState("");
  const [language,  setLanguage]  = useState("Kannada");
  const [source,    setSource]    = useState("1TamilMV");
  const [results,   setResults]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [searched,  setSearched]  = useState(false);
  const [error,     setError]     = useState("");

  const sourceParam = source === "1TamilMV" ? "1tamilmv" : "piratebay";

  const handleSearch = async () => {
    if (!movieName.trim()) return;
    setLoading(true);
    setError("");
    setResults([]);
    setSearched(true);
    try {
      const url = `${backendUrl}/search?movie=${encodeURIComponent(movieName)}&lang=${encodeURIComponent(language)}&source=${sourceParam}`;
      const res  = await fetch(url);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data?.[0]?.error) throw new Error(data[0].error);
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Search failed. Check your server connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050505; color: #e0e0e0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to   { transform: rotate(360deg); } }
        .t-input:focus { outline: none; border-color: #ff3c3c !important; }
        .t-input::placeholder { color: #252525; }
        select:focus { outline: none; }
        select option { background: #0a0a0a; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #050505; }
        ::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 2px; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#050505", fontFamily: "'Space Mono', monospace", position: "relative", overflow: "hidden" }}>

        {/* Grid bg */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage: `linear-gradient(rgba(255,60,60,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,60,60,0.03) 1px,transparent 1px)`,
          backgroundSize: "40px 40px",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "900px", margin: "0 auto", padding: "60px 24px 80px" }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: "48px", animation: "fadeUp 0.5s ease both" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ff3c3c", animation: "spin 3s linear infinite" }} />
              <span style={{ fontSize: "10px", letterSpacing: "0.25em", color: "#555", textTransform: "uppercase" }}>Torrent Engine v2.0</span>
            </div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "clamp(32px,6vw,56px)", lineHeight: 1, letterSpacing: "-0.02em", color: "#fff", marginBottom: "8px" }}>
              SEARCH<br /><span style={{ color: "#ff3c3c" }}>TORRENTS</span>
            </h1>
            <p style={{ fontSize: "11px", color: "#444", letterSpacing: "0.1em" }}>1TAMILMV · PIRATEBAY · MAGNET · DIRECT · TORRENT FILE</p>
          </div>

          {/* ── Search panel ── */}
          <div style={{ background: "#090909", border: "1px solid #1a1a1a", borderRadius: "6px", overflow: "hidden", marginBottom: "32px", animation: "fadeUp 0.5s ease 0.1s both" }}>

            {/* Source tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #111" }}>
              {SOURCES.map(s => (
                <button key={s} onClick={() => setSource(s)} style={{
                  flex: 1, padding: "12px", background: source === s ? "#0f0f0f" : "transparent",
                  border: "none", borderBottom: source === s ? "2px solid #ff3c3c" : "2px solid transparent",
                  color: source === s ? "#fff" : "#444",
                  fontFamily: "'Space Mono', monospace", fontSize: "11px",
                  letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s",
                }}>{s}</button>
              ))}
            </div>

            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>

                {/* Movie name */}
                <div style={{ flex: "2 1 200px", position: "relative" }}>
                  <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#2a2a2a", fontSize: "13px", pointerEvents: "none" }}>🎬</div>
                  <input
                    className="t-input"
                    type="text"
                    placeholder="Movie name..."
                    value={movieName}
                    onChange={e => setMovieName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    style={{ width: "100%", padding: "12px 14px 12px 38px", background: "#050505", border: "1px solid #1a1a1a", borderRadius: "4px", color: "#e0e0e0", fontFamily: "'Space Mono', monospace", fontSize: "13px", transition: "border-color 0.2s" }}
                  />
                </div>

                {/* Language */}
                <div style={{ flex: "1 1 140px", position: "relative" }}>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    style={{ width: "100%", padding: "12px 14px", background: "#050505", border: "1px solid #1a1a1a", borderRadius: "4px", color: source === "1TamilMV" ? "#e0e0e0" : "#555", fontFamily: "'Space Mono', monospace", fontSize: "13px", cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
                  >
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#444", pointerEvents: "none", fontSize: "10px" }}>▼</div>
                </div>

                {/* Search button */}
                <button
                  onClick={handleSearch}
                  disabled={loading || !movieName.trim()}
                  style={{ flex: "0 0 auto", padding: "12px 28px", background: loading ? "#1a0a0a" : "#ff3c3c", border: "none", borderRadius: "4px", color: loading ? "#ff3c3c" : "#fff", fontFamily: "'Space Mono', monospace", fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "8px" }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#cc2222"; }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#ff3c3c"; }}
                >
                  {loading
                    ? <><div style={{ width: "12px", height: "12px", border: "2px solid #ff3c3c33", borderTopColor: "#ff3c3c", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />SCANNING</>
                    : "SEARCH"
                  }
                </button>
              </div>

              <p style={{ marginTop: "12px", fontSize: "10px", color: "#1e1e1e", letterSpacing: "0.08em" }}>
                {source === "1TamilMV"
                  ? "↳ 1TamilMV · magnet + direct link + .torrent file"
                  : `↳ PirateBay · searching "${movieName || "..."} ${language}" sorted by seeders`}
              </p>
            </div>
          </div>

          {/* ── Error ── */}
          {error && (
            <div style={{ padding: "16px 20px", background: "#ff3c3c11", border: "1px solid #ff3c3c33", borderRadius: "4px", color: "#ff5555", fontSize: "12px", marginBottom: "24px", fontFamily: "'Space Mono', monospace", animation: "fadeUp 0.3s ease both" }}>
              ⚠ {error}
            </div>
          )}

          {/* ── Results ── */}
          {searched && !loading && (
            <div style={{ animation: "fadeUp 0.4s ease both" }}>

              {/* Result count header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", padding: "0 4px" }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "18px", color: "#e0e0e0", letterSpacing: "-0.01em" }}>
                  Search Results{" "}
                  <span style={{ color: "#333", fontSize: "14px", fontWeight: 700 }}>({results.length} found)</span>
                </span>
                <span style={{ fontSize: "9px", color: "#222", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "'Space Mono', monospace" }}>
                  Provider: {source.toUpperCase()}
                </span>
              </div>

              {results.length === 0 ? (
                <div style={{ padding: "56px", textAlign: "center", background: "#090909", border: "1px solid #111", borderRadius: "8px" }}>
                  <div style={{ fontSize: "32px", marginBottom: "12px", color: "#1a1a1a" }}>◎</div>
                  <p style={{ fontSize: "12px", letterSpacing: "0.1em", color: "#2a2a2a", fontFamily: "'Space Mono', monospace" }}>NO RESULTS FOUND</p>
                  <p style={{ fontSize: "10px", marginTop: "6px", color: "#1a1a1a", fontFamily: "'Space Mono', monospace" }}>Try a different title or language</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {results.map((item, i) => (
                    <ResultCard key={i} item={item} index={i} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Footer ── */}
          <div style={{ marginTop: "60px", paddingTop: "24px", borderTop: "1px solid #0f0f0f", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "9px", color: "#181818", letterSpacing: "0.2em", fontFamily: "'Space Mono', monospace" }}>ANCHOR · TORRENT ENGINE</span>
            <span style={{ fontSize: "9px", color: "#181818", letterSpacing: "0.1em", fontFamily: "'Space Mono', monospace" }}>/search?movie=&lang=&source=</span>
          </div>

        </div>
      </div>
    </>
  );
}