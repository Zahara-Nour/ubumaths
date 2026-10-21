/**
 * Suites communes aux migrations des MODIFIER du lot 2 bis (une migration par lot)
 * ============================================================================
 *
 * Chaque lot (A « resserrer les nombres », B « retirer des variations »…) donne à des modèles de
 * question un nouveau contenu puis le tag de leur point, d'après la liste VALIDÉE par David
 * (docs/wip/arbre-notions/analyse/lot-2bis-modifications.md). Sa migration est générée par
 * `docs/wip/arbre-notions/analyse/lot_2bis_outils.py`, avec une fixture qui fige le contenu d'avant
 * et d'après.
 *
 * Les modèles n'existent qu'en production. Les suites fabriquent donc l'état de la prod — des
 * copies portant les VRAIS identifiants, avec leur contenu, leur nœud et leurs niveaux d'avant —
 * puis rejouent la migration **depuis son fichier**, dans une transaction annulée à la fin. Les
 * triggers de garde des tags restent actifs : chaque tag posé a passé la règle du nœud.
 *
 * Un lot de SCISSIONS (lot D) crée en plus, pour chaque modèle, un modèle neuf (`scission` de la
 * fixture) : absent avant, présent après avec son contenu, son tag et toutes les autres colonnes de
 * son origine, supprimé par le rollback — qui refuse si une donnée d'élève y tient.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Client } from 'pg';
import { getPostgresClient } from './postgres-client';
import { cleanupAllTestData } from './trigger-test-helpers';
import { TestData } from './test-data-factory';
import { extractRollback } from './migration-rollback';
import { readNodePaths } from './classification-paths';
import { insertProdCopies } from './prod-copies';

// ============================================================================
// TYPES
// ============================================================================

interface Contenu {
	title: string;
	description: string | null;
	variations: unknown[];
	shared: unknown;
	test_specs: unknown[] | null;
	/** Seulement pour un lot qui change aussi `options` (lot C : QCM à ne pas mélanger). */
	options?: unknown;
}

interface Modele {
	id: string;
	noeud: string[];
	grades: string[];
	tag: { grade: string; code: string };
	avant: Contenu;
	apres: Contenu;
	/** Lot de scissions : le modèle neuf qui reçoit l'autre partie du contenu. */
	scission?: { id: string; tag: { grade: string; code: string }; contenu: Contenu };
}

interface Neuf {
	id: string;
	origine: string;
	tag: { grade: string; code: string };
	contenu: Contenu;
}

interface Etat {
	contenus: Map<string, Contenu>;
	dates: Map<string, string>;
	tags: string[];
}

export interface LotModifier {
	/** Nom du lot dans les titres des suites (« resserrer les nombres tirés »). */
	nom: string;
	migration: string;
	fixture: string;
	/** Nombre de modèles du lot validé. */
	taille: number;
	/** Nombre de modèles neufs (lot de scissions). */
	neufs?: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Date de modification fabriquée : elle doit avancer (le contenu change). */
const AVANT = '2026-01-02T03:04:05.000Z';

/** Colonnes propres à chaque modèle : un modèle neuf copie toutes les AUTRES de son origine. */
const PROPRES = [
	'id',
	'title',
	'description',
	'variations',
	'shared',
	'test_specs',
	'options',
	'created_at',
	'updated_at'
];

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : les copies des modèles, avec leur contenu, leur nœud et leurs niveaux d'avant. */
async function poserEtatProd(pg: Client, auteur: string, modeles: Modele[]): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: modeles.map((m) => m.id),
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
	for (const m of modeles) {
		const node = parChemin.get(m.noeud.join(' > '));
		if (!node) throw new Error(`chemin introuvable : ${m.noeud.join(' > ')}`);
		if ('options' in m.avant) {
			await pg.query('update public.question_templates set options = $2 where id = $1', [
				m.id,
				m.avant.options === null ? null : JSON.stringify(m.avant.options)
			]);
		}
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

async function lireEtat(pg: Client, ids: string[], avecOptions: boolean): Promise<Etat> {
	const q = await pg.query<Contenu & { id: string; updated_at: Date }>(
		`select id, title, description, variations, shared, test_specs, options, updated_at
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
					test_specs: r.test_specs,
					...(avecOptions ? { options: r.options } : {})
				}
			])
		),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort()
	};
}

/** Modèles neufs dont une colonne non propre diffère de celle de leur origine (« id.colonne »). */
async function colonnesCopiees(pg: Client, neufs: Neuf[]): Promise<string[]> {
	const ecartes: string[] = [];
	for (const x of neufs) {
		const r = await pg.query<{
			neuf: Record<string, unknown> | null;
			origine: Record<string, unknown>;
		}>(
			`select (select to_jsonb(q) from public.question_templates q where q.id = $1) as neuf,
			        (select to_jsonb(q) from public.question_templates q where q.id = $2) as origine`,
			[x.id, x.origine]
		);
		const { neuf, origine } = r.rows[0];
		if (!neuf) {
			ecartes.push(`${x.id} absent`);
			continue;
		}
		for (const colonne of Object.keys(origine)) {
			if (PROPRES.includes(colonne)) continue;
			if (canonique(neuf[colonne]) !== canonique(origine[colonne]))
				ecartes.push(`${x.id}.${colonne}`);
		}
	}
	return ecartes;
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
function ecarts(modeles: Modele[], etat: Etat, attendu: (m: Modele) => Contenu): string[] {
	return modeles
		.filter((m) => canonique(etat.contenus.get(m.id)) !== canonique(attendu(m)))
		.map((m) => m.id);
}

// ============================================================================
// SUITES
// ============================================================================

/** Les deux suites d'un lot : le chemin nominal (contenu, tags, rollback) et les branches d'échec. */
export function decrireLotModifier(lot: LotModifier): void {
	const { modeles }: { modeles: Modele[] } = JSON.parse(readFileSync(lot.fixture, 'utf-8'));
	const ids = modeles.map((m) => m.id);
	const n = lot.taille;
	const avecOptions = modeles.some((m) => 'options' in m.avant);
	const neufs: Neuf[] = modeles.flatMap((m) =>
		m.scission ? [{ ...m.scission, origine: m.id }] : []
	);
	const idsNeufs = neufs.map((x) => x.id);
	const tous = [...ids, ...idsNeufs];
	const avecNeufs = neufs.length > 0;

	describe(`Lot 2 bis, ${lot.nom} (migration de données)`, () => {
		let pg: Client;
		let pose: Etat;
		let apres: Etat;
		let annule: Etat;
		let copies: string[];

		beforeAll(async () => {
			await cleanupAllTestData();
			const prof = await TestData.profile().withRole('teacher').create();
			pg = await getPostgresClient();

			await pg.query('begin');
			await poserEtatProd(pg, prof.id, modeles);
			pose = await lireEtat(pg, tous, avecOptions);
			await pg.query(readFileSync(lot.migration, 'utf-8'));
			apres = await lireEtat(pg, tous, avecOptions);
			copies = await colonnesCopiees(pg, neufs);
			await pg.query(extractRollback(lot.migration));
			annule = await lireEtat(pg, tous, avecOptions);
		}, 60_000);

		afterAll(async () => {
			await pg.query('rollback');
			await cleanupAllTestData();
		});

		it(`la fixture est le lot validé (${n} modèles, chacun modifié et tagué)`, () => {
			expect(modeles).toHaveLength(n);
			expect(modeles.filter((m) => canonique(m.avant) === canonique(m.apres))).toEqual([]);
			expect(neufs).toHaveLength(lot.neufs ?? 0);
		});

		it('l’état posé est bien celui de la prod (garde du test)', () => {
			expect(ecarts(modeles, pose, (m) => m.avant)).toEqual([]);
			expect(idsNeufs.filter((id) => pose.contenus.has(id))).toEqual([]);
		});

		it('chaque modèle a EXACTEMENT son nouveau contenu', () => {
			expect(ecarts(modeles, apres, (m) => m.apres)).toEqual([]);
		});

		it.runIf(avecNeufs)('chaque modèle neuf existe avec EXACTEMENT son contenu', () => {
			const lus = neufs.filter((x) => canonique(apres.contenus.get(x.id)) !== canonique(x.contenu));
			expect(lus.map((x) => x.id)).toEqual([]);
		});

		it.runIf(avecNeufs)(
			'chaque modèle neuf copie toutes les autres colonnes de son origine (nœud, niveaux, statut, auteur…)',
			() => {
				expect(copies).toEqual([]);
			}
		);

		it('les modèles portent EXACTEMENT les tags du lot, rien de plus', () => {
			const attendus = [
				...modeles.map((m) => `${m.id}§${m.tag.grade}§${m.tag.code}`),
				...neufs.map((x) => `${x.id}§${x.tag.grade}§${x.tag.code}`)
			].sort();
			expect(apres.tags).toEqual(attendus);
		});

		it('`updated_at` avance : le contenu a changé', () => {
			expect([...apres.dates.values()].filter((d) => d === AVANT)).toEqual([]);
		});

		it('le rollback écrit dans la migration rend le contenu d’avant et retire les tags', () => {
			expect(annule.tags).toEqual([]);
			expect(ecarts(modeles, annule, (m) => m.avant)).toEqual([]);
			expect(idsNeufs.filter((id) => annule.contenus.has(id))).toEqual([]);
		});
	});

	describe(`Lot 2 bis, ${lot.nom} : les branches d’échec de la migration`, () => {
		let pg: Client;
		let auteur: string;
		let eleve: string;

		beforeAll(async () => {
			await cleanupAllTestData();
			auteur = (await TestData.profile().withRole('teacher').create()).id;
			eleve = (await TestData.profile().withRole('student').create()).id;
			pg = await getPostgresClient();
		});

		afterAll(async () => {
			await pg.query('rollback').catch(() => undefined);
			await cleanupAllTestData();
		});

		async function echoue(alterer: () => Promise<unknown>, message: RegExp): Promise<void> {
			await pg.query('begin');
			try {
				await poserEtatProd(pg, auteur, modeles);
				await alterer();
				await expect(pg.query(readFileSync(lot.migration, 'utf-8'))).rejects.toThrow(message);
			} finally {
				await pg.query('rollback');
			}
		}

		it('TOUT ou RIEN : un modèle manquant fait échouer la migration', async () => {
			await echoue(
				() => pg.query('delete from public.question_templates where id = $1', [ids[0]]),
				new RegExp(`identifiants partiellement présents : ${n - 1} modèle\\(s\\) sur ${n}`)
			);
		});

		it('un modèle modifié depuis le relevé fait échouer la migration', async () => {
			await echoue(
				() =>
					pg.query(
						`update public.question_templates set title = title || ' (revu)' where id = $1`,
						[ids[0]]
					),
				/modèles modifiés depuis le relevé : 1/
			);
		});

		it.runIf(avecOptions)(
			'des options modifiées depuis le relevé font échouer la migration',
			async () => {
				await echoue(
					() =>
						pg.query(
							`update public.question_templates
							    set options = coalesce(options, '{}'::jsonb) || '{"delay": 99}'::jsonb
							  where id = $1`,
							[ids[0]]
						),
					/modèles modifiés depuis le relevé : 1/
				);
			}
		);

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
			const m = modeles[0];
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
				await poserEtatProd(pg, auteur, modeles);
				await pg.query(readFileSync(lot.migration, 'utf-8'));
				await pg.query(
					`update public.question_templates set title = title || ' (revu)' where id = $1`,
					[ids[0]]
				);
				await expect(pg.query(extractRollback(lot.migration))).rejects.toThrow(
					new RegExp(
						`rollback : ${n - 1} modèle\\(s\\) sur ${n} portent encore le contenu de la migration`
					)
				);
			} finally {
				await pg.query('rollback');
			}
		});

		it.runIf(avecNeufs)(
			'un identifiant de modèle neuf déjà pris fait échouer la migration',
			async () => {
				await echoue(
					() =>
						pg.query(
							`insert into public.question_templates
							 select (jsonb_populate_record(null::public.question_templates,
							         to_jsonb(q) || jsonb_build_object('id', $2::uuid))).*
							   from public.question_templates q where q.id = $1`,
							[neufs[0].origine, neufs[0].id]
						),
					/identifiants des modèles neufs déjà pris : 1/
				);
			}
		);

		it.runIf(avecNeufs)(
			'le rollback refuse si un modèle neuf a été retouché depuis la migration',
			async () => {
				await apresMigration(
					() =>
						pg.query(
							`update public.question_templates set title = title || ' (revu)' where id = $1`,
							[neufs[0].id]
						),
					new RegExp(
						`rollback : ${neufs.length - 1} modèle\\(s\\) neuf\\(s\\) sur ${neufs.length} portent encore le contenu de la migration`
					)
				);
			}
		);

		it.runIf(avecNeufs)(
			'le rollback refuse si une donnée d’élève tient à un modèle neuf (la suppression l’emporterait)',
			async () => {
				await apresMigration(
					() =>
						pg.query(
							`insert into public.skill_attempts (student_id, source, template_id, success)
							 values ($1, 'auto', $2, true)`,
							[eleve, neufs[0].id]
						),
					/rollback : 1 donnée\(s\) d'élève tiennent aux modèles neufs/
				);
			}
		);

		/** Joue la migration, altère, puis vérifie que le rollback refuse avec `message`. */
		async function apresMigration(alterer: () => Promise<unknown>, message: RegExp): Promise<void> {
			await pg.query('begin');
			try {
				await poserEtatProd(pg, auteur, modeles);
				await pg.query(readFileSync(lot.migration, 'utf-8'));
				await alterer();
				await expect(pg.query(extractRollback(lot.migration))).rejects.toThrow(message);
			} finally {
				await pg.query('rollback');
			}
		}
	});
}
