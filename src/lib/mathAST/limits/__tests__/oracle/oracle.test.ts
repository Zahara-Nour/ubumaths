/**
 * Oracle numérique du moteur de limites (test PERMANENT, CI).
 *
 * Les tests historiques assertaient le statut ou la technique, pas la
 * valeur, et construisaient la borne ∞ par la factory : des dizaines de
 * limites fausses sont passées inaperçues. Ici, chaque limite du corpus est
 * saisie en LaTeX comme un élève, et le résultat du moteur est confronté :
 * (a) à l'attendu noté à la main (valeur ET statut) ;
 * (b) à l'évaluation numérique de f près de la borne ;
 * (c) à une hygiène de la valeur exacte (ni ∞, ni ln 0, ni nombre démesuré) ;
 * (d) aux limites à gauche et à droite quand une bilatérale est rendue ;
 * (e) à l'absence de limite quand il n'y en a pas.
 * « Non supporté » n'est pas un échec : il est compté (couverture).
 */

import { describe, it, expect } from 'vitest';
import { GENERATED_VARIANTS, ORACLE_CORPUS, WAITING_LIST, type OracleEntry } from './corpus';
import { checkExpectedNumerically, describeWrong, judgeEntry, type Verdict } from './harness';
import { KNOWN_WRONG } from './known-wrong';

/** Plancher de couverture (entrées avec une réponse juste / total). */
const COVERAGE_FLOOR = 0.57;
/** Budget de temps du jugement complet (ms). */
const TIME_BUDGET_MS = 5000;

const BASE_ENTRIES: readonly OracleEntry[] = ORACLE_CORPUS.flatMap((family) => family.entries);
const ALL_ENTRIES: readonly OracleEntry[] = [...BASE_ENTRIES, ...GENERATED_VARIANTS];

interface OracleRun {
	readonly verdicts: readonly Verdict[];
	readonly elapsedMs: number;
}

let cachedRun: OracleRun | null = null;

/** Jugement de tout le corpus, calculé une seule fois. */
function runOracle(): OracleRun {
	if (cachedRun) return cachedRun;
	const start = performance.now();
	const verdicts = ALL_ENTRIES.map(judgeEntry);
	cachedRun = { verdicts, elapsedMs: performance.now() - start };
	return cachedRun;
}

function ratio(part: number, total: number): string {
	return `${part}/${total} (${((100 * part) / total).toFixed(1)} %)`;
}

describe('oracle numérique des limites', () => {
	it('les identifiants du corpus sont uniques', () => {
		const ids = [...ALL_ENTRIES, ...WAITING_LIST].map((entry) => entry.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('le corpus est juste : chaque attendu est confirmé numériquement', () => {
		const failures = ALL_ENTRIES.map(checkExpectedNumerically).filter(
			(failure): failure is string => failure !== null
		);
		expect(failures).toEqual([]);
	});

	it('aucune limite fausse hors de KNOWN_WRONG (régression = rouge)', () => {
		const unexpected = runOracle()
			.verdicts.filter((verdict) => verdict.wrong && !(verdict.entry.id in KNOWN_WRONG))
			.map(describeWrong);
		expect(unexpected).toEqual([]);
	});

	it('chaque entrée de KNOWN_WRONG est encore fausse (sinon la retirer)', () => {
		const verdictById = new Map(runOracle().verdicts.map((v) => [v.entry.id, v]));
		const fixedOrUnknown = Object.keys(KNOWN_WRONG).filter((id) => {
			const verdict = verdictById.get(id);
			return !verdict || !verdict.wrong;
		});
		expect(fixedOrUnknown).toEqual([]);
	});

	it('\\lim(…) parenthésée est résolue dès que f seule l’est', () => {
		// Une somme DOIT être parenthésée après \lim : saisie élève la plus courante.
		const gaps = runOracle()
			.verdicts.filter((verdict) => verdict.parenthesesGap)
			.map((verdict) => verdict.entry.id);
		expect(gaps).toEqual([]);
	});

	it(`le jugement complet tient en moins de ${TIME_BUDGET_MS} ms`, () => {
		expect(runOracle().elapsedMs).toBeLessThan(TIME_BUDGET_MS);
	});

	it('la liste d’attente n’est pas exécutée et ne recoupe pas le corpus', () => {
		const corpusIds = new Set(ALL_ENTRIES.map((entry) => entry.id));
		for (const waiting of WAITING_LIST) {
			expect(corpusIds.has(waiting.id)).toBe(false);
			expect(waiting.reason.length).toBeGreaterThan(0);
		}
	});

	it('couverture (informatif, avec plancher)', () => {
		const { verdicts, elapsedMs } = runOracle();
		const base = verdicts.slice(0, BASE_ENTRIES.length);
		const variants = verdicts.slice(BASE_ENTRIES.length);
		const covered = verdicts.filter((v) => v.covered).length;
		const unsupported = verdicts.filter((v) => !v.covered && !v.wrong);
		const lines = [
			`Oracle des limites — ${verdicts.length} entrées en ${elapsedMs.toFixed(0)} ms`,
			`  couverture totale : ${ratio(covered, verdicts.length)}`,
			`  corpus : ${ratio(base.filter((v) => v.covered).length, base.length)}`,
			`  variantes 2 − 3f : ${ratio(variants.filter((v) => v.covered).length, variants.length)}`,
			`  fausses connues : ${Object.keys(KNOWN_WRONG).length}`,
			`  \\lim(…) non supportée mais f seule oui : ${verdicts.filter((v) => v.parenthesesGap).length}`,
			`  liste d'attente (non exécutée) : ${WAITING_LIST.map((w) => w.id).join(', ')}`,
			...ORACLE_CORPUS.map((family) => {
				const ids = new Set(family.entries.map((entry) => entry.id));
				const own = base.filter((v) => ids.has(v.entry.id));
				return `  ${family.name} : ${ratio(own.filter((v) => v.covered).length, own.length)}`;
			}),
			`  non supportées : ${unsupported.map((v) => v.entry.id).join(', ')}`
		];
		console.info(lines.join('\n'));
		expect(covered / verdicts.length).toBeGreaterThanOrEqual(COVERAGE_FLOOR);
	});
});
