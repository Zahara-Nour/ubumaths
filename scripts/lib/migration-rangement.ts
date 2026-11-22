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
 *    (la sous-notion est facultative ; `"point": null` = rangé sans tag, à écrire en clair) ;
 *  - modèle déjà rangé qui gagne un niveau : `{ "niveauxAjoutes": ["6"] }`.
 *
 * Règles :
 *  - le choix du nœud et du point reste une décision de la session (phase 0 du lot) : le module
 *    ne devine rien, il vérifie et écrit ;
 *  - modèle neuf : encore SANS nœud et SANS tag en prod, sinon refus ; déjà exactement sur ce nœud
 *    avec ce seul point → ignoré (lot relancé) ;
 *  - le chemin désigne un nœud non archivé, le point est sur ce nœud ou sur sa notion
 *    (`question_template_points_check_rules`) ;
 *  - fichier sans `rangement` dont le modèle n'a pas de nœud en prod → refus (modèle oublié) ;
 *  - un refus refuse tout le lot : rien n'est écrit ;
 *  - la migration : nœud résolu STRICTEMENT par son chemin, gardes « sans nœud ni tag » et
 *    « niveaux exactement ceux du relevé », TOUT ou RIEN, `updated_at` préservé, modèles absents
 *    (base locale) tolérés, rollback en commentaire (`ROLLBACK:BEGIN` / `ROLLBACK:END`).
 * SQL repris du gabarit éprouvé sur les lots écrits à la main
 * (`20261122183733_questions_6e_decimaux_rangement_tags.sql`).
 * Tests : scripts/__tests__/migration-rangement.test.ts (logique),
 * tests/integration/migrations-rangement-tags.test.ts (SQL rejoué sur Postgres).
 */

// ============================================================================
// TYPES
// ============================================================================

/** Le champ `rangement` d'un fichier, validé */
export type Rangement =
	| { sorte: 'neuf'; chemin: string[]; point: string | null }
	| { sorte: 'niveaux'; niveaux: string[] };

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
	point: string | null;
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

export type Examen =
	| { sorte: 'ignore'; raison: string }
	| { sorte: 'refuse'; erreur: string }
	| { sorte: 'range'; modele: ModeleRange; alerte: string | null }
	| { sorte: 'niveaux'; modele: ModeleNiveaux };

export interface Lot {
	ranges: ModeleRange[];
	niveaux: ModeleNiveaux[];
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
const FORMES =
	'{ "noeud": "Branche > Notion > Sous-notion", "point": "<code>" | null } ou { "niveauxAjoutes": ["<niveau>"] }';

// ============================================================================
// FONCTIONS
// ============================================================================

function estTexte(v: unknown): v is string {
	return typeof v === 'string' && v.trim().length > 0 && v === v.trim();
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
	const cles = Object.keys(champs).sort().join(',');
	if (cles === 'niveauxAjoutes') {
		const niveaux = champs.niveauxAjoutes;
		if (!Array.isArray(niveaux) || niveaux.length === 0 || !niveaux.every(estTexte)) {
			return refus('« niveauxAjoutes » doit lister au moins un niveau');
		}
		if (new Set(niveaux).size !== niveaux.length) return refus('niveau en double');
		return { ok: true, rangement: { sorte: 'niveaux', niveaux: [...niveaux] } };
	}
	if (cles !== 'noeud,point') return refus('aux clés inattendues');
	if (!estTexte(champs.noeud)) return refus('« noeud » doit être un chemin');
	const chemin = champs.noeud.split(SEPARATEUR);
	if (chemin.length < 2 || chemin.length > 3 || !chemin.every(estTexte)) {
		return refus('« noeud » doit être « Branche > Notion » ou « Branche > Notion > Sous-notion »');
	}
	if (champs.point !== null && !estTexte(champs.point)) {
		return refus('« point » doit être un code, ou null écrit en clair (rangé sans tag)');
	}
	return { ok: true, rangement: { sorte: 'neuf', chemin, point: champs.point } };
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
	if (rangement.sorte === 'niveaux') {
		const manquants = rangement.niveaux.filter((n) => !prod.grades.includes(n));
		if (manquants.length === 0) return { sorte: 'ignore', raison: 'niveaux déjà posés' };
		return {
			sorte: 'niveaux',
			modele: {
				id: prod.id,
				title: prod.title,
				fichier,
				avant: [...prod.grades],
				apres: [...prod.grades, ...manquants]
			}
		};
	}
	const chemin = rangement.chemin.join(SEPARATEUR);
	const resolu = resoudreChemin(arbre, rangement.chemin);
	if (!resolu) {
		return { sorte: 'refuse', erreur: `${fichier} : nœud « ${chemin} » introuvable dans l'arbre` };
	}
	const code = rangement.point;
	const point = code === null ? null : arbre.points.find((p) => p.code === code);
	if (code !== null && (!point || point.archived_at !== null)) {
		return {
			sorte: 'refuse',
			erreur: `${fichier} : point ${code} ${point ? 'archivé' : 'introuvable'}`
		};
	}
	if (point && point.node_id !== resolu.noeud.id && point.node_id !== resolu.notion.id) {
		return {
			sorte: 'refuse',
			erreur: `${fichier} : le point ${point.code} est sur « ${cheminDe(arbre, point.node_id)} », ni sur « ${chemin} » ni sur sa notion`
		};
	}
	const attendus = point ? [point.id] : [];
	if (prod.classification_node_id !== null || prod.points.length > 0) {
		const identique =
			prod.classification_node_id === resolu.noeud.id &&
			prod.points.length === attendus.length &&
			prod.points.every((p) => attendus.includes(p));
		if (identique) return { sorte: 'ignore', raison: 'déjà sur ce nœud, avec ce point' };
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
			point: code
		},
		alerte:
			point && point.grade !== null && !prod.grades.includes(point.grade)
				? `${fichier} : le point ${point.code} est de niveau ${point.grade}, absent des niveaux du modèle (${prod.grades.join(', ')}) — la garde des niveaux le signalera avant la publication`
				: null
	};
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
		.split('\n')
		.map((l) => (l === '' ? '--' : `-- ${l}`))
		.join('\n');
}

function rollback({ ranges, niveaux }: Lot): string {
	const lignes: string[] = [`set local lock_timeout = '5s';`];
	const ids = ranges.map((m) => `'${m.id}'`);
	if (ranges.length > 0) {
		const tagues = ranges.filter((m) => m.point !== null);
		lignes.push(
			`select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))`,
			`  from (values ${ids.map((id) => `(${id}::uuid)`).join(', ')}) as r(id)`,
			` order by r.id;`
		);
		if (tagues.length > 0) {
			lignes.push(
				`delete from public.question_template_points q`,
				` using public.curriculum_points p, (values`,
				tagues.map((m) => `	('${m.id}'::uuid, ${texte(m.point)})`).join(',\n'),
				` ) as r(id, code)`,
				` where q.template_id = r.id and p.id = q.point_id and p.code = r.code;`
			);
		}
	}
	lignes.push(
		`alter table public.question_templates disable trigger update_question_templates_updated_at;`
	);
	if (ranges.length > 0) {
		lignes.push(
			`update public.question_templates set classification_node_id = null`,
			` where id in (${ids.join(', ')});`
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
		.map(
			(m) =>
				`	('${m.id}', ${texte(m.branche)}, ${texte(m.notion)}, ${texte(m.sousNotion)}, ${texte(m.point)})`
		)
		.join(',\n');
	return `-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qr_modeles;
create temporary table _qr_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text
);
insert into _qr_modeles values
${valeurs};

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qr_modeles order by id;
select 1 from public.question_templates where id in (select id from _qr_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; le point est sur ce nœud
-- ou sur sa notion. Un chemin ne peut désigner qu'un nœud : l'index
-- classification_nodes_sibling_name_key rend le nom unique parmi les frères.
alter table _qr_modeles add column noeud uuid, add column point_id uuid;
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
update _qr_modeles r set point_id = p.id
  from public.curriculum_points p, public.classification_nodes x
 where x.id = r.noeud and r.code is not null
   and p.code = r.code and p.archived_at is null
   and p.node_id in (r.noeud, case when x.kind = 'subnotion' then x.parent_id else x.id end);
do $resolution$
begin
	if exists (select 1 from _qr_modeles where noeud is null or (code is not null and point_id is null)) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qr_modeles where noeud is null),
			(select count(*) from _qr_modeles where code is not null and point_id is null);
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
select r.id, r.point_id
  from _qr_modeles r
  join public.question_templates q on q.id = r.id
 where r.point_id is not null;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_attendus integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*), count(*) filter (where r.point_id is not null) into v_presents, v_attendus
	  from _qr_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qr_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qr_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qr_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

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

function entete(e: EnteteMigration, { ranges, niveaux }: Lot): string {
	const titre = [
		ranges.length > 0 ? `nœud et tag de ${ranges.length} modèle(s)` : '',
		niveaux.length > 0 ? `niveau(x) ajouté(s) à ${niveaux.length} modèle(s)` : ''
	]
		.filter(Boolean)
		.join(', ');
	const lignes = [
		...ranges.map(
			(m) =>
				`--   ${m.id.slice(0, 8)} « ${uneLigne(m.title)} » (${uneLigne(m.fichier)}) → ${m.point ?? 'sans tag'}, sur « ${[m.branche, m.notion, ...(m.sousNotion === null ? [] : [m.sousNotion])].join(SEPARATEUR)} »`
		),
		...niveaux.map(
			(m) =>
				`--   ${m.id.slice(0, 8)} « ${uneLigne(m.title)} » (${uneLigne(m.fichier)}) : niveaux {${m.avant.join(', ')}} → {${m.apres.join(', ')}}`
		)
	];
	return `-- ============================================================================
-- Lot ${e.lot} : ${titre}
-- ============================================================================
${lignes.join('\n')}
--   Chaque modèle rangé porte au plus UN point (ADR 0020), posé sur son nœud ou sur la notion de ce
--   nœud (question_template_points_check_rules). Ni le contenu, ni le statut ne changent :
--   \`updated_at\` est PRÉSERVÉ.
-- ============================================================================
-- Fichier GÉNÉRÉ par scripts/questions/migration-rangement.ts — ne pas éditer à la main.
-- Source : ${e.source}. État relevé en prod le ${e.date}.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN. Prouvée par
-- tests/integration/migrations-rangement-tags.test.ts, qui rejoue CE fichier sur des copies
-- portant les vrais identifiants (fixture rangement-tags/).
--
-- Gardes : chaque modèle à ranger doit être encore SANS nœud et SANS aucun tag, chaque modèle qui
-- gagne un niveau doit avoir EXACTEMENT les niveaux du relevé, sinon une retouche faite depuis à la
-- main serait écrasée. Nœud désigné par son chemin, résolu STRICTEMENT.
--
-- Accès : aucune règle (policy) ne change ; personne ne gagne ni ne perd d'accès. Un brouillon
-- rangé apparaît sous son nœud dans l'admin, les élèves ne voient rien avant sa publication ; un
-- modèle publié qui gagne un niveau est aussi proposé dans ce niveau. Données d'élèves : aucune.
--
-- Rollback : retire les tags posés, rend les modèles sans nœud, rend les niveaux d'avant (gardé :
-- seulement si les niveaux sont encore ceux posés ici). Bloc éprouvé par le test d'intégration, à
-- jouer dans UNE transaction (\`psql -1 -v ON_ERROR_STOP=1 -f\`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
${commenter(rollback({ ranges, niveaux }))}
-- ROLLBACK:END
-- ============================================================================`;
}

/** Le texte complet de la migration : en-tête, rollback commenté, rangement, niveaux */
export function genererMigration(e: EnteteMigration, lot: Lot): string {
	if (lot.ranges.length === 0 && lot.niveaux.length === 0) {
		throw new Error('aucun modèle à ranger : pas de migration vide');
	}
	const corps = [
		`-- Pas de \`lock table\` : \`supabase db push\` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris ligne par ligne.
set local lock_timeout = '5s';`,
		...(lot.ranges.length > 0 ? [sqlRangement(lot.ranges)] : []),
		...(lot.niveaux.length > 0 ? [sqlNiveaux(lot.niveaux)] : [])
	];
	return `${entete(e, lot)}\n\n${corps.join('\n\n')}\n`;
}
