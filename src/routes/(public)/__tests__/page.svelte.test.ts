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

	describe('dépêche du Shtam et mise en page', () => {
		const almanach = civilToPataphysical(2026, 10, 5);
		const shtam = {
			slug: 'un-article',
			title: 'Un mathématicien a prouvé que π n’était transcendant que le mardi'
		};

		/** Rendu dans une zone de taille fixe, comme dans le layout (h-full) */
		async function renderInZone(width: number, height: number, withShtam = true) {
			const screen = await render(Page, {
				props: { data: { almanach, shtam: withShtam ? shtam : null } } as never
			});
			screen.container.style.width = `${width}px`;
			screen.container.style.height = `${height}px`;
			return screen;
		}

		const box = (el: Element) => el.getBoundingClientRect();
		const overlap = (a: DOMRect, b: DOMRect) =>
			!(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right);

		it('montre l’article tiré dans un encart « Le Shtam », en lien vers sa page', async () => {
			const screen = await renderInZone(1200, 740);
			const link = screen.getByRole('link', { name: /transcendant que le mardi/ });
			await expect
				.element(link)
				.toHaveAttribute('href', expect.stringMatching(/\/shtam\/un-article$/));
			await expect.element(screen.getByTestId('home-shtam')).toHaveTextContent(/Le Shtam/i);
		});

		it('ne montre rien quand aucun article n’est paru', async () => {
			const screen = await renderInZone(1200, 740, false);
			expect(screen.container.querySelector('[data-testid="home-shtam"]')).toBeNull();
		});

		it.each([
			['ordinateur', 1200, 740],
			['téléphone', 390, 700]
		])('Père Ubu est au centre de la zone (%s)', async (_nom, width, height) => {
			const screen = await renderInZone(width, height);
			const zone = box(screen.container);
			const ubu = box(screen.container.querySelector('figure svg')!);
			expect(Math.abs(ubu.top + ubu.height / 2 - (zone.top + zone.height / 2))).toBeLessThan(2);
			expect(Math.abs(ubu.left + ubu.width / 2 - (zone.left + zone.width / 2))).toBeLessThan(2);
		});

		it.each([
			['ordinateur', 1200, 740],
			['téléphone', 390, 700],
			['petit téléphone', 360, 560]
		])('l’encart ne touche ni le titre ni Ubu (%s)', async (_nom, width, height) => {
			const screen = await renderInZone(width, height);
			const depeche = box(screen.getByTestId('home-shtam').element());
			expect(overlap(depeche, box(screen.container.querySelector('h1')!))).toBe(false);
			expect(overlap(depeche, box(screen.container.querySelector('figure svg')!))).toBe(false);
		});

		// 360 × 640 moins l'en-tête et le pied de page du layout : une zone d'environ 480 px
		it.each([
			['téléphone moyen', 390, 555],
			['petit téléphone', 360, 480],
			['très petit téléphone', 320, 440]
		])('tout tient sans défiler et Ubu reste centré (%s)', async (_nom, width, height) => {
			const screen = await renderInZone(width, height);
			const root = screen.container.firstElementChild as HTMLElement;
			expect(root.scrollHeight).toBeLessThanOrEqual(root.clientHeight + 1);
			const zone = box(screen.container);
			const ubu = box(screen.container.querySelector('figure svg')!);
			expect(Math.abs(ubu.top + ubu.height / 2 - (zone.top + zone.height / 2))).toBeLessThan(2);
		});

		it('Ubu garde sa taille (240 px) quand il y a la place', async () => {
			const screen = await renderInZone(1200, 740);
			expect(Math.round(box(screen.container.querySelector('figure svg')!).height)).toBe(240);
		});

		it('la date de l’Almanach est en haut à droite, plus petite que le titre', async () => {
			const screen = await renderInZone(1200, 740);
			const date = screen.getByRole('link', { name: /Almanach/ }).element();
			const h1 = screen.container.querySelector('h1')!;
			const zone = box(screen.container);
			expect(box(date).top).toBeLessThan(box(h1).top);
			expect(zone.right - box(date).right).toBeLessThan(40);
			expect(box(date).left).toBeGreaterThan(zone.left + zone.width / 2);
			const size = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
			expect(size(date)).toBeLessThanOrEqual(14);
		});

		// 360 × 640 moins l'en-tête et le pied de page du layout : une zone d'environ 480 px
		it.each([
			['téléphone', 390, 700],
			['petit téléphone', 360, 480]
		])('la date ne touche pas le titre (%s)', async (_nom, width, height) => {
			const screen = await renderInZone(width, height);
			const date = screen.getByRole('link', { name: /Almanach/ }).element();
			expect(overlap(box(date), box(screen.container.querySelector('h1')!))).toBe(false);
		});
	});
});
