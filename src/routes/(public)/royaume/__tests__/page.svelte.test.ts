/**
 * Le Tour du Royaume, rendu dans un vrai <main> (les règles de taille d'app.css s'y appliquent).
 */
import { page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';
import { caesarEncrypt } from '$lib/ciphers/caesar';
import { PROVINCES } from '$lib/kingdom-tour/tour';
import { CITIES, capitalOf } from '$lib/kingdom-tour/cities';

// Constantes

const SHTAM = {
	slug: 'un-article',
	title: 'Le Czar arrondit π à 3 par décret',
	lede: 'Le palais évoque une approximation patriotique.',
	byline: 'Par Giron, reporter'
};

const BASE_DATA = { ambianceMonth: 1, almanachDate: '13 Lumenal, An 130 E.R.', shtam: SHTAM };

/** Mots que le lore interdit sur une vitrine (Compendium § IX, lore.ts) */
const FORBIDDEN =
	/mathres|\bbravo\b|\bxp\b|\blevel\b|\bboss\b|\bscore\b|\bstreak\b|leaderboard|[🔥💯🚀]/iu;

// Functions

afterEach(() => {
	document.querySelectorAll('body > main').forEach((main) => main.remove());
});

async function renderTour(data: Record<string, unknown> = BASE_DATA, width?: number) {
	const main = document.body.appendChild(document.createElement('main'));
	if (width) main.style.width = `${width}px`;
	return await render(Page, { target: main, props: { data } as never });
}

describe('/royaume', () => {
	it('un seul titre de niveau 1, qui accueille au Royaume', async () => {
		const screen = await renderTour();
		const headings = screen.container.querySelectorAll('h1');
		expect(headings.length).toBe(1);
		expect(headings[0].textContent).toMatch(/Royaume de Pologne/);
	});

	it('présente les six Provinces, chacune avec sa devise', async () => {
		const screen = await renderTour();
		const map = screen.getByTestId('province-map').element();
		for (const province of PROVINCES) {
			expect(map.querySelector(`#province-${province.id} h3`)?.textContent).toBe(province.name);
			expect(map.textContent).toContain(province.motto);
		}
	});

	it('la carte du Royaume : chaque Province mène à sa fiche, chaque ville à sa page', async () => {
		const screen = await renderTour();
		const map = screen.container.querySelector('svg[data-testid="kingdom-map"]');
		expect(map).not.toBeNull();
		for (const province of PROVINCES) {
			expect(map?.querySelector(`a[href="#province-${province.id}"]`), province.id).not.toBeNull();
		}
		for (const city of CITIES) {
			expect(map?.querySelector(`a[href$="/royaume/${city.slug}"]`), city.slug).not.toBeNull();
		}
	});

	it('la carte est un décor : ses liens ne sont pas au clavier, les fiches les portent', async () => {
		const screen = await renderTour();
		const map = screen.container.querySelector('svg[data-testid="kingdom-map"]');
		expect(map?.getAttribute('aria-hidden')).toBe('true');
		for (const link of map?.querySelectorAll('a') ?? []) {
			expect(link.getAttribute('tabindex')).toBe('-1');
		}
		for (const province of PROVINCES) {
			const capital = capitalOf(province.id);
			const card = screen.container.querySelector(`#province-${province.id}`);
			expect(
				card?.querySelector(`a[href$="/royaume/${capital.slug}"]`),
				province.id
			).not.toBeNull();
		}
		// Sandomir n'a pas de fiche : son lien est hors de la carte
		const sandomir = [...screen.container.querySelectorAll('a[href$="/royaume/sandomir"]')];
		expect(sandomir.some((a) => !map?.contains(a))).toBe(true);
	});

	it('chaque lien reste dans le site, et chaque ancre a sa cible', async () => {
		const screen = await renderTour();
		const hrefs = [...screen.container.querySelectorAll('a')].map(
			(a) => a.getAttribute('href') ?? ''
		);
		expect(hrefs.length).toBeGreaterThan(20);
		for (const href of hrefs) {
			expect(href, href).toMatch(/^[/#]/);
			if (href.startsWith('#')) expect(document.getElementById(href.slice(1)), href).not.toBeNull();
		}
	});

	it('donne la date du jour dans l’Almanach, en lien vers lui', async () => {
		const screen = await renderTour();
		await expect
			.element(screen.getByRole('link', { name: '13 Lumenal, An 130 E.R.' }))
			.toHaveAttribute('href', expect.stringMatching(/\/almanach$/));
	});

	it('la dépêche du jour mène à son article', async () => {
		const screen = await renderTour();
		await expect.element(screen.getByTestId('tour-shtam')).toHaveTextContent(SHTAM.title);
		await expect
			.element(screen.getByRole('link', { name: 'Lire la dépêche' }))
			.toHaveAttribute('href', expect.stringMatching(/\/shtam\/un-article$/));
	});

	it('sans dépêche parue : pas de section du Shtam, le reste de la visite tient', async () => {
		const screen = await renderTour({ ...BASE_DATA, shtam: null });
		expect(screen.container.querySelector('[data-testid="tour-shtam"]')).toBeNull();
		expect(screen.container.querySelector('#shtam')).toBeNull();
		expect(screen.container.querySelector('#parents')).not.toBeNull();
	});

	it('dit ce qui exige un compte : le tuteur et les révisions, rien d’autre', async () => {
		const screen = await renderTour();
		const badges = [...screen.container.querySelectorAll('.badge-account')];
		expect(badges.length).toBe(2);
		const titles = badges.map((b) => b.closest('li')?.querySelector('h3')?.textContent);
		expect(titles).toEqual(['Réviser au bon moment', 'Père Ubu, tuteur']);
	});

	it('vouvoie les parents, et eux seuls', async () => {
		const screen = await renderTour();
		const parents = screen.container.querySelector('#parents')?.textContent ?? '';
		expect(parents).toMatch(/\bVos\b/);
		expect(parents).not.toMatch(/\b(tu|ton|ta|tes|toi)\b/i);
	});

	it('aucun mot que le lore interdit', async () => {
		const screen = await renderTour();
		expect(screen.container.textContent ?? '').not.toMatch(FORBIDDEN);
	});

	// La fenêtre, pas seulement <main> : les points de rupture (sm:, lg:) suivent la fenêtre
	it.each([
		['petit téléphone', 320],
		['téléphone', 375],
		['ordinateur', 1280]
	])('ne déborde pas en largeur (%s)', async (_name, width) => {
		await page.viewport(width, 900);
		const screen = await renderTour(BASE_DATA, width);
		const main = screen.container.closest('main') as HTMLElement;
		expect(main.scrollWidth).toBeLessThanOrEqual(width);
	});

	it('« Commencer la visite » amène le focus aux Provinces', async () => {
		const screen = await renderTour();
		await screen.getByRole('link', { name: 'Commencer la visite' }).click();
		expect(document.activeElement?.id).toBe('provinces');
	});
});

describe('/royaume — la démo de la forme', () => {
	it('chaque réponse donne son verdict, ses points et la remarque du correcteur', async () => {
		const screen = await renderTour();
		const demo = screen.getByTestId('form-demo');
		await demo.getByRole('radio', { name: '(x − 7)(x − 7)' }).click();
		await expect.element(demo).toHaveTextContent('½ point');
		await expect
			.element(demo)
			.toHaveTextContent('La réponse est juste, mais pas écrite sous la forme demandée.');
		await demo.getByRole('radio', { name: '(x + 7)²' }).click();
		await expect.element(demo).toHaveTextContent('Pataphysique');
		await expect
			.element(demo.getByRole('radio', { name: '(x + 7)²' }))
			.toHaveAttribute('aria-checked', 'true');
	});

	it('se parcourt aux flèches, comme un groupe radio', async () => {
		const screen = await renderTour();
		const demo = screen.getByTestId('form-demo');
		const first = demo.getByRole('radio', { name: '(x − 7)²' });
		(first.element() as HTMLElement).focus();
		await userEvent.keyboard('{ArrowRight}');
		const second = demo.getByRole('radio', { name: '(x − 7)(x − 7)' });
		await expect.element(second).toHaveAttribute('aria-checked', 'true');
		expect(document.activeElement).toBe(second.element());
		await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
		await expect
			.element(demo.getByRole('radio', { name: '(x + 7)²' }))
			.toHaveAttribute('aria-checked', 'true');
	});
});

describe('/royaume — le Cabinet Noir en direct', () => {
	it('chiffre le message tapé, et suit le décalage', async () => {
		const screen = await renderTour();
		const demo = screen.getByTestId('cipher-demo');
		const input = demo.getByRole('textbox', { name: 'Ton message' });
		await userEvent.clear(input);
		await userEvent.type(input, 'Ubu');
		await expect.element(demo.getByTestId('cipher-output')).toHaveTextContent('XEX');
		await demo.getByRole('button', { name: 'Avancer d’un rang' }).click();
		await expect.element(demo.getByTestId('cipher-shift')).toHaveTextContent('4');
		await expect.element(demo.getByTestId('cipher-output')).toHaveTextContent('YFY');
	});

	it('un émoji reste un seul caractère (pas de moitiés cassées)', async () => {
		const screen = await renderTour();
		const demo = screen.getByTestId('cipher-demo');
		const input = demo.getByRole('textbox', { name: 'Ton message' });
		// Collé d'un bloc, comme le fait un clavier de téléphone (la frappe simulée coupe l'émoji)
		await userEvent.fill(input, 'Ubu 😀');
		const output = demo.getByTestId('cipher-output').element();
		expect(output.textContent).toContain('😀');
		expect(output.textContent).not.toContain('\uFFFD');
		expect([...output.querySelectorAll('.letter')].map((l) => l.textContent)).toContain('😀');
	});

	it('accents et ponctuation : ceux du vrai module du Cabinet Noir', async () => {
		const screen = await renderTour();
		const demo = screen.getByTestId('cipher-demo');
		const input = demo.getByRole('textbox', { name: 'Ton message' });
		await userEvent.clear(input);
		await userEvent.type(input, 'Éloïse, 12 ans !');
		const expected = caesarEncrypt('Éloïse, 12 ans !', 3).text;
		expect(expected).toBe('HORLVH, 12 DQV !');
		await expect.element(demo.getByTestId('cipher-output')).toHaveTextContent(expected);
	});

	it('le décalage tourne de 1 à 25 sans passer par 0', async () => {
		const screen = await renderTour();
		const demo = screen.getByTestId('cipher-demo');
		const back = demo.getByRole('button', { name: 'Reculer d’un rang' });
		await back.click();
		await back.click();
		await expect.element(demo.getByTestId('cipher-shift')).toHaveTextContent('1');
		await back.click();
		await expect.element(demo.getByTestId('cipher-shift')).toHaveTextContent('25');
	});
});
