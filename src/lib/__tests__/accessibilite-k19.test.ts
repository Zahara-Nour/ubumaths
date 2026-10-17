/**
 * K19 — accessibilité, décisions D16, D17 et D18 (tranchées par David le 2026-10-12).
 *
 * - D16 : l'anneau de focus du thème clair (`--color-ring`) atteint 3:1 sur les fonds
 *   de page (WCAG 1.4.11, contraste des composants d'interface).
 * - D17 : le texte secondaire du thème clair (`--color-muted-foreground`) atteint 4,5:1
 *   sur les fonds composés `bg-muted/40` et `bg-muted/60` (WCAG 1.4.3).
 * - D18 : un lien d'évitement « Aller au contenu » est le premier élément focusable du
 *   layout racine, hors de l'écran sauf au focus, et mène au contenu principal (WCAG 2.4.1).
 *
 * Lecture du code : rendre le layout racine demanderait de simuler Supabase, l'en-tête
 * et la barre latérale (même choix que src/routes/__tests__/accueil-pied-de-page.test.ts).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// =============================================================================
// Outils
// =============================================================================

const css = readFileSync(join(process.cwd(), 'src', 'app.css'), 'utf8');
const rootLayout = readFileSync(join(process.cwd(), 'src', 'routes', '+layout.svelte'), 'utf8');
const dashboardLayout = readFileSync(
	join(process.cwd(), 'src', 'routes', '(protected)', 'dashboard', '+layout.svelte'),
	'utf8'
);

/** Luminance relative WCAG d'une couleur `#rrggbb` */
function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5]
		.map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
		.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/** Couleur `fg` posée avec l'opacité `alpha` sur le fond opaque `bg` */
function composite(fg: string, bg: string, alpha: number): string {
	const channel = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
	return (
		'#' +
		[1, 3, 5]
			.map((i) => Math.round(alpha * channel(fg, i) + (1 - alpha) * channel(bg, i)))
			.map((v) => v.toString(16).padStart(2, '0'))
			.join('')
	);
}

/** Valeur claire de `--<nom>: light-dark(#clair, #sombre)` dans app.css */
function lightValue(name: string): string {
	const match = css.match(
		new RegExp(`--${name}:\\s*light-dark\\(\\s*(#[0-9a-fA-F]{6})\\s*,\\s*(#[0-9a-fA-F]{6})\\s*\\)`)
	);
	if (!match) throw new Error(`--${name} absent de app.css ou hors de la forme light-dark(#…, #…)`);
	return match[1];
}

// =============================================================================
// D16 — anneau de focus
// =============================================================================

describe('D16 — --color-ring en thème clair', () => {
	const ring = lightValue('color-ring');

	it.each([
		['blanc (#ffffff)', '#ffffff'],
		['fond de page (--color-background)', lightValue('color-background')],
		['carte (--color-card)', lightValue('color-card')]
	])('atteint 3:1 sur %s', (_label, bg) => {
		expect(contrast(ring, bg)).toBeGreaterThanOrEqual(3);
	});

	it('garde une teinte orangée (rouge > vert > bleu)', () => {
		const [r, g, b] = [1, 3, 5].map((i) => parseInt(ring.slice(i, i + 2), 16));
		expect(r).toBeGreaterThan(g);
		expect(g).toBeGreaterThan(b);
	});
});

// =============================================================================
// D17 — texte secondaire
// =============================================================================

describe('D17 — --color-muted-foreground en thème clair', () => {
	const text = lightValue('color-muted-foreground');
	const muted = lightValue('color-muted');
	const background = lightValue('color-background');
	const card = lightValue('color-card');

	it.each([
		['bg-muted/40 sur le fond de page', composite(muted, background, 0.4)],
		['bg-muted/60 sur le fond de page', composite(muted, background, 0.6)],
		['bg-muted/40 sur une carte', composite(muted, card, 0.4)],
		['bg-muted/60 sur une carte', composite(muted, card, 0.6)],
		['bg-muted plein', muted]
	])('atteint 4,5:1 sur %s', (_label, bg) => {
		expect(contrast(text, bg)).toBeGreaterThanOrEqual(4.5);
	});
});

// =============================================================================
// D18 — lien d'évitement
// =============================================================================

describe('D18 — lien d’évitement « Aller au contenu »', () => {
	// Le balisage commence après </svelte:head>
	const markup = rootLayout.slice(rootLayout.indexOf('</svelte:head>'));
	const skipLink = markup.match(/<a\b[^>]*href="#([\w-]+)"[^>]*>\s*Aller au contenu\s*<\/a\s*>/);

	it('existe dans le layout racine et pointe vers une ancre', () => {
		expect(skipLink).not.toBeNull();
	});

	it('est le premier élément focusable du balisage', () => {
		const before = markup.slice(0, skipLink?.index ?? 0);
		// Ni lien, ni bouton, ni champ, ni composant (ils peuvent en contenir) avant lui
		expect(before).not.toMatch(/<(a|button|input|textarea|select)\b/);
		expect(before).not.toMatch(/<[A-Z]\w*/);
	});

	it('est hors de l’écran hors focus, et y revient au focus', () => {
		// Caché par translation : choisi quand app.css redéfinissait `.sr-only` hors couche,
		// ce qui annulait `focus:not-sr-only` (doublon retiré depuis, écart V29)
		expect(skipLink?.[0]).toMatch(/\bfixed\b/);
		expect(skipLink?.[0]).toMatch(/-translate-y-\[200%\]/);
		expect(skipLink?.[0]).toMatch(/focus:translate-y-0/);
		expect(skipLink?.[0]).not.toMatch(/\bsr-only\b/);
	});

	it('mène à un <main> du layout racine, focusable par programme', () => {
		const id = skipLink?.[1];
		expect(id).toBeTruthy();
		const main = rootLayout.match(/<main\s[^>]*>/)?.[0] ?? '';
		expect(main).toContain(id);
		expect(main).toMatch(/tabindex="-1"/);
	});

	it('mène, sur le tableau de bord, au <main> du tableau de bord (après son en-tête)', () => {
		const id = skipLink?.[1] ?? '';
		const main = dashboardLayout.match(/<main\s[^>]*>/)?.[0] ?? '';
		expect(main).toContain(`id="${id}"`);
		expect(main).toMatch(/tabindex="-1"/);
		// Un seul porteur de l'ancre à la fois : le <main> racine la cède au tableau de bord
		const rootMain = rootLayout.match(/<main\s[^>]*>/)?.[0] ?? '';
		expect(rootMain).toMatch(/isDashboardRoute \? undefined/);
	});
});
