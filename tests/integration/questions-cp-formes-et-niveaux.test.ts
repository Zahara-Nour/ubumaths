/**
 * Chantier « questions » : sous-notion « reconnaître et nommer des formes » et niveaux de 19 brouillons CP
 * (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261026170000_questions_cp_formes_et_niveaux` : crée la sous-notion sous
 * « Géométrie > Figures planes », y déplace les points CP-054 et CP-055 et leurs deux modèles, et
 * donne des niveaux 1, 2, 3… aux 19 brouillons refusés à la publication (même catégorie, niveau 1).
 * Décision de David le 2026-10-25 (journal docs/wip/questions-progress.md).
 *
 * Les modèles n'existent qu'en production. Le test fabrique l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, au CP, au niveau 1 dans leur catégorie, les deux
 * modèles déplacés sur « propriétés » avec leur point — puis rejoue la migration **depuis son
 * fichier**, dans une transaction annulée à la fin. Les triggers de garde des tags restent actifs.
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
import { nodeIdByPath, readNodePaths } from '../helpers/database/classification-paths';
import { insertProdCopies } from '../helpers/database/prod-copies';
import { QUESTIONS_CP_FORMES } from '../helpers/database/later-migrations';

// ============================================================================
// TYPES
// ============================================================================

interface Modele {
	id: string;
	theme: string;
	domain: string;
	subdomain: string;
	apres: { subdomain: string; level: number };
}

interface Etat {
	noeudNouveau: boolean;
	points: Map<string, string>;
	modeles: Map<string, { noeud: string; subdomain: string; level: number; date: string }>;
	tags: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = QUESTIONS_CP_FORMES;
const FIGURES = 'Géométrie > Figures planes';
const PROPRIETES = `${FIGURES} > propriétés`;
const FORMES = `${FIGURES} > reconnaître et nommer des formes`;
const FORME = 'e7453c9b-8cbd-44ef-86ca-2aaf0340b5fa'; // Quelle est cette forme ? (CP-055)
const DESSIN = '9d6bc8b3-ee8f-4f70-a735-61b1075a9746'; // Combien de formes dans le dessin ? (CP-054)

function lot(
	theme: string,
	domain: string,
	subdomain: string,
	ids: string[],
	nouveau = subdomain
): Modele[] {
	return ids.map((id, i) => ({
		id,
		theme,
		domain,
		subdomain,
		apres: { subdomain: nouveau, level: i + 1 }
	}));
}

/** Les 19 brouillons, dans l'ordre des niveaux validé par David. */
const LOT: Modele[] = [
	...lot('Grandeurs', 'Durées', "Lire l'heure", [
		'9780d3c1-bb3b-4519-bd0f-032fa27e8e1f',
		'f1759d81-6c73-4c3a-9db0-df90f37b71c7'
	]),
	...lot('Statistiques', 'Représenter des données', 'Tableau à double entrée', [
		'76d14aa6-086b-4c58-b668-b8a0b2968cb8',
		'55662eef-d05e-46fa-897d-354a2bd5ec22'
	]),
	...lot(
		'Géométrie',
		'Figures planes',
		'Propriétés',
		[FORME, DESSIN],
		'Reconnaître et nommer des formes'
	),
	...lot('Géométrie', 'Figures planes', 'Propriétés', [
		'c85626fa-c875-4314-bbb9-96c4b7c6dd48',
		'91012bab-0bab-4cd0-a86c-97574c44c9d9',
		'b5389494-3b1c-4f32-85c2-473192c9bacc'
	]),
	...lot('Géométrie', 'Repérage et déplacements', 'Positions et plans', [
		'd5a36be9-f6bb-428f-b0e0-60bee080bd19',
		'2fc01600-c06d-45cc-a2bd-a8f89ff7fc58'
	]),
	...lot('Grandeurs', 'Longueurs', 'Comparaison et mesure', [
		'7093b797-0fa4-44e1-8828-327d5d3c452b',
		'd50c6e21-627f-45eb-9ca1-9dcfa6757563'
	]),
	...lot('Géométrie', 'Solides', 'Reconnaître et décrire', [
		'12482155-d91f-4744-bc43-fd0d9ff18f77',
		'b556f617-a7d6-43a2-a1f0-15ac34834e7b',
		'7e7e2968-a550-483f-9399-3526f2bb5030',
		'3e9a610e-46a8-4b0c-b6bd-5d022aebf7e3',
		'8e207417-6be5-4c0d-81d2-d419a7dc4db1',
		'74d6b4f3-f180-4315-a2c4-ccfb1b3f3024'
	])
];
const ids = LOT.map((m) => m.id);
/** Les modèles de « propriétés » qui y restent, rangés et tagués comme en prod. */
const RESTENT = [
	{ id: 'c85626fa-c875-4314-bbb9-96c4b7c6dd48', code: 'CP-056' },
	{ id: '91012bab-0bab-4cd0-a86c-97574c44c9d9', code: 'CP-056' },
	{ id: 'b5389494-3b1c-4f32-85c2-473192c9bacc', code: 'CP-057' }
];
/** Date de modification fabriquée : elle ne doit pas bouger. */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : copies au CP, niveau 1, les deux modèles déplacés rangés et tagués. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	const proprietes = await nodeIdByPath(pg, PROPRIETES);
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	for (const m of LOT) {
		await pg.query(
			`update public.question_templates set grades = array['CP'], theme = $2, domain = $3, subdomain = $4, level = 1
			  where id = $1`,
			[m.id, m.theme, m.domain, m.subdomain]
		);
	}
	await pg.query(
		'update public.question_templates set classification_node_id = $2 where id = any($1::uuid[])',
		[[FORME, DESSIN, ...RESTENT.map((r) => r.id)], proprietes]
	);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
	await pg.query(
		`insert into public.question_template_points (template_id, point_id)
		 select r.id, p.id from unnest($1::uuid[], $2::text[]) as r(id, code)
		   join public.curriculum_points p on p.grade = 'CP' and p.code = r.code and p.archived_at is null`,
		[
			[FORME, DESSIN, ...RESTENT.map((r) => r.id)],
			['CP-055', 'CP-054', ...RESTENT.map((r) => r.code)]
		]
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) chemins.set(id, node.path);
	const p = await pg.query<{ code: string; node: string | null }>(
		`select code, node_id as node from public.curriculum_points
		  where grade = 'CP' and code in ('CP-054', 'CP-055', 'CP-056', 'CP-057') and archived_at is null`
	);
	const q = await pg.query<{
		id: string;
		node: string | null;
		subdomain: string | null;
		level: number;
		updated_at: Date;
	}>(
		`select id, classification_node_id as node, subdomain, level, updated_at
		   from public.question_templates where id = any($1::uuid[])`,
		[ids]
	);
	const t = await pg.query<{ template_id: string; code: string }>(
		`select q.template_id, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = any($1::uuid[])`,
		[ids]
	);
	return {
		noeudNouveau: [...chemins.values()].includes(FORMES),
		points: new Map(p.rows.map((r) => [r.code, chemins.get(r.node ?? '') ?? '∅'])),
		modeles: new Map(
			q.rows.map((r) => [
				r.id,
				{
					noeud: chemins.get(r.node ?? '') ?? '∅',
					subdomain: r.subdomain ?? '',
					level: r.level,
					date: r.updated_at.toISOString()
				}
			])
		),
		tags: t.rows.map((r) => `${r.template_id}§${r.code}`).sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions CP : sous-notion des formes et niveaux des 19 brouillons (migration de données)', () => {
	let pg: Client;
	let avant: Etat;
	let apres: Etat;
	let annule: Etat;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		// La base locale (et la CI) porte déjà cette migration : retrouver l'état d'avant
		await pg.query(extractRollback(MIGRATION));
		await poserEtatProd(pg, prof.id);
		avant = await lireEtat(pg);
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		apres = await lireEtat(pg);
		await pg.query(extractRollback(MIGRATION));
		annule = await lireEtat(pg);
	}, 60_000);

	afterAll(async () => {
		await pg.query('rollback');
		await cleanupAllTestData();
	});

	it('la sous-notion « reconnaître et nommer des formes » est créée sous Figures planes', () => {
		expect(avant.noeudNouveau).toBe(false);
		expect(apres.noeudNouveau).toBe(true);
	});

	it('CP-054 et CP-055 passent sur la nouvelle sous-notion ; CP-056 et CP-057 restent', () => {
		expect(Object.fromEntries(apres.points)).toEqual({
			'CP-054': FORMES,
			'CP-055': FORMES,
			'CP-056': PROPRIETES,
			'CP-057': PROPRIETES
		});
	});

	it('les deux modèles suivent leur point, tags intacts ; les autres ne bougent pas', () => {
		expect(apres.modeles.get(FORME)?.noeud).toBe(FORMES);
		expect(apres.modeles.get(DESSIN)?.noeud).toBe(FORMES);
		expect(apres.tags).toEqual(
			[`${DESSIN}§CP-054`, `${FORME}§CP-055`, ...RESTENT.map((r) => `${r.id}§${r.code}`)].sort()
		);
		expect(RESTENT.map((r) => apres.modeles.get(r.id)?.noeud)).toEqual(
			RESTENT.map(() => PROPRIETES)
		);
		const restes = new Set([FORME, DESSIN, ...RESTENT.map((r) => r.id)]);
		const autres = LOT.filter((m) => !restes.has(m.id));
		expect(autres.map((m) => apres.modeles.get(m.id)?.noeud)).toEqual(autres.map(() => '∅'));
	});

	it('chaque modèle a son niveau et son texte de catégorie', () => {
		expect(LOT.map((m) => apres.modeles.get(m.id)?.level)).toEqual(LOT.map((m) => m.apres.level));
		expect(LOT.map((m) => apres.modeles.get(m.id)?.subdomain)).toEqual(
			LOT.map((m) => m.apres.subdomain)
		);
	});

	it('`updated_at` des modèles est préservé', () => {
		expect(LOT.map((m) => apres.modeles.get(m.id)?.date)).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule).toEqual(avant);
	});
});

describe('Questions CP : les branches d’échec de la migration des formes', () => {
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
			await pg.query(extractRollback(MIGRATION));
			await corps();
		} finally {
			await pg.query('rollback');
		}
	}

	it('base sans les modèles (locale) : seuls la sous-notion et les deux points changent, et le rollback les rend', async () => {
		await enTransaction(async () => {
			const avantLocal = await lireEtat(pg);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			const etat = await lireEtat(pg);
			expect(etat.noeudNouveau).toBe(true);
			expect(etat.points.get('CP-054')).toBe(FORMES);
			expect(etat.points.get('CP-055')).toBe(FORMES);
			expect(etat.modeles.size).toBe(0);
			await pg.query(extractRollback(MIGRATION));
			expect(await lireEtat(pg)).toEqual(avantLocal);
		});
	});

	it('TOUT ou RIEN : un modèle manquant fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [ids[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 18 modèle\(s\) sur 19/
			);
		});
	});

	it('un modèle publié ou renuméroté depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('update public.question_templates set level = 4 where id = $1', [ids[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles modifiés depuis le relevé \(statut, niveau ou catégorie\) : 1/
			);
		});
	});

	it('un modèle déplacé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_template_points where template_id = $1', [
				DESSIN
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déplacés : 1 sur 2 sur « propriétés » avec leur seul point/
			);
		});
	});

	it('un point déjà déplacé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			const figures = await nodeIdByPath(pg, FIGURES);
			await pg.query(
				`update public.curriculum_points set node_id = $1 where grade = 'CP' and code = 'CP-055' and archived_at is null`,
				[figures]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/points CP-054 et CP-055 introuvables sur « propriétés » : 1 sur 2/
			);
		});
	});
});
