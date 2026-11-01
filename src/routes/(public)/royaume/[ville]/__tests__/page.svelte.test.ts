/**
 * Page d'une ville du Royaume, rendue dans un vrai <main> (chantier cartes-site).
 */
import { page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';
import { cityBySlug, type City } from '$lib/kingdom-tour/cities';
import { PROVINCES } from '$lib/kingdom-tour/tour';

// Constantes

/** Mots que le lore interdit sur une vitrine (Compendium § IX, lore.ts) */
const FORBIDDEN =
	/mathres|\bbravo\b|\bxp\b|\blevel\b|\bboss\b|\bscore\b|\bstreak\b|leaderboard|[🔥💯🚀]/iu;

// Functions

afterEach(() => {
	document.querySelectorAll('body > main').forEach((main) => main.remove());
});

function cityOf(slug: string): City {
	const city = cityBySlug(slug);
	if (!city) throw new Error(slug);
	return city;
}

async function renderCity(slug: string, width?: number) {
	const main = document.body.appendChild(document.createElement('main'));
	if (width) main.style.width = `${width}px`;
	const data = { city: cityOf(slug), description: 'Une ville du Royaume.' };
	return await render(Page, { target: main, props: { data } as never });
}

describe('/royaume/[ville]', () => {
	it('un titre au nom de la ville, sous un retour vers le Tour du Royaume', async () => {
		const screen = await renderCity('turingrad');
		const h1 = screen.container.querySelectorAll('h1');
		expect(h1).toHaveLength(1);
		expect(h1[0].textContent).toBe('Turingrad');
		const back = screen.container.querySelector('a');
		expect(back?.getAttribute('href')).toMatch(/\/royaume$/);
		expect(back?.compareDocumentPosition(h1[0])).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
	});

	it('dit de quelle Province la ville est la capitale', async () => {
		const screen = await renderCity('turingrad');
		await expect.element(screen.getByText(/Capitale du Glitchistan/)).toBeInTheDocument();
	});

	it('Sandomir : capitale du Royaume, sans outils de Province', async () => {
		const screen = await renderCity('sandomir');
		expect(screen.container.textContent).toMatch(/capitale du Royaume/i);
		expect(screen.container.querySelector('[data-testid="city-tools"]')).toBeNull();
	});

	it('liste chaque lieu, avec son nom complet et sa description', async () => {
		const city = cityOf('sinusborg');
		const screen = await renderCity(city.slug);
		const items = [...screen.container.querySelectorAll('[data-testid="city-places"] > li')];
		expect(items).toHaveLength(city.places.length);
		city.places.forEach((place, i) => {
			expect(items[i].querySelector('h2')?.textContent).toBe(place.name);
			expect(items[i].textContent).toContain(place.description);
		});
	});

	it('un clic sur un lieu de la carte met sa fiche en évidence', async () => {
		const city = cityOf('sandomir');
		const screen = await renderCity(city.slug);
		const target = screen.container.querySelector<SVGElement>('ellipse[data-place="caserne"]');
		expect(target).not.toBeNull();
		await userEvent.click(target as SVGElement);
		const current = screen.container.querySelectorAll(
			'[data-testid="city-places"] > li[aria-current="true"]'
		);
		expect(current).toHaveLength(1);
		expect(current[0].id).toBe('lieu-caserne');
		await expect.element(page.elementLocator(current[0])).toBeInViewport();
	});

	it('un lieu à plusieurs cibles (les six ponts) se choisit par chacune', async () => {
		const screen = await renderCity('sinusborg');
		const targets = screen.container.querySelectorAll('ellipse[data-place="ponts-du-delta"]');
		expect(targets.length).toBe(6);
		await userEvent.click(targets[5] as SVGElement);
		expect(screen.container.querySelector('li[aria-current="true"]')?.id).toBe(
			'lieu-ponts-du-delta'
		);
	});

	it('changer de ville oublie le lieu choisi (la Gare existe à Sandomir et à Turingrad)', async () => {
		const screen = await renderCity('sandomir');
		await userEvent.click(
			screen.container.querySelector('ellipse[data-place="gare"]') as SVGElement
		);
		expect(screen.container.querySelector('li[aria-current="true"]')?.id).toBe('lieu-gare');
		await screen.rerender({
			data: { city: cityOf('turingrad'), description: 'Une ville du Royaume.' }
		} as never);
		expect(screen.container.querySelector('h1')?.textContent).toBe('Turingrad');
		expect(screen.container.querySelector('li[aria-current="true"]')).toBeNull();
	});

	it('la carte est un décor : rien d’atteignable au clavier, le contenu est dans la liste', async () => {
		const screen = await renderCity('cracovenn');
		const svg = screen.container.querySelector('svg[data-testid="city-map"]');
		expect(svg?.getAttribute('aria-hidden')).toBe('true');
		expect(svg?.querySelectorAll('a, [tabindex]:not([tabindex="-1"])')).toHaveLength(0);
	});

	it('une capitale reprend les outils de sa Province', async () => {
		const screen = await renderCity('lobatchevsk');
		const bedonstan = PROVINCES.find((p) => p.id === 'bedonstan');
		const tools = screen.container.querySelector('[data-testid="city-tools"]');
		const hrefs = [...(tools?.querySelectorAll('a') ?? [])].map((a) => a.getAttribute('href'));
		expect(hrefs).toEqual(bedonstan?.tools.map((t) => t.href));
	});

	it('aucun mot que le lore interdit', async () => {
		for (const slug of ['sandomir', 'bonneteau-sur-vistule']) {
			const screen = await renderCity(slug);
			expect(screen.container.textContent ?? '').not.toMatch(FORBIDDEN);
		}
	});

	it.each([
		['petit téléphone', 320],
		['ordinateur', 1280]
	])('ne déborde pas en largeur (%s)', async (_name, width) => {
		await page.viewport(width, 900);
		const screen = await renderCity('empoche-les-bains', width);
		const main = screen.container.closest('main') as HTMLElement;
		expect(main.scrollWidth).toBeLessThanOrEqual(width);
	});
});
