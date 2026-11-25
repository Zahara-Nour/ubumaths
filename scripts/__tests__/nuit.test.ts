/**
 * `pnpm nuit` : la tâche de nuit unique (preuves des écarts, vérifications à
 * l'écran sur les six navigateurs, gardes de doc)
 * ==========================================================================
 *
 * Gardé ici (phase 0 validée par David le 2026-11-25) :
 * - David n'est prévenu que d'un rouge NOUVEAU : un test déjà rouge la veille,
 *   une preuve déjà cassée, une garde déjà rouge ne renotifient pas ;
 * - une preuve verte barrée ne notifie pas ;
 * - une étape qui n'a pas pu tourner est un rouge nouveau, une fois : la même
 *   panne la nuit suivante ne renotifie pas ;
 * - la veille en panne ne fait pas oublier ce qui était rouge avant elle ;
 * - le bilan dit les écarts clos, les preuves cassées, les écarts entrés au
 *   registre depuis la veille, les tests rouges et les gardes.
 */

import { describe, it, expect } from 'vitest';
import {
	formatSummary,
	isNight,
	newGaps,
	newReds,
	parseArgs,
	playwrightTests,
	type Night
} from '../nuit/logique.ts';

const TEST_A = 'iphone › atelier.spec.ts › barre de l’Atelier';
const TEST_B = 'ordinateur-chrome › carnet.spec.ts › carnet › première page';

function night(changes: Partial<Night> = {}): Night {
	return {
		date: '2026-11-26',
		commit: 'abc1234',
		proofs: {
			ok: true,
			data: { struck: [], pushFailure: null, broken: [], open: ['V35', 'L9'] }
		},
		verifs: { ok: true, data: { tests: { [TEST_A]: 'green', [TEST_B]: 'green' } } },
		guards: { ok: true, data: [{ name: 'docs:check-links', ok: true, detail: '' }] },
		...changes
	};
}

function verifs(tests: Record<string, 'green' | 'red' | 'skipped'>): Night['verifs'] {
	return { ok: true, data: { tests } };
}

describe('playwrightTests', () => {
	const report = {
		suites: [
			{
				title: 'atelier.spec.ts',
				file: 'atelier.spec.ts',
				specs: [
					{
						title: 'barre de l’Atelier',
						file: 'atelier.spec.ts',
						tests: [
							{ projectName: 'iphone', status: 'unexpected' },
							{ projectName: 'ordinateur-chrome', status: 'expected' }
						]
					}
				],
				suites: [
					{
						title: 'carnet',
						file: 'atelier.spec.ts',
						specs: [
							{
								title: 'première page',
								file: 'atelier.spec.ts',
								tests: [
									{ projectName: 'iphone', status: 'skipped' },
									{ projectName: 'android', status: 'flaky' }
								]
							}
						]
					}
				]
			}
		]
	};

	it('un verdict par test et par navigateur, groupes compris', () => {
		expect(playwrightTests(report)).toEqual({
			'iphone › atelier.spec.ts › barre de l’Atelier': 'red',
			'ordinateur-chrome › atelier.spec.ts › barre de l’Atelier': 'green',
			'iphone › atelier.spec.ts › carnet › première page': 'skipped',
			'android › atelier.spec.ts › carnet › première page': 'red'
		});
	});

	it.each([[null], ['texte'], [{}], [{ suites: 'x' }], [{ suites: [{ specs: [{}] }] }]])(
		'compte rendu illisible : null (%j)',
		(value) => {
			expect(playwrightTests(value)).toBeNull();
		}
	);

	it('aucun test joué : null, une suite vide ne prouve rien', () => {
		expect(playwrightTests({ suites: [] })).toBeNull();
	});
});

describe('newReds', () => {
	it('tout vert : rien', () => {
		expect(newReds([night()], night())).toEqual([]);
	});

	it('un test passé du vert au rouge est nouveau', () => {
		const current = night({ verifs: verifs({ [TEST_A]: 'red', [TEST_B]: 'green' }) });
		expect(newReds([night()], current)).toEqual([`test rouge : ${TEST_A}`]);
	});

	it('un test déjà rouge la veille ne l’est pas', () => {
		const red = night({ verifs: verifs({ [TEST_A]: 'red', [TEST_B]: 'green' }) });
		expect(newReds([red], red)).toEqual([]);
	});

	it('un test neuf qui arrive rouge est nouveau', () => {
		const current = night({ verifs: verifs({ [TEST_A]: 'green', 'x › neuf': 'red' }) });
		expect(newReds([night()], current)).toEqual(['test rouge : x › neuf']);
	});

	it('première nuit : tout rouge est nouveau', () => {
		const current = night({ verifs: verifs({ [TEST_A]: 'red' }) });
		expect(newReds([], current)).toEqual([`test rouge : ${TEST_A}`]);
	});

	it('une preuve verte barrée ne compte pas', () => {
		const current = night({
			proofs: { ok: true, data: { struck: ['L9'], pushFailure: null, broken: [], open: ['V35'] } }
		});
		expect(newReds([night()], current)).toEqual([]);
	});

	it('une preuve cassée est nouvelle une fois', () => {
		const broken = night({
			proofs: {
				ok: true,
				data: {
					struck: [],
					pushFailure: null,
					broken: [{ id: 'L9', detail: 'fichier absent : x' }],
					open: ['V35', 'L9']
				}
			}
		});
		expect(newReds([night()], broken)).toEqual(['preuve cassée : L9 (fichier absent : x)']);
		expect(newReds([broken], broken)).toEqual([]);
	});

	it('des lignes barrées qui ne sont pas parties sur main : nouveau une fois', () => {
		const stuck = night({
			proofs: {
				ok: true,
				data: { struck: ['L9'], pushFailure: 'push refusé', broken: [], open: ['V35'] }
			}
		});
		expect(newReds([night()], stuck)).toEqual([
			'lignes barrées mais pas poussées sur main (push refusé) : L9'
		]);
		expect(newReds([stuck], stuck)).toEqual([]);
	});

	it('une garde de doc rouge est nouvelle une fois', () => {
		const red = night({
			guards: { ok: true, data: [{ name: 'docs:check-links', ok: false, detail: 'lien cassé' }] }
		});
		expect(newReds([night()], red)).toEqual(['garde de doc rouge : docs:check-links']);
		expect(newReds([red], red)).toEqual([]);
	});

	it('une étape qui n’a pas tourné est nouvelle une fois', () => {
		const down = night({ verifs: { ok: false, failure: 'le serveur ne démarre pas' } });
		expect(newReds([night()], down)).toEqual([
			'vérifications à l’écran pas jouées : le serveur ne démarre pas'
		]);
		expect(newReds([down, night()], down)).toEqual([]);
	});

	it('la veille en panne ne fait pas oublier le rouge d’avant-veille', () => {
		const red = night({ verifs: verifs({ [TEST_A]: 'red', [TEST_B]: 'green' }) });
		const down = night({ verifs: { ok: false, failure: 'panne' } });
		// Nuits passées : la plus récente d'abord.
		expect(newReds([down, red], red)).toEqual([]);
	});

	it('trois pannes à la fois : trois lignes', () => {
		const down = night({
			proofs: { ok: false, failure: 'a' },
			verifs: { ok: false, failure: 'b' },
			guards: { ok: false, failure: 'c' }
		});
		expect(newReds([night()], down)).toHaveLength(3);
	});
});

describe('newGaps', () => {
	it('les écarts ouverts absents de la veille', () => {
		const current = night({
			proofs: {
				ok: true,
				data: { struck: [], pushFailure: null, broken: [], open: ['V35', 'L9', 'E83'] }
			}
		});
		expect(newGaps([night()], current)).toEqual(['E83']);
	});

	it('première nuit, ou preuves pas jouées : aucun', () => {
		expect(newGaps([], night())).toEqual([]);
		expect(newGaps([night()], night({ proofs: { ok: false, failure: 'x' } }))).toEqual([]);
	});
});

describe('formatSummary', () => {
	it('dit les clos, les cassées, les nouveaux écarts, les rouges et les gardes', () => {
		const current = night({
			proofs: {
				ok: true,
				data: {
					struck: ['L9'],
					pushFailure: null,
					broken: [{ id: 'V35', detail: 'aucun test joué' }],
					open: ['V35', 'E83']
				}
			},
			verifs: verifs({ [TEST_A]: 'red', [TEST_B]: 'green', 'x › y': 'skipped' }),
			guards: {
				ok: true,
				data: [
					{ name: 'docs:check-links', ok: true, detail: '' },
					{ name: 'docs:check-refs', ok: false, detail: 'renvoi cassé : a.md' }
				]
			}
		});
		const text = formatSummary(current, [night()]);
		expect(text).toContain('Nuit du 2026-11-26 (main abc1234)');
		expect(text).toContain('Rouges nouveaux (3)');
		expect(text).toContain('clos cette nuit (1) : L9');
		expect(text).toContain('V35 (aucun test joué)');
		expect(text).toContain('entrés au registre depuis la veille (1) : E83');
		expect(text).toContain('1 vert, 1 rouge, 1 sauté');
		expect(text).toContain(TEST_A);
		expect(text).toContain('docs:check-refs');
		expect(text).toContain('renvoi cassé : a.md');
	});

	it('nuit sans rien à dire : le dit en une ligne', () => {
		expect(formatSummary(night(), [night()])).toContain('Aucun rouge nouveau.');
	});

	it('une étape en panne est nommée avec sa cause', () => {
		const down = night({ verifs: { ok: false, failure: 'le serveur ne démarre pas' } });
		expect(formatSummary(down, [night()])).toContain('pas jouées : le serveur ne démarre pas');
	});
});

describe('isNight', () => {
	it('relit ce qui a été écrit', () => {
		const written: unknown = JSON.parse(JSON.stringify(night()));
		expect(isNight(written)).toBe(true);
		const down: unknown = JSON.parse(
			JSON.stringify(night({ guards: { ok: false, failure: 'x' } }))
		);
		expect(isNight(down)).toBe(true);
	});

	it.each([[null], [{}], [{ date: '2026-11-26' }], [{ ...night(), verifs: { ok: true } }]])(
		'fichier abîmé : refusé (%j)',
		(value) => {
			expect(isNight(value)).toBe(false);
		}
	);
});

describe('parseArgs', () => {
	it('sans argument : le dernier bilan', () => {
		expect(parseArgs([])).toEqual({ command: 'show' });
	});

	it('--lancer, avec ou sans --essai', () => {
		expect(parseArgs(['--lancer'])).toEqual({ command: 'run', trial: false });
		expect(parseArgs(['--lancer', '--essai'])).toEqual({ command: 'run', trial: true });
	});

	it.each([[['--essai']], [['lancer']], [['--lancer', '--force']]])(
		'faute de frappe : usage (%j)',
		(args) => {
			expect(parseArgs(args)).toBeNull();
		}
	);
});
