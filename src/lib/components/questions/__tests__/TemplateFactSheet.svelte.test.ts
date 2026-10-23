import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TemplateFactSheet from '../TemplateFactSheet.svelte';
import type { TemplateFactSheet as Sheet } from '$lib/questions/template-fact-sheet';

/**
 * Fiche du modèle : ce que l'admin LIT en tête de l'aperçu (et, en court, de l'éditeur).
 * « aucun » point en alerte avec sa raison ; une lecture en échec n'affiche jamais « aucun ».
 */

const TEMPLATE_ID = '17a3c039-744d-4108-9b47-49f0183990b7';

function sheet(overrides: Partial<Sheet> = {}): Sheet {
	return {
		title: 'Trouver le complément',
		statusLabel: 'Publié',
		published: true,
		typeLabel: 'À trous',
		courseQuestion: false,
		grades: ['CM1'],
		path: [
			{ name: 'Nombres et calculs', archived: false },
			{ name: 'Entiers : addition et soustraction', archived: false },
			{ name: 'complément', archived: false }
		],
		points: { state: 'none', availableCount: 0, fromGrade: 'CM1' },
		settings: ['Espaces dès 4 chiffres (7 900, numération)'],
		...overrides
	};
}

function text(container: HTMLElement): string {
	return (container.textContent ?? '').replace(/\s+/g, ' ');
}

describe('TemplateFactSheet — fiche complète (aperçu)', () => {
	it('nominal : titre, statut, type, classe, chemin, réglages, lien vers l’édition', async () => {
		const { container } = await render(TemplateFactSheet, {
			result: { ok: true, sheet: sheet() },
			templateId: TEMPLATE_ID
		});
		const t = text(container);
		expect(t).toContain('Trouver le complément');
		expect(t).toContain('Publié');
		expect(t).toContain('À trous');
		expect(t).toContain('CM1');
		expect(t).toContain('Nombres et calculs › Entiers : addition et soustraction › complément');
		expect(t).toContain('Espaces dès 4 chiffres (7 900, numération)');
		expect(t).not.toContain('spacesFromFourDigits');

		const link = container.querySelector<HTMLAnchorElement>(
			`a[href="/dashboard/admin/questions/${TEMPLATE_ID}/edit"]`
		);
		expect(link?.textContent).toContain('Modifier le modèle');
	});

	it('aucun point : « aucun » en alerte, avec la raison', async () => {
		const { container } = await render(TemplateFactSheet, {
			result: { ok: true, sheet: sheet() },
			templateId: TEMPLATE_ID
		});
		const none = container.querySelector('[data-testid="fact-sheet-no-point"]');
		expect(none?.textContent).toContain('aucun');
		expect(none?.className).toContain('text-destructive');
		expect(text(container)).toContain(
			'Aucun point de CM1 ou d’une classe suivante sur ce nœud ni sur sa notion'
		);
	});

	it('aucun point mais des points possibles : combien, à poser dans l’éditeur', async () => {
		const { container } = await render(TemplateFactSheet, {
			result: {
				ok: true,
				sheet: sheet({ points: { state: 'none', availableCount: 2, fromGrade: 'CM1' } })
			},
			templateId: TEMPLATE_ID
		});
		expect(text(container)).toContain('2 points possibles sur ce nœud, à poser dans l’éditeur');
	});

	it('points posés : classe, code et nom ; point archivé signalé', async () => {
		const { container } = await render(TemplateFactSheet, {
			result: {
				ok: true,
				sheet: sheet({
					points: {
						state: 'tagged',
						points: [
							{ grade: 'CM2', code: 'CM2-004', name: 'Compléments à 100', archived: false },
							{ grade: '6ème', code: '6-012', name: 'Calcul mental', archived: true }
						]
					}
				})
			},
			templateId: TEMPLATE_ID
		});
		const t = text(container);
		expect(t).toContain('CM2');
		expect(t).toContain('CM2-004');
		expect(t).toContain('Compléments à 100');
		expect(t).toContain('6-012');
		expect(t).toContain('(archivé)');
		expect(container.querySelector('[data-testid="fact-sheet-no-point"]')).toBeNull();
	});

	it('nœud archivé : signalé dans le chemin', async () => {
		const { container } = await render(TemplateFactSheet, {
			result: {
				ok: true,
				sheet: sheet({
					path: [
						{ name: 'Nombres et calculs', archived: false },
						{ name: 'Vieille notion', archived: true }
					]
				})
			},
			templateId: TEMPLATE_ID
		});
		expect(text(container)).toContain('Vieille notion (archivé)');
	});

	it('non rangé : dit en alerte, pas de chemin', async () => {
		const { container } = await render(TemplateFactSheet, {
			result: { ok: true, sheet: sheet({ path: null, points: { state: 'unranked' } }) },
			templateId: TEMPLATE_ID
		});
		expect(text(container)).toContain('non rangé dans l’arbre');
		expect(text(container)).not.toContain('›');
	});

	it('réglages par défaut : dit en mots', async () => {
		const { container } = await render(TemplateFactSheet, {
			result: { ok: true, sheet: sheet({ settings: [] }) },
			templateId: TEMPLATE_ID
		});
		expect(text(container)).toContain('réglages par défaut');
	});

	it('lecture en échec : le message, jamais « aucun »', async () => {
		const { container } = await render(TemplateFactSheet, {
			result: { ok: false, message: 'Arbre des notions illisible : connexion perdue' },
			templateId: TEMPLATE_ID
		});
		const t = text(container);
		expect(t).toContain('Fiche illisible');
		expect(t).toContain('connexion perdue');
		expect(t.toLowerCase()).not.toContain('aucun');
	});
});

describe('TemplateFactSheet — version courte (éditeur)', () => {
	it('chemin et statut, sans les points, lien vers l’aperçu', async () => {
		const { container } = await render(TemplateFactSheet, {
			result: { ok: true, sheet: sheet() },
			templateId: TEMPLATE_ID,
			variant: 'compact'
		});
		const t = text(container);
		expect(t).toContain('Publié');
		expect(t).toContain('CM1');
		expect(t).toContain('Nombres et calculs › Entiers : addition et soustraction › complément');
		expect(container.querySelector('[data-testid="fact-sheet-no-point"]')).toBeNull();
		expect(t).not.toContain('Espaces dès 4 chiffres');
		expect(
			container.querySelector(`a[href="/dashboard/admin/questions/${TEMPLATE_ID}/preview"]`)
		).not.toBeNull();
		expect(container.querySelector(`a[href$="/edit"]`)).toBeNull();
	});
});
