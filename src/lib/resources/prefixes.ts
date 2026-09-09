/**
 * Préfixes de type pour le sélecteur `[[`.
 * =======================================
 *
 * Taper `[[exos:derivees` restreint la recherche aux fiches d'exercices.
 * Sans préfixe, on cherche partout et la popup regroupe par type.
 *
 * POURQUOI FACULTATIF. Dans ce dépôt, la syntaxe `[[kind:uuid|libellé]]` a
 * existé des mois sans servir une seule fois, parce qu'elle exigeait de
 * connaître quelque chose qu'on n'a pas sous la main. Une syntaxe OBLIGATOIRE a
 * le même mode d'échec. Le préfixe est donc un accélérateur pour qui le
 * connaît, jamais un péage : le regroupement par type suffit dans la plupart
 * des cas et ne demande rien à apprendre.
 *
 * Le séparateur est `:` et il est indispensable : `exo` est un préfixe de
 * `exos`, donc seule la présence du deux-points lève l'ambiguïté.
 *
 * @module resources/prefixes
 */

import type { ResourceKind } from './kinds';
import { parseExerciseSelection, formatExerciseSelection } from './exercise-selection';

/**
 * Préfixe → type. Les mots sont ceux du professeur, pas ceux de la base :
 * « exos » pour une fiche (ce qu'on dit à l'oral), « serie » pour ce que
 * l'application appelle une évaluation.
 */
export const KIND_PREFIXES: Record<string, ResourceKind> = {
	exos: 'worksheet',
	fiche: 'worksheet',
	exo: 'exercise',
	python: 'python_exercise',
	notebook: 'python_notebook',
	construction: 'construction',
	question: 'question',
	serie: 'assessment',
	chapitre: 'chapter',
	doc: 'document'
};

export interface ParsedQuery {
	/** Type demandé par le préfixe, ou `null` pour chercher partout. */
	kind: ResourceKind | null;
	/** Le texte à chercher, préfixe retiré. */
	text: string;
	/**
	 * Sélection d'exercices demandée après un `#`, telle que tapée, ou `null`.
	 *
	 * `[[exos:derivees#3` désigne l'exercice 3 ; `#3,5-7` les exercices 3, 5, 6
	 * et 7. Sans sélection, la référence pointe la fiche entière — et n'apporte
	 * alors aucun point de programme, puisque rien ne dit lesquels de ses
	 * exercices ont été faits.
	 */
	selection: string | null;
}

/** `#` suivi d'une liste de numéros ou de plages, en fin de requête. */
const TRAILING_SELECTION = /#([\d,-]{1,60})$/;

/**
 * Découpe `exos:derivees#3,5-7` en type, texte et sélection.
 *
 * Tolérant par construction : un préfixe inconnu n'est pas une erreur, c'est du
 * texte. `[[note:` cherche « note: » plutôt que de ne rien renvoyer — refuser
 * une frappe en cours de saisie serait hostile.
 */
export function parseResourceQuery(raw: string): ParsedQuery {
	let text = raw;
	let kind: ResourceKind | null = null;

	const separator = text.indexOf(':');
	if (separator > 0) {
		const candidate = text.slice(0, separator).toLowerCase();
		const matched = KIND_PREFIXES[candidate];
		if (matched) {
			kind = matched;
			text = text.slice(separator + 1);
		}
	}

	let selection: string | null = null;
	const marquee = text.match(TRAILING_SELECTION);
	if (marquee) {
		// La validité de la sélection est jugée par `parseExerciseSelection` : ici
		// on se contente de la détacher du texte cherché. Une sélection
		// incompréhensible vaudra « fiche entière », pas « rien trouvé ».
		const numeros = parseExerciseSelection(marquee[1]);
		if (numeros.length > 0) {
			selection = formatExerciseSelection(numeros);
			text = text.slice(0, marquee.index);
		}
	}

	return { kind, text, selection };
}

/**
 * Quelques préfixes, pour l'aide affichée dans la popup.
 *
 * Volontairement PAS la liste complète : dix préfixes sur une ligne font un mur
 * qu'on ne lit pas. Ceux-ci suffisent à faire comprendre le mécanisme ; les
 * autres se découvrent en essayant, et ils sont tous ici.
 */
const HINTED_PREFIXES = ['exos', 'exo', 'python', 'serie'] as const;

export function prefixHint(): string {
	return HINTED_PREFIXES.map((prefix) => `${prefix}:`).join(' ');
}
