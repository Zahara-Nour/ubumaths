/**
 * Carnet d'élève lu par quelqu'un d'autre (décision de David, 2026-10-04) :
 * exécution interdite et rendu restreint quand l'auteur est un élève ET que le
 * lecteur n'est pas cet élève.
 */
import { describe, expect, it } from 'vitest';
import { isForeignStudentNotebook } from '../notebook-foreign-content';

describe('isForeignStudentNotebook', () => {
	it("prof qui ouvre le carnet public d'un élève : contenu étranger", () => {
		expect(
			isForeignStudentNotebook({ isOwner: false, viewerRole: 'teacher', authorRole: 'student' })
		).toBe(true);
	});

	it("rôle de l'auteur illisible (RLS) : repli fermé", () => {
		expect(
			isForeignStudentNotebook({ isOwner: false, viewerRole: 'teacher', authorRole: null })
		).toBe(true);
	});

	it('élève qui ouvre son propre carnet : pas étranger', () => {
		expect(
			isForeignStudentNotebook({ isOwner: true, viewerRole: 'student', authorRole: 'student' })
		).toBe(false);
	});

	it('élève qui ouvre un carnet ASSIGNÉ (auteur prof) : pas étranger, même rôle illisible', () => {
		expect(
			isForeignStudentNotebook({ isOwner: false, viewerRole: 'student', authorRole: null })
		).toBe(false);
	});

	it('élève lecteur non auteur dont l’auteur est VU comme élève : restreint (défense en profondeur)', () => {
		expect(
			isForeignStudentNotebook({ isOwner: false, viewerRole: 'student', authorRole: 'student' })
		).toBe(true);
	});

	it('prof qui ouvre son propre carnet ou celui de l’admin : pas étranger', () => {
		expect(
			isForeignStudentNotebook({ isOwner: true, viewerRole: 'teacher', authorRole: 'teacher' })
		).toBe(false);
		expect(
			isForeignStudentNotebook({ isOwner: false, viewerRole: 'teacher', authorRole: 'admin' })
		).toBe(false);
	});
});
