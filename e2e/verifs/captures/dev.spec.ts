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

// ============================================================================
// /dev/carte-question : cases « figure »
// ============================================================================

/** Fenêtres des deux questions de la page (`fenetre:` du bloc) */
const CARRE = { width: 12, height: 8 };
const ALIGNES = { width: 10, height: 6 };

/** L'en-tête collant masquerait le haut des captures cadrées sur un élément */
async function sansEntete(page: Page): Promise<void> {
	await page.addStyleTag({ content: 'header { position: static !important; }' });
}

/** Ouvre la carte question et choisit la question dont l'intitulé est donné */
async function openCard(page: Page, label: string): Promise<void> {
	await page.goto('/dev/carte-question');
	await sansEntete(page);
	// Le clic peut précéder l'hydratation : on le rejoue tant que la liste ne s'ouvre pas
	await expect(async () => {
		await page.getByRole('button', { name: /^Question :/ }).click();
		await expect(page.getByRole('option', { name: label })).toBeVisible({ timeout: 1500 });
	}).toPass({ timeout: 20000 });
	await page.getByRole('option', { name: label }).click();
	await expect(zone(page)).toBeVisible();
}

function zone(page: Page): Locator {
	return page.getByTestId('zone-de-trace');
}

/** La carte « Component Preview » : ce que les captures cadrent */
function preview(page: Page): Locator {
	return page.locator('[data-slot="card"]').filter({ hasText: 'Component Preview' });
}

type Window = { width: number; height: number };

/** Un toucher à la souris, en unités de la figure (l'origine en bas à gauche) */
async function tap(page: Page, win: Window, x: number, y: number): Promise<void> {
	const box = await zone(page).boundingBox();
	if (box === null) throw new Error('zone de tracé invisible');
	// `click` fait défiler jusqu'à la zone (la carte est sous le pli)
	await zone(page).click({
		position: { x: (x / win.width) * box.width, y: ((win.height - y) / win.height) * box.height }
	});
}

/** Des segments, chacun par deux touchers */
async function draw(
	page: Page,
	win: Window,
	...segments: [number, number, number, number][]
): Promise<void> {
	for (const [x1, y1, x2, y2] of segments) {
		await tap(page, win, x1, y1);
		await tap(page, win, x2, y2);
	}
}

/** La figure de la face avant : la face arrière (correction) en rend une copie */
function front(page: Page): Locator {
	return page.locator('.figure-a-completer').first();
}

function valider(page: Page): Locator {
	return page.getByRole('button', { name: 'Valider' });
}

test('#1793 — Terminer un carré (CP-060) sur quadrillage', async ({ page }) => {
	const line: Line = {
		pr: '#1793',
		title: 'Terminer un carré, case « figure » sur quadrillage',
		look: 'Chaque toucher va au nœud le plus proche ; les 3 côtés au-dessus ou au-dessous → « Bravo », traits verts ; un côté en deux morceaux → juste ; rectangle au lieu de carré → « Ce n’est pas un carré… » + bonne figure en pointillés du côté tracé ; trait séparé dans l’alignement d’un côté → « Tu as tracé un trait de trop. » ; côté trop long → « Un de tes traits dépasse de la figure. » ; côté donné prolongé puis figure fermée (5 × 3) → « Le côté déjà tracé ne doit pas être prolongé… » ; Effacer = dernier segment ; au clavier (Tab) : curseur, flèches, Entrée ; au clic : pas de curseur. (La variation rectangle n’existe pas sur la page de dev.)'
	};
	const card = preview(page);
	const message = { timeout: 2000 };

	/** Repart d'une carte neuve */
	async function fresh(): Promise<void> {
		await openCard(page, 'Terminer un carré (CP-060)');
	}

	await test.step('3 côtés au-dessus, touchers approximatifs : traits verts', async () => {
		await fresh();
		// Chaque clic va au nœud le plus proche
		await draw(page, CARRE, [5.3, 3.8, 4.8, 7.2], [5.1, 6.9, 2.2, 7.1], [1.8, 7.2, 2.1, 4.3]);
		await expect(front(page).getByTestId('segment-eleve')).toHaveCount(3);
		await shootBothThemes(page, line, 'trois côtés tracés au-dessus', { target: card });
		await valider(page).click();
		await expect(front(page).locator('.droite-juste')).toHaveCount(3);
		await shootBothThemes(page, line, 'après Valider : traits verts', { target: card });
		// La ligne dit « Bravo » ; la carte affiche « Juste »
		await expect.soft(card, 'message « Bravo »').toContainText('Bravo', message);
	});

	await test.step('3 côtés au-dessous', async () => {
		await fresh();
		await draw(page, CARRE, [5, 4, 5, 1], [5, 1, 2, 1], [2, 1, 2, 4]);
		await valider(page).click();
		await expect(front(page).locator('.droite-juste')).toHaveCount(3);
		await shootBothThemes(page, line, 'trois côtés au-dessous', { target: card });
		await expect.soft(card, 'message « Bravo »').toContainText('Bravo', message);
	});

	await test.step('un côté en deux morceaux : juste', async () => {
		await fresh();
		await draw(page, CARRE, [5, 4, 5, 5], [5, 5, 5, 7], [5, 7, 2, 7], [2, 7, 2, 4]);
		await valider(page).click();
		await expect(front(page).locator('.droite-juste')).toHaveCount(4);
		await shootBothThemes(page, line, 'un côté en deux morceaux', { target: card });
		await expect.soft(card).toContainText('Juste', message);
	});

	await test.step('rectangle : pas un carré, bonne figure en pointillés', async () => {
		await fresh();
		await draw(page, CARRE, [5, 4, 5, 6], [5, 6, 2, 6], [2, 6, 2, 4]);
		await valider(page).click();
		await expect(front(page).getByTestId('bon-segment')).toHaveCount(3);
		await shootBothThemes(page, line, 'rectangle : bonne figure en pointillés', { target: card });
		await expect.soft(card).toContainText('Ce n’est pas un carré', message);
	});

	await test.step('un trait séparé dans l’alignement d’un côté', async () => {
		await fresh();
		await draw(page, CARRE, [5, 4, 5, 7], [5, 7, 2, 7], [2, 7, 2, 4], [8, 4, 10, 4]);
		await valider(page).click();
		await expect(card).toContainText('Tentative 1');
		await shootBothThemes(page, line, 'trait de trop', { target: card });
		await expect.soft(card).toContainText('Tu as tracé un trait de trop.', message);
	});

	await test.step('un côté trop long', async () => {
		await fresh();
		await draw(page, CARRE, [5, 4, 5, 7], [5, 7, 2, 7], [2, 7, 2, 2]);
		await valider(page).click();
		await expect(card).toContainText('Tentative 1');
		await shootBothThemes(page, line, 'côté trop long', { target: card });
		await expect.soft(card).toContainText('Un de tes traits dépasse de la figure.', message);
	});

	await test.step('le côté donné prolongé, figure fermée (5 × 3)', async () => {
		await fresh();
		await draw(page, CARRE, [2, 4, 7, 4], [7, 4, 7, 7], [7, 7, 2, 7], [2, 7, 2, 4]);
		await valider(page).click();
		await expect(card).toContainText('Tentative 1');
		await shootBothThemes(page, line, 'côté donné prolongé', { target: card });
		await expect.soft(card).toContainText('Le côté déjà tracé ne doit pas être prolongé', message);
	});

	await test.step('Effacer enlève le dernier segment', async () => {
		await fresh();
		await draw(page, CARRE, [5, 4, 5, 7], [5, 7, 2, 7]);
		await expect(front(page).getByTestId('segment-eleve')).toHaveCount(2);
		await shootBothThemes(page, line, 'avant Effacer : 2 segments', { target: card });
		await page.getByRole('button', { name: 'Effacer' }).click();
		await expect(front(page).getByTestId('segment-eleve')).toHaveCount(1);
		await shootBothThemes(page, line, 'après Effacer : 1 segment', { target: card });
	});

	await test.step('clavier : Tab, curseur, flèches, Entrée', async () => {
		await fresh();
		// Tab depuis le champ qui précède la carte : un vrai focus clavier
		await page.locator('#max-attempts').focus();
		for (
			let i = 0;
			i < 12 && !(await zone(page).evaluate((el) => el === document.activeElement));
			i++
		) {
			await page.keyboard.press('Tab');
		}
		await expect(zone(page)).toBeFocused();
		await expect(front(page).getByTestId('curseur')).toBeVisible();
		await shootBothThemes(page, line, 'Tab : le curseur apparaît', { target: card });
		await page.keyboard.press('Enter');
		await page.keyboard.press('ArrowUp');
		await page.keyboard.press('ArrowUp');
		await page.keyboard.press('Enter');
		await expect(front(page).getByTestId('segment-eleve')).toHaveCount(1);
		await shootBothThemes(page, line, 'flèches puis Entrée : un segment', { target: card });
	});

	await test.step('souris : pas de curseur', async () => {
		await fresh();
		await tap(page, CARRE, 5, 4);
		await expect(front(page).getByTestId('depart')).toBeVisible();
		await expect(front(page).getByTestId('curseur')).toHaveCount(0);
		await shootBothThemes(page, line, 'au clic : départ posé, pas de curseur', { target: card });
	});
});

test('#1798 — Points alignés ? (CP-058), figure + oui / non', async ({ page }) => {
	const line: Line = {
		pr: '#1798',
		title: 'Points alignés, figure + oui / non',
		look: '« non » tapé sans droite → Valider grisé ; droite (AB) + « non » → « Bravo » ; droite (AC) → « Ta droite passe par A et C, pas par B. », sans « Blanc 1 » ni « Les blancs suivants » ; droite (AB) + « oui » → faux. (Copie corrigée d’une évaluation et temps écoulé : pas sur la page de dev.)'
	};
	const card = preview(page);
	const message = { timeout: 2000 };

	async function fresh(): Promise<void> {
		await openCard(page, 'Points alignés ? (CP-058)');
	}
	/** La case oui / non */
	function ouiNon(): Locator {
		return front(page).locator('xpath=ancestor::*[@data-slot="card"][1]').locator('input').first();
	}

	await test.step('« non » sans droite : Valider grisé', async () => {
		await fresh();
		await ouiNon().fill('non');
		await expect(valider(page)).toBeDisabled();
		await shootBothThemes(page, line, '« non » tapé, aucune droite : Valider grisé', {
			target: card
		});
	});

	await test.step('droite (AB) + « non »', async () => {
		await fresh();
		await draw(page, ALIGNES, [2, 3, 8, 5]);
		await ouiNon().fill('non');
		await valider(page).click();
		await expect(card).toContainText('Tentative 1');
		await shootBothThemes(page, line, 'droite (AB) + « non »', { target: card });
		await expect.soft(card, 'message « Bravo »').toContainText('Bravo', message);
	});

	await test.step('droite (AC)', async () => {
		await fresh();
		await draw(page, ALIGNES, [2, 3, 5, 4]);
		await ouiNon().fill('non');
		await valider(page).click();
		await expect(card).toContainText('Tentative 1');
		await shootBothThemes(page, line, 'droite (AC)', { target: card });
		await expect.soft(card).toContainText('Ta droite passe par A et C, pas par B.', message);
		await expect.soft(card).not.toContainText('Blanc 1', message);
		await expect.soft(card).not.toContainText('Les blancs suivants', message);
	});

	await test.step('droite (AB) + « oui » : faux', async () => {
		await fresh();
		await draw(page, ALIGNES, [2, 3, 8, 5]);
		await ouiNon().fill('oui');
		await valider(page).click();
		await expect(card).toContainText('Tentative 1');
		await shootBothThemes(page, line, 'droite (AB) + « oui » : faux', { target: card });
		await expect.soft(card).not.toContainText('Juste', message);
	});
});

// ============================================================================
// /dev/polices : jeu Chiphre Math
// ============================================================================

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
