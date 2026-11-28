/**
 * Migration « nœud et tag » d'un lot de modèles de questions — logique pure
 * ========================================================================
 *
 * `create-questions --publier` crée les modèles en brouillon, sans nœud ni tag : le rangement
 * dans l'arbre des notions et le point du programme se posent par migration. Ce module la
 * fabrique à partir du champ `rangement` des fichiers du lot et de l'état relevé en prod ; le
 * script `scripts/questions/migration-rangement.ts` lit les deux et écrit la migration et sa
 * fixture. Phase 0 validée par David le 2026-11-22 (journal
 * docs/wip/environnement-workflow-progress.md).
 *
 * Le champ `rangement` d'un fichier, deux formes exclusives :
 *  - modèle neuf : `{ "noeud": "Branche > Notion > Sous-notion", "point": "6-106" }`
 *    (la sous-notion est facultative ; `"point": null` = rangé sans tag, à écrire en clair ;
 *    `"point": ["1SPE-355", "1TECHNO-095"]` = un point par programme) ;
 *  - modèle déjà rangé qui gagne un niveau ou un tag : `{ "niveauxAjoutes": ["6"] }`,
 *    `{ "pointsAjoutes": ["1TECHNO-095"] }`, ou les deux (niveaux de `GRADE_CODES` ; modèle sans
 *    nœud en prod → refus).
 * Outil 66 (second tag), phase 0 validée par David le 2026-11-28 (journal
 * docs/wip/outil-second-tag-progress.md).
 *
 * Règles :
 *  - le choix du nœud et du point reste une décision de la session (phase 0 du lot) : le module
 *    ne devine rien, il vérifie et écrit ;
 *  - modèle neuf : encore SANS nœud et SANS tag en prod, sinon refus ; déjà exactement sur ce nœud
 *    avec ce seul point → ignoré (lot relancé) ;
 *  - le chemin désigne un nœud non archivé, chaque point est sur ce nœud ou sur sa notion
 *    (`question_template_points_check_rules`) ;
 *  - au plus un point par programme (ADR 0020), et chaque point est d'un niveau du modèle (ses
 *    niveaux en prod, plus ceux que le même fichier ajoute), sinon refus ;
 *  - point ajouté déjà posé → ignoré ; tous déjà posés et niveaux déjà là → modèle ignoré ;
 *  - fichier sans `rangement` dont le modèle n'a pas de nœud en prod → refus (modèle oublié) ;
 *  - un refus refuse tout le lot : rien n'est écrit ;
 *  - la migration : nœud résolu STRICTEMENT par son chemin, gardes « sans nœud ni tag »,
 *    « niveaux exactement ceux du relevé » et « tags exactement ceux du relevé », TOUT ou RIEN, `updated_at` préservé, modèles absents
 *    (base locale) tolérés, rollback en commentaire (`ROLLBACK:BEGIN` / `ROLLBACK:END`).
 * SQL repris du gabarit éprouvé sur les lots écrits à la main
 * (`20261122183733_questions_6e_decimaux_rangement_tags.sql`).
 * Tests : scripts/__tests__/migration-rangement.test.ts (logique),
 * tests/integration/migrations-rangement-tags.test.ts (SQL rejoué sur Postgres).
 */

import { GRADE_CODES } from '../../src/lib/types/grades';

// ============================================================================
// TYPES
// ============================================================================

/** Le champ `rangement` d'un fichier, validé */
export type Rangement =
	| { sorte: 'neuf'; chemin: string[]; points: string[] }
	| { sorte: 'ajouts'; niveaux: string[]; points: string[] };

export type LectureRangement =
	{ ok: true; rangement: Rangement | null } | { ok: false; erreur: string };

/** Un nœud de l'arbre des notions, tel qu'en base */
export interface NoeudArbre {
	id: string;
	parent_id: string | null;
	name: string;
	kind: string;
	archived_at: string | null;
}

/** Un point du programme, tel qu'en base */
export interface PointProgramme {
	id: string;
	code: string;
	grade: string | null;
	node_id: string;
	archived_at: string | null;
}

/** Ce qu'il faut d'un modèle de la prod : sa ligne, et les points qui le taguent */
export interface ModeleProd {
	id: string;
	title: string;
	grades: string[];
	classification_node_id: string | null;
	/** Identifiants des points (`question_template_points.point_id`) */
	points: string[];
}

export interface Arbre {
	noeuds: readonly NoeudArbre[];
	points: readonly PointProgramme[];
}

/** Un modèle neuf à ranger */
export interface ModeleRange {
	id: string;
	title: string;
	fichier: string;
	branche: string;
	notion: string;
	sousNotion: string | null;
	/** Codes des points posés, un par programme (vide = rangé sans tag) */
	points: string[];
}

/** Un modèle déjà rangé qui gagne un ou plusieurs niveaux */
export interface ModeleNiveaux {
	id: string;
	title: string;
	fichier: string;
	/** Niveaux relevés en prod (la garde) */
	avant: string[];
	/** Niveaux posés par la migration */
	apres: string[];
}

/** Un modèle déjà rangé qui gagne un ou plusieurs tags */
export interface ModeleTags {
	id: string;
	title: string;
	fichier: string;
	/** Chemin de son nœud au relevé (le test d'intégration y pose la copie) */
	noeud: string;
	/** Codes des points relevés en prod (la garde) */
	avant: string[];
	/** Codes des points posés par la migration */
	ajoutes: string[];
}

export type Examen =
	| { sorte: 'ignore'; raison: string }
	| { sorte: 'refuse'; erreur: string }
	| { sorte: 'range'; modele: ModeleRange }
	| { sorte: 'ajouts'; niveaux: ModeleNiveaux | null; tags: ModeleTags | null };

export interface Lot {
	ranges: ModeleRange[];
	niveaux: ModeleNiveaux[];
	tags: ModeleTags[];
}

/** La fixture d'une migration générée, lue par le test d'intégration */
export interface FixtureRangement extends Lot {
	migration: string;
}

export interface EnteteMigration {
	/** Nom du lot */
	lot: string;
	/** Dossier(s) source des fichiers */
	source: string;
	/** Date du relevé en prod (AAAA-MM-JJ) */
	date: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const SEPARATEUR = ' > ';
/** Les niveaux admis : un niveau inconnu ne serait refusé qu'au `db push` (`is_valid_grade_array`) */
const NIVEAUX: readonly string[] = GRADE_CODES;
const FORMES =
	'{ "noeud": "Branche > Notion > Sous-notion", "point": "<code>" | ["<code>", …] | null } ou { "niveauxAjoutes": ["<niveau>"], "pointsAjoutes": ["<code>"] } (l\'un des deux au moins)';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Un texte non vide, sans blanc aux bouts ni saut de ligne (il finirait un commentaire SQL) */
function estTexte(v: unknown): v is string {
	return typeof v === 'string' && v.trim().length > 0 && v === v.trim() && !/[\r\n]/.test(v);
}

function estNiveau(v: unknown): v is string {
	return typeof v === 'string' && NIVEAUX.includes(v);
}

/** Valide le champ `rangement` brut d'un fichier (`undefined` = le fichier n'en porte pas) */
export function lireRangement(brut: unknown, fichier: string): LectureRangement {
	if (brut === undefined) return { ok: true, rangement: null };
	const refus = (raison: string): LectureRangement => ({
		ok: false,
		erreur: `${fichier} : champ « rangement » ${raison} — attendu ${FORMES}`
	});
	if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return refus('illisible');
	const champs = brut as Record<string, unknown>;
	const cles = Object.keys(champs);
	if (cles.length > 0 && cles.every((c) => c === 'niveauxAjoutes' || c === 'pointsAjoutes')) {
		let niveaux: string[] = [];
		let points: string[] = [];
		if ('niveauxAjoutes' in champs) {
			const v: unknown = champs.niveauxAjoutes;
			if (!Array.isArray(v) || v.length === 0 || !v.every(estNiveau)) {
				return refus(
					`« niveauxAjoutes » doit lister au moins un niveau, pris dans ${NIVEAUX.join(', ')}`
				);
			}
			if (new Set(v).size !== v.length) return refus('niveau en double');
			niveaux = v;
		}
		if ('pointsAjoutes' in champs) {
			const v: unknown = champs.pointsAjoutes;
			if (!Array.isArray(v) || v.length === 0 || !v.every(estTexte)) {
				return refus('« pointsAjoutes » doit lister au moins un code');
			}
			if (new Set(v).size !== v.length) return refus('point en double');
			points = v;
		}
		return {
			ok: true,
			rangement: { sorte: 'ajouts', niveaux: [...niveaux], points: [...points] }
		};
	}
	if (cles.sort().join(',') !== 'noeud,point') return refus('aux clés inattendues');
	if (!estTexte(champs.noeud)) return refus('« noeud » doit être un chemin');
	const chemin = champs.noeud.split(SEPARATEUR);
	if (chemin.length < 2 || chemin.length > 3 || !chemin.every(estTexte)) {
		return refus('« noeud » doit être « Branche > Notion » ou « Branche > Notion > Sous-notion »');
	}
	const point: unknown = champs.point;
	if (point === null) return { ok: true, rangement: { sorte: 'neuf', chemin, points: [] } };
	if (estTexte(point)) return { ok: true, rangement: { sorte: 'neuf', chemin, points: [point] } };
	if (!Array.isArray(point) || point.length === 0 || !point.every(estTexte)) {
		return refus(
			'« point » doit être un code, une liste de codes, ou null écrit en clair (rangé sans tag)'
		);
	}
	if (new Set(point).size !== point.length) return refus('point en double');
	return { ok: true, rangement: { sorte: 'neuf', chemin, points: [...point] } };
}

function enfant(
	arbre: Arbre,
	parent: string | null,
	kind: string,
	name: string
): NoeudArbre | undefined {
	return arbre.noeuds.find(
		(n) => n.parent_id === parent && n.kind === kind && n.name === name && n.archived_at === null
	);
}

/** Le nœud non archivé que désigne un chemin (notion ou sous-notion), sa notion comprise */
export function resoudreChemin(
	arbre: Arbre,
	chemin: readonly string[]
): { noeud: NoeudArbre; notion: NoeudArbre } | null {
	const branche = enfant(arbre, null, 'branch', chemin[0] ?? '');
	const notion = branche && enfant(arbre, branche.id, 'notion', chemin[1] ?? '');
	if (!notion) return null;
	if (chemin.length === 2) return { noeud: notion, notion };
	const sousNotion = enfant(arbre, notion.id, 'subnotion', chemin[2] ?? '');
	return sousNotion ? { noeud: sousNotion, notion } : null;
}

function cheminDe(arbre: Arbre, id: string | null): string {
	const parties: string[] = [];
	for (
		let n = arbre.noeuds.find((x) => x.id === id);
		n;
		n = arbre.noeuds.find((x) => x.id === n?.parent_id)
	) {
		parties.unshift(n.name);
	}
	return parties.length > 0 ? parties.join(SEPARATEUR) : '∅';
}

function codesDe(arbre: Arbre, points: readonly string[]): string {
	return points
		.map((id) => arbre.points.find((p) => p.id === id)?.code ?? id.slice(0, 8))
		.join(', ');
}

/**
 * Les points d'une liste, vérifiés pour un modèle rangé sur `noeud` (notion `notion`) qui aura les
 * niveaux `niveaux` et porte déjà `dejaPoses` : chaque point existe, n'est pas archivé, est sur le
 * nœud ou sa notion, est d'un niveau du modèle ; au plus un point par programme, déjà posés compris
 */
function verifierPoints(
	fichier: string,
	codes: readonly string[],
	cible: { noeud: NoeudArbre; notion: NoeudArbre; chemin: string },
	niveaux: readonly string[],
	dejaPoses: readonly PointProgramme[],
	arbre: Arbre
): { ok: true; points: PointProgramme[] } | { ok: false; erreur: string } {
	const points: PointProgramme[] = [];
	for (const code of codes) {
		const point = arbre.points.find((p) => p.code === code);
		if (!point || point.archived_at !== null) {
			return {
				ok: false,
				erreur: `${fichier} : point ${code} ${point ? 'archivé' : 'introuvable'}`
			};
		}
		if (point.node_id !== cible.noeud.id && point.node_id !== cible.notion.id) {
			return {
				ok: false,
				erreur: `${fichier} : le point ${point.code} est sur « ${cheminDe(arbre, point.node_id)} », ni sur « ${cible.chemin} » ni sur sa notion`
			};
		}
		if (point.grade !== null && !niveaux.includes(point.grade)) {
			return {
				ok: false,
				erreur: `${fichier} : le point ${point.code} est de niveau ${point.grade}, absent des niveaux du modèle (${niveaux.join(', ')})`
			};
		}
		points.push(point);
	}
	const parProgramme = new Map<string, string>();
	for (const p of [...dejaPoses, ...points]) {
		if (p.grade === null) continue;
		const autre = parProgramme.get(p.grade);
		if (autre !== undefined && autre !== p.code) {
			return {
				ok: false,
				erreur: `${fichier} : ${autre} et ${p.code} sont du même programme (${p.grade}) — un modèle a au plus un point par programme`
			};
		}
		parProgramme.set(p.grade, p.code);
	}
	return { ok: true, points };
}

/** Le sort d'un fichier du lot face à SON modèle de la prod (apparié par id, titre, niveau) */
export function examinerModele(
	fichier: string,
	rangement: Rangement | null,
	prod: ModeleProd,
	arbre: Arbre
): Examen {
	const id8 = prod.id.slice(0, 8);
	if (rangement === null) {
		if (prod.classification_node_id === null) {
			return {
				sorte: 'refuse',
				erreur: `${fichier} : ${id8} n'a pas de nœud en prod et son fichier n'a pas de champ « rangement »`
			};
		}
		return { sorte: 'ignore', raison: 'déjà rangé, rien à faire' };
	}
	if (rangement.sorte === 'ajouts') return examinerAjouts(fichier, rangement, prod, arbre);
	const chemin = rangement.chemin.join(SEPARATEUR);
	const resolu = resoudreChemin(arbre, rangement.chemin);
	if (!resolu) {
		return { sorte: 'refuse', erreur: `${fichier} : nœud « ${chemin} » introuvable dans l'arbre` };
	}
	const verifies = verifierPoints(
		fichier,
		rangement.points,
		{ ...resolu, chemin },
		prod.grades,
		[],
		arbre
	);
	if (!verifies.ok) return { sorte: 'refuse', erreur: verifies.erreur };
	const attendus = verifies.points.map((p) => p.id);
	if (prod.classification_node_id !== null || prod.points.length > 0) {
		const identique =
			prod.classification_node_id === resolu.noeud.id &&
			prod.points.length === attendus.length &&
			prod.points.every((p) => attendus.includes(p));
		if (identique) return { sorte: 'ignore', raison: 'déjà sur ce nœud, avec ces points' };
		return {
			sorte: 'refuse',
			erreur: `${fichier} : ${id8} est déjà rangé ou tagué en prod (nœud « ${cheminDe(arbre, prod.classification_node_id)} », point(s) : ${codesDe(arbre, prod.points) || 'aucun'})`
		};
	}
	return {
		sorte: 'range',
		modele: {
			id: prod.id,
			title: prod.title,
			fichier,
			branche: rangement.chemin[0] ?? '',
			notion: rangement.chemin[1] ?? '',
			sousNotion: rangement.chemin[2] ?? null,
			points: [...rangement.points]
		}
	};
}

/** Un modèle déjà rangé qui gagne des niveaux, des tags, ou les deux */
function examinerAjouts(
	fichier: string,
	rangement: Extract<Rangement, { sorte: 'ajouts' }>,
	prod: ModeleProd,
	arbre: Arbre
): Examen {
	const id8 = prod.id.slice(0, 8);
	const noeud = arbre.noeuds.find((n) => n.id === prod.classification_node_id);
	if (prod.classification_node_id === null || !noeud) {
		return {
			sorte: 'refuse',
			erreur: `${fichier} : ${id8} n'a pas de nœud en prod — « niveauxAjoutes » et « pointsAjoutes » ne valent que pour un modèle déjà rangé`
		};
	}
	const manquants = rangement.niveaux.filter((n) => !prod.grades.includes(n));
	const grades = [...prod.grades, ...manquants];
	const niveaux: ModeleNiveaux | null =
		manquants.length === 0
			? null
			: { id: prod.id, title: prod.title, fichier, avant: [...prod.grades], apres: grades };

	let tags: ModeleTags | null = null;
	if (rangement.points.length > 0) {
		const poses = prod.points.map((id) => arbre.points.find((p) => p.id === id));
		const dejaPoses = poses.filter((p): p is PointProgramme => p !== undefined);
		if (dejaPoses.length !== poses.length) {
			return { sorte: 'refuse', erreur: `${fichier} : ${id8} porte un tag illisible en prod` };
		}
		const nouveaux = rangement.points.filter((c) => !dejaPoses.some((p) => p.code === c));
		const notion =
			noeud.kind === 'subnotion' ? arbre.noeuds.find((n) => n.id === noeud.parent_id) : noeud;
		if (!notion)
			return { sorte: 'refuse', erreur: `${fichier} : notion du nœud de ${id8} introuvable` };
		const chemin = cheminDe(arbre, noeud.id);
		const verifies = verifierPoints(
			fichier,
			nouveaux,
			{ noeud, notion, chemin },
			grades,
			dejaPoses,
			arbre
		);
		if (!verifies.ok) return { sorte: 'refuse', erreur: verifies.erreur };
		if (nouveaux.length > 0) {
			tags = {
				id: prod.id,
				title: prod.title,
				fichier,
				noeud: chemin,
				avant: dejaPoses.map((p) => p.code),
				ajoutes: nouveaux
			};
		}
	}
	if (niveaux === null && tags === null) {
		return { sorte: 'ignore', raison: 'niveaux et points déjà posés' };
	}
	return { sorte: 'ajouts', niveaux, tags };
}

/** `<horodatage>_questions_<lot>_rangement_tags` (sans extension) */
export function nomMigration(horodatage: string, lot: string): string {
	const nom = lot
		.replace(/[^a-z0-9]+/gi, '_')
		.replace(/^_+|_+$/g, '')
		.toLowerCase();
	return `${horodatage}_questions_${nom || 'lot'}_rangement_tags`;
}

/** Littéral SQL d'un texte (apostrophes doublées) ou `null` */
function texte(v: string | null): string {
	return v === null ? 'null' : `'${v.replace(/'/g, "''")}'`;
}

function tableau(niveaux: readonly string[]): string {
	return `array[${niveaux.map(texte).join(', ')}]::text[]`;
}

function uneLigne(s: string): string {
	return s.replace(/[\r\n]+/g, ' ');
}

function commenter(sql: string): string {
	return sql
		.split(/\r\n|\r|\n/)
		.map((l) => (l === '' ? '--' : `-- ${l}`))
		.join('\n');
}

/** Les tags posés par la migration : `(id, code)` */
function tagsPoses({ ranges, tags }: Lot): { id: string; code: string }[] {
	return [
		...ranges.flatMap((m) => m.points.map((code) => ({ id: m.id, code }))),
		...tags.flatMap((m) => m.ajoutes.map((code) => ({ id: m.id, code })))
	];
}

function rollback(lot: Lot): string {
	const { ranges, niveaux } = lot;
	const lignes: string[] = [`set local lock_timeout = '5s';`];
	const poses = tagsPoses(lot);
	const verrous = [...new Set([...ranges.map((m) => m.id), ...poses.map((t) => t.id)])].sort();
	if (verrous.length > 0) {
		lignes.push(
			`select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))`,
			`  from (values ${verrous.map((id) => `('${id}'::uuid)`).join(', ')}) as r(id)`,
			` order by r.id;`
		);
	}
	if (poses.length > 0) {
		lignes.push(
			`delete from public.question_template_points q`,
			` using public.curriculum_points p, (values`,
			poses.map((t) => `	('${t.id}'::uuid, ${texte(t.code)})`).join(',\n'),
			` ) as r(id, code)`,
			` where q.template_id = r.id and p.id = q.point_id and p.code = r.code;`
		);
	}
	lignes.push(
		`alter table public.question_templates disable trigger update_question_templates_updated_at;`
	);
	if (ranges.length > 0) {
		// Gardé : un modèle déplacé à la main depuis la migration garde son nouveau nœud
		lignes.push(
			`update public.question_templates t set classification_node_id = null`,
			`  from (values`,
			ranges
				.map(
					(m) =>
						`	('${m.id}'::uuid, ${texte(m.branche)}, ${texte(m.notion)}, ${texte(m.sousNotion)}::text)`
				)
				.join(',\n'),
			` ) as r(id, branche, notion, sous_notion)`,
			`  join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche`,
			`  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.name = r.notion`,
			`  left join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.name = r.sous_notion`,
			` where t.id = r.id`,
			`   and t.classification_node_id = case when r.sous_notion is null then n.id else s.id end;`
		);
	}
	for (const m of niveaux) {
		lignes.push(
			`update public.question_templates set grades = ${tableau(m.avant)}`,
			` where id = '${m.id}' and grades = ${tableau(m.apres)};`
		);
	}
	lignes.push(
		`alter table public.question_templates enable trigger update_question_templates_updated_at;`
	);
	return lignes.join('\n');
}

function sqlRangement(ranges: readonly ModeleRange[]): string {
	const n = ranges.length;
	const valeurs = ranges
		.map((m) => `	('${m.id}', ${texte(m.branche)}, ${texte(m.notion)}, ${texte(m.sousNotion)})`)
		.join(',\n');
	const tags = ranges.flatMap((m) => m.points.map((code) => `	('${m.id}', ${texte(code)})`));
	const insertionTags =
		tags.length === 0 ? '' : `\ninsert into _qr_tags (id, code) values\n${tags.join(',\n')};`;
	return `-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qr_modeles;
create temporary table _qr_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text
);
insert into _qr_modeles values
${valeurs};
-- Les points du lot : un par programme, aucun pour un modèle rangé sans tag
drop table if exists pg_temp._qr_tags;
create temporary table _qr_tags (
	id uuid not null references _qr_modeles (id),
	code text not null,
	point_id uuid,
	primary key (id, code)
);${insertionTags}

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qr_modeles order by id;
select 1 from public.question_templates where id in (select id from _qr_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; chaque point est sur ce
-- nœud ou sur sa notion. Un chemin ne peut désigner qu'un nœud : l'index
-- classification_nodes_sibling_name_key rend le nom unique parmi les frères.
alter table _qr_modeles add column noeud uuid;
update _qr_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qr_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qr_tags t set point_id = p.id
  from _qr_modeles r, public.curriculum_points p, public.classification_nodes x
 where r.id = t.id and x.id = r.noeud
   and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, case when x.kind = 'subnotion' then x.parent_id else x.id end);
do $resolution$
begin
	if exists (select 1 from _qr_modeles where noeud is null)
	   or exists (select 1 from _qr_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qr_modeles where noeud is null),
			(select count(*) from _qr_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qr_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, ${n}) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur ${n}', v_presents;
	end if;
	select count(*) into v_ranges from _qr_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qr_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qr_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _qr_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_attendus integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents
	  from _qr_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_attendus
	  from _qr_tags t join public.question_templates q on q.id = t.id;
	select count(*) into v_noeuds from _qr_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qr_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qr_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qr_tags;
drop table _qr_modeles;`;
}

function sqlNiveaux(niveaux: readonly ModeleNiveaux[]): string {
	const ids = niveaux.map((m) => `'${m.id}'`).join(', ');
	const gardes = niveaux
		.map((m) => {
			const id8 = m.id.slice(0, 8);
			return `	select grades into v_grades from public.question_templates where id = '${m.id}';
	if found and v_grades is distinct from ${tableau(m.avant)} then
		raise exception 'niveaux de ${id8} changés depuis le relevé : %', v_grades;
	end if;`;
		})
		.join('\n');
	const ecritures = niveaux
		.map(
			(m) => `update public.question_templates set grades = ${tableau(m.apres)}
 where id = '${m.id}' and grades = ${tableau(m.avant)};`
		)
		.join('\n');
	return `-- ---- Niveaux ajoutés à des modèles déjà rangés ---------------------------------------
-- Garde : niveaux EXACTEMENT ceux du relevé, sinon une retouche faite depuis serait écrasée.
-- Modèle absent (base locale) : rien. Le modèle garde son nœud, son point et son statut.
select 1 from public.question_templates where id in (${ids}) order by id for update;
do $niveaux$
declare v_grades text[];
begin
${gardes}
end $niveaux$;
alter table public.question_templates disable trigger update_question_templates_updated_at;
${ecritures}
alter table public.question_templates enable trigger update_question_templates_updated_at;`;
}

function sqlTags(tags: readonly ModeleTags[]): string {
	const valeurs = tags
		.flatMap((m) => m.ajoutes.map((code) => `	('${m.id}', ${texte(code)})`))
		.join(',\n');
	const gardes = tags
		.map((m) => {
			const id8 = m.id.slice(0, 8);
			return `	if exists (select 1 from public.question_templates where id = '${m.id}') then
		select coalesce(array_agg(p.code), '{}') into v_codes
		  from public.question_template_points q
		  join public.curriculum_points p on p.id = q.point_id
		 where q.template_id = '${m.id}';
		if not (v_codes @> ${tableau(m.avant)} and v_codes <@ ${tableau(m.avant)}) then
			raise exception 'tags de ${id8} changés depuis le relevé : %', v_codes;
		end if;
	end if;`;
		})
		.join('\n');
	return `-- ---- Points ajoutés à des modèles déjà rangés ---------------------------------------
-- Garde : tags EXACTEMENT ceux du relevé. Modèle absent (base locale) : rien. Le trigger
-- question_template_points_rules vérifie encore, tag par tag, le nœud et « un point par programme ».
drop table if exists pg_temp._qt_ajouts;
create temporary table _qt_ajouts (
	id uuid not null,
	code text not null,
	point_id uuid,
	primary key (id, code)
);
insert into _qt_ajouts (id, code) values
${valeurs};
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || a.id::text, 0))
  from (select distinct id from _qt_ajouts) a order by a.id;
select 1 from public.question_templates where id in (select id from _qt_ajouts) order by id for update;
update _qt_ajouts a set point_id = p.id
  from public.curriculum_points p
 where p.code = a.code and p.archived_at is null;
do $tags$
declare v_codes text[];
begin
${gardes}
	if exists (select 1 from _qt_ajouts a join public.question_templates q on q.id = a.id
	            where a.point_id is null) then
		raise exception 'points ajoutés introuvables : %',
			(select count(*) from _qt_ajouts a join public.question_templates q on q.id = a.id
			  where a.point_id is null);
	end if;
end $tags$;
insert into public.question_template_points (template_id, point_id)
select a.id, a.point_id
  from _qt_ajouts a
  join public.question_templates q on q.id = a.id;
do $tags_check$
declare v_attendus integer; v_poses integer;
begin
	select count(*) into v_attendus from _qt_ajouts a join public.question_templates q on q.id = a.id;
	select count(*) into v_poses from _qt_ajouts a
	  join public.question_template_points q on q.template_id = a.id and q.point_id = a.point_id;
	if v_poses <> v_attendus then
		raise exception 'tags ajoutés incohérents : %/%', v_poses, v_attendus;
	end if;
end $tags_check$;
drop table _qt_ajouts;`;
}

function entete(e: EnteteMigration, lot: Lot): string {
	const { ranges, niveaux, tags } = lot;
	const titre = [
		ranges.length > 0 ? `nœud et tag de ${ranges.length} modèle(s)` : '',
		niveaux.length > 0 ? `niveau(x) ajouté(s) à ${niveaux.length} modèle(s)` : '',
		tags.length > 0 ? `tag(s) ajouté(s) à ${tags.length} modèle(s)` : ''
	]
		.filter(Boolean)
		.join(', ');
	const lignes = [
		...ranges.map(
			(m) =>
				`--   ${m.id.slice(0, 8)} « ${uneLigne(m.title)} » (${uneLigne(m.fichier)}) → ${m.points.length > 0 ? uneLigne(m.points.join(' + ')) : 'sans tag'}, sur « ${[m.branche, m.notion, ...(m.sousNotion === null ? [] : [m.sousNotion])].join(SEPARATEUR)} »`
		),
		...niveaux.map(
			(m) =>
				`--   ${m.id.slice(0, 8)} « ${uneLigne(m.title)} » (${uneLigne(m.fichier)}) : niveaux {${uneLigne(m.avant.join(', '))}} → {${uneLigne(m.apres.join(', '))}}`
		),
		...tags.map(
			(m) =>
				`--   ${m.id.slice(0, 8)} « ${uneLigne(m.title)} » (${uneLigne(m.fichier)}) : tags {${uneLigne(m.avant.join(', '))}} + ${uneLigne(m.ajoutes.join(' + '))}`
		)
	];
	return `-- ============================================================================
-- Lot ${uneLigne(e.lot)} : ${titre}
-- ============================================================================
${lignes.join('\n')}
--   Chaque modèle porte au plus UN point par programme (ADR 0020), posé sur son nœud ou sur la
--   notion de ce nœud (question_template_points_check_rules). Ni le contenu, ni le statut ne changent :
--   \`updated_at\` est PRÉSERVÉ.
-- ============================================================================
-- Fichier GÉNÉRÉ par scripts/questions/migration-rangement.ts — ne pas éditer à la main.
-- Source : ${uneLigne(e.source)}. État relevé en prod le ${e.date}.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN. Prouvée par
-- tests/integration/migrations-rangement-tags.test.ts, qui rejoue CE fichier sur des copies
-- portant les vrais identifiants (fixture rangement-tags/).
--
-- Gardes : chaque modèle à ranger doit être encore SANS nœud et SANS aucun tag, chaque modèle qui
-- gagne un niveau doit avoir EXACTEMENT les niveaux du relevé, chaque modèle qui gagne un tag
-- EXACTEMENT les tags du relevé, sinon une retouche faite depuis à la
-- main serait écrasée. Nœud désigné par son chemin, résolu STRICTEMENT.
--
-- Accès : aucune règle (policy) ne change ; personne ne gagne ni ne perd d'accès. Un brouillon
-- rangé apparaît sous son nœud dans l'admin, les élèves ne voient rien avant sa publication ; un
-- modèle publié qui gagne un niveau est aussi proposé dans ce niveau, celui qui gagne un tag compte
-- aussi pour ce point du programme. Données d'élèves : aucune.
--
-- Rollback : retire les tags posés (ceux d'avant restent), rend les modèles sans nœud (gardé : seulement s'ils sont
-- encore sur le nœud posé ici), rend les niveaux d'avant (gardé : seulement si les niveaux sont
-- encore ceux posés ici). Bloc éprouvé par le test d'intégration, à
-- jouer dans UNE transaction (\`psql -1 -v ON_ERROR_STOP=1 -f\`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
${commenter(rollback(lot))}
-- ROLLBACK:END
-- ============================================================================`;
}

/** Le texte complet de la migration : en-tête, rollback commenté, rangement, niveaux */
export function genererMigration(e: EnteteMigration, lot: Lot): string {
	if (lot.ranges.length === 0 && lot.niveaux.length === 0 && lot.tags.length === 0) {
		throw new Error('aucun modèle à ranger : pas de migration vide');
	}
	const corps = [
		`-- Pas de \`lock table\` : \`supabase db push\` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris ligne par ligne.
set local lock_timeout = '5s';`,
		...(lot.ranges.length > 0 ? [sqlRangement(lot.ranges)] : []),
		...(lot.niveaux.length > 0 ? [sqlNiveaux(lot.niveaux)] : []),
		...(lot.tags.length > 0 ? [sqlTags(lot.tags)] : [])
	];
	return `${entete(e, lot)}\n\n${corps.join('\n\n')}\n`;
}

/**
 * Une fixture lue sur disque, ramenée à la forme d'aujourd'hui : les fixtures d'avant l'outil 66
 * portent `point` (un code ou null) au lieu de `points`, et n'ont pas de `tags`
 */
export function lireFixture(brut: unknown): FixtureRangement {
	const f = brut as {
		migration: string;
		ranges: (Omit<ModeleRange, 'points'> & { points?: string[]; point?: string | null })[];
		niveaux: ModeleNiveaux[];
		tags?: ModeleTags[];
	};
	return {
		migration: f.migration,
		ranges: f.ranges.map(({ point, points, ...m }) => ({
			...m,
			points: points ?? (point === null || point === undefined ? [] : [point])
		})),
		niveaux: f.niveaux,
		tags: f.tags ?? []
	};
}
