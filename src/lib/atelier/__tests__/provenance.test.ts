/**
 * La syntaxe d'entrée suit la provenance — décision D10, §6 bis.
 *
 * Chaque `it` porte le numéro du cas de la spécification
 * (`docs/wip/atelier-recherche-eleve-phase0.md`).
 */

import { describe, it, expect } from 'vitest';
import { readingMode, parseDefinition, referencesOf, normalizePasted } from '../parse';

describe('readingMode', () => {
	it('lit en LaTeX tout ce qui sort d’un champ de maths', () => {
		expect(readingMode('mathfield')).toBe('latex');
		expect(readingMode('keyboard')).toBe('latex');
		expect(readingMode('storage')).toBe('latex');
	});

	it('détecte pour tout ce qui vient d’ailleurs', () => {
		expect(readingMode('url')).toBe('detect');
		expect(readingMode('command')).toBe('detect');
		expect(readingMode('paste')).toBe('detect');
	});
});

describe('lecture selon la provenance', () => {
	// N1 — un champ de maths produit du LaTeX, et le LaTeX se lit
	it('lit une fraction LaTeX venue d’un champ de maths', () => {
		expect(parseDefinition('function', '\\frac{1}{2}', 'mathfield').error).toBeUndefined();
	});

	// N2 — la même chose depuis une URL : la détection reconnaît le LaTeX
	it('lit une fraction LaTeX venue d’une URL', () => {
		expect(parseDefinition('function', '\\frac{1}{2}', 'url').error).toBeUndefined();
	});

	// N3 — le cas du prof qui écrit son lien à la main, sans échappement
	it('lit `sin(x)` écrit à la main dans une URL', () => {
		expect(parseDefinition('function', 'sin(x)', 'url').error).toBeUndefined();
		expect(referencesOf('sin(x)', 'url')).toEqual([]);
	});

	// ⚠️ Le revers assumé : dire « mathfield » c'est garantir du LaTeX. Si on
	// ment sur la provenance, `sin` redevient un produit de trois lettres.
	it('lit `sin(x)` comme un produit si on annonce un champ de maths', () => {
		// `i` et `n` sont réservés, donc seul `s` reste candidat.
		expect(
			referencesOf('sin(x)', 'mathfield')
				.map((r) => r.name)
				.sort()
		).toEqual(['s']);
	});

	// Repli sur ambiguïté : custom pour une entrée texte
	it('lit `a/b` comme une fraction quand il vient d’une URL', () => {
		expect(
			referencesOf('a/b', 'url')
				.map((r) => r.name)
				.sort()
		).toEqual(['a', 'b']);
		expect(parseDefinition('function', 'a/b', 'url').error).toBeUndefined();
	});

	it('accepte les deux écritures d’une racine selon la provenance', () => {
		expect(parseDefinition('function', 'sqrt(x)', 'url').error).toBeUndefined();
		expect(parseDefinition('function', '\\sqrt{x}', 'mathfield').error).toBeUndefined();
	});

	// Le mélange : la détection bascule en LaTeX, donc `sin` se perd. On fige le
	// fait plutôt que de le masquer — c'est ce que la normalisation au collage
	// évite en amont.
	it('documente que le mélange bascule en LaTeX', () => {
		const refs = referencesOf('sin(x) + \\frac{1}{2}', 'url').map((r) => r.name);
		expect(refs).toContain('s');
	});
});

describe('normalisation au collage', () => {
	// N1 — ce qui est collé est relu puis réécrit en LaTeX
	it('réécrit `sin(x)` en commande LaTeX', () => {
		expect(normalizePasted('sin(x)')).toContain('\\sin');
	});

	it('réécrit `sqrt(x)` en commande LaTeX', () => {
		expect(normalizePasted('sqrt(x)')).toContain('\\sqrt');
	});

	// N2 — du LaTeX collé reste lisible
	it('laisse une fraction LaTeX lisible', () => {
		expect(normalizePasted('\\frac{1}{2}')).toContain('frac');
	});

	// ⚠️ DIVERGENCE avec le §6 bis L2, qui annonce « l'objet passera en erreur ».
	// Il n'y passe pas : une phrase est une multiplication implicite de lettres
	// parfaitement analysable. Coller « bonjour tout le monde » donnerait un
	// objet « en attente de b, o, j, u, r, t, l, m, d » — absurde, mais pas une
	// erreur. Le fait est figé ici en attendant l'arbitrage de David.
	it('lit une phrase comme un produit de lettres, sans erreur', () => {
		const out = normalizePasted('bonjour tout le monde');
		expect(out).not.toBe('bonjour tout le monde');
		expect(out).toContain('o');
	});

	// ⚠️ Les deux parseurs tournent en mode tolérant : `!!! ??? %%%` devient
	// `\lnot \lnot \lnot \placeholder…`. Le repli « rendu tel quel » n'est donc
	// atteint qu'en cas d'échec franc, ce qui est rare. Toute garde qui compte
	// sur « le parseur échouera » est illusoire — voir le rapport à David.
	it('produit quelque chose même pour une suite de symboles', () => {
		expect(normalizePasted('!!! ??? %%%')).not.toBe('');
	});

	// E1 — collage vide
	it('rend une chaîne vide inchangée', () => {
		expect(normalizePasted('')).toBe('');
	});
});
