import { getStore } from "@netlify/blobs";

const KEY = /^wed:[A-Za-z0-9:._-]{1,200}$/;
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req) => {
  const p = new URL(req.url).searchParams;
  if (p.has("probe")) return json({ ok: true, protected: false });

  const store = getStore({ name: "wedding-planner", consistency: "strong" });
  const key = p.get("key");
  if (key !== null && !KEY.test(key)) return json({ error: "Bad key" }, 400);

  try {
    if (req.method === "GET" && key) return json({ value: await store.get(key) });
    if (req.method === "GET" && p.has("keys")) {
      const keys = p.get("keys").split(",").filter((k) => KEY.test(k)).slice(0, 50);
      const vals = await Promise.all(keys.map((k) => store.get(k)));
      return json({ values: Object.fromEntries(keys.map((k, i) => [k, vals[i]])) });
    }
    if (req.method === "GET") {
      const { blobs } = await store.list({ prefix: "wed:" });
      return json({ keys: blobs.map((b) => b.key) });
    }
    if (req.method === "PUT" && key) { await store.set(key, await req.text()); return json({ ok: true }); }
    if (req.method === "DELETE" && key) { await store.delete(key); return json({ ok: true }); }
    return json({ error: "Bad request" }, 400);
  } catch (err) {
    console.error(err);
    return json({ error: "Storage error" }, 500);
  }
};

export const config = { path: "/api/store" };
