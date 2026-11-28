import { expect, test, type Locator, type Page } from '@playwright/test';
import { shootBothThemes, type Line } from '../helpers/captures';
import { storageStatePath } from '../helpers/comptes';

/**
 * Captures des pages de dev (`/dev/…`, réservées à l'admin) — lignes « à l'œil »
 * ===============================================================================
 *
 * Chaque test pose ce que décrit sa ligne de `verifications-manuelles.md`, puis
 * capture en clair et en sombre. Quand la ligne annonce un message précis, un
 * `expect` le tranche aussi : s'il échoue, la ligne est périmée ou le code a un
 * bug, c'est à David de trancher (on ne change pas l'attendu).
 */

test.use({ storageState: storageStatePath('admin') });

// Les lignes #1793 et #1798 (`/dev/carte-question`, cases « figure ») ont été
// vérifiées par David sur tablette le 2026-11-09 et sont sorties de la liste :
// leurs captures sont retirées.

/** L'en-tête collant masquerait le haut des captures cadrées sur un élément */
async function sansEntete(page: Page): Promise<void> {
	await page.addStyleTag({ content: 'header { position: static !important; }' });
}

/** Formules des lignes #1312 / #1322 : fraction, racines, `\mathbf`, `\text`, `\textbf` */
const POLICES_LATEX = [
	String.raw`x=\frac{-b+\sqrt{b^2-4ac}}{2a}\quad\sqrt{2}\quad\sqrt[3]{x}\quad\frac{1}{1+\frac{1}{x}}`,
	String.raw`\mathbf{P}(A)=\frac{1}{2}\quad\mathbf{P}\ne P`,
	String.raw`\text{aire du carré}=c^2\quad\textbf{en gras}\quad\text{si }x\in\mathbb{R}`
];

/** Pose, en haut de la page, un bloc de formules en lecture seule : la page n'a ni `\mathbf` ni `\text` */
async function poserFormules(page: Page): Promise<Locator> {
	await page.evaluate((formulas) => {
		document.getElementById('verifs-polices')?.remove();
		const bloc = document.createElement('div');
		bloc.id = 'verifs-polices';
		bloc.style.cssText = 'padding: 12px; background: var(--color-card, white);';
		for (const latex of formulas) {
			const field = document.createElement('math-field') as HTMLElement & { value: string };
			field.setAttribute('read-only', '');
			field.style.cssText =
				'display: block; border: none; background: transparent; font-size: 1.5rem;';
			field.value = latex;
			bloc.appendChild(field);
		}
		document.querySelector('main')?.prepend(bloc);
	}, POLICES_LATEX);
	const bloc = page.locator('#verifs-polices');
	await expect(bloc.locator('math-field')).toHaveCount(POLICES_LATEX.length);
	// Le temps que MathLive compose les formules avec les polices du jeu actif
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(800);
	return bloc;
}

function galerie(page: Page, label: string): Locator {
	return page.locator('div.rounded-lg.border.bg-muted').filter({ hasText: label }).first();
}

test('#1312/#1322 — Chiphre Math : trait des lettres, racines, gras, manuscrit ; retour à KaTeX', async ({
	page
}) => {
	const line: Line = {
		pr: '#1312, #1322',
		title: 'Jeu Chiphre Math et retour à KaTeX',
		look: 'Jeu Chiphre Math : fractions et racines au trait des lettres, bouts arrondis ; la racine dépasse un peu et se referme par un petit trait, sans dépasser par le haut ; \\mathbf{P} gras redessiné ; \\text{…} et \\textbf{…} en écriture manuscrite. Retour au jeu KaTeX : tout redevient comme avant.'
	};
	await page.goto('/dev/polices');
	await sansEntete(page);
	await expect(page.getByText('Police active:')).toContainText('Chiphre Math');
	await expect(page.locator('math-field').first()).toBeVisible();

	await test.step('jeu Chiphre Math', async () => {
		const bloc = await poserFormules(page);
		await shootBothThemes(page, line, 'Chiphre Math : fractions, racines, \\mathbf, \\text', {
			target: bloc
		});
		// À la taille d'écran, les bouts arrondis et le petit trait de la racine ne se
		// voient pas : la première formule grossie (racine, fraction, racine cubique)
		const first = bloc.locator('math-field').first();
		await first.evaluate((field) => (field.style.zoom = '4'));
		await page.waitForTimeout(300);
		await shootBothThemes(page, line, 'Chiphre Math : racines et fractions grossies', {
			target: first
		});
		await first.evaluate((field) => (field.style.zoom = ''));
		await shootBothThemes(page, line, 'Chiphre Math : galerie, équation quadratique', {
			target: galerie(page, 'Équation quadratique')
		});
		await shootBothThemes(page, line, 'Chiphre Math : galerie, racines', {
			target: galerie(page, 'Racines')
		});
		await shootBothThemes(page, line, 'Chiphre Math : galerie, fractions complexes', {
			target: galerie(page, 'Fractions complexes')
		});
	});

	await test.step('retour au jeu KaTeX', async () => {
		await page.getByRole('button', { name: 'KaTeX Standard' }).click();
		await expect(page.getByText('Police active:')).toContainText('KaTeX (standard)');
		await expect(page.getByRole('button', { name: 'KaTeX Standard' })).toBeEnabled();
		await page.locator('#verifs-polices').evaluate((el) => el.remove());
		const bloc = await poserFormules(page);
		await shootBothThemes(page, line, 'KaTeX : mêmes formules', { target: bloc });
		await shootBothThemes(page, line, 'KaTeX : galerie, équation quadratique', {
			target: galerie(page, 'Équation quadratique')
		});
		await shootBothThemes(page, line, 'KaTeX : galerie, racines', {
			target: galerie(page, 'Racines')
		});
		await shootBothThemes(page, line, 'KaTeX : galerie, fractions complexes', {
			target: galerie(page, 'Fractions complexes')
		});
	});
});

// ============================================================================
// /dev/structure : exposant d'une parenthèse
// ============================================================================

test('#1346 — exposant 2 à la même hauteur après (−½ + x) et (x − ½)', async ({ page }) => {
	const line: Line = {
		pr: '#1346',
		title: 'Exposant d’une parenthèse',
		look: 'Taper (-\\frac{1}{2}+x)^2 puis (x-\\frac{1}{2})^2 : l’exposant 2 à la même hauteur (en haut de la parenthèse) dans les deux ; idem \\left|-\\frac12+x\\right|^2. Survoler la parenthèse de (x+1)^2 : le cadre entoure (x + 1) sans le 2.'
	};
	await page.goto('/dev/structure');
	await sansEntete(page);
	const champ = page.locator('.structure-field').first();
	const scene = champ.locator('[data-field-stage]');
	await expect(scene).toBeVisible();

	/** Écrit dans le champ : un clic ouvre la saisie, Entrée garde la formule */
	async function saisir(latex: string): Promise<void> {
		await expect(async () => {
			await scene.click();
			await expect(champ.locator('math-field.field-editor')).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 15000 });
		await champ.locator('math-field.field-editor').evaluate((el, value) => {
			(el as HTMLElement & { value: string }).value = value;
		}, latex);
		await champ.locator('math-field.field-editor').focus();
		await page.keyboard.press('Enter');
		await expect(champ.locator('math-field.field-editor')).toBeHidden();
		// Le temps que la formule soit recomposée et mesurée
		await page.waitForTimeout(800);
	}

	for (const [caption, latex] of [
		['(-1/2 + x)^2', String.raw`(-\frac{1}{2}+x)^2`],
		['(x - 1/2)^2', String.raw`(x-\frac{1}{2})^2`],
		['\\left|-1/2 + x\\right|^2', String.raw`\left|-\frac12+x\right|^2`],
		['(x + 1)^2, survolee', String.raw`(x+1)^2`]
	]) {
		await test.step(caption, async () => {
			await saisir(latex);
			if (caption.includes('survolee')) {
				// Le pointeur sur la parenthèse ouvrante
				const box = await scene.locator('.ML__latex').first().boundingBox();
				if (box === null) throw new Error('formule invisible');
				await page.mouse.move(box.x + 4, box.y + box.height / 2);
				await page.waitForTimeout(400);
			}
			await shootBothThemes(page, line, caption, { around: scene });
		});
	}
});
