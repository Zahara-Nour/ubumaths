import { test } from '@playwright/test';
import { calc, hasSteps, openAtelier, steps } from './helpers/atelier';

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
	}
});
