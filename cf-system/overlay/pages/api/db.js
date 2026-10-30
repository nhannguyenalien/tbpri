// API dữ liệu kiểu Realtime Database trên Turso.
//   GET  /api/db?path=a/b&v=<version đã có>  -> { v, data } hoặc { v, same: true }
//   POST /api/db { op: 'set'|'update'|'remove', path, value }
import { ready } from '../../lib/server/turso';
import { readSession } from '../../lib/server/session';
import { canRead, canWrite } from '../../lib/server/rules';
import { splitPath, readTree, readVersionKey, getVersion, writeStatements, MAX_VALUE_BYTES } from '../../lib/server/tree';

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

const needsExisting = (segs) => (segs[0] === 'tv_sessions' && segs.length === 2) || (segs[0] === 'slugs' && segs.length === 2);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  let c;
  try { c = await ready(); } catch (e) { return res.status(503).json({ error: 'db_unavailable' }); }
  const session = await readSession(req);
  const uid = session ? session.uid : null;

  try {
    if (req.method === 'GET') {
      const segs = splitPath(req.query.path);
      if (!canRead(segs, uid)) return res.status(403).json({ error: 'permission_denied' });
      const cur = await getVersion(c, readVersionKey(segs));
      if (req.query.v !== undefined && Number(req.query.v) === cur) return res.status(200).json({ v: cur, same: true });
      return res.status(200).json({ v: cur, data: await readTree(c, segs) });
    }

    if (req.method === 'POST') {
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'bad_origin' });
      if (!String(req.headers['content-type'] || '').includes('application/json')) return res.status(415).json({ error: 'json_only' });
      const { op, path, value } = req.body || {};
      const base = splitPath(path);
      if (JSON.stringify(value === undefined ? null : value).length > MAX_VALUE_BYTES) return res.status(413).json({ error: 'too_large' });

      const ops = []; // { segs, value }
      if (op === 'set') ops.push({ segs: base, value: value === undefined ? null : value });
      else if (op === 'remove') ops.push({ segs: base, value: null });
      else if (op === 'update') {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return res.status(400).json({ error: 'bad_value' });
        for (const k of Object.keys(value)) ops.push({ segs: [...base, ...splitPath(k)], value: value[k] === undefined ? null : value[k] });
      } else return res.status(400).json({ error: 'bad_op' });

      const stmts = [];
      for (const o of ops) {
        const existing = needsExisting(o.segs) ? await readTree(c, o.segs) : undefined;
        const r = canWrite(o.segs, o.value, uid, existing);
        if (!r.ok) return res.status(403).json({ error: 'permission_denied', why: r.why });
        stmts.push(...writeStatements(o.segs, o.value));
      }
      if (stmts.length) await c.batch(stmts);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'method' });
  } catch (e) {
    return res.status(400).json({ error: 'bad_request', message: String(e.message || e).slice(0, 200) });
  }
}
