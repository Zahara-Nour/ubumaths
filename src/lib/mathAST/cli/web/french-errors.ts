/**
 * Les messages d'erreur de la console de Calcul, en français (2026-10-12).
 *
 * Les parseurs et le moteur répondent en anglais (« Unexpected token: EOF », « Unknown command:
 * \foo », « Division by zero ») — une centaine de messages, dont une cinquantaine vérifiés tels
 * quels par leurs tests. La traduction se fait donc à la SORTIE de la console, une seule fois.
 *
 * ⚠️ On traduit le MESSAGE seul, puis on le remplace tel quel dans la sortie (revue). La
 * formule générique ne prend qu'une ligne qui COMMENCE par un mot anglais : un message déjà
 * français (« Fonction inconnue : … Fonctions disponibles ») reste entier, et une consigne
 * (« Use: », « Usage: ») reste, sous « Forme attendue : ».
 *
 * @module mathAST/cli/web/french-errors
 */

import type { ReplExecutionResult } from './types';

// =============================================================================
// Constantes
// =============================================================================

/**
 * Les traductions qui ne disent qu'une POSITION (« « 4 » inattendu ici ») : justes sous la
 * ligne de calcul, trompeuses dans le refus d'une carte (`a = 3 sur 4` : c'est « sur » qui
 * gêne). `knownFrench` ne les rend pas (verifs-auto, 2026-10-26).
 */
const POSITION_ONLY = new Set([
	'« $1 » inattendu ici',
	'Caractère « $1 » inconnu',
	'Opérateur « $1 » inattendu'
]);

/** Message anglais → message français ; dans l'ordre (le premier qui convient), ligne par ligne. */
const TRANSLATIONS: readonly (readonly [RegExp, string])[] = [
	// « in atom » : le message du parseur seul, que relaie une carte de l'atelier (2026-10-26)
	[
		/Unexpected token(?: in [a-z]+)?: EOF/,
		'Expression incomplète : il manque quelque chose à la fin'
	],
	[/Unexpected token(?: in [a-z]+)?: (\S+)/, '« $1 » inattendu ici'],
	[/Unexpected character:? ['"]?([^'"\s]+)['"]?/, 'Caractère « $1 » inconnu'],
	[/Unexpected (?:infix )?operator:? ?(\S*)/, 'Opérateur « $1 » inattendu'],
	[/Expected '\|' to close absolute value/, 'Valeur absolue non fermée : il manque une barre |'],
	[/Expected \\right to close delimiter/, 'Il manque \\right pour fermer la parenthèse'],
	[/Expected \\to in limit subscript/, 'Il manque \\to sous la limite : \\lim_{x \\to 0}'],
	// V44 : la fin « , got ] » restait en anglais derrière « Il manque « ) » »
	[/Expected '([^']+)' after \\right, got (\S+)/, 'Il manque « $1 » après \\right : « $2 » trouvé'],
	[
		/Expected delimiter after \\left, got (\S+)/,
		'Il manque une parenthèse après \\left : « $1 » trouvé'
	],
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
	[/Mismatched environments: (\S+) closed by (\S+)/, 'Environnements différents : $1 fermé par $2'],
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
	// lecture-grandeurs, PR 6 : textes de la page virgule (validée le 2026-10-20)
	[
		/Decimal comma: the decimal separator is '\.' \(write (\S+)\)/,
		'Le séparateur décimal est le point : écris $1'
	],
	[
		/Unexpected comma: ',' only separates function arguments/,
		'Virgule inattendue : elle ne sépare que les arguments d’une fonction'
	],
	[
		/';' is not a separator: use ',' between arguments/,
		'Sépare les arguments par une virgule : max(2,5)'
	],
	[
		/A unit needs a number before it \(write (\S+)\)/,
		'Une unité a besoin d’un nombre devant elle : écris $1'
	],
	[
		/Ambiguous term before a unit after a quantity: .*/,
		'Plusieurs nombres devant l’unité, après une grandeur : écris 6[m]/(2*3[s]) ou (6[m]/2)*3[s]'
	],
	[
		/Ambiguous compound duration next to \* or \/: .*/,
		'Durée composée collée à × ou ÷ : écris 2*(1 h 30 min) pour 3 h, ou 2*1 h + 30 min pour 2 h 30 min'
	],
	[
		/Only durations can be written side by side.*/,
		'Seules les durées s’écrivent côte à côte, chacune un nombre et son unité (2 h 30 min) : entre deux autres grandeurs, écris + ou ×'
	],
	[
		/Each part of a compound duration needs its unit.*/,
		'Chaque partie d’une durée composée a besoin de son unité : écris 2 h 30 min'
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
	// V46 : un refus de `.variations` (`\\frac{1}{|x|-2}`, bien lu), pas une faute de saisie
	[
		/^Cannot compute derivative$/,
		'Je ne sais pas encore dériver cette fonction : son sens de variation n’est pas étudié'
	],
	[/Failed to parse expression/, 'Expression illisible'],
	[/^Unknown error.*/, 'Erreur inconnue'],
	[/^Example:/, 'Exemple :']
];

/** Une ligne qui commence par un mot anglais, après la table. */
const ENGLISH_LINE =
	/^(?:Unexpected|Expected|Unknown|Missing|Invalid|Cannot|Empty|Failed|Could not|Too many|Not enough|No |Indeterminate|Consecutive|Mismatched)\b/;

/** Une consigne d'usage en fin de message : gardée (c'est de la syntaxe), annoncée en français. */
const USAGE = /^(.*?)[.:]?\s*\b(?:Use|Usage):\s*(.*)$/;

const GENERIC = 'Écriture non reconnue';

/** Une consigne seule (`.taylor sin(x)` → « Usage: .taylor … ») : la commande est incomplète. */
const INCOMPLETE = 'Commande incomplète';

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

/**
 * L'aide PRÉCISE que dit la table pour un message, ou `null` : aucune entrée,
 * une traduction vide, ou une position seulement (`POSITION_ONLY`). Pas de
 * formule générique. Pour une carte de l'atelier, qui garde son propre refus et
 * n'y ajoute que cette aide (verifs-auto, 2026-10-26).
 */
export function knownFrench(message: string): string | null {
	for (const [english, french] of TRANSLATIONS) {
		const match = english.exec(message);
		if (match === null) continue;
		if (french === '' || POSITION_ONLY.has(french)) return null;
		return french.replace(/\$(\d)/g, (_, index: string) => match[Number(index)] ?? '');
	}
	return null;
}

/** Un message (texte brut, jamais du HTML) en français, ligne par ligne. */
export function inFrench(message: string): string {
	return message
		.split('\n')
		.map(lineInFrench)
		.filter((line, index) => line !== '' || index === 0)
		.join('\n');
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
		...(result.error !== undefined &&
			message !== undefined && {
				error: { ...result.error, message }
			})
	};
}
