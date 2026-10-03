/**
 * Paquet de révision CALCULÉ d'un chapitre (questions de cours, étape 3)
 * =====================================================================
 *
 * Comportements validés par David (2026-10-03) : N2 (questions PUBLIÉES des
 * catégories des séries publiées), N3 (dues + au plus 10 nouvelles), N6 (union
 * sans doublon), L2 (brouillon exclu), L4 (catégorie sans question ignorée).
 *
 * Le calcul est pur ; la lecture passe par un faux client qui enregistre les
 * filtres : la RLS fait le gros du tri, mais le code ne doit pas s'y reposer en
 * silence (chapitre visible, rattachement publié, modèle publié).
 */
import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { CartItem } from '$lib/stores/questionCart.svelte';
import {
	CHAPTER_SESSION_NEW_LIMIT,
	loadChapterDecks,
	resolveDeckTemplateIds,
	selectChapterSession,
	type DeckTemplateRow
} from '../chapter-deck';

// Types
type Call = { table: string; method: string; args: unknown[] };

// Constantes
const NOW = new Date('2026-10-03T10:00:00Z');
const PAST = '2026-10-02T10:00:00Z';
const FUTURE = '2026-10-05T10:00:00Z';

const catA = { theme: 'Fonctions', domain: 'Étude', subdomain: 'Méthode', level: 1 };
const catB = { theme: 'Fonctions', domain: 'Dérivation', subdomain: null, level: 2 };
const catEmpty = { theme: 'Géométrie', domain: 'Vide', subdomain: null, level: 1 };

// Functions
function item(category: CartItem['category'], quantity = 3): CartItem {
	return { category, quantity, delay: 20 };
}

function template(
	id: string,
	category: CartItem['category'],
	status: string = 'published'
): DeckTemplateRow {
	return { id, ...category, status };
}

/** Faux client : rend les lignes de chaque table et enregistre chaque appel. */
function fakeClient(tables: Record<string, unknown[]>, calls: Call[]) {
	return {
		from(table: string) {
			const builder: Record<string, unknown> = {};
			for (const method of ['select', 'eq', 'in', 'not', 'lte', 'order', 'is']) {
				builder[method] = (...args: unknown[]) => {
					calls.push({ table, method, args });
					return builder;
				};
			}
			builder.then = (resolve: (value: unknown) => unknown) =>
				resolve({ data: tables[table] ?? [], error: null });
			return builder;
		}
	} as unknown as SupabaseClient<Database>;
}

describe('resolveDeckTemplateIds — contenu du paquet', () => {
	const templates = [
		template('a1', catA),
		template('a2', catA),
		template('a3', catA, 'draft'),
		template('b1', catB),
		template('x1', { ...catA, level: 3 })
	];

	it('N2 : toutes les questions publiées des catégories, pas la quantité de la série', () => {
		expect(resolveDeckTemplateIds([[item(catA, 1)]], templates)).toEqual(['a1', 'a2']);
	});

	it('L2 : un modèle repassé en brouillon sort du paquet', () => {
		expect(resolveDeckTemplateIds([[item(catA)]], templates)).not.toContain('a3');
	});

	it('N6 : plusieurs séries → union sans doublon', () => {
		const ids = resolveDeckTemplateIds(
			[[item(catA), item(catB)], [item(catB)], [item(catA)]],
			templates
		);
		expect(ids).toEqual(['a1', 'a2', 'b1']);
	});

	it('L4 : une catégorie sans question publiée est ignorée', () => {
		expect(resolveDeckTemplateIds([[item(catEmpty), item(catB)]], templates)).toEqual(['b1']);
	});

	it('L4 : aucune question → paquet vide', () => {
		expect(resolveDeckTemplateIds([[item(catEmpty)]], templates)).toEqual([]);
		expect(resolveDeckTemplateIds([], templates)).toEqual([]);
	});

	it('sous-domaine absent : null et chaîne vide se valent (même résolution que la série)', () => {
		const sansSousDomaine = { ...template('b2', catB), subdomain: '' };
		expect(resolveDeckTemplateIds([[item(catB)]], [sansSousDomaine])).toEqual(['b2']);
	});
});

describe('selectChapterSession — séance du jour', () => {
	it('N3 : les dues (échéance passée), puis les nouvelles jamais vues', () => {
		const session = selectChapterSession(
			['a', 'b', 'c', 'd'],
			[
				{ card_reference_id: 'a', next_review: FUTURE },
				{ card_reference_id: 'b', next_review: PAST }
			],
			NOW
		);
		expect(session).toEqual({ due: ['b'], fresh: ['c', 'd'] });
	});

	it('N3 : au plus 10 nouvelles', () => {
		const ids = Array.from({ length: 15 }, (_, i) => `n${i}`);
		const session = selectChapterSession(ids, [], NOW);
		expect(CHAPTER_SESSION_NEW_LIMIT).toBe(10);
		expect(session.fresh).toEqual(ids.slice(0, 10));
		expect(session.due).toEqual([]);
	});

	it('N3 : toutes les dues, même au-delà de 10, les plus en retard d’abord', () => {
		const ids = Array.from({ length: 12 }, (_, i) => `d${i}`);
		const stats = ids.map((id, i) => ({
			card_reference_id: id,
			next_review: new Date(NOW.getTime() - (i + 1) * 60_000).toISOString()
		}));
		const session = selectChapterSession(ids, stats, NOW);
		expect(session.due).toHaveLength(12);
		expect(session.due[0]).toBe('d11');
	});

	it('une fiche d’un modèle HORS du paquet ne compte pas (mémoire partagée avec le Programme)', () => {
		const session = selectChapterSession(
			['a'],
			[{ card_reference_id: 'z', next_review: PAST }],
			NOW
		);
		expect(session).toEqual({ due: [], fresh: ['a'] });
	});

	it('L3 : rien de dû ni de nouveau → séance vide', () => {
		const session = selectChapterSession(
			['a'],
			[{ card_reference_id: 'a', next_review: FUTURE }],
			NOW
		);
		expect(session).toEqual({ due: [], fresh: [] });
	});
});

describe('loadChapterDecks — lecture aux droits de l’élève', () => {
	const series = [
		{ id: 's1', categories: [item(catA)] },
		{ id: 's2', categories: [item(catB)] }
	];

	function decor() {
		return {
			class_chapters: [
				{ id: 'c1', title: 'Fonctions' },
				{ id: 'c2', title: 'Sans série' }
			],
			chapter_series: [
				{ chapter_id: 'c1', series_id: 's1' },
				{ chapter_id: 'c1', series_id: 's2' }
			],
			series,
			question_templates: [
				template('a1', catA),
				template('b1', catB),
				template('a3', catA, 'draft')
			]
		};
	}

	it('N2/N6 : un paquet par chapitre visible, union des séries, brouillon exclu', async () => {
		const calls: Call[] = [];
		const decks = await loadChapterDecks(fakeClient(decor(), calls), { now: NOW });
		expect(decks).toEqual([
			{ chapterId: 'c1', title: 'Fonctions', seriesCount: 2, templateIds: ['a1', 'b1'] },
			{ chapterId: 'c2', title: 'Sans série', seriesCount: 0, templateIds: [] }
		]);
	});

	it('ne compte que les chapitres VISIBLES, les rattachements PUBLIÉS et les modèles PUBLIÉS', async () => {
		const calls: Call[] = [];
		await loadChapterDecks(fakeClient(decor(), calls), { now: NOW });
		const has = (table: string, method: string, args: unknown[]) =>
			calls.some(
				(c) =>
					c.table === table &&
					c.method === method &&
					JSON.stringify(c.args) === JSON.stringify(args)
			);
		expect(has('class_chapters', 'eq', ['is_visible', true])).toBe(true);
		expect(has('chapter_series', 'not', ['published_at', 'is', null])).toBe(true);
		expect(has('chapter_series', 'lte', ['published_at', NOW.toISOString()])).toBe(true);
		expect(has('question_templates', 'eq', ['status', 'published'])).toBe(true);
	});

	it('un seul chapitre demandé : filtre par identifiant', async () => {
		const calls: Call[] = [];
		await loadChapterDecks(fakeClient(decor(), calls), { now: NOW, chapterId: 'c1' });
		expect(
			calls.some((c) => c.table === 'class_chapters' && c.method === 'eq' && c.args[0] === 'id')
		).toBe(true);
	});

	it('une série à la composition illisible est ignorée, pas fatale', async () => {
		const tables = { ...decor(), series: [{ id: 's1', categories: 'abîmé' }, series[1]] };
		const decks = await loadChapterDecks(fakeClient(tables, []), { now: NOW });
		expect(decks[0].templateIds).toEqual(['b1']);
	});

	it('aucun chapitre visible → aucune autre lecture', async () => {
		const calls: Call[] = [];
		const decks = await loadChapterDecks(fakeClient({ class_chapters: [] }, calls), { now: NOW });
		expect(decks).toEqual([]);
		expect(calls.every((c) => c.table === 'class_chapters')).toBe(true);
	});
});
