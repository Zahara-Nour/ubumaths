/**
 * Les lignes de Calcul gardées au rechargement (décision de David du
 * 2026-10-13, « option 1 ») : `history-storage.ts`, `safe-latex.ts`, et le
 * cycle de vie `keepCalcHistory` (`session.ts`).
 *
 * Par le vrai chemin : un pupitre, des saisies, le rangement dans un stockage,
 * puis un pupitre NEUF qui relit — et ce qu'il montre.
 *
 * ⚠️ Ce qui revient du `localStorage` est une entrée NON FIABLE : la moitié de
 * ce fichier forge des états empoisonnés.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk, type Entry } from '../desk.svelte';
import {
	CALC_HISTORY_STORAGE_KEY,
	CALC_HISTORY_VERSION,
	MAX_KEPT_HISTORY_LENGTH,
	MAX_KEPT_LINES,
	loadCalcHistory,
	saveCalcHistory
} from '../history-storage';
import { isSafeLatex } from '../safe-latex';
import { commandCatalog, stageExampleSetup } from '../commands';
import { messageParts } from '../reciprocal';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { keepCalcHistory } from '../session';
import { decodeAtelier, encodeAtelier } from '../url';

// =============================================================================
// Décor
// =============================================================================

/** Un `Storage` en mémoire : le vrai `localStorage` n'existe pas ici. */
class MemoryStorage implements Storage {
	readonly map = new Map<string, string>();
	get length() {
		return this.map.size;
	}
	clear() {
		this.map.clear();
	}
	getItem(key: string) {
		return this.map.get(key) ?? null;
	}
	key(index: number) {
		return [...this.map.keys()][index] ?? null;
	}
	removeItem(key: string) {
		this.map.delete(key);
	}
	setItem(key: string, value: string) {
		this.map.set(key, value);
	}
}

/** Un stockage plein au-delà de `limit` caractères, comme un navigateur au quota. */
class FullStorage extends MemoryStorage {
	constructor(readonly limit: number) {
		super();
	}
	override setItem(key: string, value: string) {
		if (value.length > this.limit) throw new DOMException('plein', 'QuotaExceededError');
		super.setItem(key, value);
	}
}

/** Ce que l'écran montre d'une ligne (`CalculView`) : rien d'autre ne compte ici. */
function shown(entry: Entry) {
	return {
		label: entry.label,
		text: entry.text,
		latex: entry.latex,
		failed: entry.failed,
		note: entry.note,
		alternative: entry.alternative,
		formulas: entry.formulas,
		inputLatex: entry.inputLatex
	};
}

function typedDesk(inputs: readonly string[]): CalcDesk {
	const desk = new CalcDesk(new Atelier());
	for (const input of inputs) desk.submit(input);
	return desk;
}

/** Ranger un pupitre, puis relire dans un pupitre NEUF (un rechargement). */
function reload(desk: CalcDesk, storage: Storage = new MemoryStorage()): CalcDesk {
	saveCalcHistory(storage, desk.entries, desk.typedInputs);
	const next = new CalcDesk(new Atelier());
	const loaded = loadCalcHistory(storage);
	if (loaded.kind === 'loaded') next.restoreHistory(loaded.history);
	return next;
}

/** Ranger à la main ce qu'un script, une extension ou un élève curieux aurait écrit. */
function forge(content: unknown): Storage {
	const storage = new MemoryStorage();
	storage.setItem(
		CALC_HISTORY_STORAGE_KEY,
		typeof content === 'string' ? content : JSON.stringify(content)
	);
	return storage;
}

function line(overrides: Record<string, unknown> = {}) {
	return { label: '1/3+1/6', text: '1/2', failed: false, ...overrides };
}

function loadedLines(storage: Storage | null) {
	const loaded = loadCalcHistory(storage);
	return loaded.kind === 'loaded' ? loaded.history.lines : null;
}

/** Une ligne fabriquée, pour les plafonds : le moteur n'écrit pas 10 000 caractères sur commande. */
function entry(id: number, fields: Partial<Entry> = {}): Entry {
	return { id, label: `ligne ${id}`, text: `réponse ${id}`, failed: false, ...fields };
}

/** Des saisies ordinaires d'élève, du collège au lycée. */
const ORDINARY = [
	'1/3+1/6',
	'sqrt(8)',
	'2^100',
	'e^2',
	'cos(pi/3)',
	'ln(2)',
	'0.1+0.2',
	'f(x)=x^2-3x+1',
	'f(1/2)',
	'12 km + 300 m',
	'2 h 30 min * 2',
	'.convertir 5 km en m',
	'.résoudre 2x+1=5',
	'.résoudre x^2-5x+6=0',
	'.résoudre x^2>4',
	'.résoudre |2x+1|=5',
	'.résoudre x^2=-1',
	'.dériver x^2*sin(x)',
	'.dériver f',
	'.dériver f',
	'.simplifier (x+1)^2',
	'.factoriser x^2-5x+6',
	'.domaine 1/x',
	'.domaine sqrt(x-1)',
	'.intégrer x^2',
	'.intégrer x^2 de 0 à 1',
	'L = 1;2;3;4',
	'.variations x^2-3x',
	'.réciproque f',
	'(1+i)^2',
	'u(n)=2n+1',
	'u(3)',
	'10!',
	'h(x) = x^^2',
	'3x+'
];

// =============================================================================
// Une ligne revient telle qu'affichée
// =============================================================================

describe('une ligne revient telle qu’affichée', () => {
	it('saisie, réponse, échec, note, bouton ≈ et formules d’un refus', () => {
		const before = typedDesk(ORDINARY);

		const after = reload(before);

		expect(after.entries.map(shown)).toEqual(before.entries.map(shown));
		// Le décor contient bien chaque cas : sinon l'égalité ne prouverait rien
		expect(before.entries.some((e) => e.alternative !== undefined)).toBe(true);
		expect(before.entries.some((e) => e.note !== undefined)).toBe(true);
		expect(before.entries.some((e) => e.formulas === true)).toBe(true);
		expect(before.entries.some((e) => e.failed)).toBe(true);
	});

	it('les réponses ordinaires de Calcul passent toutes la liste blanche', () => {
		const desk = typedDesk(ORDINARY);
		const formulas = desk.entries.flatMap((e) =>
			[e.latex, e.alternative?.latex].filter((latex) => latex !== undefined)
		);

		expect(formulas.length).toBeGreaterThan(30);
		expect(formulas.filter((latex) => !isSafeLatex(latex))).toEqual([]);
		expect(isSafeLatex(`${'\\frac{'.repeat(10)}x${'}{1}'.repeat(10)}`)).toBe(true);
	});

	it('les exemples du catalogue des commandes passent aussi la liste blanche', () => {
		const refused: string[] = [];
		let checked = 0;
		for (const command of commandCatalog(new WebReplEngine())) {
			if (command.example === undefined) continue;
			const atelier = new Atelier();
			stageExampleSetup(atelier, command.exampleSetup);
			const desk = new CalcDesk(atelier);
			desk.submit(command.example);
			for (const e of desk.entries) {
				const formulas = [
					e.latex,
					e.alternative?.latex,
					...(e.formulas
						? messageParts(e.text)
								.filter((p) => p.math)
								.map((p) => p.text)
						: [])
				];
				for (const latex of formulas) {
					if (latex === undefined) continue;
					checked++;
					if (!isSafeLatex(latex)) refused.push(`${command.example} → ${latex}`);
				}
			}
		}

		// Beaucoup d’exemples répondent en texte (statistiques) : 11 formules le 2026-10-14
		expect(checked).toBeGreaterThanOrEqual(10);
		expect(refused).toEqual([]);
	});

	it('ni étapes, ni tableau, ni « Garder » : la ligne restaurée n’a plus l’arbre du résultat', () => {
		const before = typedDesk(['.résoudre 2x+1=5', '.variations x^2-3x', '1/3+1/6']);
		expect(before.entries[0].steps).toBeDefined();
		expect(before.entries[1].table).toBeDefined();

		const after = reload(before);

		for (const restored of after.entries) {
			expect(restored.steps).toBeUndefined();
			expect(restored.summary).toBeUndefined();
			expect(restored.table).toBeUndefined();
			expect(restored.chart).toBeUndefined();
			expect(restored.result).toBeUndefined();
		}
		after.keep(after.entries[2]);
		expect(after.notice).toBe("Il n'y a rien à garder dans cette ligne.");
	});

	it('chaque ligne garde son geste : un export d’après rechargement se rejoue', () => {
		const before = typedDesk(['f(x)=x^2', '1/3+1/6']);
		before.runFromPanel('derive', 'f');
		before.keep(before.entries[1]);

		const after = reload(before);

		expect(after.entries.map((e) => e.replay)).toEqual(before.entries.map((e) => e.replay));
	});
});

// =============================================================================
// Relire ne refait rien
// =============================================================================

describe('relire ne refait rien', () => {
	it('une définition restaurée ne crée ni ne modifie de carte', () => {
		const before = typedDesk(['f(x)=x^2', 'g(x)=2x+1', '.réciproque g']);
		const storage = new MemoryStorage();
		saveCalcHistory(storage, before.entries, before.typedInputs);

		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: '1' }, 'text');
		const revision = atelier.revision;
		const after = new CalcDesk(atelier);
		const loaded = loadCalcHistory(storage);
		if (loaded.kind === 'loaded') after.restoreHistory(loaded.history);

		expect(after.entries).toHaveLength(3);
		expect(atelier.names).toEqual(['f']);
		expect(atelier.get('f')?.definition).toBe('1');
		expect(atelier.revision).toBe(revision);
	});
});

// =============================================================================
// Le rappel ↑ / ↓
// =============================================================================

describe('le rappel ↑ / ↓ revient', () => {
	it('les saisies TAPÉES, jamais une ligne écrite par un bouton', () => {
		const before = typedDesk(['L = 1;2;3', 'M = 4;5;6', '1+1']);
		before.runFromPanel('compare:M', 'L');

		const after = reload(before);
		after.recallPrevious();
		expect(after.draft).toBe('1+1');
		after.recallPrevious();
		expect(after.draft).toBe('M = 4;5;6');
		after.recallNext();
		after.recallNext();
		expect(after.draft).toBe('');
	});

	it('une console vidée : plus rien de rangé', () => {
		const desk = typedDesk(['1+1']);
		const storage = new MemoryStorage();
		saveCalcHistory(storage, desk.entries, desk.typedInputs);

		desk.clear();
		saveCalcHistory(storage, desk.entries, desk.typedInputs);

		expect(storage.getItem(CALC_HISTORY_STORAGE_KEY)).toBeNull();
	});
});

// =============================================================================
// Plafonds : on garde les plus récentes, jamais d'échec
// =============================================================================

describe('plafonds', () => {
	it(`au plus ${MAX_KEPT_LINES} lignes : les plus récentes`, () => {
		const entries = Array.from({ length: 150 }, (_, i) => entry(i));
		const storage = new MemoryStorage();

		saveCalcHistory(storage, entries, []);

		const lines = loadedLines(storage)!;
		expect(lines).toHaveLength(MAX_KEPT_LINES);
		expect(lines[0].label).toBe('ligne 50');
		expect(lines.at(-1)?.label).toBe('ligne 149');
	});

	it('trop volumineux : les plus récentes tiennent, sous le plafond de taille', () => {
		const entries = Array.from({ length: 60 }, (_, i) =>
			entry(i, { text: `${i} `.padEnd(9_000, 'x') })
		);
		const storage = new MemoryStorage();

		saveCalcHistory(storage, entries, []);

		const raw = storage.getItem(CALC_HISTORY_STORAGE_KEY)!;
		expect(raw.length).toBeLessThanOrEqual(MAX_KEPT_HISTORY_LENGTH);
		const lines = loadedLines(storage)!;
		expect(lines.length).toBeGreaterThan(10);
		expect(lines.length).toBeLessThan(60);
		expect(lines.at(-1)?.label).toBe('ligne 59');
	});

	it('une formule trop longue est oubliée, la ligne gardée en texte ; un texte trop long raccourci', () => {
		const storage = new MemoryStorage();

		saveCalcHistory(
			storage,
			[entry(0, { latex: '1'.repeat(20_000), text: 'y'.repeat(50_000), label: 'z'.repeat(5_000) })],
			['z'.repeat(5_000), '2+2']
		);

		const loaded = loadCalcHistory(storage);
		expect(loaded.kind).toBe('loaded');
		if (loaded.kind !== 'loaded') return;
		const [kept] = loaded.history.lines;
		expect(kept.latex).toBeUndefined();
		expect(kept.text.length).toBeLessThan(50_000);
		expect(kept.label.length).toBeLessThan(5_000);
		// Une saisie raccourcie ne serait plus la même : elle n'est pas rappelable
		expect(loaded.history.typed).toEqual(['2+2']);
	});

	it('un « Garder » dont la ligne gardée est tombée perd son geste, pas sa ligne', () => {
		const entries = [
			entry(0, { replay: { kind: 'saisie', input: '1/3' } }),
			...Array.from({ length: MAX_KEPT_LINES - 1 }, (_, i) => entry(i + 1)),
			entry(100, { replay: { kind: 'garder', line: 0 } }),
			entry(101, { replay: { kind: 'garder', line: 100 } })
		];
		const storage = new MemoryStorage();

		saveCalcHistory(storage, entries, []);

		const lines = loadedLines(storage)!;
		expect(lines.at(-2)?.replay).toBeUndefined();
		expect(lines.at(-2)?.label).toBe('ligne 100');
		// Deux lignes tombées : la ligne 100 du pupitre est la 98ᵉ rangée
		expect(lines.at(-1)?.replay).toEqual({ kind: 'garder', line: 98 });
	});

	it('stockage plein : les plus récentes, sans exception', () => {
		const entries = Array.from({ length: 80 }, (_, i) => entry(i, { text: 'x'.repeat(500) }));
		const storage = new FullStorage(10_000);

		expect(() => saveCalcHistory(storage, entries, [])).not.toThrow();

		const lines = loadedLines(storage)!;
		expect(lines.length).toBeGreaterThan(0);
		expect(lines.at(-1)?.label).toBe('ligne 79');
	});

	it('stockage refusé (navigation privée, site bloqué) : sans exception', () => {
		const refusing = new MemoryStorage();
		refusing.getItem = () => {
			throw new DOMException('refusé', 'SecurityError');
		};
		refusing.setItem = () => {
			throw new DOMException('refusé', 'SecurityError');
		};

		expect(() => saveCalcHistory(refusing, [entry(0)], ['1'])).not.toThrow();
		expect(() => saveCalcHistory(null, [entry(0)], ['1'])).not.toThrow();
		expect(loadedLines(refusing)).toEqual([]);
		expect(loadedLines(null)).toEqual([]);
	});
});

// =============================================================================
// Empoisonnement : un localStorage forgé
// =============================================================================

/**
 * Les commandes de MathLive qui écrivent du HTML ou du CSS, et les détours
 * pour les atteindre. Mesuré le 2026-10-14 (MathLive 0.111.1) :
 * `\htmlStyle{background:url(…)}{x}` rend `<span style="background:url(…)">`.
 */
const POISONS = [
	'\\href{javascript:alert(1)}{x}',
	'\\href{https://evil.example}{x}',
	'\\htmlStyle{background:url(https://evil.example/x)}{x}',
	'\\class{evil}{x}',
	'\\cssId{evil}{x}',
	'\\htmlId{evil}{x}',
	'\\htmlData{foo=bar}{x}',
	'\\url{javascript:alert(1)}',
	'\\includegraphics{https://evil.example/x.png}',
	'\\enclose{box}[background:url(https://evil.example/x)]{x}',
	'\\bbox[background:url(https://evil.example/x)]{x}',
	'\\mathtip{x}{\\htmlStyle{color:red}{y}}',
	'\\texttip{x}{y}',
	'\\textcolor{red}{x}',
	'\\color{red}x',
	'\\text{\\htmlStyle{color:red}{x}}',
	'\\dfrac{1}{\\class{evil}{2}}',
	'\\htmlStyle*{color:red}{x}',
	'^^5chtmlStyle{color:red}{x}',
	'\\csname htmlStyle\\endcsname{color:red}{x}',
	'\\noexpand\\htmlStyle{color:red}{x}',
	'\\def\\x{\\htmlStyle}\\x{color:red}{y}',
	'\\begin{evil}x\\end{evil}',
	'\\begin',
	'x\\',
	'\\é',
	'x\u0000y',
	// Audit du 2026-10-14 : au-delà de U+00FF, MathLive regroupe les caractères
	// (`splitGraphemes`, bornes fausses) et peut avaler le premier `\` de `\\`
	'a\u200D\\\\htmlStyle{color:red}{x}',
	'é\u200D\\\\class{evil}{x}',
	'\u200D\u200D\\\\cssId{evil}{x}',
	'\u{1F1EB}\\\\href{https://evil.example}{x}',
	'x\u2212 1',
	// 41 niveaux d'accolades : MathLive épuise sa pile vers 400 (audit, mesuré)
	`${'\\frac{'.repeat(41)}x${'}{1}'.repeat(41)}`
];

// =============================================================================
// La saisie écrite en mathématiques (réglage « Écriture mathématique »)
// =============================================================================

describe('la saisie écrite dans le champ mathématique', () => {
	const written = String.raw`\text{dériver}\,x^3`;

	it('la ligne la porte ; le texte envoyé reste son libellé (export, rejeu)', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('.dériver x^3', written);
		desk.submit('2+3');

		expect(desk.entries[0]).toMatchObject({ label: '.dériver x^3', inputLatex: written });
		expect(desk.entries[0].replay).toEqual({ kind: 'saisie', input: '.dériver x^3' });
		// Tapée en mode texte : rien de plus
		expect(desk.entries[1].inputLatex).toBeUndefined();
	});

	it('revient au rechargement', () => {
		const desk = new CalcDesk(new Atelier());
		desk.submit('.dériver x^3', written);

		expect(reload(desk).entries[0]).toMatchObject({ label: '.dériver x^3', inputLatex: written });
	});

	it('forgée, elle est oubliée : la ligne revient avec sa saisie en texte', () => {
		const storage = forge({
			version: CALC_HISTORY_VERSION,
			lines: POISONS.map((inputLatex) => line({ inputLatex })),
			typed: []
		});

		const lines = loadedLines(storage)!;

		expect(lines).toHaveLength(POISONS.length);
		expect(lines.every((l) => l.inputLatex === undefined && l.label === '1/3+1/6')).toBe(true);
	});

	// Ce qui est RANGÉ, pas ce qui est relu : la relecture refuserait de toute
	// façon (revue), le test ne prouverait rien
	it.each([
		['trop longue', 'x+'.repeat(3_000) + '1'],
		['hors liste blanche', String.raw`\htmlStyle{color:red}{x}`]
	])('%s, elle n’est pas rangée ; la ligne, si', (_, inputLatex) => {
		const storage = new MemoryStorage();
		saveCalcHistory(storage, [entry(0, { inputLatex })], []);

		const stored = JSON.parse(storage.getItem(CALC_HISTORY_STORAGE_KEY)!);

		expect(stored.lines).toHaveLength(1);
		expect(stored.lines[0]).not.toHaveProperty('inputLatex');
	});
});

describe('empoisonnement du stockage', () => {
	it.each(POISONS)('%s ne passe pas la liste blanche', (poison) => {
		expect(isSafeLatex(poison)).toBe(false);
	});

	it('une formule forgée est oubliée : la ligne revient en texte, échappé par la vue', () => {
		const storage = forge({
			version: CALC_HISTORY_VERSION,
			lines: POISONS.map((latex) => line({ latex })),
			typed: []
		});

		const lines = loadedLines(storage)!;

		expect(lines).toHaveLength(POISONS.length);
		expect(lines.every((l) => l.latex === undefined && l.text === '1/2')).toBe(true);
	});

	it('un bouton ≈ forgé est oublié', () => {
		const storage = forge({
			version: CALC_HISTORY_VERSION,
			lines: [
				line({ alternative: { label: 'Valeur approchée', latex: '\\href{javascript:x}{1}' } }),
				line({ alternative: { label: '<img src=x>', latex: '0{,}5' } }),
				line({ alternative: { label: 'Valeur approchée', latex: '\\approx 0{,}5' } })
			],
			typed: []
		});

		const lines = loadedLines(storage)!;

		expect(lines.map((l) => l.alternative)).toEqual([
			undefined,
			undefined,
			{ label: 'Valeur approchée', latex: '\\approx 0{,}5' }
		]);
	});

	it('des formules `$…$` forgées dans un refus : le texte reste, sans être composé', () => {
		const storage = forge({
			version: CALC_HISTORY_VERSION,
			lines: [
				line({ text: 'sur ℝ : $\\htmlStyle{color:red}{x}$', formulas: true, failed: true }),
				line({ text: 'sur ℝ : $f^{-1}\\left( x \\right) = \\sqrt{x}$', formulas: true })
			],
			typed: []
		});

		const lines = loadedLines(storage)!;

		expect(lines.map((l) => l.formulas)).toEqual([undefined, true]);
		expect(lines[0].text).toBe('sur ℝ : $\\htmlStyle{color:red}{x}$');
	});

	it('une chaîne énorme : Calcul repart vide, sans la lire', () => {
		const storage = forge(`{"version":1,"lines":[],"typed":["${'9'.repeat(5_000_000)}"]}`);

		expect(loadedLines(storage)).toEqual([]);
	});

	it.each([
		['du JSON illisible', '{pas du json'],
		['null', 'null'],
		['un tableau', '[1,2,3]'],
		['un nombre', '42'],
		['une version en texte', JSON.stringify({ version: '1', lines: [line()], typed: [] })],
		['des lignes qui ne sont pas un tableau', JSON.stringify({ version: 1, lines: 'abc' })]
	])('%s : Calcul repart vide, sans exception', (_, raw) => {
		expect(loadedLines(forge(raw))).toEqual([]);
	});

	it('une ligne aux types faux est écartée seule ; les saisies qui ne sont pas du texte aussi', () => {
		const storage = forge({
			version: CALC_HISTORY_VERSION,
			lines: [
				line({ failed: 'oui' }),
				line({ label: 42 }),
				line({ text: null }),
				line({ replay: { kind: 'saisie', input: 7 } }),
				'une ligne',
				line({ label: 'gardée' })
			],
			typed: [3, null, { input: '1+1' }, '2+2', 'y'.repeat(100_000)]
		});

		const loaded = loadCalcHistory(storage);

		expect(loaded.kind).toBe('loaded');
		if (loaded.kind !== 'loaded') return;
		expect(loaded.history.lines.map((l) => l.label)).toEqual(['1/3+1/6', 'gardée']);
		// Un geste abîmé est oublié, la ligne gardée
		expect(loaded.history.lines[0].replay).toBeUndefined();
		expect(loaded.history.typed).toEqual(['2+2']);
	});

	it('une version plus récente n’est ni relue ni écrasée', () => {
		const newer = JSON.stringify({ version: CALC_HISTORY_VERSION + 1, lines: [line()], typed: [] });
		const storage = forge(newer);
		const desk = new CalcDesk(new Atelier());

		const keeper = keepCalcHistory(desk, { storage });
		desk.submit('1+1');
		keeper.touch();
		keeper.close();

		expect(desk.entries).toHaveLength(1);
		expect(storage.getItem(CALC_HISTORY_STORAGE_KEY)).toBe(newer);
	});
});

// =============================================================================
// Le cycle de vie : relire à l'ouverture, ranger en différé
// =============================================================================

describe('keepCalcHistory', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('relit à l’ouverture, range 500 ms après la dernière ligne', () => {
		vi.useFakeTimers();
		const storage = new MemoryStorage();
		saveCalcHistory(storage, typedDesk(['1+1']).entries, ['1+1']);
		const desk = new CalcDesk(new Atelier());

		const keeper = keepCalcHistory(desk, { storage });
		expect(desk.entries.map((e) => e.label)).toEqual(['1+1']);

		desk.submit('2+2');
		keeper.touch();
		expect(loadedLines(storage)).toHaveLength(1);
		vi.advanceTimersByTime(500);
		expect(loadedLines(storage)?.map((l) => l.label)).toEqual(['1+1', '2+2']);
		keeper.close();
	});

	it('range à la fermeture ce qui attendait encore', () => {
		vi.useFakeTimers();
		const storage = new MemoryStorage();
		const desk = new CalcDesk(new Atelier());
		const keeper = keepCalcHistory(desk, { storage });

		desk.submit('3+3');
		keeper.touch();
		keeper.close();

		expect(loadedLines(storage)?.map((l) => l.label)).toEqual(['3+3']);
	});
});

// =============================================================================
// Le lien de partage n'emporte pas l'historique
// =============================================================================

describe('le lien de partage', () => {
	it('n’emporte que les objets, jamais les lignes de Calcul', async () => {
		const desk = typedDesk(['f(x)=x^2', '1234+1']);

		const decoded = await decodeAtelier((await encodeAtelier(desk.atelier.serialize())).payload);

		expect(decoded.ok).toBe(true);
		if (!decoded.ok) return;
		expect(Object.keys(decoded.state).sort()).toEqual(['objects', 'version']);
		expect(JSON.stringify(decoded.state)).not.toContain('1234');
	});
});
