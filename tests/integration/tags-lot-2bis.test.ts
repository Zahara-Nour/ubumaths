/**
 * Tags du lot 2 bis (primaire et collège) — (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261020233600_tags_lot_2bis_primaire_college` : 306 modèles du CP à la 3e
 * reçoivent leur point de programme, après 91 déplacements de nœud (R2), 3 reclassements
 * de 5e en 4e et le rattachement des points 4-073 et 4-004, d'après les verdicts VALIDÉS par David
 * (docs/wip/arbre-notions/analyse/, copie figée dans tests/integration/fixtures/tags-lot-2bis.json).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des
 * copies minimales portant les VRAIS identifiants, à leur nœud et leurs niveaux d'avant — puis
 * rejoue la migration **depuis son fichier**, dans une transaction annulée à la fin. Les
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

interface Modele {
	id: string;
	noeud_avant: string[];
	noeud_apres: string[];
	grades_avant: string[];
	grades_apres: string[];
	tag: { grade: string; code: string } | null;
}

interface Fixture {
	modeles: Modele[];
	points_rattaches: { grade: string; code: string; avant: string[]; apres: string[] }[];
}

interface Etat {
	noeuds: Map<string, string>;
	grades: Map<string, string[]>;
	dates: Map<string, string>;
	tags: string[];
	pointsRattaches: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261020233600_tags_lot_2bis_primaire_college.sql';
const fixture: Fixture = JSON.parse(
	readFileSync('tests/integration/fixtures/tags-lot-2bis.json', 'utf-8')
);
const ids = fixture.modeles.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : les copies des modèles, à leur nœud et leurs niveaux d'avant. */
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
		`update public.question_templates q set classification_node_id = r.node, grades = string_to_array(r.g, ',')
		   from unnest($1::uuid[], $2::uuid[], $3::text[]) as r(id, node, g)
		  where q.id = r.id`,
		[
			ids,
			fixture.modeles.map((m) => {
				const node = parChemin.get(m.noeud_avant.join(' > '));
				if (!node) throw new Error(`chemin introuvable : ${m.noeud_avant.join(' > ')}`);
				return node;
			}),
			fixture.modeles.map((m) => m.grades_avant.join(','))
		]
	);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) chemins.set(id, node.path);
	const q = await pg.query<{ id: string; node: string | null; grades: string[]; updated_at: Date }>(
		'select id, classification_node_id as node, grades, updated_at from public.question_templates where id = any($1::uuid[])',
		[ids]
	);
	const t = await pg.query<{ template_id: string; grade: string; code: string }>(
		`select q.template_id, p.grade, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = any($1::uuid[])`,
		[ids]
	);
	const p = await pg.query<{ code: string; node_id: string }>(
		`select code, node_id from public.curriculum_points
		  where grade = '4' and code in ('4-004', '4-073') and archived_at is null order by code`
	);
	return {
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? '∅'])),
		grades: new Map(q.rows.map((r) => [r.id, r.grades])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort(),
		pointsRattaches: p.rows.map((r) => `${r.code} : ${chemins.get(r.node_id) ?? '∅'}`)
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Tags du lot 2 bis (migration de données)', () => {
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

	it('la fixture est le lot validé (321 modèles, 306 tags, 91 déplacés, 3 reclassés)', () => {
		expect(fixture.modeles).toHaveLength(321);
		expect(fixture.modeles.filter((m) => m.tag)).toHaveLength(306);
		expect(
			fixture.modeles.filter((m) => m.noeud_avant.join() !== m.noeud_apres.join())
		).toHaveLength(91);
		expect(
			fixture.modeles.filter((m) => m.grades_avant.join() !== m.grades_apres.join())
		).toHaveLength(3);
	});

	it('chaque modèle est EXACTEMENT au nœud et aux niveaux attendus', () => {
		const ecarts = fixture.modeles
			.map((m) => ({
				id: m.id,
				attendu: `${m.noeud_apres.join(' > ')} | ${m.grades_apres.join(',')}`,
				obtenu: `${apres.noeuds.get(m.id)} | ${apres.grades.get(m.id)?.join(',')}`
			}))
			.filter((e) => e.attendu !== e.obtenu);
		expect(ecarts).toEqual([]);
	});

	it('les modèles portent EXACTEMENT les tags du lot, rien de plus', () => {
		const attendus = fixture.modeles
			.filter((m) => m.tag)
			.map((m) => `${m.id}§${m.tag?.grade}§${m.tag?.code}`)
			.sort();
		expect(apres.tags).toEqual(attendus);
	});

	it('4-073 et 4-004 (sa moitié d’origine) sont rattachés au nœud du modèle de 4-073', () => {
		const noeud =
			"Nombres et calculs > Entiers : priorités opératoires > écriture d'une expression";
		expect(apres.pointsRattaches).toEqual([`4-004 : ${noeud}`, `4-073 : ${noeud}`]);
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()].every((d) => d === AVANT)).toBe(true);
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual([]);
		const ecarts = fixture.modeles.filter(
			(m) =>
				annule.noeuds.get(m.id) !== m.noeud_avant.join(' > ') ||
				annule.grades.get(m.id)?.join(',') !== m.grades_avant.join(',')
		);
		expect(ecarts.map((m) => m.id)).toEqual([]);
		expect(annule.pointsRattaches).toEqual([
			'4-004 : Nombres et calculs > Relatifs : calculs',
			'4-073 : Nombres et calculs > Relatifs : calculs'
		]);
		expect([...annule.dates.values()].every((d) => d === AVANT)).toBe(true);
	});
});

describe('Tags du lot 2 bis : les branches d’échec de la migration', () => {
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

	it('TOUT ou RIEN : un modèle manquant fait échouer la migration', async () => {
		await pg.query('begin');
		try {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [ids[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 320 modèle\(s\) sur 321/
			);
		} finally {
			await pg.query('rollback');
		}
	});

	it('un modèle déplacé depuis le relevé fait échouer la migration', async () => {
		await pg.query('begin');
		try {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set grades = array['2'] where id = $1`, [
				ids[0]
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déplacés ou reclassés depuis le relevé : 1/
			);
		} finally {
			await pg.query('rollback');
		}
	});

	it('un tag déjà posé sur un modèle du lot fait échouer la migration', async () => {
		await pg.query('begin');
		try {
			await poserEtatProd(pg, auteur);
			const m = fixture.modeles.find(
				(x) =>
					x.tag &&
					x.noeud_avant.join() === x.noeud_apres.join() &&
					x.grades_avant.join() === x.grades_apres.join()
			);
			if (!m?.tag) throw new Error('aucun modèle sans déplacement dans la fixture');
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = $2 and code = $3 and archived_at is null`,
				[m.id, m.tag.grade, m.tag.code]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tags déjà posés sur ces modèles : 1/
			);
		} finally {
			await pg.query('rollback');
		}
	});
});
