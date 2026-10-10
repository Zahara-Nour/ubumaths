import { describe, it, expect } from 'vitest';
import { countErrors, compareCounts } from '../cliquet-types-tests';

const output = [
	'1791630555263 START "/repo"',
	'1791630555263 ERROR "src/a/__tests__/x.test.ts" 22:10 "Tuple type \'[]\' has no element."',
	'1791630555263 ERROR "src/a/__tests__/x.test.ts" 24:11 "Conversion may be a mistake."',
	'1791630555263 ERROR "tests/integration/y.test.ts" 3:1 "Expected 3-4 arguments, but got 2."',
	'1791630555263 ERROR "extern/lib/z.svelte" 1:1 "Absent en CI."',
	'1791630555263 WARNING "src/b.svelte" 1:1 "Un avertissement ne compte pas."',
	'1791630555275 COMPLETED 1907 FILES 4 ERRORS 1 WARNINGS 3 FILES_WITH_PROBLEMS'
].join('\n');

describe('countErrors', () => {
	it('compte les erreurs par fichier, sans extern/ ni avertissements', () => {
		expect(countErrors(output)).toEqual({
			'src/a/__tests__/x.test.ts': 2,
			'tests/integration/y.test.ts': 1
		});
	});
});

describe('compareCounts — le cliquet par fichier', () => {
	const ratchet = { 'a.test.ts': 3, 'b.test.ts': 2 };

	it('rien ne bouge : ni hausse ni baisse', () => {
		expect(compareCounts(ratchet, { 'a.test.ts': 3, 'b.test.ts': 2 })).toEqual({ increases: [], decreases: [] });
	});

	it('un nouveau fichier avec une erreur est une hausse : les nouveaux tests naissent typés', () => {
		expect(compareCounts(ratchet, { ...ratchet, 'nouveau.test.ts': 1 }).increases).toEqual([
			{ file: 'nouveau.test.ts', before: 0, after: 1 }
		]);
	});

	it('corriger ici ne paie pas une erreur ailleurs : total stable mais hausse ET baisse', () => {
		const r = compareCounts(ratchet, { 'a.test.ts': 2, 'b.test.ts': 3 });
		expect(r.increases).toEqual([{ file: 'b.test.ts', before: 2, after: 3 }]);
		expect(r.decreases).toEqual([{ file: 'a.test.ts', before: 3, after: 2 }]);
	});

	it('un fichier corrigé jusqu’à zéro disparaît de la sortie : c’est une baisse', () => {
		expect(compareCounts(ratchet, { 'a.test.ts': 3 }).decreases).toEqual([
			{ file: 'b.test.ts', before: 2, after: 0 }
		]);
	});
});
