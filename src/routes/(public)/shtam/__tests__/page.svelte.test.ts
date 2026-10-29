import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Une from '../+page.svelte';
import ArticlePage from '../[slug]/+page.svelte';

const summary = {
	slug: 'triangle-plainte',
	title: 'Un triangle porte plainte',
	lede: 'Il réclame ~\\pi~ hypoténuses.',
	byline: 'Cotice, rédacteur en chef',
	date: '2026-10-05',
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

const edition = {
	number: 12,
	almanachDate: '16 Givraire, An 131 E.R.',
	gregorianDate: '29 octobre 2026'
};

const uneData = (overrides: Record<string, unknown> = {}) => ({
	kind: 'une',
	edition,
	page: 1,
	pageCount: 3,
	une: { ...summary, page: 2, image: null, excerpt: 'Il a calculé ~a^2+b^2~ devant le juge.' },
	teasers: [{ ...summary, slug: 'autre', title: 'Une autre nouvelle', page: 2 }],
	...overrides
});

describe('/shtam (la une)', () => {
	it('porte le titre du journal, son numéro, la date du jour et son prix en gidouille', async () => {
		const screen = await render(Une, { props: { data: uneData() } as never });
		const masthead = screen.getByTestId('shtam-masthead');
		await expect.element(masthead).toHaveTextContent('Le Shtam');
		await expect.element(masthead).toHaveTextContent('N° 12');
		await expect.element(masthead).toHaveTextContent('16 Givraire, An 131 E.R.');
		await expect.element(masthead).toHaveTextContent('1 gidouille');
	});

	it('met le dernier article en une : titre, chapeau, début du corps, suite en page 2', async () => {
		const screen = await render(Une, { props: { data: uneData() } as never });
		const une = screen.getByTestId('shtam-une');
		await expect
			.element(screen.getByRole('link', { name: 'Un triangle porte plainte' }))
			.toHaveAttribute('href', expect.stringMatching(/\/shtam\?page=2#triangle-plainte$/));
		await expect.element(une).toHaveTextContent('devant le juge');
		await expect.element(une).toHaveTextContent('Par Cotice, rédacteur en chef');
		await expect
			.element(screen.getByRole('link', { name: /Lire la suite, page 2/ }))
			.toHaveAttribute('href', expect.stringMatching(/\/shtam\?page=2#triangle-plainte$/));
	});

	it('rend les formules du chapeau et du corps, pas leurs tildes', async () => {
		const screen = await render(Une, { props: { data: uneData() } as never });
		const une = screen.getByTestId('shtam-une').element() as HTMLElement;
		const all = await formulas(une, 2);
		expect(all.some((f) => f.includes('\\pi'))).toBe(true);
		expect(all.some((f) => f.includes('a^2+b^2'))).toBe(true);
		expect(une.textContent).not.toContain('~');
	});

	it('annonce les articles suivants, avec la page où les lire', async () => {
		const screen = await render(Une, { props: { data: uneData() } as never });
		await expect.element(screen.getByTestId('shtam-teasers')).toHaveTextContent('suite page 2');
		await expect
			.element(screen.getByRole('link', { name: 'Une autre nouvelle' }))
			.toHaveAttribute('href', expect.stringMatching(/\/shtam\?page=2#autre$/));
	});

	it('fait tourner les pages : la une mène à la page 2', async () => {
		const screen = await render(Une, { props: { data: uneData() } as never });
		const nav = screen.getByRole('navigation', { name: 'Pages du journal' });
		await expect.element(nav).toHaveTextContent('Page 1 sur 3');
		await expect
			.element(screen.getByRole('link', { name: 'Page 2 →', exact: true }))
			.toHaveAttribute('href', expect.stringMatching(/\/shtam\?page=2$/));
	});

	it('sans article, la Rédaction le dit', async () => {
		const screen = await render(Une, {
			props: { data: uneData({ une: null, teasers: [], pageCount: 1 }) } as never
		});
		await expect
			.element(screen.getByTestId('shtam-empty'))
			.toHaveTextContent('La Rédaction enquête');
	});

	it('prévient que les nouvelles sont fausses', async () => {
		const screen = await render(Une, { props: { data: uneData() } as never });
		await expect.element(screen.getByTestId('shtam-disclaimer')).toHaveTextContent('parodique');
	});
});

describe('/shtam?page=N (une page intérieure)', () => {
	const full = (slug: string, title: string) => ({
		...summary,
		slug,
		title,
		body: `Corps de ${title}.`,
		truth: `Fait de ${title}.`
	});
	const interieur = {
		kind: 'interieur',
		edition,
		page: 3,
		pageCount: 3,
		articles: [full('premier', 'Premier article'), full('second', 'Second article')]
	};

	it('donne les articles en entier, chacun avec son vrai du faux', async () => {
		const screen = await render(Une, { props: { data: interieur } as never });
		const articles = screen.getByTestId('shtam-full-article').all();
		expect(articles).toHaveLength(2);
		await expect.element(articles[0]).toHaveTextContent('Corps de Premier article.');
		await expect
			.element(screen.getByRole('complementary', { name: 'Le vrai du faux' }).first())
			.toHaveTextContent('Fait de Premier article.');
		expect((articles[1].element() as HTMLElement).id).toBe('second');
	});

	it('ramène à la page précédente, et s’arrête à la dernière', async () => {
		const screen = await render(Une, { props: { data: interieur } as never });
		await expect
			.element(screen.getByRole('link', { name: '← Page 2' }))
			.toHaveAttribute('href', expect.stringMatching(/\/shtam\?page=2$/));
		await expect.element(screen.getByRole('link', { name: /Page 4/ })).not.toBeInTheDocument();
	});

	it('la page 2 ramène à la une, sans paramètre', async () => {
		const screen = await render(Une, { props: { data: { ...interieur, page: 2 } } as never });
		await expect
			.element(screen.getByRole('link', { name: '← La une' }))
			.toHaveAttribute('href', expect.stringMatching(/\/shtam$/));
	});

	it('demande aux moteurs de ne pas indexer les pages intérieures (les articles ont la leur)', async () => {
		await render(Une, { props: { data: interieur } as never });
		expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
			'noindex'
		);
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

	it('décrit l’article aux moteurs : chapeau en texte brut et article satirique en JSON-LD', async () => {
		await render(ArticlePage, { props: { data: { article } } as never });
		const description = document.head
			.querySelector('meta[name="description"]')
			?.getAttribute('content');
		expect(description).toBe('Il réclame π hypoténuses.');
		const scripts = [...document.head.querySelectorAll('script[type="application/ld+json"]')];
		const ld = scripts
			.map((s) => JSON.parse(s.textContent ?? '{}'))
			.find((d) => d['@type'] === 'SatiricalArticle');
		expect(ld).toMatchObject({
			'@type': 'SatiricalArticle',
			headline: 'Un triangle porte plainte',
			datePublished: '2026-10-05',
			inLanguage: 'fr',
			author: { name: 'Cotice, rédacteur en chef' }
		});
	});

	it('ramène à la une', async () => {
		const screen = await render(ArticlePage, { props: { data: { article } } as never });
		await expect
			.element(screen.getByRole('link', { name: '← Le Shtam' }))
			.toHaveAttribute('href', expect.stringMatching(/\/shtam$/));
	});
});
