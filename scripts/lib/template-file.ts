/**
 * Lecture d'un fichier de modèle brut (`scripts/questions/**`, `create-questions.ts`,
 * `question-specs.ts`) — logique pure, testée dans `scripts/__tests__/template-file.test.ts`.
 *
 * Le champ `points` (codes des anciens points du référentiel) est abandonné (C5, Q8) : les points
 * d'un modèle se rattachent dans sa page admin. Un fichier qui le porte encore est refusé, pour
 * qu'aucun lien ne soit cru écrit.
 *
 * `theme`, `domain`, `subdomain` (l'ancien quadruplet) sont abandonnés de même (ADR 0035,
 * chantier `automaths-arbre`, lot 3b) : un modèle se range dans l'arbre des notions, et un fichier
 * retrouve SON modèle par l'`id` que `create-questions --publier` y écrit (`withTemplateId`).
 */

// Types

export type TemplateFileResult =
	{ ok: true; template: Record<string, unknown> } | { ok: false; error: string };

// Constantes

/** Champs de l'ancien quadruplet, refusés dans un fichier */
const OLD_CATEGORY_FIELDS = ['theme', 'domain', 'subdomain'] as const;

// Fonctions

/** Vérifie qu'un fichier de modèle est un objet JSON sans champ abandonné */
export function readTemplateFile(raw: unknown, file: string): TemplateFileResult {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		return { ok: false, error: `${file} : le fichier doit contenir un objet JSON` };
	}
	if ('points' in raw) {
		return {
			ok: false,
			error: `${file} : champ « points » abandonné — rattacher le modèle aux points dans sa page admin`
		};
	}
	const oldField = OLD_CATEGORY_FIELDS.find((field) => field in raw);
	if (oldField) {
		return {
			ok: false,
			error: `${file} : champ « ${oldField} » abandonné — le modèle se range dans l’arbre des notions (ADR 0035)`
		};
	}
	return { ok: true, template: raw as Record<string, unknown> };
}

/**
 * Texte du fichier avec l'id du modèle écrit en tête (`"id": "…",` juste après `{`) : le reste du
 * texte est intact (pas de re-sérialisation, qui déplierait les objets écrits sur une ligne).
 */
export function withTemplateId(text: string, id: string): string {
	if (!text.startsWith('{\n')) throw new Error('le fichier doit commencer par un objet JSON');
	const parsed: unknown = JSON.parse(text);
	if (parsed && typeof parsed === 'object' && 'id' in parsed) {
		throw new Error('le fichier porte déjà un id');
	}
	return `{\n\t"id": ${JSON.stringify(id)},\n${text.slice(2)}`;
}

/**
 * Fichiers d'un même lot qui créeraient deux modèles de même titre et même niveau : chaque groupe
 * de plus d'un fichier, dans l'ordre des fichiers (le contrôle en base ne voit pas le lot)
 */
export function sameTitleLevelGroups(
	entries: readonly { file: string; title: string; level: number }[]
): string[][] {
	const groups = new Map<string, string[]>();
	for (const { file, title, level } of entries) {
		const key = JSON.stringify([title, level]);
		groups.set(key, [...(groups.get(key) ?? []), file]);
	}
	return [...groups.values()].filter((files) => files.length > 1);
}

/** `grades` comparés comme des ensembles : l'ordre (et un doublon) ne compte pas */
export function sameGrades(a: readonly string[], b: readonly string[]): boolean {
	const ea = new Set(a);
	const eb = new Set(b);
	return ea.size === eb.size && [...ea].every((g) => eb.has(g));
}
