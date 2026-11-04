/**
 * Paquet de révision CALCULÉ d'un chapitre (questions de cours, étape 3)
 * =====================================================================
 *
 * Comportements validés par David (2026-10-03) : N2 (questions PUBLIÉES des
 * modèles des séries publiées), N3 (dues + au plus 10 nouvelles), N6 (union
 * sans doublon), L2 (brouillon exclu), L4 (modèle retiré ignoré).
 *
 * Le calcul est pur ; la lecture passe par un faux client qui enregistre les
 * filtres : la RLS fait le gros du tri, mais le code ne doit pas s'y reposer en
 * silence (chapitre visible, rattachement publié, modèle publié).
 */
import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { SeriesItem } from '$lib/validation/series';
import {
	CHAPTER_SESSION_NEW_LIMIT,
	MAX_DECK_TEMPLATES,
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

const A1 = '00000000-0000-4000-8000-0000000000a1';
const A2 = '00000000-0000-4000-8000-0000000000a2';
const A3 = '00000000-0000-4000-8000-0000000000a3';
const B1 = '00000000-0000-4000-8000-0000000000b1';
const X1 = '00000000-0000-4000-8000-0000000000c1';
/** Modèle qui n'existe pas (retiré, ou jamais publié) */
const VIDE = '00000000-0000-4000-8000-0000000000ff';

// Functions
function item(templateId: string, quantity = 3): SeriesItem {
	return { templateId, quantity, delay: 20 };
}

function template(id: string, status: string = 'published'): DeckTemplateRow {
	return { id, status };
}

/** Faux client : rend les lignes de chaque table et enregistre chaque appel. */
function fakeClient(tables: Record<string, unknown[]>, calls: Call[]) {
	return {
		from(table: string) {
			const builder: Record<string, unknown> = {};
			for (const method of ['select', 'eq', 'in', 'not', 'lte', 'order', 'is', 'or', 'limit']) {
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
	const templates = [template(A1), template(A2), template(A3, 'draft'), template(B1), template(X1)];

	it('N2 : les modèles publiés de la série, pas la quantité de la série', () => {
		expect(resolveDeckTemplateIds([[item(A1, 1), item(A2, 1)]], templates)).toEqual([A1, A2]);
	});

	it('L2 : un modèle repassé en brouillon sort du paquet', () => {
		expect(resolveDeckTemplateIds([[item(A1), item(A3)]], templates)).not.toContain(A3);
	});

	it('N6 : plusieurs séries → union sans doublon', () => {
		const ids = resolveDeckTemplateIds(
			[[item(A1), item(B1)], [item(B1)], [item(A1), item(A2)]],
			templates
		);
		expect(ids).toEqual([A1, B1, A2]);
	});

	it('L4 : un modèle absent des modèles publiés lus est ignoré', () => {
		expect(resolveDeckTemplateIds([[item(VIDE), item(B1)]], templates)).toEqual([B1]);
	});

	it('L4 : aucune question → paquet vide', () => {
		expect(resolveDeckTemplateIds([[item(VIDE)]], templates)).toEqual([]);
		expect(resolveDeckTemplateIds([], templates)).toEqual([]);
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
		{ id: 's1', categories: [item(A1)] },
		{ id: 's2', categories: [item(B1)] }
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
			question_templates: [template(A1), template(B1), template(A3, 'draft')]
		};
	}

	it('N2/N6 : un paquet par chapitre visible, union des séries, brouillon exclu', async () => {
		const calls: Call[] = [];
		const decks = await loadChapterDecks(fakeClient(decor(), calls), { now: NOW });
		expect(decks).toEqual([
			{ chapterId: 'c1', title: 'Fonctions', seriesCount: 2, templateIds: [A1, B1] },
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
		expect(decks[0].templateIds).toEqual([B1]);
	});

	it('aucun chapitre visible → aucune autre lecture', async () => {
		const calls: Call[] = [];
		const decks = await loadChapterDecks(fakeClient({ class_chapters: [] }, calls), { now: NOW });
		expect(decks).toEqual([]);
		expect(calls.every((c) => c.table === 'class_chapters')).toBe(true);
	});
});

describe('loadChapterDecks — filtre et plafond', () => {
	const decor = (templates: unknown[], items = [item(A1)]) => ({
		class_chapters: [{ id: 'c1', title: 'Fonctions' }],
		chapter_series: [{ chapter_id: 'c1', series_id: 's1' }],
		series: [{ id: 's1', categories: items }],
		question_templates: templates
	});

	it('lit les modèles par leurs identifiants (in), sans filtre de catégorie', async () => {
		const calls: Call[] = [];
		await loadChapterDecks(fakeClient(decor([template(A1)], [item(A1), item(B1)]), calls), {
			now: NOW
		});
		const templateCalls = calls.filter((c) => c.table === 'question_templates');
		expect(templateCalls.find((c) => c.method === 'in')?.args).toEqual(['id', [A1, B1]]);
		expect(templateCalls.some((c) => c.method === 'or')).toBe(false);
	});

	it('aucun modèle dans les séries : les modèles ne sont pas lus', async () => {
		const calls: Call[] = [];
		await loadChapterDecks(fakeClient(decor([], []), calls), { now: NOW });
		expect(calls.some((c) => c.table === 'question_templates')).toBe(false);
	});

	it('plafond atteint → erreur explicite, jamais une troncature silencieuse', async () => {
		const many = Array.from({ length: MAX_DECK_TEMPLATES }, (_, i) =>
			template(`00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
		);
		await expect(loadChapterDecks(fakeClient(decor(many), []), { now: NOW })).rejects.toThrow(
			/plafond/
		);
	});
});
