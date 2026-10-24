/**
 * Scission des points de programme validée par David (C5) — (Supabase local requis)
 * ===================================================================================
 *
 * Migration `20261017090000_scission_points_programme` : 149 points scindés (dont les cinq
 * « tables »), 168 points neufs (moitiés), 7 points ⚙ nés d'une ligne d'automatisme, 3-002 et
 * 3-038 archivés, et les références d'automatismes des points scindés reportées sur les moitiés
 * choisies. La fixture `fixtures/scission-points-programme.json` est GÉNÉRÉE depuis les fichiers
 * de décision (docs/archive/wip/arbre-notions/c5-scissions-generer.py) : codes, libellés, nœuds, ordre
 * complet de chaque grade touché, références (point × grade référent) avant et après.
 *
 * 1. Après les migrations (base locale) : l'ordre d'affichage EXACT de chaque grade touché, les
 *    libellés exacts, chaque moitié copie les attributs de son origine, les points ⚙ ont les
 *    valeurs de leur option, deux points archivés, et l'ensemble EXACT des références.
 * 2. (Retirés à l'étape 4 de C5, migration 20261022080000 : le rejeu du rollback et des gardes
 *    lisait `curriculum_points.objective_id`, colonne supprimée ; la migration est jouée en prod.)
 * 3. La structure du fichier : gardes et lock_timeout avant la première écriture, aucun contrôle
 *    de transaction — c'est ce qui garantit qu'un refus ne laisse rien derrière lui.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Client } from 'pg';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { extractRollback, TRANSACTION_CONTROL } from '../helpers/database/migration-rollback';

// ============================================================================
// TYPES
// ============================================================================

interface Split {
	origin: string;
	grade: string;
	nameBefore: string;
	codes: string[];
	names: string[];
}

interface Added {
	code: string;
	grade: string;
	name: string;
	kind: string;
	exigence: string;
	regime_acquisition: string;
	rubrique: string;
	path: string;
	before: string;
}

interface Fixture {
	splits: Split[];
	added: Added[];
	archived: { code: string; name: string }[];
	grades: Record<string, { before: string[]; holeBefore: number | null; after: string[] }>;
	references: { before: string[]; after: string[] };
}

interface PointRow {
	id: string;
	code: string;
	grade: string;
	display_order: number;
	name: string;
	kind: string;
	exigence: string;
	regime_acquisition: string;
	rubrique: string | null;
	node_id: string | null;
	path: string | null;
	rang: number | null;
	archived_at: Date | null;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261017090000_scission_points_programme.sql';
const fixture: Fixture = JSON.parse(
	readFileSync('tests/integration/fixtures/scission-points-programme.json', 'utf-8')
);
const GRADES = Object.keys(fixture.grades);
/**
 * La passe des points du lycée, venue après, réécrit la 2de (ordre, archivages, références) : pour
 * ce qu'elle touche, l'état final est le sien (tests/integration/passe-points-lycee.test.ts), et
 * l'état « après » de cette migration-ci doit être son état « avant ».
 */
const passeLycee: {
	grades: Record<string, { before: string[] }>;
	archived: { code: string }[];
	references: { before: string[]; after: string[] };
} = JSON.parse(readFileSync('tests/integration/fixtures/passe-lycee.json', 'utf-8'));
const LATER_GRADES = new Set(Object.keys(passeLycee.grades));
const LATER_CODES = new Set(
	[...passeLycee.references.before, ...passeLycee.references.after].map((r) => r.split('§')[0])
);
const SPLIT_CODES = fixture.splits.flatMap((s) => s.codes);
const NEW_CODES = [
	...fixture.splits.flatMap((s) => s.codes.slice(1)),
	...fixture.added.map((a) => a.code)
];
/** Tous les codes dont on lit les références (avant comme après). */
const WATCHED = [
	...new Set([
		...SPLIT_CODES,
		...NEW_CODES,
		...fixture.archived.map((a) => a.code),
		...fixture.references.before.map((r) => r.split('§')[0]),
		...fixture.references.after.map((r) => r.split('§')[0])
	])
];
/** Les attributs qu'une moitié neuve copie de son origine. */
const COPIED: (keyof PointRow)[] = [
	'grade',
	'node_id',
	'rubrique',
	'kind',
	'exigence',
	'regime_acquisition',
	'rang',
	'archived_at'
];
/** Première écriture sur une table publique (les tables temporaires ne comptent pas). */
const PUBLIC_WRITE = /\b(?:insert\s+into|update|delete\s+from|alter\s+table)\s+public\./i;
const READ_POINTS = `with recursive c as (
		select id, name::text as path from public.classification_nodes where parent_id is null
		union all
		select n.id, c.path || ' > ' || n.name from public.classification_nodes n join c on n.parent_id = c.id)
	select p.id, p.code, p.grade, p.display_order, p.name, p.kind, p.exigence, p.regime_acquisition,
	       p.rubrique, p.node_id, c.path, p.rang, p.archived_at
	  from public.curriculum_points p left join c on c.id = p.node_id
	 where p.grade = any($1)`;

// ============================================================================
// FONCTIONS
// ============================================================================

async function readPoints(pg: Client): Promise<Map<string, PointRow>> {
	const r = await pg.query<PointRow>(READ_POINTS, [GRADES]);
	return new Map(r.rows.map((row) => [row.code, row]));
}

/** Les références d'automatismes des points en jeu : « code§grade référent », triées. */
async function readReferences(pg: Client): Promise<string[]> {
	const r = await pg.query<{ ref: string }>(
		`select p.code || '§' || a.grade as ref
		   from public.curriculum_point_automatismes a
		   join public.curriculum_points p on p.id = a.point_id
		  where p.code = any($1)`,
		[WATCHED]
	);
	return r.rows.map((row) => row.ref).sort();
}

/** Les codes d'un grade, dans l'ordre d'affichage. */
function orderOf(points: Map<string, PointRow>, grade: string): string[] {
	return [...points.values()]
		.filter((p) => p.grade === grade)
		.sort((a, b) => a.display_order - b.display_order)
		.map((p) => p.code);
}

/** Le corps exécutable de la migration : tout ce qui suit le bloc de rollback, sans commentaires. */
function executableLines(): string[] {
	const sql = readFileSync(MIGRATION, 'utf-8');
	return sql
		.slice(sql.indexOf('-- ROLLBACK:END'))
		.split('\n')
		.filter((line) => !line.trim().startsWith('--'));
}

function split(origin: string): Split {
	const s = fixture.splits.find((x) => x.origin === origin);
	if (!s) throw new Error(`scission absente de la fixture : ${origin}`);
	return s;
}

// ============================================================================
// SUITES
// ============================================================================

describe('Scission des points : la fixture (décisions de David)', () => {
	it('149 origines, 168 moitiés neuves, 7 points ⚙, 2 archivés, 167 → 322 références', () => {
		expect(fixture.splits).toHaveLength(149);
		expect(NEW_CODES).toHaveLength(175);
		expect(new Set(NEW_CODES).size).toBe(175);
		expect(fixture.added).toHaveLength(7);
		expect(fixture.archived.map((a) => a.code)).toEqual(['3-002', '3-038']);
		expect(fixture.references.before).toHaveLength(167);
		expect(fixture.references.after).toHaveLength(322);
	});

	it('les cinq tables gardent les codes déjà écrits ; CE2-020 en 5e passe sur CE2-084', () => {
		expect(split('CP-018').codes).toEqual(['CP-018', 'CP-073']);
		expect(split('CE1-026').codes).toEqual(['CE1-026', 'CE1-090']);
		expect(split('CE1-027').codes).toEqual(['CE1-027', 'CE1-091']);
		expect(split('CE2-020').codes).toEqual(['CE2-020', 'CE2-084']);
		expect(split('CE2-021').codes).toEqual(['CE2-021', 'CE2-085']);
		expect(fixture.references.before).toContain('CE2-020§5');
		expect(fixture.references.after).toContain('CE2-084§5');
		expect(fixture.references.after).not.toContain('CE2-020§5');
	});
});

describe('Scission des points : l’état après les migrations (base locale)', () => {
	let points: Map<string, PointRow>;
	let references: string[];

	beforeAll(async () => {
		const pg = await getPostgresClient();
		points = await readPoints(pg);
		references = await readReferences(pg);
	});

	it('l’ordre d’affichage de chaque grade touché est EXACTEMENT celui de la fixture (1..N)', () => {
		for (const grade of GRADES.filter((g) => LATER_GRADES.has(g))) {
			expect(fixture.grades[grade].after, grade).toEqual(passeLycee.grades[grade].before);
		}
		for (const grade of GRADES.filter((g) => !LATER_GRADES.has(g))) {
			expect(orderOf(points, grade), grade).toEqual(fixture.grades[grade].after);
			const orders = [...points.values()]
				.filter((p) => p.grade === grade)
				.map((p) => p.display_order)
				.sort((a, b) => a - b);
			expect(orders, grade).toEqual(
				Array.from({ length: fixture.grades[grade].after.length }, (_, i) => i + 1)
			);
		}
	});

	it('chaque origine et chaque moitié porte son libellé validé, au caractère près', () => {
		const wrong: string[] = [];
		for (const s of fixture.splits) {
			s.codes.forEach((code, i) => {
				if (points.get(code)?.name !== s.names[i]) wrong.push(code);
			});
		}
		expect(wrong).toEqual([]);
	});

	it('chaque moitié neuve copie les attributs de son origine et la suit immédiatement', () => {
		for (const s of fixture.splits) {
			const origin = points.get(s.origin);
			expect(origin, s.origin).toBeDefined();
			if (!origin) continue;
			expect(origin.archived_at, s.origin).toBeNull();
			s.codes.slice(1).forEach((code, i) => {
				const added = points.get(code);
				expect(added, code).toBeDefined();
				if (!added) return;
				for (const column of COPIED) {
					expect(added[column], `${code}.${column}`).toEqual(origin[column]);
				}
				expect(added.display_order, code).toBe(origin.display_order + i + 1);
			});
		}
	});

	it('les sept points ⚙ ont les valeurs de leur option, rangés juste avant leur ancre', () => {
		for (const a of fixture.added) {
			const p = points.get(a.code);
			expect(p, a.code).toBeDefined();
			if (!p) continue;
			expect(
				{
					grade: p.grade,
					name: p.name,
					kind: p.kind,
					exigence: p.exigence,
					regime_acquisition: p.regime_acquisition,
					rubrique: p.rubrique,
					path: p.path,
					rang: p.rang,
					archived_at: p.archived_at
				},
				a.code
			).toEqual({
				grade: a.grade,
				name: a.name,
				kind: a.kind,
				exigence: a.exigence,
				regime_acquisition: a.regime_acquisition,
				rubrique: a.rubrique,
				path: a.path,
				rang: null,
				archived_at: null
			});
			const order = fixture.grades[a.grade].after;
			const anchor = order.indexOf(a.before);
			const siblings = fixture.added.filter((x) => x.before === a.before).map((x) => x.code);
			expect(order.slice(anchor - siblings.length, anchor), a.code).toEqual(siblings);
		}
	});

	it('3-002 et 3-038 sont archivés, libellé inchangé ; aucun autre point en jeu ne l’est', () => {
		for (const a of fixture.archived) {
			expect(points.get(a.code)?.archived_at, a.code).not.toBeNull();
			expect(points.get(a.code)?.name, a.code).toBe(a.name);
		}
		const later = new Set(passeLycee.archived.map((a) => a.code));
		const archived = [...points.values()]
			.filter((p) => p.archived_at !== null && !later.has(p.code))
			.map((p) => p.code);
		expect(archived.sort()).toEqual(['3-002', '3-038']);
	});

	it('les références d’automatismes des points en jeu sont EXACTEMENT celles décidées', () => {
		const code = (r: string) => r.split('§')[0];
		expect(references.filter((r) => !LATER_CODES.has(code(r)))).toEqual(
			fixture.references.after.filter((r) => !LATER_CODES.has(code(r)))
		);
		// Ce que la passe lycée a repris : son état « avant » est l'état « après » d'ici.
		const watched = new Set(WATCHED);
		expect(fixture.references.after.filter((r) => LATER_CODES.has(code(r)))).toEqual(
			passeLycee.references.before.filter((r) => watched.has(code(r)))
		);
	});
});

describe('Scission des points : la structure du fichier', () => {
	it('aucun contrôle de transaction hors commentaires', () => {
		expect(executableLines().filter((line) => TRANSACTION_CONTROL.test(line))).toEqual([]);
	});

	it('lock_timeout et gardes précèdent la première écriture publique (migration et rollback)', () => {
		const lines = executableLines();
		const firstWrite = lines.findIndex((line) => PUBLIC_WRITE.test(line));
		const guards = lines.findIndex((line) => line.includes('do $garde$'));
		const lock = lines.findIndex((line) => line.includes("set local lock_timeout = '5s';"));
		expect(firstWrite).toBeGreaterThan(0);
		expect(guards).toBeGreaterThan(-1);
		expect(lock).toBeGreaterThan(-1);
		expect(guards).toBeLessThan(firstWrite);
		expect(lock).toBeLessThan(firstWrite);

		const rollback = extractRollback(MIGRATION).split('\n');
		const rbWrite = rollback.findIndex((l) => PUBLIC_WRITE.test(l));
		const rbGuard = rollback.findIndex((l) => l.includes('do $rb_garde$'));
		const rbLock = rollback.findIndex((l) => l.includes("set local lock_timeout = '5s';"));
		expect(rbGuard).toBeGreaterThan(-1);
		expect(rbLock).toBeGreaterThan(-1);
		expect(rbGuard).toBeLessThan(rbWrite);
		expect(rbLock).toBeLessThan(rbWrite);
	});

	it('les blocs de données de la migration et du rollback sont identiques', () => {
		const sql = readFileSync(MIGRATION, 'utf-8');
		for (const name of ['POINTS', 'AUTOS', 'REFS', 'GRADES']) {
			const block = (prefix: string): string[] => {
				const start = sql.indexOf(`\n${prefix}-- DONNÉES:${name}:BEGIN\n`);
				const end = sql.indexOf(`\n${prefix}-- DONNÉES:${name}:END\n`);
				expect(start, `${prefix}${name}`).toBeGreaterThan(-1);
				return sql
					.slice(start, end)
					.split('\n')
					.slice(2)
					.map((l) => l.slice(prefix.length));
			};
			expect(block('-- '), name).toEqual(block(''));
		}
	});
});
