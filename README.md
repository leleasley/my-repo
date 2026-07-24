<p align="center">
  <img src="public/LeLibrary.png" width="100" alt="LeLibrary">
</p>

<h1 align="center">LeLibrary</h1>

<p align="center">
  <strong>Your TorBox library. Organized. Enriched. Ready to watch.</strong><br>
  <sub>A Stremio & Nuvio addon that turns raw downloads into a browsable catalog with full TMDB metadata.</sub>
</p>

<p align="center">
  <a href="#quick-deploy">Deploy</a> ·
  <a href="#features">Features</a> ·
  <a href="#environment-variables">Config</a> ·
  <a href="#troubleshooting">Troubleshooting</a> ·
  <a href="https://github.com/leleasley/my-repo">GitHub</a>
</p>

---

## What does it do?

You download movies, series, and anime through TorBox. LeLibrary takes those files and:

- **Groups episodes** into seasons automatically (even multi-episode packs like `S02E02-03`)
- **Enriches everything** with TMDB metadata — posters, backdrops, ratings, cast, trailers
- **Detects anime** via TMDB (Japanese original language + Animation genre)
- **Shows only what you own** — no phantom episodes, no missing files
- **Formats streams** with quality, codec, HDR, audio, size, and release group info
- **Plays directly** from TorBox CDN (or Real-Debrid)

Three catalogs appear in Stremio/Nuvio: **Movies**, **Series**, **Anime**.

---

## Features

| Feature | Details |
|---|---|
| **Three catalogs** | Movies, Series, Anime — separated automatically |
| **Anime detection** | TMDB-based: Japanese language + Animation genre |
| **TMDB metadata** | Title, synopsis, poster, backdrop, cast, director, trailer, IMDB rating |
| **Sorting** | Date added, release date, or title (A–Z) |
| **Search** | Full-text search within your catalog |
| **Direct playback** | Streams from TorBox CDN — no debrid needed |
| **Episode filtering** | Only shows episodes you actually have (individual, seasons, or packs) |
| **Multi-episode packs** | `S02E02-03` correctly mapped to individual episodes |
| **Stream info** | Quality (4K/FHD/HD), codec, HDR/DV, source, language, audio, size, group |
| **Smart sorting** | PT-BR → subtitled → quality → size |
| **Catalog-only** | Won't respond to external addon requests (Cinemeta, etc.) |
| **Torrents + Usenet** | Both supported natively |
| **Real-Debrid** | Optional secondary source — merge or separate catalogs |
| **Redis cache** | Persistent with auto-invalidation on new downloads |
| **Background refresh** | Rebuilds catalog only when downloads change |
| **Docker ready** | One command to deploy |

---

## Quick Deploy

### Vercel (recommended, free)

[![Deploy with Vercel](https://camo.githubusercontent.com/7015516519ae874ab75537283bc75f86b3d46386ed994093a3790a1180913164/68747470733a2f2f76657263656c2e636f6d2f627574746f6e)](https://vercel.com/new/clone?repository-url=https://github.com/leleasley/my-repo)

Set `REDIS_URL` for persistent cache. Your addon URL will be `https://your-project.vercel.app`.

### Render (free)

Fork → [render.com](https://render.com) → New Web Service → connect your repo.

Your addon URL will be `https://your-project.onrender.com`.

### Docker

```bash
docker compose up -d
```

Or with `docker-compose.yml`:

```yaml
services:
  lelibrary:
    build: .
    container_name: lelibrary
    restart: unless-stopped
    ports:
      - "7860:7860"
    environment:
      - PORT=7860
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    container_name: lelibrary-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

---

## Environment Variables

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `7860` | Server port |
| `CACHE_TTL_CATALOG` | `3600` | Catalog cache TTL (seconds) |
| `CACHE_TTL_STREAM` | `21600` | Stream cache TTL (seconds) |
| `REDIS_URL` | — | Full Redis URL (`redis://` or `rediss://`) |
| `UPSTASH_REDIS_URL` | — | Alias for `REDIS_URL` |
| `REDIS_HOST` | — | Redis host (alternative to URL) |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | — | Redis password |
| `REDIS_TLS` | `false` | Enable TLS (auto-detected for `rediss://`) |

---

## Cache Behavior

| Data | TTL |
|---|---|
| Catalog | 1 hour |
| Streams | 6 hours |
| Metadata | 24 hours |
| Download hash | 2 hours |

**Auto-invalidation:** Every catalog request compares a hash of your downloads to the cached value. New files trigger an immediate rebuild.

---

## Troubleshooting

**Empty catalog** → Check your API keys. Make sure downloads in TorBox are completed (`completed`, `seeding`, `cached`, `finalized`).

**Wrong episodes** → Hit `/cache/clear` to force a full rebuild.

**Streams missing** → TorBox links are signed and expire. Reopen the title to generate new ones. Supported formats: `.mkv`, `.mp4`, `.avi`, `.mov`, `.m4v`, `.ts`, `.wmv`, `.webm`.

**Anime in Series** → Detection uses TMDB — only titles with Japanese original language + Animation genre go to the Anime catalog.

---

## License

MIT
