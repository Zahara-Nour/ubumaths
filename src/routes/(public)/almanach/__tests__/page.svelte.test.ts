import { page } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';
import {
	FEASTS,
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

/** Fêtes de la table portant un badge, avec ce badge */
function badges(container: HTMLElement): [string, string][] {
	return [...container.querySelectorAll('tbody tr')]
		.map((tr) => {
			const head = tr.querySelector('th');
			const badge = head?.querySelector('.next-badge')?.textContent?.trim();
			if (!head || !badge) return null;
			const name = (head.textContent ?? '').replace(badge, '').trim();
			return [name, badge] as [string, string];
		})
		.filter((x): x is [string, string] => x !== null);
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
		// 37 Auroral = Jubilé du Cheval à Phynances
		const screen = await renderWith(civilToPataphysical(2026, 4, 24), '2026-04-24');
		const row = [...screen.container.querySelectorAll('tbody tr')].find((tr) =>
			tr.textContent?.includes('Cheval à Phynances')
		);
		expect(row?.textContent).toContain('aujourd’hui');
		expect(row?.textContent).not.toContain('prochaine');
		expect(badges(screen.container)).toEqual([
			['Le Jubilé du Cheval à Phynances', 'aujourd’hui'],
			['La Foire aux Polyèdres', 'prochaine']
		]);
	});

	it.each([
		// Le lendemain de la Cloche : la rentrée n'est pas encore passée
		[[2026, 8, 22], 'Le Grand Redémarrage'],
		[[2026, 8, 23], 'Le Grand Redémarrage'],
		[[2025, 9, 2], 'La Régate de la Passoire'],
		[[2025, 12, 19], 'La Journée de L’Isle de la Réunion Pataphysique'],
		[[2025, 12, 21], 'La Grande Empochaille'],
		[[2026, 3, 2], 'Le Poisson à Phynances'],
		[[2028, 3, 18], 'Le Poisson à Phynances'],
		[[2026, 4, 2], 'Le Jubilé du Cheval à Phynances'],
		[[2026, 5, 22], 'Le Décervelage Suprême'],
		[[2026, 6, 16], 'La Proclamation Royale'],
		[[2026, 7, 2], 'Le Grand Redémarrage']
	] as const)('le %j, la prochaine fête est %s', async ([y, m, d], expected) => {
		const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
		const screen = await renderWith(civilToPataphysical(y, m, d), iso);
		expect(badges(screen.container)).toEqual([[expected, 'prochaine']]);
	});

	it('la table des fêtes ne reprend aucune fête du Collège de ’Pataphysique', async () => {
		const screen = await renderWith(civilToPataphysical(2026, 5, 22), '2026-05-22');
		const rows = [...screen.container.querySelectorAll('tbody tr')].map(
			(tr) => tr.textContent ?? ''
		);
		expect(rows).toHaveLength(FEASTS.length);
		const text = screen.container.textContent ?? '';
		// « Fête des Polyèdres » (Collège) ; la Foire aux Polyèdres est une fête Chiphre
		for (const name of ['Nativité', 'Bosse-de-Nage', 'Faustroll', 'Fête des Polyèdres']) {
			expect(text).not.toContain(name);
		}
	});

	it('aucun texte ne mentionne une ancienne fête ni une ancienne date', async () => {
		const screen = await renderWith(civilToPataphysical(2026, 5, 22), '2026-05-22');
		const text = screen.container.textContent ?? '';
		expect(text).not.toMatch(new RegExp(['phyn', 'anche'].join(''), 'i'));
		expect(text).not.toContain('17 Auroral');
		expect(text).not.toMatch(/(^|[^0-9])4 avril/);
	});

	it('une carte par mois, chacune avec ses événements', async () => {
		const screen = await renderWith(civilToPataphysical(2026, 5, 22), '2026-05-22');
		const expected: string[][] = [
			['10 Ambraire : Le Grand Redémarrage'],
			['26 Givraire : La Régate de la Passoire'],
			[
				'16 Glaglavose : La Journée de L’Isle de la Réunion Pataphysique',
				'18 Glaglavose : La Grande Empochaille'
			],
			['35 Déglaçose : La Restauration de Bougrelas'],
			['14 Auroral : Le Poisson à Phynances', '37 Auroral : Le Jubilé du Cheval à Phynances'],
			['12 Lumenal : La Foire aux Polyèdres', '37 Lumenal : Le Décervelage Suprême'],
			['1 Auguste : La Proclamation Royale']
		];
		const cards = [...screen.container.querySelectorAll<HTMLElement>('.month-card')];
		expect(cards).toHaveLength(7);
		cards.forEach((card, index) => {
			expect(card.getAttribute('data-month')).toBe(String(index));
			const feasts = [...card.querySelectorAll('[data-testid="month-feast"]')].map((el) =>
				(el.textContent ?? '').replace(/\s+/g, ' ').trim()
			);
			expect(feasts).toEqual(expected[index]);
			expect(card.textContent ?? '').not.toMatch(/undefined|null|NaN/);
			// Aucun élément vide laissé dans la carte
			const empty = [...card.querySelectorAll('span, div, p')].filter(
				(el) => !el.classList.contains('month-band') && (el.textContent ?? '').trim() === ''
			);
			expect(empty).toEqual([]);
		});
	});

	it('la Mobilisation Royale est une période, annoncée sur la seule carte de Lumenal', async () => {
		const screen = await renderWith(civilToPataphysical(2026, 5, 22), '2026-05-22');
		const periods = [...screen.container.querySelectorAll('[data-testid="month-period"]')];
		expect(periods).toHaveLength(1);
		expect(periods[0].closest('.month-card')?.getAttribute('data-month')).toBe('5');
		expect(periods[0].textContent).toContain('La Mobilisation Royale');
		expect(periods[0].textContent).toContain('Décervelage Suprême');
		// Pas une fête d'un jour : absente de la table
		const rows = [...screen.container.querySelectorAll('tbody tr')].map((tr) => tr.textContent);
		expect(rows.filter((r) => r?.includes('Mobilisation'))).toEqual([]);
	});

	it('les cartes des mois n’ont plus de pastilles de couleur', async () => {
		const screen = await renderWith(civilToPataphysical(2026, 5, 22), '2026-05-22');
		const cards = screen.container.querySelectorAll('.month-card');
		expect(cards).toHaveLength(7);
		expect(screen.container.querySelectorAll('.swatch, .swatch-stroke')).toHaveLength(0);
		for (const card of cards) {
			// Seul décor coloré restant : le bandeau
			const decor = card.querySelectorAll('[aria-hidden="true"]');
			expect(decor).toHaveLength(1);
			expect(decor[0].classList.contains('month-band')).toBe(true);
		}
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
