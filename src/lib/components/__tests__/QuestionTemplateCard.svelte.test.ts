/**
 * QuestionTemplateCard — badge « Cours » (Q110 b)
 *
 * La carte d'un modèle dans le catalogue admin porte un badge « Cours » quand
 * le modèle est une question de cours (`options.courseQuestion`, ou carte de
 * cours : une carte de cours est toujours une question de cours).
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QuestionTemplateCard from '../QuestionTemplateCard.svelte';
import type { QuestionTemplate } from '$lib/questions/types';
// Modèle réel relu (Entiers #139)
import fixture from '../../../../data/relecture/entiers/139.json';

const BASE = { ...(fixture.template as unknown as QuestionTemplate), id: 'modele-139' };

async function renderCard(options: QuestionTemplate['options']) {
	return await render(QuestionTemplateCard, {
		template: { ...BASE, options },
		onPreview: vi.fn(),
		onEdit: vi.fn(),
		onDuplicate: vi.fn(),
		onDelete: vi.fn()
	});
}

describe('QuestionTemplateCard — badge « Cours »', () => {
	it('question de cours : badge « Cours » affiché', async () => {
		const screen = await renderCard({ courseQuestion: true });
		await expect.element(screen.getByText('Cours', { exact: true })).toBeInTheDocument();
	});

	it('carte de cours : badge « Cours » affiché', async () => {
		const screen = await renderCard({ courseCard: true });
		await expect.element(screen.getByText('Cours', { exact: true })).toBeInTheDocument();
	});

	it('question ordinaire : pas de badge « Cours »', async () => {
		const screen = await renderCard(undefined);
		expect(screen.getByText('Cours', { exact: true }).elements()).toHaveLength(0);
	});
});

describe('QuestionTemplateCard — chemin dans l’arbre', () => {
	async function renderWithPath(path: string | null | undefined) {
		return await render(QuestionTemplateCard, {
			template: BASE,
			path,
			onPreview: vi.fn(),
			onEdit: vi.fn(),
			onDuplicate: vi.fn(),
			onDelete: vi.fn()
		});
	}

	it('affiche le chemin branche › notion › sous-notion', async () => {
		const screen = await renderWithPath('Calcul › Fractions › Additionner');
		await expect.element(screen.getByText('Calcul › Fractions › Additionner')).toBeInTheDocument();
	});

	it('« Non rangé » est affiché tel quel', async () => {
		const screen = await renderWithPath('Non rangé');
		await expect.element(screen.getByText('Non rangé')).toBeInTheDocument();
	});

	it('sans chemin fourni : rien n’est inventé, et l’ancien thème n’apparaît plus', async () => {
		const screen = await renderWithPath(undefined);
		expect(screen.getByText('Rangé dans:').elements()).toHaveLength(0);
		expect(screen.getByText('Thème:').elements()).toHaveLength(0);
	});
});
