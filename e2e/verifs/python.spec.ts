import { expect, test, type Page } from '@playwright/test';
import { calc, cardLocator, openAtelier } from './helpers/atelier';
import { nameColumn, openView, typeColumn } from './helpers/grille';

/**
 * Entre l'Atelier et Python (`/python`) — lignes de `docs/wip/verifications-manuelles.md`
 * ======================================================================================
 *
 * « Ouvrir dans Python » depuis une carte (#1697), « Ouvrir dans l'atelier »
 * depuis la sortie d'un programme (#1746) : chaque sens ouvre un NOUVEL onglet,
 * suivi ici comme une nouvelle page du même contexte. Un test par ligne, son
 * numéro de PR dans le titre. L'attendu est celui de la ligne : un test rouge
 * est un bug ou une ligne périmée, à signaler à David — jamais un attendu à
 * changer pour passer.
 */

/** Le texte de l'éditeur de code (CodeMirror), lignes jointes par des retours */
async function code(page: Page): Promise<string> {
	return page
		.locator('.cm-content')
		.first()
		.evaluate((content) =>
			[...content.querySelectorAll('.cm-line')].map((line) => line.textContent ?? '').join('\n')
		);
}

/** Remplace le code de l'éditeur */
async function writeCode(page: Page, text: string): Promise<void> {
	await page.getByRole('textbox', { name: 'Éditeur de code Python' }).click();
	await page.keyboard.press('ControlOrMeta+A');
	await page.keyboard.press('Backspace');
	await page.keyboard.insertText(text);
}

/** Exécute le programme et attend `expected` dans la sortie */
async function run(page: Page, expected: string): Promise<void> {
	await page.getByRole('button', { name: 'Exécuter (Ctrl+Entrée)' }).click();
	await expect(page.getByRole('region', { name: "Sortie d'exécution Python" })).toContainText(
		expected,
		{ timeout: 60_000 }
	);
}

/** Choisit une action d'une carte qui ouvre un nouvel onglet, et rend ce nouvel onglet */
async function openFromCard(page: Page, name: string, action: string): Promise<Page> {
	const opened = page.context().waitForEvent('page');
	await cardLocator(page, name)
		.getByRole('button', { name: `Options de ${name}`, exact: true })
		.click();
	await page.getByRole('menuitem', { name: action }).click();
	const tab = await opened;
	await tab.waitForLoadState();
	return tab;
}

/** « Ouvrir dans l'atelier » sous la sortie, puis ce choix : rend le nouvel onglet */
async function openInAtelier(page: Page, choice: string | RegExp): Promise<Page> {
	await page.getByRole('button', { name: 'Ouvrir dans l’atelier' }).click();
	const opened = page.context().waitForEvent('page');
	await page.getByRole('menuitem', { name: choice }).click();
	const tab = await opened;
	await tab.waitForLoadState();
	return tab;
}

test('#1697 — « Ouvrir dans Python » : valeur et fonction, suite, liste de mots, remplacer', async ({
	page
}) => {
	test.setTimeout(120_000);
	await openAtelier(page);
	await calc(page, 'a = 3');
	await calc(page, 'f(x) = a x^2');
	const python = await openFromCard(page, 'f', 'Ouvrir dans Python');
	await expect(python).toHaveURL(/\/python/);
	await expect.poll(() => code(python)).toMatch(/^a = 3 {2}# curseur/);
	expect(await code(python)).toContain('def f(x):\n    return a*x**2');
	// Exécuter, puis print(f(2)) → 12
	await python.getByRole('textbox', { name: 'Éditeur de code Python' }).click();
	await python.keyboard.press('ControlOrMeta+End');
	await python.keyboard.insertText('\nprint(f(2))');
	await run(python, '12');

	await python.close();

	// Une suite récurrente → boucle `for k in range(n)`
	await calc(page, 'u(n+1) = 0,5u(n) + 3');
	const sequence = cardLocator(page, 'u').getByRole('textbox', { name: /premier terme de u/ });
	await sequence.fill('2');
	await sequence.press('Enter');
	const loop = await openFromCard(page, 'u', 'Ouvrir dans Python');
	const replace = loop.getByRole('button', { name: /Remplacer/ });
	// Sans code rangé (écart Q1), pas de question ; si elle vient, on remplace
	await replace.click({ timeout: 3000 }).catch(() => undefined);
	await expect.poll(() => code(loop)).toContain('for k in range(n)');
	await loop.close();

	// Une liste de mots (une colonne de la grille, nommée) : le choix grisé, sa raison dite
	await openView(page, 'Données');
	await typeColumn(page, 'A1', ['rouge', 'vert', 'bleu']);
	await nameColumn(page, 'A', 'M');
	await cardLocator(page, 'M').getByRole('button', { name: 'Options de M', exact: true }).click();
	const words = page.getByRole('menuitem', { name: /Ouvrir dans Python/ });
	await expect(words).toHaveAttribute('aria-disabled', 'true');
	const reason = await words.getAttribute('aria-describedby');
	expect(reason).toBeTruthy();
	await expect(page.locator(`[id="${reason}"]`)).toHaveText(/.{15,}/);
	await page.keyboard.press('Escape');

	// Carte d'une liste : « Ouvrir dans Python » présent, 13 actions au plus
	await calc(page, 'L = 1 ; 2 ; 3');
	await cardLocator(page, 'L').getByRole('button', { name: 'Options de L', exact: true }).click();
	const menu = page.getByRole('menu');
	await expect(menu.getByRole('menuitem', { name: 'Ouvrir dans Python' })).toBeVisible();
	expect(await menu.getByRole('menuitem').count()).toBeLessThanOrEqual(13);
});

test('#1746 — Python → atelier : liste, effectifs, booléens refusés, lien déjà ouvert', async ({
	page
}) => {
	test.setTimeout(120_000);
	await page.goto('/python');
	await writeCode(
		page,
		[
			'import random',
			'L = [random.randint(1, 6) for _ in range(20)]',
			'lancers = [random.randint(1, 6) for _ in range(1000)]',
			'b = [True, False]',
			'print("fini")'
		].join('\n')
	);
	await run(page, 'fini');
	const playground = await code(page);

	// « L (20 valeurs) » → nouvel onglet, atelier éphémère avec la liste L ; « Garder dans mon
	// atelier » la garde
	const atelier = await openInAtelier(page, 'L (20 valeurs)');
	await expect(atelier).toHaveURL(/\/atelier\?depuis-python=/);
	await expect(cardLocator(atelier, 'L')).toContainText('(20 valeurs)');
	await expect(atelier.getByText('Tu regardes un atelier partagé.')).toBeVisible();
	await atelier.getByRole('button', { name: 'Garder dans mon atelier' }).click();
	await expect(atelier.getByText(/1 objet ajouté dans ton atelier/)).toBeVisible();
	// Recharger l'onglet → « déjà été ouverte… », ton atelier s'ouvre (L gardée)
	await atelier.reload();
	await expect(atelier.getByText(/a déjà été ouverte/)).toBeVisible();
	await expect(cardLocator(atelier, 'L')).toBeVisible();
	await atelier.close();

	// `lancers` : ses effectifs → deux colonnes titrées
	const counts = await openInAtelier(
		page,
		/^lancers : ses effectifs \(1000 valeurs, 6 différentes\)/
	);
	await openView(counts, 'Données');
	await expect(
		counts.getByRole('textbox', { name: 'Titre de la colonne A', exact: true })
	).toHaveValue('lancers (valeurs)');
	await expect(
		counts.getByRole('textbox', { name: 'Titre de la colonne B', exact: true })
	).toHaveValue('lancers (effectifs)');
	await counts.close();

	// `b = [True, False]` : grisée avec sa raison, lue au clavier (Tab, flèches)
	await page.getByRole('button', { name: 'Ouvrir dans l’atelier' }).focus();
	await page.keyboard.press('Enter');
	const booleans = page.getByRole('menuitem', { name: /^b\b/ });
	await expect(booleans).toHaveAttribute('aria-disabled', 'true');
	await expect(booleans).toContainText('contient des booléens');
	// Les flèches l'atteignent, grisée comprise (sa raison est sa description)
	await expect(async () => {
		await page.keyboard.press('ArrowDown');
		await expect(booleans).toBeFocused({ timeout: 500 });
	}).toPass();
	await expect(booleans).toHaveAttribute('aria-describedby', /.+/);
	await page.keyboard.press('Escape');

	// Le playground ne bouge pas
	expect(await code(page)).toBe(playground);
});

test('#1697 — Q1 : du code écrit dans /python, rouvert depuis l’atelier → « Remplacer ton code ? »', async ({
	page
}) => {
	// ROUGE (écart signalé à David) : sans compte, le code tapé n'est rangé qu'à Ctrl+S
	// (`bind:value` ne passe pas par `setCode`) ; le nouvel onglet ne voit pas de « code à
	// toi » et remplace sans rien demander
	test.setTimeout(120_000);
	await openAtelier(page);
	await calc(page, 'a = 3');
	await calc(page, 'f(x) = a x^2');
	const python = await openFromCard(page, 'f', 'Ouvrir dans Python');
	await expect.poll(() => code(python)).toContain('def f(x):');
	// Q1 : un code écrit dans /python, puis rouvert depuis l'atelier → « Remplacer ton code ? » ;
	// « Garder mon code » le laisse
	await writeCode(python, 'print(1)');
	const again = await openFromCard(page, 'f', 'Ouvrir dans Python');
	await expect(again.getByRole('dialog', { name: /Remplacer ton code/ })).toBeVisible();
	await again.getByRole('button', { name: 'Garder mon code' }).click();
	await expect.poll(() => code(again)).toBe('print(1)');
});
