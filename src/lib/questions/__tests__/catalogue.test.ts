/**
 * Catalogue Automaths : rangement des modèles et aperçus à la demande
 * ===================================================================
 *
 * Le catalogue se range dans le navigateur (thème → domaine → sous-domaine,
 * ordre déclaré puis niveau) ; un aperçu n'est calculé que pour une rubrique
 * dépliée, une seule fois par modèle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QuestionTemplate } from '$lib/questions/types';

const generateInstance = vi.fn((template: QuestionTemplate, _seed: number) =>
	template.id === 'casse'
		? { success: false as const, errors: ['variable inconnue'] }
		: { success: true as const, instance: { templateId: template.id } }
);

vi.mock('$lib/questions/generator/instance-generator', () => ({
	generateInstance: (template: QuestionTemplate, seed: number) => generateInstance(template, seed)
}));

const { buildCatalogue, templatePreview, clearPreviewCache } = await import('../catalogue');
const { PREVIEW_SEED } = await import('../cart-preview');

function modele(
	id: string,
	theme: string,
	domain: string,
	subdomain: string | null,
	level: number
): QuestionTemplate {
	return { id, theme, domain, subdomain, level } as unknown as QuestionTemplate;
}

describe('buildCatalogue', () => {
	it('range par thème, domaine, sous-domaine, puis niveau croissant (10 après 2)', () => {
		const catalogue = buildCatalogue([
			modele('b10', 'Fonctions', 'Limites de fonctions', 'Limite en un point', 10),
			modele('a1', 'Fonctions', 'Limites de fonctions', 'Opérations sur les limites', 1),
			modele('b2', 'Fonctions', 'Limites de fonctions', 'Limite en un point', 2)
		]);

		expect(catalogue).toHaveLength(1);
		const domaine = catalogue[0].domains[0];
		expect(domaine.domain).toBe('Limites de fonctions');
		const enUnPoint = domaine.subdomains.find((s) => s.subdomain === 'Limite en un point');
		expect(enUnPoint?.templates.map((t) => t.id)).toEqual(['b2', 'b10']);
	});

	it('sous-domaine absent : null et chaîne vide forment une seule rubrique', () => {
		const catalogue = buildCatalogue([
			modele('x', 'Nombres', 'Entiers', null, 1),
			modele('y', 'Nombres', 'Entiers', '', 2)
		]);

		const subdomains = catalogue[0].domains[0].subdomains;
		expect(subdomains).toHaveLength(1);
		expect(subdomains[0].subdomain).toBeNull();
		expect(subdomains[0].templates.map((t) => t.id)).toEqual(['x', 'y']);
	});

	it('aucun modèle : catalogue vide', () => {
		expect(buildCatalogue([])).toEqual([]);
	});
});

describe('templatePreview', () => {
	beforeEach(() => {
		clearPreviewCache();
		generateInstance.mockClear();
	});

	it('calcule l’aperçu avec la graine du panier, une seule fois par modèle', () => {
		const m = modele('m1', 'Fonctions', 'Limites de fonctions', null, 1);

		const premier = templatePreview(m);
		const second = templatePreview(m);

		expect(premier).toEqual({ templateId: 'm1' });
		expect(second).toBe(premier);
		expect(generateInstance).toHaveBeenCalledTimes(1);
		expect(generateInstance).toHaveBeenCalledWith(m, PREVIEW_SEED);
	});

	it('aperçu impossible : null, sans relancer le calcul ni lever d’erreur', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const m = modele('casse', 'Fonctions', 'Limites de fonctions', null, 1);

		expect(templatePreview(m)).toBeNull();
		expect(templatePreview(m)).toBeNull();
		expect(generateInstance).toHaveBeenCalledTimes(1);
	});
});
