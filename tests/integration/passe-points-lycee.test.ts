/**
 * Passe des points du lycée, étape a — (Supabase local requis)
 * ===================================================================================
 *
 * Migration `20261022180000_passe_points_lycee` : 277 points coupés ou réduits, 379 morceaux neufs,
 * 25 points ajoutés (14 points ⚙, 11 puces rétablies), 2-373 et 2-374 archivés, l'ordre d'affichage
 * des huit grades du lycée réécrit, et les références d'automatismes des points en jeu. La fixture
 * `fixtures/passe-lycee.json` est GÉNÉRÉE depuis les décisions de David
 * (docs/archive/wip/passe-lycee/generer-migration.py) : codes, libellés, nœuds, ordre complet de chaque
 * grade, références (point × grade référent) avant et après.
 *
 * 1. Après les migrations (base locale) : l'ordre d'affichage EXACT de chaque grade, les libellés
 *    et les nœuds exacts, chaque morceau copie les attributs de son origine, les points ajoutés ont
 *    leurs valeurs, deux points archivés, l'ensemble EXACT des références.
 * 2. Le rollback écrit dans la migration rend l'état d'avant (ordres, libellés, nœuds, références,
 *    aucun code neuf), puis la migration se rejoue sur cet état (ses gardes passent) — le tout dans
 *    une transaction annulée.
 *    (Les migrations venues après elle sont d'abord défaites, dans la transaction : 1 et 2 lisent
 *    l'état qu'ELLE laisse.)
 * 3. La structure du fichier : gardes et lock_timeout avant la première écriture, aucun contrôle de
 *    transaction.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Client } from 'pg';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { extractRollback, TRANSACTION_CONTROL } from '../helpers/database/migration-rollback';
import { PASSE_LYCEE, undoLaterMigrations } from '../helpers/database/later-migrations';

// ============================================================================
// TYPES
// ============================================================================

interface Split {
	origin: string;
	grade: string;
	nameBefore: string;
	pathBefore: string;
	codes: string[];
	names: string[];
	paths: string[];
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
}

interface Fixture {
	splits: Split[];
	added: Added[];
	archived: { code: string; name: string }[];
	grades: Record<string, { before: string[]; after: string[] }>;
	references: { before: string[]; after: string[] };
	counts: Record<string, number>;
	nodeKept: string[];
}

interface PointRow {
	code: string;
	grade: string;
	display_order: number;
	name: string;
	kind: string;
	exigence: string;
	regime_acquisition: string;
	rubrique: string | null;
	path: string | null;
	rang: number | null;
	archived_at: Date | null;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = PASSE_LYCEE;
const fixture: Fixture = JSON.parse(
	readFileSync('tests/integration/fixtures/passe-lycee.json', 'utf-8')
);
const GRADES = Object.keys(fixture.grades);
const NEW_CODES = [
	...fixture.splits.flatMap((s) => s.codes.slice(1)),
	...fixture.added.map((a) => a.code)
];
/** Tous les codes dont on lit les références (avant comme après). */
const WATCHED = [
	...new Set([
		...fixture.splits.flatMap((s) => s.codes),
		...NEW_CODES,
		...fixture.archived.map((a) => a.code),
		...fixture.references.before.map((r) => r.split('§')[0]),
		...fixture.references.after.map((r) => r.split('§')[0])
	])
];
/** Les attributs qu'un morceau neuf copie de son origine. */
const COPIED: (keyof PointRow)[] = [
	'grade',
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
	select p.code, p.grade, p.display_order, p.name, p.kind, p.exigence, p.regime_acquisition,
	       p.rubrique, c.path, p.rang, p.archived_at
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
	if (!s) throw new Error(`coupe absente de la fixture : ${origin}`);
	return s;
}

// ============================================================================
// SUITES
// ============================================================================

describe('Passe lycée : la fixture (décisions de David)', () => {
	it('277 origines, 379 morceaux, 25 ajouts, 2 archivés, 130 → 321 références', () => {
		expect(fixture.splits).toHaveLength(277);
		expect(NEW_CODES).toHaveLength(404);
		expect(new Set(NEW_CODES).size).toBe(404);
		expect(fixture.added).toHaveLength(25);
		expect(fixture.archived.map((a) => a.code)).toEqual(['2-373', '2-374']);
		expect(fixture.references.before).toHaveLength(130);
		expect(fixture.references.after).toHaveLength(321);
	});

	it('Q03 = B : multiple, diviseur, pair/impair en trois points', () => {
		expect(split('2-236').names).toEqual([
			"Définition de la notion de multiple : $a$ est multiple de $b$ s'il existe un entier $k$ tel que $a = kb$",
			'Définition de la notion de diviseur',
			'Définition des notions de nombre pair, de nombre impair'
		]);
	});

	it('Q04 : seule référence déplacée, 2-382 § 2 passe au 3e morceau', () => {
		const removed = fixture.references.before.filter((r) => !fixture.references.after.includes(r));
		expect(removed).toEqual(['2-382§2']);
		expect(fixture.references.after).toContain(`${split('2-382').codes[2]}§2`);
	});

	it('Q15 : le code va au morceau du modèle tagué, l’affichage garde l’ordre du BO', () => {
		const s = split('TCOMP-205');
		expect(s.names[0]).toBe('Approche intuitive du théorème des gendarmes');
		const order = fixture.grades.T_COMP.after;
		expect(order.indexOf(s.codes[1])).toBe(order.indexOf('TCOMP-205') - 1);
	});
});

describe('Passe lycée : l’état après les migrations (base locale)', () => {
	let points: Map<string, PointRow>;
	let references: string[];

	beforeAll(async () => {
		// L'état que cette migration a laissé : les migrations venues après elle sont défaites
		// dans une transaction annulée (PR 2 de l'étape e : deux points neufs, quatre libellés).
		const pg = await getPostgresClient();
		await pg.query('begin');
		try {
			await undoLaterMigrations(pg, MIGRATION);
			points = await readPoints(pg);
			references = await readReferences(pg);
		} finally {
			await pg.query('rollback');
		}
	});

	it('l’ordre d’affichage de chaque grade est EXACTEMENT celui de la fixture (1..N)', () => {
		for (const grade of GRADES) {
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

	it('chaque origine et chaque morceau porte son libellé et son nœud validés', () => {
		const wrong: string[] = [];
		for (const s of fixture.splits) {
			s.codes.forEach((code, i) => {
				const p = points.get(code);
				if (p?.name !== s.names[i] || p?.path !== s.paths[i]) wrong.push(code);
			});
		}
		expect(wrong).toEqual([]);
	});

	it('chaque morceau neuf copie les attributs de son origine', () => {
		for (const s of fixture.splits) {
			const origin = points.get(s.origin);
			expect(origin, s.origin).toBeDefined();
			if (!origin) continue;
			expect(origin.archived_at, s.origin).toBeNull();
			for (const code of s.codes.slice(1)) {
				const added = points.get(code);
				expect(added, code).toBeDefined();
				if (!added) continue;
				for (const column of COPIED) {
					expect(added[column], `${code}.${column}`).toEqual(origin[column]);
				}
			}
		}
	});

	it('les 25 points ajoutés (⚙ et puces rétablies) ont leurs valeurs', () => {
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
		}
	});

	it('2-373 et 2-374 sont archivés, libellé inchangé ; aucun autre point du lycée ne l’est', () => {
		for (const a of fixture.archived) {
			expect(points.get(a.code)?.archived_at, a.code).not.toBeNull();
			expect(points.get(a.code)?.name, a.code).toBe(a.name);
		}
		const archived = [...points.values()].filter((p) => p.archived_at !== null).map((p) => p.code);
		expect(archived.sort()).toEqual(['2-373', '2-374']);
	});

	it('les références d’automatismes des points en jeu sont EXACTEMENT celles décidées', () => {
		expect(references).toEqual(fixture.references.after);
	});
});

describe('Passe lycée : rollback puis rejeu (transaction annulée)', () => {
	let before: { points: Map<string, PointRow>; references: string[] };
	let replayed: { points: Map<string, PointRow>; references: string[] };

	beforeAll(async () => {
		const pg = await getPostgresClient();
		await pg.query('begin');
		try {
			await undoLaterMigrations(pg, MIGRATION);
			await pg.query(extractRollback(MIGRATION));
			before = { points: await readPoints(pg), references: await readReferences(pg) };
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			replayed = { points: await readPoints(pg), references: await readReferences(pg) };
		} finally {
			await pg.query('rollback');
		}
	});

	it('le rollback rend l’ordre, les libellés et les nœuds d’avant, sans aucun code neuf', () => {
		for (const grade of GRADES) {
			expect(orderOf(before.points, grade), grade).toEqual(fixture.grades[grade].before);
		}
		for (const s of fixture.splits) {
			expect(before.points.get(s.origin)?.name, s.origin).toBe(s.nameBefore);
			expect(before.points.get(s.origin)?.path, s.origin).toBe(s.pathBefore);
		}
		expect(NEW_CODES.filter((c) => before.points.has(c))).toEqual([]);
		for (const a of fixture.archived) {
			expect(before.points.get(a.code)?.archived_at, a.code).toBeNull();
		}
	});

	it('le rollback rend les références d’avant', () => {
		expect(before.references).toEqual(fixture.references.before);
	});

	it('la migration se rejoue sur l’état d’avant et redonne l’état décidé', () => {
		for (const grade of GRADES) {
			expect(orderOf(replayed.points, grade), grade).toEqual(fixture.grades[grade].after);
		}
		expect(replayed.references).toEqual(fixture.references.after);
	});
});

describe('Passe lycée : la structure du fichier', () => {
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
});
