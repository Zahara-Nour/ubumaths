import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Une from '../+page.svelte';
import ArticlePage from '../[slug]/+page.svelte';

const summary = {
	slug: 'triangle-plainte',
	title: 'Un triangle porte plainte',
	lede: 'Il réclame ~\\pi~ hypoténuses.',
	byline: 'Cotice, rédacteur en chef',
	almanachDate: '33 Ambraire, An 131 E.R.',
	gregorianDate: '5 octobre 2026'
};

/** Formules rendues par MathLive (leur contenu est le LaTeX, sans espaces pour comparer) */
async function formulas(el: HTMLElement, atLeast: number): Promise<string[]> {
	await expect.poll(() => el.querySelectorAll('math-span').length).toBeGreaterThanOrEqual(atLeast);
	return [...el.querySelectorAll('math-span')].map((m) =>
		(m.textContent ?? '').replace(/\s+/g, '')
	);
}

describe('/shtam (la une)', () => {
	it('liste les articles : date de l’Almanach, titre en lien, chapeau, signature', async () => {
		const screen = await render(Une, { props: { data: { articles: [summary] } } as never });
		const link = screen.getByRole('link', { name: 'Un triangle porte plainte' });
		await expect
			.element(link)
			.toHaveAttribute('href', expect.stringMatching(/\/shtam\/triangle-plainte$/));
		const list = screen.getByTestId('shtam-articles');
		await expect.element(list).toHaveTextContent('33 Ambraire, An 131 E.R.');
		await expect.element(list).toHaveTextContent('5 octobre 2026');
		await expect.element(list).toHaveTextContent('Par Cotice, rédacteur en chef');
	});

	it('rend les formules du chapeau, pas leurs tildes', async () => {
		const screen = await render(Une, { props: { data: { articles: [summary] } } as never });
		const list = screen.getByTestId('shtam-articles').element() as HTMLElement;
		expect(await formulas(list, 1)).toEqual([expect.stringContaining('\\pi')]);
		expect(list.textContent).not.toContain('~');
	});

	it('sans article, la Rédaction le dit', async () => {
		const screen = await render(Une, { props: { data: { articles: [] } } as never });
		await expect
			.element(screen.getByTestId('shtam-empty'))
			.toHaveTextContent('La Rédaction enquête');
	});

	it('prévient que les nouvelles sont fausses', async () => {
		const screen = await render(Une, { props: { data: { articles: [summary] } } as never });
		await expect.element(screen.getByTestId('shtam-disclaimer')).toHaveTextContent('parodique');
	});
});

describe('/shtam/[slug] (un article)', () => {
	const article = {
		...summary,
		body: 'Il a calculé ~a^2+b^2~ devant le juge.',
		truth: 'On a toujours ~c^2=a^2+b^2~.'
	};

	it('affiche titre, dates, signature et corps avec ses formules rendues', async () => {
		const screen = await render(ArticlePage, { props: { data: { article } } as never });
		await expect
			.element(screen.getByRole('heading', { level: 1 }))
			.toHaveTextContent('Un triangle porte plainte');
		const root = screen.container as HTMLElement;
		const all = await formulas(root, 3);
		expect(all.some((f) => f.includes('a^2+b^2') && !f.includes('c^2'))).toBe(true);
		expect(root.textContent).toContain('33 Ambraire, An 131 E.R.');
		expect(root.textContent).toContain('Par Cotice, rédacteur en chef');
		expect(root.textContent).not.toContain('~');
	});

	it('place le vrai du faux dans son encadré, après le corps', async () => {
		const screen = await render(ArticlePage, { props: { data: { article } } as never });
		const truth = screen.getByRole('complementary', { name: 'Le vrai du faux' });
		await expect.element(truth).toBeVisible();
		const box = truth.element() as HTMLElement;
		expect(await formulas(box, 1)).toEqual([expect.stringContaining('c^2=a^2+b^2')]);
		// Le corps (« devant le juge ») précède l'encadré dans le document
		const body = [...screen.container.querySelectorAll('p')].find((p) =>
			p.textContent?.includes('devant le juge')
		);
		expect(body).toBeDefined();
		expect(body!.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(box.textContent).not.toContain('devant le juge');
	});

	it('ramène à la une', async () => {
		const screen = await render(ArticlePage, { props: { data: { article } } as never });
		await expect
			.element(screen.getByRole('link', { name: '← Le Shtam' }))
			.toHaveAttribute('href', expect.stringMatching(/\/shtam$/));
	});
});
