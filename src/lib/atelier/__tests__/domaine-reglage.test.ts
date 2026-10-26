/**
 * Le réglage « Simplifications qui changent le domaine », la note qui propose
 * de préciser le domaine, et `avec` / `dans` (chantier tidy-conditions, § 3,
 * décisions de David du 2026-10-26).
 *
 * - « Garder l'écriture » (défaut) : la ligne garde le domaine, une note dit
 *   qu'on peut simplifier davantage et comment le préciser (`avec x ≠ 0`).
 * - « Simplifier en disant la condition » : la ligne montre `1, pour x ≠ 0`,
 *   le bouton « Sans simplifier » revient ; pas de note.
 * - Le réglage ne vaut que pour les nouvelles lignes (Q8).
 * - `avec CONDITION` / `dans ENSEMBLE` : la simplification a lieu si
 *   l'hypothèse garantit la condition ; sinon la ligne garde et le dit.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';
import type { DomainMode } from '../domain-mode';

function session(mode: DomainMode = 'keep'): CalcSession {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	s.atelier.setDomainMode(mode);
	return s;
}

function line(input: string, mode: DomainMode = 'keep') {
	const result = runInput(session(mode), input);
	if (result.kind !== 'calcul' && result.kind !== 'commande') {
		throw new Error(`attendu une ligne, reçu ${result.kind} : ${JSON.stringify(result)}`);
	}
	return result;
}

function refusal(input: string): string {
	const result: CalcResult = runInput(session(), input);
	if (result.kind !== 'refus') throw new Error(`attendu un refus, reçu ${result.kind}`);
	return result.message;
}

const flat = (latex: string | undefined) => (latex ?? '').replace(/\s/g, '');

describe('« Garder l’écriture » : la note propose de préciser le domaine', () => {
	it.each([
		['x/x', 'avec x ≠ 0', 'dans ℝ \\ {0}'],
		['.simplifier (x^2-1)/(x+1)', 'avec x ≠ −1', 'dans ℝ \\ {-1}'],
		['.simplifier ln(x)-ln(x)', 'avec x > 0', 'dans ]0 ; +∞['],
		['.développer x(1/x-1)', 'avec x ≠ 0', 'dans ℝ \\ {0}']
	])('%s : « %s », « %s »', (input, avec, dans) => {
		const { note } = line(input);
		expect(note).toContain('On peut simplifier davantage pour');
		expect(note).toContain(avec);
		expect(note).toContain(dans);
	});

	it('plusieurs lettres : « avec » seulement', () => {
		const { note } = line('x/x+y/y');
		expect(note).toContain('avec x ≠ 0 et y ≠ 0');
		expect(note).not.toContain('dans');
	});

	it('rien à simplifier de plus : pas de note', () => {
		expect(line('x+1').note).toBeUndefined();
		expect(line('.simplifier 2x+3x').note).toBeUndefined();
	});
});

describe('« Simplifier en disant la condition »', () => {
	it('x/x : la ligne dit la condition, le bouton revient', () => {
		const result = line('x/x', 'conditions');
		expect(flat(result.latex)).toBe(flat('1\\text{,}\\quad\\text{pour }x\\neq0'));
		expect(result.alternative?.label).toBe('Sans simplifier');
		expect(result.alternative?.back).toBe('Simplifier pour x ≠ 0');
		expect(flat(result.alternative?.latex)).toBe(flat('\\dfrac{x}{x}'));
		expect(result.note).toBeUndefined();
	});

	it('.simplifier (x²−1)/(x+1) : les étapes du calcul entier sur la ligne', () => {
		const result = line('.simplifier (x^2-1)/(x+1)', 'conditions');
		expect(flat(result.latex)).toBe(flat('x-1\\text{,}\\quad\\text{pour }x\\neq-1'));
		expect(result.steps?.map((s) => s.rule)).toEqual(['fraction-factorise', 'fraction-cancel']);
	});

	it('le domaine ne change pas : rien ne change', () => {
		const result = line('.simplifier 2x+3x', 'conditions');
		expect(flat(result.latex)).toBe('5x');
		expect(result.alternative).toBeUndefined();
	});
});

describe('le réglage ne vaut que pour les nouvelles lignes', () => {
	it('une ligne écrite garde son écriture quand le réglage change', () => {
		const s = session('keep');
		const before = runInput(s, 'x/x');
		s.atelier.setDomainMode('conditions');
		const after = runInput(s, 'x/x');
		expect(before.kind === 'calcul' && flat(before.latex)).toBe(flat('\\dfrac{x}{x}'));
		expect(after.kind === 'calcul' && flat(after.latex)).toContain('\\text{pour}');
	});
});

describe('avec CONDITION', () => {
	it.each([
		['x/x avec x ≠ 0', '1'],
		['x/x avec x > 0', '1'],
		['x/x avec x != 0', '1'],
		['.simplifier (x^2-1)/(x+1) avec x ≠ -1', 'x-1'],
		['.simplifier ln(x)-ln(x) avec x > 0', '0'],
		['.simplifier ln(x)-ln(x) avec 0 < x <= 5', '0'],
		['.simplifier x/x avec x < 0 ou x > 2', '1'],
		['.développer x(1/x-1) avec x ≠ 0', '-x+1'],
		['.factoriser x/x avec x ≠ 0', '1'],
		['x/x+y/y avec x > 0 et y ≠ 0', '2']
	])('%s → %s, sans bouton ni note', (input, latex) => {
		const result = line(input);
		expect(flat(result.latex)).toBe(flat(latex));
		expect(result.alternative).toBeUndefined();
		expect(result.note).toBeUndefined();
	});

	it('.simplifier (x²−1)/(x+1) avec x ≠ −1 : les étapes viennent', () => {
		const result = line('.simplifier (x^2-1)/(x+1) avec x ≠ -1');
		expect(result.steps?.map((s) => s.rule)).toEqual(['fraction-factorise', 'fraction-cancel']);
	});

	it('la saisie reste écrite telle quelle', () => {
		expect(line('x/x avec x ≠ 0').input).toBe('x/x avec x ≠ 0');
	});

	it('une hypothèse qui ne garantit pas la condition : la ligne garde et le dit', () => {
		const result = line('x/x avec x > -1');
		expect(flat(result.latex)).toBe(flat('\\dfrac{x}{x}'));
		expect(result.note).toContain('x > -1 ne garantit pas x ≠ 0');
	});

	it('une lettre sans hypothèse : la ligne garde et le dit', () => {
		const result = line('x/x+y/y avec x > 0');
		expect(result.note).toContain('ne garantit pas y ≠ 0');
	});

	it('rien à simplifier : l’hypothèse ne change rien, et c’est dit', () => {
		const result = line('x+1 avec x > 0');
		expect(flat(result.latex)).toBe('x+1');
		expect(result.note).toContain('ne change rien');
	});

	it('« et » et « ou » mêlés : refus, avec la façon de l’écrire', () => {
		expect(refusal('x/x avec x > 0 et x < 3 ou x > 5')).toContain('∪');
	});

	it('une condition illisible : refus', () => {
		expect(refusal('x/x avec bla')).toContain('avec');
	});

	it('en mode « condition dite », l’hypothèse qui garantit tout : la réponse seule', () => {
		const result = line('x/x avec x ≠ 0', 'conditions');
		expect(flat(result.latex)).toBe('1');
		expect(result.alternative).toBeUndefined();
	});
});

describe('dans ENSEMBLE', () => {
	it.each([
		['.simplifier (x^2-1)/(x+1) dans ]0;+∞[', 'x-1'],
		['.simplifier x/x dans ]-∞;0[ ∪ ]0;+∞[', '1'],
		['.simplifier ln(x)-ln(x) dans ]0;+∞[ ∩ ]-∞;5]', '0'],
		['.simplifier x/x dans ℝ \\ {0}', '1'],
		['x/x dans ℝ*', '1']
	])('%s → %s', (input, latex) => {
		const result = line(input);
		expect(flat(result.latex)).toBe(flat(latex));
		expect(result.alternative).toBeUndefined();
	});

	it('un ensemble qui contient 0 : la ligne garde et le dit', () => {
		const result = line('.simplifier x/x dans ℝ');
		expect(flat(result.latex)).toBe(flat('\\dfrac{x}{x}'));
		expect(result.note).toContain('ne garantit pas x ≠ 0');
	});

	it('plusieurs lettres : refus, « avec » le dit', () => {
		expect(refusal('x/x+y/y dans ]0;+∞[')).toContain('avec');
	});

	it('.résoudre garde son « dans »', () => {
		expect(runInput(session(), '.résoudre x^2=1 dans [0;2]').kind).toBe('commande');
	});
});

describe('la note se recopie telle quelle', () => {
	it.each(['.simplifier (x^2-1)/(x+1)', '.simplifier ln(x)-ln(x)', 'x/x', '.simplifier sqrt(x)^2'])(
		'%s : « avec … » et « dans … » de la note simplifient',
		(input) => {
			const note = line(input).note ?? '';
			const avec = /« (avec [^»]+) »/.exec(note)?.[1];
			const dans = /« (dans [^»]+) »/.exec(note)?.[1];
			for (const hypothesis of [avec, dans]) {
				expect(hypothesis).toBeDefined();
				const result = line(`${input} ${hypothesis}`);
				expect(result.alternative).toBeUndefined();
				expect(result.note).toBeUndefined();
			}
		}
	);
});

describe('conditions non polynomiales (§ 4.1)', () => {
	it.each([
		['ln(x)/ln(x) avec x > 1', '1'],
		['ln(x)/ln(x) dans ]1;+∞[', '1'],
		['.simplifier 1/ln(x)-1/ln(x) avec x > 1', '0'],
		['.simplifier 1/(e^x-1)-1/(e^x-1) avec x > 0', '0'],
		['.simplifier 1/(e^x-1)-1/(e^x-1) dans ℝ \\ {0}', '0']
	])('%s → %s', (input, latex) => {
		const result = line(input);
		expect(flat(result.latex)).toBe(flat(latex));
		expect(result.alternative).toBeUndefined();
	});

	it.each(['ln(x)/ln(x) avec x > 0', '.simplifier 1/(e^x-1)-1/(e^x-1) dans ℝ'])(
		'%s : l’hypothèse ne garantit pas la condition, la ligne garde',
		(input) => {
			const result = line(input);
			expect(flat(result.latex)).not.toBe('1');
			expect(flat(result.latex)).not.toBe('0');
			expect(result.note).toContain('ne garantit pas');
		}
	);

	// `avec ln(x) ≠ 0` ne se relit pas : seul « dans » est proposé
	it.each([
		['ln(x)/ln(x)', 'dans ]0 ; +∞[ \\ {1}'],
		['.simplifier 1/(e^x-1)-1/(e^x-1)', 'dans ℝ \\ {0}']
	])('%s : la note propose « %s », qui marche recopié', (input, dans) => {
		const note = line(input).note ?? '';
		expect(note).toContain(`« ${dans} »`);
		for (const match of note.matchAll(/« ((?:avec|dans) [^»]+) »/g)) {
			const result = line(`${input} ${match[1]}`);
			expect(result.alternative).toBeUndefined();
			expect(result.note).toBeUndefined();
		}
	});

	it.each(['tan(x)/tan(x) avec x > 0', '(x-ln(x))/(x-ln(x)) avec x > 0'])(
		'%s : domaine non résolu, rien n’est garanti',
		(input) => {
			expect(flat(line(input).latex)).not.toBe('1');
		}
	);
});

describe('domainChange par ensembles (§ 4.2)', () => {
	it.each([
		['.simplifier ln(x^3)', '3\\ln\\left(x\\right)'],
		['.simplifier ln(x^2)+ln(x)', '3\\ln\\left(x\\right)']
	])('%s → %s : même ensemble, la ligne simplifie sans condition', (input, latex) => {
		const result = line(input);
		expect(flat(result.latex)).toBe(flat(latex));
		expect(result.alternative).toBeUndefined();
		expect(result.note).toBeUndefined();
	});

	it('.simplifier ln(x²) : le bouton « Simplifier pour x > 0 »', () => {
		const result = line('.simplifier ln(x^2)');
		expect(flat(result.latex)).toBe(flat('\\ln\\left(x^2\\right)'));
		expect(result.alternative?.label).toBe('Simplifier pour x > 0');
		expect(flat(result.alternative?.latex)).toBe(
			flat('2\\ln\\left(x\\right)\\text{,}\\quad\\text{pour }x>0')
		);
	});

	it('.simplifier ln(x²) : la note dit l’écriture qu’on peut avoir pour x > 0', () => {
		const note = line('.simplifier ln(x^2)').note ?? '';
		expect(note).toMatch(/^Pour x > 0, on peut écrire 2 ?ln\(x\) : ajoute « avec x > 0 »/);
	});

	it.each(['.simplifier ln(x^2) avec x > 0', '.simplifier ln(x^2) dans ]0;+∞['])(
		'%s → 2 ln(x)',
		(input) => {
			const result = line(input);
			expect(flat(result.latex)).toBe(flat('2\\ln\\left(x\\right)'));
			expect(result.alternative).toBeUndefined();
			expect(result.note).toBeUndefined();
		}
	);

	it('.simplifier ln(x²) avec x ≠ 0 : ne garantit pas x > 0', () => {
		const result = line('.simplifier ln(x^2) avec x ≠ 0');
		expect(flat(result.latex)).toBe(flat('\\ln\\left(x^2\\right)'));
		expect(result.note).toContain('ne garantit pas x > 0');
	});

	it.each([
		['.simplifier ln(x(x+1))', '\\ln\\left(x\\right)+\\ln\\left(x+1\\right)', 'x>0'],
		['.simplifier ln(x/(x+1))', '\\ln\\left(x\\right)-\\ln\\left(x+1\\right)', 'x>0'],
		['.simplifier sqrt(x)sqrt(x+1)', '\\sqrt{x\\left(x+1\\right)}', 'x\\geq0']
	])('%s : le bouton montre %s, pour %s, sans parenthèses de trop', (input, answer, condition) => {
		expect(flat(line(input).alternative?.latex)).toBe(
			flat(`${answer}\\text{,}\\quad\\text{pour }${condition}`)
		);
	});

	// Revue Opus : défini pour x < 0 seulement, « pour x > 0 » ne laisse aucun point
	it.each([
		'.simplifier ln(x^2)+ln(-x)',
		'.simplifier ln(x^2)+ln(-x) avec x > 0',
		'.simplifier ln(x^2)*sqrt(-x)'
	])('%s : ni bouton ni simplification', (input) => {
		for (const mode of ['keep', 'conditions'] as const) {
			const result = line(input, mode);
			expect(result.alternative).toBeUndefined();
			expect(flat(result.latex)).not.toContain('2\\ln');
		}
	});

	it('une hypothèse hors du domaine de l’expression ne simplifie rien', () => {
		const result = line('.simplifier x/x+sqrt(-x) avec x > 0');
		expect(flat(result.latex)).not.toContain('1+');
		expect(result.note).toContain('x > 0');
		expect(result.note).toContain('n’est jamais défini');
	});

	it('« Simplifier en disant la condition » : 2 ln(x), pour x > 0', () => {
		const result = line('.simplifier ln(x^2)', 'conditions');
		expect(flat(result.latex)).toBe(flat('2\\ln\\left(x\\right)\\text{,}\\quad\\text{pour }x>0'));
		expect(result.alternative?.label).toBe('Sans simplifier');
	});
});

// § 5, L5 : plusieurs lettres, le domaine rétrécit (David, 2026-10-26)
describe('plusieurs lettres, le domaine rétrécit (§ 5, L5)', () => {
	it.each([
		['.simplifier ln(xy)', '\\ln\\left(x\\right)+\\ln\\left(y\\right)', 'x>0\\text{ et }y>0'],
		['.simplifier ln(x/y)', '\\ln\\left(x\\right)-\\ln\\left(y\\right)', 'x>0\\text{ et }y>0'],
		['.simplifier sqrt(x/y)', '\\dfrac{\\sqrt{x}}{\\sqrt{y}}', 'x\\geq0\\text{ et }y>0']
	])('%s : la ligne garde, le bouton montre %s, pour %s', (input, answer, condition) => {
		const result = line(input);
		expect(flat(result.latex)).not.toBe(flat(answer));
		expect(flat(result.alternative?.latex)).toBe(
			flat(`${answer}\\text{,}\\quad\\text{pour }${condition}`)
		);
	});

	it('.simplifier ln(xy) : le bouton « Simplifier pour x > 0 et y > 0 »', () => {
		expect(line('.simplifier ln(xy)').alternative?.label).toBe('Simplifier pour x > 0 et y > 0');
	});

	it('.simplifier ln(xy) : la note propose « avec x > 0 et y > 0 », pas « dans »', () => {
		const note = line('.simplifier ln(xy)').note ?? '';
		expect(note).toContain('avec x > 0 et y > 0');
		expect(note).not.toContain('dans');
	});

	it('.simplifier ln(xy) avec x > 0 et y > 0 → ln(x) + ln(y)', () => {
		const result = line('.simplifier ln(xy) avec x > 0 et y > 0');
		expect(flat(result.latex)).toBe(flat('\\ln\\left(x\\right)+\\ln\\left(y\\right)'));
		expect(result.alternative).toBeUndefined();
		expect(result.note).toBeUndefined();
	});

	it('.simplifier ln(xy) avec x > 0 : ne garantit pas y > 0', () => {
		const result = line('.simplifier ln(xy) avec x > 0');
		expect(flat(result.latex)).toBe(flat('\\ln\\left(xy\\right)'));
		expect(result.note).toContain('ne garantit pas y > 0');
	});

	// Revue Opus : xy > 0 vaut aussi pour x < 0 et y < 0, où ln x n'existe pas
	it('.simplifier ln(xy) avec x < 0 et y < 0 : la ligne garde ln(xy)', () => {
		const result = line('.simplifier ln(xy) avec x < 0 et y < 0');
		expect(flat(result.latex)).toBe(flat('\\ln\\left(xy\\right)'));
		expect(result.note).toContain('ne garantit pas');
	});

	it('« Simplifier en disant la condition » : ln(x) + ln(y), pour x > 0 et y > 0', () => {
		const result = line('.simplifier ln(xy)', 'conditions');
		expect(flat(result.latex)).toBe(
			flat(
				'\\ln\\left(x\\right)+\\ln\\left(y\\right)\\text{,}\\quad\\text{pour }x>0\\text{ et }y>0'
			)
		);
		expect(result.alternative?.label).toBe('Sans simplifier');
	});
});

// Restes de la revue Opus du § 4.2, corrigés à la demande de David (2026-10-26)
describe('restes de la revue du § 4.2', () => {
	it.each([
		['.simplifier ln(x^2)-ln(x^2)', '0', 'x ≠ 0'],
		['.simplifier ln(x^3)-ln(x^3)', '0', 'x > 0'],
		['.simplifier e^(ln(x^2))', 'x^2', 'x ≠ 0'],
		['.simplifier e^(2ln(x))', 'x^2', 'x > 0'],
		['.simplifier (ln(x))^2/ln(x)', '\\ln\\left(x\\right)', 'x ≠ 1'],
		['ln(x)/ln(x)', '1', 'x > 0 et x ≠ 1']
	])('%s : bouton « %s, pour %s »', (input, answer, condition) => {
		const { alternative } = line(input);
		expect(alternative?.label).toBe(`Simplifier pour ${condition}`);
		expect(flat(alternative?.domain?.answer)).toBe(flat(answer));
	});

	// 2ᵉ revue : deux `ln(…) ≠ 0` se garantissaient l'un l'autre x > 0
	it('ln(x)/ln(x) + ln(x/2)/ln(x/2) : x > 0 reste dit', () => {
		const { alternative } = line('.simplifier ln(x)/ln(x)+ln(x/2)/ln(x/2)');
		expect(alternative?.label).not.toBe('Simplifier pour x ≠ 1 et x ≠ 2');
		const written = line('.simplifier ln(x)/ln(x)+ln(x/2)/ln(x/2) avec x ≠ 1 et x ≠ 2');
		expect(flat(written.latex)).not.toBe('2');
	});

	// `e^(ln(−3))` → −3 vient de `normalize` (repli), noté aux Points ouverts
	it('.simplifier e^(2ln(-3)) : ln d’un négatif n’existe pas, rien ne se simplifie', () => {
		expect(flat(line('.simplifier e^(2ln(-3))').latex)).not.toBe('9');
	});

	it('.simplifier ln(x)/ln(x)+sqrt(-x) : jamais définie, pas de bouton', () => {
		expect(line('.simplifier ln(x)/ln(x)+sqrt(-x)').alternative).toBeUndefined();
	});

	// `ln(x²) → 2 ln x` ne vaut que pour x > 0 : pas d'étapes sous « pour x ≠ 0 »
	it.each(['.simplifier ln(x^2)-ln(x^2)', '.simplifier e^(ln(x^2))'])(
		'%s : le bouton ne montre pas d’étape fausse pour x < 0',
		(input) => {
			expect(line(input).alternative?.steps).toBeUndefined();
		}
	);

	it('.simplifier e^(ln(x)) : les étapes restent', () => {
		expect(line('.simplifier e^(ln(x))').alternative?.steps?.length).toBeGreaterThan(0);
	});

	it.each([
		['.simplifier ln(x^2)-ln(x^2) avec x ≠ 0', '0'],
		['ln(x)/ln(x) avec x > 0 et x ≠ 1', '1'],
		['.simplifier (ln(x))^2/ln(x) avec x ≠ 1', '\\ln\\left(x\\right)']
	])('%s → %s : la note se recopie', (input, latex) => {
		expect(flat(line(input).latex)).toBe(flat(latex));
	});
});

// Défauts restants de la 2ᵉ revue, corrigés à la demande de David (2026-10-26)
describe('restes de la 2ᵉ revue du § 4.2', () => {
	it.each([
		['.simplifier e^(2ln(x^2))', 'x^4', 'x ≠ 0'],
		['.simplifier e^(-ln(x))', '\\dfrac{1}{x}', 'x > 0'],
		['.simplifier ln(x^(-2))-ln(x^(-2))', '0', 'x ≠ 0'],
		['(x^2-1)/(x^2-1)', '1', 'x ≠ −1 et x ≠ 1']
	])('%s : bouton « %s, pour %s »', (input, answer, condition) => {
		const { alternative } = line(input);
		expect(alternative?.label).toBe(`Simplifier pour ${condition}`);
		expect(flat(alternative?.domain?.answer)).toBe(flat(answer));
	});

	it.each(['.simplifier e^(ln(-3))', '.simplifier exp(ln(-3))', '.simplifier e^(2ln(-3))'])(
		'%s : ln(−3) n’existe pas, rien ne se simplifie',
		(input) => {
			const latex = flat(line(input).latex);
			expect(latex).toContain('\\ln');
			expect(line(input).alternative).toBeUndefined();
		}
	);

	it('(x²−1)/(x²−1) avec x ≠ −1 et x ≠ 1 : la note se recopie', () => {
		expect(flat(line('(x^2-1)/(x^2-1) avec x ≠ -1 et x ≠ 1').latex)).toBe('1');
	});
});

describe('revue du 2026-10-26', () => {
	it.each([
		'cos(x)/cos(x) avec x > 0',
		'cos(x)/cos(x) dans ]0;2[',
		'1/cos(x)-1/cos(x) dans ]0;2[',
		'sin(x)/sin(x) dans ]-1;1['
	])('%s : une famille périodique n’est jamais garantie', (input) => {
		const result = line(input);
		expect(flat(result.latex)).not.toBe('1');
		expect(flat(result.latex)).not.toBe('0');
	});

	it.each(['cos(x)/cos(x)', '1/ln(x)-1/ln(x)', '(x^2-1)/(x^2-1)'])(
		'%s : la note ne propose que ce qui marche une fois recopié',
		(input) => {
			const note = line(input).note ?? '';
			expect(note).toContain('On peut simplifier davantage pour');
			for (const match of note.matchAll(/« ((?:avec|dans) [^»]+) »/g)) {
				const result = line(`${input} ${match[1]}`);
				expect(result.alternative).toBeUndefined();
			}
		}
	);

	it('.développer x(1/x−1) avec x ≠ 0 : pas d’étapes qui finissent ailleurs', () => {
		const result = line('.développer x(1/x-1) avec x ≠ 0');
		expect(flat(result.latex)).toBe('-x+1');
		expect(result.steps).toBeUndefined();
	});

	it('une expression tapée sans bouton : la note renvoie à .simplifier', () => {
		expect(line('(x^2-1)/(x+1) avec x ≠ -1').note).toContain('.simplifier');
	});
});

describe('les limites, PR A (§ 5, David 2026-10-26)', () => {
	it.each(['cos(x)/cos(x) dans ]0;2[', '.simplifier cos(x)/cos(x) avec x > 0'])(
		'L1 — %s, mode conditions : la ligne garde l’écriture, comme la note le dit',
		(input) => {
			const result = line(input, 'conditions');
			expect(flat(result.latex)).toContain('\\cos');
			expect(result.alternative?.label).toBe('Simplifier pour cos(x) ≠ 0');
		}
	);

	it.each([
		['.simplifier (x^2-2)/(x^2-2)', 'x ≠ −√2 et x ≠ √2', 'avec x ≠ −√2 et x ≠ √2'],
		['.simplifier (x^2-2)/(x-sqrt(2))', 'x ≠ √2', 'avec x ≠ √2'],
		['.simplifier ln(x^2-2)-ln(x^2-2)', 'x < −√2 ou x > √2', 'avec x < −√2 ou x > √2'],
		['.simplifier ln(x^2-1)-ln(x^2-1)', 'x < −1 ou x > 1', 'avec x < −1 ou x > 1'],
		['.simplifier sqrt(x^2-3)-sqrt(x^2-3)', 'x ≤ −√3 ou x ≥ √3', 'avec x ≤ −√3 ou x ≥ √3'],
		[
			'.simplifier (x^2+x-1)/(x^2+x-1)',
			'x ≠ (−1−√5)/2 et x ≠ (−1+√5)/2',
			'avec x ≠ (−1−√5)/2 et x ≠ (−1+√5)/2'
		]
	])('L2 — %s : « pour %s », la note propose « %s »', (input, condition, avec) => {
		const result = line(input);
		expect(result.alternative?.label).toBe(`Simplifier pour ${condition}`);
		expect(result.note).toContain(avec);
		const typed = input.replace(/^\.simplifier /, '');
		const copied = line(`.simplifier ${typed} ${avec}`);
		expect(copied.alternative).toBeUndefined();
	});

	it('L2 — les points s’écrivent en LaTeX exact sur le bouton', () => {
		const { alternative } = line('.simplifier (x^2+x-1)/(x^2+x-1)');
		expect(flat(alternative?.latex)).toContain('\\sqrt{5}');
		expect(flat(alternative?.latex)).not.toContain('sqrt(');
	});

	it('L2 — une racine sans écriture exacte : la condition reste entière', () => {
		const { alternative } = line('.simplifier (x^3-2)/(x^3-2)');
		expect(alternative?.label).toBe('Simplifier pour x^3−2 ≠ 0');
	});

	it.each([
		['.simplifier (arctan(x)-1)/(arctan(x)-1)', 'x ≠ tan(1)'],
		['.simplifier arcsin(x)/arcsin(x)', '−1 ≤ x ≤ 1 et x ≠ 0'],
		['.simplifier tan(x)/tan(x)', 'tan(x) ≠ 0']
	])('L3 — %s : « Simplifier pour %s »', (input, condition) => {
		expect(line(input).alternative?.label).toBe(`Simplifier pour ${condition}`);
	});

	it.each([
		['.simplifier (arctan(x)-1)/(arctan(x)-1) avec x ≠ tan(1)', '1'],
		['.simplifier (arctan(x)-2)/(arctan(x)-2)', '1'],
		['.simplifier tan(x)-tan(x) dans ]-1;1[', '0']
	])('L3 — %s → %s', (input, answer) => {
		expect(flat(line(input).latex)).toBe(answer);
	});

	it.each([
		['.simplifier ln(1-x^2)-ln(1-x^2)', '−1 < x < 1'],
		['.simplifier (x^4-5x^2+6)/(x^4-5x^2+6)', 'x ≠ −√3 et x ≠ −√2 et x ≠ √2 et x ≠ √3']
	])('L2 — %s : « pour %s »', (input, condition) => {
		expect(line(input).alternative?.label).toBe(`Simplifier pour ${condition}`);
	});

	it('L3 — arcsin : la note se recopie', () => {
		const { note } = line('.simplifier arcsin(x)/arcsin(x)');
		expect(note).toContain('avec −1 ≤ x ≤ 1 et x ≠ 0');
		expect(flat(line('.simplifier arcsin(x)/arcsin(x) avec −1 ≤ x ≤ 1 et x ≠ 0').latex)).toBe('1');
	});

	it.each([
		['.simplifier ln(x)-ln(x) avec x ≥ e', '0'],
		['.simplifier ln(x)-ln(x) avec x > ln(2)', '0'],
		['.simplifier ln(x)-ln(x) dans ]e;+∞[', '0'],
		['.simplifier (x^2-2)/(x^2-2) dans ]√2;+∞[', '1'],
		['.simplifier cos(x)/cos(x) avec 0 < x < 1', '1'],
		['.simplifier cos(x)/cos(x) dans ]-π/2;π/2[', '1'],
		['.simplifier sin(x)/sin(x) dans ]0;π[', '1']
	])('L4 — %s → %s', (input, answer) => {
		expect(flat(line(input).latex)).toBe(answer);
	});

	it.each([
		'.simplifier cos(x)/cos(x) dans ]-π/2;π/2]',
		'.simplifier sin(x)/sin(x) dans [0;π[',
		'.simplifier ln(x)-ln(x) avec x ≥ -e'
	])('L4 — %s : un point exclu au bord, rien ne se simplifie', (input) => {
		const latex = flat(line(input).latex);
		expect(latex).not.toBe('1');
		expect(latex).not.toBe('0');
	});
});

describe('revue Opus de la PR A (§ 5)', () => {
	it.each([
		'.simplifier cos(x)/cos(x) avec 1.5707963267 < x < 2',
		'.simplifier sin(x)/sin(x) dans ]3.1415926535;4[',
		'.simplifier cos(x)/cos(x) avec 1 < x < 1.5707963268'
	])('%s : π/2 ou π dans l’intervalle, rien ne se simplifie', (input) => {
		for (const mode of ['keep', 'conditions'] as const) {
			expect(flat(line(input, mode).latex)).not.toBe('1');
		}
	});

	it('une borne décimale juste avant π/2 : la famille est évitée', () => {
		expect(flat(line('.simplifier cos(x)/cos(x) avec 1 < x < 1.5707963267').latex)).toBe('1');
	});

	it('« ou » en LaTeX : \\text{ ou }, pas une tabulation', () => {
		const result = line('.simplifier ln(x^2-2)-ln(x^2-2)', 'conditions');
		expect(result.latex).not.toContain('\t');
		expect(flat(result.latex)).toContain('\\text{ou}');
	});

	it('π s’écrit π dans le texte du bouton', () => {
		const label = line('.simplifier (arccos(x)-π)/(arccos(x)-π)').alternative?.label;
		expect(label).toContain('π');
		expect(label).not.toContain('\\pi');
	});

	it('un ensemble réduit à un point : « x = 0 »', () => {
		expect(line('.simplifier sqrt(-x^2)-sqrt(-x^2)').alternative?.label).toBe(
			'Simplifier pour x = 0'
		);
	});

	it('E majuscule reste une lettre', () => {
		expect(flat(line('.simplifier E/E avec E ≠ 0').latex)).toBe('1');
	});
});
