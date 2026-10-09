/**
 * Atelier — `.aide` de la vue Calcul, écrite pour un élève
 *
 * Décision de David (2026-10-09) : `.aide` affichait l'aide du MOTEUR, écrite
 * pour le développeur, en anglais (« Parse expression and display AST… »),
 * avec l'ancienne syntaxe (`.integrate expr[ ; variable] [a b]`) et des
 * commandes internes. Elle est désormais en français, avec la syntaxe par
 * mots-clés (`docs/wip/syntaxe-commandes-calcul.md`) et un exemple qui marche
 * par commande. L'ancienne liste reste là, derrière `.aide dev`.
 *
 * ⚠️ **Le catalogue (`commandCatalog`) est la source unique** : descriptions,
 * exemples et rubriques des commandes viennent de lui. Ce module n'ajoute que
 * ce qui n'est PAS une commande (calcul direct, définitions) et un second
 * exemple quand un mot-clé n'apparaîtrait sinon nulle part (`dans`, `pour`).
 *
 * @module atelier/help
 */

import type { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { commandCatalog, type HelpSection } from './commands';

// =============================================================================
// Types
// =============================================================================

/** Une ligne de l'aide : un exemple à retaper, et ce qu'il fait. */
export interface HelpEntry {
	/** Le nom moteur de la commande illustrée ; absent pour une saisie sans point. */
	readonly command?: string;
	/** Ce que l'élève retape, tel quel. */
	readonly example: string;
	readonly description: string;
	/** Les saisies à faire avant (`1200[m]` pour `.convertir`). */
	readonly setup?: readonly string[];
	/** Les listes que cite l'exemple (`.comparer L M`), comme au catalogue. */
	readonly listSetup?: Readonly<Record<string, string>>;
}

/** Une rubrique de l'aide. */
export interface HelpBlock {
	readonly title: string;
	readonly entries: readonly HelpEntry[];
}

// =============================================================================
// Constantes
// =============================================================================

/** L'argument de `.aide` qui ouvre la liste de développeur. */
export const DEV_HELP_ARGUMENT = 'dev';

/** La commande qui liste les commandes de développeur (en anglais). */
export const DEV_HELP_COMMAND = `.aide ${DEV_HELP_ARGUMENT}`;

const TITLE = 'Commandes disponibles';

/** Les rubriques des commandes, dans l'ordre d'affichage, avec leur titre. */
const SECTIONS: readonly { readonly id: HelpSection; readonly title: string }[] = [
	{ id: 'calculer', title: 'Calculer' },
	{ id: 'analyser', title: 'Étudier une fonction, résoudre' },
	{ id: 'statistiques', title: 'Statistiques' },
	{ id: 'probabilites', title: 'Probabilités et simulations' },
	{ id: 'reglages', title: 'Réglages' }
];

/** Ce qui s'écrit SANS point : le calcul direct et les définitions. */
const WITHOUT_COMMAND: readonly HelpBlock[] = [
	{
		title: 'Calcul direct (sans point)',
		entries: [
			{ example: '2/3 + 1/4', description: 'Écrire le calcul, puis Entrée' },
			{ example: '1,5 * 4', description: 'La virgule est décimale' },
			{
				example: 'f(2)',
				description: 'Utiliser une fonction définie',
				setup: ['f(x) = x^2 - 3x']
			}
		]
	},
	{
		title: 'Définir (sans point)',
		entries: [
			{ example: 'f(x) = x^2 - 3x', description: 'Une fonction' },
			{ example: 'u(n) = 2n + 1', description: 'Une suite, par son terme général' },
			{ example: 'u(n+1) = 0,5u(n) + 3', description: 'Une suite, par récurrence' },
			{ example: 'L = 1,5 ; 2 ; 3,5', description: 'Une liste : « ; » sépare les valeurs' },
			{ example: 'a = 3', description: 'Une valeur' }
		]
	}
];

/**
 * Les exemples AJOUTÉS à celui du catalogue : un mot-clé que l'exemple du
 * catalogue ne montre pas.
 */
const EXTRA_EXAMPLES: Readonly<Record<string, readonly HelpEntry[]>> = {
	diff: [{ command: 'diff', example: '.dériver a t^2 pour t', description: 'Choisir la variable' }],
	mode: [
		{ command: 'mode', example: '.mode décimal', description: 'Passer aux valeurs décimales' }
	],
	solve: [
		{
			command: 'solve',
			example: '.résoudre sin(x)=0 dans [0;2π]',
			description: 'Résoudre sur un intervalle'
		}
	]
};

/** `.convertir` agit sur le DERNIER résultat : il en faut un avant. */
const COMMAND_SETUP: Readonly<Record<string, readonly string[]>> = {
	convert: ['1200[m]']
};

/** Les mots-clés et les séparateurs, rappelés une fois en pied d'aide. */
const SYNTAX_REMINDER: readonly string[] = [
	'Mots-clés : de … à, pour, en, ordre, dans, et.',
	'Virgule décimale (1,5) ; « ; » sépare les valeurs.',
	'Les accents sont facultatifs : .deriver comme .dériver.'
];

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Les rubriques de l'aide, dans l'ordre d'affichage.
 *
 * Une commande du catalogue sans rubrique, ou indisponible dans l'atelier,
 * n'y figure pas : c'est une commande de développeur (`.aide dev`).
 */
export function studentHelp(engine: WebReplEngine): HelpBlock[] {
	const shown = commandCatalog(engine).filter(
		(c) => c.section !== undefined && c.unavailable === undefined && c.example !== undefined
	);

	const blocks: HelpBlock[] = [...WITHOUT_COMMAND];
	for (const { id, title } of SECTIONS) {
		const entries = shown
			.filter((c) => c.section === id)
			.flatMap((c): HelpEntry[] => [
				{
					command: c.name,
					// Filtré plus haut : toute commande retenue a un exemple
					example: c.example ?? '',
					description: c.description,
					...(COMMAND_SETUP[c.name] && { setup: COMMAND_SETUP[c.name] }),
					...(c.exampleSetup && { listSetup: c.exampleSetup })
				},
				...(EXTRA_EXAMPLES[c.name] ?? [])
			]);
		if (entries.length > 0) blocks.push({ title, entries });
	}
	return blocks;
}

/**
 * L'aide en texte : une rubrique par titre, une commande par ligne, la
 * commande de développeur sur la DERNIÈRE ligne.
 */
export function studentHelpText(engine: WebReplEngine): string {
	const lines: string[] = [TITLE];
	for (const block of studentHelp(engine)) {
		lines.push('', block.title);
		for (const entry of block.entries) {
			lines.push(`  ${entry.example}  — ${entry.description}`);
		}
	}
	lines.push('', ...SYNTAX_REMINDER, '', `Commandes de développeur : ${DEV_HELP_COMMAND}`);
	return lines.join('\n');
}
