/**
 * Liste des modèles du dialogue « Créer depuis un modèle »
 * ========================================================
 *
 * Le serveur refuse d'instancier un brouillon ou un modèle archivé. La liste
 * les montre quand même (le professeur sait qu'ils existent), mais grisés et
 * nommés : on ne peut plus choisir un modèle voué au refus.
 */

import { describe, it, expect } from 'vitest';
import { templateSelectItems } from '../template-select-items';

describe('templateSelectItems', () => {
	it('un modèle publié : choisissable, titre seul', () => {
		expect(
			templateSelectItems([{ id: 'a', title: 'Fonctions', status: 'published', isOwner: true }])
		).toEqual([{ value: 'a', label: 'Fonctions', disabled: false }]);
	});

	it('un brouillon : grisé, marqué « brouillon »', () => {
		expect(
			templateSelectItems([{ id: 'b', title: 'Second degré', status: 'draft', isOwner: true }])
		).toEqual([{ value: 'b', label: 'Second degré (brouillon)', disabled: true }]);
	});

	it('un modèle archivé : grisé, marqué « archivé »', () => {
		expect(
			templateSelectItems([{ id: 'c', title: 'Vecteurs', status: 'archived', isOwner: true }])
		).toEqual([{ value: 'c', label: 'Vecteurs (archivé)', disabled: true }]);
	});

	it('le modèle public d’un autre garde sa mention « (public) »', () => {
		expect(
			templateSelectItems([{ id: 'd', title: 'Suites', status: 'published', isOwner: false }])
		).toEqual([{ value: 'd', label: 'Suites (public)', disabled: false }]);
	});
});
