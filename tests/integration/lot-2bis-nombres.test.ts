/**
 * Lot 2 bis, lot A « resserrer les nombres tirés » — (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261021090000_lot_2bis_resserrer_nombres` : 39 modèles du CP à la 4e reçoivent
 * leur nouveau contenu (bornes, variations, corrigés, specs) puis le tag de leur point, d'après la
 * liste VALIDÉE par David (docs/wip/arbre-notions/analyse/lot-2bis-modifications.md, copie figée
 * — contenu d'avant et d'après — dans tests/integration/fixtures/lot-2bis-nombres.json).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * portant les VRAIS identifiants, avec leur contenu, leur nœud et leurs niveaux d'avant — puis
 * rejoue la migration **depuis son fichier**, dans une transaction annulée à la fin. Les triggers
 * de garde des tags restent actifs : chaque tag posé a passé la règle du nœud.
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

interface Contenu {
	title: string;
	description: string | null;
	variations: unknown[];
	shared: unknown;
	test_specs: unknown[] | null;
}

interface Modele {
	id: string;
	noeud: string[];
	grades: string[];
	tag: { grade: string; code: string };
	avant: Contenu;
	apres: Contenu;
}

interface Etat {
	contenus: Map<string, Contenu>;
	dates: Map<string, string>;
	tags: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261021090000_lot_2bis_resserrer_nombres.sql';
const fixture: { modeles: Modele[] } = JSON.parse(
	readFileSync('tests/integration/fixtures/lot-2bis-nombres.json', 'utf-8')
);
const ids = fixture.modeles.map((m) => m.id);
/** Date de modification fabriquée : elle doit avancer (le contenu change). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : les copies des modèles, avec leur contenu, leur nœud et leurs niveaux d'avant. */
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
	for (const m of fixture.modeles) {
		const node = parChemin.get(m.noeud.join(' > '));
		if (!node) throw new Error(`chemin introuvable : ${m.noeud.join(' > ')}`);
		await pg.query(
			`update public.question_templates
			    set classification_node_id = $2, grades = $3, title = $4, description = $5,
			        variations = $6, shared = $7, test_specs = $8
			  where id = $1`,
			[
				m.id,
				node,
				m.grades,
				m.avant.title,
				m.avant.description,
				JSON.stringify(m.avant.variations),
				m.avant.shared === null ? null : JSON.stringify(m.avant.shared),
				m.avant.test_specs === null ? null : JSON.stringify(m.avant.test_specs)
			]
		);
	}
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const q = await pg.query<Contenu & { id: string; updated_at: Date }>(
		`select id, title, description, variations, shared, test_specs, updated_at
		   from public.question_templates where id = any($1::uuid[])`,
		[ids]
	);
	const t = await pg.query<{ template_id: string; grade: string; code: string }>(
		`select q.template_id, p.grade, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = any($1::uuid[])`,
		[ids]
	);
	return {
		contenus: new Map(
			q.rows.map((r) => [
				r.id,
				{
					title: r.title,
					description: r.description,
					variations: r.variations,
					shared: r.shared,
					test_specs: r.test_specs
				}
			])
		),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort()
	};
}

/** Écriture canonique (clés triées) : jsonb ne garde pas l'ordre des clés. */
function canonique(valeur: unknown): string {
	if (Array.isArray(valeur)) return `[${valeur.map(canonique).join(',')}]`;
	if (valeur !== null && typeof valeur === 'object') {
		const entrees = Object.entries(valeur).sort(([a], [b]) => (a < b ? -1 : 1));
		return `{${entrees.map(([k, v]) => `${JSON.stringify(k)}:${canonique(v)}`).join(',')}}`;
	}
	return JSON.stringify(valeur);
}

/** Identifiants dont le contenu lu diffère du contenu attendu. */
function ecarts(etat: Etat, attendu: (m: Modele) => Contenu): string[] {
	return fixture.modeles
		.filter((m) => canonique(etat.contenus.get(m.id)) !== canonique(attendu(m)))
		.map((m) => m.id);
}

// ============================================================================
// SUITE
// ============================================================================

describe('Lot 2 bis, resserrer les nombres tirés (migration de données)', () => {
	let pg: Client;
	let pose: Etat;
	let apres: Etat;
	let annule: Etat;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		await poserEtatProd(pg, prof.id);
		pose = await lireEtat(pg);
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		apres = await lireEtat(pg);
		await pg.query(extractRollback(MIGRATION));
		annule = await lireEtat(pg);
	}, 60_000);

	afterAll(async () => {
		await pg.query('rollback');
		await cleanupAllTestData();
	});

	it('la fixture est le lot validé (39 modèles, chacun modifié et tagué)', () => {
		expect(fixture.modeles).toHaveLength(39);
		expect(fixture.modeles.filter((m) => canonique(m.avant) === canonique(m.apres))).toEqual([]);
	});

	it('l’état posé est bien celui de la prod (garde du test)', () => {
		expect(ecarts(pose, (m) => m.avant)).toEqual([]);
	});

	it('chaque modèle a EXACTEMENT son nouveau contenu', () => {
		expect(ecarts(apres, (m) => m.apres)).toEqual([]);
	});

	it('les modèles portent EXACTEMENT les tags du lot, rien de plus', () => {
		const attendus = fixture.modeles.map((m) => `${m.id}§${m.tag.grade}§${m.tag.code}`).sort();
		expect(apres.tags).toEqual(attendus);
	});

	it('`updated_at` avance : le contenu a changé', () => {
		expect([...apres.dates.values()].filter((d) => d === AVANT)).toEqual([]);
	});

	it('le rollback écrit dans la migration rend le contenu d’avant et retire les tags', () => {
		expect(annule.tags).toEqual([]);
		expect(ecarts(annule, (m) => m.avant)).toEqual([]);
	});
});

describe('Lot 2 bis, resserrer les nombres tirés : les branches d’échec de la migration', () => {
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

	async function echoue(alterer: () => Promise<unknown>, message: RegExp): Promise<void> {
		await pg.query('begin');
		try {
			await poserEtatProd(pg, auteur);
			await alterer();
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(message);
		} finally {
			await pg.query('rollback');
		}
	}

	it('TOUT ou RIEN : un modèle manquant fait échouer la migration', async () => {
		await echoue(
			() => pg.query('delete from public.question_templates where id = $1', [ids[0]]),
			/identifiants partiellement présents : 38 modèle\(s\) sur 39/
		);
	});

	it('un modèle modifié depuis le relevé fait échouer la migration', async () => {
		await echoue(
			() =>
				pg.query(`update public.question_templates set title = title || ' (revu)' where id = $1`, [
					ids[0]
				]),
			/modèles modifiés depuis le relevé : 1/
		);
	});

	it('un modèle déplacé ou reclassé depuis le relevé fait échouer la migration', async () => {
		await echoue(
			() =>
				pg.query(`update public.question_templates set grades = array['2'] where id = $1`, [
					ids[0]
				]),
			/modèles déplacés ou reclassés depuis le relevé : 1/
		);
	});

	it('un tag déjà posé sur un modèle du lot fait échouer la migration', async () => {
		const m = fixture.modeles[0];
		await echoue(
			() =>
				pg.query(
					`insert into public.question_template_points (template_id, point_id)
					 select $1, id from public.curriculum_points where grade = $2 and code = $3 and archived_at is null`,
					[m.id, m.tag.grade, m.tag.code]
				),
			/tags déjà posés sur ces modèles : 1/
		);
	});

	it('le rollback refuse si un modèle a été retouché depuis la migration', async () => {
		await pg.query('begin');
		try {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`update public.question_templates set title = title || ' (revu)' where id = $1`,
				[ids[0]]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 38 modèle\(s\) sur 39 portent encore le contenu de la migration/
			);
		} finally {
			await pg.query('rollback');
		}
	});
});
