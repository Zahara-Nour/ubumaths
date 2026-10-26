import { expect, test, type Page } from '@playwright/test';
import {
	calc,
	cardAction,
	cardLocator,
	chooseSetting,
	mathConsole,
	mathValue,
	openAtelier,
	steps,
	type Answer
} from '../helpers/atelier';
import { setTheme, shoot, shootBothThemes, type Line } from '../helpers/captures';
import {
	cellLocator,
	nameColumn,
	openView,
	selectCell,
	setConsole,
	typeCell,
	typeColumn
} from '../helpers/grille';

/**
 * Captures de l'Atelier (console, cartes, Données) — lignes « à l'œil »
 * =====================================================================
 *
 * Chaque test pose ce que décrit sa ligne de `verifications-manuelles.md` et
 * capture ce qu'il faut regarder, en clair et en sombre. Ce qui se vérifie par
 * une assertion l'est dans `e2e/verifs/` ; ici, seulement ce qui se regarde.
 */

const PHONE = { width: 390, height: 844 };

test.beforeEach(async ({ page }) => {
	await openAtelier(page);
});

/** Déplie « Comment ? » d'une réponse et la capture, étapes comprises */
async function shootSteps(page: Page, line: Line, answer: Answer, caption: string): Promise<void> {
	await steps(answer);
	await answer.line.scrollIntoViewIfNeeded();
	await shootBothThemes(page, line, caption, { target: answer.line });
}

test('#1634 — Propriétés d’un cercle : fractions, π et racines', async ({ page }) => {
	const line: Line = {
		pr: '#1634',
		title: 'Propriétés d’un cercle',
		look: 'Panneau « Propriétés » d’un cercle : rendu MathLive en fraction (périmètre 2π√3/3, aire π/3 ; rayon 2√5/3), rien d’écrit à plat.'
	};
	await calc(page, 'c : 3x^2+3y^2=1');
	await calc(page, 'w : 9x^2+9y^2=20');
	await setConsole(page, false);
	for (const name of ['c', 'w']) {
		await cardAction(page, name, 'Propriétés');
		const panel = page.locator('.proprietes');
		await expect(panel.getByRole('heading', { name: `Propriétés de ${name}` })).toBeVisible();
		await shootBothThemes(page, line, `cercle ${name}`, { target: panel });
		await panel.getByRole('button', { name: `Fermer les propriétés de ${name}` }).click();
	}
});

test('#1630 — Propriétés sur téléphone : le panneau sous la carte', async ({ page }) => {
	const line: Line = {
		pr: '#1630',
		title: 'Propriétés sur téléphone',
		look: 'Sur téléphone (390 px), « Mes objets » : « Propriétés » déplie le panneau SOUS la carte, lisible, sans déborder.'
	};
	await page.setViewportSize(PHONE);
	await page.reload();
	await calc(page, 'A = (0;1)');
	await calc(page, 'B = (1;3)');
	await calc(page, 's = [AB]');
	await setConsole(page, false);
	// Replié au téléphone (#1546) : on le déplie
	const panel = page.locator('aside.panneau');
	if ((await panel.getAttribute('class'))?.includes('replie')) {
		await panel.locator('button.replier').click();
	}
	await cardAction(page, 's', 'Propriétés');
	await expect(page.locator('.proprietes')).toBeVisible();
	await shootBothThemes(page, line, 'segment s');
});

test('#1617 — « Simplifier pour x ≠ −1 » : le « Comment ? » résumé', async ({ page }) => {
	const line: Line = {
		pr: '#1617',
		title: 'Simplifier une fraction',
		look: '.simplifier (x^2-1)/(x+1), bouton « Simplifier pour x ≠ −1 » : la version RÉSUMÉE du « Comment ? » est cohérente avec la réponse x − 1.'
	};
	const answer = await calc(page, '.simplifier (x^2-1)/(x+1)');
	await answer.line.getByRole('button', { name: 'Simplifier pour x ≠ −1' }).click();
	await expect(answer.line.getByRole('button', { name: 'Sans simplifier' })).toBeVisible();
	await steps(answer);
	const summary = answer.line.getByRole('button', { name: 'Résumé' });
	if ((await summary.count()) > 0) await summary.click();
	await shootBothThemes(page, line, 'résumé', { target: answer.line });
});

test('#1313, #1318 — « Comment ? » des intégrales', async ({ page }) => {
	const line: Line = {
		pr: '#1313, #1318',
		title: 'Étapes des intégrales',
		look: '« Comment ? » de .intégrer x^2 de 0 à 1 et de .intégrer xe^x (intégration par parties) : lisibles, formules bien rendues.'
	};
	await shootSteps(page, line, await calc(page, '.intégrer x^2 de 0 à 1'), 'x² de 0 à 1');
	await shootSteps(page, line, await calc(page, '.intégrer xe^x'), 'xeˣ (IPP)');
});

test('#1362, #1363 — phrases des limites', async ({ page }) => {
	const line: Line = {
		pr: '#1362, #1363',
		title: 'Phrases des limites',
		look: 'Phrases des limites lisibles, formules bien rendues : .limite ln(x) en 0, .limite sqrt(x) en -1, .limite sin(x) en +∞.'
	};
	for (const input of ['.limite ln(x) en 0', '.limite sqrt(x) en -1', '.limite sin(x) en +∞']) {
		const answer = await calc(page, input);
		await answer.line.scrollIntoViewIfNeeded();
		await shootBothThemes(page, line, input, { target: answer.line });
	}
});

test('#1364 — « Comment ? » de .évaluer', async ({ page }) => {
	const line: Line = {
		pr: '#1364',
		title: 'Étapes de .évaluer',
		look: 'Les formules du « Comment ? » de .évaluer 2a+3b en a=1,5 ; b=2 sont bien rendues.'
	};
	await shootSteps(page, line, await calc(page, '.évaluer 2a+3b en a=1,5 ; b=2'), 'évaluer');
});

test('#1385 — « Écriture mathématique » au clavier virtuel, sur téléphone', async ({ page }) => {
	const line: Line = {
		pr: '#1385',
		title: 'Clavier virtuel sur téléphone',
		look: 'Téléphone, « Écriture mathématique » : réponses de résoudre x^2=4, dériver x^3, 1/4+1/3, 5 km + 300 m lisibles ; la liste de propositions, champ en bas d’écran, s’ouvre AU-DESSUS ; le clavier virtuel d’une CARTE n’a pas l’onglet « Commandes ». Clair et sombre.'
	};
	await page.setViewportSize(PHONE);
	await page.reload();
	// La carte d'abord, en mode Texte : `calc` tape dans le champ texte
	await calc(page, 'f(x) = x^2');
	await chooseSetting(page, 'Écriture mathématique');
	const field = mathConsole(page);
	for (const keys of ['résoudre x^2=4', 'dériver x^3', '1/4+1/3', '5 km + 300 m']) {
		await typeMath(page, keys);
		await page.keyboard.press('Enter');
	}
	await expect(page.locator('ol.historique > li')).toHaveCount(5);
	await shootBothThemes(page, line, 'quatre réponses');
	// Les propositions : on commence une commande
	await typeMath(page, 'dé');
	await shootBothThemes(page, line, 'propositions pendant la frappe');
	await field.press('Escape');
	// Le clavier virtuel d'une carte : le bouton du champ MathLive
	await setConsole(page, false);
	const panel = page.locator('aside.panneau');
	if ((await panel.getAttribute('class'))?.includes('replie')) {
		await panel.locator('button.replier').click();
	}
	await cardLocator(page, 'f').locator('[part="virtual-keyboard-toggle"]').click();
	await expect(page.locator('.ML__keyboard')).toBeVisible();
	await shootBothThemes(page, line, 'clavier virtuel d’une carte');
});

/**
 * Tape au vrai clavier dans la console mathématique vide. MathLive perd parfois
 * la première frappe : on recommence tant que le champ reste vide.
 */
async function typeMath(page: Page, keys: string): Promise<void> {
	const field = mathConsole(page);
	await expect(async () => {
		await field.focus();
		await page.keyboard.type(keys.slice(0, 1));
		expect(await mathValue(field)).not.toBe('');
	}).toPass();
	await page.keyboard.type(keys.slice(1));
}

test('#1413 — note sous le « Diagramme avec effectifs »', async ({ page }) => {
	const line: Line = {
		pr: '#1413',
		title: 'Diagramme avec effectifs',
		look: '« Diagramme avec effectifs » (lignes incomplètes) : la note sous le diagramme dit ce qui a été écarté, lisible.'
	};
	await openView(page, 'Données');
	await typeColumn(page, 'A1', ['1', '2', '3']);
	await typeColumn(page, 'B1', ['4', '5']);
	await typeCell(page, 'B3', '');
	await nameColumn(page, 'A', 'L');
	await nameColumn(page, 'B', 'M');
	await cardLocator(page, 'L').getByRole('button', { name: 'Options de L' }).click();
	await page.getByRole('menuitem', { name: 'Avec une autre liste' }).click();
	await page.getByRole('menuitem', { name: 'Diagramme avec effectifs M' }).click();
	// Le diagramme se dessine dans la vue Données, sous la grille
	const chart = page.locator('section.diagramme[data-diagramme="L"]');
	await expect(chart.locator('p.note')).toBeVisible();
	await chart.scrollIntoViewIfNeeded();
	await shootBothThemes(page, line, 'diagramme et sa note', { target: chart });
});

test('#1415, #1416, #1418, #1419 — grapheur : tan dézoomé, étiquettes en fractions', async ({
	page
}) => {
	const line: Line = {
		pr: '#1415, #1416, #1418, #1419',
		title: 'Grapheur : tan',
		look: '/grapheur, tan(x) dézoomé à ±600 : plus de trait isolé ; sur ±10, les étiquettes x = π/2, x = 3π/2 (fractions) tiennent dans leur boîte.'
	};
	await page.goto('/grapheur');
	await calc(page, 'f(x) = \\tan(x)');
	await setConsole(page, false);
	const graph = page.locator('.graph-container').first();
	await expect(page.locator('.asymptote-lines path').first()).toBeAttached();
	await shootBothThemes(page, line, '±10, étiquettes', { target: graph });
	const zoomOut = page.getByRole('button', { name: 'Zoom arrière' });
	for (let click = 0; click < 10; click++) await zoomOut.click();
	await page.waitForTimeout(500);
	await shootBothThemes(page, line, '±600, plus de trait isolé', { target: graph });
});

test('#1424 — poignée de recopie : cases teintées pendant le geste', async ({ page }) => {
	const line: Line = {
		pr: '#1424',
		title: 'Poignée de recopie',
		look: 'Vue Données : tirer la poignée (coin bas-droit) de A2 vers A8 → les cases visées sont TEINTÉES pendant le geste (capture prise bouton enfoncé).'
	};
	await openView(page, 'Données');
	await typeCell(page, 'A1', '1');
	await typeCell(page, 'A2', '=A1*2');
	await selectCell(page, 'A2');
	const handle = cellLocator(page, 'A2').locator('.poignee');
	const from = await handle.boundingBox();
	const to = await cellLocator(page, 'A8').boundingBox();
	if (from === null || to === null) throw new Error('poignée ou case A8 invisible');
	await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
	await page.mouse.down();
	await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
	for (const theme of ['clair', 'sombre'] as const) {
		await setTheme(page, theme);
		await shoot(page, line, 'bouton enfoncé, sur A8', { theme, order: 1 });
	}
	await page.mouse.up();
	await setTheme(page, 'clair');
	await shoot(page, line, 'relâché', { order: 2 });
});

test('#1442 — téléphone : la vue Graphe utilisable', async ({ page }) => {
	const line: Line = {
		pr: '#1442',
		title: 'Graphe sur téléphone',
		look: 'Téléphone (390 px) : la vue Graphe est utilisable (courbe, boutons de zoom, rien de coupé ni de couvert).'
	};
	await page.setViewportSize(PHONE);
	await page.reload();
	await calc(page, 'f(x) = x^2 - 2');
	await openView(page, 'Graphe');
	await setConsole(page, false);
	await shootBothThemes(page, line, 'vue Graphe');
});

test('#1469 — Données : fond jaune et texte rouge, clair et sombre ; barre au téléphone', async ({
	page
}) => {
	const line: Line = {
		pr: '#1469',
		title: 'Couleurs des cases',
		look: 'Vue Données : fond JAUNE et texte ROUGE lisibles en clair ET en sombre, sélection comprise ; sur téléphone (390 px), la barre de mise en forme passe à la ligne.'
	};
	await openView(page, 'Données');
	await typeColumn(page, 'A1', ['12', '3,5', 'texte']);
	for (const address of ['A1', 'A2', 'A3']) {
		await selectCell(page, address);
		if (address !== 'A3') await chooseColor(page, 'Couleur du fond', 'Jaune');
		if (address !== 'A1') await chooseColor(page, 'Couleur du texte', 'Rouge');
	}
	await selectCell(page, 'B1');
	const grid = page.locator('.donnees').first();
	await shootBothThemes(page, line, 'A1 jaune, A2 jaune et rouge, A3 rouge', { target: grid });
	await selectCell(page, 'A2');
	await shootBothThemes(page, line, 'A2 sélectionnée', { target: grid });

	await page.setViewportSize(PHONE);
	await page.reload();
	await openView(page, 'Données');
	await setConsole(page, false);
	await shootBothThemes(page, line, 'téléphone : la barre');
});

/** Choisit une couleur dans un menu de la barre de mise en forme */
async function chooseColor(page: Page, menu: string, color: string): Promise<void> {
	await page.locator(`[aria-label^="${menu} :"]`).click();
	await page.getByRole('option', { name: color, exact: true }).click();
	await expect(page.locator(`[aria-label="${menu} : ${color.toLowerCase()}"]`)).toHaveCount(1);
}
