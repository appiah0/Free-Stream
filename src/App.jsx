import { useState, useEffect, useRef, useCallback } from 'react'
import { searchAll, getArchiveVideo } from './api'

const GENRES = ['All','Action','Adventure','Animation','Comedy','Crime',
  'Documentary','Drama','Fantasy','Horror','Mystery','Romance','Sci-Fi','Thriller','Western']

const SOURCE_COLORS = {
  archive:  { bg: '#1a3a1a', text: '#4caf50', label: 'Archive' },
  omdb:     { bg: '#1a1a3a', text: '#5c6bc0', label: 'OMDb' },
  wikimedia:{ bg: '#2a1a00', text: '#ff9800', label: 'Wiki' },
  vimeo:    { bg: '#1a0a1a', text: '#ab47bc', label: 'Vimeo' },
}

// ── Movie Card ────────────────────────────────────────────────────────────────
function MovieCard({ movie, onClick }) {
  const [imgErr, setImgErr] = useState(false)
  const sc = SOURCE_COLORS[movie.source] || SOURCE_COLORS.archive

  return (
    <div
      onClick={() => onClick(movie)}
      className="movie-card"
      style={{ cursor:'pointer', borderRadius:10, overflow:'hidden',
        background:'#111', border:'1px solid #1e1e1e', position:'relative',
        transition:'transform .2s,box-shadow .2s' }}
    >
      <div style={{ position:'relative', paddingTop:'150%', background:'#161616' }}>
        {movie.poster && !imgErr
          ? <img src={movie.poster} alt={movie.title} onError={()=>setImgErr(true)}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover' }} />
          : <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',
              justifyContent:'center',fontSize:48,color:'#2a2a2a' }}>🎬</div>
        }
        <div style={{ position:'absolute',bottom:0,left:0,right:0,
          background:'linear-gradient(transparent,rgba(0,0,0,.97))',padding:'40px 10px 10px' }}>
          <div style={{ color:'#f5f5f5',fontSize:13,fontWeight:700,
            fontFamily:"'Bebas Neue',cursive",letterSpacing:.5,lineHeight:1.2 }}>
            {movie.title}
          </div>
          {movie.year && <div style={{ color:'#e53935',fontSize:11,marginTop:2,fontFamily:'monospace' }}>{movie.year}</div>}
        </div>
        <div style={{ position:'absolute',top:8,left:8,background:sc.bg,
          color:sc.text,fontSize:9,fontWeight:800,padding:'2px 7px',
          borderRadius:4,fontFamily:'monospace',letterSpacing:.5 }}>
          {sc.label}
        </div>
        {movie.source === 'archive' &&
          <div style={{ position:'absolute',top:8,right:8,background:'#e53935',
            color:'#fff',fontSize:9,fontWeight:800,padding:'2px 7px',
            borderRadius:4,fontFamily:'monospace' }}>FREE</div>
        }
      </div>
    </div>
  )
}

// ── Player Modal ──────────────────────────────────────────────────────────────
function PlayerModal({ movie, onClose }) {
  const [videoUrl, setVideoUrl] = useState(movie.videoUrl || null)
  const [loading,  setLoading]  = useState(!movie.videoUrl && !movie.externalUrl)
  const [error,    setError]    = useState(null)
  const [dlDone,   setDlDone]   = useState(false)

  useEffect(() => {
    if (movie.videoUrl || movie.externalUrl) return
    if (movie.source !== 'archive') {
      setError('Direct streaming not available for this source. Use the external link below.')
      setLoading(false)
      return
    }
    getArchiveVideo(movie.identifier).then(url => {
      if (url) setVideoUrl(url)
      else setError('No playable file found for this title.')
      setLoading(false)
    }).catch(() => { setError('Failed to load video.'); setLoading(false) })
  }, [movie])

  const download = () => {
    if (!videoUrl) return
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = `${movie.title}.mp4`
    a.target = '_blank'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setDlDone(true); setTimeout(() => setDlDone(false), 3000)
  }

  const desc = typeof movie.description === 'string' ? movie.description : ''

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.93)',
      zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',
      padding:16,backdropFilter:'blur(8px)' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#0d0d0d',
        border:'1px solid #222',borderRadius:14,width:'100%',maxWidth:900,
        boxShadow:'0 32px 100px rgba(0,0,0,.9)',overflow:'hidden',
        maxHeight:'90vh',overflowY:'auto' }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',
          padding:'16px 20px',borderBottom:'1px solid #1e1e1e',gap:12 }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:1,color:'#fff' }}>
              {movie.title}
            </div>
            <div style={{ display:'flex',gap:8,marginTop:4,alignItems:'center' }}>
              {movie.year && <span style={{ color:'#e53935',fontSize:12,fontFamily:'monospace' }}>{movie.year}</span>}
              <span style={{ color:'#444',fontSize:12,fontFamily:'monospace' }}>·</span>
              <span style={{ color:'#555',fontSize:11,fontFamily:'monospace' }}>{movie.sourceName}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'1px solid #2a2a2a',
            color:'#888',borderRadius:6,padding:'7px 14px',cursor:'pointer',
            fontSize:12,fontFamily:'monospace',whiteSpace:'nowrap' }}>✕ Close</button>
        </div>

        {/* Player area */}
        <div style={{ background:'#000',position:'relative',paddingTop:'56.25%' }}>
          {loading && (
            <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'center',gap:14 }}>
              <div style={{ width:44,height:44,border:'3px solid #222',
                borderTop:'3px solid #e53935',borderRadius:'50%',
                animation:'spin .8s linear infinite' }} />
              <div style={{ color:'#555',fontSize:13,fontFamily:'monospace' }}>Loading from {movie.sourceName}…</div>
            </div>
          )}
          {error && !videoUrl && (
            <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'center',gap:10,padding:24 }}>
              <div style={{ fontSize:40 }}>📽️</div>
              <div style={{ color:'#e53935',fontSize:13,fontFamily:'monospace',textAlign:'center' }}>{error}</div>
              {movie.externalUrl && (
                <a href={movie.externalUrl} target="_blank" rel="noreferrer"
                  style={{ color:'#5c6bc0',fontSize:12,fontFamily:'monospace' }}>
                  Open on {movie.sourceName} ↗
                </a>
              )}
            </div>
          )}
          {videoUrl && !loading && (
            <video controls autoPlay src={videoUrl}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%' }}
              onError={() => setError('Video failed to play.')} />
          )}
          {movie.externalUrl && !videoUrl && !loading && !error && (
            <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'center',gap:12 }}>
              <div style={{ fontSize:40 }}>🔗</div>
              <a href={movie.externalUrl} target="_blank" rel="noreferrer"
                style={{ color:'#5c6bc0',fontSize:14,fontFamily:'monospace' }}>
                Watch on {movie.sourceName} ↗
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 20px',borderTop:'1px solid #1a1a1a',
          display:'flex',gap:16,alignItems:'flex-start',flexWrap:'wrap' }}>
          <div style={{ flex:1,minWidth:180 }}>
            {desc && <p style={{ color:'#666',fontSize:12,lineHeight:1.7,fontFamily:"'DM Sans',sans-serif" }}>
              {desc.slice(0,280)}{desc.length>280?'…':''}
            </p>}
            {movie.genres?.length > 0 && (
              <div style={{ display:'flex',flexWrap:'wrap',gap:4,marginTop:10 }}>
                {movie.genres.map((g,i)=>(
                  <span key={i} style={{ background:'#1a1a1a',color:'#555',
                    fontSize:10,padding:'2px 8px',borderRadius:10,fontFamily:'monospace' }}>{g}</span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display:'flex',flexDirection:'column',gap:8,minWidth:140 }}>
            {videoUrl && (
              <button onClick={download} style={{ background:dlDone?'#1b5e20':'#e53935',
                color:'#fff',border:'none',borderRadius:7,padding:'10px 16px',
                cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'monospace',
                transition:'background .3s' }}>
                {dlDone ? '✓ Downloading!' : '⬇ Download MP4'}
              </button>
            )}
            {movie.identifier && (
              <a href={`https://archive.org/details/${movie.identifier}`}
                target="_blank" rel="noreferrer"
                style={{ color:'#444',fontSize:11,textAlign:'center',
                  fontFamily:'monospace',textDecoration:'none' }}>
                View on Archive.org ↗
              </a>
            )}
            {movie.imdbID && (
              <a href={`https://www.imdb.com/title/${movie.imdbID}`}
                target="_blank" rel="noreferrer"
                style={{ color:'#f5c518',fontSize:11,textAlign:'center',
                  fontFamily:'monospace',textDecoration:'none' }}>
                View on IMDb ↗
              </a>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [movies,   setMovies]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [query,    setQuery]    = useState('')
  const [genre,    setGenre]    = useState('All')
  const [page,     setPage]     = useState(1)
  const [hasMore,  setHasMore]  = useState(true)
  const [moreLoad, setMoreLoad] = useState(false)
  const [selected, setSelected] = useState(null)
  const [stats,    setStats]    = useState({ archive:0, omdb:0, wiki:0 })
  const debounce = useRef(null)

  const load = useCallback(async (q, g, pg, append=false) => {
    if (pg===1) setLoading(true); else setMoreLoad(true)
    try {
      const results = await searchAll(q, g, pg)
      const counts = results.reduce((acc,m)=>({ ...acc, [m.source]:(acc[m.source]||0)+1 }),{})
      setStats(s => pg===1 ? counts : { archive:(s.archive||0)+(counts.archive||0),
        omdb:(s.omdb||0)+(counts.omdb||0), wiki:(s.wiki||0)+(counts.wiki||0) })
      if (append) setMovies(prev=>[...prev,...results])
      else setMovies(results)
      setHasMore(results.length >= 18)
    } catch { if (!append) setMovies([]) }
    finally { setLoading(false); setMoreLoad(false) }
  }, [])

  useEffect(() => {
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => { setPage(1); load(query, genre, 1, false) }, 450)
    return () => clearTimeout(debounce.current)
  }, [query, genre, load])

  const loadMore = () => {
    const next = page + 1; setPage(next); load(query, genre, next, true)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#080808', fontFamily:"'DM Sans',sans-serif" }}>

      {/* ── Hero ── */}
      <div style={{ background:'linear-gradient(160deg,#1a0000 0%,#0d0000 50%,#080808 100%)',
        borderBottom:'1px solid #1a0000', padding:'32px 24px 24px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:8 }}>
            <div style={{ background:'#e53935', color:'#fff', fontFamily:"'Bebas Neue',cursive",
              fontSize:28, letterSpacing:3, padding:'2px 14px', borderRadius:5 }}>FREE</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:32, letterSpacing:2, color:'#fff' }}>
              STREAM
            </div>
            <div style={{ color:'#333', fontSize:12, fontFamily:'monospace', marginLeft:4 }}>
              multi-source cinema
            </div>
          </div>

          {/* Source badges */}
          <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
            {[
              { label:'Internet Archive', color:'#4caf50', count: stats.archive },
              { label:'OMDb',             color:'#5c6bc0', count: stats.omdb   },
              { label:'Wikimedia',        color:'#ff9800', count: stats.wiki   },
            ].map(s => (
              <div key={s.label} style={{ background:'#111', border:`1px solid ${s.color}22`,
                borderRadius:20, padding:'3px 12px', display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:6,height:6,borderRadius:'50%',background:s.color }} />
                <span style={{ color:'#666', fontSize:11, fontFamily:'monospace' }}>{s.label}</span>
                {s.count>0 && <span style={{ color:s.color, fontSize:10, fontFamily:'monospace' }}>{s.count}</span>}
              </div>
            ))}
          </div>

          {/* Search */}
          <div style={{ position:'relative', maxWidth:560 }}>
            <span style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',
              color:'#444', fontSize:16 }}>🔍</span>
            <input value={query} onChange={e=>setQuery(e.target.value)}
              placeholder="Search movies, series, documentaries…"
              style={{ width:'100%', padding:'13px 16px 13px 44px',
                background:'#111', border:'1px solid #222', borderRadius:8,
                color:'#fff', fontSize:14, outline:'none',
                boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif" }} />
            {query && <button onClick={()=>setQuery('')}
              style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',
                background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:18 }}>×</button>}
          </div>
        </div>
      </div>

      {/* ── Genre pills ── */}
      <div style={{ background:'#0a0a0a', borderBottom:'1px solid #111' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px' }}>
          <div style={{ display:'flex', gap:6, overflowX:'auto', padding:'12px 0', scrollbarWidth:'none' }}>
            {GENRES.map(g => (
              <button key={g} onClick={()=>setGenre(g)}
                style={{ padding:'6px 16px', borderRadius:20, border:'none',
                  background: genre===g ? '#e53935' : '#161616',
                  color: genre===g ? '#fff' : '#555',
                  fontSize:12, fontWeight:600, cursor:'pointer',
                  whiteSpace:'nowrap', fontFamily:'monospace',
                  transition:'all .2s' }}>
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px' }}>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', padding:'100px 0', gap:16 }}>
            <div style={{ width:52, height:52, border:'3px solid #1a1a1a',
              borderTop:'3px solid #e53935', borderRadius:'50%',
              animation:'spin .8s linear infinite' }} />
            <div style={{ color:'#444', fontFamily:'monospace', fontSize:13 }}>
              Searching across all sources…
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : movies.length === 0 ? (
          <div style={{ textAlign:'center', padding:'100px 0', color:'#333' }}>
            <div style={{ fontSize:56, marginBottom:12 }}>🎬</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, letterSpacing:2 }}>No results found</div>
            <div style={{ color:'#333', fontSize:13, fontFamily:'monospace', marginTop:8 }}>Try a different search or genre</div>
          </div>
        ) : (
          <>
            <div style={{ color:'#333', fontSize:11, fontFamily:'monospace', marginBottom:18 }}>
              {movies.length} titles found across {Object.values(stats).filter(Boolean).length} sources
            </div>
            <div style={{ display:'grid',
              gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:14 }}>
              {movies.map(m => (
                <MovieCard key={m.id} movie={m} onClick={setSelected} />
              ))}
            </div>
            {hasMore && (
              <div style={{ textAlign:'center', marginTop:36 }}>
                <button onClick={loadMore} disabled={moreLoad}
                  style={{ background:'transparent', border:'1px solid #222',
                    color:'#555', padding:'13px 40px', borderRadius:7,
                    cursor:'pointer', fontFamily:'monospace', fontSize:13,
                    transition:'all .2s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#e53935';e.currentTarget.style.color='#e53935'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='#222';e.currentTarget.style.color='#555'}}>
                  {moreLoad ? 'Loading…' : 'Load More →'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop:'1px solid #111', padding:'20px 24px', textAlign:'center', marginTop:24 }}>
        <div style={{ color:'#2a2a2a', fontSize:11, fontFamily:'monospace' }}>
          Powered by Internet Archive · OMDb · Wikimedia Commons · 100% free & legal
        </div>
      </div>

      {selected && <PlayerModal movie={selected} onClose={()=>setSelected(null)} />}

      <style>{`
        .movie-card:hover { transform:scale(1.04)!important; box-shadow:0 8px 32px rgba(229,57,53,.25)!important; }
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#111}
        ::-webkit-scrollbar-thumb{background:#e53935;border-radius:2px}
      `}</style>
    </div>
  )
}
