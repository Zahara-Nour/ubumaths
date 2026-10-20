/**
 * Les messages d'erreur de la console de Calcul, en français (2026-10-12).
 *
 * Les parseurs et le moteur répondent en anglais (« Unexpected token: EOF », « Unknown command:
 * \foo », « Division by zero ») — une centaine de messages, dont une cinquantaine vérifiés tels
 * quels par leurs tests. La traduction se fait donc à la SORTIE de la console, une seule fois.
 *
 * ⚠️ On traduit le MESSAGE seul, puis on le remplace tel quel dans la sortie et, échappé, dans le
 * HTML (revue) : une traduction passée sur le HTML final avalait des balises
 * (`« )</span><br><br> »`) et réécrivait la saisie recopiée de l'élève (`x + Unknown)`). La
 * formule générique ne prend qu'une ligne qui COMMENCE par un mot anglais : un message déjà
 * français (« Fonction inconnue : … Fonctions disponibles ») reste entier, et une consigne
 * (« Use: », « Usage: ») reste, sous « Forme attendue : ».
 *
 * @module mathAST/cli/web/french-errors
 */

import type { ReplExecutionResult } from './types';
import { escapeHtml } from './output-formatter-web';

// =============================================================================
// Constantes
// =============================================================================

/** Message anglais → message français ; dans l'ordre (le premier qui convient), ligne par ligne. */
const TRANSLATIONS: readonly (readonly [RegExp, string])[] = [
	[/Unexpected token: EOF/, 'Expression incomplète : il manque quelque chose à la fin'],
	[/Unexpected token(?: in [a-z]+)?: (\S+)/, '« $1 » inattendu ici'],
	[/Unexpected character:? ['"]?([^'"\s]+)['"]?/, 'Caractère « $1 » inconnu'],
	[/Unexpected (?:infix )?operator:? ?(\S*)/, 'Opérateur « $1 » inattendu'],
	[/Expected '\|' to close absolute value/, 'Valeur absolue non fermée : il manque une barre |'],
	[/Expected \\right to close delimiter/, 'Il manque \\right pour fermer la parenthèse'],
	[/Expected \\to in limit subscript/, 'Il manque \\to sous la limite : \\lim_{x \\to 0}'],
	[/Expected '([^']+)' after [\w \\]+/, 'Il manque « $1 »'],
	[/Expected subscript operand/, 'Il manque l’indice après _'],
	[/Expected exponent/, 'Il manque l’exposant après ^'],
	[/Expected (\S+) but got (\S+)/, '« $1 » attendu, « $2 » trouvé'],
	[/Consecutive signs not allowed: (\S+)/, 'Deux signes à la suite : « $1 »'],
	[/Missing \\frac numerator/, 'Il manque le numérateur de \\frac'],
	[/Missing \\frac denominator/, 'Il manque le dénominateur de \\frac'],
	[/Missing \\sqrt argument/, 'Il manque ce qui est sous \\sqrt'],
	[/Missing \\binom top/, 'Il manque le nombre du haut de \\binom'],
	[/Missing \\binom bottom/, 'Il manque le nombre du bas de \\binom'],
	// `\foo` est une commande LaTeX ; un nom sans antislash, une commande de la console (`.solve`)
	[/Unknown command: (\\\S+)/, 'Commande inconnue : $1'],
	[/Unknown command: \.?(\S+)/, 'Commande inconnue : .$1 — tape .help pour la liste'],
	[/^Type \.help for available commands$/, ''],
	[
		/Unknown function: (\w+)\..*/,
		'Fonction inconnue : $1 — définis-la d’abord, par exemple $1(x) = x^2'
	],
	[/Unknown function: (\w+)/, 'Fonction inconnue : $1'],
	[/Unknown symbol: (\S+)/, 'Symbole inconnu : $1'],
	[/Unknown environment: (\S+)/, 'Environnement inconnu : $1'],
	[
		/Unknown \\text content: "([^"]*)"\. Expected "vrai" or "faux"/,
		'Texte « $1 » non reconnu : seuls « vrai » et « faux » se lisent'
	],
	[/Invalid color: (\S+)/, 'Couleur inconnue : $1'],
	[/Invalid unit: (\S+)/, 'Unité inconnue : $1'],
	[
		/Missing zero before the decimal point \(write (\S+)\)/,
		'Il manque le zéro avant le point décimal : écris $1'
	],
	[/Invalid mode '([^']*)'/, 'Mode inconnu : « $1 »'],
	[/Too many values \(max: (\d+)\)/, 'Trop de valeurs (au plus $1)'],
	[/X and Y must have same length/, 'Les séries X et Y doivent avoir la même longueur'],
	[/^No expression to differentiate/, 'Rien à dériver : écris une expression après la commande'],
	[/^No expression to simplify/, 'Rien à simplifier : écris une expression après la commande'],
	[/^No expression to integrate/, 'Rien à intégrer : écris une expression après la commande'],
	[/^No equation to solve/, 'Aucune équation à résoudre : écris-la après la commande'],
	[/^Invalid syntax\.?/, 'Commande incomplète'],
	[/No AST available/, 'Aucune expression précédente'],
	[/Empty parentheses not allowed/, 'Parenthèses vides'],
	[/Empty brackets not allowed/, 'Crochets vides'],
	[/Empty brace group not allowed/, 'Accolades vides'],
	[/Empty input/, 'Saisie vide'],
	[/Division by zero/, 'Division par zéro'],
	[/Indeterminate form: (\S+)/, 'Forme indéterminée : $1'],
	[
		/Cannot evaluate derivative function '(\w+)'.*/,
		"Dérivée $1' sans définition : définis d’abord $1, par exemple $1(x) = x^2"
	],
	[/Failed to parse expression/, 'Expression illisible'],
	[/^Unknown error.*/, 'Erreur inconnue'],
	[/^Example:/, 'Exemple :']
];

/** Une ligne qui commence par un mot anglais, après la table. */
const ENGLISH_LINE =
	/^(?:Unexpected|Expected|Unknown|Missing|Invalid|Cannot|Empty|Failed|Could not|Too many|Not enough|No |Indeterminate|Consecutive)\b/;

/** Une consigne d'usage en fin de message : gardée (c'est de la syntaxe), annoncée en français. */
const USAGE = /^(.*?)[.:]?\s*\b(?:Use|Usage):\s*(.*)$/;

const GENERIC = 'Écriture non reconnue';

/** Une consigne seule (`.taylor sin(x)` → « Usage: .taylor … ») : la commande est incomplète. */
const INCOMPLETE = 'Commande incomplète';

/** Les en-têtes anglais du HTML du moteur (`outputHtml`, affiché par l'ancienne `/cas`). */
const HTML_HEADERS: readonly (readonly [RegExp, string])[] = [
	[/Error \[[A-Z_]+\]:/g, 'Erreur :'],
	[/Parse error:/g, 'Erreur de lecture :'],
	[/Hint:/g, 'Astuce :'],
	[/Type \.help for available commands/g, 'tape .help pour la liste des commandes']
];

// =============================================================================
// Fonctions
// =============================================================================

/** Les noms anglais des paramètres d'une consigne (`<order>`, `[lower upper]`). */
const USAGE_WORDS: readonly (readonly [RegExp, string])[] = [
	[/\border\b/g, 'ordre'],
	[/\bcenter\b/g, 'centre'],
	[/\blower\b/g, 'borne_inf'],
	[/\bupper\b/g, 'borne_sup'],
	[/\bname\b/g, 'nom'],
	[/\bparams\b/g, 'paramètres'],
	[/ or /g, ' ou ']
];

/** Une ligne de message en français. */
function lineInFrench(line: string): string {
	const usage = USAGE.exec(line);
	if (usage !== null) {
		const head = usage[1].trim() === '' ? INCOMPLETE : lineInFrench(usage[1].trim());
		const form = USAGE_WORDS.reduce(
			(text, [english, french]) => text.replace(english, french),
			usage[2]
		);
		return `${head}. Forme attendue : ${form}`;
	}
	for (const [english, french] of TRANSLATIONS) {
		const match = english.exec(line);
		if (match === null) continue;
		// Les groupes recopiés à la main : un `$` du message n'est jamais lu comme un motif (revue)
		const translated = french.replace(/\$(\d)/g, (_, index: string) => match[Number(index)] ?? '');
		return line.slice(0, match.index) + translated + line.slice(match.index + match[0].length);
	}
	return ENGLISH_LINE.test(line) ? GENERIC : line;
}

/** Un message (texte brut, jamais du HTML) en français, ligne par ligne. */
export function inFrench(message: string): string {
	return message
		.split('\n')
		.map(lineInFrench)
		.filter((line, index) => line !== '' || index === 0)
		.join('\n');
}

/** Le HTML d'une erreur : le message remplacé là où il est écrit, les en-têtes traduits. */
function htmlInFrench(
	html: string,
	original: string | undefined,
	french: string | undefined
): string {
	// Avant la saisie recopiée seulement (`<br><br>`) : `Hint: 2)` tapé reste tel quel
	const split = html.indexOf('<br><br>');
	let head = split === -1 ? html : html.slice(0, split);
	const tail = split === -1 ? '' : html.slice(split);
	if (original !== undefined && french !== undefined && original !== '') {
		head = head.replace(escapeHtml(original), () => escapeHtml(french));
	}
	for (const [english, translated] of HTML_HEADERS) head = head.replace(english, translated);
	return head + tail;
}

/** Le résultat d'une saisie, ses messages d'erreur en français ; une réussite est rendue telle quelle. */
export function withFrenchErrors(result: ReplExecutionResult): ReplExecutionResult {
	if (result.success) return result;
	const original = result.error?.message;
	const french = original === undefined ? undefined : inFrench(original);
	// La sortie recopie le message (parfois précédé de « Erreur de calcul : ») : il y est remplacé
	// tel quel ; sans message d'erreur, la sortie EST le message
	const output =
		original !== undefined &&
		french !== undefined &&
		original !== '' &&
		result.output.includes(original)
			? inFrench(result.output.replace(original, () => french))
			: inFrench(result.output);
	// Une sortie déjà française, distincte du message, dit mieux que la traduction d'un message
	// anglais : `.stats` seul, « Usage : .stats 12 ; 15 ; 9 » plutôt qu'« Écriture non reconnue »
	const message =
		french !== undefined &&
		french !== original &&
		result.output !== '' &&
		result.output === inFrench(result.output) &&
		!result.output.includes(original ?? '')
			? result.output
			: french;
	return {
		...result,
		output,
		...(result.outputHtml !== undefined && {
			outputHtml: htmlInFrench(result.outputHtml, original, french)
		}),
		...(result.error !== undefined &&
			message !== undefined && {
				error: { ...result.error, message }
			})
	};
}
