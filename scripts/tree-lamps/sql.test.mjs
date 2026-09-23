import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const runtime = process.env.LAMP_PGLITE_MODULE ?? '../../output/tree-lamps/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(runtime);
const migration = await readFile(new URL('../../services/blog-api/supabase/migrations/20260923155704_bear_tree_lamps.sql', import.meta.url), 'utf8');
const db = new PGlite();
await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
await db.exec(migration);
const call = async (visitor, lamp = null) => (await db.query('SELECT public.bear_tree_lamps_state($1,$2,$3) AS result', ['test', visitor.repeat(64), lamp])).rows[0].result;
async function clock(iso) {
  // Clock substitution only in this disposable test database, never in the migration/API.
  const start = migration.indexOf('CREATE FUNCTION');
  const end = migration.indexOf('REVOKE ALL ON FUNCTION');
  const func = migration.slice(start, end).replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION')
    .replace('statement_timestamp()', `timestamptz '${iso}'`);
  await db.exec(func);
}
test('production SQL executes with RLS and only service-role RPC access', async () => {
  const guards = await db.query(`SELECT c.relrowsecurity, has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS anon_access
    FROM pg_class c WHERE c.oid IN ('public.bear_tree_lights'::regclass,'public.bear_tree_lamp_nights'::regclass)`);
  assert.ok(guards.rows.every(row => row.relrowsecurity && !row.anon_access));
  const rights = await db.query(`SELECT has_function_privilege('authenticated','public.bear_tree_lamps_state(text,text,integer)','EXECUTE') AS authenticated,
    has_function_privilege('anon','public.bear_tree_lamps_state(text,text,integer)','EXECUTE') AS anon,
    (SELECT prosecdef FROM pg_proc WHERE oid='public.bear_tree_lamps_state(text,text,integer)'::regprocedure) AS definer`);
  assert.deepEqual(rights.rows[0], { authenticated: false, anon: false, definer: false });
  await db.exec('SET ROLE service_role');
  const result = await call('a');
  assert.equal(typeof result.active, 'boolean');
  await db.exec('RESET ROLE');
});
test('SQL enforces one contribution, occupied lamp and six-slot capacity', async () => {
  await clock('2026-09-23T12:00:00Z');
  await db.exec('SET ROLE service_role');
  const lit = await call('a', 0);
  assert.equal(lit.accepted, true);
  assert.equal((await call('a', 1)).outcome, 'already');
  assert.equal((await call('b', 0)).outcome, 'occupied');
  await Promise.all(['b', 'c', 'd', 'e', 'f'].map((visitor, index) => call(visitor, index + 1)));
  const full = await call('0', 2);
  assert.deepEqual([full.outcome, full.lights], ['full', [0, 1, 2, 3, 4, 5]]);
  await db.exec('RESET ROLE');
});
test('SQL keeps the same night through midnight then resets at dawn and next evening', async () => {
  await clock('2026-09-23T19:00:00Z');
  assert.equal((await call('a', 1)).outcome, 'already');
  await clock('2026-09-23T22:00:00Z');
  const dawn = await call('a', 1);
  assert.deepEqual([dawn.active, dawn.lights, dawn.outcome, dawn.contributed], [false, [], 'daytime', false]);
  await clock('2026-09-24T10:00:00Z');
  assert.deepEqual((await call('a', 1)).lights, [1]);
});
test('SQL rejects invalid lamp and anonymous identity parameters', async () => {
  await assert.rejects(() => call('a', 6), /invalid lamp parameters/);
  await assert.rejects(() => db.query("SELECT public.bear_tree_lamps_state('test','invalid',0)"), /invalid lamp parameters/);
});
test.after(() => db.close());
