import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Thèmes clair / sombre, taille des textes d'un dessin et contraste, partagés par
 * `blocs-divers.spec.ts` et les fichiers `*-paquet7`. Une mesure qui ne trouve rien à mesurer
 * (aucun texte, aucun trait) ÉCHOUE au lieu de rendre `Infinity`, qui passerait tout seul.
 */

/** Taille minimale d'un texte dans un dessin, en px à l'écran */
export const MIN_DRAWING_TEXT_PX = 12;
/** Contraste minimal d'un texte (WCAG AA, texte courant) */
export const MIN_CONTRAST = 4.5;

/** L'appli suit le thème du système : la classe `dark` de <html> le dit */
export async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
	const applied = () =>
		page.waitForFunction(
			(dark) => document.documentElement.classList.contains('dark') === dark,
			theme === 'dark',
			{ timeout: 5000 }
		);
	await page.emulateMedia({ colorScheme: theme });
	try {
		await applied();
	} catch {
		// WebKit oublie parfois d'annoncer le changement : on le rejoue par l'autre thème
		await page.emulateMedia({ colorScheme: theme === 'dark' ? 'light' : 'dark' });
		await page.emulateMedia({ colorScheme: theme });
		await applied();
	}
	// Les couleurs passent par des transitions CSS : mesurer et photographier une fois posées
	await page.evaluate(() =>
		Promise.race([
			Promise.all(
				document
					.getAnimations()
					.filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
					.map((a) => a.finished)
			),
			// WebKit laisse parfois une animation « en attente » sans fin : on ne l'attend pas plus d'une seconde
			new Promise((done) => setTimeout(done, 1000))
		])
	);
}

/** Le plus petit texte de ce dessin, à l'écran (taille de police × échelle du dessin), en px */
export async function smallestDrawingText(drawing: Locator): Promise<{ px: number; text: string }> {
	const result = await drawing.evaluate((root) => {
		let smallest = { px: Infinity, text: '' };
		for (const node of root.querySelectorAll('text')) {
			const text = (node.textContent ?? '').trim();
			if (text === '') continue;
			const scale = (node as SVGGraphicsElement).getScreenCTM()?.a ?? 1;
			const px = parseFloat(getComputedStyle(node).fontSize) * scale;
			if (px < smallest.px) smallest = { px, text };
		}
		return smallest;
	});
	expect(Number.isFinite(result.px), 'aucun texte mesuré dans le dessin').toBe(true);
	return result;
}

/**
 * Pire contraste des textes de ce lieu (texte contre le fond réel : on remonte aux
 * ancêtres en composant les fonds translucides sur le fond de la page)
 */
export async function worstContrast(
	area: Locator,
	strokeSelector?: string,
	backdropSelector?: string,
	ignoreSelector?: string
): Promise<{ ratio: number; text: string }> {
	const result = await area.evaluate(
		(root, [selector, backdrop, ignore]) => {
			type Rgba = [number, number, number, number];
			const parse = (css: string): Rgba => {
				const m = css.match(/rgba?\(([^)]+)\)/);
				if (m) {
					const p = m[1]
						.split(/[ ,/]+/)
						.filter(Boolean)
						.map(Number);
					return [p[0], p[1], p[2], p[3] ?? 1];
				}
				// color(srgb r g b / a) : rendu moderne des couleurs mélangées
				const c = css.match(/color\(srgb ([^)]+)\)/);
				if (c) {
					const p = c[1].split(/[ /]+/).filter(Boolean).map(Number);
					return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1];
				}
				return [0, 0, 0, 0];
			};
			const over = (top: Rgba, below: Rgba): Rgba => {
				const a = top[3] + below[3] * (1 - top[3]);
				if (a === 0) return [0, 0, 0, 0];
				const mix = (i: number) => (top[i] * top[3] + below[i] * below[3] * (1 - top[3])) / a;
				return [mix(0), mix(1), mix(2), a];
			};
			const luminance = ([r, g, b]: Rgba) => {
				const lin = (v: number) => {
					const s = v / 255;
					return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
				};
				return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
			};
			const backgroundOf = (el: Element): Rgba => {
				const chain: Rgba[] = [];
				for (let cur: Element | null = el; cur; cur = cur.parentElement) {
					chain.push(parse(getComputedStyle(cur).backgroundColor));
				}
				let result: Rgba = [255, 255, 255, 1];
				for (const layer of chain.reverse()) result = over(layer, result);
				return result;
			};
			let worst = { ratio: Infinity, text: '' };
			if (selector !== undefined) {
				// Traits (aiguilles…) : leur couleur de trait contre le fond
				for (const el of root.querySelectorAll(selector)) {
					const style = getComputedStyle(el);
					const fg = parse(style.stroke);
					// Fond d'un dessin : le remplissage de la pièce derrière (cadran…), sinon le fond de la page
					const behind = backdrop === undefined ? null : root.querySelector(backdrop);
					const bg = behind
						? over(parse(getComputedStyle(behind).fill), backgroundOf(behind))
						: backgroundOf(el);
					const l1 = luminance(over(fg, bg));
					const l2 = luminance(bg);
					const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
					if (ratio < worst.ratio) worst = { ratio, text: selector };
				}
				return worst;
			}
			const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
			for (let n = walker.nextNode(); n; n = walker.nextNode()) {
				const text = (n.textContent ?? '').trim();
				const el = n.parentElement;
				// Hors écran : titres de dessin (<title>), texte réservé aux lecteurs d'écran
				if (text === '' || !el || el.closest('title, desc, .sr-only')) continue;
				if (ignore !== undefined && el.closest(ignore)) continue;
				const style = getComputedStyle(el);
				if (style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
				const isSvg = el instanceof SVGElement;
				const fg = parse(isSvg ? style.fill : style.color);
				if (fg[3] === 0) continue;
				const bg = backgroundOf(el);
				const fgOnBg = over(fg, bg);
				const l1 = luminance(fgOnBg);
				const l2 = luminance(bg);
				const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
				if (ratio < worst.ratio) worst = { ratio, text };
			}
			return worst;
		},
		[strokeSelector, backdropSelector, ignoreSelector] as const
	);
	expect(Number.isFinite(result.ratio), 'aucun texte ni trait mesuré dans le lieu').toBe(true);
	return result;
}

/** Le contraste des textes (ou, avec `strokeSelector`, des traits : 3 au moins) tient dans les deux thèmes */
export async function expectContrastBothThemes(
	page: Page,
	area: Locator,
	label: string,
	strokeSelector?: string,
	backdropSelector?: string,
	ignoreSelector?: string
): Promise<void> {
	for (const theme of ['light', 'dark'] as const) {
		await setTheme(page, theme);
		const { ratio, text } = await worstContrast(
			area,
			strokeSelector,
			backdropSelector,
			ignoreSelector
		);
		const min = strokeSelector === undefined ? MIN_CONTRAST : 3;
		expect(ratio, `${label}, thème ${theme} : « ${text} »`).toBeGreaterThanOrEqual(min);
	}
	await setTheme(page, 'light');
}

/** Les textes d'un dessin font au moins 12 px à l'écran */
export async function expectReadableDrawing(drawing: Locator, label: string): Promise<void> {
	const { px, text } = await smallestDrawingText(drawing);
	expect(px, `${label} : plus petit texte « ${text} »`).toBeGreaterThanOrEqual(MIN_DRAWING_TEXT_PX);
}
