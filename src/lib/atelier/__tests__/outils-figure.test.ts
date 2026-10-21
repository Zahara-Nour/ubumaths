/**
 * Géométrie, lot 3, PR 2 : la barre d'outils de la vue Géométrie, outils de
 * base (M3, M4, M5 partiel, M7 de `docs/archive/wip/atelier-geometrie-lot3-phase0.md`).
 *
 * Chaque outil ÉCRIT la ligne qu'on aurait tapée (G2) : on asserte les lignes
 * de la console et les objets qu'elles créent, par le CHEMIN COMPLET (pupitre
 * de la console, moteur réel) — pas la seule boîte à outils.
 */
import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { FigureToolbox, nextCircleName, nextLineName, nextPointName } from '../figure-tools.svelte';

// =============================================================================
// Décor
// =============================================================================

/** Un atelier, sa console, et la boîte à outils qui écrit dans la console. */
function bench(lines: readonly string[] = []) {
	const atelier = new Atelier();
	const desk = new CalcDesk(atelier);
	for (const line of lines) desk.submit(line);
	const toolbox = new FigureToolbox(atelier, (line) => desk.write(line)?.failed === false);
	const written = () => desk.entries.slice(lines.length).map((e) => e.label);
	return { atelier, desk, toolbox, written };
}

// =============================================================================
// Tests
// =============================================================================

describe('M3 : l’outil Point écrit la ligne de son point', () => {
	it('un clic dans le vide écrit A = (1,5 ; 2) : aimanté près d’un entier, sinon au dixième', () => {
		const { atelier, toolbox, written } = bench();
		toolbox.select('point');

		toolbox.click(1.52, 2.04, null, 0.1);

		expect(written()).toEqual(['A = (1,5 ; 2)']);
		expect(atelier.get('A')?.definition).toBe('(1,5 ; 2)');
	});

	it('deux clics : A puis B', () => {
		const { toolbox, written } = bench();
		toolbox.select('point');

		toolbox.click(0, 0, null);
		toolbox.click(3, 1, null);

		expect(written()).toEqual(['A = (0 ; 0)', 'B = (3 ; 1)']);
	});

	it('un clic sur un point existant n’écrit rien (M5 : il est réutilisé)', () => {
		const { toolbox, written } = bench(['A = (0 ; 0)']);
		toolbox.select('point');

		toolbox.click(0.05, 0, 'A');

		expect(written()).toEqual([]);
	});

	it('l’outil Déplacer n’écrit rien', () => {
		const { toolbox, written } = bench();

		toolbox.click(1, 1, null);

		expect(toolbox.tool).toBe('deplacer');
		expect(written()).toEqual([]);
	});
});

describe('M3 : Segment, Droite, Demi-droite — deux points, puis la ligne', () => {
	it('Segment dans le vide : A, B, puis d = [AB]', () => {
		const { atelier, toolbox, written } = bench();
		toolbox.select('segment');

		toolbox.click(0, 0, null);
		toolbox.click(4, 0, null);

		expect(written()).toEqual(['A = (0 ; 0)', 'B = (4 ; 0)', 'd = [AB]']);
		expect(atelier.get('d')?.kind).toBe('curve');
	});

	it('Segment sur deux points existants : seule la ligne s’écrit', () => {
		const { toolbox, written } = bench(['A = (0 ; 0)', 'B = (4 ; 0)']);
		toolbox.select('segment');

		toolbox.click(0, 0, 'A');
		toolbox.click(4, 0, 'B');

		expect(written()).toEqual(['d = [AB]']);
	});

	it('Droite puis Demi-droite : d, d_1, d_2 (M4)', () => {
		const { toolbox, written } = bench(['A = (0 ; 0)', 'B = (4 ; 0)', 'd = [AB]']);

		toolbox.select('droite');
		toolbox.click(0, 0, 'A');
		toolbox.click(4, 0, 'B');
		toolbox.select('demi-droite');
		toolbox.click(4, 0, 'B');
		toolbox.click(0, 0, 'A');

		expect(written()).toEqual(['d_1 = (AB)', 'd_2 = [BA)']);
	});

	it('un point indicé s’écrit dans le raccourci : [A_1B]', () => {
		const { atelier, toolbox, written } = bench(['A_1 = (0 ; 0)', 'B = (4 ; 0)']);
		toolbox.select('segment');

		toolbox.click(0, 0, 'A_1');
		toolbox.click(4, 0, 'B');

		expect(written()).toEqual(['d = [A_1B]']);
		expect(atelier.get('d')?.status).toBe('ok');
	});

	it('le même point deux fois : rien ne s’écrit, la boîte le dit et attend', () => {
		const { toolbox, written } = bench(['A = (0 ; 0)']);
		toolbox.select('segment');

		toolbox.click(0, 0, 'A');
		toolbox.click(0, 0, 'A');

		expect(written()).toEqual([]);
		expect(toolbox.notice).toBe('Choisis un autre point que A.');
		expect(toolbox.chosen).toEqual(['A']);
	});
});

describe('M3 : Cercle — le centre, puis un point du cercle', () => {
	it('c = cercle(A ; passant=B)', () => {
		const { atelier, toolbox, written } = bench(['A = (0 ; 0)', 'B = (3 ; 0)']);
		toolbox.select('cercle');

		toolbox.click(0, 0, 'A');
		toolbox.click(3, 0, 'B');

		expect(written()).toEqual(['c = cercle(A ; passant=B)']);
		expect(atelier.get('c')?.kind).toBe('curve');
		expect(atelier.get('c')?.status).toBe('ok');
	});

	it('une valeur c existe : le cercle s’appelle c_1', () => {
		const { toolbox, written } = bench(['c = 2', 'A = (0 ; 0)']);
		toolbox.select('cercle');

		toolbox.click(0, 0, 'A');
		toolbox.click(2, 0, null);

		expect(written()).toEqual(['B = (2 ; 0)', 'c_1 = cercle(A ; passant=B)']);
	});
});

describe('M4 : les noms donnés automatiquement', () => {
	it('points : la première majuscule libre, dans l’ordre de l’alphabet', () => {
		const { atelier } = bench(['A = (0 ; 0)', 'C = (1 ; 0)']);

		expect(nextPointName(atelier)).toBe('B');
	});

	it('points : après Z, A_1', () => {
		const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
		const atelier = new Atelier();
		for (const [i, name] of letters.entries()) {
			atelier.create({ kind: 'point', name, definition: `(${i} ; 0)` }, 'text');
		}

		expect(nextPointName(atelier)).toBe('A_1');
	});

	it('points : une lettre prise par un autre objet (une liste C) est sautée', () => {
		const { atelier } = bench(['A = (0 ; 0)', 'B = (1 ; 0)', 'C = 1;2;3']);

		expect(nextPointName(atelier)).toBe('D');
	});

	it('lignes : d, puis d_1 ; cercles : c, puis c_1', () => {
		const { atelier } = bench([
			'A = (0 ; 0)',
			'B = (4 ; 0)',
			'd = (AB)',
			'c = cercle(A ; passant=B)'
		]);

		expect(nextLineName(atelier)).toBe('d_1');
		expect(nextCircleName(atelier)).toBe('c_1');
	});

	it('une fonction d : d_1 désignerait d(1), la ligne prend une autre lettre', () => {
		const { atelier } = bench(['d(x) = 2x']);

		const name = nextLineName(atelier);

		expect(name).not.toMatch(/^d(_\d+)?$/);
		expect(atelier.get(name)).toBeUndefined();
	});
});

describe('M7 : la construction en cours, la consigne, l’abandon', () => {
	it('la consigne dit quoi faire, à chaque étape', () => {
		const { toolbox } = bench();

		expect(toolbox.instruction).toBeNull();
		toolbox.select('point');
		expect(toolbox.instruction).toBe('Clique où placer le point.');
		toolbox.select('segment');
		expect(toolbox.instruction).toBe('Clique sur un premier point.');
		toolbox.click(0, 0, null);
		expect(toolbox.instruction).toBe('Clique sur un deuxième point.');
		toolbox.select('cercle');
		expect(toolbox.instruction).toBe('Clique sur le centre du cercle.');
		toolbox.click(0, 0, 'A');
		expect(toolbox.instruction).toBe('Clique sur un point du cercle.');
	});

	it('Échap (cancel) abandonne : le premier point posé reste, comme une création', () => {
		const { atelier, toolbox, written } = bench();
		toolbox.select('segment');
		toolbox.click(0, 0, null);

		expect(toolbox.cancel()).toBe(true);

		expect(toolbox.chosen).toEqual([]);
		expect(atelier.get('A')).toBeDefined();
		expect(written()).toEqual(['A = (0 ; 0)']);
		// Rien en cours : Échap ne fait rien d'autre
		expect(toolbox.cancel()).toBe(false);
	});

	it('un second appui sur l’outil abandonne la construction, l’outil reste choisi', () => {
		const { toolbox } = bench();
		toolbox.select('segment');
		toolbox.click(0, 0, null);

		toolbox.select('segment');

		expect(toolbox.tool).toBe('segment');
		expect(toolbox.chosen).toEqual([]);
	});

	it('changer d’outil abandonne aussi la construction', () => {
		const { toolbox } = bench();
		toolbox.select('segment');
		toolbox.click(0, 0, null);

		toolbox.select('cercle');

		expect(toolbox.chosen).toEqual([]);
	});

	it('une création = une étape : Annuler retire le segment, ses points restent', () => {
		const { atelier, desk, toolbox } = bench();
		toolbox.select('segment');
		toolbox.click(0, 0, null);
		toolbox.click(4, 0, null);

		desk.undo();

		expect(atelier.get('d')).toBeUndefined();
		expect(atelier.get('A')).toBeDefined();
		expect(atelier.get('B')).toBeDefined();
	});

	it('une ligne refusée : la construction n’avance pas', () => {
		const atelier = new Atelier();
		const toolbox = new FigureToolbox(atelier, () => false);
		toolbox.select('segment');

		toolbox.click(0, 0, null);

		expect(toolbox.chosen).toEqual([]);
	});
});

describe('G2 : une ligne écrite par un outil est une ligne de console', () => {
	it('rejouable (geste « saisie »), mais jamais rappelée par ↑', () => {
		const { desk, toolbox } = bench();
		toolbox.select('point');

		toolbox.click(1, 2, null);

		expect(desk.entries.at(-1)?.replay).toEqual({ kind: 'saisie', input: 'A = (1 ; 2)' });
		expect(desk.typedInputs).toEqual([]);
	});

	it('le brouillon de la console survit à une ligne d’outil', () => {
		const { desk, toolbox } = bench();
		desk.draft = 'f(x) = ';
		toolbox.select('point');

		toolbox.click(1, 2, null);

		expect(desk.draft).toBe('f(x) = ');
	});
});

describe('revue : le premier point choisi a disparu', () => {
	it('A annulé entre les deux clics : le clic suivant recommence la construction', () => {
		const { atelier, desk, toolbox, written } = bench();
		toolbox.select('segment');
		toolbox.click(0, 0, null);

		desk.undo();
		toolbox.click(3, 0, null);

		expect(written().filter((l) => l !== 'Annuler')).toEqual(['A = (0 ; 0)', 'A = (3 ; 0)']);
		expect(toolbox.chosen).toEqual(['A']);
		expect(atelier.get('d')).toBeUndefined();
	});

	it('forgetVanished : la construction est abandonnée dès que son point n’existe plus', () => {
		const { atelier, toolbox } = bench(['A = (0 ; 0)']);
		toolbox.select('cercle');
		toolbox.click(0, 0, 'A');

		atelier.remove('A');
		toolbox.forgetVanished();

		expect(toolbox.chosen).toEqual([]);
		expect(toolbox.instruction).toBe('Clique sur le centre du cercle.');
	});
});
