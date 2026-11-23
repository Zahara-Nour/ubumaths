/**
 * Texte coloré dans la prose `[texte]{.nom}` — RENDU (ADR 0042)
 *
 * Comportements validés par David le 2026-11-20 (journal texte-colore, § 3) :
 * la teinte de l'objet de même nom dans une figure ; chat des élèves (rendu
 * restreint) sans couleur ni crochets ; nom inconnu → texte normal pour
 * l'élève, message pour le prof.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownRenderer from '../MarkdownRenderer.svelte';

interface Options {
	restricted?: boolean;
	showAuthoringErrors?: boolean;
}

async function rendu(content: string, options: Options = {}): Promise<HTMLElement> {
	const screen = await render(MarkdownRenderer, { props: { content, ...options } });
	const el = screen.container as HTMLElement;
	await expect.poll(() => el.textContent?.trim().length ?? 0).toBeGreaterThan(0);
	return el;
}

/** Éléments qui portent une couleur en style, et leur texte. */
function colores(el: HTMLElement): { color: string; text: string }[] {
	return [...el.querySelectorAll<HTMLElement>('[style*="color"]')].map((node) => ({
		color: node.style.color,
		text: node.textContent ?? ''
	}));
}

describe('texte coloré — écran', () => {
	it('[le cône]{.orange} : orange de la palette, sans crochets', async () => {
		const el = await rendu("C'est [le cône]{.orange}.");
		expect(el.textContent).toContain("C'est le cône.");
		expect(el.textContent).not.toContain('{.orange}');
		expect(colores(el)).toEqual([{ color: 'var(--color-fig-orange)', text: 'le cône' }]);
	});

	it('la teinte peinte est celle du thème (variable résolue)', async () => {
		const el = await rendu('[le cône]{.orange}');
		const node = el.querySelector<HTMLElement>('[style*="color"]');
		expect(node).not.toBeNull();
		expect(getComputedStyle(node as HTMLElement).color).not.toBe(
			getComputedStyle(el.querySelector('p') as HTMLElement).color
		);
	});

	it('gras et couleur ensemble', async () => {
		const el = await rendu('**[le cône]{.orange}**');
		const strong = el.querySelector<HTMLElement>('strong');
		expect(strong?.style.color).toBe('var(--color-fig-orange)');
	});

	it('une formule dans le passage est colorée elle aussi', async () => {
		const el = await rendu('Le carré [$x^2$]{.bleu}.');
		// La formule (rendue par MathLive) est DANS l'élément coloré
		await expect
			.poll(() => el.querySelector('[style*="color"]')?.querySelector('*') ?? null)
			.not.toBeNull();
		const span = el.querySelector<HTMLElement>('[style*="color"]');
		expect(span?.style.color).toBe('var(--color-fig-bleu)');
		expect(span?.textContent).not.toContain('Le carré');
	});

	it('cellule de tableau colorée', async () => {
		const el = await rendu('| A | B |\n|---|---|\n| [le cône]{.vert} | 2 |');
		await expect.poll(() => el.querySelectorAll('td').length).toBeGreaterThan(0);
		expect(colores(el)).toEqual([{ color: 'var(--color-fig-vert)', text: 'le cône' }]);
	});
});

describe('texte coloré — chat des élèves (rendu restreint)', () => {
	it('aucune couleur, crochets retirés', async () => {
		const el = await rendu("C'est [le cône]{.orange}.", { restricted: true });
		expect(el.textContent).toContain("C'est le cône.");
		expect(colores(el)).toEqual([]);
	});

	it('formule d’un passage coloré : pas de couleur non plus', async () => {
		const el = await rendu('Le carré [$x^2$]{.bleu}.', { restricted: true });
		expect(colores(el)).toEqual([]);
	});
});

describe('texte coloré — nom inconnu', () => {
	it('élève : texte normal, ni crochets ni message', async () => {
		const el = await rendu('Voici [le cône]{.turquoise}.');
		expect(el.textContent).toContain('Voici le cône.');
		expect(el.querySelector('[data-authoring-errors]')).toBeNull();
		expect(colores(el)).toEqual([]);
	});

	it('prof : un message qui nomme la classe et les couleurs possibles', async () => {
		const el = await rendu('Voici [le cône]{.turquoise}.', { showAuthoringErrors: true });
		const message = el.querySelector('[data-authoring-errors]');
		expect(message?.textContent).toContain('{.turquoise}');
		expect(message?.textContent).toContain('bleu, rouge');
	});
});
