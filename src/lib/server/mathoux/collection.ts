/**
 * Chatterie de Faustroll — chargement de la collection (Mathoux v1)
 * =================================================================
 *
 * La collection se CALCULE à chaque affichage depuis
 *   - le PARCOURS de l'élève : son niveau et ses niveaux antérieurs
 *     (`grade_ancestors`, clôture transitive de `grade_predecessors`),
 *   - `curriculum_points` de ces niveaux (non archivés, rattachés à un nœud),
 *   - `question_template_points` (un point est travaillable s'il est tagué par
 *     au moins un modèle PUBLIÉ : un brouillon ne fait jamais naître un Mathou) ;
 *     la même lecture rapporte la catégorie de chaque modèle publié, d'où le lien
 *     « Faire grandir » (Entraînement sur la notion) sans requête de plus,
 *   - `classification_nodes` (branches et notions non archivées, sous-notions
 *     référencées),
 *   - `student_point_state` (acquisition, réussites),
 *   - les badges FSRS (`computePointBadges`) et les points PERDUS (seuil du régime
 *     `regime_acquisition` atteint, non acquis : `isPointLost`) pour la sieste,
 *   - la MÉMOIRE `student_mathoux` (meilleur stade, étoiles : `./memory.ts`),
 *     lue au client de l'élève ; un Mathou ne rapetisse jamais.
 *
 * Puis, s'il y a du nouveau (un Mathou né ou grandi, une étoile), la mémoire est
 * écrite au client SERVICE (`rememberMathoux`, écriture qui ne redescend jamais).
 * Une panne d'écriture est journalisée et ne change pas la collection rendue.
 * Ce que ce calcul a écrit devient les NOUVEAUTÉS annoncées en fin de séance
 * (`loadMathouCollectionWithNews`, `$lib/mathoux/news.ts`) ; une panne
 * d'écriture n'annonce rien.
 *
 * Tout est lu avec le client de L'ÉLÈVE (RLS) : `grade_predecessors` (via la
 * fonction, SECURITY INVOKER) et les trois tables suivantes sont lisibles par
 * tout utilisateur connecté, `student_point_state` et
 * `srs_card_stats` par l'élève lui-même. ⚠️ Un refus RLS rendrait zéro ligne,
 * donc une Chatterie vide, sans erreur : le cas suspect (des points, aucun nœud)
 * est tracé. Prouvé en intégration : `tests/integration/mathoux-collection.test.ts`.
 *
 * Coût, en 5 allers-retours : 1 appel (parcours), la mémoire et l'identité
 * (`auth.getUser`), en parallèle ; une requête de points PAR
 * NIVEAU en parallèle (chacune sous le plafond de 1 000 lignes de PostgREST, que
 * le parcours entier d'une Terminale dépasserait) ; tags (par lots de 100
 * points, chaque lot lu par pages de 1 000 lignes), branches et notions,
 * sous-notions référencées ; puis, sur les seuls points travaillables, les états
 * et les 2 lectures de `computePointBadges`. Puis l'écriture éventuelle de la
 * mémoire, au client service : 0 requête s'il n'y a rien de nouveau (le cas
 * courant) ; sinon 1 insert groupé pour les naissances (+ 1 relecture si une
 * ligne a été créée entre-temps) et, par Mathou qui grandit, 1 mise à jour
 * conditionnelle (jusqu'à 3 essais, chacun suivi d'une relecture en cas de
 * conflit). Chiffres mesurés : docs/systeme/mathoux.md.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { computePointBadges } from '$lib/server/srs/capacity-badge';
import { fetchInChunks } from '$lib/server/utils/chunked-in';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import {
	MathouMemoryWriteError,
	readMathouMemory,
	rememberMathoux,
	type StoredMathouMemory,
	type WrittenMathoux
} from './memory';
import {
	buildMathouCollection,
	isPointLost,
	memoryUpdates,
	trainingTemplateFrom,
	type CollectionNodeKind,
	type CollectionTreeNode,
	type MathouCollection,
	type MathouMemoryUpdate,
	type PointProgress,
	type TrainingTemplate,
	type WorkablePoint
} from '$lib/mathoux/collection-logic';
import { mathouNews, NO_NEWS, type MathouNews } from '$lib/mathoux/news';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/mathoux/collection');

type SB = SupabaseClient<Database>;

const EMPTY_COLLECTION: MathouCollection = {
	races: [],
	counts: { born: 0, napping: 0, toDiscover: 0 }
};

/** Plafond `max_rows` de PostgREST (supabase/config.toml). */
const TAG_PAGE_SIZE = 1000;

const NODE_KINDS: readonly CollectionNodeKind[] = ['branch', 'notion', 'subnotion'];

function isNodeKind(kind: string): kind is CollectionNodeKind {
	return (NODE_KINDS as readonly string[]).includes(kind);
}

/** La collection, et les nouveautés que ce calcul a écrites en mémoire. */
export interface MathouCollectionWithNews {
	collection: MathouCollection;
	news: MathouNews;
}

/**
 * Collection de Mathoux de l'élève pour son niveau, mémoire comprise, et mise à
 * jour de la mémoire s'il y a du nouveau. Mêmes paramètres que
 * `loadMathouCollectionWithNews`, sans les nouveautés.
 */
export async function loadMathouCollection(
	supabase: SB,
	studentId: string,
	grade: string | null
): Promise<MathouCollection> {
	return (await loadMathouCollectionWithNews(supabase, studentId, grade)).collection;
}

/**
 * Collection de Mathoux de l'élève, mise à jour de la mémoire, et nouveautés
 * (naissances, croissances, étoiles) que CE calcul a écrites.
 *
 * @param studentId l'élève de la SESSION (jamais une entrée client) : la mémoire
 *   de cet élève est écrite au client service.
 * @param grade `profiles.grade`. NULL → collection vide, aucune requête.
 * @throws si une lecture échoue : une panne ne doit pas se lire « Chatterie vide ».
 */
export async function loadMathouCollectionWithNews(
	supabase: SB,
	studentId: string,
	grade: string | null
): Promise<MathouCollectionWithNews> {
	if (!grade) return { collection: EMPTY_COLLECTION, news: NO_NEWS };

	// 1. Identité, parcours (le niveau et ses niveaux antérieurs) et mémoire, en parallèle
	const [, grades, memory] = await Promise.all([
		assertSessionStudent(supabase, studentId),
		loadPathGrades(supabase, grade),
		readMathouMemory(supabase, studentId)
	]);

	// 2. Points de chaque niveau rattachés à un nœud (une requête par niveau)
	const pointResults = await Promise.all(
		grades.map((g) =>
			supabase
				.from('curriculum_points')
				.select('id, node_id, grade, regime_acquisition')
				.eq('grade', g)
				.is('archived_at', null)
				.not('node_id', 'is', null)
		)
	);

	const gradePoints: WorkablePoint[] = [];
	// Régime d'acquisition par point : fixe le seuil d'un point « perdu » (`isPointLost`)
	const regimeByPoint = new Map<string, string>();
	for (const result of pointResults) {
		if (result.error) throw new Error(`Points du parcours illisibles : ${result.error.message}`);
		for (const row of result.data ?? []) {
			if (row.node_id && row.grade) {
				gradePoints.push({ id: row.id, nodeId: row.node_id, grade: row.grade });
				regimeByPoint.set(row.id, row.regime_acquisition);
			}
		}
	}
	if (gradePoints.length === 0 && memory.size === 0) {
		return { collection: EMPTY_COLLECTION, news: NO_NEWS };
	}

	const pointIds = gradePoints.map((p) => p.id);
	const subnotionCandidateIds = [...new Set(gradePoints.map((p) => p.nodeId))];

	// 3. Tags par un modèle publié, arbre (branches + notions, puis nœuds référencés), en parallèle
	const [tagsResult, treeResult, referencedResult] = await Promise.all([
		fetchInChunks(pointIds, (batch) => fetchPublishedTagPages(supabase, batch)),
		supabase
			.from('classification_nodes')
			.select('id, kind, parent_id, name, position')
			.in('kind', ['branch', 'notion'])
			.is('archived_at', null),
		fetchInChunks(subnotionCandidateIds, (batch) =>
			supabase
				.from('classification_nodes')
				.select('id, kind, parent_id, name, position')
				.eq('kind', 'subnotion')
				.is('archived_at', null)
				.in('id', batch)
		)
	]);

	if (tagsResult.error) throw new Error(`Tags illisibles : ${tagsResult.error.message}`);
	if (treeResult.error) throw new Error(`Arbre illisible : ${treeResult.error.message}`);
	if (referencedResult.error) {
		throw new Error(`Sous-notions illisibles : ${referencedResult.error.message}`);
	}

	const taggedPointIds = new Set((tagsResult.data ?? []).map((row) => row.point_id));
	const templatesByPoint = templatesByPointFrom(tagsResult.data ?? []);
	const workablePoints = gradePoints.filter((p) => taggedPointIds.has(p.id));
	// Un Mathou mémorisé reste même quand plus aucun de ses points n'est travaillable
	if (workablePoints.length === 0 && memory.size === 0) {
		return { collection: EMPTY_COLLECTION, news: NO_NEWS };
	}

	const nodes: CollectionTreeNode[] = [];
	for (const row of [...(treeResult.data ?? []), ...(referencedResult.data ?? [])]) {
		if (!isNodeKind(row.kind)) continue;
		nodes.push({
			id: row.id,
			kind: row.kind,
			parentId: row.parent_id,
			name: row.name,
			position: row.position
		});
	}

	// ⚠️ Des points travaillables mais aucun nœud : l'arbre est lisible par tout
	// connecté, donc c'est un refus RLS ou un arbre vidé — pas une Chatterie vide.
	if (nodes.length === 0 && workablePoints.length > 0) {
		logger.warn(
			`[mathoux] ${workablePoints.length} points travaillables pour "${grade}" (parcours) mais aucun nœud lu — RLS ?`
		);
	}

	// 4. États et sieste, sur les seuls points travaillables (≈ 30 en Tle spé, pas 1 600)
	const workableIds = workablePoints.map((p) => p.id);
	const { progress, nappingPointIds } =
		workableIds.length > 0
			? await loadProgress(supabase, studentId, workableIds, regimeByPoint)
			: { progress: new Map<string, PointProgress>(), nappingPointIds: new Set<string>() };

	const collection = buildMathouCollection({
		points: workablePoints,
		nodes,
		progress,
		nappingPointIds,
		memory,
		templatesByPoint
	});

	// 5. Mémoire : n'écrit que s'il y a du nouveau ; une panne n'empêche pas l'affichage
	const written = await rememberSafely(studentId, memoryUpdates(collection, memory), memory);

	return { collection, news: mathouNews(collection, memory, written) };
}

/**
 * La mémoire de `studentId` est écrite au client service : il DOIT être
 * l'utilisateur du client passé (audit de la PR 3). Sinon on lève, avant toute
 * écriture : un appel futur avec un identifiant venu d'ailleurs (un prof, une
 * entrée client) n'écrira jamais dans la mémoire d'un autre élève.
 */
async function assertSessionStudent(supabase: SB, studentId: string): Promise<void> {
	const { data, error } = await supabase.auth.getUser();
	if (error || data.user?.id !== studentId) {
		throw new Error('Chatterie : l’élève demandé n’est pas l’utilisateur de la session');
	}
}

/**
 * Écrit la mémoire au client service ; journalise une panne au lieu de la
 * propager. Rend ce que cet appel a écrit, y compris avant une panne (ces
 * lignes sont en base : non annoncées maintenant, elles ne le seraient jamais).
 */
async function rememberSafely(
	studentId: string,
	updates: MathouMemoryUpdate[],
	memory: Map<string, StoredMathouMemory>
): Promise<WrittenMathoux> {
	if (updates.length === 0) return new Map();
	try {
		return await rememberMathoux(createServiceRoleClient(), studentId, updates, memory);
	} catch (err) {
		logger.error(`[mathoux] mémoire non écrite (${updates.length} Mathoux) :`, err);
		return err instanceof MathouMemoryWriteError ? err.written : new Map();
	}
}

/** États de l'élève et points en sieste (badge FSRS « à revoir »). */
async function loadProgress(
	supabase: SB,
	studentId: string,
	workableIds: string[],
	regimeByPoint: Map<string, string>
): Promise<{ progress: Map<string, PointProgress>; nappingPointIds: Set<string> }> {
	const [statesResult, badges] = await Promise.all([
		fetchInChunks(workableIds, (batch) =>
			supabase
				.from('student_point_state')
				.select(
					'point_id, is_acquired, total_successes, distinct_template_successes, last_success_at'
				)
				.eq('student_id', studentId)
				.in('point_id', batch)
		),
		// Sieste : badge FSRS « à revoir », sur un point de n'importe quel niveau
		computePointBadges(supabase, studentId, workableIds)
	]);
	if (statesResult.error) throw new Error(`États illisibles : ${statesResult.error.message}`);

	const progress = new Map<string, PointProgress>();
	for (const row of statesResult.data ?? []) {
		progress.set(row.point_id, {
			isAcquired: row.is_acquired,
			hasSuccess: row.total_successes > 0 || row.last_success_at !== null,
			// Régime absent (impossible : NOT NULL) → `diversite`, le défaut de la colonne
			lost: isPointLost(regimeByPoint.get(row.point_id) ?? 'diversite', {
				isAcquired: row.is_acquired,
				totalSuccesses: row.total_successes,
				distinctTemplateSuccesses: row.distinct_template_successes
			})
		});
	}

	const nappingPointIds = new Set<string>();
	for (const [pointId, badge] of badges) {
		if (badge === 'a_renforcer' || badge === 'a_remedier') nappingPointIds.add(pointId);
	}
	return { progress, nappingPointIds };
}

/**
 * Le niveau de l'élève puis ses niveaux antérieurs, sans doublon.
 *
 * `grade_ancestors` rend un ensemble de textes ; PostgREST le sérialise en
 * tableau de chaînes. Une forme inattendue lève plutôt que de réduire le
 * parcours en silence au seul niveau courant.
 */
async function loadPathGrades(supabase: SB, grade: string): Promise<string[]> {
	const { data, error } = await supabase.rpc('grade_ancestors', { p_grade: grade });
	if (error) throw new Error(`Parcours illisible : ${error.message}`);
	const ancestors: unknown = data ?? [];
	if (!Array.isArray(ancestors) || !ancestors.every((g) => typeof g === 'string')) {
		throw new Error('Parcours illisible : réponse inattendue de grade_ancestors');
	}
	return [...new Set([grade, ...ancestors])];
}

/** Ligne de tag lue : le point, le modèle et, par la jointure, sa catégorie. */
interface PublishedTagRow {
	point_id: string;
	template_id?: string;
	question_templates?: {
		status: string;
		theme: string;
		domain: string;
		subdomain: string | null;
		level: number;
		delay: number | null;
	} | null;
}

/**
 * Modèles publiés par point, pour « Faire grandir ». Une ligne sans modèle
 * joint lisible (forme inattendue) ne donne qu'un point travaillable, sans
 * modèle : la notion n'aura pas de lien plutôt qu'un lien faux.
 */
function templatesByPointFrom(rows: PublishedTagRow[]): Map<string, TrainingTemplate[]> {
	const byPoint = new Map<string, TrainingTemplate[]>();
	for (const row of rows) {
		const joined = row.question_templates;
		if (!row.template_id || !joined) continue;
		const template = trainingTemplateFrom({ id: row.template_id, ...joined });
		if (!template) continue;
		const list = byPoint.get(row.point_id) ?? [];
		list.push(template);
		byPoint.set(row.point_id, list);
	}
	return byPoint;
}

/**
 * Tags d'un lot de points par un modèle PUBLIÉ, lus par pages de 1 000 lignes.
 *
 * Un lot de 100 points peut porter plus de 1 000 tags (14 au plus par point en
 * prod, le 2026-10-18) : PostgREST tronquerait alors en silence au plafond
 * `max_rows`. L'ordre (point, modèle) rend les pages stables.
 *
 * Jointure `!inner` voulue : un modèle invisible à l'élève est un brouillon
 * (« Students can view published templates »), et un brouillon ne rend pas un
 * point travaillable.
 */
async function fetchPublishedTagPages(
	supabase: SB,
	pointIds: string[]
): Promise<{ data: PublishedTagRow[]; error: { message: string } | null }> {
	const rows: PublishedTagRow[] = [];
	for (let from = 0; ; from += TAG_PAGE_SIZE) {
		const { data, error } = await supabase
			.from('question_template_points')
			.select(
				'point_id, template_id, question_templates!inner(status, theme, domain, subdomain, level, delay)'
			)
			.eq('question_templates.status', 'published')
			.in('point_id', pointIds)
			.order('point_id')
			.order('template_id')
			.range(from, from + TAG_PAGE_SIZE - 1);
		if (error) return { data: [], error };
		const page = data ?? [];
		rows.push(...page);
		if (page.length < TAG_PAGE_SIZE) return { data: rows, error: null };
	}
}
