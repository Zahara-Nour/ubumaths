/**
 * Les messages d'erreur de la console de Calcul, en français (2026-10-12).
 *
 * Les parseurs et le moteur répondent en anglais (« Unexpected token: EOF », « Unknown command:
 * \foo », « Division by zero ») — une centaine de messages, dont une cinquantaine vérifiés tels
 * quels par leurs tests. La traduction se fait donc à la SORTIE de la console, une seule fois :
 * les plus fréquents par une table, le reste par une formule française générique (jamais
 * l'anglais à l'écran d'un élève).
 *
 * @module mathAST/cli/web/french-errors
 */

import type { ReplExecutionResult } from './types';

// =============================================================================
// Constantes
// =============================================================================

/** Message anglais → message français ; dans l'ordre (le premier qui convient). */
const TRANSLATIONS: readonly (readonly [RegExp, string])[] = [
	[/Unexpected token: EOF/g, 'Expression incomplète : il manque quelque chose à la fin'],
	[/Unexpected token(?: in [a-z]+)?: (\S+)/g, '« $1 » inattendu ici'],
	[/Unexpected character:? ['"]?([^'"\s]+)['"]?/g, 'Caractère « $1 » inconnu'],
	[/Unexpected (?:infix )?operator:? ?(\S*)/g, 'Opérateur « $1 » inattendu'],
	[/Expected '([^']+)' after expression/g, 'Il manque « $1 »'],
	[/Expected \\right to close delimiter/g, 'Il manque \\right pour fermer la parenthèse'],
	[/Expected \\to in limit subscript/g, 'Il manque \\to sous la limite : \\lim_{x \\to 0}'],
	[/Expected subscript operand/g, 'Il manque l’indice après _'],
	[/Expected exponent/g, 'Il manque l’exposant après ^'],
	[/Expected (\S+) but got (\S+)/g, '« $1 » attendu, « $2 » trouvé'],
	[/Consecutive signs not allowed: (\S+)/g, 'Deux signes à la suite : « $1 »'],
	[/Missing \\frac numerator/g, 'Il manque le numérateur de \\frac'],
	[/Missing \\frac denominator/g, 'Il manque le dénominateur de \\frac'],
	[/Missing \\sqrt argument/g, 'Il manque ce qui est sous \\sqrt'],
	[/Missing \\binom top/g, 'Il manque le nombre du haut de \\binom'],
	[/Missing \\binom bottom/g, 'Il manque le nombre du bas de \\binom'],
	[
		/Unknown command: (\w+)\s*Type \.help for available commands/g,
		'Commande inconnue : .$1 — tape .help pour la liste'
	],
	[/Unknown command: (\S+)/g, 'Commande inconnue : $1'],
	[
		/Unknown function: (\w+)\..*/g,
		'Fonction inconnue : $1 — définis-la d’abord, par exemple $1(x) = x^2'
	],
	[/Unknown function: (\w+)/g, 'Fonction inconnue : $1'],
	[/Unknown symbol: (\S+)/g, 'Symbole inconnu : $1'],
	[/Unknown environment: (\S+)/g, 'Environnement inconnu : $1'],
	[
		/Unknown \\text content: "([^"]*)"\. Expected "vrai" or "faux"/g,
		'Texte « $1 » non reconnu : seuls « vrai » et « faux » se lisent'
	],
	[/Invalid color: (\S+)/g, 'Couleur inconnue : $1'],
	[/Invalid unit: (\S+)/g, 'Unité inconnue : $1'],
	[/Empty parentheses not allowed/g, 'Parenthèses vides'],
	[/Empty brackets not allowed/g, 'Crochets vides'],
	[/Empty brace group not allowed/g, 'Accolades vides'],
	[/Empty input/g, 'Saisie vide'],
	[/Division by zero/g, 'Division par zéro'],
	[/Indeterminate form: (\S+)/g, 'Forme indéterminée : $1'],
	[
		/Cannot evaluate derivative function '(\w+)'.*/g,
		"Dérivée $1' sans définition : définis d’abord $1, par exemple $1(x) = x^2"
	],
	[/Failed to parse expression/g, 'Expression illisible'],
	[/Unknown error[^]*/g, 'Erreur inconnue'],
	// Les en-têtes du HTML de /cas
	[/Error \[[A-Z_]+\]:/g, 'Erreur :'],
	[/Parse error:/g, 'Erreur de lecture :']
];

/** Ce qui reste anglais après la table : remplacé par une formule française. */
const STILL_ENGLISH =
	/\b(?:Unexpected|Expected|Unknown|Missing|Invalid|Cannot|Empty|Failed|Could not|Too many|Not enough|Division by|Indeterminate|Consecutive)\b[^<\n]*/g;

const GENERIC = 'Écriture non reconnue';

// =============================================================================
// Fonctions
// =============================================================================

/** Un message (texte ou HTML) en français. */
export function inFrench(message: string): string {
	let text = message;
	for (const [english, french] of TRANSLATIONS) text = text.replace(english, french);
	return text.replace(STILL_ENGLISH, GENERIC);
}

/** Le résultat d'une saisie, ses messages d'erreur en français ; une réussite est rendue telle quelle. */
export function withFrenchErrors(result: ReplExecutionResult): ReplExecutionResult {
	if (result.success) return result;
	// Une sortie vide reste vide : l'atelier y répond « Je n'ai pas su lire… » (calcul.ts)
	const output = inFrench(result.output);
	return {
		...result,
		output,
		...(result.outputHtml !== undefined && {
			outputHtml: inFrench(result.outputHtml)
		}),
		...(result.error !== undefined && {
			error: { ...result.error, message: inFrench(result.error.message) }
		})
	};
}
