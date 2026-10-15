/**
 * Conditions et texte du tableur (lot 4, PR 3) : SI, NB.SI, texte entre
 * guillemets, comparaisons ; le renvoi de Calcul vers la grille.
 *
 * Phase 0 `docs/wip/atelier-tableur-lot4-phase0.md` §4 et §6, Q-L4-5, Q-L4-6.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';
import { functionHint } from '../grid-functions';

const A = 0;
const B = 1;
const C = 2;

function shown(atelier: Atelier, column: number, row: number): string {
	const v = atelier.cellValue(column, row);
	if (v.kind === 'number') return v.shown;
	if (v.kind === 'error') return `erreur : ${v.message}`;
	if (v.kind === 'word') return `mot : ${v.text}`;
	return v.message === undefined ? 'vide' : `vide : ${v.message}`;
}

/** Notes en A1:A5, sexe en B1:B5, et une formule en C1. */
function withClass(formula: string) {
	const a = new Atelier();
	const notes = ['12', '8', '15', '10', '7,5'];
	const sexes = ['fille', 'garçon', 'Fille', 'garçon', 'fille'];
	a.editCells([
		...notes.map((text, i) => ({ column: A, row: i + 1, text })),
		...sexes.map((text, i) => ({ column: B, row: i + 1, text })),
		{ column: C, row: 1, text: formula }
	]);
	return a;
}

describe('§4 SI', () => {
	const cases: [string, string][] = [
		['=SI(A1>=10;"admis";"ajourné")', 'mot : admis'],
		['=SI(A2>=10;"admis";"ajourné")', 'mot : ajourné'],
		['=SI(A1>10;1;0)', '1'],
		['=SI(A4>10;1;0)', '0'],
		['=SI(A4>=10;A4*2;0)', '20'],
		['=SI(A1<>12;1;2)', '2'],
		['=SI(A1=12;1;2)', '1'],
		['=SI(A5<8;"rattrapage";"")', 'mot : rattrapage'],
		['=SI(B1="fille";1;0)', '1'],
		['=SI(B3="fille";1;0)', '1'],
		['=SI(B2<>"fille";1;0)', '1'],
		['=SI(MOYENNE(A1:A5)>=10;"bien";"à revoir")', 'mot : bien'],
		['=2*SI(A1>10;3;4)', '6']
	];
	for (const [formula, expected] of cases) {
		it(formula, () => expect(shown(withClass(formula), C, 1)).toBe(expected));
	}

	it('une case vide dans la condition : la formule reste vide (T5)', () => {
		expect(shown(withClass('=SI(A9>=10;"admis";"ajourné")'), C, 1)).toBe('vide : A9 est vide.');
	});

	it('seule la branche choisie est calculée', () => {
		expect(shown(withClass('=SI(A1>0;1;1/0)'), C, 1)).toBe('1');
	});

	it('un mot rendu par SI ne peut pas entrer dans un calcul', () => {
		expect(shown(withClass('=1+SI(A1>0;"oui";2)'), C, 1)).toBe(
			'erreur : SI rend un mot (oui) : il ne peut pas entrer dans un calcul.'
		);
	});

	it('mauvais nombre d’arguments', () => {
		expect(shown(withClass('=SI(A1>0;1)'), C, 1)).toBe(
			'erreur : SI attend trois arguments : SI(condition ; si vrai ; si faux).'
		);
	});

	it('une condition sans comparaison', () => {
		expect(shown(withClass('=SI(A1;1;0)'), C, 1)).toBe(
			'erreur : La condition de SI compare deux choses : A1>=10, B2="fille"…'
		);
	});

	it('un mot ne se compare qu’avec = ou <>', () => {
		expect(shown(withClass('=SI(B1<"g";1;0)'), C, 1)).toBe(
			'erreur : Un mot se compare avec = ou <> seulement.'
		);
	});
});

describe('§4 NB.SI', () => {
	const cases: [string, string][] = [
		['=NB.SI(B1:B5;"fille")', '3'],
		['=NB.SI(B1:B5;"garçon")', '2'],
		['=NB.SI(A1:A5;">=10")', '3'],
		['=NB.SI(A1:A5;">7,5")', '4'],
		['=NB.SI(A1:A5;"<>8")', '4'],
		['=NB.SI(A1:A5;10)', '1'],
		['=NB.SI(A1:A5;"12")', '1'],
		['=NB.SI(A1:A5;A1)', '1'],
		['=NB.SI(A:A;"<10")', '2'],
		['=NB.SI(A1:A5;"fille")', '0']
	];
	for (const [formula, expected] of cases) {
		it(formula, () => expect(shown(withClass(formula), C, 1)).toBe(expected));
	}

	it('le nom d’une liste en plage', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: 'fille ; garçon ; fille' });
		a.editCells([{ column: C, row: 1, text: '=NB.SI(L;"fille")' }]);

		expect(shown(a, C, 1)).toBe('2');
	});

	it('mauvais nombre d’arguments', () => {
		expect(shown(withClass('=NB.SI(A1:A5)'), C, 1)).toBe(
			'erreur : NB.SI attend deux arguments : NB.SI(plage ; critère).'
		);
	});
});

describe('§4 texte et comparaisons hors de leur place', () => {
	it('un texte seul : refus qui dit où il sert', () => {
		expect(shown(withClass('="fille"'), C, 1)).toBe(
			'erreur : Un texte entre guillemets s’utilise dans SI ou NB.SI, par exemple =NB.SI(B2:B30;"fille").'
		);
	});

	it('une comparaison hors de SI (fini « pas un nombre réel »)', () => {
		expect(shown(withClass('=A1>2'), C, 1)).toBe(
			'erreur : Une comparaison s’écrit dans SI, par exemple =SI(A1>2;1;0).'
		);
	});

	it('un guillemet non fermé', () => {
		expect(shown(withClass('=NB.SI(B1:B5;"fille)'), C, 1)).toBe(
			'erreur : Il manque un guillemet fermant.'
		);
	});

	it('un « ; » ou une parenthèse dans un texte ne coupe rien', () => {
		const a = withClass('=SI(A1>0;"oui; (vraiment)";"non")');

		expect(shown(a, C, 1)).toBe('mot : oui; (vraiment)');
	});
});

describe('§5 noms et aide', () => {
	it('si et nb.si réécrits en capitales', () => {
		const a = withClass('=si(a1>=10;"admis";"ajourné")+0');
		a.editCells([{ column: C, row: 2, text: '=nb.si(b1:b5;"fille")' }]);

		expect(a.cell(C, 2)).toBe('=NB.SI(B1:B5;"fille")');
		expect(a.cell(C, 1)).toBe('=SI(A1>=10;"admis";"ajourné")+0');
	});

	it('l’aide connaît SI et NB.SI', () => {
		expect(functionHint('=SI(A1>2;')).toBe(
			'SI(condition ; si vrai ; si faux) — l’un ou l’autre selon la condition'
		);
		expect(functionHint('=NB.SI(B1:B5;')).toBe(
			'NB.SI(plage ; critère) — combien de cases vérifient le critère'
		);
	});
});

describe('§6 Calcul renvoie vers la grille (Q-L4-6)', () => {
	function refusal(input: string): string {
		const s = { atelier: new Atelier(), engine: new WebReplEngine() };
		runInput(s, 'L = 12 ; 15 ; 9');
		const result = runInput(s, input);
		return result.kind === 'refus' ? result.message : `${result.kind}`;
	}

	it('une fonction de statistiques : la grille, ou .stats', () => {
		expect(refusal('somme(L)')).toBe(
			'SOMME est une fonction de la grille (onglet Données). Pour une liste, tape .stats L.'
		);
		expect(refusal('moyenne(L)')).toContain('.stats L');
	});

	it('une fonction de calcul : son écriture dans Calcul', () => {
		expect(refusal('racine(2)')).toBe(
			'RACINE est une fonction de la grille (onglet Données) : dans Calcul, écris sqrt(…).'
		);
		expect(refusal('ent(2,5)')).toContain('floor(…)');
	});

	it('un nom inconnu ailleurs : le refus d’avant', () => {
		expect(refusal('truc(2)')).toContain('Fonction inconnue : truc.');
	});
});

describe('un texte entre guillemets ne bouge jamais', () => {
	it('ni à la recopie, ni en capitales', async () => {
		const { shiftFormula, normalizeFormula } = await import('../formula');

		expect(shiftFormula('=NB.SI(B1:B5;"a1")', 1, 2)).toBe('=NB.SI(C3:C7;"a1")');
		expect(normalizeFormula('=nb.si(b1:b5;"a1")')).toBe('=NB.SI(B1:B5;"a1")');
	});
});

describe('revue de la PR 3', () => {
	it('NB.SI(plage ; case qui contient un mot) : compte les cases égales', () => {
		expect(shown(withClass('=NB.SI(B1:B5;B1)'), C, 1)).toBe('3');
	});

	it('les guillemets courbes (iPad) se lisent comme des droits', () => {
		const a = withClass('=NB.SI(B1:B5;“fille”)');

		expect(a.cell(C, 1)).toBe('=NB.SI(B1:B5;"fille")');
		expect(shown(a, C, 1)).toBe('3');
		expect(shown(withClass('=NB.SI(B1:B5;«fille»)'), C, 1)).toBe('3');
	});

	it('un texte qui ressemble à un appel ne bouge pas', async () => {
		const { normalizeFormula, shiftFormula } = await import('../formula');

		expect(normalizeFormula('=si(a1>0;"voir somme(a:a)";1)')).toBe('=SI(A1>0;"voir somme(a:a)";1)');
		expect(shiftFormula('=SI(A1>0;"voir SOMME(A:A)";1)', 1, 0)).toBe(
			'=SI(B1>0;"voir SOMME(A:A)";1)'
		);
	});

	it('≤, ≥, ≠ se lisent <=, >=, <>', () => {
		const a = withClass('=SI(A1≥12;1;0)');

		expect(a.cell(C, 1)).toBe('=SI(A1>=12;1;0)');
		expect(shown(a, C, 1)).toBe('1');
		expect(shown(withClass('=NB.SI(A1:A5;"≥10")'), C, 1)).toBe('3');
		expect(shown(withClass('=A1≤2'), C, 1)).toBe(
			'erreur : Une comparaison s’écrit dans SI, par exemple =SI(A1>2;1;0).'
		);
	});

	it('referencesIn ne voit rien entre guillemets', async () => {
		const { referencesIn } = await import('../formula');

		expect(referencesIn('=SI(A1="B2";1;0)')).toEqual(['A1']);
	});

	it('deux comparaisons à la suite : le refus le dit', () => {
		expect(shown(withClass('=SI(A1<A2<A3;1;0)'), C, 1)).toBe(
			'erreur : La condition de SI ne compare que deux choses : A1<B1, pas A1<B1<C1.'
		);
	});

	it('l’aide ne lit pas le texte entre guillemets', () => {
		expect(functionHint('=SI(A1>0;"somme(')).toBe(
			'SI(condition ; si vrai ; si faux) — l’un ou l’autre selon la condition'
		);
	});
});
