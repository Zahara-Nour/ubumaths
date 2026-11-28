/**
 * Atelier — une fonction PAR MORCEAUX : `f(x) = x pour x < k, x^2 pour x ≥ k`.
 *
 * Chantier `fonctions-par-morceaux`, PR 2 (phase 0 validée par David le
 * 2026-11-28, journal `docs/wip/fonctions-par-morceaux-progress.md`) : plusieurs
 * formules, chacune avec sa condition après « pour », séparées par des
 * virgules ; `sinon` pour le dernier morceau (Q2). Conditions qui se chevauchent
 * refusées (Q1) ; trou entre les morceaux accepté ; commandes d'étude refusées
 * clairement (Q3, un second chantier les fera morceau par morceau).
 */

import { describe, it, expect } from 'vitest';
import { CalcDesk } from '../desk.svelte';
import { Atelier } from '../atelier.svelte';
import { fieldLatexOf } from '../mathfield';
import { intervalLabelOf, splitInterval, UNREADABLE_CONDITION } from '../interval';
import { astOf } from '../parse';
import {
	OTHERWISE_LAST,
	PIECE_WITHOUT_CONDITION,
	PIECEWISE_ONLY_FUNCTIONS,
	SEQUENCE_PIECES,
	WRITE_WITH_POUR
} from '../piecewise';
import { internalDefinition } from '../letter';
import { AtelierFigure, syncFigure } from '../figure-sync';
import type { Entry } from '../desk.svelte';
import { createTransformer } from '#lib/geometry-core/viewport/viewport.ts';
import { functionToSVG } from '#lib/geometry-core/rendering/svg-primitives.ts';

// =============================================================================
// Aides
// =============================================================================

function desk(...definitions: string[]): CalcDesk {
	const d = new CalcDesk(new Atelier());
	for (const definition of definitions) {
		d.submit(definition);
		if (d.entries.at(-1)?.failed) {
			throw new Error(`définition refusée : ${definition} — ${d.entries.at(-1)?.text}`);
		}
	}
	return d;
}

function last(d: CalcDesk): Entry {
	const entry = d.entries.at(-1);
	if (entry === undefined) throw new Error('aucune ligne');
	return entry;
}

/** La réponse de Calcul à `line` : son texte, et si c'est un refus. */
function answer(d: CalcDesk, line: string): { text: string; failed: boolean } {
	d.submit(line);
	const entry = last(d);
	return { text: entry.text, failed: entry.failed };
}

/** Le curseur de `name` posé sur `value` (le geste de l'élève). */
function slide(d: CalcDesk, name: string, value: number): void {
	const moved = d.atelier.slideTo(name, value);
	if (!moved.ok) throw new Error(moved.message);
}

const TWO_PIECES = 'f(x) = x pour x < 2, x^2 pour x ≥ 2';

// =============================================================================
// Écriture
// =============================================================================

describe('l’écriture par morceaux n’est pas coupée au premier « pour »', () => {
	it.each([
		['x pour x < 2, x^2 pour x ≥ 2', 'detect'],
		['x pour x < 0, x^2 sinon', 'detect'],
		['x\\text{ pour }x<2,x^2\\text{ pour }x\\ge2', 'latex'],
		['xpourx<2,x^2pourx\\ge2', 'latex'],
		['x\\text{ pour }x<0,x^2\\text{ sinon}', 'latex']
	] as const)('%s (%s) : tout reste la définition', (typed, mode) => {
		expect(splitInterval(typed, mode)).toEqual({ body: typed, written: null });
	});

	it('un seul morceau reste coupé comme avant : x pour x > 2', () => {
		expect(splitInterval('x pour x > 2', 'detect')).toEqual({ body: 'x', written: 'x > 2' });
	});

	it('la virgule décimale d’une condition n’est pas une coupure : x pour x < 0,5, 1 sinon', () => {
		const ast = astOf('x pour x < 0,5, 1 sinon', 'text');
		expect(ast?.type).toBe('piecewise');
		if (ast?.type !== 'piecewise') return;
		expect(ast.pieces).toHaveLength(1);
		expect(ast.otherwise).toBeDefined();
	});

	it('la lecture donne un nœud par morceaux, deux morceaux', () => {
		const ast = astOf('x pour x < 2, x^2 pour x ≥ 2', 'text');
		expect(ast?.type).toBe('piecewise');
		if (ast?.type !== 'piecewise') return;
		expect(ast.pieces).toHaveLength(2);
		expect(ast.otherwise).toBeUndefined();
	});
});

// =============================================================================
// Cas normal
// =============================================================================

describe('Calcul : f(x) = x pour x < 2, x^2 pour x ≥ 2', () => {
	it('crée la fonction, sans ensemble à part', () => {
		const d = desk(TWO_PIECES);
		const f = d.atelier.get('f');
		expect(f?.kind).toBe('function');
		expect(f?.status).toBe('ok');
		expect(f?.kind === 'function' && f.interval).toBeFalsy();
	});

	it('chaque nombre prend la formule de son morceau : f(1) = 1, f(2) = 4, f(3) = 9', () => {
		const d = desk(TWO_PIECES);
		expect(answer(d, 'f(1)')).toEqual({ text: '1', failed: false });
		expect(answer(d, 'f(2)')).toEqual({ text: '4', failed: false });
		expect(answer(d, 'f(3)')).toEqual({ text: '9', failed: false });
	});

	it('une image dans un calcul : f(3) + f(1) = 10', () => {
		const d = desk(TWO_PIECES);
		expect(answer(d, 'f(3) + f(1)')).toEqual({ text: '10', failed: false });
	});

	it('trois morceaux', () => {
		const d = desk('f(x) = -x pour x < 0, x pour 0 ≤ x < 1, 1 pour x ≥ 1');
		expect(answer(d, 'f(-2)')).toEqual({ text: '2', failed: false });
		expect(answer(d, 'f(5)')).toEqual({ text: '1', failed: false });
	});

	it('une autre lettre : f(t) = t pour t < 0, t^2 pour t ≥ 0', () => {
		const d = desk('f(t) = t pour t < 0, t^2 pour t ≥ 0');
		expect(answer(d, 'f(3)')).toEqual({ text: '9', failed: false });
		expect(answer(d, 'f(-1)')).toEqual({ text: '-1', failed: false });
	});

	it('une fonction qui cite une fonction par morceaux : g(x) = f(x) + 1', () => {
		const d = desk(TWO_PIECES, 'g(x) = f(x) + 1');
		expect(answer(d, 'g(3)')).toEqual({ text: '10', failed: false });
	});
});

describe('Q2 : sinon en dernier morceau', () => {
	it('x pour x < 0, x^2 sinon : f(−1) = −1, f(3) = 9, définie sur ℝ', () => {
		const d = desk('f(x) = x pour x < 0, x^2 sinon');
		expect(answer(d, 'f(-1)')).toEqual({ text: '-1', failed: false });
		expect(answer(d, 'f(3)')).toEqual({ text: '9', failed: false });
		expect(intervalLabelOf(d.atelier.get('f')!)).toBeNull();
	});
});

describe('l’ensemble est la réunion des conditions', () => {
	it('sans trou : ℝ', () => {
		const d = desk(TWO_PIECES);
		expect(intervalLabelOf(d.atelier.get('f')!)).toBeNull();
	});

	it('avec un trou : x pour x < 0, x^2 pour x > 1', () => {
		const d = desk('f(x) = x pour x < 0, x^2 pour x > 1');
		expect(intervalLabelOf(d.atelier.get('f')!)).toBe(']−∞ ; 0[ ∪ ]1 ; +∞[');
	});

	it('dans le trou, pas d’image, le message habituel', () => {
		const d = desk('f(x) = x pour x < 0, x^2 pour x > 1');
		expect(answer(d, 'f(0,5)')).toEqual({
			text: "0,5 n'est pas dans l'ensemble de définition de f, ]−∞ ; 0[ ∪ ]1 ; +∞[.",
			failed: true
		});
		expect(answer(d, 'f(2)')).toEqual({ text: '4', failed: false });
	});

	it('.domaine f dit l’ensemble', () => {
		const d = desk('f(x) = x pour x < 0, x^2 pour x > 1');
		const domain = answer(d, '.domaine f');
		expect(domain.failed).toBe(false);
		expect(domain.text).toContain(']−∞ ; 0[ ∪ ]1 ; +∞[');
	});
});

// =============================================================================
// Coupure à paramètre
// =============================================================================

describe('la coupure suit le curseur', () => {
	it('k = 2 : f(1) = 1, f(3) = 9 ; k à 5 : f(3) = 3', () => {
		const d = desk('k = 2', 'f(x) = x pour x < k, x^2 pour x ≥ k');
		expect(d.atelier.get('f')?.status).toBe('ok');
		expect(answer(d, 'f(1)')).toEqual({ text: '1', failed: false });
		expect(answer(d, 'f(3)')).toEqual({ text: '9', failed: false });
		slide(d, 'k', 5);
		expect(answer(d, 'f(3)')).toEqual({ text: '3', failed: false });
	});

	it('la fonction attend k quand k n’existe pas encore', () => {
		const d = desk('f(x) = x pour x < k, x^2 pour x ≥ k');
		expect(d.atelier.get('f')?.status).not.toBe('ok');
		d.submit('k = 2');
		expect(d.atelier.get('f')?.status).toBe('ok');
		expect(answer(d, 'f(3)')).toEqual({ text: '9', failed: false });
	});

	it('le curseur qui fait se chevaucher les conditions : carte en erreur, puis retour', () => {
		const d = desk('k = 0', 'f(x) = x pour x < k, x^2 pour x > 1');
		expect(d.atelier.get('f')?.status).toBe('ok');
		slide(d, 'k', 3);
		const f = d.atelier.get('f');
		expect(f?.status).toBe('error');
		expect(f?.message).toMatch(/^Les conditions se chevauchent/);
		expect(f?.message).toContain('k = 3');
		slide(d, 'k', 0);
		expect(d.atelier.get('f')?.status).toBe('ok');
	});
});

// =============================================================================
// Refus
// =============================================================================

describe('Calcul : refus', () => {
	it('Q1 : des conditions qui se chevauchent', () => {
		const d = desk();
		const refused = answer(d, 'f(x) = x pour x < 3, x^2 pour x > 2');
		expect(refused.failed).toBe(true);
		expect(refused.text).toBe(
			'Les conditions se chevauchent sur ]2 ; 3[ : chaque nombre doit appartenir à un seul morceau.'
		);
		expect(d.atelier.get('f')).toBeUndefined();
	});

	it('un morceau sans condition au milieu', () => {
		const d = desk();
		expect(answer(d, 'f(x) = x pour x < 0, x^2, 1 pour x > 1')).toEqual({
			text: PIECE_WITHOUT_CONDITION,
			failed: true
		});
		expect(d.atelier.get('f')).toBeUndefined();
	});

	it('un dernier morceau sans condition ni « sinon »', () => {
		const d = desk();
		expect(answer(d, 'f(x) = x pour x < 0, x^2')).toEqual({
			text: PIECE_WITHOUT_CONDITION,
			failed: true
		});
	});

	it('« sinon » ailleurs qu’au dernier morceau', () => {
		const d = desk();
		expect(answer(d, 'f(x) = x sinon, x^2 pour x > 0')).toEqual({
			text: OTHERWISE_LAST,
			failed: true
		});
	});

	it('une condition sur une autre lettre', () => {
		const d = desk();
		expect(answer(d, 'f(x) = x pour t < 0, x^2 pour x ≥ 0')).toEqual({
			text: UNREADABLE_CONDITION,
			failed: true
		});
		expect(d.atelier.get('f')).toBeUndefined();
	});

	it('une formule hors de son domaine sur sa condition : ln(x) pour x < 1', () => {
		const d = desk();
		const refused = answer(d, 'f(x) = ln(x) pour x < 1, x pour x ≥ 1');
		expect(refused.failed).toBe(true);
		expect(refused.text).toContain("n'est pas défini sur tout ]−∞ ; 1[");
		expect(d.atelier.get('f')).toBeUndefined();
	});

	it('une formule hors de son domaine sur « sinon »', () => {
		const d = desk();
		const refused = answer(d, 'f(x) = x pour x > 0, ln(x) sinon');
		expect(refused.failed).toBe(true);
		expect(refused.text).toContain("n'est pas défini sur tout ]−∞ ; 0]");
	});

	it('une valeur ne devient pas une fonction par morceaux (le type rangé ne change pas)', () => {
		const d = desk('a = 2');
		const refused = answer(d, 'a = 3 pour x < 0, 4 pour x ≥ 0');
		expect(refused.failed).toBe(true);
		expect(d.atelier.get('a')?.kind).toBe('value');
	});

	it('l’Atelier refuse une valeur par morceaux', () => {
		const atelier = new Atelier();
		const created = atelier.create(
			{ kind: 'value', name: 'a', definition: '3 pour x < 0, 4 pour x ≥ 0' },
			'text'
		);
		expect(created).toEqual({ ok: false, message: PIECEWISE_ONLY_FUNCTIONS });
	});
});

describe('Q3 : les commandes d’étude sont refusées clairement', () => {
	it.each([
		['.résoudre f(x) = 4', 'résoudre'],
		['.variations f', 'variations'],
		['.dériver f', 'dériver'],
		['.tabuler f', 'tabuler'],
		['.valeurs f', 'valeurs']
	])('%s', (line, command) => {
		const d = desk(TWO_PIECES);
		const refused = answer(d, line);
		expect(refused.failed).toBe(true);
		expect(refused.text).toContain('f est définie par morceaux');
		expect(refused.text).toContain(`.${command}`);
	});

	it('f′(3) est refusée aussi', () => {
		const d = desk(TWO_PIECES);
		const refused = answer(d, "f'(3)");
		expect(refused.failed).toBe(true);
		expect(refused.text).toContain('f est définie par morceaux');
	});

	it('.évaluer aussi : le refus montre l’image à taper', () => {
		const d = desk(TWO_PIECES);
		const refused = answer(d, '.évaluer f(x) en x = 3');
		expect(refused.failed).toBe(true);
		expect(refused.text).toContain('f(3)');
	});

	it('une fonction qui cite une fonction par morceaux : refusée aussi', () => {
		const d = desk(TWO_PIECES, 'g(x) = f(x) + 1');
		const refused = answer(d, '.dériver g');
		expect(refused.failed).toBe(true);
		expect(refused.text).toContain('g cite une fonction définie par morceaux');
	});

	it('.domaine f se calcule', () => {
		const d = desk(TWO_PIECES);
		expect(answer(d, '.domaine f').failed).toBe(false);
	});
});

// =============================================================================
// La carte
// =============================================================================

describe('la carte réaffiche ce qui a été tapé', () => {
	it('Calcul : chaque morceau avec « pour », jamais un \\begin{cases}', () => {
		const d = desk(TWO_PIECES);
		const latex = fieldLatexOf(d.atelier.get('f')!, d.atelier.functionNames);
		expect(latex).not.toContain('cases');
		expect(latex.match(/\\text\{ pour \}/g)).toHaveLength(2);
	});

	it('le champ relu redonne la même fonction', () => {
		const d = desk(TWO_PIECES);
		const latex = fieldLatexOf(d.atelier.get('f')!, d.atelier.functionNames);
		const updated = d.atelier.update('f', latex, 'keyboard');
		expect(updated.ok).toBe(true);
		expect(answer(d, 'f(3)')).toEqual({ text: '9', failed: false });
		expect(answer(d, 'f(1)')).toEqual({ text: '1', failed: false });
	});

	it('« sinon » se réaffiche', () => {
		const d = desk('f(x) = x pour x < 0, x^2 sinon');
		const latex = fieldLatexOf(d.atelier.get('f')!, d.atelier.functionNames);
		expect(latex).toContain('sinon');
	});

	it('dans sa lettre : f(t)', () => {
		const d = desk('f(t) = t pour t < 0, t^2 pour t ≥ 0');
		const latex = fieldLatexOf(d.atelier.get('f')!, d.atelier.functionNames, 't');
		expect(latex).toContain('t<0');
		expect(latex.replace(/\\text\{[^}]*\}/g, '')).not.toMatch(/x/);
	});
});

describe('la carte : écrit dans le champ de maths', () => {
	it('x\\text{ pour }x<2,x^2\\text{ pour }x\\ge2', () => {
		const atelier = new Atelier();
		const created = atelier.create(
			{ kind: 'function', name: 'f', definition: 'x\\text{ pour }x<2,x^2\\text{ pour }x\\ge2' },
			'keyboard'
		);
		expect(created.ok).toBe(true);
		expect(atelier.get('f')?.status).toBe('ok');
	});

	it('MathLive colle les mots : xpourx<2,x^2pourx\\ge2', () => {
		const atelier = new Atelier();
		const created = atelier.create(
			{ kind: 'function', name: 'f', definition: 'xpourx<2,x^2pourx\\ge2' },
			'keyboard'
		);
		expect(created.ok).toBe(true);
	});

	it('le chevauchement refusé aussi depuis la carte', () => {
		const atelier = new Atelier();
		const created = atelier.create(
			{ kind: 'function', name: 'f', definition: 'x\\text{ pour }x<3,x^2\\text{ pour }x>2' },
			'keyboard'
		);
		expect(created.ok).toBe(false);
	});
});

// =============================================================================
// Géométrie, sauvegarde
// =============================================================================

describe('Géométrie : la courbe se trace morceau par morceau', () => {
	const DIMS = { width: 400, height: 400 };
	const TRANSFORMER = createTransformer({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 }, 400, 400);

	/** Le tracé SVG de la courbe `label` (chemin et ronds aux coupures). */
	function drawn(atelier: Atelier, label: string) {
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		const element = target.figure
			.getAllElements()
			.find((el) => el.visible && el.type === 'function' && el.label === label);
		if (element === undefined) throw new Error(`pas de courbe ${label}`);
		const svg = functionToSVG(element.id, target.figure, TRANSFORMER, DIMS);
		if (svg === null) throw new Error(`courbe ${label} sans tracé`);
		return svg;
	}

	it('un saut en 2 : deux sous-chemins, un rond vide (gauche) et un rond plein (droite)', () => {
		const d = desk(TWO_PIECES);
		d.atelier.setInFigure('f', true);
		const svg = drawn(d.atelier, 'f');
		expect(svg.path.match(/M/gi)?.length ?? 0).toBeGreaterThanOrEqual(2);
		const markers = svg.endpointMarkers ?? [];
		const at2 = TRANSFORMER.mathToSvg(2, 0).x;
		const atCut = markers.filter((m) => Math.abs(m.cx - at2) < 1);
		expect(atCut.map((m) => m.bracketType).sort()).toEqual(['closed', 'open']);
	});
});

describe('sauvegarde', () => {
	it('relue, la fonction par morceaux calcule encore', () => {
		const d = desk('k = 2', 'f(x) = x pour x < k, x^2 pour x ≥ k');
		const fresh = new Atelier();
		fresh.restore(d.atelier.serialize());
		const again = new CalcDesk(fresh);
		expect(fresh.get('f')?.status).toBe('ok');
		expect(answer(again, 'f(3)')).toEqual({ text: '9', failed: false });
		expect(answer(again, 'f(1)')).toEqual({ text: '1', failed: false });
	});
});

// =============================================================================
// Revue de la PR 2
// =============================================================================

describe('revue : la carte dans une autre lettre, mots collés par MathLive', () => {
	it('tpourt<3,t^2pourt>2 se range en x, morceau par morceau', () => {
		const internal = internalDefinition('tpourt<3,t^2pourt>2', 't', 'f', 'keyboard', []);
		expect(internal.ok).toBe(true);
		if (!internal.ok) return;
		expect(internal.definition).not.toContain('cases');
		expect(internal.definition).toContain('\\text{ pour }');
	});

	it('le chevauchement est refusé aussi dans la lettre t', () => {
		const atelier = new Atelier();
		const internal = internalDefinition('tpourt<3,t^2pourt>2', 't', 'f', 'keyboard', []);
		if (!internal.ok) throw new Error(internal.message);
		const created = atelier.create(
			{ kind: 'function', name: 'f', letter: 't', definition: internal.definition },
			'keyboard'
		);
		expect(created.ok).toBe(false);
	});

	it('la carte d’une fonction tapée en x, montrée en t, garde « pour »', () => {
		const atelier = new Atelier();
		atelier.create(
			{ kind: 'function', name: 'f', letter: 't', definition: 'xpourx<2,x^2pourx\\ge2' },
			'keyboard'
		);
		const latex = fieldLatexOf(atelier.get('f')!, atelier.functionNames, 't');
		expect(latex).not.toContain('cases');
		expect(latex).toContain('pour');
	});
});

describe('revue : \\begin{cases} dans une définition', () => {
	it('refusé : les morceaux s’écrivent avec « pour »', () => {
		const atelier = new Atelier();
		const created = atelier.create(
			{
				kind: 'function',
				name: 'f',
				definition: '\\begin{cases} x & x<3 \\\\ x^2 & x>2 \\end{cases}'
			},
			'keyboard'
		);
		const message = created.ok ? atelier.get('f')?.message : created.message;
		expect(message).toBe(WRITE_WITH_POUR);
	});
});

describe('revue : une fonction par morceaux en attente', () => {
	it('k absent : f(1) dit que f attend k', () => {
		const d = desk('f(x) = x pour x < k, x^2 pour x ≥ k');
		const refused = answer(d, 'f(1)');
		expect(refused.failed).toBe(true);
		expect(refused.text).toContain('k');
		expect(refused.text).toContain('f');
		expect(refused.text).not.toMatch(/Il manque|facteur/);
	});

	it('a absent : f(−1) avec f(x) = a x pour x < 0, x sinon', () => {
		const d = desk('f(x) = a x pour x < 0, x sinon');
		const refused = answer(d, 'f(-1)');
		expect(refused.failed).toBe(true);
		expect(refused.text).not.toMatch(/Il manque « \} »/);
	});
});

describe('revue : une suite par morceaux', () => {
	it('u(n) = n pour n < 0, n^2 sinon : un message de suite', () => {
		const d = desk();
		const refused = answer(d, 'u(n) = n pour n < 0, n^2 sinon');
		expect(refused.failed).toBe(true);
		expect(refused.text).toBe(SEQUENCE_PIECES);
	});
});
