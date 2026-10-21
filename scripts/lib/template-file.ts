/**
 * Lecture d'un fichier de modèle brut (`scripts/questions/**`, `create-questions.ts`,
 * `question-specs.ts`) — logique pure, testée dans `scripts/__tests__/template-file.test.ts`.
 *
 * Le champ `points` (codes des anciens points du référentiel) est abandonné (C5, Q8) : les points
 * d'un modèle se rattachent dans sa page admin. Un fichier qui le porte encore est refusé, pour
 * qu'aucun lien ne soit cru écrit.
 */

// Types

export type TemplateFileResult =
	{ ok: true; template: Record<string, unknown> } | { ok: false; error: string };

// Fonctions

/** Vérifie qu'un fichier de modèle est un objet JSON sans champ `points` */
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
	return { ok: true, template: raw as Record<string, unknown> };
}

/** `grades` comparés comme des ensembles : l'ordre (et un doublon) ne compte pas */
export function sameGrades(a: readonly string[], b: readonly string[]): boolean {
	const ea = new Set(a);
	const eb = new Set(b);
	return ea.size === eb.size && [...ea].every((g) => eb.has(g));
}
