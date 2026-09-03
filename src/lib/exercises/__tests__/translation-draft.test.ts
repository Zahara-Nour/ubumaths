import { describe, expect, it } from 'vitest';
import { hasEnglishStatement, translatedField, withTranslatedField } from '../translation-draft';

describe('withTranslatedField()', () => {
	it('creates the translation on first input', () => {
		expect(withTranslatedField(undefined, 'statement_md', 'Work out 2 + 2')).toEqual({
			en: { statement_md: 'Work out 2 + 2' }
		});
	});

	it('keeps the other translated fields', () => {
		const before = { en: { solution_md: 'The answer is 4' } };

		expect(withTranslatedField(before, 'statement_md', 'Work out 2 + 2')).toEqual({
			en: { statement_md: 'Work out 2 + 2', solution_md: 'The answer is 4' }
		});
	});

	it('removes a field emptied by the teacher', () => {
		const before = { en: { statement_md: 'Work out 2 + 2', solution_md: 'The answer is 4' } };

		expect(withTranslatedField(before, 'statement_md', '')).toEqual({
			en: { solution_md: 'The answer is 4' }
		});
	});

	it('leaves no empty container once the last field is emptied', () => {
		const before = { en: { statement_md: 'Work out 2 + 2' } };

		// Typed then erased must be indistinguishable from never translated.
		expect(withTranslatedField(before, 'statement_md', '')).toBeUndefined();
	});

	it('treats whitespace as empty', () => {
		expect(withTranslatedField(undefined, 'statement_md', '   \n  ')).toBeUndefined();
	});

	it('does not mutate the value it was given', () => {
		const before = { en: { statement_md: 'Work out 2 + 2' } };

		withTranslatedField(before, 'solution_md', 'The answer is 4');

		expect(before).toEqual({ en: { statement_md: 'Work out 2 + 2' } });
	});
});

describe('translatedField()', () => {
	it('returns the text, or an empty string when absent', () => {
		expect(translatedField({ en: { statement_md: 'Work out' } }, 'statement_md')).toBe('Work out');
		expect(translatedField({ en: {} }, 'statement_md')).toBe('');
		expect(translatedField(undefined, 'statement_md')).toBe('');
	});
});

describe('hasEnglishStatement()', () => {
	it('is driven by the statement alone', () => {
		expect(hasEnglishStatement({ en: { statement_md: 'Work out' } })).toBe(true);
		// A translated solution alone still yields a French statement in the PDF.
		expect(hasEnglishStatement({ en: { solution_md: 'The answer is 4' } })).toBe(false);
		expect(hasEnglishStatement(undefined)).toBe(false);
	});
});
