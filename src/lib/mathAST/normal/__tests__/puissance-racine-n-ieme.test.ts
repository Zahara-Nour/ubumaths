/**
 * `(ⁿ√a)^k` vaut `a^{k/n}`, pas `a^{k/2}`.
 *
 * ## Le bug, mesuré sur `main` à `270ce0311`
 *
 * La règle « puissance d'une racine » divisait l'exposant par **2**, en dur,
 * alors que l'indice de la racine est disponible sur le nœud. Toute racine
 * autre que carrée était donc traitée comme une racine carrée.
 *
 * | expression | forme normale rendue | valeur juste |
 * | --- | --- | --- |
 * | `(∛x)²` | `x` | `x^{2/3}` |
 * | `(∛x)³` | `x^{3/2}` | `x` |
 * | `(⁴√x)²` | `x` | `x^{1/2}` |
 *
 * Deux de ces trois lignes sont des **faux positifs** du décideur : `(∛x)² ≡ x`
 * et `(⁴√x)² ≡ x` rendaient `true`. Un faux positif compte JUSTE une réponse
 * FAUSSE d'élève, c'est la seule faute qui ne se rattrape pas.
 *
 * ## Comment il se manifestait
 *
 * `simplify(∛x·∛x)` rendait `x`. La trace montre `tidy` produisant `(∛x)²`,
 * ce qui est juste, puis l'étape suivante repliant ça en `x` par le chemin
 * fautif. Le produit `∛x·∛x` avait pourtant la bonne forme normale,
 * `x^{2/3}` : seule la mise en puissance explicite se trompait.
 *
 * ## Même angle mort que la veille, ailleurs
 *
 * `parseLatex('\sqrt[3]{x}')` rend une fonction nommée `sqrt` avec **un seul
 * argument**, l'indice étant rangé à part dans `base`. Tout test de la forme
 * `name === 'sqrt' && args.length === 1` confond donc les deux. La PR #388
 * avait fermé ce trou dans la fusion des radicaux ; celui-ci était dans la
 * mise en puissance.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';
import { simplify } from '../../simplify';
import { toLatex } from '../../index';

const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

describe('la puissance d’une racine divise par l’INDICE', () => {
	it.each([
		['\\sqrt[3]{x}^{2}', 'x^{2/3}'],
		['\\sqrt[3]{x}^{3}', 'x'],
		['\\sqrt[3]{x}^{6}', 'x^{2}'],
		['\\sqrt[4]{x}^{2}', '\\sqrt{x}'],
		['\\sqrt[4]{x}^{4}', 'x'],
		['\\sqrt[6]{x}^{3}', '\\sqrt{x}'],
		['\\sqrt[3]{8}^{2}', '4'],
		['\\sqrt[3]{x}^{-3}', '\\frac{1}{x}']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

describe('aucun faux positif : une racine n-ième n’est pas une racine carrée', () => {
	it.each([
		['\\sqrt[3]{x}^{2}', 'x'],
		['\\sqrt[4]{x}^{2}', 'x'],
		['\\sqrt[3]{x}^{2}', '\\sqrt{x}'],
		['\\sqrt[5]{x}^{2}', 'x'],
		['\\sqrt[3]{x}^{3}', 'x^{3/2}']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});
});

describe('la racine carrée n’est pas touchée', () => {
	it.each([
		['\\sqrt{x}^{2}', 'x'],
		['\\sqrt{x}^{3}', 'x\\sqrt{x}'],
		['\\sqrt{x}^{4}', 'x^{2}'],
		['\\sqrt{x}\\sqrt{x}', 'x'],
		['\\sqrt{2}^{2}', '2'],
		['\\sqrt[2]{x}^{2}', 'x']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

describe('l’affichage cesse de se contredire', () => {
	it.each([
		'\\sqrt[3]{x}\\sqrt[3]{x}',
		'\\sqrt[3]{x}\\sqrt[3]{x}\\sqrt[3]{x}',
		'\\sqrt[4]{x}\\sqrt[4]{x}',
		'\\sqrt[3]{x}^{2}',
		'\\sqrt{x}\\sqrt{x}'
	])('areEquivalent(%s, simplify(…)) vaut true', (entree) => {
		const node = parseLatex(entree);
		expect(areEquivalent(node, simplify(node).result)).toBe(true);
	});

	it('trois racines cubiques rendent bien le radicande', () => {
		expect(toLatex(simplify(parseLatex('\\sqrt[3]{x}\\sqrt[3]{x}\\sqrt[3]{x}')).result)).toBe('x');
	});
});

// =============================================================================
// Un indice qu'on ne sait pas lire n'est PAS un 2
// =============================================================================

/**
 * Trouvé par la revue, et **antérieur à ce chantier**. Le helper qui lit
 * l'indice rend `null` quand il ne sait pas — mais ne pas appliquer la règle ne
 * laissait pas l'expression tranquille : on retombait sur `normalizeSqrt`, qui
 * lisait l'indice avec un **défaut silencieux à 2**.
 *
 * Mesuré, identique sur `main` et sur la première version de cette branche :
 *
 * | paire | verdict | valeur réelle |
 * | --- | --- | --- |
 * | `ⁿ√x² ≡ x` | `true` | `x^{2/n}` |
 * | `¹√x² ≡ x` | `true` | `x²` |
 * | `⁰√x² ≡ x` | `true` | indéfini |
 * | `^{−2}√x² ≡ x` | `true` | `1/x` |
 *
 * Quatre faux positifs, donc quatre réponses fausses comptées justes. Un indice
 * présent mais illisible rend maintenant le nœud **opaque** : on ne sait pas,
 * on ne conclut pas. `ⁿ√x` est une écriture de lycée, pas un cas tordu.
 */
describe('un indice illisible rend le nœud opaque', () => {
	it.each([
		['\\sqrt[n]{x}^{2}', 'x'],
		['\\sqrt[1]{x}^{2}', 'x'],
		['\\sqrt[0]{x}^{2}', 'x'],
		['\\sqrt[-2]{x}^{2}', 'x'],
		['\\sqrt[2.5]{x}^{2}', 'x'],
		['\\sqrt[n]{x}\\sqrt[n]{x}', 'x'],
		['\\sqrt[x]{x}^{2}', 'x']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});

	it('et reste réflexif', () => {
		for (const s of ['\\sqrt[n]{x}^{2}', '\\sqrt[0]{x}', '\\sqrt[-2]{x}^{2}']) {
			expect(eq(s, s)).toBe(true);
		}
	});
});

// =============================================================================
// Un radicande négatif d'indice impair : on refuse plutôt que de mentir
// =============================================================================

/**
 * `∛(−8)` vaut `−2` et `(∛−8)²` vaut `4`. Le moteur ne sait ni l'un ni l'autre.
 *
 * Ce qu'il faisait, mesuré : `∛(−8)` normalisait en `√(−8)` — l'indice perdu —
 * et `(∛−8)²` rendait `−8` sur `main`, puis `64` avec la première version de ce
 * correctif, le court-circuit numérique élevant une forme déjà corrompue. Deux
 * valeurs fausses, la seconde plus éloignée que la première.
 *
 * Désormais le nœud reste opaque. C'est un faux négatif — `(∛−8)² ≡ 4` rend
 * `false` — mais l'écran ne montre plus une valeur fausse à l'élève.
 */
describe('radicande négatif d’indice impair : opaque, pas faux', () => {
	it('ne se transforme plus en racine carrée', () => {
		expect(eq('\\sqrt[3]{-8}', '\\sqrt{-8}')).toBe(false);
	});

	it.each([
		['\\sqrt[3]{-8}^{2}', '64'],
		['\\sqrt[3]{-8}^{2}', '-8'],
		['\\sqrt[5]{-8}^{2}', '64'],
		['\\sqrt[3]{-x}^{2}', 'x^{2}'],
		['\\sqrt[3]{-x}^{2}', '-x']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});

	it('l’affichage ne montre plus de valeur fausse', () => {
		expect(toLatex(simplify(parseLatex('\\sqrt[3]{-8}^{2}')).result)).not.toBe('64');
		expect(toLatex(simplify(parseLatex('\\sqrt[3]{-8}^{2}')).result)).not.toBe('-8');
	});

	it('un radicande positif n’est pas touché', () => {
		expect(eq('\\sqrt[3]{8}^{2}', '4')).toBe(true);
		expect(eq('\\sqrt[3]{27}^{2}', '9')).toBe(true);
	});
});

// =============================================================================
// Une base somme doit être parenthésée à l'affichage
// =============================================================================

/**
 * Le générateur LaTeX ne parenthèse pas par priorité : il s'appuie sur la
 * présence d'un nœud délimiteur, que le parseur pose mais qu'une construction
 * interne peut ne pas poser.
 *
 * Mesuré, et **préexistant** : `superscript(addition(x, 1), 3/2)` se rendait
 * `x + 1^{3/2}`, qui se relit `x + (1^{3/2})`, soit `x + 1`. Trois snapshots
 * du module de dérivation l'enregistraient sur un chemin élève : la dérivée de
 * `1/(x+1)` s'affichait `−1/(x + 1²)`.
 *
 * Ce correctif-ci élargissait la surface du bug — deux sorties justes
 * devenaient fausses — d'où sa réparation ici plutôt qu'un contournement.
 */
describe('une base somme est parenthésée', () => {
	it.each([
		['\\sqrt[3]{x+1}^{2}', '\\left( x + 1 \\right)^{2/3}'],
		['\\sqrt[4]{x+1}^{6}', '\\left( x + 1 \\right)^{3/2}'],
		['\\sqrt{x+1}^{3}', '\\left( x + 1 \\right)^{3/2}']
	])('%s se rend %s', (entree, attendu) => {
		expect(toLatex(simplify(parseLatex(entree)).result)).toBe(attendu);
	});

	it('la dérivée d’un inverse ne montre plus une base nue', () => {
		const rendu = toLatex(simplify(parseLatex('\\frac{-1}{(x+1)^{2}}')).result);
		expect(rendu).toContain('\\left( x + 1 \\right)');
		expect(rendu).not.toContain('x + 1^');
	});

	it('et une base qui n’est pas une somme n’est pas parenthésée', () => {
		expect(toLatex(simplify(parseLatex('x^{2}')).result)).toBe('x^2');
		expect(toLatex(simplify(parseLatex('\\sqrt{x}^{3}')).result)).toBe('\\sqrt{x}^3');
	});
});
