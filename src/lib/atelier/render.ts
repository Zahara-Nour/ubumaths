/**
 * Atelier — rendre un résultat lisible
 *
 * §3 et §6 ter. Aujourd'hui ni `/calc` ni `/cas` ne rendent le résultat en
 * mathématiques : l'un affiche le texte brut en `font-mono` — le commentaire
 * « will be replaced by proper LaTeX rendering » est toujours dans le code —
 * l'autre du HTML échappé. Et le champ `latex` de `ReplExecutionResult`, qui
 * existe pourtant, n'est **jamais rempli** par aucun chemin.
 *
 * ⚠️ Règle qui tient tout ce module : **on ne reparse jamais la sortie texte.**
 * Mesuré le 2026-09-16 — `(x^2-1)/(x+1)` rend « (x^2-1):/(x+1)  (variables: x) »,
 * et reparser cette chaîne donne « v a r \imaginaryI a b l \exponentialE s » :
 * le mot « variables » lu comme un produit de lettres.
 *
 * @module atelier/render
 */

import type { ReplExecutionResult } from '$lib/mathAST/cli/web/types';
import { displayUnitsInLatex } from '$lib/mathAST/units/display';
import { toLatex } from '$lib/mathAST/latex-generator';
import { tidy } from '$lib/mathAST/tidy';
import { isScientificNotation } from '$lib/mathAST/cli/approximation';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { findNodes } from '$lib/mathAST/transforms';
import { isNumber, isOpposite, isUnit } from '$lib/mathAST/guards';
import type { MathNode } from '$lib/mathAST/types';

// =============================================================================
// Types
// =============================================================================

/** Un résultat prêt à afficher. */
export interface RenderedResult {
	/** Le rendu mathématique, quand il y en a un de sûr. */
	readonly latex?: string;
	/** Ce qu'on affiche sinon — et ce qu'on copie toujours. */
	readonly text: string;
}

// =============================================================================
// Constantes
// =============================================================================

/**
 * Les sequences de couleur d un terminal.
 *
 * WARN **Invisible en node, presente en navigateur.** `chalk` detecte le
 * support des couleurs selon l environnement : le meme appel rend
 * « d/dx(x^2) = 2x » cote serveur et « ESC[1md/dx(x^2)ESC[22m = ESC[36m2xESC[39m »
 * dans Chromium. Un test serveur ne peut donc PAS voir ce defaut — celui qui le
 * garde est dans `render-ansi.svelte.test.ts`.
 *
 * La seconde alternative attrape la forme deja depouillee de son ESC, telle
 * qu elle est apparue a l ecran : « [1md/dx(f) [22m ».
 */
// eslint-disable-next-line no-control-regex -- c'est precisement ce caractere qu'il faut retirer
const ANSI_SEQUENCE = /\u001b[[][0-9;]*m|(?<![a-zA-Z0-9])[[][0-9;]+m/g;

/** La ligne « LaTeX: 2 x » que les commandes ajoutent : une sortie de terminal. */
const LATEX_LINE = /^\s*LaTeX\s*:/;

/** L'annotation « (variables: x) » collée après une expression littérale. */
const VARIABLES_NOTE = /\s*\(\s*variables\s*:[^)]*\)\s*/g;

/** Une commande LaTeX dans le texte — le moteur en mêle aux résultats en unités. */
const HAS_LATEX_COMMAND = /\\[a-zA-Z]+/;

/** Tous les jetons `\commande` d'une chaîne. */
const LATEX_TOKENS = /\\([a-zA-Z]+)/g;

/**
 * Les seules commandes qu'on accepte de laisser passer **depuis le texte**.
 *
 * ⚠️ Cette branche est la seule où le LaTeX rendu ne vient PAS de notre arbre :
 * c'est le texte du moteur, lui-même dérivé de ce que l'élève a tapé. Il finit
 * dans un `{@html}` après `convertLatexToMarkup`, et MathLive accepte des
 * commandes qui posent des attributs (`\htmlStyle`, `\class`, `\cssId`).
 * Plutôt que de lister ce qu'on refuse — liste qu'on oublierait de tenir à jour
 * — on liste ce qu'on accepte : uniquement de quoi écrire un nombre avec son
 * unité, ce que cette branche existe pour préserver.
 */
const SAFE_LATEX_COMMANDS: ReadonlySet<string> = new Set([
	'dfrac',
	'frac',
	'sqrt',
	'cdot',
	'times',
	'div',
	'pi',
	'infty',
	'approx',
	'le',
	'ge',
	'ne',
	'pm',
	'text',
	'left',
	'right',
	'mathrm'
]);

/** Le texte n'emploie-t-il que des commandes LaTeX sûres ? */
function onlySafeCommands(text: string): boolean {
	for (const [, name] of text.matchAll(LATEX_TOKENS)) {
		if (!SAFE_LATEX_COMMANDS.has(name)) return false;
	}
	return true;
}

// =============================================================================
// Fonctions
// =============================================================================

/** Le texte débarrassé de ce qui ne regarde pas l'élève. */
function cleanText(output: string): string {
	// Depouiller AVANT de filtrer : la ligne « LaTeX: » commence par une
	// sequence de couleur en navigateur, et le filtre ne la reconnaissait plus.
	return (
		output
			.replace(ANSI_SEQUENCE, '')
			.split('\n')
			.filter((line) => !LATEX_LINE.test(line))
			.join('\n')
			.replace(VARIABLES_NOTE, ' ')
			// La division « en ligne » de la notation custom : `1/x` tapé se lit
			// comme une division en ligne, que `toCustom` écrit `1:/x`. L'élève a
			// tapé `1/x`, il lit `1/x` (`.intégrer 1/x 1 2` affichait « 1:/x »,
			// 2026-10-08). Sans perte : une division en ligne garde ses parenthèses.
			.replace(/:\//g, '/')
			.trim()
	);
}

/**
 * La forme de LECTURE d'un résultat : `evaluate` rend une forme de calcul
 * (« coefficient × π » : ⅓ π), `tidy` la remet au propre (π/3, √2/2).
 */
function readable(ast: MathNode): MathNode {
	// Un nombre seul est déjà écrit : la valeur approchée du mode décimal garde ses
	// 4 décimales, zéro final compris (`5,0990`), que `tidy` retirerait (revue du lot 4b)
	if (isNumber(ast) || (isOpposite(ast) && isNumber(ast.operand))) return ast;
	// Une notation scientifique (mode décimal) aussi : `tidy` recalculerait `3 × 10²⁰`
	// en 300000000000000000000
	if (isScientificNotation(ast)) return ast;
	// Une expression à variables libres aussi : `tidy` y simplifierait `x/x` en 1
	// (faux en 0, et autre chose que ce que « Garder » range) et réordonnerait
	// `3-2x+x^2` (revue du lot B). Sa cible est π, √, e, ln — sans variable
	if (getVariables(ast).size > 0) return ast;
	// Une grandeur est déjà mise au propre par la console (`quantities.ts`) :
	// `tidy` recalculerait l'écriture juxtaposée `2 h 30 min` en une seule unité (lot C)
	if (findNodes(ast, isUnit).length > 0) return ast;
	try {
		return tidy(ast);
	} catch {
		return ast;
	}
}

/**
 * Rendre un résultat du moteur.
 *
 * ⚠️ `fromCommand` n'est pas un détail : pour une **expression**, `result.ast`
 * porte le RÉSULTAT (`1/3 + 1/6` donne l'arbre de `1/2`, mesuré), tandis que
 * pour une **commande** il porte l'ENTRÉE. Rendre l'arbre d'une commande
 * afficherait donc `x^2` là où `.dériver x^2` répond `2x` — un résultat faux,
 * joliment composé.
 */
export function renderResult(
	result: ReplExecutionResult,
	options?: { readonly fromCommand?: boolean }
): RenderedResult {
	const text = cleanText(result.output);

	// Une erreur s'affiche en français, jamais en mathématiques.
	if (!result.success) return { text };

	if (options?.fromCommand === true) {
		// Le texte d'une commande peut déjà porter du LaTeX : il est alors
		// montré tel quel, s'il n'emploie que des commandes sûres
		if (HAS_LATEX_COMMAND.test(text) && !text.includes('\n') && onlySafeCommands(text)) {
			return { latex: text, text };
		}
		return { text };
	}

	// Un calcul s'écrit depuis son ARBRE, mis au propre par `tidy` (phase 0
	// grandeurs, lot B). ⚠️ Plus jamais depuis le texte : un antislash y faisait
	// prendre `{1/3}\pi` pour du LaTeX (« 1/3π » en ligne), et une grandeur n'y
	// gardait son unité que si sa valeur était une fraction.
	// Une grandeur s'écrit `5~\unit{km}`, que MathLive ne connaît pas : on la
	// traduit comme les énoncés (`displayUnitsInLatex`, `5~\mathrm{km}`)
	if (result.ast !== undefined) {
		// Une écriture gardée (résultat exact trop long) : `tidy` la développerait — le
		// calcul de 13 s que le garde-fou évite
		const ast = result.exactTooLong === undefined ? readable(result.ast) : result.ast;
		return { latex: displayUnitsInLatex(toLatex(ast)), text };
	}

	return { text };
}
