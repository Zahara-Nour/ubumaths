import { page } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';
import type { MonthIndex } from '$lib/almanach/calendar';
import { MONTH_PALETTES } from '$lib/almanach/palettes';

const MONTHS: MonthIndex[] = [0, 1, 2, 3, 4, 5, 6];

async function renderWith(ambianceMonth: MonthIndex) {
	return await render(Page, { props: { data: { ambianceMonth, shtam: null } } as never });
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
		await renderWith(5);

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
	});

	it('le mot « verte » reste en couleur primaire', async () => {
		const screen = await renderWith(5);
		const verte = screen.container.querySelector('h1 .text-primary');
		expect(verte?.textContent).toBe('verte');
	});

	it('ne montre ni date ni lien vers l’Almanach (la date vit dans le tableau de bord)', async () => {
		const screen = await render(Page, {
			props: {
				data: { ambianceMonth: 5, shtam: { slug: 'un-article', title: 'Un titre' } }
			} as never
		});
		const hrefs = [...screen.container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
		expect(hrefs.some((h) => /almanach/.test(h ?? ''))).toBe(false);
		const text = screen.container.textContent ?? '';
		expect(text).not.toMatch(/E\.R\.|An \d+|Lumenal|Cloche|Surnuméraire/);
	});

	it.each(MONTHS)(
		'mois %i : halo et traits prennent les couleurs du mois, en clair et en sombre',
		async (monthIndex) => {
			const screen = await renderWith(monthIndex);
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

	it('avec prefers-reduced-motion, le halo ne s’anime plus', async () => {
		await renderWith(5);
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
		const shtam = {
			slug: 'un-article',
			title: 'Un mathématicien a prouvé que π n’était transcendant que le mardi'
		};

		/** Rendu dans une zone de taille fixe, comme dans le layout (h-full) */
		async function renderInZone(width: number, height: number, withShtam = true) {
			const screen = await render(Page, {
				props: { data: { ambianceMonth: 1, shtam: withShtam ? shtam : null } } as never
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

		it.each([
			['ordinateur', 1200, 740],
			['téléphone 390 × 844', 390, 684],
			['téléphone 375 × 667', 375, 507],
			['petit téléphone', 360, 480]
		])('titre en haut, Ubu au centre, Shtam en bas, dans cet ordre (%s)', async (_n, w, h) => {
			const screen = await renderInZone(w, h);
			const zone = box(screen.container);
			const h1 = screen.container.querySelector('h1')!;
			const svg = screen.container.querySelector('figure svg')!;
			const depeche = screen.getByTestId('home-shtam').element();
			// Ordre du DOM : titre, puis Ubu, puis le Shtam
			const follows = (a: Node, b: Node) =>
				Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
			expect(follows(h1, svg)).toBe(true);
			expect(follows(svg, depeche)).toBe(true);
			// Titre collé en haut de la zone, Shtam collé en bas (au-dessus du bouton Infos)
			expect(box(h1).top - zone.top).toBeLessThan(24);
			expect(zone.bottom - box(depeche).bottom).toBeLessThan(24);
			expect(box(h1).bottom).toBeLessThanOrEqual(box(svg).top);
			expect(box(depeche).top).toBeGreaterThanOrEqual(box(svg).bottom);
			expect(overlap(box(depeche), box(h1))).toBe(false);
			// Tout dans la zone, sans débord
			const root = screen.container.firstElementChild as HTMLElement;
			expect(root.scrollHeight).toBeLessThanOrEqual(root.clientHeight + 1);
			expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
		});

		it('le Shtam est discret : petit texte, plus petit que le titre', async () => {
			const screen = await renderInZone(390, 684);
			const size = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
			const depeche = screen.getByTestId('home-shtam').element();
			expect(size(depeche)).toBeLessThanOrEqual(12);
			expect(box(depeche).height).toBeLessThan(48);
		});
	});
});
