import { page } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';
import { civilToPataphysical, formatMedium, type PataphysicalDate } from '$lib/almanach/calendar';
import { MONTH_PALETTES } from '$lib/almanach/palettes';

/** Un jour de chaque mois de l'An 130 (index du tableau = index du mois) */
const ONE_DAY_PER_MONTH: [number, number, number][] = [
	[2025, 9, 1],
	[2025, 10, 23],
	[2025, 12, 14],
	[2026, 2, 4],
	[2026, 3, 28],
	[2026, 5, 19],
	[2026, 7, 10]
];

async function renderWith(almanach: PataphysicalDate) {
	return await render(Page, { props: { data: { almanach } } as never });
}

/** Valeur calculée d'une couleur CSS, pour comparer sans dépendre de l'écriture */
function computedColor(value: string): string {
	const probe = document.createElement('div');
	probe.style.color = value;
	document.body.appendChild(probe);
	const out = getComputedStyle(probe).color;
	probe.remove();
	return out;
}

/** Décor de mode-watcher : `color-scheme` (tokens light-dark()) ET classe `.dark` */
function setScheme(scheme: 'light' | 'dark') {
	document.documentElement.style.colorScheme = scheme;
	document.documentElement.classList.toggle('dark', scheme === 'dark');
}

afterEach(() => {
	document.documentElement.style.colorScheme = '';
	document.documentElement.classList.remove('dark');
});

describe('/+page.svelte', () => {
	it('should render h1', async () => {
		await renderWith(civilToPataphysical(2026, 5, 22));

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
	});

	it('le mot « verte » reste en couleur primaire', async () => {
		const screen = await renderWith(civilToPataphysical(2026, 5, 22));
		const verte = screen.container.querySelector('h1 .text-primary');
		expect(verte?.textContent).toBe('verte');
	});

	it('affiche la date du jour (format moyen) en lien vers /almanach', async () => {
		const today = civilToPataphysical(2026, 5, 22);
		await renderWith(today);

		const link = page.getByRole('link', { name: /13 Lumenal, An 130 E\.R\./ });
		await expect.element(link).toBeInTheDocument();
		expect(link.element().getAttribute('href')).toMatch(/\/almanach$/);
		expect(link.element().textContent).toContain(formatMedium(today));
	});

	it.each(ONE_DAY_PER_MONTH.map((d, i) => [i, d] as const))(
		'mois %i : halo et traits prennent les couleurs du mois, en clair et en sombre',
		async (monthIndex, [y, m, d]) => {
			const today = civilToPataphysical(y, m, d);
			expect(today).toMatchObject({ kind: 'month', monthIndex });
			const screen = await renderWith(today);
			const halo = screen.container.querySelector<HTMLElement>('.img-bg');
			const trait = screen.container.querySelector<SVGPathElement>('path.trait');
			if (!halo || !trait) throw new Error('halo ou trait introuvable');
			// Sans animation, le halo montre sa première teinte ; sans transition
			// (`transition-all`), la bascule de mode est lue immédiatement
			halo.style.animation = 'none';
			halo.style.transition = 'none';

			for (const scheme of ['light', 'dark'] as const) {
				setScheme(scheme);
				const palette = MONTH_PALETTES[monthIndex][scheme];
				expect(getComputedStyle(halo).backgroundColor).toBe(computedColor(palette.h1));
				expect(getComputedStyle(trait).stroke).toBe(computedColor(palette.stroke));
			}
		}
	);

	it('la Cloche prend l’ambiance d’Auguste, le Surnuméraire celle de Déglaçose', async () => {
		setScheme('light');
		for (const [date, month] of [
			[civilToPataphysical(2026, 8, 22), 6],
			[civilToPataphysical(2028, 3, 18), 3]
		] as const) {
			const screen = await renderWith(date);
			const halo = screen.container.querySelector<HTMLElement>('.img-bg');
			if (!halo) throw new Error('halo introuvable');
			halo.style.animation = 'none';
			expect(getComputedStyle(halo).backgroundColor).toBe(
				computedColor(MONTH_PALETTES[month].light.h1)
			);
			await screen.unmount();
		}
	});

	it('avec prefers-reduced-motion, le halo ne s’anime plus', async () => {
		await renderWith(civilToPataphysical(2026, 5, 22));
		const rules = [...document.styleSheets].flatMap((sheet) => {
			try {
				return [...sheet.cssRules];
			} catch {
				return [];
			}
		});
		const reduced = rules.filter(
			(r): r is CSSMediaRule =>
				r instanceof CSSMediaRule && r.conditionText.includes('prefers-reduced-motion')
		);
		const haloRule = reduced
			.flatMap((r) => [...r.cssRules])
			.find(
				(r): r is CSSStyleRule => r instanceof CSSStyleRule && r.selectorText.includes('.img-bg')
			);
		expect(haloRule?.style.animationName).toBe('none');
	});

	describe('lien vers le Shtam', () => {
		const almanach = civilToPataphysical(2026, 10, 5);

		it('montre l’article tiré, en lien vers sa page', async () => {
			const screen = await render(Page, {
				props: { data: { almanach, shtam: { slug: 'un-article', title: 'Un titre' } } } as never
			});
			const link = screen.getByRole('link', { name: 'Un titre' });
			await expect
				.element(link)
				.toHaveAttribute('href', expect.stringMatching(/\/shtam\/un-article$/));
			await expect.element(screen.getByTestId('home-shtam')).toHaveTextContent('Le Shtam');
		});

		it('ne montre rien quand aucun article n’est paru', async () => {
			const screen = await render(Page, { props: { data: { almanach, shtam: null } } as never });
			expect(screen.container.querySelector('[data-testid="home-shtam"]')).toBeNull();
		});

		it('reste discret : plus petit que la date de l’Almanach', async () => {
			const screen = await render(Page, {
				props: { data: { almanach, shtam: { slug: 'a', title: 'Un titre' } } } as never
			});
			const size = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
			const shtam = screen.getByTestId('home-shtam').element();
			const date = screen.getByRole('link', { name: /Almanach/ }).element();
			expect(size(shtam)).toBeLessThan(size(date));
		});
	});
});
