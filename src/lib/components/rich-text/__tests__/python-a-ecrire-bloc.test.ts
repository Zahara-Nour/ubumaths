/**
 * Bloc ```python-a-ecrire dans l'éditeur riche : un bloc de code `python-a-ecrire` porte le
 * texte source, retraits des programmes compris (comme ```yohaku), y compris un bloc en
 * erreur — sinon le bloc disparaîtrait à l'enregistrement.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

const BLOC = [
	'```python-a-ecrire',
	'fonction: f',
	'solution: |',
	'  def f(x):',
	'      return 2 * x',
	'essais: f(1) ; f(2)',
	'```'
].join('\n');

describe('bloc ```python-a-ecrire — aller-retour de l’éditeur riche', () => {
	it('repart identique, retraits gardés', () => {
		expect(tipTapToMarkdown(markdownToTipTap(BLOC)).trim()).toBe(BLOC);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```python-a-ecrire\nfonction: f\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'python-a-ecrire' });
	});
});
