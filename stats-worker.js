/**
 * SecretV4 play counter and ratings (Cloudflare Worker + D1 database).
 *
 *   GET  /top      -> most played games:  { "top": [ { "id": 12, "n": 340 }, ... ] }
 *   GET  /ratings  -> rated games:        { "ratings": [ [id, up, down], ... ] }
 *   POST /play     -> counts one play:    body {"id": 12, "v": "<anonymous browser id>"}
 *   POST /rate     -> sets a vote:        body {"id": 12, "v": "<anonymous browser id>", "vote": 1 | -1 | 0}
 *   POST /pulse    -> "I'm online" check-in, returns any pending owner commands (see below)
 *   POST /admin/devices | /admin/send | /admin/label -> owner dashboard (needs the ADMIN_KEY secret)
 *
 * Nothing personal is stored. Each browser makes a random anonymous ID; only a scrambled (hashed)
 * version of it is kept, so one browser gets one vote per game and one play per game per 10 minutes.
 * Internet addresses are only used for a high safety limit and are kept (scrambled) for up to two hours.
 *
 * Owner dashboard: devices check in every 30 seconds with a scrambled ID, the page or game they are on
 * and a short browser name. No names, addresses or locations. The owner can queue ONLY the fixed
 * list of actions in ACTIONS below; the site never runs code sent from here.
 */
const COOLDOWN = 10 * 60;        // same browser + same game: one counted play per 10 minutes
const PLAYS_PER_PERSON_HOUR = 60; // one browser can add at most this many plays per hour
const IP_PLAYS_PER_HOUR = 3000;   // safety net per internet address (a whole school can share one)
const IP_VOTES_PER_HOUR = 1500;
const TOP_TTL = 60;               // seconds a ranking is reused before being recalculated
const RATINGS_TTL = 300;
const MIN_VOTES_SHARED = 3;       // games with fewer votes are not listed (the site needs 5 to show a score)
const MAX_ID = 100000;
const ONLINE_WINDOW = 180;        // a device counts as online if it checked in within this many seconds
const COMMAND_TTL = 120;          // commands older than this are never delivered
const ACTIONS = [
  'rickroll', 'message', 'close_game', 'close_tab', 'reload', 'give_all', 'give_one',
  // harmless temporary gags
  'confetti', 'emoji_rain', 'flip', 'invert', 'rainbow', 'shake', 'comic', 'banana', 'countdown_rickroll', 'random_game', 'stop_effects',
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...extra },
  });
}

async function scramble(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

const validToken = (t) => typeof t === 'string' && /^[A-Za-z0-9-]{16,64}$/.test(t);

/** Plain text only: no control characters, trimmed, limited length */
const clean = (v, max) =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

const clampInt = (v, max) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(max, Math.floor(Number(v)))) : 0);

function cleanInfo(info) {
  const i = info && typeof info === 'object' ? info : {};
  return { page: clean(i.page, 20), game: clean(i.game, 60), ua: clean(i.ua, 40), active: clampInt(i.active, 1e9), ach: clampInt(i.ach, 1000) };
}

const safeJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

/** Counts one request from this internet address this hour. False means the safety limit was hit. */
async function ipKey(ip, kind, now, salt) {
  return (await scramble(ip + salt)) + ':' + Math.floor(now / 3600) + ':' + kind;
}

async function underIpLimit(env, ip, kind, limit, now, salt) {
  const bucket = Math.floor(now / 3600);
  const k = await ipKey(ip, kind, now, salt);
  const row = await env.DB.prepare('SELECT n FROM ipcap WHERE k = ?').bind(k).first();
  if (row && row.n >= limit) return false;
  await env.DB.prepare('INSERT INTO ipcap (k, n, b) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1')
    .bind(k, bucket)
    .run();
  return true;
}

/** Rankings are saved for a short time so busy periods do not hammer the database. */
async function cached(env, key, ttl, now, build) {
  const row = await env.DB.prepare('SELECT v, t FROM snap WHERE k = ?').bind(key).first();
  if (row && now - row.t < ttl) return row.v;
  const v = JSON.stringify(await build());
  await env.DB.prepare('INSERT INTO snap (k, v, t) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, t = excluded.t')
    .bind(key, v, now)
    .run();
  return v;
}

/** Returns an error Response if the caller is not the owner, otherwise null */
async function adminGate(env, data, ip, now, salt) {
  if (!env.ADMIN_KEY) return json({ error: 'The dashboard is not set up yet (ADMIN_KEY is missing).' }, 503);
  const row = await env.DB.prepare('SELECT n FROM ipcap WHERE k = ?').bind(await ipKey(ip, 'admin', now, salt)).first();
  if (row && row.n >= 20) return json({ error: 'Too many wrong attempts. Try again in an hour.' }, 429);
  const given = await scramble('key:' + clean(String(data.key ?? ''), 200));
  const real = await scramble('key:' + env.ADMIN_KEY);
  if (given !== real) {
    await underIpLimit(env, ip, 'admin', 1000, now, salt); // counts the failed attempt
    return json({ error: 'Wrong key.' }, 401);
  }
  return null;
}

async function readBody(request) {
  try {
    return JSON.parse(await request.text()) || {};
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const now = Math.floor(Date.now() / 1000);
    const salt = env.SALT || ':secretv4';
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    try {
      if (url.pathname === '/top' && request.method === 'GET') {
        const body = await cached(env, 'top', TOP_TTL, now, async () => {
          const { results } = await env.DB.prepare('SELECT id, n FROM plays ORDER BY n DESC LIMIT 20').all();
          return { top: results };
        });
        return new Response(body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30', ...CORS } });
      }

      if (url.pathname === '/ratings' && request.method === 'GET') {
        const body = await cached(env, 'ratings', RATINGS_TTL, now, async () => {
          const { results } = await env.DB.prepare('SELECT id, up, down FROM ratings WHERE up + down >= ?')
            .bind(MIN_VOTES_SHARED)
            .all();
          return { ratings: results.map((r) => [r.id, r.up, r.down]) };
        });
        return new Response(body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120', ...CORS } });
      }

      if (url.pathname === '/play' && request.method === 'POST') {
        const data = await readBody(request);
        if (!data) return json({ error: 'bad request' }, 400);
        const id = Number(data.id);
        if (!Number.isInteger(id) || id < 1 || id > MAX_ID) return json({ error: 'bad id' }, 400);

        // One person = one anonymous browser ID. Without one, fall back to the internet address.
        const who = validToken(data.v) ? 't' + (await scramble(data.v + salt)) : 'i' + (await scramble(ip + salt));
        const key = who + ':' + id;

        const seen = await env.DB.prepare('SELECT t FROM recent WHERE k = ?').bind(key).first();
        if (seen && now - seen.t < COOLDOWN) return json({ ok: true, counted: false });

        const used = await env.DB.prepare('SELECT COUNT(*) AS c FROM recent WHERE k LIKE ? AND t > ?')
          .bind(who + ':%', now - 3600)
          .first();
        if (used && used.c >= PLAYS_PER_PERSON_HOUR) return json({ ok: true, counted: false });
        if (!(await underIpLimit(env, ip, 'play', IP_PLAYS_PER_HOUR, now, salt))) return json({ ok: true, counted: false });

        await env.DB.batch([
          env.DB.prepare('INSERT INTO recent (k, t) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET t = excluded.t').bind(key, now),
          env.DB.prepare('INSERT INTO plays (id, n) VALUES (?, 1) ON CONFLICT(id) DO UPDATE SET n = n + 1').bind(id),
        ]);
        await maybeCleanUp(env, now);
        return json({ ok: true, counted: true });
      }

      if (url.pathname === '/rate' && request.method === 'POST') {
        const data = await readBody(request);
        if (!data) return json({ error: 'bad request' }, 400);
        const id = Number(data.id);
        const vote = Number(data.vote);
        if (!Number.isInteger(id) || id < 1 || id > MAX_ID) return json({ error: 'bad id' }, 400);
        if (![1, -1, 0].includes(vote)) return json({ error: 'bad vote' }, 400);
        if (!validToken(data.v)) return json({ error: 'missing id' }, 400);

        const key = (await scramble(data.v + salt)) + ':' + id;
        const prev = await env.DB.prepare('SELECT v FROM votes WHERE k = ?').bind(key).first();
        const before = prev ? prev.v : 0;
        if (before === vote) return json({ ok: true, changed: false });
        if (!(await underIpLimit(env, ip, 'vote', IP_VOTES_PER_HOUR, now, salt))) return json({ ok: true, changed: false });

        const up = (vote === 1 ? 1 : 0) - (before === 1 ? 1 : 0);
        const down = (vote === -1 ? 1 : 0) - (before === -1 ? 1 : 0);
        await env.DB.batch([
          vote === 0
            ? env.DB.prepare('DELETE FROM votes WHERE k = ?').bind(key)
            : env.DB.prepare('INSERT INTO votes (k, v, t) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, t = excluded.t').bind(key, vote, now),
          env.DB.prepare(
            'INSERT INTO ratings (id, up, down) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET up = MAX(up + ?, 0), down = MAX(down + ?, 0)',
          ).bind(id, Math.max(up, 0), Math.max(down, 0), up, down),
        ]);
        return json({ ok: true, changed: true });
      }

      if (url.pathname === '/pulse' && request.method === 'POST') {
        const data = await readBody(request);
        if (!data || !validToken(data.v)) return json({ error: 'bad request' }, 400);
        const id = await scramble(data.v + salt + ':device');
        const infoJson = JSON.stringify(cleanInfo(data.info));

        // Presence is saved at most about once a minute, to stay inside the free database limits
        const row = await env.DB.prepare('SELECT seen, info FROM devices WHERE id = ?').bind(id).first();
        if (!row) {
          await env.DB.prepare('INSERT INTO devices (id, first, seen, info) VALUES (?, ?, ?, ?)').bind(id, now, now, infoJson).run();
        } else if (now - row.seen >= 60 || (row.info !== infoJson && now - row.seen >= 15)) {
          await env.DB.prepare('UPDATE devices SET seen = ?, info = ? WHERE id = ?').bind(now, infoJson, id).run();
        }

        // First contact only learns where the command list is up to, so old pranks are never replayed
        if (!Number.isInteger(data.cursor) || data.cursor < 0) {
          const latest = await env.DB.prepare('SELECT MAX(id) AS m FROM commands').first();
          return json({ ok: true, cursor: (latest && latest.m) || 0, commands: [] });
        }
        const { results } = await env.DB.prepare(
          "SELECT id, type, payload FROM commands WHERE id > ? AND t > ? AND (target = '*' OR target = ?) ORDER BY id LIMIT 10",
        )
          .bind(data.cursor, now - COMMAND_TTL, id)
          .all();
        const commands = results.map((c) => ({ id: c.id, type: c.type, payload: safeJson(c.payload) }));
        return json({ ok: true, cursor: commands.length ? commands[commands.length - 1].id : data.cursor, commands });
      }

      if (url.pathname.startsWith('/admin/') && request.method === 'POST') {
        const data = await readBody(request);
        if (!data) return json({ error: 'bad request' }, 400);
        const blocked = await adminGate(env, data, ip, now, salt);
        if (blocked) return blocked;

        if (url.pathname === '/admin/devices') {
          const { results } = await env.DB.prepare("SELECT id, first, seen, info, label FROM devices WHERE seen > ? OR label != '' ORDER BY seen DESC LIMIT 200")
            .bind(now - 86400)
            .all();
          return json({
            ok: true,
            now,
            devices: results.map((r) => ({ id: r.id, first: r.first, seen: r.seen, online: now - r.seen < ONLINE_WINDOW, label: r.label, info: safeJson(r.info) })),
          });
        }

        if (url.pathname === '/admin/send') {
          if (!ACTIONS.includes(data.type)) return json({ error: 'unknown action' }, 400);
          const target = data.target === '*' ? '*' : /^[0-9a-f]{32}$/.test(String(data.target)) ? String(data.target) : null;
          if (!target) return json({ error: 'bad target' }, 400);
          let payload = {};
          if (data.type === 'message') {
            const text = clean(data.text, 200);
            if (!text) return json({ error: 'The message is empty.' }, 400);
            payload = { text };
          }
          if (data.type === 'emoji_rain') {
            payload = { emoji: clean(data.text, 8) };
          }
          if (data.type === 'give_one') {
            if (!/^[a-z0-9-]{1,40}$/.test(String(data.achievement))) return json({ error: 'bad achievement' }, 400);
            payload = { id: String(data.achievement) };
          }
          await env.DB.prepare('INSERT INTO commands (target, type, payload, t) VALUES (?, ?, ?, ?)').bind(target, data.type, JSON.stringify(payload), now).run();
          const online = await env.DB.prepare(
            target === '*' ? 'SELECT COUNT(*) AS c FROM devices WHERE seen > ?' : 'SELECT COUNT(*) AS c FROM devices WHERE seen > ? AND id = ?',
          )
            .bind(...(target === '*' ? [now - ONLINE_WINDOW] : [now - ONLINE_WINDOW, target]))
            .first();
          return json({ ok: true, onlineTargets: online ? online.c : 0 });
        }

        if (url.pathname === '/admin/label') {
          if (!/^[0-9a-f]{32}$/.test(String(data.device))) return json({ error: 'bad device' }, 400);
          await env.DB.prepare('UPDATE devices SET label = ? WHERE id = ?').bind(clean(data.name, 30), String(data.device)).run();
          return json({ ok: true });
        }
        return json({ error: 'not found' }, 404);
      }

      return json({ ok: true, name: 'secretv4-stats' });
    } catch {
      // If the database is unavailable (for example the free daily limit was reached) the site keeps working
      return json({ ok: false, top: [], ratings: [], commands: [], devices: [] }, 200);
    }
  },
};

/** Now and then, forget scrambled addresses and play records older than a couple of hours */
async function maybeCleanUp(env, now) {
  if (Math.random() >= 0.05) return;
  await env.DB.prepare('DELETE FROM recent WHERE t < ?').bind(now - 3600).run();
  await env.DB.prepare('DELETE FROM ipcap WHERE b < ?').bind(Math.floor(now / 3600) - 1).run();
  await env.DB.prepare('DELETE FROM commands WHERE t < ?').bind(now - 3600).run();
  await env.DB.prepare("DELETE FROM devices WHERE seen < ? AND label = ''").bind(now - 172800).run(); // named devices are kept
}
