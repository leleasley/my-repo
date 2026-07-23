const axios = require('axios');

const TORBOX_BASE = 'https://api.torbox.app/v1/api';

let usenetUnavailableLogged = false;

async function torboxGet(path, apiKey, params = {}) {
  if (!apiKey || apiKey.length < 10) {
    console.error('[TorBox] API key inválida ou ausente');
    return { error: 'API key inválida', status: 401 };
  }
  
  const headers = { Authorization: `Bearer ${apiKey}` };
  console.log(`[TorBox] Request: ${path} | Key: ...${apiKey.slice(-8)}`);
  
  try {
    const res = await axios.get(`${TORBOX_BASE}${path}`, { 
      headers, 
      params, 
      timeout: 20000,
      validateStatus: (status) => status < 500
    });
    return { data: res.data, status: res.status };
  } catch (err) {
    const status = err.response?.status ?? null;
    const message = err.response?.data?.detail || err.response?.data?.error || err.message;
    console.error(`[TorBox] Error ${status}: ${message}`);
    return { error: message, status };
  }
}

async function getTorBoxDownloads(apiKey) {
  const params = { bypass_cache: false };

  const [torrentsResult, usenetResult] = await Promise.all([
    torboxGet('/torrents/mylist', apiKey, params),
    torboxGet('/usenet/mylist',   apiKey, params),
  ]);

  let items = [];

  if (!torrentsResult.error) {
    const data = torrentsResult.data?.data;
    const list = Array.isArray(data) ? data : (data ? [data] : []);
    console.log(`[TorBox] Torrents: ${list.length} itens`);
    items = items.concat(list.map(t => ({ ...t, source: 'torrent' })));
  } else {
    const s = torrentsResult.status;
    if (s === 403) {
      console.error('[TorBox] Torrents: acesso negado (403). Verifique se a chave de API está correta e ativa.');
    } else if (s === 401) {
      console.error('[TorBox] Torrents: chave de API inválida (401).');
    } else {
      console.error(`[TorBox] Torrents: erro ${s ?? 'desconhecido'} — ${torrentsResult.error}`);
    }
  }

  if (!usenetResult.error) {
    const data = usenetResult.data?.data;
    const list = Array.isArray(data) ? data : (data ? [data] : []);
    console.log(`[TorBox] Usenet: ${list.length} itens`);
    items = items.concat(list.map(u => ({ ...u, source: 'usenet' })));
  } else {
    const s = usenetResult.status;
    if (s === 403 || s === 401) {
      if (!usenetUnavailableLogged) {
        console.log('[TorBox] Usenet: não disponível neste plano (ignorando).');
        usenetUnavailableLogged = true;
      }
    } else {
      console.error(`[TorBox] Usenet: erro ${s ?? 'desconhecido'} — ${usenetResult.error}`);
    }
  }

  console.log(`[TorBox] Total antes do filtro: ${items.length}`);

  const states = [...new Set(items.map(i => i.download_state))];
  if (states.length > 0) console.log(`[TorBox] Estados encontrados:`, states);

  const completed = items.filter(i => {
    const state = (i.download_state || '').toLowerCase();
    return (
      state === 'completed'  ||
      state === 'seeding'    ||
      state === 'cached'     ||
      state === 'finalized'  ||
      i.download_finished === true ||
      i.download_present === true
    );
  });

  console.log(`[TorBox] Itens concluídos: ${completed.length}`);
  if (completed.length > 0) {
    console.log(`[TorBox] Amostra:`, completed[0].name || completed[0].filename);
  }

  return completed;
}

async function getTorBoxStreamLink(apiKey, source, itemId, fileId) {
  const headers = { Authorization: `Bearer ${apiKey}` };
  const endpoint = source === 'torrent'
    ? `${TORBOX_BASE}/torrents/requestdl`
    : `${TORBOX_BASE}/usenet/requestdl`;

  const params = source === 'torrent'
    ? { token: apiKey, torrent_id: itemId, file_id: fileId, zip_link: false }
    : { token: apiKey, usenet_id: itemId,  file_id: fileId, zip_link: false };

  try {
    const res = await axios.get(endpoint, { headers, params, timeout: 10000 });
    return res.data?.data || null;
  } catch (err) {
    const s = err.response?.status;
    console.error(`[TorBox] requestdl erro ${s ?? '?'} (${source} id=${itemId} file=${fileId}): ${err.message}`);
    return null;
  }
}

async function getTorBoxFiles(apiKey, source, itemId) {
  const headers = { Authorization: `Bearer ${apiKey}` };
  const endpoint = source === 'torrent'
    ? `${TORBOX_BASE}/torrents/mylist`
    : `${TORBOX_BASE}/usenet/mylist`;

  try {
    const res = await axios.get(endpoint, {
      headers,
      params: { id: itemId, bypass_cache: false },
      timeout: 10000,
    });
    const data = res.data?.data;
    const item = Array.isArray(data) ? data[0] : data;
    return item?.files || [];
  } catch (err) {
    const s = err.response?.status;
    console.error(`[TorBox] Files erro ${s ?? '?'} (${source} id=${itemId}): ${err.message}`);
    return [];
  }
}

const VIDEO_EXTENSIONS = ['.mkv', '.mp4', '.avi', '.mov', '.m4v', '.ts', '.wmv', '.webm'];

function isVideoFile(name = '') {
  return VIDEO_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));
}

module.exports = { getTorBoxDownloads, getTorBoxStreamLink, getTorBoxFiles, isVideoFile };
