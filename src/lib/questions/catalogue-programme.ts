/**
 * Vue « Programme » du catalogue Automaths
 * ========================================
 *
 * Phase 0 validée par David le 2026-11-18 (journal `automaths`, points 8-13) :
 *
 * - le programme du niveau choisi (seul : « et niveaux inférieurs » ne change
 *   que les questions), rangé par partie puis chapitre, d'après la `rubrique`
 *   des points (« Partie > Chapitre [> Automatismes] ») ; « > Automatismes »
 *   rejoint son chapitre ; une rubrique d'un seul mot est son propre chapitre ;
 * - parties, chapitres et points dans l'ordre du BO (`display_order`) ;
 * - questions sous un point, lecture A : celles rattachées au point ; aucune
 *   (dans la liste déjà filtrée par niveau) → celles du nœud du point,
 *   sous-notions comprises si le point est posé sur une notion.
 *
 * Ne lit rien : range des données reçues avec la liste des modèles
 * (`questionTemplatesCache`).
 */

import type { QuestionTemplate } from '#lib/questions/types.ts';
import { compareTemplates, type CatalogueNode } from '#lib/questions/catalogue.ts';

// ============================================================================
// TYPES
// ============================================================================

/** Point du programme tel que la liste des modèles le porte */
export interface CatalogueProgrammePoint {
	id: string;
	name: string;
	grade: string;
	rubrique: string | null;
	display_order: number;
	node_id: string;
}

/** Une section : un point et ses questions */
export interface ProgrammeSection {
	id: string;
	name: string;
	templates: QuestionTemplate[];
	/** Nom du nœud dont viennent les questions (repli), `null` si elles sont rattachées au point */
	fallbackNodeName: string | null;
}

export interface ProgrammeChapter {
	/** Lisible dans l'adresse (`?chapitre=`) */
	id: string;
	name: string;
	points: ProgrammeSection[];
}

export interface ProgrammePart {
	id: string;
	name: string;
	chapters: ProgrammeChapter[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Séparateur de la `rubrique` (« > » en base ; « › » toléré) */
const RUBRIQUE_SEPARATOR = /\s+[>›]\s+/;
const NO_RUBRIQUE_NAME = 'Hors chapitre';

// ============================================================================
// FUNCTIONS
// ============================================================================

/** « Représentation de l'espace » → « representation-de-l-espace » */
function slugOf(text: string): string {
	return text
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/** Partie et chapitre d'une rubrique ; le 3e étage (« Automatismes ») est ignoré */
function partAndChapter(rubrique: string | null): [string, string] {
	const [part, chapter] = (rubrique ?? '').split(RUBRIQUE_SEPARATOR).filter(Boolean);
	if (!part) return [NO_RUBRIQUE_NAME, NO_RUBRIQUE_NAME];
	return [part, chapter ?? part];
}

function byBoOrder(a: CatalogueProgrammePoint, b: CatalogueProgrammePoint): number {
	return a.display_order - b.display_order || a.id.localeCompare(b.id);
}

/**
 * Questions du nœud d'un point : celles posées sur le nœud, et sur ses
 * sous-notions si c'est une notion
 */
function nodeTemplates(
	nodeId: string,
	templatesByNode: ReadonlyMap<string, QuestionTemplate[]>,
	childrenByNode: ReadonlyMap<string, string[]>
): QuestionTemplate[] {
	const nodeIds = [nodeId, ...(childrenByNode.get(nodeId) ?? [])];
	return nodeIds.flatMap((id) => templatesByNode.get(id) ?? []).sort(compareTemplates);
}

/**
 * Programme d'un niveau : parties → chapitres → points, avec leurs questions.
 *
 * @param templates - modèles déjà filtrés par niveau (seul ou avec les inférieurs)
 * @param templatePoints - ids des points de chaque modèle
 */
export function buildProgramme(
	points: readonly CatalogueProgrammePoint[],
	grade: string | null,
	templates: readonly QuestionTemplate[],
	templatePoints: Readonly<Record<string, string[]>>,
	nodes: readonly CatalogueNode[]
): ProgrammePart[] {
	if (!grade) return [];
	const gradePoints = points.filter((p) => p.grade === grade).sort(byBoOrder);
	if (gradePoints.length === 0) return [];

	const nodesById = new Map(nodes.map((n) => [n.id, n]));
	const childrenByNode = new Map<string, string[]>();
	for (const node of nodes) {
		if (node.kind !== 'subnotion' || !node.parent_id) continue;
		childrenByNode.set(node.parent_id, [...(childrenByNode.get(node.parent_id) ?? []), node.id]);
	}
	const templatesByNode = new Map<string, QuestionTemplate[]>();
	const templatesByPoint = new Map<string, QuestionTemplate[]>();
	for (const template of templates) {
		const nodeId = template.classification_node_id;
		if (nodeId) templatesByNode.set(nodeId, [...(templatesByNode.get(nodeId) ?? []), template]);
		for (const pointId of templatePoints[template.id] ?? []) {
			templatesByPoint.set(pointId, [...(templatesByPoint.get(pointId) ?? []), template]);
		}
	}

	// Ordre d'apparition = ordre du BO (points déjà triés)
	const parts = new Map<string, { name: string; chapters: Map<string, ProgrammeSection[]> }>();
	for (const p of gradePoints) {
		const [partName, chapterName] = partAndChapter(p.rubrique);
		const part = parts.get(partName) ?? { name: partName, chapters: new Map() };
		parts.set(partName, part);
		const sections = part.chapters.get(chapterName) ?? [];
		part.chapters.set(chapterName, sections);

		const linked = templatesByPoint.get(p.id);
		const fallback = linked ? [] : nodeTemplates(p.node_id, templatesByNode, childrenByNode);
		sections.push({
			id: p.id,
			name: p.name,
			templates: linked ? [...linked].sort(compareTemplates) : fallback,
			fallbackNodeName: fallback.length > 0 ? (nodesById.get(p.node_id)?.name ?? null) : null
		});
	}

	// Identifiants de chapitres : le nom seul ; déjà pris → la partie devant ;
	// encore pris (casse, accents) → un numéro ; nom sans lettre → « chapitre »
	const usedIds = new Set<string>();
	function chapterId(partName: string, chapterName: string): string {
		const base = slugOf(chapterName) || 'chapitre';
		const candidates = [base, `${slugOf(partName) || 'partie'}-${base}`];
		let id = candidates.find((c) => !usedIds.has(c));
		for (let n = 2; !id; n++) if (!usedIds.has(`${base}-${n}`)) id = `${base}-${n}`;
		usedIds.add(id);
		return id;
	}

	return [...parts.values()].map((part) => ({
		id: slugOf(part.name),
		name: part.name,
		chapters: [...part.chapters].map(([name, sections]) => ({
			id: chapterId(part.name, name),
			name,
			points: sections
		}))
	}));
}

/** Nombre de questions d'un chapitre, chacune comptée une fois (plusieurs points peuvent la montrer) */
export function chapterTemplateCount(chapter: ProgrammeChapter): number {
	return new Set(chapter.points.flatMap((p) => p.templates.map((t) => t.id))).size;
}

/** Nombre de questions d'une partie, chacune comptée une fois */
export function partTemplateCount(part: ProgrammePart): number {
	return new Set(
		part.chapters.flatMap((c) => c.points.flatMap((p) => p.templates.map((t) => t.id)))
	).size;
}
