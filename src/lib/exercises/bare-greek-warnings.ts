/**
 * Nom grec écrit sans antislash dans une formule `~…~`
 * =====================================================
 *
 * Dans la notation `~…~`, chaque lettre est une variable et deux lettres côte à
 * côte se multiplient : `~2pi~` se lit 2 × p × i, `~mu~` m × u, sans aucune
 * erreur. Les lettres grecques s'y écrivent avec un antislash (`\pi`, `\alpha`),
 * comme en LaTeX : l'antislash lève l'ambiguïté une fois pour toutes. On ne
 * change pas la notation ; on prévient l'auteur dans l'éditeur (décision de
 * David, 2026-09-24).
 *
 * @module exercises/bare-greek-warnings
 */

import { extractMath } from '$lib/ubumark/parser/math-extractor';
import { VALID_SYMBOLS } from '$lib/mathAST/parser/custom/tokenizer';
import type { ExerciseVariation } from './types';

/** Un champ de la variation et les noms grecs à y corriger */
export interface BareGreekWarning {
	field: string;
	names: string[];
}

/**
 * Les noms grecs (et `infty`) écrits sans antislash dans les formules `~…~`
 * d'un texte ubumark, sans doublon, dans l'ordre d'apparition.
 *
 * Seul un nom ISOLÉ compte : une suite de lettres égale au nom, non précédée
 * d'un antislash. `~api~` n'est pas signalé (lettres collées), `~\pi~` non plus.
 * Les formules LaTeX `$…$` et le texte ne sont pas examinés.
 */
export function findBareGreekNames(markdown: string): string[] {
	if (!markdown) return [];
	const found: string[] = [];
	for (const placeholder of extractMath(markdown).placeholders) {
		if (placeholder.syntax !== 'custom') continue;
		for (const [, backslash, word] of placeholder.expression.matchAll(/(\\?)([A-Za-z]+)/g)) {
			if (backslash === '' && VALID_SYMBOLS.has(word) && !found.includes(word)) {
				found.push(word);
			}
		}
	}
	return found;
}

/**
 * Les avertissements d'une variation, champ par champ, dans l'ordre de
 * l'éditeur : énoncé, solution, aides, puis leurs versions anglaises.
 */
export function bareGreekWarnings(variation: ExerciseVariation): BareGreekWarning[] {
	const english = variation.translations?.en;
	const fields: [string, string | undefined][] = [
		['Énoncé', variation.statement_md],
		['Solution', variation.solution_md],
		...(variation.hints ?? []).map((hint): [string, string | undefined] => [
			`Aide « ${hint.title} »`,
			hint.content
		]),
		['Énoncé (anglais)', english?.statement_md],
		['Solution (anglais)', english?.solution_md],
		...Object.entries(english?.hints ?? {}).map(([id, hint]): [string, string | undefined] => [
			`Aide « ${hint.title ?? id} » (anglais)`,
			hint.content
		])
	];

	return fields.flatMap(([field, markdown]) => {
		const names = findBareGreekNames(markdown ?? '');
		return names.length > 0 ? [{ field, names }] : [];
	});
}
