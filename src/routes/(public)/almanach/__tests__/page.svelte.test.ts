import { page } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';
import {
	civilToPataphysical,
	formatMedium,
	formatShort,
	type PataphysicalDate
} from '$lib/almanach/calendar';
import { MONTH_PALETTES } from '$lib/almanach/palettes';

// Les transitions retarderaient la couleur lue après une bascule de mode
const noTransitions = document.head.appendChild(document.createElement('style'));
noTransitions.textContent = '*, *::before, *::after { transition: none !important; }';

async function renderWith(almanach: PataphysicalDate, todayIso: string) {
	return await render(Page, { props: { data: { almanach, todayIso } } as never });
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

describe('/almanach', () => {
	it('affiche la date du jour et met en avant le mois en cours', async () => {
		const today = civilToPataphysical(2026, 5, 22);
		const screen = await renderWith(today, '2026-05-22');

		await expect.element(page.getByRole('heading', { level: 1 })).toBeInTheDocument();
		expect(
			screen.container.querySelector('[data-testid="almanach-today"]')?.textContent?.trim()
		).toBe(formatShort(today));

		const current = screen.container.querySelectorAll('[aria-current="date"]');
		expect(current).toHaveLength(1);
		expect(current[0].getAttribute('data-month')).toBe('5');
		expect(current[0].textContent).toContain('Lumenal');
		expect(current[0].textContent).toContain('Mois en cours');
	});

	it('un jour hors-mois ne met aucun mois en avant', async () => {
		const screen = await renderWith(civilToPataphysical(2026, 8, 22), '2026-08-22');
		expect(screen.container.querySelectorAll('[aria-current="date"]')).toHaveLength(0);
		expect(
			screen.container.querySelector('[data-testid="almanach-today"]')?.textContent?.trim()
		).toBe('La Cloche du Grand Reset');
	});

	it('titres hiérarchisés : un h1, puis des h2 de section', async () => {
		await renderWith(civilToPataphysical(2026, 5, 22), '2026-05-22');
		const h2 = page
			.getByRole('heading', { level: 2 })
			.elements()
			.map((e) => e.textContent?.trim());
		expect(h2).toEqual([
			'Un Almanach, pas un Calendrier',
			'Les sept mois',
			'Les deux jours hors-mois',
			'Les fêtes de l’An',
			'Convertir une date'
		]);
		expect(page.getByRole('heading', { level: 1 }).elements()).toHaveLength(1);
	});

	it('annonce le prochain Surnuméraire', async () => {
		const screen = await renderWith(civilToPataphysical(2026, 5, 22), '2026-05-22');
		expect(
			screen.container.querySelector('[data-testid="almanach-next-surnumeraire"]')?.textContent
		).toContain('18 mars 2028 (An 132 E.R.)');
	});

	it.each([
		['2028-03-18', 2028, 3, 18],
		['2026-08-22', 2026, 8, 22],
		['2028-02-29', 2028, 2, 29],
		['2026-05-22', 2026, 5, 22]
	])('le convertisseur rend la valeur de la fonction pure pour %s', async (iso, y, m, d) => {
		const screen = await renderWith(civilToPataphysical(2026, 1, 1), '2026-01-01');
		await page.getByLabelText('Date grégorienne').fill(iso);

		const medium = screen.container.querySelector('[data-testid="almanach-conversion-medium"]');
		await expect
			.poll(() => medium?.textContent?.trim())
			.toBe(formatMedium(civilToPataphysical(y, m, d)));
	});

	it('le convertisseur montre le Surnuméraire et la Cloche par leur nom', async () => {
		const screen = await renderWith(civilToPataphysical(2026, 1, 1), '2026-01-01');
		const input = page.getByLabelText('Date grégorienne');
		const out = () =>
			screen.container.querySelector('[data-testid="almanach-conversion"]')?.textContent ?? '';

		await input.fill('2028-03-18');
		await expect.poll(out).toContain('Le Surnuméraire, An 132 E.R.');
		await input.fill('2027-08-22');
		await expect.poll(out).toContain('La Cloche du Grand Reset, An 131 E.R.');
	});

	it('rendu sombre : cartes et texte suivent les tokens, bandeau du mois en sombre', async () => {
		const screen = await renderWith(civilToPataphysical(2025, 10, 23), '2025-10-23');
		const card = screen.container.querySelector<HTMLElement>('[data-month="1"]');
		const band = card?.querySelector<HTMLElement>('.month-band');
		if (!card || !band) throw new Error('carte de Givraire introuvable');

		setScheme('dark');
		expect(getComputedStyle(card).backgroundColor).toBe('rgb(47, 47, 47)');
		expect(getComputedStyle(card).color).toBe('rgb(239, 239, 239)');
		expect(getComputedStyle(band).backgroundImage).toContain(
			computedColor(MONTH_PALETTES[1].dark.h1)
		);

		setScheme('light');
		expect(getComputedStyle(card).backgroundColor).toBe('rgb(255, 255, 255)');
		expect(getComputedStyle(band).backgroundImage).toContain(
			computedColor(MONTH_PALETTES[1].light.h1)
		);
	});

	it('le jour d’une fête, elle est annoncée « aujourd’hui », pas « prochaine »', async () => {
		// 17 Auroral = Jubilé du Cheval à Phynances
		const screen = await renderWith(civilToPataphysical(2026, 4, 4), '2026-04-04');
		const row = [...screen.container.querySelectorAll('tbody tr')].find((tr) =>
			tr.textContent?.includes('Cheval à Phynances')
		);
		expect(row?.textContent).toContain('aujourd’hui');
		expect(row?.textContent).not.toContain('prochaine');
		// La suivante reste « prochaine »
		const polyedres = [...screen.container.querySelectorAll('tbody tr')].find((tr) =>
			tr.textContent?.includes('Polyèdres')
		);
		expect(polyedres?.textContent).toContain('prochaine');
	});

	it('le jour du Surnuméraire, il est annoncé « aujourd’hui »', async () => {
		const screen = await renderWith(civilToPataphysical(2028, 3, 18), '2028-03-18');
		const line =
			screen.container.querySelector('[data-testid="almanach-next-surnumeraire"]')?.textContent ??
			'';
		expect(line).toContain('aujourd’hui');
		expect(line).not.toContain('Prochain');
	});

	it('le hero n’emploie aucun texte atténué, et son voile est couleur carte', async () => {
		setScheme('light');
		const screen = await renderWith(civilToPataphysical(2026, 4, 4), '2026-04-04');
		const veil = screen.container.querySelector<HTMLElement>('[data-testid="almanach-hero-veil"]');
		if (!veil) throw new Error('voile introuvable');
		expect(veil.querySelectorAll('.text-muted-foreground')).toHaveLength(0);
		expect(getComputedStyle(veil).backgroundColor).toBe('color(srgb 1 1 1 / 0.7)');
	});
});
