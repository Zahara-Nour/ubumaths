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
 *
 * Passe lycée (docs/wip/passe-lycee/analyse/lot-modifier.md) : un modèle peut déjà porter des tags
 * (`tags_avant`), que la migration exige et laisse ; un modèle neuf peut avoir son propre nœud
 * (`scission.noeud`, point sur une sous-notion voisine).
 *
 * Lot des scissions de la passe lycée (docs/wip/passe-lycee/analyse/scissions_outils.py) : la
 * fixture donne `tags` (plusieurs tags posés) et `neufs` (plusieurs modèles neufs, chacun avec ses
 * `tags`) au lieu de `tag` et `scission`, et une origine peut changer de nœud (`noeud_apres`, R2).
 * Les deux formes sont ramenées à la seconde (`normaliser`).
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

interface Tag {
	grade: string;
	code: string;
}

/** Modèle de la fixture, sous l'une ou l'autre forme (lots d'avant, ou scissions de la passe lycée). */
interface ModeleFixture {
	id: string;
	noeud: string[];
	/** Nœud d'arrivée (R2) : les points du modèle vivent ailleurs ; absent : il ne bouge pas. */
	noeud_apres?: string[];
	grades: string[];
	tag?: Tag;
	tags?: Tag[];
	tags_avant?: Tag[];
	tag_seul?: true;
	avant: Contenu;
	apres: Contenu;
	categorie?: Categorie;
	scission?: NeufFixture & { tag: Tag };
	neufs?: (NeufFixture & { tags: Tag[] })[];
}

interface NeufFixture {
	id: string;
	niveau: number;
	contenu: Contenu;
	noeud?: string[];
}

interface Modele {
	id: string;
	noeud: string[];
	noeud_apres?: string[];
	grades: string[];
	/** Tags posés par la migration sur le modèle. */
	tags: Tag[];
	/** Tags que le modèle porte déjà (passe lycée) : posés avant, gardés après et au rollback. */
	tags_avant?: { grade: string; code: string }[];
	/** Tag posé sans changer le contenu (passe lycée, lot C) : `apres` = `avant`, `updated_at` gardé. */
	tag_seul?: true;
	avant: Contenu;
	apres: Contenu;
	/**
	 * Catégorie relevée en prod (lot de scissions) : le modèle neuf la copie, sauf le niveau, et deux
	 * modèles publiés ne partagent pas une catégorie (idx_question_templates_unique_category).
	 */
	categorie?: Categorie;
	/** Lot de scissions : les modèles neufs qui reçoivent les autres parties du contenu. */
	neufs: Omit<Neuf, 'origine'>[];
}

interface Categorie {
	theme: string;
	domain: string;
	subdomain: string | null;
	level: number;
	status: string;
}

interface Neuf {
	id: string;
	origine: string;
	/** Niveau du modèle neuf dans la catégorie de son origine. */
	niveau: number;
	tags: Tag[];
	contenu: Contenu;
	/** Nœud propre (point ailleurs que sur le nœud de l'origine) ; absent : celui de l'origine. */
	noeud?: string[];
}

interface Etat {
	contenus: Map<string, Contenu>;
	dates: Map<string, string>;
	noeuds: Map<string, string>;
	tags: string[];
}

export interface LotModifier {
	/** Chantier dans les titres des suites (défaut : « Lot 2 bis »). */
	chantier?: string;
	/** Nom du lot dans les titres des suites (« resserrer les nombres tirés »). */
	nom: string;
	migration: string;
	fixture: string;
	/** Nombre de modèles du lot validé. */
	taille: number;
	/** Nombre de modèles neufs (lot de scissions). */
	neufs?: number;
	/**
	 * Le rollback refuse aussi un modèle neuf publié, rangé ailleurs ou retagué depuis (générateur de
	 * la passe lycée ; les migrations du collège, déjà jouées, ne gardent que le contenu).
	 */
	gardeRangementNeufs?: boolean;
	/** Nombre de modèles tagués sans changer de contenu (`tag_seul` dans la fixture). */
	tagsSeuls?: number;
	/** Nombre d'origines qui changent de nœud (R2, `noeud_apres` dans la fixture). */
	deplaces?: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Date de modification fabriquée : elle doit avancer quand le contenu change. */
const AVANT = '2026-01-02T03:04:05.000Z';

/** Colonnes propres à chaque modèle : un modèle neuf copie toutes les AUTRES de son origine. */
const PROPRES = [
	'id',
	'level',
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

/** Ramène un modèle de la fixture à la forme des scissions (listes de tags et de neufs). */
function normaliser(m: ModeleFixture): Modele {
	const { tag, tags, scission, neufs, ...reste } = m;
	return {
		...reste,
		tags: tags ?? (tag ? [tag] : []),
		neufs: neufs ?? (scission ? [neufDeScission(scission)] : [])
	};
}

function neufDeScission({ tag, ...neuf }: NeufFixture & { tag: Tag }): Omit<Neuf, 'origine'> {
	return { ...neuf, tags: [tag] };
}

/** Nœuds actifs par chemin (« branche > notion > sous-notion »). */
async function noeudsParChemin(pg: Client): Promise<Map<string, string>> {
	const parChemin = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) {
		if (!node.archived) parChemin.set(node.path, id);
	}
	return parChemin;
}

/**
 * Pose l'état de la prod : les copies des modèles, avec leur contenu, leur nœud, leurs niveaux et
 * leurs tags d'avant.
 */
async function poserEtatProd(pg: Client, auteur: string, modeles: Modele[]): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: modeles.map((m) => m.id),
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	const parChemin = await noeudsParChemin(pg);
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
		if (m.categorie) {
			const c = m.categorie;
			await pg.query(
				`update public.question_templates
				    set theme = $2, domain = $3, subdomain = $4, level = $5, status = $6
				  where id = $1`,
				[m.id, c.theme, c.domain, c.subdomain, c.level, c.status]
			);
		}
	}
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
	for (const m of modeles) {
		for (const t of m.tags_avant ?? []) {
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = $2 and code = $3 and archived_at is null`,
				[m.id, t.grade, t.code]
			);
		}
	}
}

/** Tags d'avant, au format de `Etat.tags`. */
function tagsAvant(modeles: Modele[]): string[] {
	return modeles.flatMap((m) => (m.tags_avant ?? []).map((t) => `${m.id}§${t.grade}§${t.code}`));
}

async function lireEtat(pg: Client, ids: string[], avecOptions: boolean): Promise<Etat> {
	const q = await pg.query<
		Contenu & { id: string; updated_at: Date; classification_node_id: string }
	>(
		`select id, title, description, variations, shared, test_specs, options, updated_at, classification_node_id
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
		noeuds: new Map(q.rows.map((r) => [r.id, r.classification_node_id])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort()
	};
}

/**
 * Modèles neufs dont une colonne non propre diffère de celle de leur origine, ou dont le niveau n'est
 * pas le leur (« id.colonne »).
 */
async function colonnesCopiees(pg: Client, neufs: Neuf[]): Promise<string[]> {
	const ecartes: string[] = [];
	const parChemin = await noeudsParChemin(pg);
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
		if (neuf.level !== x.niveau) ecartes.push(`${x.id}.level`);
		if (x.noeud && neuf.classification_node_id !== parChemin.get(x.noeud.join(' > ')))
			ecartes.push(`${x.id}.classification_node_id`);
		for (const colonne of Object.keys(origine)) {
			if (PROPRES.includes(colonne)) continue;
			if (x.noeud && colonne === 'classification_node_id') continue;
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
	const fixture: { modeles: ModeleFixture[] } = JSON.parse(readFileSync(lot.fixture, 'utf-8'));
	const modeles = fixture.modeles.map(normaliser);
	const ids = modeles.map((m) => m.id);
	const n = lot.taille;
	const avecOptions = modeles.some((m) => 'options' in m.avant);
	const neufs: Neuf[] = modeles.flatMap((m) => m.neufs.map((x) => ({ ...x, origine: m.id })));
	const tagsNeufs = neufs.flatMap((x) => x.tags.map((t) => `${x.id}§${t.grade}§${t.code}`));
	const deplaces = modeles.filter((m) => m.noeud_apres);
	const idsNeufs = neufs.map((x) => x.id);
	const tous = [...ids, ...idsNeufs];
	const avecNeufs = neufs.length > 0;
	const avant = tagsAvant(modeles).sort();
	const chantier = lot.chantier ?? 'Lot 2 bis';

	describe(`${chantier}, ${lot.nom} (migration de données)`, () => {
		let pg: Client;
		let pose: Etat;
		let apres: Etat;
		let annule: Etat;
		let copies: string[];
		let parChemin: Map<string, string>;

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
			parChemin = await noeudsParChemin(pg);
			await pg.query(extractRollback(lot.migration));
			annule = await lireEtat(pg, tous, avecOptions);
		}, 60_000);

		afterAll(async () => {
			await pg.query('rollback');
			await cleanupAllTestData();
		});

		it(`la fixture est le lot validé (${n} modèles, chacun modifié — sauf les tags seuls — et tagué)`, () => {
			expect(modeles).toHaveLength(n);
			expect(
				modeles.filter((m) => (canonique(m.avant) === canonique(m.apres)) !== (m.tag_seul === true))
			).toEqual([]);
			expect(modeles.filter((m) => m.tag_seul)).toHaveLength(lot.tagsSeuls ?? 0);
			expect(neufs).toHaveLength(lot.neufs ?? 0);
			expect(deplaces).toHaveLength(lot.deplaces ?? 0);
		});

		it('l’état posé est bien celui de la prod (garde du test)', () => {
			expect(ecarts(modeles, pose, (m) => m.avant)).toEqual([]);
			expect(idsNeufs.filter((id) => pose.contenus.has(id))).toEqual([]);
			expect(pose.tags).toEqual(avant);
		});

		it('chaque modèle a EXACTEMENT son nouveau contenu', () => {
			expect(ecarts(modeles, apres, (m) => m.apres)).toEqual([]);
		});

		it.runIf(avecNeufs)('chaque modèle neuf existe avec EXACTEMENT son contenu', () => {
			const lus = neufs.filter((x) => canonique(apres.contenus.get(x.id)) !== canonique(x.contenu));
			expect(lus.map((x) => x.id)).toEqual([]);
		});

		it.runIf(avecNeufs)(
			'chaque modèle neuf a son niveau et copie toutes les autres colonnes de son origine (nœud, statut, auteur…)',
			() => {
				expect(copies).toEqual([]);
			}
		);

		it('les modèles portent EXACTEMENT les tags du lot et ceux d’avant, rien de plus', () => {
			const attendus = [
				...avant,
				...modeles.flatMap((m) => m.tags.map((t) => `${m.id}§${t.grade}§${t.code}`)),
				...tagsNeufs
			].sort();
			expect(apres.tags).toEqual(attendus);
		});

		it.runIf(deplaces.length > 0)(
			'les origines déplacées (R2) sont sur le nœud de leurs points, les autres restent',
			() => {
				const faux = modeles.filter(
					(m) => apres.noeuds.get(m.id) !== parChemin.get((m.noeud_apres ?? m.noeud).join(' > '))
				);
				expect(faux.map((m) => m.id)).toEqual([]);
			}
		);

		it('`updated_at` avance là où le contenu change, et seulement là', () => {
			const seuls = new Set(modeles.filter((m) => m.tag_seul).map((m) => m.id));
			const fausses = [...apres.dates].filter(([id, d]) => (d === AVANT) !== seuls.has(id));
			expect(fausses).toEqual([]);
		});

		it('le rollback écrit dans la migration rend le contenu d’avant et retire les tags posés', () => {
			expect(annule.tags).toEqual(avant);
			expect(ids.map((id) => annule.noeuds.get(id))).toEqual(ids.map((id) => pose.noeuds.get(id)));
			expect(ecarts(modeles, annule, (m) => m.avant)).toEqual([]);
			expect(idsNeufs.filter((id) => annule.contenus.has(id))).toEqual([]);
		});
	});

	describe(`${chantier}, ${lot.nom} : les branches d’échec de la migration`, () => {
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
			// Un modèle qui ne bouge pas : son tag est accepté par le trigger sur le nœud d'avant.
			const m = modeles.find((x) => x.tags.length > 0 && !x.noeud_apres)!;
			await echoue(
				() =>
					pg.query(
						`insert into public.question_template_points (template_id, point_id)
						 select $1, id from public.curriculum_points where grade = $2 and code = $3 and archived_at is null`,
						[m.id, m.tags[0].grade, m.tags[0].code]
					),
				/tags déjà posés sur ces modèles : 1/
			);
		});

		it.runIf(avant.length > 0)(
			'un tag relevé retiré depuis le relevé fait échouer la migration',
			async () => {
				const m = modeles.find((x) => (x.tags_avant ?? []).length > 0)!;
				const t = m.tags_avant![0];
				await echoue(
					() =>
						pg.query(
							`delete from public.question_template_points q using public.curriculum_points p
							  where q.template_id = $1 and p.id = q.point_id and p.grade = $2 and p.code = $3`,
							[m.id, t.grade, t.code]
						),
					/tags relevés absents : 1/
				);
			}
		);

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
							         to_jsonb(q) || jsonb_build_object('id', $2::uuid, 'status', 'draft'))).*
							   from public.question_templates q where q.id = $1`,
							[neufs[0].origine, neufs[0].id]
						),
					/identifiants des modèles neufs déjà pris : 1/
				);
			}
		);

		it.runIf(avecNeufs)(
			'la catégorie d’un modèle neuf déjà prise par un modèle publié fait échouer la migration',
			async () => {
				await echoue(
					() =>
						pg.query(
							`insert into public.question_templates
							 select (jsonb_populate_record(null::public.question_templates,
							         to_jsonb(q) || jsonb_build_object('id', gen_random_uuid(), 'level', $2::integer,
							                                            'status', 'published'))).*
							   from public.question_templates q where q.id = $1`,
							[neufs[0].origine, neufs[0].niveau]
						),
					/catégories des modèles neufs déjà prises : 1/
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

		it.runIf(avecNeufs && lot.gardeRangementNeufs)(
			'le rollback refuse si un modèle neuf a été publié depuis la migration',
			async () => {
				await apresMigration(
					() =>
						pg.query(`update public.question_templates set status = 'published' where id = $1`, [
							neufs[0].id
						]),
					new RegExp(
						`rollback : ${neufs.length - 1} modèle\\(s\\) neuf\\(s\\) sur ${neufs.length} ont encore le statut et le nœud de la migration`
					)
				);
			}
		);

		it.runIf(avecNeufs && lot.gardeRangementNeufs)(
			'le rollback refuse si les tags d’un modèle neuf ont changé depuis la migration',
			async () => {
				await apresMigration(
					() =>
						pg.query('delete from public.question_template_points where template_id = $1', [
							neufs[0].id
						]),
					new RegExp(
						`rollback : les modèles neufs portent ${tagsNeufs.length - neufs[0].tags.length} tag\\(s\\), dont ${tagsNeufs.length - neufs[0].tags.length} posé\\(s\\)`
					)
				);
			}
		);

		it.runIf(neufs.some((x) => x.noeud))(
			'le point d’un modèle neuf déplacé hors de son nœud propre fait échouer la migration',
			async () => {
				// Un neuf rangé sur le nœud de son premier point, seul à le porter (aucun tag d'avant ne
				// l'utilise : le déplacer ne casse rien d'autre).
				const premiers = neufs.filter((n) => n.noeud).map((n) => n.tags[0].code);
				const x = neufs.find(
					(n) =>
						n.noeud &&
						premiers.filter((c) => c === n.tags[0].code).length === 1 &&
						!avant.some((a) => a.endsWith(`§${n.tags[0].code}`))
				)!;
				const origine = modeles.find((m) => m.id === x.origine)!;
				await echoue(async () => {
					const parChemin = await noeudsParChemin(pg);
					await pg.query(
						`update public.curriculum_points set node_id = $3
						  where grade = $1 and code = $2 and archived_at is null`,
						[x.tags[0].grade, x.tags[0].code, parChemin.get(origine.noeud.join(' > '))]
					);
				}, /points ou nœuds des modèles neufs introuvables : 1/);
			}
		);

		it.runIf(deplaces.length > 0)(
			'le rollback refuse si une origine déplacée a de nouveau changé de nœud',
			async () => {
				const m = deplaces[0];
				await apresMigration(
					async () => {
						// Ses tags d'abord : le trigger refuse de déplacer un modèle tagué hors de ses points.
						const parChemin = await noeudsParChemin(pg);
						await pg.query('delete from public.question_template_points where template_id = $1', [
							m.id
						]);
						await pg.query(
							'update public.question_templates set classification_node_id = $2 where id = $1',
							[m.id, parChemin.get(m.noeud.join(' > '))]
						);
					},
					new RegExp(
						`rollback : ${deplaces.length - 1} modèle\\(s\\) déplacé\\(s\\) sur ${deplaces.length}`
					)
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
