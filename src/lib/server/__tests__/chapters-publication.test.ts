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
const PROF = '22222222-2222-4222-8222-222222222222';
const CLASSE = '33333333-3333-4333-8333-333333333333';
const FICHE = '44444444-4444-4444-8444-444444444444';

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('setContentPublication — les cinq types de contenu', () => {
	it.each([
		['document', 'chapter_documents'],
		['exercise', 'chapter_exercises'],
		['checklist', 'chapter_checklist_items'],
		['quiz', 'chapter_quiz_questions']
	])('%s vise la table %s', async (type, table) => {
		const { setContentPublication } = await import('../chapters-publication');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { id: ELEMENT, chapter_id: CHAPITRE }, 'single');

		const { error } = await setContentPublication(
			{ contentType: type as never, itemId: ELEMENT, published: true, teacherId: PROF },
			supabase as never
		);

		expect(error).toBeNull();
		expect(supabase.from).toHaveBeenCalledWith(table);
	});

	it('refuse un type inconnu sans jamais toucher à la base', async () => {
		const { setContentPublication } = await import('../chapters-publication');
		const supabase = createMockSupabase();

		const { data, error } = await setContentPublication(
			{ contentType: 'profiles' as never, itemId: ELEMENT, published: true, teacherId: PROF },
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
			{ contentType: 'document', itemId: ELEMENT, published: true, teacherId: PROF },
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
			{ contentType: 'quiz', itemId: ELEMENT, published: false, teacherId: PROF },
			supabase as never
		);

		expect(supabase._mockChain.update).toHaveBeenCalledWith({ published_at: null });
	});

	it('remonte une panne au lieu de laisser croire que c’est publié', async () => {
		const { setContentPublication } = await import('../chapters-publication');
		const supabase = createMockSupabase();
		mockError(supabase, 'connexion perdue', 'single', '08006');

		const { data, error } = await setContentPublication(
			{ contentType: 'document', itemId: ELEMENT, published: true, teacherId: PROF },
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
			{ contentType: 'document', itemId: ELEMENT, published: true, teacherId: PROF },
			supabase as never
		);

		expect(data).toBeNull();
		expect(error?.message).toMatch(/introuvable|trouv/i);
	});
});

describe('publier une fiche la distribue', () => {
	/** Le chapitre, sa classe, et la fiche visée. */
	function lienDeFiche(supabase: ReturnType<typeof createMockSupabase>) {
		mockSuccess(
			supabase,
			{ id: ELEMENT, worksheet_id: FICHE, chapter: { class_id: CLASSE } },
			'single'
		);
	}

	it('crée l’affectation à la classe du chapitre, puis publie', async () => {
		const { setContentPublication } = await import('../chapters-publication');
		const supabase = createMockSupabase();
		lienDeFiche(supabase);
		mockSuccess(supabase, [], 'then'); // aucune affectation existante
		mockSuccess(supabase, { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }, 'single'); // brouillon créé
		mockSuccess(supabase, null, 'then'); // lien vers la classe
		mockSuccess(supabase, null, 'then'); // activation
		mockSuccess(supabase, { id: ELEMENT, chapter_id: CHAPITRE }, 'single'); // publication

		const { error } = await setContentPublication(
			{ contentType: 'worksheet', itemId: ELEMENT, published: true, teacherId: PROF },
			supabase as never
		);

		expect(error).toBeNull();
		expect(supabase.from).toHaveBeenCalledWith('worksheet_assignments');
		expect(supabase.from).toHaveBeenCalledWith('worksheet_assignment_classes');

		// Créée en BROUILLON : une affectation active dont le lien de classe
		// échouerait serait indélébile (la policy DELETE ne vise que les
		// brouillons). L'activation vient en dernier.
		const affectation = supabase._mockChain.insert.mock.calls
			.map((c) => c[0] as Record<string, unknown>)
			.find((row) => 'worksheet_id' in row);
		expect(affectation?.status).toBe('draft');
		expect(affectation?.created_by).toBe(PROF);
		expect(supabase._mockChain.update).toHaveBeenCalledWith({ status: 'active' });
	});

	it('ne crée pas une seconde affectation si la classe en a déjà une', async () => {
		const { setContentPublication } = await import('../chapters-publication');
		const supabase = createMockSupabase();
		lienDeFiche(supabase);
		mockSuccess(supabase, [{ worksheet_id: FICHE }], 'then'); // déjà distribuée
		mockSuccess(supabase, { id: ELEMENT, chapter_id: CHAPITRE }, 'single');

		const { error } = await setContentPublication(
			{ contentType: 'worksheet', itemId: ELEMENT, published: true, teacherId: PROF },
			supabase as never
		);

		expect(error).toBeNull();
		const affectationsCreees = supabase._mockChain.insert.mock.calls.filter(
			(c) => 'worksheet_id' in (c[0] as object)
		);
		expect(affectationsCreees).toHaveLength(0);
	});

	/**
	 * Marquer « publiée » une fiche que personne n'a reçue serait le mensonge
	 * que ce chantier passe son temps à corriger : le professeur croirait
	 * l'avoir donnée.
	 */
	it('ne publie PAS si la distribution échoue', async () => {
		const { setContentPublication } = await import('../chapters-publication');
		const supabase = createMockSupabase();
		lienDeFiche(supabase);
		mockSuccess(supabase, [], 'then');
		mockError(supabase, 'insertion refusée', 'single', '23503'); // affectation KO

		const { data, error } = await setContentPublication(
			{ contentType: 'worksheet', itemId: ELEMENT, published: true, teacherId: PROF },
			supabase as never
		);

		expect(data).toBeNull();
		expect(error).not.toBeNull();
		expect(supabase._mockChain.update).not.toHaveBeenCalled();
	});

	/**
	 * Tranché par David : dépublier retire la fiche du chapitre mais LAISSE
	 * l'affectation. L'élève la garde dans « Mon travail » — on n'interrompt
	 * jamais un travail en cours.
	 */
	it('dépublier ne touche pas à l’affectation', async () => {
		const { setContentPublication } = await import('../chapters-publication');
		const supabase = createMockSupabase();
		mockSuccess(supabase, { id: ELEMENT, chapter_id: CHAPITRE }, 'single');

		const { error } = await setContentPublication(
			{ contentType: 'worksheet', itemId: ELEMENT, published: false, teacherId: PROF },
			supabase as never
		);

		expect(error).toBeNull();
		expect(supabase.from).not.toHaveBeenCalledWith('worksheet_assignments');
		expect(supabase._mockChain.update).toHaveBeenCalledWith({ published_at: null });
	});
});

describe('la définition de « distribuée » — une seule, partagée', () => {
	/**
	 * `student_has_worksheet_access` exige AUSSI `available_from <= now()`. Sans
	 * cette condition ici, une fiche programmée pour lundi prochain serait dite
	 * « déjà distribuée » : rien ne partirait, et le badge afficherait « visible
	 * par les élèves » pour une fiche que personne ne peut ouvrir.
	 */
	it('exige un statut actif ET une ouverture déjà échue', async () => {
		const { listDistributedWorksheetIds } = await import('../chapters-publication');
		const supabase = createMockSupabase();
		mockSuccess(supabase, [{ worksheet_id: FICHE }], 'then');

		await listDistributedWorksheetIds([FICHE], CLASSE, supabase as never);

		expect(supabase._mockChain.eq).toHaveBeenCalledWith('status', 'active');
		const filtreOu = supabase._mockChain.or.mock.calls[0]?.[0] as string;
		expect(filtreOu).toContain('available_from');
	});

	/**
	 * Rien n'interdit deux affectations actives de la même fiche à la même
	 * classe. `maybeSingle()` lève `PGRST116` dès la deuxième ligne : la fiche
	 * serait devenue DÉFINITIVEMENT impubliable.
	 */
	it('supporte plusieurs affectations sans échouer', async () => {
		const { listDistributedWorksheetIds } = await import('../chapters-publication');
		const supabase = createMockSupabase();
		mockSuccess(supabase, [{ worksheet_id: FICHE }, { worksheet_id: FICHE }], 'then');

		const { data, error } = await listDistributedWorksheetIds([FICHE], CLASSE, supabase as never);

		expect(error).toBeNull();
		expect(data?.has(FICHE)).toBe(true);
	});

	it("n'interroge pas la base sans fiche à vérifier", async () => {
		const { listDistributedWorksheetIds } = await import('../chapters-publication');
		const supabase = createMockSupabase();

		const { data } = await listDistributedWorksheetIds([], CLASSE, supabase as never);

		expect(data?.size).toBe(0);
		expect(supabase.from).not.toHaveBeenCalled();
	});
});
