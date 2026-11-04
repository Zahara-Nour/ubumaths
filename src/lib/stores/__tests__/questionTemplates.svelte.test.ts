/**
 * Cache des modèles publiés, côté navigateur
 * ==========================================
 *
 * Les pages Automaths (catalogue, panier, test) ne reçoivent plus les modèles
 * de leur serveur : elles lisent ce cache, rempli UNE fois par onglet.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { questionTemplatesCache } from '../questionTemplates.svelte';

const API = '/api/questions/templates/all';

const NODES = [{ id: 'b1', kind: 'branch', name: 'Nombres', parent_id: null, position: 0 }];

function reponse(templates: Array<{ id: string }>, ok = true) {
	return { ok, json: async () => ({ templates, nodes: NODES }) } as Response;
}

describe('questionTemplatesCache', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		questionTemplatesCache.clear();
		fetchMock = vi.fn(async () => reponse([{ id: 'm1' }, { id: 'm2' }]));
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('charge la liste une fois, puis la garde', async () => {
		await questionTemplatesCache.fetchTemplates();
		await questionTemplatesCache.fetchTemplates();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(API);
		expect(questionTemplatesCache.templates.map((t) => t.id)).toEqual(['m1', 'm2']);
		expect(questionTemplatesCache.isLoaded).toBe(true);
	});

	it('garde l’arbre des notions reçu avec les modèles ; clear() l’oublie', async () => {
		await questionTemplatesCache.fetchTemplates();
		expect(questionTemplatesCache.nodes).toEqual(NODES);

		questionTemplatesCache.clear();
		expect(questionTemplatesCache.nodes).toEqual([]);
	});

	it('réponse sans arbre (cache de Vercel d’avant le déploiement) : relue une fois en contournant le cache', async () => {
		fetchMock
			.mockImplementationOnce(
				async () => ({ ok: true, json: async () => ({ templates: [{ id: 'm1' }] }) }) as Response
			)
			.mockImplementationOnce(async () => reponse([{ id: 'm1' }]));

		await questionTemplatesCache.fetchTemplates();

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[1][0]).toMatch(/^\/api\/questions\/templates\/all\?frais=\d+$/);
		expect(questionTemplatesCache.nodes).toEqual(NODES);
	});

	it('deux pages qui demandent en même temps partagent la même lecture, et attendent ses données', async () => {
		const premiere = questionTemplatesCache.fetchTemplates();
		const seconde = questionTemplatesCache.fetchTemplates();
		await seconde;

		// La seconde ne rend la main qu'avec les données (pas un retour à vide)
		expect(questionTemplatesCache.templates).toHaveLength(2);
		await premiere;
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('après invalidate(), relit la liste en contournant le cache de Vercel', async () => {
		await questionTemplatesCache.fetchTemplates();
		questionTemplatesCache.invalidate();
		fetchMock.mockResolvedValueOnce(reponse([{ id: 'm3' }]));

		await questionTemplatesCache.fetchTemplates();

		expect(fetchMock).toHaveBeenCalledTimes(2);
		const url = String(fetchMock.mock.calls[1][0]);
		expect(url.startsWith(`${API}?`), 'adresse distincte pour ne pas lire la copie de Vercel').toBe(
			true
		);
		expect(questionTemplatesCache.templates.map((t) => t.id)).toEqual(['m3']);

		// Relue : la suivante reprend l'adresse commune
		await questionTemplatesCache.fetchTemplates();
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('invalidate() pendant une lecture : la liste reçue ne la fait pas oublier', async () => {
		let terminer: (r: Response) => void = () => {};
		fetchMock.mockImplementationOnce(() => new Promise<Response>((r) => (terminer = r)));

		const enVol = questionTemplatesCache.fetchTemplates();
		questionTemplatesCache.invalidate(); // un modèle enregistré pendant la lecture
		terminer(reponse([{ id: 'ancien' }]));
		await enVol;

		fetchMock.mockResolvedValueOnce(reponse([{ id: 'nouveau' }]));
		await questionTemplatesCache.fetchTemplates();

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(String(fetchMock.mock.calls[1][0]).startsWith(`${API}?`)).toBe(true);
		expect(questionTemplatesCache.templates.map((t) => t.id)).toEqual(['nouveau']);
	});

	it('échec de lecture : erreur exposée, liste non marquée comme chargée', async () => {
		fetchMock.mockResolvedValueOnce(reponse([], false));
		vi.spyOn(console, 'error').mockImplementation(() => {});

		await questionTemplatesCache.fetchTemplates();

		expect(questionTemplatesCache.error).not.toBeNull();
		expect(questionTemplatesCache.isLoaded).toBe(false);
	});
});
