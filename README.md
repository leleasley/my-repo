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

---

## Quick Deploy

### Vercel (recommended, free)

[![Deploy with Vercel](https://camo.githubusercontent.com/7015516519ae874ab75537283bc75f86b3d46386ed994093a3790a1180913164/68747470733a2f2f76657263656c2e636f6d2f627574746f6e)](https://vercel.com/new/clone?repository-url=https://github.com/leleasley/my-repo)

No configuration needed. Your addon URL will be `https://your-project.vercel.app`.

Optional: set `REDIS_URL` as an environment variable in Vercel for persistent cache (e.g. from [Upstash](https://upstash.com)).

### Render (free)

1. Fork this repo
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your fork
4. It will auto-detect the Dockerfile — just hit **Deploy**

Your addon URL will be `https://your-project.onrender.com`.

### Docker (self-hosted)

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.

1. Clone the repo:

```bash
git clone https://github.com/leleasley/my-repo.git
cd my-repo
```

2. Copy the example env file and edit it:

```bash
cp .env.example .env
```

The `.env` file looks like this — you can leave the defaults for local use:

```
PORT=7860
REDIS_HOST=redis
REDIS_PORT=6379
```

3. Build and start:

```bash
docker compose up -d --build
```

4. Open the config page at `http://localhost:7860/configure` and enter your API keys.

That's it. The addon is running at `http://localhost:7860`.

**Useful commands:**

```bash
docker compose logs -f          # watch logs
docker compose restart          # restart after changes
docker compose down             # stop everything
docker compose up -d --build    # rebuild after code changes
```

---

## Environment Variables

All settings are optional — the addon works out of the box with defaults.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `7860` | Server port |
| `CACHE_TTL_CATALOG` | `3600` | How long catalog data is cached (seconds) |
| `CACHE_TTL_STREAM` | `21600` | How long stream data is cached (seconds) |
| `REDIS_HOST` | — | Redis host (set to `redis` when using Docker Compose) |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | — | Redis password (if required) |
| `REDIS_TLS` | `false` | Enable TLS for Redis connections |
| `REDIS_URL` | — | Full Redis URL (alternative to individual `REDIS_*` vars) |
| `UPSTASH_REDIS_URL` | — | Alias for `REDIS_URL` (Upstash compatibility) |

**Vercel / Render users:** set these as environment variables in your dashboard. No `.env` file needed.

**Docker users:** put them in the `.env` file in the project root.

---

## Cache Behavior

| Data | Default TTL |
|---|---|
| Catalog | 1 hour |
| Streams | 6 hours |
| Metadata | 24 hours |
| Download hash | 2 hours |

**Auto-invalidation:** On every catalog request, the addon compares a hash of your current downloads against the cached hash. If new files are detected, the catalog cache is invalidated and rebuilt immediately — no manual action needed.

---

## Troubleshooting

**Empty catalog**
Check that your API keys are correct. Make sure your TorBox downloads have finished — only `completed`, `seeding`, `cached`, or `finalized` downloads are shown.

**Wrong episodes showing**
Clear the cache by sending a POST request to `/cache/clear`, then reload your catalog in Stremio.

**Streams not appearing**
TorBox stream links are signed and expire after a few hours. Close and reopen the title in Stremio to generate fresh links.

**Anime appearing in Series (or vice versa)**
Anime detection uses TMDB — only titles with Japanese as the original language *and* the Animation genre are placed in the Anime catalog. If something seems off, it's how TMDB classifies the title.

**Can't install the addon**
Make sure you're using the full manifest URL from the config page. For Stremio Desktop, the URL must start with `stremio://`. For web, use the Stremio Web link.

---

## License

MIT
