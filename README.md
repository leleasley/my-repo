# LeLibrary — TorBox Stremio Addon

A Stremio addon that displays your personal **TorBox** catalog (torrents and usenet) with metadata from TMDB.

### ✨ Features

- 📂 **Movies, Series & Anime Catalogs** — three separate catalogs for all your TorBox content
- 🍥 **Anime Catalog** — auto-detected via TMDB (Japanese original language + Animation genre)
- 🌐 **TMDB Metadata** — title, synopsis, poster, backdrop, cast, director, trailer and IMDB rating
- 📅 **Sorting** by date added, release date, or title
- 🔍 **Search** within your catalog
- ▶️ **Direct Playback** — streams directly from TorBox CDN
- 🎯 **Precise episode filtering** — only episodes you actually own are shown (individual episodes, full seasons, or packs)
- 📦 **Multi-episode pack support** — `S02E02-03` filenames correctly mapped
- 🏷️ **Rich stream info** — quality (🎞️ 4K / 🎞️ FHD / 💿 HD), codec, HDR/Dolby Vision, source, language, audio, size and release group
- 🔀 **Smart stream sorting** — PT-BR language → subtitled → quality → size
- 🔒 **Catalog-only streams** — does not respond to external addon requests (Cinemeta, etc.)
- ⚡ Supports **Torrents and Usenet**
- 🗄️ **Redis Cache** — persistent cache with automatic invalidation on new downloads
- 🔄 **Smart background refresh** — rebuilds catalog only when downloads change
- 🩺 **`/health` endpoint**
- 🐳 **Docker ready**

---

### 🚀 Quick Deploy

#### Option 1 — Vercel (recommended, free)

[![Deploy with Vercel](https://camo.githubusercontent.com/7015516519ae874ab75537283bc75f86b3d46386ed994093a3790a1180913164/68747470733a2f2f76657263656c2e636f6d2f627574746f6e)](https://vercel.com/new/clone?repository-url=https://github.com/leleasley/my-repo)

Set `REDIS_URL` optionally for persistent cache. **Addon URL:** `https://your-project.vercel.app`

#### Option 2 — Render (free)

Fork → [render.com](https://render.com) → New Web Service → connect repo. **Addon URL:** `https://your-project.onrender.com`

#### Option 3 — Docker

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
      #- CACHE_TTL_CATALOG=3600
      #- CACHE_TTL_STREAM=21600
      #- REDIS_URL=rediss://default:password@host.upstash.io:6379
      #- REDIS_HOST=redis
      #- REDIS_PORT=6379
      #- REDIS_PASSWORD=
      #- REDIS_TLS=false
```

---

### ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `7860` | Server port |
| `CACHE_TTL_CATALOG` | `3600` | Catalog cache TTL (seconds) |
| `CACHE_TTL_STREAM` | `21600` | Stream cache TTL (seconds) |
| `REDIS_URL` | — | Full Redis URL (`redis://` or `rediss://`) |
| `UPSTASH_REDIS_URL` | — | Alias for `REDIS_URL` (compatibility) |
| `REDIS_HOST` | — | Redis host (alternative to URL) |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | — | Redis password |
| `REDIS_TLS` | `false` | Enable TLS (auto-detected for `rediss://` URLs) |

---

### 🗄️ Redis Cache

| Data | Default TTL |
|---|---|
| Catalog | 1 hour (`CACHE_TTL_CATALOG`) |
| Streams | 6 hours (`CACHE_TTL_STREAM`) |
| Metadata | 24 hours |
| Download hash | 2 hours |

**Auto-invalidation:** on every catalog request, a hash of the download list is compared to the cached value. If new files are detected, the catalog cache is invalidated and rebuilt immediately.

---

### 🐛 Troubleshooting

**Empty catalog:** check API keys and confirm completed downloads in TorBox (`completed`, `seeding`, `cached`, `finalized`).

**Wrong episodes showing:** call `/cache/clear` to force a full cache rebuild.

**Streams not showing:** TorBox links are signed and expire; reopen the title to generate new ones. Supported formats: `.mkv`, `.mp4`, `.avi`, `.mov`, `.m4v`, `.ts`, `.wmv`, `.webm`.

**Anime in Series (or vice versa):** detection uses TMDB — only titles with Japanese original language + Animation genre go to the Anime catalog.

---

### 📄 License

MIT
