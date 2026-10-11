/**
 * Structure d'une expression — l'explorateur de la formule principale (lot 4)
 * Spécification : docs/wip/structure-expression-progress.md (Q10, B, C).
 *
 * - la lecture de l'expression entière, mots du dictionnaire en mots cliquables,
 *   un mot absent du dictionnaire en texte sans lien ;
 * - le sens inverse : survoler un mot de la lecture encadre sa sous-expression ;
 * - le message « 6e ou avant » masque encadré et lecture ; jamais pour un visiteur.
 */
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { stripMarkers, structureFromLatex } from '$lib/mathAST/structure';
import StructureExplorerHarness from './StructureExplorerHarness.svelte';
import StructureReadingHarness from './StructureReadingHarness.svelte';

// Le dictionnaire arrive de /api/dictionnaire (ADR 0022) : ici, le jeu de référence figé
vi.mock('$lib/dictionary/fetch-dictionary', async () => {
	const { REFERENCE_DICTIONARY: entries } = await import(
		'../../../../../tests/fixtures/lexique/dictionnaire-reference'
	);
	return { fetchDictionary: async () => entries };
});

beforeAll(async () => {
	// MathLive : import dynamique dans les tests client (docs/pratiques/tests.md § Pièges)
	await import('mathlive');
});

function lexiconButtons(container: HTMLElement): string[] {
	return [...container.querySelectorAll('button.lexicon-term')].map((b) => b.textContent ?? '');
}

function wholeReading(container: HTMLElement): HTMLElement | null {
	return container.querySelector('[data-reading="whole"]');
}

/** Identifiant de la sous-expression écrite `written` (LaTeX sans marqueurs ni espaces) */
function nodeIdOf(latex: string, written: string): number {
	const result = structureFromLatex(latex);
	if (result.status !== 'ok') throw new Error(`structure attendue pour ${latex}`);
	const node = result.structure.nodes.find(
		(n) => stripMarkers(n.latex).replace(/\s+/g, '') === written
	);
	if (!node) throw new Error(`pas de sous-expression ${written} dans ${latex}`);
	return node.id;
}

describe('lecture de l’expression entière (Q10)', () => {
	it('B1 : la lecture de 2+3y est affichée en permanence, sans survol', async () => {
		const { container } = await render(StructureExplorerHarness, {
			latex: '2+3y',
			readerGrade: null
		});
		expect(wholeReading(container)?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
			'la somme de 2 et du produit de 3 par y'
		);
	});

	it('les formules de la lecture sont rendues comme formules', async () => {
		const { container } = await render(StructureExplorerHarness, {
			latex: '2+3y',
			readerGrade: null
		});
		const formulas = [...(wholeReading(container)?.querySelectorAll('math-span') ?? [])];
		expect(formulas.map((f) => f.textContent)).toEqual(['2', '3', 'y']);
	});

	it('les mots du dictionnaire sont des mots cliquables, même pour un visiteur', async () => {
		const { container } = await render(StructureExplorerHarness, {
			latex: '2+3y',
			readerGrade: null
		});
		await expect.poll(() => lexiconButtons(container)).toEqual(['somme', 'produit']);
	});

	it('un mot absent du dictionnaire s’affiche sans lien, sans erreur', async () => {
		const { container } = await render(StructureExplorerHarness, {
			latex: String.raw`\sqrt[3]{x}`,
			readerGrade: '3'
		});
		// Le dictionnaire est chargé (un autre mot de la page est souligné) : l'absence prouve le refus
		const other = await render(StructureExplorerHarness, { latex: '2+3y', readerGrade: '3' });
		await expect.poll(() => lexiconButtons(other.container)).toContain('somme');
		expect(wholeReading(container)?.textContent).toContain('racine cubique');
		expect(lexiconButtons(container)).not.toContain('racine cubique');
	});

	it('un clic sur « somme » ouvre la fiche du dictionnaire au niveau de l’élève', async () => {
		await render(StructureExplorerHarness, { latex: '2+3y', readerGrade: '4' });
		await page.getByRole('button', { name: 'somme', exact: true }).click();
		await expect.element(page.getByRole('dialog', { name: 'somme' })).toBeInTheDocument();
		await expect.element(page.getByText(/Résultat d'une addition/)).toBeInTheDocument();
	});
});

describe('sens inverse : survoler la lecture encadre la sous-expression (Q10)', () => {
	it('survoler « produit » encadre 3y dans la formule', async () => {
		const { container } = await render(StructureExplorerHarness, {
			latex: '2+3y',
			readerGrade: null
		});
		const stage = container.querySelector<HTMLElement>('.structure-stage');
		expect(stage?.dataset.framedId).toBeUndefined();
		await expect.poll(() => lexiconButtons(container)).toContain('produit');
		await userEvent.hover(page.getByRole('button', { name: 'produit', exact: true }));
		await expect.poll(() => stage?.dataset.framedId).toBe(String(nodeIdOf('2+3y', '3y')));
		// L'encadré est dessiné, pas seulement calculé
		await expect.poll(() => container.querySelectorAll('.structure-frame').length).toBe(1);
	});

	it('survoler une formule de la lecture encadre sa sous-expression', async () => {
		const { container } = await render(StructureExplorerHarness, {
			latex: '2+3y',
			readerGrade: null
		});
		const stage = container.querySelector<HTMLElement>('.structure-stage');
		const y = [...(wholeReading(container)?.querySelectorAll('math-span') ?? [])].find(
			(f) => f.textContent === 'y'
		);
		if (!y) throw new Error('formule y absente de la lecture');
		await userEvent.hover(page.elementLocator(y));
		await expect.poll(() => stage?.dataset.framedId).toBe(String(nodeIdOf('2+3y', 'y')));
	});
});

describe('élève de 6e ou avant (section C)', () => {
	it('C1 : élève de 6e, 5−3+x → message ; encadré et lecture masqués', async () => {
		const { container } = await render(StructureExplorerHarness, {
			latex: '5-3+x',
			readerGrade: '6'
		});
		await expect.element(page.getByText(/Ajoute des parenthèses/)).toBeInTheDocument();
		expect(container.querySelector('.structure-stage')).toBeNull();
		expect(wholeReading(container)).toBeNull();
	});

	it('C2 : élève de CM2, −3+x → message avec son exemple en formule', async () => {
		const { container } = await render(StructureExplorerHarness, {
			latex: '-3+x',
			readerGrade: 'CM2'
		});
		await expect.element(page.getByText(/s'apprend en 5e/)).toBeInTheDocument();
		expect(container.querySelector('[data-advice] math-span')).not.toBeNull();
		expect(container.querySelector('.structure-stage')).toBeNull();
	});

	it('C3 : élève de 6e, 2+3+4 → pas de message, lecture visible', async () => {
		const { container } = await render(StructureExplorerHarness, {
			latex: '2+3+4',
			readerGrade: '6'
		});
		expect(container.querySelector('[data-advice]')).toBeNull();
		expect(wholeReading(container)).not.toBeNull();
	});

	it('C4 : visiteur ou élève de 5e, 5−3+x → jamais de message', async () => {
		for (const readerGrade of [null, '5']) {
			const { container } = await render(StructureExplorerHarness, {
				latex: '5-3+x',
				readerGrade
			});
			expect(container.querySelector('[data-advice]')).toBeNull();
			expect(container.querySelector('.structure-stage')).not.toBeNull();
			expect(wholeReading(container)?.textContent?.replace(/\s+/g, ' ')).toContain('la somme de 5');
		}
	});
});

describe('corpus : lecture courte sans lien (revue du lot 4)', () => {
	it('interactive={false} : ni mot cliquable, ni arrêt clavier', async () => {
		// Le dictionnaire est chargé (la lecture interactive souligne ses mots) : l'absence prouve le refus
		const linked = await render(StructureReadingHarness, { latex: '2+3y' });
		await expect.poll(() => lexiconButtons(linked.container)).toEqual(['somme', 'produit']);
		const plain = await render(StructureReadingHarness, { latex: '2+3y', interactive: false });
		expect(plain.container.textContent?.replace(/\s+/g, ' ').trim()).toBe(
			'la somme de 2 et du produit de 3 par y'
		);
		expect(lexiconButtons(plain.container)).toEqual([]);
		expect(plain.container.querySelectorAll('[tabindex]')).toHaveLength(0);
	});
});

describe('clavier sur la lecture principale (revue du lot 4)', () => {
	it('Tab atteint texte et formules, nommés par leur texte, et encadre leur sous-expression', async () => {
		const { container } = await render(StructureExplorerHarness, {
			latex: '2+3y',
			readerGrade: null
		});
		const stage = container.querySelector<HTMLElement>('.structure-stage');
		await expect.poll(() => lexiconButtons(container)).toContain('produit');
		const two = page.getByRole('button', { name: '2', exact: true });
		await expect.element(two).toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'par', exact: true }))
			.toBeInTheDocument();
		// Premier arrêt : « la », qui désigne la somme
		await userEvent.tab();
		expect(document.activeElement?.getAttribute('aria-label')).toBe('la');
		await expect.poll(() => stage?.dataset.framedId).toBe('0');
		while (document.activeElement !== two.element()) await userEvent.tab();
		await expect.poll(() => stage?.dataset.framedId).toBe(String(nodeIdOf('2+3y', '2')));
	});

	it('Entrée sur « produit » ouvre la fiche ; l’encadré de 3y reste tant qu’elle est ouverte', async () => {
		const { container } = await render(StructureExplorerHarness, {
			latex: '2+3y',
			readerGrade: null
		});
		const stage = container.querySelector<HTMLElement>('.structure-stage');
		const product = nodeIdOf('2+3y', '3y');
		await expect.poll(() => lexiconButtons(container)).toContain('produit');
		const word = page.getByRole('button', { name: 'produit', exact: true }).first();
		while (document.activeElement !== word.element()) await userEvent.tab();
		await expect.poll(() => stage?.dataset.framedId).toBe(String(product));
		await userEvent.keyboard('{Enter}');
		await expect.element(page.getByRole('dialog', { name: 'produit' })).toBeInTheDocument();
		expect(stage?.dataset.framedId).toBe(String(product));
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => document.activeElement).toBe(word.element());
		expect(stage?.dataset.framedId).toBe(String(product));
	});
});

describe('réglage « nombres et lettres seuls » (revue du lot 4)', () => {
	it('décoché : survoler « 2 » dans la lecture n’encadre rien ; « produit » encadre 3y', async () => {
		const { container } = await render(StructureExplorerHarness, {
			latex: '2+3y',
			readerGrade: null,
			frameLeaves: false
		});
		const stage = container.querySelector<HTMLElement>('.structure-stage');
		const two = [...(wholeReading(container)?.querySelectorAll('math-span') ?? [])].find(
			(f) => f.textContent === '2'
		);
		if (!two) throw new Error('formule 2 absente de la lecture');
		await userEvent.hover(page.elementLocator(two));
		// Le survol a bien eu lieu (segment survolé), mais rien n'est encadré
		await expect.poll(() => two.closest('.reading-segment')?.matches(':hover')).toBe(true);
		expect(stage?.dataset.framedId).toBeUndefined();
		expect(container.querySelectorAll('.structure-frame')).toHaveLength(0);
		await expect.poll(() => lexiconButtons(container)).toContain('produit');
		await userEvent.hover(page.getByRole('button', { name: 'produit', exact: true }));
		await expect.poll(() => stage?.dataset.framedId).toBe(String(nodeIdOf('2+3y', '3y')));
	});
});
