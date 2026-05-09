import { useState, useEffect, useRef, useCallback } from "react";

const GENRES = ["All", "Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Documentary", "Romance", "Thriller", "Animation"];

const IA_BASE = "https://archive.org";

async function searchMovies(query = "", genre = "All", page = 1) {
  const pageSize = 20;
  const start = (page - 1) * pageSize;

  let q = "mediatype:movies AND format:mp4";
  if (query) q += ` AND (title:${query} OR description:${query})`;
  if (genre !== "All") q += ` AND subject:${genre}`;

  const url = `${IA_BASE}/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier,title,description,year,subject,thumb&sort[]=downloads+desc&rows=${pageSize}&start=${start}&output=json`;

  const res = await fetch(url);
  const data = await res.json();
  return data.response?.docs || [];
}

async function getMovieFiles(identifier) {
  const res = await fetch(`${IA_BASE}/metadata/${identifier}`);
  const data = await res.json();
  const files = data.files || [];
  const mp4 = files.find(f => f.name?.endsWith(".mp4") && !f.name.includes("_512kb") && !f.name.includes("thumb"));
  const thumb = files.find(f => f.name?.endsWith(".jpg") || f.name?.endsWith(".png"));
  return {
    videoUrl: mp4 ? `${IA_BASE}/download/${identifier}/${mp4.name}` : null,
    thumbUrl: thumb ? `${IA_BASE}/download/${identifier}/${thumb.name}` : `${IA_BASE}/services/img/${identifier}`,
  };
}

function MovieCard({ movie, onClick }) {
  const [imgSrc, setImgSrc] = useState(`${IA_BASE}/services/img/${movie.identifier}`);
  const title = movie.title || movie.identifier;
  const year = movie.year || "";

  return (
    <div onClick={() => onClick(movie)} style={{
      cursor: "pointer",
      borderRadius: 8,
      overflow: "hidden",
      background: "#111",
      border: "1px solid #222",
      transition: "transform 0.2s, box-shadow 0.2s",
      position: "relative",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(229,57,53,0.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ position: "relative", paddingTop: "140%", background: "#1a1a1a" }}>
        <img
          src={imgSrc}
          alt={title}
          onError={() => setImgSrc("https://via.placeholder.com/200x280/1a1a1a/555?text=🎬")}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(transparent, rgba(0,0,0,0.95))",
          padding: "32px 10px 10px",
        }}>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, lineHeight: 1.3, fontFamily: "'Georgia', serif" }}>{title}</div>
          {year && <div style={{ color: "#e53935", fontSize: 11, marginTop: 3, fontFamily: "monospace" }}>{year}</div>}
        </div>
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: "#e53935", color: "#fff",
          fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 3,
          fontFamily: "monospace", letterSpacing: 1,
        }}>FREE</div>
      </div>
    </div>
  );
}

function PlayerModal({ movie, onClose }) {
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getMovieFiles(movie.identifier).then(({ videoUrl }) => {
      if (videoUrl) setVideoUrl(videoUrl);
      else setError("No playable video found for this title.");
      setLoading(false);
    }).catch(() => { setError("Failed to load movie."); setLoading(false); });
  }, [movie.identifier]);

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `${movie.title || movie.identifier}.mp4`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, backdropFilter: "blur(6px)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#0d0d0d", border: "1px solid #2a2a2a",
        borderRadius: 12, width: "100%", maxWidth: 860,
        boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #1e1e1e" }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: "'Georgia', serif" }}>{movie.title || movie.identifier}</div>
            {movie.year && <div style={{ color: "#e53935", fontSize: 12, fontFamily: "monospace" }}>{movie.year}</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid #333", color: "#aaa", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>✕ Close</button>
        </div>

        {/* Player */}
        <div style={{ background: "#000", position: "relative", paddingTop: "56.25%" }}>
          {loading && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, border: "3px solid #333", borderTop: "3px solid #e53935", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <div style={{ color: "#666", fontSize: 13, fontFamily: "monospace" }}>Loading movie...</div>
            </div>
          )}
          {error && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ fontSize: 36 }}>🎬</div>
              <div style={{ color: "#e53935", fontSize: 14, fontFamily: "monospace" }}>{error}</div>
              <div style={{ color: "#555", fontSize: 12 }}>Try another title</div>
            </div>
          )}
          {videoUrl && !loading && (
            <video
              controls
              autoPlay
              src={videoUrl}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "#000" }}
              onError={() => setError("Video failed to play. Try downloading instead.")}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #1e1e1e", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1 }}>
            {movie.description && (
              <p style={{ color: "#777", fontSize: 12, lineHeight: 1.6, margin: 0, fontFamily: "'Georgia', serif" }}>
                {typeof movie.description === "string"
                  ? movie.description.slice(0, 220) + (movie.description.length > 220 ? "..." : "")
                  : ""}
              </p>
            )}
            {movie.subject && (
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(Array.isArray(movie.subject) ? movie.subject : [movie.subject]).slice(0, 4).map((s, i) => (
                  <span key={i} style={{ background: "#1a1a1a", color: "#666", fontSize: 10, padding: "2px 8px", borderRadius: 10, fontFamily: "monospace" }}>{s}</span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 130 }}>
            <button onClick={handleDownload} disabled={!videoUrl || loading}
              style={{
                background: downloaded ? "#1b5e20" : "#e53935",
                color: "#fff", border: "none", borderRadius: 6,
                padding: "10px 16px", cursor: videoUrl ? "pointer" : "not-allowed",
                fontSize: 13, fontWeight: 700, fontFamily: "monospace",
                opacity: (!videoUrl || loading) ? 0.5 : 1,
                transition: "background 0.3s",
              }}>
              {downloaded ? "✓ Downloading!" : "⬇ Download MP4"}
            </button>
            <a href={`${IA_BASE}/details/${movie.identifier}`} target="_blank" rel="noreferrer"
              style={{ color: "#555", fontSize: 11, textAlign: "center", fontFamily: "monospace", textDecoration: "none" }}>
              View on Archive.org ↗
            </a>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function FreeStream() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const debounceRef = useRef(null);

  const fetchMovies = useCallback(async (q, genre, pg, append = false) => {
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      const results = await searchMovies(q, genre, pg);
      if (append) setMovies(prev => [...prev, ...results]);
      else setMovies(results);
      setHasMore(results.length === 20);
    } catch {
      setMovies([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchMovies(searchQuery, activeGenre, 1, false);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, activeGenre, fetchMovies]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMovies(searchQuery, activeGenre, nextPage, true);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080808",
      color: "#fff",
      fontFamily: "system-ui, sans-serif",
    }}>
      {/* Hero Header */}
      <div style={{
        background: "linear-gradient(180deg, #1a0000 0%, #0d0000 60%, #080808 100%)",
        borderBottom: "1px solid #1e0000",
        padding: "28px 24px 20px",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              background: "#e53935", color: "#fff",
              fontWeight: 900, fontSize: 22, padding: "4px 14px",
              borderRadius: 4, fontFamily: "monospace", letterSpacing: 2,
            }}>FREE</div>
            <div style={{ fontFamily: "'Georgia', serif", fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>
              Stream <span style={{ color: "#555", fontSize: 14, fontWeight: 400, fontFamily: "monospace" }}>— Public Domain Cinema</span>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: "relative", maxWidth: 520 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: 16 }}>🔍</span>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search movies, directors, genres..."
              style={{
                width: "100%", padding: "12px 16px 12px 42px",
                background: "#111", border: "1px solid #2a2a2a",
                borderRadius: 8, color: "#fff", fontSize: 14,
                outline: "none", boxSizing: "border-box",
                fontFamily: "monospace",
              }}
            />
          </div>
        </div>
      </div>

      {/* Genre Pills */}
      <div style={{ borderBottom: "1px solid #111", background: "#0a0a0a" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", gap: 4, overflowX: "auto", padding: "12px 0", scrollbarWidth: "none" }}>
            {GENRES.map(g => (
              <button key={g} onClick={() => setActiveGenre(g)}
                style={{
                  padding: "6px 16px", borderRadius: 20, border: "none",
                  background: activeGenre === g ? "#e53935" : "#161616",
                  color: activeGenre === g ? "#fff" : "#666",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  whiteSpace: "nowrap", fontFamily: "monospace",
                  transition: "all 0.2s",
                }}>
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 16 }}>
            <div style={{ width: 48, height: 48, border: "3px solid #1a1a1a", borderTop: "3px solid #e53935", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <div style={{ color: "#444", fontFamily: "monospace", fontSize: 13 }}>Fetching movies from the archive...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : movies.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#444" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
            <div style={{ fontFamily: "monospace" }}>No movies found. Try a different search.</div>
          </div>
        ) : (
          <>
            <div style={{ color: "#444", fontSize: 12, fontFamily: "monospace", marginBottom: 16 }}>
              Showing {movies.length} free, legal movies · Powered by Internet Archive
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 16,
            }}>
              {movies.map(m => (
                <MovieCard key={m.identifier} movie={m} onClick={setSelectedMovie} />
              ))}
            </div>

            {hasMore && (
              <div style={{ textAlign: "center", marginTop: 32 }}>
                <button onClick={loadMore} disabled={loadingMore}
                  style={{
                    background: "transparent", border: "1px solid #333",
                    color: "#666", padding: "12px 32px", borderRadius: 6,
                    cursor: "pointer", fontFamily: "monospace", fontSize: 13,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#e53935"; e.currentTarget.style.color = "#e53935"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = "#666"; }}
                >
                  {loadingMore ? "Loading..." : "Load More Movies"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #111", padding: "20px 24px", textAlign: "center" }}>
        <div style={{ color: "#333", fontSize: 11, fontFamily: "monospace" }}>
          All content sourced from Internet Archive · Public domain & freely licensed films only · 100% legal
        </div>
      </div>

      {selectedMovie && <PlayerModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
    </div>
  );
}
