/**
 * Tags du lycée (passe lycée, étape e) — (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261023180000_tags_lycee` : 221 modèles de la 2de à la Tle. 185 tags non
 * confirmés retirés, 175 tags posés, 32 modèles déplacés sur le nœud de leur point (R2),
 * d'après les verdicts VALIDÉS par David (docs/archive/wip/passe-lycee/analyse/, copie figée dans
 * tests/integration/fixtures/tags-lycee.json).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des
 * copies minimales portant les VRAIS identifiants, à leur nœud et avec leurs tags d'avant —
 * puis rejoue la migration **depuis son fichier**, dans une transaction annulée à la fin. Les
 * triggers de garde des tags restent actifs : chaque tag posé a passé la règle du nœud.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Client } from 'pg';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { extractRollback } from '../helpers/database/migration-rollback';
import { readNodePaths } from '../helpers/database/classification-paths';
import { insertProdCopies } from '../helpers/database/prod-copies';

// ============================================================================
// TYPES
// ============================================================================

interface Tag {
	grade: string;
	code: string;
}

interface Modele {
	id: string;
	noeud_avant: string[];
	noeud_apres: string[];
	tags_avant: Tag[];
	tags_apres: Tag[];
}

interface Fixture {
	modeles: Modele[];
}

interface Etat {
	noeuds: Map<string, string>;
	dates: Map<string, string>;
	tags: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261023180000_tags_lycee.sql';
const fixture: Fixture = JSON.parse(
	readFileSync('tests/integration/fixtures/tags-lycee.json', 'utf-8')
);
const ids = fixture.modeles.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

function cles(cote: 'tags_avant' | 'tags_apres'): string[] {
	return fixture.modeles.flatMap((m) => m[cote].map((t) => `${m.id}§${t.grade}§${t.code}`)).sort();
}

/** Pose l'état de la prod : les copies des modèles, à leur nœud d'avant, avec leurs tags d'avant. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	const parChemin = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) {
		if (!node.archived) parChemin.set(node.path, id);
	}
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(
		`update public.question_templates q set classification_node_id = r.node
		   from unnest($1::uuid[], $2::uuid[]) as r(id, node)
		  where q.id = r.id`,
		[
			ids,
			fixture.modeles.map((m) => {
				const node = parChemin.get(m.noeud_avant.join(' > '));
				if (!node) throw new Error(`chemin introuvable : ${m.noeud_avant.join(' > ')}`);
				return node;
			})
		]
	);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
	const avant = fixture.modeles.flatMap((m) => m.tags_avant.map((t) => ({ id: m.id, ...t })));
	const r = await pg.query(
		`insert into public.question_template_points (template_id, point_id)
		 select r.id, p.id
		   from unnest($1::uuid[], $2::text[], $3::text[]) as r(id, grade, code)
		   join public.curriculum_points p on p.grade = r.grade and p.code = r.code and p.archived_at is null`,
		[avant.map((t) => t.id), avant.map((t) => t.grade), avant.map((t) => t.code)]
	);
	if (r.rowCount !== avant.length) {
		throw new Error(`tags d'avant posés : ${r.rowCount}/${avant.length}`);
	}
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) chemins.set(id, node.path);
	const q = await pg.query<{ id: string; node: string | null; updated_at: Date }>(
		'select id, classification_node_id as node, updated_at from public.question_templates where id = any($1::uuid[])',
		[ids]
	);
	const t = await pg.query<{ template_id: string; grade: string; code: string }>(
		`select q.template_id, p.grade, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = any($1::uuid[])`,
		[ids]
	);
	return {
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? '∅'])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Tags du lycée (migration de données)', () => {
	let pg: Client;
	let apres: Etat;
	let annule: Etat;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		await poserEtatProd(pg, prof.id);
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		apres = await lireEtat(pg);
		await pg.query(extractRollback(MIGRATION));
		annule = await lireEtat(pg);
	}, 60_000);

	afterAll(async () => {
		await pg.query('rollback');
		await cleanupAllTestData();
	});

	it('la fixture est le lot validé (221 modèles, 185 retirés, 175 posés, 32 déplacés)', () => {
		const avant = new Set(cles('tags_avant'));
		const apresLot = new Set(cles('tags_apres'));
		expect(fixture.modeles).toHaveLength(221);
		expect([...avant].filter((k) => !apresLot.has(k))).toHaveLength(185);
		expect([...apresLot].filter((k) => !avant.has(k))).toHaveLength(175);
		expect(
			fixture.modeles.filter((m) => m.noeud_avant.join() !== m.noeud_apres.join())
		).toHaveLength(32);
	});

	it('chaque modèle est EXACTEMENT au nœud attendu', () => {
		const ecarts = fixture.modeles
			.map((m) => ({
				id: m.id,
				attendu: m.noeud_apres.join(' > '),
				obtenu: apres.noeuds.get(m.id)
			}))
			.filter((e) => e.attendu !== e.obtenu);
		expect(ecarts).toEqual([]);
	});

	it('les modèles portent EXACTEMENT les tags du lot, rien de plus', () => {
		expect(apres.tags).toEqual(cles('tags_apres'));
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()].every((d) => d === AVANT)).toBe(true);
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual(cles('tags_avant'));
		const ecarts = fixture.modeles.filter(
			(m) => annule.noeuds.get(m.id) !== m.noeud_avant.join(' > ')
		);
		expect(ecarts.map((m) => m.id)).toEqual([]);
		expect([...annule.dates.values()].every((d) => d === AVANT)).toBe(true);
	});
});

describe('Tags du lycée : les branches d’échec de la migration', () => {
	let pg: Client;
	let auteur: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		auteur = (await TestData.profile().withRole('teacher').create()).id;
		pg = await getPostgresClient();
	});

	afterAll(async () => {
		await pg.query('rollback').catch(() => undefined);
		await cleanupAllTestData();
	});

	it('base sans les modèles (locale) : la migration ne touche rien et passe', async () => {
		await pg.query('begin');
		try {
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
		} finally {
			await pg.query('rollback');
		}
	});

	it('TOUT ou RIEN : un modèle manquant fait échouer la migration', async () => {
		await pg.query('begin');
		try {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [ids[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 220 modèle\(s\) sur 221/
			);
		} finally {
			await pg.query('rollback');
		}
	});

	it('un modèle déplacé depuis le relevé fait échouer la migration', async () => {
		await pg.query('begin');
		try {
			await poserEtatProd(pg, auteur);
			const m = fixture.modeles.find((x) => x.tags_avant.length === 0);
			if (!m) throw new Error('aucun modèle sans tag d’avant dans la fixture');
			await pg.query(
				`update public.question_templates set classification_node_id = null where id = $1`,
				[m.id]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déplacés depuis le relevé : 1/
			);
		} finally {
			await pg.query('rollback');
		}
	});

	it('un tag retiré depuis le relevé fait échouer la migration', async () => {
		await pg.query('begin');
		try {
			await poserEtatProd(pg, auteur);
			const m = fixture.modeles.find((x) => x.tags_avant.length > 0);
			const t = m?.tags_avant[0];
			if (!m || !t) throw new Error('aucun tag d’avant dans la fixture');
			await pg.query(
				`delete from public.question_template_points q using public.curriculum_points p
				  where q.template_id = $1 and p.id = q.point_id and p.grade = $2 and p.code = $3`,
				[m.id, t.grade, t.code]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				new RegExp(`tags différents du relevé : -${m.id.slice(0, 8)} ${t.code}`)
			);
		} finally {
			await pg.query('rollback');
		}
	});

	it('un tag posé depuis le relevé fait échouer la migration', async () => {
		await pg.query('begin');
		try {
			await poserEtatProd(pg, auteur);
			// Un modèle non déplacé, dont un tag à poser est sur un programme qu'il n'a pas encore.
			const m = fixture.modeles.find(
				(x) =>
					x.noeud_avant.join() === x.noeud_apres.join() &&
					x.tags_apres.some((t) => !x.tags_avant.some((a) => a.grade === t.grade))
			);
			const t = m?.tags_apres.find((x) => !m.tags_avant.some((a) => a.grade === x.grade));
			if (!m || !t) throw new Error('aucun tag à poser sur un modèle non déplacé');
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = $2 and code = $3 and archived_at is null`,
				[m.id, t.grade, t.code]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				new RegExp(`tags différents du relevé : \\+${m.id.slice(0, 8)} ${t.code}`)
			);
		} finally {
			await pg.query('rollback');
		}
	});

	it('le rollback refuse de finir si un tag retiré ne peut pas être reposé', async () => {
		await pg.query('begin');
		try {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			// Un point retiré que plus aucun modèle du lot ne porte : on l'archive.
			const apresCodes = new Set(
				fixture.modeles.flatMap((x) => x.tags_apres.map((t) => `${t.grade}§${t.code}`))
			);
			const retire = fixture.modeles
				.flatMap((x) => x.tags_avant)
				.find((t) => !apresCodes.has(`${t.grade}§${t.code}`));
			if (!retire) throw new Error('aucun point retiré sans autre tag');
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = $1 and code = $2 and archived_at is null`,
				[retire.grade, retire.code]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : \d+ tag\(s\) reposé\(s\) sur 185/
			);
		} finally {
			await pg.query('rollback');
		}
	});
});
