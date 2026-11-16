/**
 * Carnet de liaison — le rendu (B1, B2, Q13, Q25)
 * ===============================================
 *
 * Ce que voit le lecteur : un palier par semaine (jamais le nombre exact de
 * jours), les révisions en retard, les évaluations faites ou non (JAMAIS une
 * note), les liens du cahier et du cours. Sans travail : une phrase neutre.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CarnetView from '../CarnetView.svelte';
import type { Carnet } from '$lib/validation/carnet';

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
	it('un palier par semaine, la plus récente en haut, vacances signalées', async () => {
		const screen = await render(CarnetView, { carnet: carnet() });
		const lignes = Array.from(document.querySelectorAll('li[data-level]'));
		expect(lignes.map((l) => l.getAttribute('data-level'))).toEqual(['2-3', '4+', '2-3', '0', '1']);
		expect(lignes[0].textContent).toContain('Cette semaine');
		expect(lignes[0].textContent).toContain('2 à 3 jours de travail');
		expect(lignes[1].textContent).toContain('4 jours de travail ou plus');
		expect(lignes[3].textContent).toContain('(vacances)');
		await expect.element(screen.getByText('3 révisions en retard.')).toBeVisible();
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
		await expect.element(screen.getByText('Pas encore de travail cette semaine')).toBeVisible();
		await expect.element(screen.getByText('Les révisions sont à jour.')).toBeVisible();
		await expect
			.element(screen.getByText('Aucune évaluation ces dernières semaines.'))
			.toBeVisible();
		expect(document.body.textContent).not.toContain('La classe');
		// Rien en rouge (B2)
		expect(document.querySelector('.text-destructive, [class*="red-"]')).toBeNull();
	});
});
