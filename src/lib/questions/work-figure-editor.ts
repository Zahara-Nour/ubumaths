/**
 * Éditeur de cases : la figure de travail lue dans l'énoncé
 * ==========================================================
 *
 * Le bloc ```figure-de-travail porte une case, jamais notée. L'éditeur la montre
 * en carte de lecture seule (son outil, ses erreurs), sans champ de réponse :
 * elle se modifie dans l'énoncé (décision de David, 2026-10-26,
 * `docs/archive/wip/figure-et-choix-progress.md` § 2.9, Q3).
 *
 * @module questions/work-figure-editor
 */

import { assignBlankIndices } from './generator/assign-blank-indices';
import { readConstructionHeader } from '$lib/ubumark/parser/construction-parser';
import { parseFigureContent } from '$lib/ubumark/parser/figure-parser';
import type { ConstructionTool } from '$lib/ubumark/types/construction';

// Types
/** Ce que dit la carte d'une figure de travail */
export interface WorkFigureCase {
	tool: ConstructionTool;
	/** Messages pour l'auteur (bloc mal écrit) */
	errors: string[];
}

// Constantes
/** Variable du modèle (`{{xa}}`) : la figure n'est lisible qu'une fois tirée */
const TEMPLATE_VARIABLE = /\{\{/;

// Functions
/** Les figures de travail de l'énoncé, par numéro de case (`blanks[i]`) */
export function readWorkFigureCases(statement: string): Map<number, WorkFigureCase> {
	const cases = new Map<number, WorkFigureCase>();
	for (const [key, source] of Object.entries(
		assignBlankIndices(statement).workFigureBlanks ?? {}
	)) {
		const header = readConstructionHeader(source, { work: true });
		// Avec des variables, le script n'est jugé qu'à la génération (à l'enregistrement)
		const figureErrors = TEMPLATE_VARIABLE.test(header.figureSource)
			? []
			: parseFigureContent(header.figureSource).errors;
		cases.set(Number(key), {
			tool: header.spec.tools[0] ?? 'droite',
			errors: [...header.errors, ...figureErrors].map((e) => e.message)
		});
	}
	return cases;
}
