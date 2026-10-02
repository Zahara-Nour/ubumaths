/**
 * Actions « séries du chapitre » de la page professeur
 * ====================================================
 *
 * Ce que la page garantit AVANT d'écrire : les identifiants sont des UUID, la
 * forme est bornée (Q124 a), et chaque échec du module devient le bon `fail()` —
 * jamais un « succès » : introuvable / refusé (zéro ligne, RLS) → 404, doublon →
 * 409, série supprimée entre-temps (23503) → 409. Q129 (b) : une série encore
 * utilisée par une évaluation non terminée se rattache, avec un avertissement.
 *
 * Le module d'écriture est simulé : son comportement réel sous RLS est prouvé
 * par `tests/integration/series-de-chapitre.test.ts`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const linkSeries = vi.fn();
const setSeriesForm = vi.fn();
const unlinkSeries = vi.fn();
const findOngoingEvaluation = vi.fn();

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn(async () => ({ user: { id: 'prof' } }))
}));
vi.mock('$lib/server/chapter-series', () => ({
	linkSeries: (...args: unknown[]) => linkSeries(...args),
	setSeriesForm: (...args: unknown[]) => setSeriesForm(...args),
	unlinkSeries: (...args: unknown[]) => unlinkSeries(...args),
	findOngoingEvaluation: (...args: unknown[]) => findOngoingEvaluation(...args),
	listChapterSeries: vi.fn(),
	listAvailableSeries: vi.fn()
}));

const { actions } = await import('../+page.server');

const CHAPITRE = '11111111-1111-4111-8111-111111111111';
const SERIE = '22222222-2222-4222-8222-222222222222';
const LIEN = '33333333-3333-4333-8333-333333333333';

type ActionEvent = Parameters<NonNullable<typeof actions.linkSeries>>[0];

function evenement(champs: Record<string, string>, chapterId = CHAPITRE): ActionEvent {
	const body = new FormData();
	for (const [cle, valeur] of Object.entries(champs)) body.set(cle, valeur);
	return {
		request: new Request('http://localhost/x', { method: 'POST', body }),
		locals: { supabase: {} },
		params: { classId: 'classe', chapterId }
	} as unknown as ActionEvent;
}

/** Le statut d'un `fail()`, ou `null` si l'action a réussi. */
function statut(resultat: unknown): number | null {
	const r = resultat as { status?: number };
	return typeof r?.status === 'number' ? r.status : null;
}

/** Une erreur du module, telle que `ChapterSeriesError` la porte. */
function echec(kind: string) {
	return Object.assign(new Error(kind), { kind });
}

beforeEach(() => {
	findOngoingEvaluation.mockReset();
	findOngoingEvaluation.mockResolvedValue({ data: false, error: null });
	linkSeries.mockReset();
	setSeriesForm.mockReset();
	unlinkSeries.mockReset();
});

describe('linkSeries', () => {
	it('rattache en flash par défaut, sans section', async () => {
		linkSeries.mockResolvedValue({ data: { id: LIEN }, error: null });
		const r = await actions.linkSeries!(evenement({ seriesId: SERIE }));
		expect(statut(r)).toBeNull();
		expect(r).toMatchObject({ success: true, action: 'linkSeries' });
		expect(linkSeries).toHaveBeenCalledWith(CHAPITRE, SERIE, 'flash', 'prof', {});
		expect(r).not.toHaveProperty('warning');
	});

	it('transmet la forme entraînement', async () => {
		linkSeries.mockResolvedValue({ data: { id: LIEN }, error: null });
		await actions.linkSeries!(evenement({ seriesId: SERIE, form: 'interactive' }));
		expect(linkSeries).toHaveBeenCalledWith(CHAPITRE, SERIE, 'interactive', 'prof', {});
	});

	it.each([[{ seriesId: 'pas-un-uuid' }], [{ seriesId: SERIE, form: 'course' }], [{}]])(
		'400 sans rien écrire : %j',
		async (champs) => {
			const r = await actions.linkSeries!(evenement(champs as Record<string, string>));
			expect(statut(r)).toBe(400);
			expect(linkSeries).not.toHaveBeenCalled();
		}
	);

	it('400 sur un chapitre qui n’est pas un UUID', async () => {
		const r = await actions.linkSeries!(evenement({ seriesId: SERIE }, 'nope'));
		expect(statut(r)).toBe(400);
		expect(linkSeries).not.toHaveBeenCalled();
	});

	it('doublon : 409 qui le dit', async () => {
		linkSeries.mockResolvedValue({ data: null, error: echec('duplicate') });
		const r = await actions.linkSeries!(evenement({ seriesId: SERIE }));
		expect(statut(r)).toBe(409);
		expect(JSON.stringify(r)).toContain('déjà dans le chapitre');
	});

	it('série d’un autre ou introuvable : 404', async () => {
		linkSeries.mockResolvedValue({ data: null, error: echec('not_found') });
		expect(statut(await actions.linkSeries!(evenement({ seriesId: SERIE })))).toBe(404);
	});

	it('série supprimée entre-temps (23503) : 409 « n’existe plus »', async () => {
		linkSeries.mockResolvedValue({ data: null, error: echec('series_gone') });
		const r = await actions.linkSeries!(evenement({ seriesId: SERIE }));
		expect(statut(r)).toBe(409);
		expect(JSON.stringify(r)).toContain('Cette série n’existe plus.');
	});

	it('panne de base : 500, pas un succès', async () => {
		linkSeries.mockResolvedValue({ data: null, error: echec('db') });
		expect(statut(await actions.linkSeries!(evenement({ seriesId: SERIE })))).toBe(500);
	});

	it('Q129 (b) : série d’une évaluation non terminée → rattachée, avec avertissement', async () => {
		linkSeries.mockResolvedValue({ data: { id: LIEN }, error: null });
		findOngoingEvaluation.mockResolvedValue({ data: true, error: null });
		const r = await actions.linkSeries!(evenement({ seriesId: SERIE }));
		expect(r).toMatchObject({
			success: true,
			warning:
				'Cette série est aussi celle d’une évaluation en cours : tes élèves pourront s’entraîner dessus avant.'
		});
		expect(findOngoingEvaluation).toHaveBeenCalledWith(SERIE, {});
	});

	it('Q129 : lecture des évaluations en panne → rattaché quand même, sans avertissement inventé', async () => {
		linkSeries.mockResolvedValue({ data: { id: LIEN }, error: null });
		findOngoingEvaluation.mockResolvedValue({ data: null, error: echec('db') });
		const r = await actions.linkSeries!(evenement({ seriesId: SERIE }));
		expect(r).toMatchObject({ success: true });
		expect(r).not.toHaveProperty('warning');
	});
});

describe('setSeriesForm / unlinkSeries', () => {
	it('changer la forme : validé puis transmis', async () => {
		setSeriesForm.mockResolvedValue({ error: null });
		const r = await actions.setSeriesForm!(
			evenement({ chapterSeriesId: LIEN, form: 'interactive' })
		);
		expect(r).toMatchObject({ success: true });
		expect(setSeriesForm).toHaveBeenCalledWith(CHAPITRE, LIEN, 'interactive', {});
	});

	it('forme hors liste : 400', async () => {
		const r = await actions.setSeriesForm!(evenement({ chapterSeriesId: LIEN, form: 'display' }));
		expect(statut(r)).toBe(400);
		expect(setSeriesForm).not.toHaveBeenCalled();
	});

	it('zéro ligne modifiée (RLS) : 404', async () => {
		setSeriesForm.mockResolvedValue({ error: echec('not_found') });
		const r = await actions.setSeriesForm!(evenement({ chapterSeriesId: LIEN, form: 'flash' }));
		expect(statut(r)).toBe(404);
	});

	it('retirer : succès seulement si le module a supprimé', async () => {
		unlinkSeries.mockResolvedValue({ error: null });
		expect(await actions.unlinkSeries!(evenement({ chapterSeriesId: LIEN }))).toMatchObject({
			success: true
		});
		unlinkSeries.mockResolvedValue({ error: echec('not_found') });
		expect(statut(await actions.unlinkSeries!(evenement({ chapterSeriesId: LIEN })))).toBe(404);
		unlinkSeries.mockResolvedValue({ error: echec('db') });
		expect(statut(await actions.unlinkSeries!(evenement({ chapterSeriesId: LIEN })))).toBe(500);
	});

	it('retirer avec un identifiant invalide : 400', async () => {
		const r = await actions.unlinkSeries!(evenement({ chapterSeriesId: 'x' }));
		expect(statut(r)).toBe(400);
		expect(unlinkSeries).not.toHaveBeenCalled();
	});
});
