/**
 * Galerie des templates : un template partagé d'élève n'y figure jamais.
 */
import { describe, it, expect } from 'vitest';
import { filterGalleryTemplates } from '../notebook-template-gallery';

const MOI = 'prof-1';

const template = (id: string, author_id: string, is_public: boolean, role: string | null) => ({
	id,
	author_id,
	is_public,
	profiles: role === null ? null : { role }
});

describe('filterGalleryTemplates', () => {
	it('écarte le template public d’un élève', () => {
		const eleve = template('t-eleve', 'eleve-1', true, 'student');
		expect(filterGalleryTemplates([eleve], MOI)).toEqual([]);
	});

	it('écarte un template public dont l’auteur est illisible', () => {
		expect(filterGalleryTemplates([template('t-x', 'inconnu', true, null)], MOI)).toEqual([]);
	});

	it('garde les templates publics d’un prof ou d’un admin', () => {
		const prof = template('t-prof', 'prof-2', true, 'teacher');
		const admin = template('t-admin', 'admin-1', true, 'admin');
		expect(filterGalleryTemplates([prof, admin], MOI)).toEqual([prof, admin]);
	});

	it('garde toujours les siens, même privés', () => {
		const mien = template('t-mien', MOI, false, 'teacher');
		expect(filterGalleryTemplates([mien], MOI)).toEqual([mien]);
	});

	it('écarte un template privé d’un autre prof', () => {
		expect(filterGalleryTemplates([template('t-p', 'prof-2', false, 'teacher')], MOI)).toEqual([]);
	});
});
