import { mkdirSync, writeFileSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';

/**
 * Captures pour la page à cocher (`pnpm verifs:captures-page`)
 * =============================================================
 *
 * Une capture = une image JPEG + une fiche JSON dans `.captures/`. La fiche
 * reprend la ligne de `verifications-manuelles.md` (son n° de PR) et dit quoi
 * regarder : la page à cocher regroupe les captures par ligne.
 */

export const CAPTURES_DIR = '.captures';

export type Theme = 'clair' | 'sombre';

/** La ligne de la liste que la capture sert à cocher */
export interface Line {
	/** Le n° de PR de la ligne (`#1315`), ou son nom quand elle n'en a pas */
	pr: string;
	/** Le titre court de la fiche */
	title: string;
	/** Ce que David doit voir sur les captures, repris de la ligne */
	look: string;
}

/** Une capture, telle que la page à cocher la lit */
export interface Shot {
	pr: string;
	title: string;
	look: string;
	/** Ce que montre cette capture (« après Réciproque ») */
	caption: string;
	theme: Theme;
	/** Largeur de la fenêtre, en px (390 = téléphone) */
	width: number;
	/** Nom du fichier image, dans `CAPTURES_DIR` */
	file: string;
	/** Ordre des captures d'une même ligne */
	order: number;
}

// ============================================================================
// FUNCTIONS
// ============================================================================

function slug(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase();
}

/** Thème de la page : l'appli suit celui du système (ModeWatcher) */
export async function setTheme(page: Page, theme: Theme): Promise<void> {
	await page.emulateMedia({ colorScheme: theme === 'sombre' ? 'dark' : 'light' });
	// Le temps que les couleurs (transitions CSS) se posent
	await page.waitForTimeout(300);
}

/** Marge autour d'un détail (`around`), en px */
const AROUND_MARGIN = 40;

/** La zone d'un détail, avec sa marge : un point de 8 px devient une vignette lisible */
async function zoneAround(
	detail: Locator
): Promise<{ x: number; y: number; width: number; height: number }> {
	const box = await detail.boundingBox();
	if (box === null) throw new Error('détail à capturer invisible');
	const x = Math.max(0, box.x - AROUND_MARGIN);
	const y = Math.max(0, box.y - AROUND_MARGIN);
	return { x, y, width: box.width + 2 * AROUND_MARGIN, height: box.height + 2 * AROUND_MARGIN };
}

/**
 * Capture la page, un élément (`target`) ou la zone autour d'un détail
 * (`around`) dans le thème en cours. `order` range les
 * captures d'une ligne : celles d'un même test se suivent dans l'ordre d'appel.
 */
export async function shoot(
	page: Page,
	line: Line,
	caption: string,
	options: { target?: Locator; around?: Locator; theme?: Theme; order?: number } = {}
): Promise<void> {
	const theme = options.theme ?? 'clair';
	const width = page.viewportSize()?.width ?? 0;
	const order = options.order ?? nextOrder(line);
	const file = `${slug(line.pr)}--${String(order).padStart(2, '0')}-${slug(caption)}-${theme}-${width}.jpg`;
	mkdirSync(CAPTURES_DIR, { recursive: true });
	const screenshot = { path: `${CAPTURES_DIR}/${file}`, type: 'jpeg', quality: 80 } as const;
	if (options.target) await options.target.screenshot(screenshot);
	else if (options.around)
		await page.screenshot({ ...screenshot, clip: await zoneAround(options.around) });
	else await page.screenshot(screenshot);
	const shot: Shot = { ...line, caption, theme, width, file, order };
	writeFileSync(
		`${CAPTURES_DIR}/${file.replace(/\.jpg$/, '.json')}`,
		JSON.stringify(shot, null, 2)
	);
}

/** Capture en clair puis en sombre, et revient au clair */
export async function shootBothThemes(
	page: Page,
	line: Line,
	caption: string,
	options: { target?: Locator; around?: Locator } = {}
): Promise<void> {
	const order = nextOrder(line);
	for (const theme of ['clair', 'sombre'] satisfies Theme[]) {
		await setTheme(page, theme);
		await shoot(page, line, caption, { ...options, theme, order });
	}
	await setTheme(page, 'clair');
}

const orders = new Map<string, number>();

/** Rang suivant des captures de cette ligne, dans ce worker */
function nextOrder(line: Line): number {
	const order = (orders.get(line.pr) ?? 0) + 1;
	orders.set(line.pr, order);
	return order;
}
