/**
 * Structure d'une expression — l'explorateur de la formule principale (lot 4)
 * Spécification : docs/systeme/mathast/structure-expression.md (Q10, B, C).
 *
 * - la lecture de l'expression entière, mots du dictionnaire en mots cliquables,
 *   un mot absent du dictionnaire en texte sans lien ;
 * - le sens inverse : survoler un mot de la lecture encadre sa sous-expression ;
 * - le message « 6e ou avant » masque encadré et lecture ; jamais pour un visiteur.
 */
import { afterEach, beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
// Comme la page : polices et classes du rendu MathLive (le rendu local = celui de la CI)
import '$lib/utils/mathlive-styles';
import { MARKER_PREFIX, stripMarkers, structureFromLatex } from '$lib/mathAST/structure';
import StructureExplorerHarness from './StructureExplorerHarness.svelte';
import StructureReadingHarness from './StructureReadingHarness.svelte';

// Le dictionnaire arrive de /api/dictionnaire (ADR 0022) : ici, le jeu de référence figé
vi.mock('$lib/dictionary/fetch-dictionary', async () => {
	const { REFERENCE_DICTIONARY: entries } =
		await import('../../../../../../tests/fixtures/lexique/dictionnaire-reference');
	return { fetchDictionary: async () => entries };
});

beforeAll(async () => {
	// MathLive : import dynamique dans les tests client (docs/pratiques/tests.md § Pièges)
	await import('mathlive');
});

/**
 * Le pointeur reste où le test précédent l'a laissé : sur un mot de la lecture
 * qu'un nouveau rendu replace sous lui, il encadre sa sous-expression sans
 * survol voulu. Chaque test part le pointeur garé dans un coin, hors de la lecture.
 */
let parking: HTMLElement;
beforeEach(async () => {
	parking = document.body.appendChild(document.createElement('div'));
	parking.style.cssText = 'position: fixed; right: 0; bottom: 0; width: 4px; height: 4px;';
	await userEvent.hover(page.elementLocator(parking));
});
afterEach(() => parking.remove());

type ExplorerProps = {
	latex: string;
	readerGrade: string | null;
	frameLeaves?: boolean;
	capitalPairs?: 'length' | 'product';
};

/**
 * Rendu de l'explorateur, formules MathLive rendues (shadow DOM rempli) :
 * le rendu local est celui de la CI, où MathLive peut déjà avoir rendu
 * quand le test interagit.
 */
async function renderExplorer(props: ExplorerProps) {
	const result = await render(StructureExplorerHarness, props);
	await expect
		.poll(() =>
			[...result.container.querySelectorAll('math-span')].every(
				(m) => (m.shadowRoot?.childElementCount ?? 0) > 0
			)
		)
		.toBe(true);
	return result;
}

function lexiconButtons(container: HTMLElement): string[] {
	return [...container.querySelectorAll('button.lexicon-term')].map((b) => b.textContent ?? '');
}

function wholeReading(container: HTMLElement): HTMLElement | null {
	return container.querySelector('[data-reading="whole"]');
}

/** Identifiant de la sous-expression écrite `written` (LaTeX sans marqueurs ni espaces) */
function nodeIdOf(latex: string, written: string, capitalPairs?: 'length' | 'product'): number {
	const result = structureFromLatex(latex, capitalPairs && { capitalPairs });
	if (result.status !== 'ok') throw new Error(`structure attendue pour ${latex}`);
	const node = result.structure.nodes.find(
		(n) => stripMarkers(n.latex).replace(/\s+/g, '') === written
	);
	if (!node) throw new Error(`pas de sous-expression ${written} dans ${latex}`);
	return node.id;
}

describe('lecture de l’expression entière (Q10)', () => {
	it('B1 : la lecture de 2+3y est affichée en permanence, sans survol', async () => {
		const { container } = await renderExplorer({
			latex: '2+3y',
			readerGrade: null
		});
		expect(wholeReading(container)?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
			'la somme de 2 et du produit de 3 par y'
		);
	});

	it('les formules de la lecture sont rendues comme formules', async () => {
		const { container } = await renderExplorer({
			latex: '2+3y',
			readerGrade: null
		});
		const formulas = [...(wholeReading(container)?.querySelectorAll('math-span') ?? [])];
		expect(formulas.map((f) => f.textContent)).toEqual(['2', '3', 'y']);
	});

	it('les mots du dictionnaire sont des mots cliquables, même pour un visiteur', async () => {
		const { container } = await renderExplorer({
			latex: '2+3y',
			readerGrade: null
		});
		await expect.poll(() => lexiconButtons(container)).toEqual(['somme', 'produit']);
	});

	it('un mot absent du dictionnaire s’affiche sans lien, sans erreur', async () => {
		const { container } = await renderExplorer({
			latex: String.raw`\sqrt[3]{x}`,
			readerGrade: '3'
		});
		// Le dictionnaire est chargé (un autre mot de la page est souligné) : l'absence prouve le refus
		const other = await renderExplorer({ latex: '2+3y', readerGrade: '3' });
		await expect.poll(() => lexiconButtons(other.container)).toContain('somme');
		expect(wholeReading(container)?.textContent).toContain('racine cubique');
		expect(lexiconButtons(container)).not.toContain('racine cubique');
	});

	it('un clic sur « somme » ouvre la fiche du dictionnaire au niveau de l’élève', async () => {
		await renderExplorer({ latex: '2+3y', readerGrade: '4' });
		await page.getByRole('button', { name: 'somme', exact: true }).click();
		await expect.element(page.getByRole('dialog', { name: 'somme' })).toBeInTheDocument();
		await expect.element(page.getByText(/Résultat d'une addition/)).toBeInTheDocument();
	});
});

describe('sens inverse : survoler la lecture encadre la sous-expression (Q10)', () => {
	it('survoler « produit » encadre 3y dans la formule', async () => {
		const { container } = await renderExplorer({
			latex: '2+3y',
			readerGrade: null
		});
		const stage = container.querySelector<HTMLElement>('[data-field]');
		expect(stage?.dataset.framedId).toBeUndefined();
		await expect.poll(() => lexiconButtons(container)).toContain('produit');
		await userEvent.hover(page.getByRole('button', { name: 'produit', exact: true }));
		await expect.poll(() => stage?.dataset.framedId).toBe(String(nodeIdOf('2+3y', '3y')));
		// L'encadré est dessiné, pas seulement calculé
		await expect
			.poll(() => container.querySelectorAll('.structure-frame:not([hidden])').length)
			.toBe(1);
	});

	it('survoler une formule de la lecture encadre sa sous-expression', async () => {
		const { container } = await renderExplorer({
			latex: '2+3y',
			readerGrade: null
		});
		const stage = container.querySelector<HTMLElement>('[data-field]');
		// Le segment par son rôle et son nom : le rendu MathLive répète « y » (texte, MathML)
		await userEvent.hover(page.getByRole('button', { name: 'y', exact: true }));
		await expect.poll(() => stage?.dataset.framedId).toBe(String(nodeIdOf('2+3y', 'y')));
	});
});

describe('élève de 6e ou avant (section C)', () => {
	it('C1 : élève de 6e, 5−3+x → message ; encadré et lecture masqués', async () => {
		const { container } = await renderExplorer({
			latex: '5-3+x',
			readerGrade: '6'
		});
		await expect.element(page.getByText(/Ajoute des parenthèses/)).toBeInTheDocument();
		// La formule reste, pour qu'on l'écrive (champ F) ; sans structure, rien ne s'encadre
		expect(container.querySelector(`[data-field-stage] [class*="${MARKER_PREFIX}"]`)).toBeNull();
		expect(wholeReading(container)).toBeNull();
	});

	it('C2 : élève de CM2, −3+x → message avec son exemple en formule', async () => {
		const { container } = await renderExplorer({
			latex: '-3+x',
			readerGrade: 'CM2'
		});
		await expect.element(page.getByText(/s'apprend en 5e/)).toBeInTheDocument();
		expect(container.querySelector('[data-advice] math-span')).not.toBeNull();
		expect(container.querySelector(`[data-field-stage] [class*="${MARKER_PREFIX}"]`)).toBeNull();
	});

	it('C3 : élève de 6e, 2+3+4 → pas de message, lecture visible', async () => {
		const { container } = await renderExplorer({
			latex: '2+3+4',
			readerGrade: '6'
		});
		expect(container.querySelector('[data-advice]')).toBeNull();
		expect(wholeReading(container)).not.toBeNull();
	});

	it('C4 : visiteur ou élève de 5e, 5−3+x → jamais de message', async () => {
		for (const readerGrade of [null, '5']) {
			const { container } = await renderExplorer({
				latex: '5-3+x',
				readerGrade
			});
			expect(container.querySelector('[data-advice]')).toBeNull();
			expect(container.querySelector('[data-field]')).not.toBeNull();
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
		const { container } = await renderExplorer({
			latex: '2+3y',
			readerGrade: null
		});
		const stage = container.querySelector<HTMLElement>('[data-field]');
		await expect.poll(() => lexiconButtons(container)).toContain('produit');
		const two = page.getByRole('button', { name: '2', exact: true });
		await expect.element(two).toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'par', exact: true }))
			.toBeInTheDocument();
		// Premier arrêt : le champ lui-même (on l'écrit au clavier, Entrée) ; puis « la »,
		// qui désigne la somme
		await userEvent.tab();
		expect(document.activeElement).toBe(stage);
		await userEvent.tab();
		expect(document.activeElement?.getAttribute('aria-label')).toBe('la');
		await expect.poll(() => stage?.dataset.framedId).toBe('0');
		while (document.activeElement !== two.element()) await userEvent.tab();
		await expect.poll(() => stage?.dataset.framedId).toBe(String(nodeIdOf('2+3y', '2')));
	});

	it('Entrée sur « produit » ouvre la fiche ; l’encadré de 3y reste tant qu’elle est ouverte', async () => {
		const { container } = await renderExplorer({
			latex: '2+3y',
			readerGrade: null
		});
		const stage = container.querySelector<HTMLElement>('[data-field]');
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
		const { container } = await renderExplorer({
			latex: '2+3y',
			readerGrade: null,
			frameLeaves: false
		});
		const stage = container.querySelector<HTMLElement>('[data-field]');
		const two = page.getByRole('button', { name: '2', exact: true });
		await userEvent.hover(two);
		// Le survol a bien eu lieu (segment survolé), mais rien n'est encadré
		await expect.poll(() => two.element().matches(':hover')).toBe(true);
		expect(stage?.dataset.framedId).toBeUndefined();
		expect(container.querySelectorAll('.structure-frame:not([hidden])')).toHaveLength(0);
		await expect.poll(() => lexiconButtons(container)).toContain('produit');
		await userEvent.hover(page.getByRole('button', { name: 'produit', exact: true }));
		await expect.poll(() => stage?.dataset.framedId).toBe(String(nodeIdOf('2+3y', '3y')));
	});
});

describe('longueurs de segments (chantier « longueurs », lot 4)', () => {
	function readingText(container: HTMLElement): string | undefined {
		return wholeReading(container)?.textContent?.replace(/\s+/g, ' ').trim();
	}

	it('mode longueur : 3AB² se lit avec « longueur », mot cliquable', async () => {
		const { container } = await renderExplorer({
			latex: '3AB^2',
			readerGrade: null,
			capitalPairs: 'length'
		});
		expect(readingText(container)).toBe('le produit de 3 par le carré de la longueur AB');
		await expect.poll(() => lexiconButtons(container)).toContain('longueur');
	});

	it('mode longueur : survoler « longueur » encadre A′B′ d’un seul bloc', async () => {
		const latex = "2A'B'^2";
		const { container } = await renderExplorer({
			latex,
			readerGrade: null,
			capitalPairs: 'length'
		});
		const stage = container.querySelector<HTMLElement>('[data-field]');
		await expect.poll(() => lexiconButtons(container)).toContain('longueur');
		await userEvent.hover(page.getByRole('button', { name: 'longueur', exact: true }));
		const lengthId = nodeIdOf(latex, "A'B'", 'length');
		await expect.poll(() => stage?.dataset.framedId).toBe(String(lengthId));
		// Un seul encadré dessiné : la longueur n'est pas coupée en A′ et B′
		await expect
			.poll(() => container.querySelectorAll('.structure-frame:not([hidden])').length)
			.toBe(1);
	});

	it('mode produit : 3AB² se lit comme avant', async () => {
		const { container } = await renderExplorer({
			latex: '3AB^2',
			readerGrade: null,
			capitalPairs: 'product'
		});
		expect(readingText(container)).toBe('le produit de 3, de A et du carré de B');
	});

	it('mode longueur : un nom de figure affiche le message, sans formule ni lecture', async () => {
		const { container } = await renderExplorer({
			latex: 'ABC',
			readerGrade: null,
			capitalPairs: 'length'
		});
		expect(container.querySelector('[data-figure-name]')?.textContent).toBe(
			'ABC n’est pas une longueur : une longueur se nomme avec deux points (AB). Pour un produit, écris A×B×C.'
		);
		expect(wholeReading(container)).toBeNull();
	});
});
