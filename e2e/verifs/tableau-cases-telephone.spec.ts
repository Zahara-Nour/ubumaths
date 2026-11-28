import { expect, test, type Page } from '@playwright/test';
import { brouillons, isTouch } from './helpers/modele-brouillon';

/**
 * Tableau à cases lisible sur téléphone (outil n° 57 de `docs/wip/outils-manquants.md`,
 * chantier `docs/wip/tableau-cases-mobile-progress.md`)
 * =====================================================================================
 *
 * Un tableau markdown dont des cellules sont des cases `$?$` : au téléphone, le tableau
 * 2 × 2 avec en-têtes (trois colonnes) tient dans la largeur de son cadre, sans défiler.
 * Comme dans le tableau de variations : sur écran tactile, pas de bouton clavier dans la
 * case (la toucher ouvre le clavier) ; à l'ordinateur, le bouton reste.
 */

const decor = brouillons('VerifsTableauCases', '.captures/verifs/tableau-cases-telephone');

/** « Développer avec un tableau » (3-013), valeurs fixées */
const DEVELOPPER = [
	'Complète le tableau de multiplication.',
	'',
	'| $\\times$ | $x$ | $9$ |',
	'|---|---|---|',
	'| $x$ | $?$ | $?$ |',
	'| $6$ | $?$ | $?$ |'
].join('\n');

async function openTable(page: Page, title: string) {
	await decor.openPreview(page, title, DEVELOPPER, {
		blanks: [
			{ expectedAnswer: 'x^2' },
			{ expectedAnswer: '9x' },
			{ expectedAnswer: '6x' },
			{ expectedAnswer: '54' }
		]
	});
	const table = page
		.locator('table')
		.filter({ has: page.locator('.table-blank-cell') })
		.filter({ visible: true })
		.first();
	await expect(table.locator('math-field')).toHaveCount(4, { timeout: 30_000 });
	await table.scrollIntoViewIfNeeded();
	return table;
}

test('#57 — tableau 2 × 2 à cases : au téléphone, il tient dans son cadre sans défiler ; bouton clavier seulement à l’ordinateur', async ({
	page
}) => {
	const table = await openTable(page, '57 developper');
	const frame = table.locator('xpath=..');
	const { scroll, visible } = await frame.evaluate((el) => ({
		scroll: el.scrollWidth,
		visible: el.clientWidth
	}));
	expect(scroll, `tableau de ${scroll} px dans un cadre de ${visible} px`).toBeLessThanOrEqual(
		visible
	);

	const toggle = await table
		.locator('math-field')
		.first()
		.evaluate((el) => {
			const part = el.shadowRoot?.querySelector('[part="virtual-keyboard-toggle"]');
			return part ? getComputedStyle(part).display : 'absent';
		});
	if (isTouch()) expect(toggle, 'pas de bouton clavier au doigt').toBe('none');
	else expect(toggle, 'bouton clavier à la souris').not.toBe('none');

	await page.screenshot({
		path: `.captures/verifs/tableau-cases-telephone/57-${test.info().project.name}.png`
	});
});

test('#57 — au doigt, sans bouton clavier : toucher une case du tableau ouvre le clavier, « Fermer le clavier » le referme', async ({
	page,
	isMobile
}) => {
	test.skip(!isMobile, 'téléphone seulement');
	const table = await openTable(page, '57 clavier');
	await table.locator('math-field').nth(1).tap();
	const visible = () =>
		page.evaluate(
			() =>
				(window as Window & { mathVirtualKeyboard?: { visible: boolean } }).mathVirtualKeyboard
					?.visible === true
		);
	await expect.poll(visible, { message: 'clavier ouvert au toucher' }).toBe(true);
	await page.screenshot({
		path: `.captures/verifs/tableau-cases-telephone/57-clavier-${test.info().project.name}.png`
	});
	const close = page.getByRole('button', { name: 'Fermer le clavier' });
	await expect(close).toBeVisible();
	await close.tap();
	await expect.poll(visible, { message: 'clavier refermé' }).toBe(false);
});
