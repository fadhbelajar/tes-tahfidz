// Cloudflare Pages Function: Cloudflare D1 backend for E-Tahfidz Al Mawaddz.
// Exposes a single document-style API used by the frontend as an alternative
// to the Google Sheets backend.
//
//   GET  /api/db?action=ping   -> health check (requires x-api-key)
//   GET  /api/db               -> { status, data: <full app DB> }
//   PUT  /api/db               -> saves full app DB from request body
//
// Auth: the request must send header `x-api-key` matching env.API_KEY
// (set as a Cloudflare secret / wrangler [vars]).

const COLLECTIONS = {
  Students: "students",
  Teachers: "teachers",
  Deposits: "deposits",
  News: "news",
  Accounts: "accounts",
  Leaves: "leaves",
};

const MASTER_MAP = {
  MasterClasses: "class",
  MasterJenjangs: "jenjang",
  MasterHalaqahs: "halaqah",
};

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) return json({ status: "error", message: "Unauthorized" }, 401);

  const url = new URL(request.url);
  if (url.searchParams.get("action") === "ping") {
    return json({ status: "success", message: "Cloudflare D1 backend connected" });
  }

  try {
    const data = await loadAll(env.dbtahfidz);
    return json({ status: "success", data });
  } catch (e) {
    return json({ status: "error", message: e.message }, 500);
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) return json({ status: "error", message: "Unauthorized" }, 401);

  try {
    const payload = await request.json();
    await saveAll(env.dbtahfidz, payload || {});
    return json({ status: "success", message: "Data tersimpan di Cloudflare D1" });
  } catch (e) {
    return json({ status: "error", message: e.message }, 400);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    },
  });
}

function checkAuth(request, env) {
  const key = request.headers.get("x-api-key");
  return !!key && !!env.API_KEY && key === env.API_KEY;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    },
  });
}

async function loadAll(db) {
  const out = {};

  for (const [coll, tbl] of Object.entries(COLLECTIONS)) {
    const { results } = await db.prepare(`SELECT json FROM ${tbl}`).all();
    out[coll] = results.map((r) => JSON.parse(r.json));
  }

  const sres = await db.prepare(`SELECT key, value FROM settings`).all();
  out.Settings = sres.results.map((r) => ({ key: r.key, value: r.value }));

  for (const [coll, type] of Object.entries(MASTER_MAP)) {
    const mres = await db.prepare(`SELECT value FROM masters WHERE type = ?`).bind(type).all();
    out[coll] = mres.results.map((r) => ({ name: r.value }));
  }

  return out;
}

async function saveAll(db, payload) {
  // Clear existing data
  const clears = [
    db.prepare(`DELETE FROM students`),
    db.prepare(`DELETE FROM teachers`),
    db.prepare(`DELETE FROM deposits`),
    db.prepare(`DELETE FROM news`),
    db.prepare(`DELETE FROM accounts`),
    db.prepare(`DELETE FROM settings`),
    db.prepare(`DELETE FROM masters`),
    db.prepare(`DELETE FROM leaves`),
  ];
  await db.batch(clears);

  const stmts = [];
  const uuid = () =>
    (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) ||
    "id-" + Math.random().toString(36).slice(2);

  for (const [coll, tbl] of Object.entries(COLLECTIONS)) {
    const rows = Array.isArray(payload[coll]) ? payload[coll] : [];
    for (const row of rows) {
      stmts.push(
        db.prepare(`INSERT INTO ${tbl} (id, json) VALUES (?, ?)`).bind(row.id || uuid(), JSON.stringify(row))
      );
    }
  }

  const settings = Array.isArray(payload.Settings) ? payload.Settings : [];
  for (const s of settings) {
    stmts.push(db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`).bind(s.key, String(s.value)));
  }

  for (const [coll, type] of Object.entries(MASTER_MAP)) {
    const rows = Array.isArray(payload[coll]) ? payload[coll] : [];
    for (const r of rows) {
      stmts.push(db.prepare(`INSERT INTO masters (type, value) VALUES (?, ?)`).bind(type, r.name));
    }
  }

  // D1 limits a single batch to 100 statements, chunk to be safe.
  const CHUNK = 100;
  for (let i = 0; i < stmts.length; i += CHUNK) {
    await db.batch(stmts.slice(i, i + CHUNK));
  }
}
