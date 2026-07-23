# 🎬 TB Media — TorBox Stremio Addon

> 🇧🇷 [Português](#português) · 🇺🇸 [English](#english)

---

## Português

Addon para o Stremio que exibe seu catálogo pessoal do **TorBox** (torrents e usenet) com metadados em **Português BR** obtidos do TMDB.

### ✨ Funcionalidades

- 📂 **Catálogo de Filmes, Séries e Animes** — exibe todo o conteúdo baixado no TorBox em três catálogos separados
- 🍥 **Catálogo de Animes** — detectado automaticamente via TMDB (idioma original japonês + gênero Animation), separado das séries normais
- 🇧🇷 **Metadados em PT-BR** — título, sinopse, pôster, backdrop, elenco, diretor, trailer e nota IMDB
- 📅 **Ordenação** por data de adição, data de lançamento ou título
- 🔍 **Busca** dentro do catálogo
- ▶️ **Reprodução direta** — ao clicar no título, as versões disponíveis no TorBox aparecem para play no Stremio
- 🎯 **Filtro preciso de episódios** — a tela de detalhes exibe apenas os episódios que você realmente tem no TorBox (episódios individuais, temporadas completas ou packs)
- 📦 **Suporte a packs multi-episódio** — arquivos no formato `S02E02-03` são mapeados corretamente
- 🏷️ **Streams detalhadas** — cada stream exibe qualidade (🎞️ 4K / 🎞️ FHD / 💿 HD), codec, HDR/Dolby Vision, source, idioma, áudio, tamanho e release group
- 🔀 **Ordenação inteligente de streams** — priorizadas por idioma PT-BR → legendado → qualidade → tamanho
- 🔒 **Streams exclusivas do catálogo próprio** — o addon não responde a buscas de outros addons (Cinemeta, etc.)
- ⚡ Suporte a **Torrents e Usenet** do TorBox
- 🗄️ **Cache Redis** — cache persistente com invalidação automática ao detectar novos downloads
- 🔄 **Background refresh inteligente** — em auto-hospedagem, o catálogo é atualizado automaticamente a cada 30 minutos, mas só reconstrói se houver mudança na lista de downloads
- 🩺 **Endpoint `/health`** — monitore o status do addon e do cache Redis
- 🐳 **Docker ready** — imagem oficial publicada no GHCR

---

### 🚀 Deploy Rápido

#### Opção 1 — Vercel (recomendado, grátis)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vinip1250-art/tbmedia)

1. Faça um fork/clone deste repositório no GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. Clique em **Deploy** (sem variáveis de ambiente obrigatórias — as chaves são configuradas pelo usuário no Stremio)
4. *(Opcional)* Configure `REDIS_URL` nas variáveis de ambiente para habilitar cache Redis persistente

**URL do addon:** `https://seu-projeto.vercel.app`

> 💡 Sem Redis configurado o addon funciona normalmente, apenas sem cache entre requests serverless.

---

#### Opção 2 — Render (grátis)

1. Faça um fork deste repositório no GitHub
2. Acesse [render.com](https://render.com) → New → Web Service
3. Conecte o repositório e clique em **Create Web Service**

**URL do addon:** `https://seu-projeto.onrender.com`

> ⚠️ No plano gratuito do Render, o serviço hiberna após inatividade. A primeira requisição pode demorar ~30s para acordar.

---

#### Opção 3 — Docker / Auto-hospedagem (recomendado para uso contínuo)

```yaml
# compose.yml
services:
  tbmedia:
    image: ghcr.io/vinip1250-art/tbmedia:latest
    container_name: tbmedia
    restart: unless-stopped
    ports:
      - "7860:7860"
    environment:
      - PORT=7860
      # TTL do cache em segundos (padrão: catálogo=3600, streams=21600)
      #- CACHE_TTL_CATALOG=3600
      #- CACHE_TTL_STREAM=21600
      # Redis via URL
      #- REDIS_URL=rediss://default:senha@host.upstash.io:6379
      # Redis local por partes
      #- REDIS_HOST=redis
      #- REDIS_PORT=6379
      #- REDIS_PASSWORD=
      #- REDIS_TLS=false
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:7860/"]
      interval: 30s
      timeout: 5s
      retries: 3
```

```bash
docker compose up -d
```

**URL do addon:** `http://seu-servidor:7860`

---

### 🔧 Configuração no Stremio

1. Abra o Stremio → **Configurações** → **Addons**
2. Cole a URL de configuração: `https://seu-projeto.vercel.app/configure`
3. Preencha:
   - **TorBox API Key** — obtenha em [torbox.app/settings/api](https://torbox.app/settings/api)
   - **TMDB API Key (v3)** — obtenha em [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
   - **Ordenar por** — Data de Adição, Data de Lançamento ou Título
4. Clique em **Instalar**

---

### ⚙️ Variáveis de Ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `7860` | Porta do servidor |
| `CACHE_TTL_CATALOG` | `3600` | TTL do cache de catálogo (segundos) |
| `CACHE_TTL_STREAM` | `21600` | TTL do cache de streams (segundos) |
| `REDIS_URL` | — | URL completa do Redis (`redis://` ou `rediss://`) |
| `UPSTASH_REDIS_URL` | — | Alias para `REDIS_URL` (compatibilidade) |
| `REDIS_HOST` | — | Host do Redis (alternativa à URL) |
| `REDIS_PORT` | `6379` | Porta do Redis |
| `REDIS_PASSWORD` | — | Senha do Redis |
| `REDIS_TLS` | `false` | Habilita TLS (auto-detectado em URLs `rediss://`) |

---

### 🗄️ Cache Redis

Suporta qualquer Redis compatível (Upstash, Redis local, etc.).

| Dado | TTL padrão |
|---|---|
| Catálogo | 1 hora (`CACHE_TTL_CATALOG`) |
| Streams | 6 horas (`CACHE_TTL_STREAM`) |
| Metadados (meta) | 24 horas |
| Hash de downloads | 2 horas |

**Invalidação automática:** a cada request de catálogo (e no background refresh), o addon compara um hash da lista de downloads com o valor em cache. Se houver novos arquivos, o cache do catálogo é invalidado e reconstruído imediatamente — sem esperar o TTL expirar.

Sem Redis configurado, o addon funciona normalmente sem cache persistente.

---

### 🛠️ Desenvolvimento Local

```bash
npm install
npm start      # porta 7860
npm run dev    # com hot-reload
```

> Requer **Node.js >= 24**.

---

### 📁 Estrutura do Projeto

```
tbmedia/
├── index.js          # Entry point local
├── app.js            # Express + rotas Stremio
├── api/server.js     # Entry point serverless (Vercel)
├── src/
│   ├── torbox.js     # Integração TorBox API
│   ├── tmdb.js       # Integração TMDB API (PT-BR)
│   ├── builder.js    # Catálogo, meta, streams + scoring
│   ├── parser.js     # Parser de nomes de arquivo
│   └── cache.js      # Camada Redis com fallback
├── configure.html    # Página de configuração
├── Dockerfile
├── compose.yml
└── vercel.json
```

---

### 🩺 Health Check

```
GET /health
```

```json
{
  "status": "ok",
  "cache": { "connected": true, "dbsize": 142 },
  "environment": "self-hosted",
  "version": "1.4.1"
}
```

---

### 🐛 Solução de Problemas

**Catálogo vazio:** verifique as chaves de API e se há downloads concluídos no TorBox (`completed`, `seeding`, `cached`, `finalized`).

**Episódios errados aparecendo:** acesse `/cache/clear` para forçar rebuild completo do cache.

**Streams não aparecem:** os links do TorBox são assinados e expiram; reabra o título para gerar novos. Formatos suportados: `.mkv`, `.mp4`, `.avi`, `.mov`, `.m4v`, `.ts`, `.wmv`, `.webm`.

**Animes nas Séries (ou vice-versa):** a detecção usa TMDB — somente títulos com idioma original japonês + gênero Animation vão para o catálogo de Animes.

---

---

## English

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

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vinip1250-art/tbmedia)

Set `REDIS_URL` optionally for persistent cache. **Addon URL:** `https://your-project.vercel.app`

#### Option 2 — Render (free)

Fork → [render.com](https://render.com) → New Web Service → connect repo. **Addon URL:** `https://your-project.onrender.com`

#### Option 3 — Docker

```yaml
services:
  tbmedia:
    image: ghcr.io/vinip1250-art/tbmedia:latest
    container_name: tbmedia
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
