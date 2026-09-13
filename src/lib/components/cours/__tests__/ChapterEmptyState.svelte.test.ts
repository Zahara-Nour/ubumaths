/**
 * Ce qu'un élève lit quand un chapitre ne lui montre rien.
 * =======================================================
 *
 * Depuis la publication au fur et à mesure, un onglet vide est le cas NORMAL :
 * le professeur prépare tout et libère au rythme du cours. « Aucun document
 * pour ce chapitre » se lisait comme un défaut — le chapitre paraissait cassé
 * ou abandonné.
 *
 * Deux exigences, et la seconde est une exigence de confidentialité :
 *
 * 1. le message dit que la matière **n'est pas encore donnée**, pas qu'elle
 *    n'existe pas ;
 * 2. il ne révèle **jamais** combien de contenus attendent en coulisse. La RLS
 *    les cache ; le texte ne doit pas les compter à sa place, sinon l'élève
 *    apprendrait qu'un contrôle se prépare.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ChapterEmptyState from '../ChapterEmptyState.svelte';

const texte = (container: HTMLElement) => container.textContent!.replace(/\s+/g, ' ').trim();

describe('ChapterEmptyState — dire « pas encore », pas « rien »', () => {
	it.each(['documents', 'quiz', 'exercises', 'worksheets', 'checklist', 'chapter'] as const)(
		'%s : annonce une attente, jamais un vide',
		(kind) => {
			const { container } = render(ChapterEmptyState, { kind });
			const t = texte(container);

			expect(t.length).toBeGreaterThan(0);
			// Une attente (« encore », « prépare », « à venir »), pas un manque sec.
			expect(t).toMatch(/encore|prépare|à venir|bientôt/i);
		}
	);

	it('ne révèle jamais un nombre de contenus non publiés', () => {
		for (const kind of ['documents', 'quiz', 'exercises', 'worksheets', 'checklist'] as const) {
			const { container } = render(ChapterEmptyState, { kind });
			// Aucun chiffre : l'élève ne doit pas déduire qu'un contrôle se prépare.
			expect(texte(container)).not.toMatch(/\d/);
		}
	});

	it('ne dit pas à l’élève que le chapitre est vide ou introuvable', () => {
		const { container } = render(ChapterEmptyState, { kind: 'chapter' });
		const t = texte(container);

		expect(t).not.toMatch(/vide|introuvable|erreur|aucun contenu/i);
	});
});
