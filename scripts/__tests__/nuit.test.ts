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
 *
 * Défauts corrigés (phase 0 validée par David le 2026-11-27) :
 * - une panne qui dure renotifie tous les 7 jours (rappel) ;
 * - un rouge vert au second essai est « instable » : ni rouge ni notifié ;
 * - la notification dit combien de rouges nouveaux ; la première nuit le dit ;
 * - un second `--lancer` le même jour ne touche pas au bilan de la nuit.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, it, expect } from 'vitest';
import {
	deliveredNotice,
	formatSummary,
	isNight,
	lockIsStale,
	mergeReplay,
	notificationPhrase,
	notifiedOutages,
	struckIds,
	newGaps,
	newReds,
	parseArgs,
	playwrightTests,
	processTree,
	readReplay,
	redsToNotify,
	staleDays,
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

	it('un fichier qui ne se charge pas est un rouge, pas un silence', () => {
		const broken = { ...report, errors: [{ message: 'SyntaxError: x\n    at carnet.spec.ts:3' }] };
		expect(playwrightTests(broken)).toMatchObject({
			'erreur de chargement › SyntaxError: x': 'red'
		});
	});

	it('deux tests de même nom : le pire verdict est gardé', () => {
		const spec = (status: string): unknown => ({
			title: 't',
			file: 'a.spec.ts',
			tests: [{ projectName: 'iphone', status }]
		});
		const twice = {
			suites: [{ title: 'a.spec.ts', specs: [spec('unexpected'), spec('expected')] }]
		};
		expect(playwrightTests(twice)).toEqual({ 'iphone › a.spec.ts › t': 'red' });
	});

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

describe('redsToNotify', () => {
	const red = night({ verifs: verifs({ [TEST_A]: 'red', [TEST_B]: 'green' }) });

	it('les rouges nouveaux de la nuit', () => {
		expect(redsToNotify([night()], red)).toEqual([`test rouge : ${TEST_A}`]);
	});

	it('une notification pas partie la veille est reprise, sans doublon', () => {
		const unsent = { ...red, pending: [`test rouge : ${TEST_A}`] };
		expect(redsToNotify([unsent], red)).toEqual([`test rouge : ${TEST_A}`]);
		const other = night({ verifs: verifs({ [TEST_A]: 'red', [TEST_B]: 'red' }) });
		expect(redsToNotify([unsent], other)).toEqual([
			`test rouge : ${TEST_A}`,
			`test rouge : ${TEST_B}`
		]);
	});

	it('notification partie la veille : rien à reprendre', () => {
		expect(redsToNotify([red], red)).toEqual([]);
	});
});

describe('readReplay', () => {
	it('le bilan de `pnpm ecarts rejouer --json`', () => {
		const lines = [
			{ id: 'V35', outcome: 'red' },
			{ id: 'L9', outcome: 'broken', detail: 'fichier absent' },
			{ id: 'D1', outcome: 'manual' },
			{ id: 'M2', outcome: 'green' }
		];
		expect(readReplay(lines)).toEqual(lines);
	});

	it.each([
		[null],
		[{}],
		[[{ id: 'V35' }]],
		[[{ id: 'V35', outcome: 'failed' }]],
		[[{ outcome: 'red' }]]
	])('verdict inconnu ou forme inattendue : null, jamais un vert par défaut (%j)', (value) => {
		expect(readReplay(value)).toBeNull();
	});
});

describe('staleDays', () => {
	it('nuit de ce matin ou d’hier : 0', () => {
		expect(staleDays('2026-11-26', '2026-11-26')).toBe(0);
		expect(staleDays('2026-11-25', '2026-11-26')).toBe(0);
	});

	it('au-delà : le nombre de nuits manquées', () => {
		expect(staleDays('2026-11-23', '2026-11-26')).toBe(2);
		expect(staleDays('2026-10-30', '2026-11-02')).toBe(2);
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
		expect(isNight({ ...night(), pending: ['test rouge : x'] })).toBe(true);
		expect(isNight({ ...night(), pending: 'x' })).toBe(false);
	});

	it.each([[null], [{}], [{ date: '2026-11-26' }], [{ ...night(), verifs: { ok: true } }]])(
		'fichier abîmé : refusé (%j)',
		(value) => {
			expect(isNight(value)).toBe(false);
		}
	);
});

describe('processTree', () => {
	const ps = '  10   1\n  11  10\n  12  11\n  20   1\n  21  20\n';

	it('le processus et toute sa descendance, pas ses voisins', () => {
		expect(processTree(ps, 10)).toEqual([10, 11, 12]);
	});

	it('processus sans enfant, ou absent : lui seul', () => {
		expect(processTree(ps, 12)).toEqual([12]);
		expect(processTree('', 99)).toEqual([99]);
	});
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

describe('rappel d’une panne qui dure', () => {
	const down = (date: string, outages?: Night['outages']): Night =>
		night({
			date,
			verifs: { ok: false, failure: 'le port 5190 est déjà pris' },
			...(outages === undefined ? {} : { outages })
		});
	const reminder =
		'rappel (panne depuis le 2026-11-01) : vérifications à l’écran pas jouées : le port 5190 est déjà pris';

	it('notifiée le 1er : rien du 2 au 7, rappel le 8', () => {
		const first = down('2026-11-01', ['verifs']);
		const nights = [first];
		for (let day = 2; day <= 7; day++) {
			const current = down(`2026-11-0${day}`);
			expect(newReds(nights, current)).toEqual([]);
			nights.unshift(current);
		}
		expect(newReds(nights, down('2026-11-08'))).toEqual([reminder]);
		expect(notifiedOutages(nights, down('2026-11-08'))).toEqual(['verifs']);
	});

	it('nuit d’avant la règle (sans `outages`) : le début de la panne compte comme notifié', () => {
		const nights = [down('2026-11-07'), down('2026-11-01'), night({ date: '2026-10-31' })];
		expect(newReds(nights, down('2026-11-08'))).toEqual([reminder]);
	});

	it('rappelée le 8 : rien jusqu’au 14, rappel le 15', () => {
		const nights = [down('2026-11-14'), down('2026-11-08', ['verifs']), down('2026-11-01')];
		expect(newReds(nights, down('2026-11-14'))).toEqual([]);
		expect(newReds(nights, down('2026-11-15'))).toEqual([reminder]);
	});

	it('Mac éteint plusieurs nuits : rappel dès que 7 jours sont passés', () => {
		expect(newReds([down('2026-11-01', ['verifs'])], down('2026-11-10'))).toEqual([reminder]);
	});

	it('une nuit saine entre deux : la nouvelle panne est notifiée comme neuve', () => {
		const nights = [night({ date: '2026-11-05' }), down('2026-11-01', ['verifs'])];
		expect(newReds(nights, down('2026-11-06'))).toEqual([
			'vérifications à l’écran pas jouées : le port 5190 est déjà pris'
		]);
		expect(notifiedOutages(nights, down('2026-11-06'))).toEqual(['verifs']);
	});

	it('push refusé chaque nuit : rappel au bout de 7 jours', () => {
		const stuck = (date: string, outages?: Night['outages']): Night =>
			night({
				date,
				proofs: {
					ok: true,
					data: { struck: ['L9'], pushFailure: 'push refusé', broken: [], open: ['V35'] }
				},
				...(outages === undefined ? {} : { outages })
			});
		expect(notifiedOutages([night({ date: '2026-10-31' })], stuck('2026-11-01'))).toEqual(['push']);
		expect(newReds([stuck('2026-11-01', ['push'])], stuck('2026-11-07'))).toEqual([]);
		expect(newReds([stuck('2026-11-01', ['push'])], stuck('2026-11-08'))).toEqual([
			'rappel (panne depuis le 2026-11-01) : lignes barrées mais pas poussées sur main (push refusé) : L9'
		]);
	});

	it('aucune panne : aucune notée', () => {
		expect(notifiedOutages([night()], night())).toEqual([]);
	});

	it('relu du disque avec `outages`', () => {
		expect(isNight({ ...night(), outages: ['verifs', 'push'] })).toBe(true);
		expect(isNight({ ...night(), outages: ['autre'] })).toBe(false);
	});
});

describe('mergeReplay : second essai des rouges', () => {
	it('un rouge vert au second essai devient instable, un rouge rouge le reste', () => {
		const first = { [TEST_A]: 'red', [TEST_B]: 'red', 'x › y': 'green' } as const;
		const replay = { [TEST_A]: 'green', [TEST_B]: 'red' } as const;
		expect(mergeReplay(first, replay)).toEqual({
			[TEST_A]: 'flaky',
			[TEST_B]: 'red',
			'x › y': 'green'
		});
	});

	it('absent du second essai (fichier qui ne se charge pas) : rouge', () => {
		expect(mergeReplay({ [TEST_A]: 'red' }, {})).toEqual({ [TEST_A]: 'red' });
	});

	it('un instable ne compte pas comme rouge nouveau, ni dans le bilan', () => {
		const current = night({ verifs: verifs({ [TEST_A]: 'flaky', [TEST_B]: 'green' }) });
		expect(newReds([night()], current)).toEqual([]);
		const text = formatSummary(current, [night()]);
		expect(text).toContain('1 vert, 0 rouge, 1 instable, 0 sauté');
		expect(text).toContain(`instable (vert au second essai) : ${TEST_A}`);
	});

	it('second essai pas joué : le bilan le dit', () => {
		const current = night({
			verifs: { ok: true, data: { tests: { [TEST_A]: 'red' }, replay: 'délai dépassé' } }
		});
		expect(formatSummary(current, [night()])).toContain('second essai pas joué : délai dépassé');
		expect(isNight(current)).toBe(true);
	});
});

describe('notification et première nuit', () => {
	it('la phrase dit combien, sans rien du contenu', () => {
		expect(notificationPhrase(['a'])).toBe('bilan de la nuit à lire (1 rouge nouveau)');
		expect(notificationPhrase(['a', 'b'])).toBe('bilan de la nuit à lire (2 rouges nouveaux)');
		expect(notificationPhrase(Array.from({ length: 44 }, String)).length).toBeLessThanOrEqual(80);
	});

	it('première nuit : le bilan dit que tout rouge compte comme nouveau', () => {
		const current = night({ verifs: verifs({ [TEST_A]: 'red' }) });
		expect(formatSummary(current, [])).toContain(
			'Première nuit : tout rouge compte comme nouveau.'
		);
		expect(formatSummary(current, [night()])).not.toContain('Première nuit');
	});

	it('seule la ligne « envoyé » de `pnpm prevenir` fait foi', () => {
		expect(deliveredNotice(0, '✅ envoyé : Session « tache-de-nuit » : …')).toBe(true);
		expect(deliveredNotice(0, '⏸ déjà envoyé il y a 2 min')).toBe(true);
		expect(deliveredNotice(0, '⚠️ réseau coupé : pas envoyé')).toBe(false);
		expect(deliveredNotice(1, '✅ envoyé')).toBe(false);
	});
});

describe('struckIds', () => {
	it('les écarts que `pnpm ecarts rejouer --barrer` dit avoir barrés', () => {
		const output = 'V35 rouge\nBarré dans le registre : L9, M40. À commiter.\n';
		expect(struckIds(output)).toEqual(['L9', 'M40']);
	});

	it('rien de barré : null', () => {
		expect(struckIds('V35 rouge\n')).toBeNull();
	});
});

describe('lockIsStale', () => {
	const HOUR = 3_600_000;

	it('processus vivant et verrou récent : une nuit tourne', () => {
		expect(lockIsStale({ alive: true, ageMs: HOUR })).toBe(false);
	});

	it('processus disparu, ou verrou de plus de 8 h : périmé', () => {
		expect(lockIsStale({ alive: false, ageMs: HOUR })).toBe(true);
		expect(lockIsStale({ alive: true, ageMs: 9 * HOUR })).toBe(true);
	});
});

describe('pnpm nuit (le script)', () => {
	const TSX = resolve(__dirname, '../../node_modules/.bin/tsx');
	const INDEX = resolve(__dirname, '../nuit/index.ts');
	let state = '';

	afterEach(() => {
		if (state !== '') rmSync(state, { recursive: true, force: true });
		state = '';
	});

	function nuit(args: string[]): { status: number | null; out: string } {
		const result = spawnSync(TSX, [INDEX, ...args], {
			encoding: 'utf8',
			// Filet : si la garde du second lancement manquait, la nuit s'arrêterait à la
			// préparation (worktree et commit introuvables) au lieu de jouer pour de vrai.
			env: {
				...process.env,
				NUIT_ETAT: state,
				NUIT_WORKTREE: join(state, 'pas-de-worktree'),
				NUIT_REF: 'refs/nuit/inexistante',
				// … et sa notification ne partirait pas (canal ntfy absent).
				PREVENIR_CANAL: join(state, 'pas-de-canal'),
				PREVENIR_ETAT: join(state, 'prevenir')
			},
			timeout: 30_000
		});
		return { status: result.status, out: `${result.stdout}${result.stderr}` };
	}

	function localToday(): string {
		return new Date().toLocaleDateString('sv-SE');
	}

	it('sans nuit : le dit', () => {
		state = mkdtempSync(join(tmpdir(), 'nuit-'));
		const { status, out } = nuit([]);
		expect(status).toBe(0);
		expect(out).toContain('Aucune nuit jouée');
	});

	it('affiche le bilan de la dernière nuit écrite', () => {
		state = mkdtempSync(join(tmpdir(), 'nuit-'));
		const current = night({ date: localToday(), verifs: verifs({ [TEST_A]: 'red' }) });
		writeFileSync(join(state, `${localToday()}.json`), JSON.stringify(current));
		const { status, out } = nuit([]);
		expect(status).toBe(0);
		expect(out).toContain(`Nuit du ${localToday()} (main abc1234)`);
		expect(out).toContain(`rouge : ${TEST_A}`);
	});

	it('--lancer une seconde fois le même jour : refusé, bilan de la nuit intact', () => {
		state = mkdtempSync(join(tmpdir(), 'nuit-'));
		const file = join(state, `${localToday()}.json`);
		const written = JSON.stringify(night({ date: localToday() }));
		writeFileSync(file, written);
		const { status, out } = nuit(['--lancer']);
		expect(status).toBe(1);
		expect(out).toContain('déjà jouée');
		expect(out).toContain('--essai');
		expect(readFileSync(file, 'utf8')).toBe(written);
		expect(readdirSync(state).sort()).toEqual([`${localToday()}.json`]);
	});

	it('argument inconnu : usage, code 2', () => {
		state = mkdtempSync(join(tmpdir(), 'nuit-'));
		expect(nuit(['--lancer', '--force']).status).toBe(2);
	});
});
