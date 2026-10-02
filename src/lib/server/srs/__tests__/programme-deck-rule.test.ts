/**
 * Paquet « Programme » : quels modèles peuvent y entrer ? (Q113)
 * ==============================================================
 *
 * Une seule règle, partagée par les trois endroits qui alimentent le paquet
 * (`/api/skill-attempts`, `recordSeriesReviews`, `/api/srs/review/submit`) :
 *
 * - le modèle doit être LISIBLE (ligne lue) et PUBLIÉ : un brouillon y serait une
 *   carte fantôme, la révision le relit avec les droits de l'élève ;
 * - une question de cours (`options.courseQuestion`, ou carte de cours) n'y
 *   entre jamais : elle a son paquet de chapitre (Q112).
 */

import { describe, it, expect } from 'vitest';
import { entersProgrammeDeck } from '../programme-deck-rule';

describe('entersProgrammeDeck', () => {
	it('question ordinaire publiée → entre dans le paquet', () => {
		expect(entersProgrammeDeck({ options: null, status: 'published' })).toBe(true);
	});

	it('brouillon → n’entre pas', () => {
		expect(entersProgrammeDeck({ options: null, status: 'draft' })).toBe(false);
	});

	it('modèle illisible (RLS, ligne absente) → n’entre pas', () => {
		expect(entersProgrammeDeck(null)).toBe(false);
		expect(entersProgrammeDeck(undefined)).toBe(false);
	});

	it('question de cours publiée → n’entre pas', () => {
		expect(entersProgrammeDeck({ options: { courseQuestion: true }, status: 'published' })).toBe(
			false
		);
	});

	it('carte de cours publiée → n’entre pas', () => {
		expect(entersProgrammeDeck({ options: { courseCard: true }, status: 'published' })).toBe(false);
	});
});
