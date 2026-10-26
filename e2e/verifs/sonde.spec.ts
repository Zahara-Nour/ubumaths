import { test } from '@playwright/test';
import { calc, cardAction, cards, hasSteps, openAtelier, steps } from './helpers/atelier';
import { hintWhileTyping, openView, readCell, typeCell } from './helpers/grille';

/**
 * Sonde de la console de l'Atelier — pour ÉCRIRE un test, pas un test
 * =====================================================================
 *
 * Tape chaque ligne de `SONDE` (une commande par ligne) dans une même console
 * et imprime, en JSON, ce qu'elle affiche : le LaTeX, le texte, le refus, les
 * étapes de « Comment ? ». Sautée sans `SONDE`.
 *
 *   SONDE=$'.dériver x^2\n.limite 1/x en 0' VERIFS_PORT=5179 pnpm test:verifs sonde
 *
 * Une ligne `@Action carte` choisit une action du menu d'une carte
 * (`@Réciproque f`, `@Dériver f`) ; après chaque ligne, la sonde imprime aussi
 * les cartes affichées (`CARTES`).
 *
 * La grille (vue Données) : `#A1 =2/3` tape dans une case (et imprime le refus),
 * `?A1` lit la case (texte montré, barre, valeur exacte, note), `~A1 =RESTE(`
 * imprime l'aide sous la barre pendant la frappe, `!Données` ouvre une vue.
 *
 * ⚠️ Une seule page : une valeur posée (`a = 2`) vaut pour les lignes
 * suivantes, et une erreur de la page peut gâter la suite (`PAGEERROR`).
 * L'attendu d'un test vient de la ligne de `verifications-manuelles.md`,
 * jamais de la sonde : elle sert à repérer les écarts.
 */

const lines = (process.env.SONDE ?? '').split('\n').filter((line) => line.trim() !== '');

test('sonde', async ({ page }) => {
	test.skip(lines.length === 0, 'SONDE vide');
	test.setTimeout(600_000);
	page.on('pageerror', (error) => console.log('PAGEERROR', error.message.split('\n')[0]));
	await openAtelier(page);
	for (const input of lines) {
		const grid = /^([#?~!])(\S+) ?(.*)$/.exec(input);
		if (grid) {
			const [, sign, target, text] = grid;
			if (sign === '!') await openView(page, target as 'Graphe' | 'Géométrie' | 'Données');
			if (sign === '#')
				console.log('CASE', target, JSON.stringify(await typeCell(page, target, text)));
			if (sign === '?') console.log('LIRE', target, JSON.stringify(await readCell(page, target)));
			if (sign === '~')
				console.log('AIDE', JSON.stringify(await hintWhileTyping(page, target, text)));
			continue;
		}
		const action = /^@(\S+) (\S+)$/.exec(input);
		if (action) {
			await cardAction(page, action[2], action[1]);
			await page.waitForTimeout(500);
			console.log('CARTES', JSON.stringify(await cards(page)));
			continue;
		}
		const answer = await calc(page, input);
		const detail = (await hasSteps(answer))
			? await steps(answer).catch((error: Error) => `ÉCHEC ${error.message.split('\n')[0]}`)
			: '';
		console.log(
			JSON.stringify({
				input,
				latex: answer.latex,
				text: answer.text,
				refused: answer.refused,
				steps: detail
			})
		);
		console.log('CARTES', JSON.stringify(await cards(page)));
	}
});
