/**
 * Publier / dépublier un contenu de chapitre.
 * ===========================================
 *
 * Cinq tables portent `published_at`, et le type de contenu arrive d'un
 * formulaire. C'est exactement la forme qui invite à écrire
 * `supabase.from(type)` — une injection de nom de table à un caractère près.
 * D'où une **table de correspondance fermée** : ce que le client envoie n'est
 * jamais un nom de table, seulement une clé qu'on y cherche.
 *
 * Deuxième invariant : publier écrit un horodatage, dépublier écrit `null`.
 * La policy compare `published_at <= now()`, donc une date future ne publie
 * rien — le code ne doit jamais inventer de date, il pose `now()`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase, mockSuccess, mockError } from 'tests/helpers';

const CHAPITRE = '99999999-9999-4999-8999-999999999999';
const ELEMENT = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('setContentPublication — les cinq types de contenu', () => {
	it.each([
		['document', 'chapter_documents'],
		['exercise', 'chapter_exercises'],
		['checklist', 'chapter_checklist_items'],
		['quiz', 'chapter_quiz_questions'],
		['worksheet', 'chapter_worksheets']
	])('%s vise la table %s', async (type, table) => {
		const { setContentPublication } = await import('../chapters-publication');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { id: ELEMENT, chapter_id: CHAPITRE }, 'single');

		const { error } = await setContentPublication(
			{ contentType: type as never, itemId: ELEMENT, published: true },
			supabase as never
		);

		expect(error).toBeNull();
		expect(supabase.from).toHaveBeenCalledWith(table);
	});

	it('refuse un type inconnu sans jamais toucher à la base', async () => {
		const { setContentPublication } = await import('../chapters-publication');
		const supabase = createMockSupabase();

		const { data, error } = await setContentPublication(
			{ contentType: 'profiles' as never, itemId: ELEMENT, published: true },
			supabase as never
		);

		expect(data).toBeNull();
		expect(error).not.toBeNull();
		expect(supabase.from).not.toHaveBeenCalled();
	});
});

describe('setContentPublication — ce qui est écrit', () => {
	it('publier pose une date déjà échue, jamais future', async () => {
		const { setContentPublication } = await import('../chapters-publication');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { id: ELEMENT, chapter_id: CHAPITRE }, 'single');

		const avant = Date.now();
		await setContentPublication(
			{ contentType: 'document', itemId: ELEMENT, published: true },
			supabase as never
		);
		const apres = Date.now();

		expect(supabase._mockChain.update).toHaveBeenCalledTimes(1);
		const ecrit = supabase._mockChain.update.mock.calls[0][0] as { published_at: string };
		const pose = new Date(ecrit.published_at).getTime();

		// La policy compare `published_at <= now()` : une date future ne
		// publierait rien, et le professeur croirait avoir publié.
		expect(pose).toBeGreaterThanOrEqual(avant - 1000);
		expect(pose).toBeLessThanOrEqual(apres + 1000);
	});

	it('dépublier écrit null', async () => {
		const { setContentPublication } = await import('../chapters-publication');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { id: ELEMENT, chapter_id: CHAPITRE }, 'single');

		await setContentPublication(
			{ contentType: 'quiz', itemId: ELEMENT, published: false },
			supabase as never
		);

		expect(supabase._mockChain.update).toHaveBeenCalledWith({ published_at: null });
	});

	it('remonte une panne au lieu de laisser croire que c’est publié', async () => {
		const { setContentPublication } = await import('../chapters-publication');
		const supabase = createMockSupabase();
		mockError(supabase, 'connexion perdue', 'single', '08006');

		const { data, error } = await setContentPublication(
			{ contentType: 'document', itemId: ELEMENT, published: true },
			supabase as never
		);

		expect(data).toBeNull();
		expect(error).not.toBeNull();
	});

	it('refuse un élément introuvable — la RLS ne rend rien s’il n’est pas à ce prof', async () => {
		const { setContentPublication } = await import('../chapters-publication');
		const supabase = createMockSupabase();
		// PGRST116 : aucune ligne mise à jour et rendue.
		mockError(supabase, 'no rows', 'single', 'PGRST116');

		const { data, error } = await setContentPublication(
			{ contentType: 'document', itemId: ELEMENT, published: true },
			supabase as never
		);

		expect(data).toBeNull();
		expect(error?.message).toMatch(/introuvable|trouv/i);
	});
});
