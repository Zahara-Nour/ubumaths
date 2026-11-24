import { mkdir } from 'node:fs/promises';
import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test';
import { templateMarkdown } from '../../../src/lib/ubumark/index';
import { ADMIN, login, sql } from './carnet';

/**
 * Décor des tests de blocs à geste : un modèle brouillon (créé par l'API des modèles, en admin)
 * dont l'énoncé est joué dans l'aperçu `/dashboard/admin/questions/<id>/preview` (la carte de
 * l'élève : « Valider », remarque, correction). Effacé en `afterEach`, par identifiant.
 *
 * Usage : `const decor = brouillons('Verifs5', '.captures/verifs/mon-fichier');` en tête de spec.
 */

export interface Win {
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
}
export interface Spot {
	x: number;
	y: number;
}

export const isTouch = (): boolean => test.info().project.use.hasTouch === true;
export const projectName = (): string => test.info().project.name;

export function fence(name: string, ...lines: string[]): string {
	return ['```' + name, ...lines, '```'].join('\n');
}

export function brouillons(prefix: string, shotsDir: string) {
	let createdIds: string[] = [];
	test.afterEach(async () => {
		if (createdIds.length > 0) {
			await sql(`delete from question_templates where id = any($1::uuid[])`, [createdIds]);
		}
		createdIds = [];
	});

	/** Garde l'identifiant d'un modèle créé hors de `openPreview`, pour l'effacer après le test */
	const track = (id: string): void => {
		createdIds.push(id);
	};

	/** Un modèle brouillon (admin) dont l'énoncé est `statement` ; ouvre son aperçu */
	async function openPreview(
		page: Page,
		title: string,
		statement: string,
		extra: Record<string, unknown> = {},
		dejaConnecte = false
	): Promise<string> {
		if (!dejaConnecte) await login(page, ADMIN.email, ADMIN.password);
		const response = await page.request.post('/api/questions/templates', {
			data: {
				type: 'fill_in_blanks',
				title: `${prefix} ${projectName()} ${title}`,
				grades: ['T_SPE'],
				level: 2,
				status: 'draft',
				delay: 60,
				variations: [{ statement: templateMarkdown(statement), ...extra }]
			}
		});
		const body = (await response.json()) as { template?: { id: string } };
		expect(response.status(), JSON.stringify(body)).toBe(201);
		const id = body.template?.id ?? '';
		expect(id).not.toBe('');
		track(id);
		// Une navigation interrompue par la précédente (ERR_ABORTED) se rejoue
		for (let attempt = 0; attempt < 3; attempt++) {
			try {
				await page.goto(`/dashboard/admin/questions/${id}/preview`);
				break;
			} catch (error) {
				if (!String(error).includes('ERR_ABORTED') || attempt === 2) throw error;
				await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
			}
		}
		await page.waitForLoadState('networkidle');
		return id;
	}

	/**
	 * La figure de la carte jouée : l'aperçu la rend plusieurs fois (fiche du modèle, carte, face
	 * arrière). Avant « Valider », celle que `figureZone` a marquée ; après, la face avant de la
	 * carte de correction (la figure de l'élève, corrigée)
	 */
	const fig = (page: Page): Locator =>
		page.locator('[data-verifs="carte"], .correction-card-wrapper .flip-front .figure-a-completer');

	/** La zone de toucher d'une figure à compléter, amenée à l'écran */
	async function figureZone(page: Page): Promise<Locator> {
		const zone = page.getByTestId('zone-de-trace').first();
		await expect(zone).toBeVisible({ timeout: 30_000 });
		await zone.evaluate((el) =>
			el.closest('.figure-a-completer')?.setAttribute('data-verifs', 'carte')
		);
		await expect(fig(page)).toHaveCount(1);
		await zone.scrollIntoViewIfNeeded();
		return zone;
	}

	/** Un toucher (doigt) ou un clic (souris) à (x ; y) de la fenêtre de la figure */
	async function tapFigure(zone: Locator, win: Win, x: number, y: number): Promise<void> {
		const box = await zone.boundingBox();
		if (!box) throw new Error('zone de toucher sans boîte');
		const position = {
			x: ((x - win.xMin) / (win.xMax - win.xMin)) * box.width,
			y: ((win.yMax - y) / (win.yMax - win.yMin)) * box.height
		};
		if (isTouch()) await zone.tap({ position });
		else await zone.click({ position });
	}

	async function tapSeries(zone: Locator, win: Win, spots: Array<[number, number]>): Promise<void> {
		for (const [x, y] of spots) await tapFigure(zone, win, x, y);
	}

	async function validate(page: Page): Promise<void> {
		const button = page.getByRole('button', { name: 'Valider' });
		await button.scrollIntoViewIfNeeded();
		await expect(button).toBeEnabled();
		await button.click();
	}

	/** Le texte de l'aperçu (la carte de la question et sa remarque), espaces réduits */
	async function previewText(page: Page): Promise<string> {
		return ((await page.locator('#contenu-principal').innerText()) ?? '').replace(/\s+/g, ' ');
	}

	/** Capture la question en clair puis en sombre : `<nom>-clair|sombre-<projet>.png` */
	async function shootThemes(page: Page, target: Locator, name: string): Promise<void> {
		await mkdir(shotsDir, { recursive: true });
		for (const theme of ['light', 'dark'] as const) {
			await page.emulateMedia({ colorScheme: theme });
			await page.waitForFunction(
				(dark) => document.documentElement.classList.contains('dark') === dark,
				theme === 'dark'
			);
			await target.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => undefined);
			await page.screenshot({
				path: `${shotsDir}/${name}-${theme === 'dark' ? 'sombre' : 'clair'}-${projectName()}.png`
			});
		}
		await page.emulateMedia({ colorScheme: 'light' });
	}

	return {
		track,
		openPreview,
		fig,
		figureZone,
		tapFigure,
		tapSeries,
		validate,
		previewText,
		shootThemes
	};
}

/** Des doigts au protocole de Chromium (copie de `atelier-tactile`) : Android seulement */
export class Fingers {
	private session: CDPSession | null = null;

	constructor(private readonly page: Page) {}

	private async send(type: 'touchStart' | 'touchMove' | 'touchEnd', spots: Spot[]): Promise<void> {
		this.session ??= await this.page.context().newCDPSession(this.page);
		await this.session.send('Input.dispatchTouchEvent', {
			type,
			touchPoints: spots.map((spot, id) => ({ x: spot.x, y: spot.y, id }))
		});
	}

	/** Le doigt part de `from` et va de `delta`, en 8 pas */
	async drag(from: Spot, delta: Spot): Promise<void> {
		await this.send('touchStart', [from]);
		for (let step = 1; step <= 8; step++) {
			await this.send('touchMove', [
				{ x: from.x + (delta.x * step) / 8, y: from.y + (delta.y * step) / 8 }
			]);
		}
		await this.send('touchEnd', []);
	}
}
