/**
 * Chantier « questions-1gen », lot 6 : nœud et tag de 7 modèles neufs, tag 1GEN d'un modèle publié
 * (Supabase local requis)
 * ==========================================================================================
 *
 * Migration `20261118054706_questions_1gen_lot6_rangement_tags` : les 7 brouillons « statistiques à
 * deux variables » créés le 2026-11-18 par scripts/create-questions.ts (sans nœud ni tag) vont sur
 * le nœud de leur point et reçoivent ce point, un seul (ADR 0020). Le modèle publié 49fac266 (1re
 * techno, Tle complémentaires) reçoit le niveau 1_GEN et le point 1GEN-003, sans rien perdre.
 * Décision de David (journal docs/wip/questions-1gen-progress.md § 23).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, dans l'état relevé au MCP le 2026-11-18 — puis rejoue
 * la migration **depuis son fichier**, dans une transaction annulée à la fin. Les triggers de garde
 * des tags restent actifs : chaque tag posé a passé la règle du nœud.
 *
 * @vitest-environment node
 *
 * @migration-de-donnees : hors des PR, rejoué la nuit (scripts/ci-integration-exclusions.sh)
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

interface Etat {
	noeuds: Map<string, string>;
	dates: Map<string, string>;
	niveaux: Map<string, string[]>;
	tags: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261118054706_questions_1gen_lot6_rangement_tags.sql';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
const AJUSTEMENT = 'Statistiques > Statistique à deux variables > ajustement affine';
const NUAGE = 'Statistiques > Statistique à deux variables > nuage de points';
/** Les 7 modèles neufs : identifiant créé en prod le 2026-11-18, nœud et point attendus. */
const NEUFS: { id: string; noeud: string; code: string }[] = [
	{
		id: '9bedbaf4-d5d1-4464-947d-19b8946452ab',
		noeud: 'Statistiques > Tableaux croisés',
		code: '1GEN-001'
	},
	{ id: 'f3cb0c7a-5fa9-4578-ba55-769581dcc64b', noeud: NUAGE, code: '1GEN-002' },
	{ id: '7461bb44-6811-4f56-9397-6fb3ff82c1b9', noeud: NUAGE, code: '1GEN-002' },
	{
		id: '4f328c8c-16c8-40b0-b192-bc2eaa94a867',
		noeud: 'Statistiques > Statistique à deux variables > point moyen',
		code: '1GEN-004'
	},
	{ id: 'ef8ade24-f79c-4bd8-b51c-77852ed0496c', noeud: AJUSTEMENT, code: '1GEN-005' },
	{ id: '3fec6b41-b401-430b-b602-017bd51e5f10', noeud: AJUSTEMENT, code: '1GEN-007' },
	{
		id: '2e898e54-bad7-4a92-b5ca-5d40561ca24d',
		noeud: 'Statistiques > Représenter des données',
		code: '1GEN-006'
	}
];
/** Le modèle publié : état relevé en prod le 2026-11-18. */
const PUBLIE = {
	id: '49fac266-f622-4ef5-8a2b-5638ca5a4c99',
	niveaux: ['T_COMP', '1_TECHNO'],
	tags: [
		['1_TECHNO', '1TECHNO-083'],
		['T_COMP', 'TCOMP-321']
	] as const
};
const idsNeufs = NEUFS.map((m) => m.id);
const ids = [...idsNeufs, PUBLIE.id];
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : les neufs en 1_GEN sans nœud ni tag ; le publié rangé et tagué. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	const parChemin = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(
		`update public.question_templates set grades = array['1_GEN'] where id = any($1::uuid[])`,
		[idsNeufs]
	);
	await pg.query(
		'update public.question_templates set grades = $2, classification_node_id = $3 where id = $1',
		[PUBLIE.id, PUBLIE.niveaux, parChemin.get(AJUSTEMENT)]
	);
	for (const [grade, code] of PUBLIE.tags) {
		await pg.query(
			`insert into public.question_template_points (template_id, point_id)
			 select $1, id from public.curriculum_points where grade = $2 and code = $3 and archived_at is null`,
			[PUBLIE.id, grade, code]
		);
	}
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) chemins.set(id, node.path);
	const q = await pg.query<{ id: string; node: string | null; updated_at: Date; grades: string[] }>(
		`select id, classification_node_id as node, updated_at, grades
		   from public.question_templates where id = any($1::uuid[])`,
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
		niveaux: new Map(q.rows.map((r) => [r.id, r.grades])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort()
	};
}

function tagsDuPublie(etat: Etat): string[] {
	return etat.tags.filter((t) => t.startsWith(PUBLIE.id));
}

const TAGS_PUBLIE_AVANT = PUBLIE.tags.map(([g, c]) => `${PUBLIE.id}§${g}§${c}`).sort();

// ============================================================================
// SUITE
// ============================================================================

describe('Questions 1GEN, lot 6 : nœud et tag des modèles (migration de données)', () => {
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

	it('chaque modèle neuf est EXACTEMENT sur le nœud de son point', () => {
		expect(NEUFS.map((m) => apres.noeuds.get(m.id))).toEqual(NEUFS.map((m) => m.noeud));
	});

	it('chaque modèle neuf porte EXACTEMENT son point, rien de plus', () => {
		const neufs = apres.tags.filter((t) => !t.startsWith(PUBLIE.id));
		expect(neufs).toEqual(NEUFS.map((m) => `${m.id}§1_GEN§${m.code}`).sort());
	});

	it('le modèle publié garde son nœud et ses tags, et gagne 1GEN-003 et le niveau 1_GEN', () => {
		expect(apres.noeuds.get(PUBLIE.id)).toBe(AJUSTEMENT);
		expect(tagsDuPublie(apres)).toEqual(
			[...TAGS_PUBLIE_AVANT, `${PUBLIE.id}§1_GEN§1GEN-003`].sort()
		);
		expect(apres.niveaux.get(PUBLIE.id)).toEqual([...PUBLIE.niveaux, '1_GEN']);
	});

	it('`updated_at` des 8 modèles est préservé', () => {
		expect(ids.map((id) => apres.dates.get(id))).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags.filter((t) => !t.startsWith(PUBLIE.id))).toEqual([]);
		expect(NEUFS.map((m) => annule.noeuds.get(m.id))).toEqual(NEUFS.map(() => '∅'));
		expect(tagsDuPublie(annule)).toEqual(TAGS_PUBLIE_AVANT);
		expect(annule.noeuds.get(PUBLIE.id)).toBe(AJUSTEMENT);
		expect(annule.niveaux.get(PUBLIE.id)).toEqual(PUBLIE.niveaux);
		expect(ids.map((id) => annule.dates.get(id))).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions 1GEN, lot 6 : les branches d’échec de la migration', () => {
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

	async function enTransaction(corps: () => Promise<void>): Promise<void> {
		await pg.query('begin');
		try {
			await corps();
		} finally {
			await pg.query('rollback');
		}
	}

	it('base sans les modèles neufs (locale) : la migration ne touche rien et passe', async () => {
		await enTransaction(async () => {
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
		});
	});

	it('base locale avec 49fac266 seul : il n’est ni tagué ni changé de niveau', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = any($1::uuid[])', [
				idsNeufs
			]);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			const etat = await lireEtat(pg);
			expect(tagsDuPublie(etat)).toEqual(TAGS_PUBLIE_AVANT);
			expect(etat.niveaux.get(PUBLIE.id)).toEqual(PUBLIE.niveaux);
		});
	});

	it('les neufs sans 49fac266 font échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [PUBLIE.id]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèle publié 49fac266 absent/
			);
		});
	});

	it('TOUT ou RIEN : un modèle manquant fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [idsNeufs[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 6 modèle\(s\) neuf\(s\) sur 7/
			);
		});
	});

	it('un modèle neuf rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const parChemin = new Map<string, string>();
			for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[idsNeufs[0], parChemin.get(LONGUEURS)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles neufs déjà rangés depuis le relevé : 1/
			);
		});
	});

	it('le modèle publié déjà tagué 1GEN depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = '1_GEN' and code = '1GEN-005' and archived_at is null`,
				[PUBLIE.id]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/49fac266 a changé depuis le relevé/
			);
		});
	});

	it('le modèle publié déplacé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_template_points where template_id = $1', [
				PUBLIE.id
			]);
			const parChemin = new Map<string, string>();
			for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[PUBLIE.id, parChemin.get(LONGUEURS)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/49fac266 a changé depuis le relevé/
			);
		});
	});

	it('1_GEN déjà ajouté à la main au publié fait échouer la migration (rollback sûr)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.question_templates set grades = array_append(grades, '1_GEN') where id = $1`,
				[PUBLIE.id]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/49fac266 a changé depuis le relevé/
			);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '1_GEN' and code = '1GEN-006' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
