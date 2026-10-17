/**
 * Bloc ```figure — réglages des figures INTERACTIVES (spécification validée
 * par David le 2026-10-13)
 *
 * `deplacable:` et `rendu:` ne sont acceptés que par une figure stockée
 * (option `interactive`) ; un bloc d'exercice les refuse avec un message situé
 * et ne change pas autrement. Les clés existantes sont relues dans ce mode
 * (valide, limite, erreur), la fenêtre y devient facultative.
 */
import { describe, it, expect } from 'vitest';
import { parseFigureContent } from '../../parser/figure-parser';

const SCRIPT = 'A = point(0, 0)';

function interactive(header: string) {
	return parseFigureContent(`${header}\n---\n${SCRIPT}`, { interactive: true });
}

describe('figure interactive — deplacable', () => {
	it('défaut : non', () => {
		const node = interactive('taille: petite');
		expect(node.errors).toEqual([]);
		expect(node.interactive).toEqual({ draggable: false, renderMode: 'normal' });
	});

	it('oui / non, casse ignorée, orthographe accentuée acceptée', () => {
		expect(interactive('deplacable: oui').interactive?.draggable).toBe(true);
		expect(interactive('deplacable: NON').interactive?.draggable).toBe(false);
		expect(interactive('déplaçable: oui').interactive?.draggable).toBe(true);
	});

	it('autre valeur : erreur située', () => {
		const node = interactive('taille: petite\ndeplacable: peut-être');
		expect(node.errors).toHaveLength(1);
		expect(node.errors[0].line).toBe(2);
		expect(node.errors[0].message).toMatch(
			/^Ligne 2 : deplacable « peut-être » : écrire oui ou non/
		);
	});
});

describe('figure interactive — rendu', () => {
	it('normal, croquis, mixte → renderMode de la toile', () => {
		expect(interactive('rendu: normal').interactive?.renderMode).toBe('normal');
		expect(interactive('rendu: croquis').interactive?.renderMode).toBe('rough');
		expect(interactive('rendu: Mixte').interactive?.renderMode).toBe('mixed');
	});

	it('valeur inconnue (dont un nom de propriété JavaScript) : erreur située', () => {
		for (const value of ['rough', 'constructor', '']) {
			const node = interactive(`rendu: ${value}`);
			expect(node.errors).toHaveLength(1);
			expect(node.errors[0].line).toBe(1);
			expect(node.errors[0].message).toMatch(/rendu .* inconnu \(normal, croquis, mixte\)/);
		}
	});
});

describe('figure interactive — clés existantes', () => {
	it('fenêtre facultative : sans elle, aucune erreur et window null', () => {
		const node = interactive('axes: oui');
		expect(node.errors).toEqual([]);
		expect(node.header.window).toBeNull();
		expect(node.header.axes).toBe(true);
	});

	it('fenêtre valide, puis inversée (erreur ligne 1)', () => {
		expect(interactive('fenetre: -2 ; 6 ; -1 ; 5').header.window).toEqual({
			xMin: -2,
			xMax: 6,
			yMin: -1,
			yMax: 5
		});
		const inverted = interactive('fenetre: 6 ; -2 ; -1 ; 5');
		expect(inverted.errors[0]).toMatchObject({ line: 1 });
		expect(inverted.errors[0].message).toMatch(/première borne doit être inférieure/);
	});

	it('fenêtre limite : rapport hauteur/largeur de 4 accepté, au-delà refusé', () => {
		expect(interactive('fenetre: 0 ; 1 ; 0 ; 4').errors).toEqual([]);
		expect(interactive('fenetre: 0 ; 1 ; 0 ; 4.1').errors[0].message).toMatch(/allongée/);
	});

	it('taille, axes, grille, graduations, description', () => {
		const node = interactive(
			'fenetre: -5 ; 5 ; -5 ; 5\ntaille: grande\naxes: oui\ngrille: 1 ; 2\ngraduations: 2\ndescription: Un point.'
		);
		expect(node.errors).toEqual([]);
		expect(node.header).toMatchObject({
			size: 'grande',
			axes: true,
			grid: { x: 1, y: 2 },
			ticks: { x: 2, y: 2 },
			description: 'Un point.'
		});
	});

	it('taille inconnue, grille négative : erreurs situées', () => {
		const node = interactive('taille: énorme\ngrille: -1');
		expect(node.errors.map((e) => e.line)).toEqual([1, 2]);
	});

	it('clé inconnue : le message cite aussi deplacable et rendu', () => {
		const node = interactive('zoom: 2');
		expect(node.errors[0].message).toMatch(/deplacable, rendu/);
	});

	it('lignes du script comptées depuis le début du texte', () => {
		expect(interactive('taille: petite\naxes: oui').scriptStartLine).toBe(4);
	});
});

describe('bloc ```figure d’exercice — inchangé', () => {
	it('deplacable et rendu refusés avec un message situé', () => {
		const node = parseFigureContent(
			`fenetre: 0 ; 4 ; 0 ; 3\ndeplacable: oui\nrendu: croquis\n---\n${SCRIPT}`
		);
		expect(node.errors).toHaveLength(2);
		expect(node.errors.map((e) => e.line)).toEqual([2, 3]);
		for (const e of node.errors) {
			expect(e.message).toMatch(/réglage réservé aux figures interactives/);
		}
	});

	it('aucun champ `interactive` sur le nœud ; fenêtre toujours exigée', () => {
		const node = parseFigureContent(`taille: petite\n---\n${SCRIPT}`);
		expect('interactive' in node).toBe(false);
		expect(node.errors.some((e) => /Fenêtre manquante/.test(e.message))).toBe(true);
	});

	it('clé inconnue : le message ne propose pas les clés interactives', () => {
		const node = parseFigureContent(`fenetre: 0 ; 4 ; 0 ; 3\nzoom: 2\n---\n${SCRIPT}`);
		expect(node.errors[0].message).not.toMatch(/deplacable/);
	});
});
