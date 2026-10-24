/**
 * Passe lycée, étape e (PR 2) : libellés et points neufs — (Supabase local requis)
 * ===================================================================================
 *
 * Migration `20261023220000_passe_lycee_libelles_points` : quatre libellés rendus fidèles au BO
 * (2-273, 1GEN-029/030/031) et deux points neufs, « Utiliser l'équation fonctionnelle de
 * l'exponentielle pour transformer une écriture », en Tle spé (TSPE-626) et en Tle compl.
 * (TCOMP-379), juste après leur jumeau logarithme. Décisions de David du 2026-10-23 ; fixture
 * `fixtures/passe-lycee-libelles.json` GÉNÉRÉE par docs/archive/wip/passe-lycee/generer-libelles-points.py.
 *
 * 1. Après les migrations (base locale) : libellés, points neufs (attributs du jumeau, nœud),
 *    ordre d'affichage EXACT des deux grades touchés.
 * 2. Le rollback écrit dans la migration rend l'état d'avant, puis la migration se rejoue (ses
 *    gardes passent) ; le rollback refuse si un usage s'est accroché à un point neuf — le tout
 *    dans des transactions annulées.
 * 3. La structure du fichier : gardes et lock_timeout avant la première écriture, aucun contrôle
 *    de transaction.
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

interface Renomme {
	grade: string;
	code: string;
	avant: string;
	apres: string;
}

interface Neuf {
	grade: string;
	code: string;
	voisin: string;
	name: string;
	kind: string;
	exigence: string;
	regime_acquisition: string;
	rubrique: string;
	path: string;
}

interface Fixture {
	renommes: Renomme[];
	neufs: Neuf[];
	ordres: Record<string, { avant: string[]; apres: string[] }>;
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

const MIGRATION = 'supabase/migrations/20261023220000_passe_lycee_libelles_points.sql';
const fixture: Fixture = JSON.parse(
	readFileSync('tests/integration/fixtures/passe-lycee-libelles.json', 'utf-8')
);
const GRADES = ['2', '1_GEN', 'T_SPE', 'T_COMP'];
const NEW_CODES = fixture.neufs.map((n) => n.code);
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

function orderOf(points: Map<string, PointRow>, grade: string): string[] {
	return [...points.values()]
		.filter((p) => p.grade === grade)
		.sort((a, b) => a.display_order - b.display_order)
		.map((p) => p.code);
}

function executableLines(): string[] {
	return readFileSync(MIGRATION, 'utf-8')
		.split('\n')
		.filter((line) => !line.trimStart().startsWith('--'));
}

/** L'état décidé : libellés, points neufs, ordre des deux grades touchés. */
function expectDecided(points: Map<string, PointRow>): void {
	for (const r of fixture.renommes) {
		expect(points.get(r.code)?.name, r.code).toBe(r.apres);
	}
	for (const n of fixture.neufs) {
		const p = points.get(n.code);
		const voisin = points.get(n.voisin);
		expect(p, n.code).toBeDefined();
		expect(voisin, n.voisin).toBeDefined();
		if (!p || !voisin) continue;
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
			n.code
		).toEqual({
			grade: n.grade,
			name: n.name,
			kind: n.kind,
			exigence: n.exigence,
			regime_acquisition: n.regime_acquisition,
			rubrique: n.rubrique,
			path: n.path,
			rang: voisin.rang,
			archived_at: null
		});
		expect(p.display_order, n.code).toBe(voisin.display_order + 1);
	}
	for (const [grade, ordre] of Object.entries(fixture.ordres)) {
		expect(orderOf(points, grade), grade).toEqual(ordre.apres);
		const orders = [...points.values()]
			.filter((p) => p.grade === grade)
			.map((p) => p.display_order)
			.sort((a, b) => a - b);
		expect(orders, grade).toEqual(ordre.apres.map((_, i) => i + 1));
	}
}

// ============================================================================
// SUITES
// ============================================================================

describe('Passe lycée, PR 2 : la fixture', () => {
	it('4 libellés, 2 points neufs, un de plus dans chacun des deux grades touchés', () => {
		expect(fixture.renommes.map((r) => r.code)).toEqual([
			'2-273',
			'1GEN-029',
			'1GEN-030',
			'1GEN-031'
		]);
		expect(fixture.renommes[0].apres).toContain('(par exemple $U = RI$');
		for (const r of fixture.renommes.slice(1)) {
			expect(
				r.apres.startsWith('Suites géométriques à termes strictement positifs : '),
				r.code
			).toBe(true);
		}
		expect(NEW_CODES).toEqual(['TSPE-626', 'TCOMP-379']);
		expect(fixture.ordres['T_SPE'].avant).toHaveLength(325);
		expect(fixture.ordres['T_COMP'].avant).toHaveLength(178);
		for (const n of fixture.neufs) {
			const { avant, apres } = fixture.ordres[n.grade];
			expect(
				apres.filter((c) => c !== n.code),
				n.grade
			).toEqual(avant);
			expect(apres.indexOf(n.code), n.code).toBe(apres.indexOf(n.voisin) + 1);
		}
	});
});

describe('Passe lycée, PR 2 : état après les migrations', () => {
	let points: Map<string, PointRow>;

	beforeAll(async () => {
		points = await readPoints(await getPostgresClient());
	});

	it('libellés corrigés, points neufs à leur place avec les attributs de leur jumeau', () => {
		expectDecided(points);
	});
});

describe('Passe lycée, PR 2 : rollback puis rejeu (transaction annulée)', () => {
	let before: Map<string, PointRow>;
	let replayed: Map<string, PointRow>;

	beforeAll(async () => {
		const pg = await getPostgresClient();
		await pg.query('begin');
		try {
			await pg.query(extractRollback(MIGRATION));
			before = await readPoints(pg);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			replayed = await readPoints(pg);
		} finally {
			await pg.query('rollback');
		}
	});

	it('le rollback rend les libellés et l’ordre d’avant, sans aucun code neuf', () => {
		for (const r of fixture.renommes) {
			expect(before.get(r.code)?.name, r.code).toBe(r.avant);
		}
		expect(NEW_CODES.filter((c) => before.has(c))).toEqual([]);
		for (const [grade, ordre] of Object.entries(fixture.ordres)) {
			expect(orderOf(before, grade), grade).toEqual(ordre.avant);
		}
	});

	it('la migration se rejoue sur l’état d’avant et redonne l’état décidé', () => {
		expectDecided(replayed);
	});

	it('le rollback refuse si un usage s’est accroché à un point neuf', async () => {
		const pg = await getPostgresClient();
		await pg.query('begin');
		try {
			await pg.query(
				`insert into public.curriculum_point_automatismes (point_id, grade)
				 select id, 'T_SPE' from public.curriculum_points where code = 'TSPE-626'`
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/usages accrochés aux points neufs : TSPE-626/
			);
		} finally {
			await pg.query('rollback');
		}
	});
});

describe('Passe lycée, PR 2 : la structure du fichier', () => {
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
