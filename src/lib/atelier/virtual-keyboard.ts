/**
 * Prototype JETABLE — le clavier virtuel de MathLive, configuré (décision 7)
 *
 * Onglet « Calcul » : les touches de l'ancienne `/calc` (`CalculatorKeyboard.svelte`),
 * les fonctions réciproques et x³ en appui long. Onglet « Commandes » : une
 * touche par commande, qui insère son modèle à trous, et les petits mots.
 *
 * @module atelier/virtual-keyboard
 */

import type { VirtualKeyboardKeycap, VirtualKeyboardLayout } from 'mathlive';
import { SMALL_WORDS, type CommandWord } from './natural-input';

type Key = Partial<VirtualKeyboardKeycap> | string;

/** Les commandes de l'onglet, dans l'ordre de la décision 2. */
const COMMAND_KEYS: readonly string[] = (
	'résoudre dériver intégrer factoriser développer simplifier ' +
	'variations limite réciproque domaine évaluer taylor'
).split(' ');

/**
 * La fin de chaque onglet. L'espace finit un mot et fait l'unité (`5 km`) :
 * mesuré, sans elle l'onglet « Calcul » n'en avait pas et `5km` restait collé.
 * « ▢→ » passe à la case suivante d'un modèle : le Tab du téléphone.
 */
const END_KEYS: readonly Key[] = [
	{ label: '␣', insert: '\\,', width: 1.5, tooltip: 'Espace' },
	{ label: '▢→', command: 'moveToNextPlaceholder', class: 'action', tooltip: 'Case suivante' },
	'[left]',
	'[right]',
	'[backspace]',
	'[return]'
];

const FUNCTIONS = ['sin arcsin', 'cos arccos', 'tan arctan', 'ln', 'log'];

/** Une fonction (`sin arcsin` : sa réciproque en appui long), le curseur entre parenthèses. */
function fn(spec: string): Key {
	const [name, ...variants] = spec.split(' ').map((n) => ({
		latex: `\\${n}`,
		insert: `\\${n}\\left(#0\\right)`
	}));
	return variants.length > 0 ? { ...name, variants } : name;
}

const SQUARE: Key = { latex: '#@^2', label: 'x²', variants: [{ latex: '#@^3', label: 'x³' }] };
const SEP = '[separator-5]';

export const CALC_LAYOUT: VirtualKeyboardLayout = {
	label: 'Calcul',
	tooltip: 'Les touches de calcul',
	rows: [
		[...'789', { latex: '\\div', insert: '\\frac{#@}{#0}' }, SEP, ...FUNCTIONS.map(fn)],
		[...'456', '\\times', SEP, '\\sqrt{#0}', SQUARE, { latex: '#@^{#?}', label: '^' }, '\\pi', 'e'],
		[...'123', '-', SEP, '(', ')', { latex: '\\left|#0\\right|', label: '|x|' }, '\\infty', 'x'],
		['0', { label: ',', insert: '{,}' }, '=', '+', ...END_KEYS]
	]
};

/** Une touche de commande : double largeur, petite police (mesuré : « réciproque » tronqué à 390 px). */
const WIDE: Partial<VirtualKeyboardKeycap> = { width: 2.0, class: 'small' };

/** L'onglet « Commandes » : chaque touche insère le modèle à trous. */
export function commandsLayout(words: readonly CommandWord[]): VirtualKeyboardLayout {
	const keys: Key[] = COMMAND_KEYS.flatMap((french) => {
		const template = words.find((w) => w.french === french)?.template;
		return template
			? [{ label: french, insert: template.replaceAll('\\placeholder{}', '#?'), ...WIDE }]
			: [];
	});
	const small: Key[] = SMALL_WORDS.map((word) => ({ label: word, insert: `\\text{${word}}\\,` }));
	return {
		label: 'Commandes',
		tooltip: 'Les commandes de Calcul, avec leurs cases à remplir',
		rows: [
			keys.slice(0, 4),
			keys.slice(4, 8),
			keys.slice(8),
			small,
			['[', ']', ';', 'f', ...END_KEYS]
		]
	};
}
