/**
 * MathouNewsCard — nouveautés de la Chatterie en fin de séance (spec du
 * 2026-10-21, docs/wip/mathoux-annonce-progress.md) : 3 au plus puis « Et N
 * autres », une seule phrase au premier passage, rien sans nouveauté.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MathouNewsCard from '../MathouNewsCard.svelte';
import type { MathouNews, MathouNewsItem } from '$lib/mathoux/news';

function item(notionId: string, over: Partial<MathouNewsItem> = {}): MathouNewsItem {
	return {
		kind: 'birth',
		notionId,
		name: `Nom ${notionId}`,
		raceIndex: 0,
		stage: 'chaton',
		newStars: [],
		...over
	};
}

function textOf(container: HTMLElement): string {
	return (container.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('MathouNewsCard', () => {
	it('liste les nouveautés, chacune avec son dessin, puis le reste et le lien', async () => {
		const news: MathouNews = {
			firstVisit: false,
			total: 5,
			items: [
				item('a'),
				item('b', { kind: 'growth', stage: 'matou' }),
				item('c', { kind: 'star', stage: 'grand_matou', newStars: ['2'] })
			]
		};
		const { container } = await render(MathouNewsCard, { news });
		const text = textOf(container);
		expect(text).toContain('Un chaton est né à la Chatterie : Nom a !');
		expect(text).toContain('Nom b est devenu un matou !');
		expect(text).toContain('Nom c gagne l’étoile ★ 2nde !');
		expect(text).toContain('Et 2 autres nouveautés à la Chatterie.');
		expect(container.querySelectorAll('li svg[role="img"]')).toHaveLength(3);
		const link = container.querySelector('a');
		expect(link?.textContent?.trim()).toBe('Voir la Chatterie');
		expect(link?.getAttribute('href')).toBe('/dashboard/student/chatterie');
	});

	it('premier passage avec plusieurs Mathoux : une seule phrase, pas de liste', async () => {
		const news: MathouNews = { firstVisit: true, total: 7, items: [item('a'), item('b')] };
		const { container } = await render(MathouNewsCard, { news });
		expect(textOf(container)).toContain('7 Mathoux t’attendent à la Chatterie !');
		expect(container.querySelector('li')).toBeNull();
		expect(textOf(container)).not.toContain('Nom a');
	});

	it('premier passage avec un seul Mathou : sa phrase', async () => {
		const news: MathouNews = { firstVisit: true, total: 1, items: [item('a')] };
		const { container } = await render(MathouNewsCard, { news });
		expect(textOf(container)).toContain('Un chaton est né à la Chatterie : Nom a !');
	});

	it('pas de « et N autres » quand tout est montré', async () => {
		const news: MathouNews = { firstVisit: false, total: 1, items: [item('a')] };
		const { container } = await render(MathouNewsCard, { news });
		expect(textOf(container)).not.toContain('autre');
	});

	it('rien (null ou vide) → rien n’est rendu', async () => {
		const vide = await render(MathouNewsCard, { news: null });
		expect(vide.container.querySelector('section')).toBeNull();
		const zero = await render(MathouNewsCard, { news: { firstVisit: false, total: 0, items: [] } });
		expect(zero.container.querySelector('section')).toBeNull();
	});

	it('chaque nouveauté joue sa réaction : naissance, croissance depuis le stade d’avant, étoile', async () => {
		const news: MathouNews = {
			firstVisit: false,
			total: 3,
			items: [
				item('a'),
				item('b', { kind: 'growth', stage: 'grand_matou', previousStage: 'matou' }),
				item('c', { kind: 'star', stage: 'matou', newStars: ['4'] })
			]
		};
		const { container } = await render(MathouNewsCard, { news });
		const reactions = [...container.querySelectorAll('li svg .reaction')];
		expect(reactions.map((g) => g.getAttribute('data-reaction'))).toEqual([
			'apparition',
			'bond',
			'bond'
		]);
		// croissance : le dessin se transforme ; étoile : un simple bond
		expect(reactions[1].getAttribute('data-morph')).toBe('true');
		expect(reactions[2].hasAttribute('data-morph')).toBe(false);
		// confettis : naissance et croissance, pas l’étoile
		const confetti = [...container.querySelectorAll('li')].map(
			(li) => li.querySelectorAll('.confetto').length
		);
		expect(confetti[0]).toBeGreaterThan(0);
		expect(confetti[1]).toBeGreaterThan(0);
		expect(confetti[2]).toBe(0);
	});

	it('réveil : le Mathou joue la scène du réveil', async () => {
		const news: MathouNews = {
			firstVisit: false,
			total: 1,
			items: [item('a', { kind: 'wake', stage: 'matou' })]
		};
		const { container } = await render(MathouNewsCard, { news });
		expect(textOf(container)).toContain('Nom a s’est réveillé !');
		const svg = container.querySelector('li svg');
		expect(svg?.querySelector('.reaction')?.getAttribute('data-reaction')).toBe('reveil');
		expect(svg?.querySelector('.bonnet-part')).not.toBeNull();
	});

	it('premier passage : le Mathou est là, sans réaction', async () => {
		const news: MathouNews = { firstVisit: true, total: 7, items: [item('a'), item('b')] };
		const { container } = await render(MathouNewsCard, { news });
		expect(container.querySelector('svg .reaction')?.hasAttribute('data-reaction')).toBe(false);
	});
});
