/**
 * Migrations « nœud et tag » générées pour un lot de modèles (Supabase local requis)
 * ==================================================================================
 *
 * Générées par `scripts/questions/migration-rangement.ts` : chacune pose une fixture sous
 * `tests/integration/fixtures/rangement-tags/` (chemin du nœud, code du point, niveaux relevés et
 * posés). Ce test les rejoue TOUTES, depuis leur fichier de migration, dans une transaction
 * annulée à la fin : copies des modèles de la prod (vrais identifiants, sans nœud ni tag),
 * migration, vérification, rollback extrait de l'en-tête. Les triggers de garde des tags restent
 * actifs : chaque tag posé a passé la règle du nœud.
 *
 * Il rejoue aussi une migration fabriquée par le générateur sur un lot synthétique, pris dans
 * l'arbre et les points de la base locale, pour éprouver le générateur lui-même (résolution
 * stricte, gardes, tout ou rien, deux points de deux programmes, tag ajouté à un modèle rangé).
 * Les fixtures d'avant l'outil 66 (`point` au lieu de `points`) sont relues par `lireFixture`.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Client } from 'pg';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { extractRollback } from '../helpers/database/migration-rollback';
import { nodeIdByPath, readNodePaths } from '../helpers/database/classification-paths';
import { insertProdCopies } from '../helpers/database/prod-copies';
import {
	genererMigration,
	lireFixture,
	type ModeleNiveaux,
	type ModeleRange,
	type ModeleTags
} from '../../scripts/lib/migration-rangement';

// ============================================================================
// TYPES
// ============================================================================

interface Cas {
	migration: string;
	ranges: ModeleRange[];
	niveaux: ModeleNiveaux[];
	tags: ModeleTags[];
}

interface Etat {
	/** id du modèle → chemin de son nœud (`∅` = sans nœud) */
	noeuds: Map<string, string>;
	/** `<id>§<code>` de chaque tag des modèles du lot, triés */
	tags: string[];
	/** id du modèle → niveaux */
	grades: Map<string, string[]>;
	/** Dates de modification distinctes des modèles du lot */
	dates: string[];
	/** État du trigger `updated_at` : `O` = actif */
	trigger: string;
}

interface Emplacement {
	code: string;
	branche: string;
	notion: string;
	sous_notion: string | null;
}

/** Deux points de deux programmes, posables sur un même nœud (l'un sur lui, l'autre sur lui ou sa notion) */
interface Paire {
	chemin: string;
	premier: string;
	second: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const FIXTURES = 'tests/integration/fixtures/rangement-tags';
/** Date de modification fabriquée : ranger, taguer, ajouter un niveau ne doivent pas la toucher */
const AVANT = '2026-01-02T03:04:05.000Z';
const TRIGGER = 'update_question_templates_updated_at';
const SYNTHETIQUES = [
	'c0a7e100-0000-4000-8000-00000000000a',
	'c0a7e100-0000-4000-8000-00000000000b',
	'c0a7e100-0000-4000-8000-00000000000c',
	'c0a7e100-0000-4000-8000-00000000000d',
	'c0a7e100-0000-4000-8000-00000000000e',
	'c0a7e100-0000-4000-8000-00000000000f'
] as const;

// ============================================================================
// FONCTIONS
// ============================================================================

function casDesFixtures(): Cas[] {
	if (!existsSync(FIXTURES)) return [];
	return readdirSync(FIXTURES)
		.filter((f) => f.endsWith('.json'))
		.sort()
		.map((f) => lireFixture(JSON.parse(readFileSync(join(FIXTURES, f), 'utf-8'))));
}

function idsDe(cas: Cas): string[] {
	return [...new Set([...cas.ranges, ...cas.niveaux, ...cas.tags].map((m) => m.id))];
}

function cheminDe(m: ModeleRange): string {
	return [m.branche, m.notion, ...(m.sousNotion === null ? [] : [m.sousNotion])].join(' > ');
}

async function sansHorodatage(pg: Client, corps: () => Promise<void>): Promise<void> {
	await pg.query(`alter table public.question_templates disable trigger ${TRIGGER}`);
	await corps();
	await pg.query(`alter table public.question_templates enable trigger ${TRIGGER}`);
}

/**
 * Pose l'état de la prod : copies sans nœud ni tag pour les modèles à ranger ; niveaux relevés et
 * un nœud (comme en prod : un modèle qui gagne un niveau est déjà rangé) pour ceux qui en gagnent ;
 * nœud et tags relevés pour ceux qui gagnent un tag
 */
async function poserEtatProd(pg: Client, cas: Cas): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: idsDe(cas),
		exerciseIds: [],
		authorId: idsDe(cas)[0],
		timestamp: AVANT
	});
	await sansHorodatage(pg, async () => {
		for (const m of cas.niveaux) {
			await pg.query(
				`update public.question_templates
				    set grades = $2::text[],
				        classification_node_id = (select id from public.classification_nodes
				                                   where kind = 'notion' and archived_at is null
				                                   order by id limit 1)
				  where id = $1`,
				[m.id, m.avant]
			);
		}
		// Comme en prod (le relevé l'a vérifié) : le modèle a les niveaux de ses points, sauf ceux que
		// la même migration lui ajoute ; ceux-là, son bloc de niveaux les pose
		for (const m of cas.tags) {
			const gagnes = cas.niveaux.find((n) => n.id === m.id);
			await pg.query(
				`update public.question_templates t
				    set classification_node_id = $2,
				        grades = case when $4::boolean then t.grades else array(
				          select distinct g from unnest(t.grades || array(
				            select p.grade from public.curriculum_points p
				             where p.code = any($3::text[]) and p.grade is not null)) as g) end
				  where t.id = $1`,
				[m.id, await nodeIdByPath(pg, m.noeud), [...m.avant, ...m.ajoutes], gagnes !== undefined]
			);
		}
	});
	for (const m of cas.tags) {
		await pg.query(
			`insert into public.question_template_points (template_id, point_id)
			 select $1, p.id from public.curriculum_points p where p.code = any($2::text[])`,
			[m.id, m.avant]
		);
	}
}

async function lireEtat(pg: Client, cas: Cas): Promise<Etat> {
	const ids = idsDe(cas);
	const chemins = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) chemins.set(id, node.path);
	const q = await pg.query<{ id: string; node: string | null; grades: string[]; updated_at: Date }>(
		`select id, classification_node_id as node, grades, updated_at
		   from public.question_templates where id = any($1::uuid[])`,
		[ids]
	);
	const t = await pg.query<{ template_id: string; code: string }>(
		`select q.template_id, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = any($1::uuid[])`,
		[ids]
	);
	const g = await pg.query<{ tgenabled: string }>(
		'select tgenabled from pg_trigger where tgname = $1',
		[TRIGGER]
	);
	return {
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? '∅'])),
		tags: t.rows.map((r) => `${r.template_id}§${r.code}`).sort(),
		grades: new Map(q.rows.map((r) => [r.id, r.grades])),
		dates: [...new Set(q.rows.map((r) => r.updated_at.toISOString()))],
		trigger: g.rows[0]?.tgenabled ?? '∅'
	};
}

function tagsAttendus(cas: Cas): string[] {
	return [
		...cas.ranges.flatMap((m) => m.points.map((code) => `${m.id}§${code}`)),
		...cas.tags.flatMap((m) => [...m.avant, ...m.ajoutes].map((code) => `${m.id}§${code}`))
	].sort();
}

/** Les tags relevés en prod, que le rollback doit laisser */
function tagsAvant(cas: Cas): string[] {
	return cas.tags.flatMap((m) => m.avant.map((code) => `${m.id}§${code}`)).sort();
}

async function enTransaction(pg: Client, corps: () => Promise<void>): Promise<void> {
	await pg.query('begin');
	try {
		await corps();
	} finally {
		await pg.query('rollback');
	}
}

/**
 * Les comportements que TOUTE migration générée doit tenir. `lot` (fixture, connue à la déclaration) :
 * un cas sans objet pour ce lot est SAUTÉ, pas vide (vitest exige au moins une assertion) ; sans
 * `lot` (cas synthétique, bâti au `beforeAll`), tous les cas tournent.
 */
function eprouver(obtenir: () => { pg: Client; cas: Cas }, lot?: Cas): void {
	it('migration : chaque modèle EXACTEMENT sur son nœud, avec ses points ; niveaux et tags ajoutés posés ; `updated_at` préservé ; rollback : l’état d’avant', async () => {
		const { pg, cas } = obtenir();
		await enTransaction(pg, async () => {
			await poserEtatProd(pg, cas);
			const avant = await lireEtat(pg, cas);
			expect(cas.niveaux.every((m) => avant.noeuds.get(m.id) !== '∅')).toBe(true);
			expect(avant.tags).toEqual(tagsAvant(cas));
			await pg.query(readFileSync(cas.migration, 'utf-8'));
			const apres = await lireEtat(pg, cas);
			expect(cas.ranges.map((m) => apres.noeuds.get(m.id))).toEqual(cas.ranges.map(cheminDe));
			expect(apres.tags).toEqual(tagsAttendus(cas));
			expect(cas.niveaux.map((m) => apres.grades.get(m.id))).toEqual(
				cas.niveaux.map((m) => m.apres)
			);
			expect(cas.niveaux.map((m) => apres.noeuds.get(m.id))).toEqual(
				cas.niveaux.map((m) => avant.noeuds.get(m.id))
			);
			expect([apres.dates, apres.trigger]).toEqual([[AVANT], 'O']);

			await pg.query(extractRollback(cas.migration));
			const annule = await lireEtat(pg, cas);
			expect(cas.ranges.map((m) => annule.noeuds.get(m.id))).toEqual(cas.ranges.map(() => '∅'));
			expect(annule.tags).toEqual(tagsAvant(cas));
			expect(cas.tags.map((m) => annule.noeuds.get(m.id))).toEqual(cas.tags.map((m) => m.noeud));
			expect(cas.niveaux.map((m) => annule.grades.get(m.id))).toEqual(
				cas.niveaux.map((m) => m.avant)
			);
			expect(cas.niveaux.map((m) => annule.noeuds.get(m.id))).toEqual(
				cas.niveaux.map((m) => avant.noeuds.get(m.id))
			);
			expect([annule.dates, annule.trigger]).toEqual([[AVANT], 'O']);
		});
	});

	it('modèles absents (base locale) : la migration ne touche rien et passe', async () => {
		const { pg, cas } = obtenir();
		await enTransaction(pg, async () => {
			await pg.query('delete from public.question_templates where id = any($1::uuid[])', [
				idsDe(cas)
			]);
			await expect(pg.query(readFileSync(cas.migration, 'utf-8'))).resolves.toBeDefined();
		});
	});

	it.skipIf(lot !== undefined && lot.ranges.length < 2)(
		'TOUT ou RIEN : un modèle à ranger manquant fait échouer la migration',
		async () => {
			const { pg, cas } = obtenir();
			await enTransaction(pg, async () => {
				await poserEtatProd(pg, cas);
				await pg.query('delete from public.question_templates where id = $1', [cas.ranges[0].id]);
				await expect(pg.query(readFileSync(cas.migration, 'utf-8'))).rejects.toThrow(
					new RegExp(
						`identifiants partiellement présents : ${cas.ranges.length - 1} modèle\\(s\\) sur ${cas.ranges.length}`
					)
				);
			});
		}
	);

	it.skipIf(lot !== undefined && lot.ranges.length === 0)(
		'un modèle rangé à la main depuis le relevé fait échouer la migration',
		async () => {
			const { pg, cas } = obtenir();
			await enTransaction(pg, async () => {
				await poserEtatProd(pg, cas);
				await pg.query(
					`update public.question_templates
				    set classification_node_id = (select id from public.classification_nodes
				                                   where kind = 'notion' and archived_at is null limit 1)
				  where id = $1`,
					[cas.ranges.at(-1)?.id]
				);
				await expect(pg.query(readFileSync(cas.migration, 'utf-8'))).rejects.toThrow(
					/modèles déjà rangés depuis le relevé : 1/
				);
			});
		}
	);

	it('migration déjà jouée : la rejouer refuse', async () => {
		const { pg, cas } = obtenir();
		await enTransaction(pg, async () => {
			await poserEtatProd(pg, cas);
			await pg.query(readFileSync(cas.migration, 'utf-8'));
			await expect(pg.query(readFileSync(cas.migration, 'utf-8'))).rejects.toThrow(
				cas.ranges.length > 0 ? /modèles déjà rangés depuis le relevé/ : /changés depuis le relevé/
			);
		});
	});

	it.skipIf(lot !== undefined && lot.niveaux.length === 0)(
		'niveaux retouchés depuis le relevé : la migration échoue, et rien n’est rangé',
		async () => {
			const { pg, cas } = obtenir();
			const dernier = cas.niveaux.at(-1);
			if (!dernier) throw new Error('lot sans niveau ajouté');
			await enTransaction(pg, async () => {
				await poserEtatProd(pg, cas);
				await pg.query(
					`update public.question_templates set grades = grades || array['CE1'] where id = $1`,
					[dernier.id]
				);
				await pg.query('savepoint s');
				await expect(pg.query(readFileSync(cas.migration, 'utf-8'))).rejects.toThrow(
					new RegExp(`niveaux de ${dernier.id.slice(0, 8)} changés depuis le relevé`)
				);
				await pg.query('rollback to savepoint s');
				const etat = await lireEtat(pg, cas);
				expect(cas.ranges.every((m) => etat.noeuds.get(m.id) === '∅')).toBe(true);
				expect(etat.tags).toEqual(tagsAvant(cas));
			});
		}
	);

	it.skipIf(lot !== undefined && lot.tags.length === 0)(
		'point ajouté d’un niveau retiré du modèle depuis le relevé : la migration échoue',
		async () => {
			const { pg, cas } = obtenir();
			const dernier = cas.tags.at(-1);
			if (!dernier) throw new Error('lot sans tag ajouté');
			await enTransaction(pg, async () => {
				await poserEtatProd(pg, cas);
				await sansHorodatage(pg, async () => {
					await pg.query(
						`update public.question_templates set grades = array['CP']::text[] where id = $1`,
						[dernier.id]
					);
				});
				await expect(pg.query(readFileSync(cas.migration, 'utf-8'))).rejects.toThrow(
					cas.niveaux.some((m) => m.id === dernier.id)
						? /changés depuis le relevé/
						: /point ajouté d'un niveau absent du modèle/
				);
			});
		}
	);

	it.skipIf(lot !== undefined && lot.tags.length === 0)(
		'TOUT ou RIEN : un modèle à taguer manquant fait échouer la migration (ou aucun, si c’est le seul)',
		async () => {
			const { pg, cas } = obtenir();
			const premier = cas.tags[0];
			if (!premier) throw new Error('lot sans tag ajouté');
			await enTransaction(pg, async () => {
				await poserEtatProd(pg, cas);
				await pg.query('delete from public.question_templates where id = $1', [premier.id]);
				const autres = cas.tags.length - 1;
				const migration = pg.query(readFileSync(cas.migration, 'utf-8'));
				if (autres === 0 || cas.ranges.some((m) => m.id === premier.id)) {
					await expect(migration).resolves.toBeDefined();
				} else {
					await expect(migration).rejects.toThrow(
						new RegExp(`modèles à taguer partiellement présents : ${autres} sur ${cas.tags.length}`)
					);
				}
			});
		}
	);

	it.skipIf(lot !== undefined && lot.tags.length === 0)(
		'tags retouchés depuis le relevé : la migration échoue, et rien n’est rangé',
		async () => {
			const { pg, cas } = obtenir();
			const dernier = cas.tags.at(-1);
			if (!dernier) throw new Error('lot sans tag ajouté');
			await enTransaction(pg, async () => {
				await poserEtatProd(pg, cas);
				await pg.query('delete from public.question_template_points where template_id = $1', [
					dernier.id
				]);
				await pg.query(
					`insert into public.question_template_points (template_id, point_id)
					 select $1, p.id from public.curriculum_points p where p.code = $2`,
					[dernier.id, dernier.ajoutes[0]]
				);
				await pg.query('savepoint s');
				await expect(pg.query(readFileSync(cas.migration, 'utf-8'))).rejects.toThrow(
					new RegExp(`tags de ${dernier.id.slice(0, 8)} changés depuis le relevé`)
				);
				await pg.query('rollback to savepoint s');
				const etat = await lireEtat(pg, cas);
				expect(cas.ranges.every((m) => etat.noeuds.get(m.id) === '∅')).toBe(true);
				expect(cas.niveaux.map((m) => etat.grades.get(m.id))).toEqual(
					cas.niveaux.map((m) => m.avant)
				);
			});
		}
	);

	it.skipIf(lot !== undefined && !lot.ranges.some((m) => m.points.length === 0))(
		'rollback : un modèle déplacé à la main depuis la migration garde son nouveau nœud',
		async () => {
			const { pg, cas } = obtenir();
			const deplace = cas.ranges.find((m) => m.points.length === 0);
			if (!deplace) throw new Error('lot sans modèle rangé sans point');
			await enTransaction(pg, async () => {
				await poserEtatProd(pg, cas);
				await pg.query(readFileSync(cas.migration, 'utf-8'));
				await pg.query(
					`update public.question_templates t
				    set classification_node_id = (select n.id from public.classification_nodes n
				                                   where n.kind = 'notion' and n.archived_at is null
				                                     and n.id <> t.classification_node_id
				                                   order by n.id limit 1)
				  where t.id = $1`,
					[deplace.id]
				);
				const ailleurs = (await lireEtat(pg, cas)).noeuds.get(deplace.id);
				expect(ailleurs).not.toBe(cheminDe(deplace));
				await pg.query(extractRollback(cas.migration));
				const annule = await lireEtat(pg, cas);
				expect(annule.noeuds.get(deplace.id)).toBe(ailleurs);
				expect(
					cas.ranges.filter((m) => m.id !== deplace.id).map((m) => annule.noeuds.get(m.id))
				).toEqual(cas.ranges.filter((m) => m.id !== deplace.id).map(() => '∅'));
			});
		}
	);

	it.skipIf(lot !== undefined && lot.niveaux.length === 0)(
		'rollback : il ne rend pas les niveaux d’un modèle retouché depuis la migration',
		async () => {
			const { pg, cas } = obtenir();
			const premier = cas.niveaux[0];
			if (!premier) throw new Error('lot sans niveau ajouté');
			await enTransaction(pg, async () => {
				await poserEtatProd(pg, cas);
				await pg.query(readFileSync(cas.migration, 'utf-8'));
				const retouche = [...premier.apres, 'CE1'];
				await pg.query('update public.question_templates set grades = $2::text[] where id = $1', [
					premier.id,
					retouche
				]);
				await pg.query(extractRollback(cas.migration));
				expect((await lireEtat(pg, cas)).grades.get(premier.id)).toEqual(retouche);
			});
		}
	);
}

/** Un point posé sur une sous-notion, un point posé sur une notion : pris dans la base locale */
async function emplacements(
	pg: Client
): Promise<{ surSousNotion: Emplacement; surNotion: Emplacement }> {
	const surSousNotion = await pg.query<Emplacement>(
		`select p.code, b.name as branche, n.name as notion, s.name as sous_notion
		   from public.curriculum_points p
		   join public.classification_nodes s on s.id = p.node_id and s.kind = 'subnotion' and s.archived_at is null
		   join public.classification_nodes n on n.id = s.parent_id and n.kind = 'notion' and n.archived_at is null
		   join public.classification_nodes b on b.id = n.parent_id and b.kind = 'branch' and b.parent_id is null
		        and b.archived_at is null
		  where p.archived_at is null and p.code is not null
		  order by p.code limit 1`
	);
	// Le modèle va sur une sous-notion de la notion du point quand elle en a une : le tag passe par
	// « le point est sur la notion du nœud »
	const surNotion = await pg.query<Emplacement>(
		`select p.code, b.name as branche, n.name as notion,
		        (select s.name from public.classification_nodes s
		          where s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
		          order by s.name limit 1) as sous_notion
		   from public.curriculum_points p
		   join public.classification_nodes n on n.id = p.node_id and n.kind = 'notion' and n.archived_at is null
		   join public.classification_nodes b on b.id = n.parent_id and b.kind = 'branch' and b.parent_id is null
		        and b.archived_at is null
		  where p.archived_at is null and p.code is not null
		  order by (exists (select 1 from public.classification_nodes s
		                     where s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null)) desc,
		           p.code
		  limit 1`
	);
	if (!surSousNotion.rows[0] || !surNotion.rows[0]) {
		throw new Error('base locale sans point du programme posé sur un nœud : arbre non migré ?');
	}
	return { surSousNotion: surSousNotion.rows[0], surNotion: surNotion.rows[0] };
}

/** Deux points de deux programmes posables sur un même nœud, pris dans la base locale */
async function paire(pg: Client): Promise<Paire> {
	const r = await pg.query<{ node: string; premier: string; second: string }>(
		`select x.id as node, p1.code as premier, p2.code as second
		   from public.curriculum_points p1
		   join public.classification_nodes x on x.id = p1.node_id and x.archived_at is null
		   join public.curriculum_points p2
		     on p2.node_id in (x.id, case when x.kind = 'subnotion' then x.parent_id else x.id end)
		    and p2.grade is distinct from p1.grade and p2.archived_at is null and p2.code is not null
		  where p1.archived_at is null and p1.code is not null
		    and p1.grade is not null and p2.grade is not null
		  order by p1.code, p2.code
		  limit 1`
	);
	const ligne = r.rows[0];
	const chemin = ligne && (await readNodePaths(pg)).get(ligne.node)?.path;
	if (!ligne || !chemin) throw new Error('base locale sans deux programmes sur un même nœud');
	return { chemin, premier: ligne.premier, second: ligne.second };
}

function casSynthetique(a: Emplacement, b: Emplacement, deux?: Paire): Cas {
	const ranges: ModeleRange[] = [
		{
			id: SYNTHETIQUES[0],
			title: "Point sur la sous-notion, l'apostrophe",
			fichier: '01.json',
			branche: a.branche,
			notion: a.notion,
			sousNotion: a.sous_notion,
			points: [a.code]
		},
		{
			id: SYNTHETIQUES[1],
			title: 'Point sur la notion du nœud',
			fichier: '02.json',
			branche: b.branche,
			notion: b.notion,
			sousNotion: b.sous_notion,
			points: [b.code]
		},
		{
			id: SYNTHETIQUES[2],
			title: 'Sur une notion, sans tag',
			fichier: '03.json',
			branche: a.branche,
			notion: a.notion,
			sousNotion: null,
			points: []
		}
	];
	const tags: ModeleTags[] = [];
	if (deux) {
		const [branche = '', notion = '', sousNotion = null] = deux.chemin.split(' > ');
		ranges.push({
			id: SYNTHETIQUES[4],
			title: 'Deux programmes',
			fichier: '05.json',
			branche,
			notion,
			sousNotion,
			points: [deux.premier, deux.second]
		});
		tags.push({
			id: SYNTHETIQUES[5],
			title: 'Second tag',
			fichier: '06.json',
			noeud: deux.chemin,
			avant: [deux.premier],
			ajoutes: [deux.second]
		});
	}
	const niveaux: ModeleNiveaux[] = [
		{
			id: SYNTHETIQUES[3],
			title: 'Quotient',
			fichier: '04.json',
			avant: ['CM2'],
			apres: ['CM2', '6']
		}
	];
	const migration = join(mkdtempSync(join(tmpdir(), 'rangement-tags-')), 'synthetique.sql');
	writeFileSync(
		migration,
		genererMigration(
			{ lot: 'synthetique', source: 'scripts/questions/synthetique', date: '2026-11-22' },
			{ ranges, niveaux, tags }
		)
	);
	return { migration, ranges, niveaux, tags };
}

// ============================================================================
// SUITES
// ============================================================================

describe('cas synthétique (générateur)', () => {
	let pg: Client;
	let cas: Cas;
	let lieux: { surSousNotion: Emplacement; surNotion: Emplacement };

	beforeAll(async () => {
		await cleanupAllTestData();
		pg = await getPostgresClient();
		lieux = await emplacements(pg);
		cas = casSynthetique(lieux.surSousNotion, lieux.surNotion, await paire(pg));
	}, 60_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	eprouver(() => ({ pg, cas }));

	it('une notion visée renommée fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(pg, async () => {
			await poserEtatProd(pg, cas);
			await pg.query(
				`update public.classification_nodes n set name = n.name || ' (renommée)'
				   from public.classification_nodes b
				  where b.id = n.parent_id and b.name = $1 and b.parent_id is null
				    and n.kind = 'notion' and n.name = $2 and n.archived_at is null`,
				[lieux.surSousNotion.branche, lieux.surSousNotion.notion]
			);
			await expect(pg.query(readFileSync(cas.migration, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : [1-4] nœud\(s\), \d+ point\(s\)/
			);
		});
	});

	it('nom de notion avec une apostrophe : la migration et son rollback passent sur Postgres', async () => {
		await enTransaction(pg, async () => {
			const a = lieux.surSousNotion;
			const b = lieux.surNotion;
			const nom = `${a.notion} d'essai`;
			await pg.query(
				`update public.classification_nodes n set name = $3
				   from public.classification_nodes b
				  where b.id = n.parent_id and b.name = $1 and b.parent_id is null
				    and n.kind = 'notion' and n.name = $2 and n.archived_at is null`,
				[a.branche, a.notion, nom]
			);
			const memeNotion = b.branche === a.branche && b.notion === a.notion;
			const apostrophe = casSynthetique(
				{ ...a, notion: nom },
				memeNotion ? { ...b, notion: nom } : b
			);
			await poserEtatProd(pg, apostrophe);
			await pg.query(readFileSync(apostrophe.migration, 'utf-8'));
			const apres = await lireEtat(pg, apostrophe);
			expect(apostrophe.ranges.map((m) => apres.noeuds.get(m.id))).toEqual(
				apostrophe.ranges.map(cheminDe)
			);
			expect(apres.tags).toEqual(tagsAttendus(apostrophe));
			await pg.query(extractRollback(apostrophe.migration));
			const annule = await lireEtat(pg, apostrophe);
			expect(apostrophe.ranges.map((m) => annule.noeuds.get(m.id))).toEqual(
				apostrophe.ranges.map(() => '∅')
			);
			expect(annule.tags).toEqual([]);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(pg, async () => {
			await poserEtatProd(pg, cas);
			await pg.query(`update public.curriculum_points set archived_at = now() where code = $1`, [
				lieux.surSousNotion.code
			]);
			await expect(pg.query(readFileSync(cas.migration, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), [1-4] point\(s\)/
			);
		});
	});

	it('un point déplacé sur un autre nœud fait échouer la migration (ni le nœud ni sa notion)', async () => {
		await enTransaction(pg, async () => {
			await poserEtatProd(pg, cas);
			await pg.query(
				`update public.curriculum_points p
				    set node_id = (select b.id from public.classification_nodes b
				                    where b.kind = 'notion' and b.archived_at is null
				                      and b.id not in (p.node_id, (select parent_id from public.classification_nodes where id = p.node_id))
				                    limit 1)
				  where p.code = $1`,
				[lieux.surSousNotion.code]
			);
			await expect(pg.query(readFileSync(cas.migration, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), [1-4] point\(s\)/
			);
		});
	});
});

describe.each(casDesFixtures())('$migration', (cas) => {
	let pg: Client;

	beforeAll(async () => {
		await cleanupAllTestData();
		pg = await getPostgresClient();
	}, 60_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	eprouver(() => ({ pg, cas }), cas);
});
