import { describe, expect, it } from 'vitest';
import { translatedHintField, withTranslatedHint } from '../translation-draft';

/**
 * Les indices se traduisent champ par champ, indexés par leur id : c'est ce qui
 * garantit que les références {{hint:id}} de l'énoncé ne peuvent pas casser.
 * Comme pour l'énoncé, un champ vidé doit disparaître, et un exercice tapé puis
 * effacé doit redevenir indiscernable d'un exercice jamais traduit.
 */
describe('withTranslatedHint()', () => {
	it('crée la traduction à la première saisie', () => {
		expect(withTranslatedHint(undefined, 'pythagore', 'title', 'Pythagoras')).toEqual({
			en: { hints: { pythagore: { title: 'Pythagoras' } } }
		});
	});

	it('garde les autres champs du même indice', () => {
		const avant = { en: { hints: { h1: { title: 'Hint' } } } };

		expect(withTranslatedHint(avant, 'h1', 'content', 'Think about…')).toEqual({
			en: { hints: { h1: { title: 'Hint', content: 'Think about…' } } }
		});
	});

	it('garde les autres indices', () => {
		const avant = { en: { hints: { h1: { title: 'First' } } } };

		expect(withTranslatedHint(avant, 'h2', 'title', 'Second')).toEqual({
			en: { hints: { h1: { title: 'First' }, h2: { title: 'Second' } } }
		});
	});

	it("garde l'énoncé traduit quand on vide un indice", () => {
		const avant = {
			en: { statement_md: 'Work out', hints: { h1: { title: 'Hint' } } }
		};

		expect(withTranslatedHint(avant, 'h1', 'title', '')).toEqual({
			en: { statement_md: 'Work out' }
		});
	});

	it('ne laisse aucun conteneur vide quand la dernière traduction disparaît', () => {
		const avant = { en: { hints: { h1: { title: 'Hint' } } } };

		expect(withTranslatedHint(avant, 'h1', 'title', '')).toBeUndefined();
	});

	it('traite les espaces comme du vide', () => {
		expect(withTranslatedHint(undefined, 'h1', 'title', '   ')).toBeUndefined();
	});

	it("ne modifie pas la valeur qu'on lui donne", () => {
		const avant = { en: { hints: { h1: { title: 'Hint' } } } };

		withTranslatedHint(avant, 'h1', 'content', 'Think');

		expect(avant).toEqual({ en: { hints: { h1: { title: 'Hint' } } } });
	});
});

describe('translatedHintField()', () => {
	it('rend le texte, ou une chaîne vide', () => {
		const t = { en: { hints: { h1: { title: 'Hint' } } } };

		expect(translatedHintField(t, 'h1', 'title')).toBe('Hint');
		expect(translatedHintField(t, 'h1', 'content')).toBe('');
		expect(translatedHintField(t, 'inconnu', 'title')).toBe('');
		expect(translatedHintField(undefined, 'h1', 'title')).toBe('');
	});
});
