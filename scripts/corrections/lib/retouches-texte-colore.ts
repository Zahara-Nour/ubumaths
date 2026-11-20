/**
 * Retouches du chantier `texte-colore` (ADR 0042)
 * ===============================================
 *
 * Les 2 modèles publiés qui affichaient un `\textcolor` hors formule (l'élève lisait
 * le LaTeX brut), relevés sur toute la prod par la garde du rendu
 * (`findTextcolorOutsideMath`) le 2026-11-20 : 2 077 modèles portent `\textcolor`,
 * ces deux-là seulement hors `$`. Réécrits en `[…]{.nom}` (table du § 2 du journal :
 * `primary.0` → orange, `primary.1` → bleu), plutôt qu'un filet de rendu à
 * entretenir (David, 2026-11-20).
 *
 * Les formules entièrement colorées des mêmes phrases passent aussi en `[$…$]{.orange}` :
 * sans cela, une même phrase mêlerait deux oranges (la palette pour le texte,
 * `#FF5722` pour la formule). Après retouche, aucun `\textcolor` ne reste.
 *
 * Appliquées par `pnpm corrections:retouches --lot texte-colore` (simulation par défaut).
 */

import type { QuestionTemplate } from '../../../src/lib/questions/types';
import type { Retouche } from './retouches';

// ============================================================================
// CONSTANTS
// ============================================================================

const P0 = '\\textcolor{{{color:primary.0}}}';
const P1 = '\\textcolor{{{color:primary.1}}}';

/** Remplacement attendu exactement `count` fois dans tout le modèle */
interface Replacement {
	from: string;
	to: string;
	count: number;
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Chaque chaîne de `variations` et `shared`, transformée (à toute profondeur) */
function mapStrings(value: unknown, transform: (text: string) => string): unknown {
	if (typeof value === 'string') return transform(value);
	if (Array.isArray(value)) return value.map((item) => mapStrings(item, transform));
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, mapStrings(item, transform)])
		);
	}
	return value;
}

/**
 * Applique les remplacements dans tout le modèle ; chacun doit être trouvé
 * exactement `count` fois, et plus aucun `\textcolor` ne doit rester. Sinon la
 * retouche est refusée (ligne déjà retouchée, ou changée depuis le relevé).
 */
function rewrite(replacements: Replacement[]) {
	return (template: QuestionTemplate): QuestionTemplate => {
		const found = new Map<Replacement, number>(replacements.map((r) => [r, 0]));
		const transform = (text: string) =>
			replacements.reduce((current, r) => {
				const pieces = current.split(r.from);
				found.set(r, (found.get(r) ?? 0) + pieces.length - 1);
				return pieces.join(r.to);
			}, text);
		const after = {
			...template,
			variations: mapStrings(template.variations, transform) as QuestionTemplate['variations'],
			shared: mapStrings(template.shared, transform) as QuestionTemplate['shared']
		};
		for (const [r, n] of found) {
			if (n !== r.count) {
				throw new Error(`texte attendu trouvé ${n} fois (au lieu de ${r.count}) : « ${r.from} »`);
			}
		}
		if (JSON.stringify(after).includes('textcolor')) {
			throw new Error('un `\\textcolor` reste après retouche');
		}
		return after;
	};
}

/** `$\textcolor{primary.0}{X}$` → `[$X$]{.orange}` */
const orangeFormula = (x: string, count = 1): Replacement => ({
	from: `$${P0}{${x}}$`,
	to: `[$${x}$]{.orange}`,
	count
});

// ============================================================================
// RETOUCHES
// ============================================================================

export const TEXTE_COLORE_RETOUCHES: Retouche[] = [
	{
		templateId: '78feafed-650f-44e0-a2c3-1e677809722b',
		note: 'Début de la phrase en `[…]{.bleu}`, le terme ou facteur en `[…]{.orange}` (formules comprises) : plus de `\\textcolor` hors formule.',
		apply: rewrite([
			...['« la somme »', '« le produit »', '« la différence »', '« le quotient »'].map(
				(words) => ({ from: `${P1}{${words}}`, to: `[${words}]{.bleu}`, count: 1 })
			),
			{
				from: `${P0}{« le produit de} $${P0}{{{a}}}$ ${P0}{par} $${P0}{{{c}}}$${P0}{ »}`,
				to: '[« le produit de ${{a}}$ par ${{c}}$ »]{.orange}',
				count: 1
			},
			orangeFormula('{{a}} \\times {{c}}'),
			orangeFormula('{{b}} - {{c}}'),
			orangeFormula('{{b}} : {{c}}'),
			orangeFormula('{{a}} + {{c}}')
		])
	},
	{
		templateId: 'e4784c78-13d5-49ac-b50b-b07efca03d19',
		note: 'Nombre de diviseurs et valeur renvoyée en `[…]{.orange}` : plus de `\\textcolor` hors formule.',
		// Vérifié le 2026-11-20 : la correction d'ORIGINE est déjà rouge au vérificateur
		// (classe N par défaut : « aucun calcul aligné » ; `written` : « 6 absent de
		// l'énoncé », la réponse se lit dans le code). Le fond est prouvé intact par le
		// test « rien d'autre ne change » de `retouches-texte-colore.test.ts`.
		skipVerifier:
			'lecture de code Python, hors des classes du vérificateur (déjà rouge avant retouche) ; seul le marquage de couleur change',
		apply: rewrite([
			{ from: `${P0}{{{rep}}} diviseurs`, to: '[{{rep}}]{.orange} diviseurs', count: 1 },
			orangeFormula('{{rep}}'),
			orangeFormula('{{N}}')
		])
	}
];
