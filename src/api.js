// ─── Internet Archive ───────────────────────────────────────────────────────
export async function searchArchive(query, genre, page = 1) {
  const pageSize = 20;
  const start = (page - 1) * pageSize;
  let q = 'mediatype:movies AND format:mp4';
  if (query) q += ` AND (title:(${query}) OR description:(${query}))`;
  if (genre && genre !== 'All') q += ` AND subject:(${genre})`;

  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}`
    + `&fl[]=identifier,title,description,year,subject,downloads`
    + `&sort[]=downloads+desc&rows=${pageSize}&start=${start}&output=json`;

  const res = await fetch(url);
  const data = await res.json();
  const docs = data.response?.docs || [];

  return docs.map(d => ({
    id: `ia-${d.identifier}`,
    identifier: d.identifier,
    title: d.title || d.identifier,
    year: d.year || '',
    description: Array.isArray(d.description) ? d.description[0] : d.description || '',
    genres: Array.isArray(d.subject) ? d.subject.slice(0, 3) : d.subject ? [d.subject] : [],
    poster: `https://archive.org/services/img/${d.identifier}`,
    source: 'archive',
    sourceName: 'Internet Archive',
  }));
}

export async function getArchiveVideo(identifier) {
  const res = await fetch(`https://archive.org/metadata/${identifier}`);
  const data = await res.json();
  const files = data.files || [];
  const mp4 = files
    .filter(f => f.name?.toLowerCase().endsWith('.mp4'))
    .sort((a, b) => (Number(b.size) || 0) - (Number(a.size) || 0))[0];
  return mp4 ? `https://archive.org/download/${identifier}/${encodeURIComponent(mp4.name)}` : null;
}

// ─── Open Movie Database (OMDb) ──────────────────────────────────────────────
// Using free public key — limited to 1000/day
const OMDB_KEY = 'trilogy'; // free demo key
export async function searchOMDb(query, page = 1) {
  if (!query) return [];
  const url = `https://www.omdbapi.com/?apikey=${OMDB_KEY}&s=${encodeURIComponent(query)}&page=${page}&type=movie`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.Response !== 'True') return [];
    return (data.Search || []).map(m => ({
      id: `omdb-${m.imdbID}`,
      imdbID: m.imdbID,
      title: m.Title,
      year: m.Year,
      description: '',
      genres: [],
      poster: m.Poster !== 'N/A' ? m.Poster : null,
      source: 'omdb',
      sourceName: 'OMDb',
    }));
  } catch { return []; }
}

// ─── Wikimedia Free Films ─────────────────────────────────────────────────────
export async function searchWikimedia(query, genre) {
  const term = query || genre !== 'All' ? (query || genre) : 'public domain film';
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search`
    + `&srsearch=${encodeURIComponent(term + ' film video')}&srnamespace=6`
    + `&srlimit=12&format=json&origin=*`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query?.search || [];
    return pages
      .filter(p => /\.(ogv|webm|mp4)/i.test(p.title))
      .map(p => {
        const fileName = p.title.replace('File:', '');
        const encoded = encodeURIComponent(fileName);
        return {
          id: `wiki-${p.pageid}`,
          wikiTitle: p.title,
          title: fileName.replace(/\.(ogv|webm|mp4)$/i, '').replace(/_/g, ' '),
          year: '',
          description: p.snippet?.replace(/<[^>]+>/g, '') || '',
          genres: [],
          poster: null,
          source: 'wikimedia',
          sourceName: 'Wikimedia Commons',
          videoUrl: `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}`,
        };
      });
  } catch { return []; }
}

// ─── Vimeo Public/Free (no auth needed for public embeds) ────────────────────
export async function searchVimeoFree(query) {
  // Vimeo oEmbed for known free film channels — returns embed-able players
  const channels = [
    'https://vimeo.com/channels/publicdomain',
    'https://vimeo.com/channels/freemovies',
  ];
  // We surface these as curated links rather than scraping
  return channels.map((c, i) => ({
    id: `vimeo-chan-${i}`,
    title: i === 0 ? 'Public Domain Channel' : 'Free Movies Channel',
    year: '',
    description: 'Curated free films on Vimeo',
    genres: ['Free'],
    poster: null,
    source: 'vimeo',
    sourceName: 'Vimeo',
    externalUrl: c,
  }));
}

// ─── Aggregate all sources ────────────────────────────────────────────────────
export async function searchAll(query, genre, page = 1) {
  const [archiveResults, omdbResults, wikiResults] = await Promise.allSettled([
    searchArchive(query, genre, page),
    query ? searchOMDb(query, page) : Promise.resolve([]),
    searchWikimedia(query, genre),
  ]);

  const archive = archiveResults.status === 'fulfilled' ? archiveResults.value : [];
  const omdb    = omdbResults.status === 'fulfilled'    ? omdbResults.value    : [];
  const wiki    = wikiResults.status === 'fulfilled'    ? wikiResults.value    : [];

  // Merge: archive first (has real video), then omdb (metadata), then wiki
  return [...archive, ...omdb, ...wiki];
}
