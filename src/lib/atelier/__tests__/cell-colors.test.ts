/**
 * Les couleurs de la mise en forme (Q-MF-3) : lisibles en clair comme en sombre.
 *
 * Toutes les paires texte / fond d'une case sont mesurées (WCAG 2, au moins 4,5),
 * dans la zone sélectionnée aussi : les mélanges sont refaits ici comme le fait
 * `color-mix(in srgb, …)`, à partir des vraies valeurs de `src/app.css`.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '$lib/theme/author-color';
import { THEME_COLORS, type ThemeColor } from '../cell-format';
import {
	DARK_FILL_BASE,
	FILL_SHARE,
	SELECTION_SHARE,
	TEXT_SHARE,
	fillColorCss,
	textColorCss
} from '../cell-colors';

type Mode = 'light' | 'dark';

const css = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');
const dataView = readFileSync(
	resolve(process.cwd(), 'src/lib/components/atelier/DataView.svelte'),
	'utf8'
);

/** Les deux valeurs d'un jeton `light-dark(#clair, #sombre)` de app.css. */
function token(name: string): Record<Mode, string> {
	const match = css.match(
		new RegExp(`--${name}:\\s*light-dark\\(\\s*(#[0-9a-fA-F]{6})\\s*,\\s*(#[0-9a-fA-F]{6})\\s*\\)`)
	);
	if (!match) throw new Error(`--${name} absent de app.css`);
	return { light: match[1].toLowerCase(), dark: match[2].toLowerCase() };
}

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** `color-mix(in srgb, a share%, b)` */
function mix(a: string, b: string, share: number): string {
	const [x, y] = [channels(a), channels(b)];
	return (
		'#' +
		x
			.map((v, i) =>
				Math.round((v * share + y[i] * (100 - share)) / 100)
					.toString(16)
					.padStart(2, '0')
			)
			.join('')
	);
}

const card = token('color-card');
const foreground = token('color-foreground');
const primary = token('color-primary');
const fig = (color: ThemeColor) => token(`color-fig-${color}`);

function fillOf(color: ThemeColor | null, mode: Mode): string {
	if (color === null) return card[mode];
	return mix(fig(color)[mode], mode === 'light' ? card.light : DARK_FILL_BASE, FILL_SHARE);
}

function textOf(color: ThemeColor | null, mode: Mode): string {
	if (color === null) return foreground[mode];
	return mix(fig(color)[mode], foreground[mode], TEXT_SHARE[mode]);
}

describe('les couleurs des cases', () => {
	it('chaque texte se lit sur chaque fond, sélectionné ou non, en clair comme en sombre', () => {
		const colors = [null, ...THEME_COLORS];
		const failing: string[] = [];
		for (const mode of ['light', 'dark'] as const) {
			for (const fill of colors) {
				for (const selected of [false, true]) {
					const plain = fillOf(fill, mode);
					const background = selected ? mix(primary[mode], plain, SELECTION_SHARE) : plain;
					for (const text of colors) {
						const ratio = contrastRatio(textOf(text, mode), background);
						if (ratio < 4.5) {
							failing.push(
								`${text ?? 'texte'} sur ${fill ?? 'carte'}${selected ? ' sélectionnée' : ''} (${mode}) : ${ratio.toFixed(2)}`
							);
						}
					}
				}
			}
		}
		expect(failing).toEqual([]);
	});

	it('le CSS des cases suit les réglages mesurés', () => {
		expect(textColorCss('rouge')).toBe(
			'light-dark(color-mix(in srgb, var(--color-fig-rouge) 80%, var(--color-foreground)), color-mix(in srgb, var(--color-fig-rouge) 55%, var(--color-foreground)))'
		);
		expect(fillColorCss('jaune')).toBe(
			'color-mix(in srgb, var(--color-fig-jaune) 14%, light-dark(var(--color-card), #1f1f1f))'
		);
		// La teinte de la sélection mesurée ici est bien celle de la grille
		expect(dataView).toContain(
			`color-mix(in srgb, var(--color-primary) ${SELECTION_SHARE}%, var(--fond, var(--color-card)))`
		);
	});
});
