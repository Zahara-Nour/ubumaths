/**
 * Chantier « questions-ttechno », lot 2a (suites) : nœud et tag de 8 modèles neufs, tag et niveau
 * T_TECHNO de 2 modèles communs publiés (Supabase local requis)
 * ==========================================================================================
 *
 * Migration `20261117190410_questions_ttechno_lot2a_rangement_tags` :
 *   - partie A : les 8 brouillons du lot 2a créés le 2026-11-17 par scripts/create-questions.ts
 *     (sans nœud ni tag) vont sur le nœud de leur point et reçoivent ce point, un seul (ADR 0020) ;
 *   - partie B : c4887e49 et 0b5c3db6 (modèles communs de questions-1gen, publiés, déjà rangés)
 *     reçoivent un point TTECHNO et `T_TECHNO`, sans toucher leurs autres tags ni leurs niveaux.
 * Décisions de David (journal docs/wip/questions-ttechno-progress.md § 12, Q16).
 *
 * Les modèles n'existent qu'en production. Le test fabrique l'état de la prod (copies minimales
 * portant les VRAIS identifiants) puis rejoue la migration **depuis son fichier**, dans une
 * transaction annulée à la fin. Les triggers de garde des tags restent actifs.
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
	grades: Map<string, string[]>;
	/** `id§grade§code`, triés. */
	tags: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261117190410_questions_ttechno_lot2a_rangement_tags.sql';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
const ARITH = 'Suites > Suites arithmétiques';
const GEOM = 'Suites > Suites géométriques';
/** Partie A : identifiant créé en prod le 2026-11-17, nœud et point attendus. */
const LOT: { id: string; noeud: string; code: string }[] = [
	{ id: '45ea676f-2454-407d-a3ef-88da0d201a73', noeud: ARITH, code: 'TTECHNO-016' },
	{ id: '72b876d7-6673-4b75-a67d-631caebe1b8c', noeud: GEOM, code: 'TTECHNO-018' },
	{
		id: '6336ae4d-33ed-4a23-9517-9f27b0492de5',
		noeud: `${ARITH} > définition`,
		code: 'TTECHNO-020'
	},
	{
		id: 'a46e60cf-69d5-4911-b905-67b873fd6887',
		noeud: `${GEOM} > définition`,
		code: 'TTECHNO-021'
	},
	{
		id: '292f865b-8292-4b57-b717-e1ccba7d65a2',
		noeud: `${ARITH} > définition`,
		code: 'TTECHNO-022'
	},
	{
		id: '65e0e9f5-dfff-49b5-8a91-11ae76bbc89b',
		noeud: `${ARITH} > somme des termes`,
		code: 'TTECHNO-028'
	},
	{
		id: '5ec00b89-1cb5-45b5-a781-cda1d051e359',
		noeud: `${GEOM} > somme des termes`,
		code: 'TTECHNO-029'
	},
	{
		id: '752d26c9-a9ce-4ee8-ad6d-dcefa3ce578f',
		noeud: `${ARITH} > somme des termes`,
		code: 'TTECHNO-074'
	}
];
/** Partie B : modèles communs publiés, leurs tags d'autres programmes (prod, 2026-11-17), point visé. */
const COMMUNS: { id: string; noeud: string; autres: [string, string][]; code: string }[] = [
	{
		id: 'c4887e49-2337-4ac7-a2c9-369434868b65',
		noeud: `${GEOM} > terme général`,
		autres: [
			['1_GEN', '1GEN-029'],
			['1_TECHNO', '1TECHNO-038']
		],
		code: 'TTECHNO-025'
	},
	{
		id: '0b5c3db6-cb37-40fc-8247-12e3ace03a46',
		noeud: `${GEOM} > définition`,
		autres: [
			['1_GEN', '1GEN-028'],
			['1_TECHNO', '1TECHNO-036']
		],
		code: 'TTECHNO-023'
	}
];
const idsLot = LOT.map((m) => m.id);
const idsCommuns = COMMUNS.map((m) => m.id);
const ids = [...idsLot, ...idsCommuns];
const GRADES_COMMUNS = ['1_GEN', '1_TECHNO'];
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

async function sansTriggerDeDate(pg: Client, sql: string, params: unknown[]): Promise<void> {
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(sql, params);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

/**
 * Pose l'état de la prod : les 8 brouillons en T_TECHNO sans nœud ni tag ; les 2 modèles communs
 * publiés, en {1_GEN,1_TECHNO}, rangés sur le nœud de leur point TTECHNO, avec leurs tags 1GEN et
 * 1TECHNO.
 */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	await sansTriggerDeDate(
		pg,
		`update public.question_templates set grades = array['T_TECHNO'], status = 'draft',
		        classification_node_id = null
		  where id = any($1::uuid[])`,
		[idsLot]
	);
	for (const c of COMMUNS) {
		await sansTriggerDeDate(
			pg,
			`update public.question_templates
			    set grades = $2, status = 'published',
			        classification_node_id = (select node_id from public.curriculum_points
			                                   where grade = 'T_TECHNO' and code = $3 and archived_at is null)
			  where id = $1`,
			[c.id, GRADES_COMMUNS, c.code]
		);
		for (const [grade, code] of c.autres) {
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points
				  where grade = $2 and code = $3 and archived_at is null`,
				[c.id, grade, code]
			);
		}
	}
	// Garde du décor : les 4 tags d'autres programmes sont posés (sinon « ne bougent pas » comparerait du vide).
	const r = await pg.query<{ n: string }>(
		'select count(*) as n from public.question_template_points where template_id = any($1::uuid[])',
		[idsCommuns]
	);
	if (Number(r.rows[0].n) !== 4) throw new Error(`décor faux : ${r.rows[0].n} tag(s) sur 4`);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) chemins.set(id, node.path);
	const q = await pg.query<{ id: string; node: string | null; updated_at: Date; grades: string[] }>(
		'select id, classification_node_id as node, updated_at, grades from public.question_templates where id = any($1::uuid[])',
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
		grades: new Map(q.rows.map((r) => [r.id, r.grades])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort()
	};
}

function tagsAutres(): string[] {
	return COMMUNS.flatMap((c) => c.autres.map(([g, code]) => `${c.id}§${g}§${code}`));
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions TTECHNO, lot 2a : rangement et tags (migration de données)', () => {
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

	it('partie A : chaque brouillon est EXACTEMENT sur le nœud de son point', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeud));
	});

	it('tags : chaque modèle porte son point TTECHNO, et les tags 1GEN / 1TECHNO ne bougent pas', () => {
		const attendus = [
			...LOT.map((m) => `${m.id}§T_TECHNO§${m.code}`),
			...COMMUNS.map((c) => `${c.id}§T_TECHNO§${c.code}`),
			...tagsAutres()
		].sort();
		expect(apres.tags).toEqual(attendus);
	});

	it('partie B : `T_TECHNO` ajouté aux niveaux, nœud inchangé', () => {
		expect(idsCommuns.map((id) => apres.grades.get(id))).toEqual(
			idsCommuns.map(() => [...GRADES_COMMUNS, 'T_TECHNO'])
		);
		expect(COMMUNS.map((c) => apres.noeuds.get(c.id))).toEqual(COMMUNS.map((c) => c.noeud));
	});

	it('partie A : niveaux des brouillons inchangés', () => {
		expect(idsLot.map((id) => apres.grades.get(id))).toEqual(idsLot.map(() => ['T_TECHNO']));
	});

	it('`updated_at` des 10 modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual(tagsAutres().sort());
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map(() => '∅'));
		expect(COMMUNS.map((c) => annule.noeuds.get(c.id))).toEqual(COMMUNS.map((c) => c.noeud));
		expect(idsCommuns.map((id) => annule.grades.get(id))).toEqual(
			idsCommuns.map(() => GRADES_COMMUNS)
		);
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions TTECHNO, lot 2a : les branches d’échec de la migration', () => {
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

	it('base sans les modèles (locale) : la migration ne touche rien et passe', async () => {
		await enTransaction(async () => {
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
		});
	});

	it('partie A, TOUT ou RIEN : un brouillon manquant fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [idsLot[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 7 modèle\(s\) sur 8/
			);
		});
	});

	it('partie A : un brouillon rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const parChemin = new Map<string, string>();
			for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[idsLot[0], parChemin.get(LONGUEURS)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déjà rangés depuis le relevé : 1/
			);
		});
	});

	it('partie A : un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = 'T_TECHNO' and code = 'TTECHNO-074' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});

	it('partie B, TOUT ou RIEN : un modèle commun manquant fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [idsCommuns[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles communs partiellement présents : 1 sur 2/
			);
		});
	});

	it('partie B : `T_TECHNO` déjà posé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.question_templates set grades = array_append(grades, 'T_TECHNO') where id = $1`,
				[idsCommuns[1]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveau T_TECHNO déjà présent : 1 sur 2 sans T_TECHNO/
			);
		});
	});

	it('partie B : un point TTECHNO déjà posé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = 'T_TECHNO' and code = 'TTECHNO-025' and archived_at is null`,
				[COMMUNS[0].id]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/déjà tagué\(s\) d'un point TTECHNO : c4887e49 \(TTECHNO-025\)/
			);
		});
	});

	it('partie B : un modèle commun déplacé hors du nœud de son point fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			// Retire d'abord ses tags (le trigger refuse de déplacer un modèle tagué hors du nœud des points).
			await pg.query('delete from public.question_template_points where template_id = $1', [
				idsCommuns[1]
			]);
			const parChemin = new Map<string, string>();
			for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[idsCommuns[1], parChemin.get(LONGUEURS)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/hors du nœud de leur point TTECHNO : 1 sur 2 conformes/
			);
		});
	});
});
