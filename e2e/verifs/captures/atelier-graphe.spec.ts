import { expect, test } from '@playwright/test';
import { calc, cardAction, cardLocator, openAtelier } from '../helpers/atelier';
import { shootBothThemes, type Line } from '../helpers/captures';
import { openView, setConsole } from '../helpers/grille';

/**
 * Captures de la vue Graphe de l'Atelier — lignes « à l'œil »
 * ===========================================================
 *
 * Chaque test pose ce que décrit sa ligne de `verifications-manuelles.md`,
 * puis capture le graphe en clair et en sombre. Ce qui se vérifie par une
 * assertion l'est déjà dans `e2e/verifs/` ; ici, seulement ce qui se regarde.
 */

test.beforeEach(async ({ page }) => {
	await openAtelier(page);
});

/** Ouvre le Graphe, console fermée (elle le couvre) */
async function showGraph(page: import('@playwright/test').Page): Promise<void> {
	await openView(page, 'Graphe');
	await setConsole(page, false);
	await expect(page.locator('.graph-container').first()).toBeVisible();
}

test('#1315 — creux et plein, intérieur du creux en sombre', async ({ page }) => {
	const line: Line = {
		pr: '#1315',
		title: 'Bornes pleines et creuses',
		look: 'f(x) = x+1 sur ]0;5] : le creux en (0 ; 1), le plein en (5 ; 6) ; en thème SOMBRE, l’intérieur du creux a la couleur du fond.'
	};
	await calc(page, 'f(x) = x+1 sur ]0;5]');
	await showGraph(page);
	await shootBothThemes(page, line, 'f(x) = x+1 sur ]0;5]');
	await shootBothThemes(page, line, 'le creux, de près', {
		around: page.locator('circle.endpoint-open')
	});
});

test('#1328 — Réciproque de sqrt(x+2) : demi-parabole symétrique', async ({ page }) => {
	const line: Line = {
		pr: '#1328',
		title: 'Réciproque d’une racine',
		look: 'f(x) = sqrt(x+2), bouton « Réciproque » : f⁻¹ tracée en demi-parabole, symétrique de f par rapport à y = x ; dans Calcul, les 3 étapes.'
	};
	await calc(page, 'f(x) = sqrt(x+2)');
	await cardAction(page, 'f', 'Réciproque');
	await expect(cardLocator(page, 'f⁻¹')).toBeVisible();
	await shootBothThemes(page, line, 'cartes et étapes (Calcul)');
	await showGraph(page);
	await shootBothThemes(page, line, 'graphe');
});

test('#1338 — Réciproque de e^(x/2) − 1 : droite y = x grise', async ({ page }) => {
	const line: Line = {
		pr: '#1338',
		title: 'Droite y = x de la réciproque',
		look: 'f(x) = e^(x/2) − 1, Réciproque, onglet Graphe : la droite y = x est GRISE, entre f et f⁻¹.'
	};
	await calc(page, 'f(x) = e^(x/2) - 1');
	await cardAction(page, 'f', 'Réciproque');
	await expect(cardLocator(page, 'f⁻¹')).toBeVisible();
	await showGraph(page);
	await shootBothThemes(page, line, 'graphe');
});
