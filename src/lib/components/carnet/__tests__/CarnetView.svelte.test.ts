/**
 * Carnet de liaison — le rendu (B1, B2, Q13, Q25)
 * ===============================================
 *
 * Ce que voit le lecteur : une rangée de cases, un palier par semaine, comme
 * une ligne de la grille du professeur (jamais le nombre exact de jours,
 * chantier `carnet-heatmap`), les révisions en retard, les évaluations faites ou non (JAMAIS une
 * note), les liens du cahier et du cours. Sans travail : une phrase neutre.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CarnetView from '../CarnetView.svelte';
import type { Carnet } from '#lib/validation/carnet.ts';

function carnet(extra: Partial<Carnet> = {}): Carnet {
	return {
		firstname: 'Léa',
		weeks: [
			{ week_start: '2026-10-19', level: '1', holiday: true },
			{ week_start: '2026-10-26', level: '0', holiday: true },
			{ week_start: '2026-11-02', level: '2-3', holiday: false },
			{ week_start: '2026-11-09', level: '4+', holiday: false },
			{ week_start: '2026-11-16', level: '2-3', holiday: false }
		],
		revisions: { overdue: 3 },
		evaluations: [
			{ title: 'Fractions', deadline: '2020-01-10T22:00:00+00:00', done: true },
			{ title: 'Équations', deadline: '2020-01-12T22:00:00+00:00', done: false },
			{ title: 'Puissances', deadline: '2099-01-12T22:00:00+00:00', done: false }
		],
		classes: [
			{ name: '4e B', journal_token: 'AbCdEfGhJkMnPqRs', course_token: 'ZyXwVuTsRqPoNmLk' }
		],
		...extra
	};
}

describe('CarnetView', () => {
	it('une case par semaine, la plus ancienne à gauche, vacances signalées', async () => {
		const screen = await render(CarnetView, { carnet: carnet() });
		const cases = Array.from(document.querySelectorAll<HTMLElement>('[data-cell]'));
		expect(cases.map((c) => c.getAttribute('data-cell'))).toEqual([
			'0-0',
			'0-1',
			'0-2',
			'0-3',
			'0-4'
		]);
		expect(cases.map((c) => c.className.match(/tier-\d/)?.[0])).toEqual([
			'tier-1',
			'tier-0',
			'tier-2',
			'tier-3',
			'tier-2'
		]);
		// Le palier en toutes lettres, dans le vocabulaire du parent ; jamais le nombre exact
		expect(cases[3].textContent).toBe('Semaine du 9 nov. : 4 jours de travail ou plus');
		expect(cases[0].textContent).toBe('Semaine du 19 oct. (vacances) : 1 jour de travail');
		expect(document.querySelectorAll('thead .holiday-mark')).toHaveLength(2);
		await expect.element(screen.getByText('Jours de travail dans la semaine :')).toBeVisible();
		// Pas de colonne de nom (Q2) : le prénom est en titre de la page
		expect(document.querySelector('th[scope="row"]')).toBeNull();
		await expect.element(screen.getByText('3 révisions en retard.')).toBeVisible();
	});

	it('depuis la rentrée sur téléphone : la rangée s’ouvre sur la semaine en cours', async () => {
		document.body.style.width = '320px';
		const debut = Date.UTC(2026, 7, 31);
		const weeks = Array.from({ length: 40 }, (_, i) => ({
			week_start: new Date(debut + i * 7 * 86_400_000).toISOString().slice(0, 10),
			level: '1' as const,
			holiday: false
		}));
		try {
			await render(CarnetView, { carnet: carnet({ weeks }) });
			expect(document.querySelectorAll('[data-cell]')).toHaveLength(40);
			const defile = document.querySelector<HTMLElement>('.overflow-x-auto');
			expect(defile).not.toBeNull();
			expect(defile!.scrollWidth).toBeGreaterThan(defile!.clientWidth);
			await expect
				.poll(() => defile!.scrollLeft + defile!.clientWidth)
				.toBeGreaterThanOrEqual(defile!.scrollWidth - 1);
		} finally {
			document.body.style.width = '';
		}
	});

	it('évaluations : chacune dans sa section, faite ou non sur SA ligne', async () => {
		await render(CarnetView, {
			carnet: carnet({
				evaluations: [
					{ title: 'Fractions', deadline: '2020-01-10T22:00:00+00:00', done: true },
					{ title: 'Équations', deadline: '2020-01-12T22:00:00+00:00', done: false },
					{ title: 'Puissances', deadline: '2099-01-12T22:00:00+00:00', done: false },
					{ title: 'Calcul mental', deadline: '2099-01-14T22:00:00+00:00', done: true },
					// Sans échéance : à venir tant qu'elle n'est pas faite
					{ title: 'Sans date à faire', deadline: null, done: false },
					{ title: 'Sans date faite', deadline: null, done: true }
				]
			})
		});

		/** Statut affiché sur la ligne de chaque évaluation d'une section */
		function lignes(section: string): Record<string, string> {
			const lis = document.querySelectorAll(`section[aria-labelledby="${section}"] li`);
			return Object.fromEntries(
				Array.from(lis).map((li) => {
					const spans = li.querySelectorAll(':scope > span');
					const titre = spans[0]?.firstChild?.textContent?.trim() ?? '';
					return [titre, spans[1]?.textContent?.trim() ?? ''];
				})
			);
		}

		expect(lignes('carnet-eval-a-venir')).toEqual({
			Puissances: 'à faire',
			'Calcul mental': 'faite',
			'Sans date à faire': 'à faire'
		});
		expect(lignes('carnet-eval-passees')).toEqual({
			Fractions: 'faite',
			Équations: 'non faite',
			'Sans date faite': 'faite'
		});
	});

	it('aucune note, même si un champ en portait une', async () => {
		const brut = carnet();
		const avecNote = {
			...brut,
			evaluations: brut.evaluations.map((e) => ({ ...e, score: 17, grade: '17/20' }))
		} as Carnet;
		await render(CarnetView, { carnet: avecNote });
		const texte = document.body.textContent ?? '';
		expect(texte).not.toContain('17');
		expect(texte).not.toMatch(/\/\s*20/);
	});

	it('liens du cahier et du cours de la classe', async () => {
		const screen = await render(CarnetView, { carnet: carnet() });
		await expect
			.element(screen.getByRole('link', { name: 'Cahier de textes — 4e B' }))
			.toHaveAttribute('href', '/cahier/AbCdEfGhJkMnPqRs');
		await expect
			.element(screen.getByRole('link', { name: 'Cours — 4e B' }))
			.toHaveAttribute('href', '/cours/ZyXwVuTsRqPoNmLk');
	});

	it('sans travail ni évaluation (B2) : phrases neutres, révisions à jour, pas de section classe sans lien', async () => {
		const screen = await render(CarnetView, {
			carnet: carnet({
				weeks: [{ week_start: '2026-11-16', level: '0', holiday: false }],
				revisions: { overdue: 0 },
				evaluations: [],
				classes: [{ name: '4e B', journal_token: null, course_token: null }]
			})
		});
		// Semaine en cours sans travail : une case vide comme les autres (L5)
		expect(document.querySelector('[data-cell="0-0"]')?.textContent).toBe(
			'Semaine du 16 nov. : aucun jour de travail'
		);
		await expect.element(screen.getByText('Les révisions sont à jour.')).toBeVisible();
		await expect
			.element(screen.getByText('Aucune évaluation ces dernières semaines.'))
			.toBeVisible();
		expect(document.body.textContent).not.toContain('La classe');
		// Rien en rouge (B2)
		expect(document.querySelector('.text-destructive, [class*="red-"]')).toBeNull();
	});
});
