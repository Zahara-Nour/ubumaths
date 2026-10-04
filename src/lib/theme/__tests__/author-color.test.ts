/**
 * Couleur écrite par un auteur dans un bloc (droite graduée, cercle trigo, figure) :
 * résolution écran / PDF, avertissements (L3-a : inconnue ; D2 : hex peu lisible en sombre).
 *
 * Spécification : docs/wip/couleurs-lot3-progress.md.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	DARK_BACKGROUNDS,
	MIN_DARK_CONTRAST,
	contrastRatio,
	darkContrastWarning,
	deltaEOk,
	hexToOklab,
	nearestNamedColor,
	resolveAuthorColor
} from '../author-color';

const css = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');

function readDark(name: string): string {
	const match = css.match(
		new RegExp(`--${name}:\\s*light-dark\\(\\s*#[0-9a-fA-F]{6}\\s*,\\s*(#[0-9a-fA-F]{6})\\s*\\)`)
	);
	if (!match) throw new Error(`--${name} absent de app.css`);
	return match[1].toLowerCase();
}

describe('fonds sombres de référence', () => {
	it('sont les vraies valeurs sombres de la page et des cartes dans app.css', () => {
		expect(DARK_BACKGROUNDS).toEqual([readDark('color-background'), readDark('color-card')]);
	});
});

describe('contrastRatio (WCAG)', () => {
	it('vaut 21 entre noir et blanc, 1 entre une couleur et elle-même', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
		expect(contrastRatio('#2563eb', '#2563eb')).toBeCloseTo(1, 5);
	});

	it('valeur de référence intermédiaire : #777777 sur blanc ≈ 4,48', () => {
		expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
	});

	it('accepte les formes courtes et ignore l’alpha (le contraste porte sur la couleur opaque)', () => {
		expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 5);
		expect(contrastRatio('#000000ff', '#ffff')).toBeCloseTo(21, 5);
	});
});

describe('OKLab', () => {
	it('valeur de référence : #ff0000 ≈ (0,628 ; 0,225 ; 0,126)', () => {
		const [l, a, b] = hexToOklab('#ff0000');
		expect(l).toBeCloseTo(0.628, 3);
		expect(a).toBeCloseTo(0.225, 3);
		expect(b).toBeCloseTo(0.126, 3);
	});
});

describe('deltaEOk', () => {
	it('est nul pour deux couleurs identiques, symétrique, et ordonne les distances', () => {
		expect(deltaEOk('#2563eb', '#2563eb')).toBe(0);
		expect(deltaEOk('#ff0000', '#00ff00')).toBeCloseTo(deltaEOk('#00ff00', '#ff0000'), 10);
		expect(deltaEOk('#ff0000', '#ee1111')).toBeLessThan(deltaEOk('#ff0000', '#0000ff'));
	});
});

describe('nearestNamedColor', () => {
	it('propose le nom de palette le plus proche', () => {
		expect(nearestNamedColor('#000080')).toBe('bleu');
		expect(nearestNamedColor('#cc0000')).toBe('rouge');
		// Rouge très sombre : plus proche du marron de la palette, perceptuellement
		expect(nearestNamedColor('#8b0000')).toBe('marron');
		expect(nearestNamedColor('#006400')).toBe('vert');
	});

	it('propose « noir » pour un gris sombre (qui suit le texte, lisible partout)', () => {
		expect(nearestNamedColor('#1a1a1a')).toBe('noir');
		expect(nearestNamedColor('#333333')).toBe('noir');
	});
});

describe('darkContrastWarning (D2)', () => {
	it('avertit pour #1a1a1a et #000080, avec une suggestion', () => {
		const black = darkContrastWarning('#1a1a1a');
		expect(black).toMatch(/#1a1a1a/);
		expect(black).toMatch(/« noir »/);
		const navy = darkContrastWarning('#000080');
		expect(navy).toMatch(/#000080/);
		expect(navy).toMatch(/« bleu »/);
	});

	it('se tait pour un hex lisible sur les deux fonds sombres', () => {
		expect(darkContrastWarning('#ff9900')).toBeNull();
		expect(darkContrastWarning('#5d93fe')).toBeNull();
	});

	it('avertit pour un hex trop transparent, même de teinte lisible', () => {
		const w = darkContrastWarning('#ffffff10');
		expect(w).toMatch(/trop transparente/);
		expect(w).toMatch(/opacité 6 %/);
		expect(darkContrastWarning('#ff990080')).toBeNull(); // 50 % : admis
		expect(darkContrastWarning('#f907')).toMatch(/trop transparente/);
	});

	it('mesure le pire des deux fonds sombres', () => {
		for (const hex of ['#1a1a1a', '#000080']) {
			const worst = Math.min(...DARK_BACKGROUNDS.map((bg) => contrastRatio(hex, bg)));
			expect(worst).toBeLessThan(MIN_DARK_CONTRAST);
		}
	});
});

describe('resolveAuthorColor', () => {
	it('résout les noms français et anglais : variable du thème à l’écran, clair au PDF', () => {
		for (const raw of ['bleu', 'blue', ' Bleu ']) {
			const c = resolveAuthorColor(raw, 'rouge');
			expect(c.screen).toBe('var(--color-fig-bleu)');
			expect(c.print).toBe('#2563eb');
			expect(c.warning).toBeNull();
		}
		expect(resolveAuthorColor('green', 'bleu').print).toBe('#018639');
		expect(resolveAuthorColor('noir', 'bleu').screen).toBe('var(--color-foreground)');
		expect(resolveAuthorColor('noir', 'bleu').print).toBe('#000000');
	});

	it('sans couleur : le défaut, sans avertissement', () => {
		const c = resolveAuthorColor(undefined, 'rouge');
		expect(c).toEqual({ screen: 'var(--color-fig-rouge)', print: '#dc2626', warning: null });
		expect(resolveAuthorColor('  ', 'rouge').warning).toBeNull();
	});

	it('couleur inconnue (L3-a) : le défaut et un avertissement, sans exception', () => {
		const c = resolveAuthorColor('magenta', 'bleu');
		expect(c.screen).toBe('var(--color-fig-bleu)');
		expect(c.print).toBe('#2563eb');
		expect(c.warning).toMatch(/couleur inconnue « magenta »/);
		expect(c.warning).toMatch(/bleu/);
	});

	it('valeur hostile : jamais dans le style ni dans le PDF', () => {
		const c = resolveAuthorColor('red; background:url(https://evil.example/x)', 'bleu');
		expect(c.screen).toBe('var(--color-fig-bleu)');
		expect(c.print).toBe('#2563eb');
		expect(c.screen).not.toMatch(/url|;/);
		expect(c.warning).toMatch(/couleur inconnue/);
		const quote = resolveAuthorColor('#fff")+eval("', 'bleu');
		expect(quote.print).toBe('#2563eb');
	});

	it('hex lisible : tel quel dans les deux modes, sans avertissement (D2a)', () => {
		expect(resolveAuthorColor('#ff9900', 'bleu')).toEqual({
			screen: '#ff9900',
			print: '#ff9900',
			warning: null
		});
	});

	it('hex trop sombre : gardé tel quel, avec un avertissement et une suggestion (D2)', () => {
		const c = resolveAuthorColor('#000080', 'rouge');
		expect(c.screen).toBe('#000080');
		expect(c.print).toBe('#000080');
		expect(c.warning).toMatch(/« bleu »/);
	});
});
