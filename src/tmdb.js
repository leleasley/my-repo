const axios = require('axios');
const NodeCache = require('node-cache');

const TMDB_BASE  = 'https://api.themoviedb.org/3';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p';

const tmdbCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600, useClones: false });

function tmdbAuth(apiKey) {
  if (!apiKey) return { headers: {}, params: {} };
  // TMDB agora aceita apenas Bearer token ou api_key v3
  // Se começa com 'eyJ' é JWT Bearer, senão é api_key v3
  if (apiKey.startsWith('eyJ')) {
    return { headers: { Authorization: `Bearer ${apiKey}` }, params: {} };
  }
  // API key v3 vai como parâmetro
  return { headers: {}, params: { api_key: apiKey } };
}

// Converte IMDB ID → { tmdbId, type }
async function imdbToTmdb(apiKey, imdbId) {
  const auth = tmdbAuth(apiKey);
  try {
    const res = await axios.get(`${TMDB_BASE}/find/${imdbId}`, {
      headers: auth.headers,
      params: { ...auth.params, external_source: 'imdb_id' },
    });
    const d = res.data;
    if (d.movie_results?.length > 0) return { tmdbId: d.movie_results[0].id, type: 'movie' };
    if (d.tv_results?.length > 0)    return { tmdbId: d.tv_results[0].id,    type: 'series' };
    return null;
  } catch { return null; }
}

async function searchMetadata(apiKey, query, type, year, lang = 'pt-BR') {
  const cacheKey = `search:${type}:${lang}:${query}:${year || ''}`;
  const cached = tmdbCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const endpoint = type === 'movie' ? '/search/movie' : '/search/tv';
  const auth   = tmdbAuth(apiKey);
  const region = lang.split('-')[1] || 'BR';
  const params = { ...auth.params, query, language: lang, region, page: 1 };
  if (year) params.year = year;

  const res = await axios.get(`${TMDB_BASE}${endpoint}`, { headers: auth.headers, params });
  const result = res.data?.results?.[0];
  if (!result) { tmdbCache.set(cacheKey, null); return null; }

  result.isJapaneseAnimation =
    result.original_language === 'ja' &&
    (result.genre_ids || []).includes(16);

  tmdbCache.set(cacheKey, result);
  return result;
}

async function fetchSeasonVideos(auth, tmdbId, season, lang, fallbackPoster) {
  try {
    const res = await axios.get(`${TMDB_BASE}/tv/${tmdbId}/season/${season.season_number}`, {
      headers: auth.headers,
      params: { ...auth.params, language: lang },
      timeout: 8000,
    });
    const eps = res.data?.episodes || [];
    return eps.map(ep => ({
      id:        `torbox:series:${tmdbId}:${season.season_number}:${ep.episode_number}`,
      title:     ep.name || `Episódio ${ep.episode_number}`,
      season:    season.season_number,
      episode:   ep.episode_number,
      overview:  ep.overview || '',
      thumbnail: ep.still_path
        ? `${TMDB_IMAGE}/w300${ep.still_path}`
        : (season.poster_path ? `${TMDB_IMAGE}/w300${season.poster_path}` : fallbackPoster),
      released:  ep.air_date ? new Date(ep.air_date).toISOString() : undefined,
      rating:    ep.vote_average?.toFixed(1),
    }));
  } catch {
    return [{
      id:      `torbox:series:${tmdbId}:${season.season_number}:1`,
      title:   season.name || `Temporada ${season.season_number}`,
      season:  season.season_number,
      episode: 1,
      poster:  season.poster_path ? `${TMDB_IMAGE}/w500${season.poster_path}` : fallbackPoster,
      released: season.air_date ? new Date(season.air_date).toISOString() : undefined,
    }];
  }
}

async function getMetadata(apiKey, tmdbId, type, lang = 'pt-BR') {
  const cacheKey = `meta:${type}:${tmdbId}:${lang}`;
  const cached = tmdbCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
  const auth = tmdbAuth(apiKey);
  const baseParams = { ...auth.params, language: lang };

  const [detailRes, creditsRes, externalRes] = await Promise.allSettled([
    axios.get(`${TMDB_BASE}${endpoint}`, { headers: auth.headers, params: { ...baseParams, append_to_response: 'videos,images' }, timeout: 10000 }),
    axios.get(`${TMDB_BASE}${endpoint}/credits`, { headers: auth.headers, params: baseParams, timeout: 8000 }),
    axios.get(`${TMDB_BASE}${endpoint}/external_ids`, { headers: auth.headers, params: auth.params, timeout: 8000 }),
  ]);

  const detail   = detailRes.status   === 'fulfilled' ? detailRes.value.data   : null;
  const credits  = creditsRes.status  === 'fulfilled' ? creditsRes.value.data  : null;
  const external = externalRes.status === 'fulfilled' ? externalRes.value.data : null;
  if (!detail) return null;

  const imdbId    = external?.imdb_id || null;
  const cast      = (credits?.cast || []).slice(0, 20).map(c => c.name);
  const directors = type === 'movie'
    ? (credits?.crew || []).filter(c => c.job === 'Director').map(c => c.name)
    : (detail.created_by || []).map(c => c.name);
  const writers   = (credits?.crew || []).filter(c => c.job === 'Writer').map(c => c.name);

  const networks = (detail.networks || []).map(n => n.name);
  const productionCompanies = (detail.production_companies || []).map(c => c.name);

  // Nuvio app_extras for richer metadata
  const appExtras = {};
  const richCast = (credits?.cast || []).slice(0, 50).map(c => ({
    name: c.name,
    character: c.character || undefined,
    photo: c.profile_path ? `${TMDB_IMAGE}/w185${c.profile_path}` : undefined,
    tmdbId: c.id,
    url: `https://www.themoviedb.org/person/${c.id}`,
  }));
  if (richCast.length > 0) appExtras.cast = richCast;

  const richDirectors = type === 'movie'
    ? (credits?.crew || []).filter(c => c.job === 'Director').map(c => ({ name: c.name, url: `https://www.themoviedb.org/person/${c.id}` }))
    : (detail.created_by || []).map(c => ({ name: c.name, url: `https://www.themoviedb.org/person/${c.id}` }));
  if (richDirectors.length > 0) appExtras.directors = richDirectors;

  const richWriters = (credits?.crew || []).filter(c => c.job === 'Writer').map(c => ({ name: c.name, url: `https://www.themoviedb.org/person/${c.id}` }));
  if (richWriters.length > 0) appExtras.writers = richWriters;

  const certification = detail.content_ratings?.results?.find(r => r.iso_3166_1 === 'US')?.rating
    || detail.release_dates?.results?.find(r => r.iso_3166_1 === 'US')?.release_dates?.[0]?.certification
    || undefined;
  if (certification) appExtras.certification = certification;

  if (detail.release_dates) appExtras.releaseDates = detail.release_dates;

  let poster     = detail.poster_path   ? `${TMDB_IMAGE}/w500${detail.poster_path}`    : null;
  let background = detail.backdrop_path ? `${TMDB_IMAGE}/w1280${detail.backdrop_path}` : null;
  const langCode = lang.split('-')[0];
  const lp = detail.images?.posters?.find(p => p.iso_639_1 === langCode);
  if (lp) poster = `${TMDB_IMAGE}/w500${lp.file_path}`;

  const genres  = (detail.genres || []).map(g => g.name);
  const vids    = detail.videos?.results || [];
  const trailer = vids.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.iso_639_1 === langCode)
               || vids.find(v => v.type === 'Trailer' && v.site === 'YouTube');

  if (type === 'movie') {
    const links = [];
    if (imdbId) links.push({ name: 'IMDB', category: 'imdb', url: `https://www.imdb.com/title/${imdbId}` });
    for (const i of (credits?.cast || []).slice(0, 10)) links.push({ name: i.name, category: 'actor', url: `https://www.themoviedb.org/person/${i.id}` });
    for (const d of (type === 'movie' ? (credits?.crew || []).filter(c => c.job === 'Director') : (detail.created_by || []))) links.push({ name: d.name, category: 'director', url: `https://www.themoviedb.org/person/${d.id}` });
    for (const w of (credits?.crew || []).filter(c => c.job === 'Writer')) links.push({ name: w.name, category: 'writer', url: `https://www.themoviedb.org/person/${w.id}` });
    for (const n of networks.slice(0, 3)) links.push({ name: n, category: 'network', url: `https://www.themoviedb.org/movie/${tmdbId}` });
    for (const c of productionCompanies.slice(0, 3)) links.push({ name: c, category: 'production', url: `https://www.themoviedb.org/movie/${tmdbId}` });

    const slug = (detail.title || detail.original_title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const result = {
      id: `torbox:movie:${tmdbId}`, tmdbId, imdbId,
      imdb_id: imdbId || undefined,
      moviedb_id: tmdbId,
      type: 'movie',
      name: detail.title || detail.original_title,
      slug: `movie/${slug}-${tmdbId}`,
      year: detail.release_date?.split('-')[0],
      poster, background,
      description: detail.overview,
      runtime: detail.runtime ? `${detail.runtime} min` : undefined,
      genres, genre: genres, cast, director: directors, writer: writers,
      trailerStreams: trailer ? [{ title: 'Trailer', ytId: trailer.key }] : [],
      trailers: trailer ? [{ source: trailer.key, type: 'Trailer' }] : [],
      releaseInfo: detail.release_date?.split('-')[0],
      released: detail.release_date ? new Date(detail.release_date).toISOString() : undefined,
      imdbRating: detail.vote_average?.toFixed(1),
      country: (detail.production_countries || []).map(c => c.name).join(', ') || undefined,
      awards: detail.tagline || undefined,
      links,
      app_extras: Object.keys(appExtras).length > 0 ? appExtras : undefined,
      behaviorHints: { defaultVideoId: `torbox:movie:${tmdbId}` },
    };
    tmdbCache.set(cacheKey, result);
    return result;
  } else {
    const rawSeasons = (detail.seasons || []).filter(s => s.season_number > 0);
    const episodeLists = [];
    for (const s of rawSeasons) {
      episodeLists.push(await fetchSeasonVideos(auth, tmdbId, s, lang, poster));
    }
    const videos = episodeLists.flat();

    const links = [];
    if (imdbId) links.push({ name: 'IMDB', category: 'imdb', url: `https://www.imdb.com/title/${imdbId}` });
    for (const i of (credits?.cast || []).slice(0, 10)) links.push({ name: i.name, category: 'actor', url: `https://www.themoviedb.org/person/${i.id}` });
    for (const d of (detail.created_by || [])) links.push({ name: d.name, category: 'director', url: `https://www.themoviedb.org/person/${d.id}` });
    for (const w of (credits?.crew || []).filter(c => c.job === 'Writer')) links.push({ name: w.name, category: 'writer', url: `https://www.themoviedb.org/person/${w.id}` });
    for (const n of networks.slice(0, 3)) links.push({ name: n, category: 'network', url: `https://www.themoviedb.org/tv/${tmdbId}` });
    for (const c of productionCompanies.slice(0, 3)) links.push({ name: c, category: 'production', url: `https://www.themoviedb.org/tv/${tmdbId}` });

    const slug = (detail.name || detail.original_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const result = {
      id: `torbox:series:${tmdbId}`, tmdbId, imdbId,
      imdb_id: imdbId || undefined,
      moviedb_id: tmdbId,
      type: 'series',
      name: detail.name || detail.original_name,
      slug: `series/${slug}-${tmdbId}`,
      year: detail.first_air_date?.split('-')[0],
      poster, background,
      description: detail.overview,
      genres, genre: genres, cast, director: directors, writer: writers,
      trailerStreams: trailer ? [{ title: 'Trailer', ytId: trailer.key }] : [],
      trailers: trailer ? [{ source: trailer.key, type: 'Trailer' }] : [],
      releaseInfo: detail.first_air_date?.split('-')[0],
      released: detail.first_air_date ? new Date(detail.first_air_date).toISOString() : undefined,
      imdbRating: detail.vote_average?.toFixed(1),
      country: (detail.origin_countries || []).join(', ') || undefined,
      links,
      videos,
      status: detail.status,
      app_extras: Object.keys(appExtras).length > 0 ? appExtras : undefined,
      behaviorHints: { defaultVideoId: videos?.[0]?.id },
    };
    tmdbCache.set(cacheKey, result);
    return result;
  }
}

// TMDB ID → IMDB ID
async function tmdbToImdb(apiKey, tmdbId, type) {
  const auth = tmdbAuth(apiKey);
  const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
  try {
    const res = await axios.get(`${TMDB_BASE}${endpoint}/external_ids`, {
      headers: auth.headers,
      params: auth.params,
      timeout: 5000,
    });
    return res.data?.imdb_id || null;
  } catch { return null; }
}

module.exports = { searchMetadata, getMetadata, imdbToTmdb, tmdbToImdb };
