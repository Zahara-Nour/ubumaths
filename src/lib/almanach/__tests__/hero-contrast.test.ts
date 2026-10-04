/**
 * Lisibilité du hero de /almanach : le texte est posé sur le
 * halo du mois, lui-même posé sur la carte. On compose les couleurs réelles
 * (palettes validées, tokens d'app.css, opacités de la page) et on mesure le
 * contraste WCAG : ≥ 4,5:1 exigé pour les 7 mois × 2 thèmes.
 *
 * Le texte atténué (`--color-muted-foreground`) ne fait que 4,74:1 sur la carte
 * blanche nue : sous le moindre halo, il passe sous 4,5. Le hero n'emploie donc
 * que `--color-foreground` (vérifié par le test navigateur de la page), sur un voile.
 *
 * Modèle volontairement pessimiste : le halo est flouté et ses trois teintes se
 * recouvrent en partie ; on teste chaque teinte seule ET les trois empilées.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '$lib/theme/author-color';
import { MONTH_NAMES } from '../calendar';
import { HERO_HALO_OPACITY, HERO_VEIL_OPACITY, MONTH_PALETTES } from '../palettes';

type Rgb = [number, number, number];
type Mode = 'light' | 'dark';

const APP_CSS = readFileSync('src/app.css', 'utf8');

/** Valeur claire ou sombre d'un token `light-dark(#a, #b)` d'app.css */
function token(name: string, mode: Mode): Rgb {
	const m = new RegExp(`${name}:\\s*light-dark\\((#[0-9a-f]{6}),\\s*(#[0-9a-f]{6})\\)`, 'i').exec(
		APP_CSS
	);
	if (!m) throw new Error(`token ${name} introuvable dans app.css`);
	return hexToRgb(mode === 'light' ? m[1] : m[2]);
}

function hexToRgb(hex: string): Rgb {
	return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

function rgbToHex(c: Rgb): string {
	return `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function parseRgba(value: string): { rgb: Rgb; alpha: number } {
	const m = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(value);
	if (!m) throw new Error(`rgba attendu : ${value}`);
	return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], alpha: Number(m[4]) };
}

/** Composition « source over » d'une couleur d'opacité `alpha` sur un fond opaque */
function over(top: Rgb, alpha: number, bottom: Rgb): Rgb {
	return top.map((v, i) => v * alpha + bottom[i] * (1 - alpha)) as Rgb;
}

/** Fonds possibles sous le texte : carte + halo (chaque teinte, puis les trois) + voile */
function backgroundsUnderText(monthIndex: number, mode: Mode): Rgb[] {
	const card = token('--color-card', mode);
	const palette = MONTH_PALETTES[monthIndex][mode];
	const layers = [palette.h1, palette.h2, palette.h3].map(parseRgba);
	const veil = (c: Rgb): Rgb => over(card, HERO_VEIL_OPACITY, c);

	const singles = layers.map((l) => over(l.rgb, l.alpha * HERO_HALO_OPACITY, card));
	const stacked = layers.reduce((acc, l) => over(l.rgb, l.alpha * HERO_HALO_OPACITY, acc), card);
	return [...singles, stacked].map(veil);
}

const CASES = MONTH_NAMES.flatMap((name, i) =>
	(['light', 'dark'] as const).map((mode) => [name, mode, i] as const)
);

describe('hero de /almanach — contraste du texte sur le halo', () => {
	it.each(CASES)('%s (%s) : texte du hero ≥ 4,5:1', (_name, mode, monthIndex) => {
		const text = rgbToHex(token('--color-foreground', mode));
		const worst = Math.min(
			...backgroundsUnderText(monthIndex, mode).map((bg) => contrastRatio(text, rgbToHex(bg)))
		);
		expect(worst).toBeGreaterThanOrEqual(4.5);
	});
});
