/**
 * Bloc ```figure — réglages des figures INTERACTIVES (spécification validée
 * par David le 2026-10-13)
 *
 * `deplacable:` et `rendu:` : acceptés par une figure stockée (option
 * `interactive`) et, depuis le lot 6 du chantier figure-et-choix (2026-10-29),
 * par tout bloc ```figure d'un texte ; refusés dans une figure à compléter ou
 * de travail. Les clés existantes sont relues dans ce mode
 * (valide, limite, erreur), la fenêtre y devient facultative.
 */
import { describe, it, expect } from 'vitest';
import { parseFigure, parseFigureContent } from '../../parser/figure-parser';

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

describe('bloc ```figure d’un texte (énoncé, cours…) — lot 6 du chantier figure-et-choix', () => {
	it('deplacable et rendu acceptés : le nœud porte ses réglages', () => {
		const node = parseFigureContent(
			`fenetre: 0 ; 4 ; 0 ; 3\ndeplacable: oui\nrendu: croquis\n---\n${SCRIPT}`
		);
		expect(node.errors).toEqual([]);
		expect(node.interactive).toEqual({ draggable: true, renderMode: 'rough' });
	});

	it('une seule des deux clés : l’autre prend sa valeur par défaut', () => {
		const draggable = parseFigureContent(`fenetre: 0 ; 4 ; 0 ; 3\ndéplaçable: oui\n---\n${SCRIPT}`);
		expect(draggable.interactive).toEqual({ draggable: true, renderMode: 'normal' });
		const sketch = parseFigureContent(`fenetre: 0 ; 4 ; 0 ; 3\nrendu: mixte\n---\n${SCRIPT}`);
		expect(sketch.interactive).toEqual({ draggable: false, renderMode: 'mixed' });
	});

	it('valeur inconnue : messages situés actuels', () => {
		const node = parseFigureContent(
			`fenetre: 0 ; 4 ; 0 ; 3\ndeplacable: peut-être\nrendu: aquarelle\n---\n${SCRIPT}`
		);
		expect(node.errors.map((e) => e.line)).toEqual([2, 3]);
		expect(node.errors[0].message).toMatch(/deplacable « peut-être » : écrire oui ou non/);
		expect(node.errors[1].message).toMatch(/rendu « aquarelle » inconnu/);
	});

	it('sans ces clés : aucun champ `interactive` (figure statique) ; fenêtre toujours exigée', () => {
		const node = parseFigureContent(`taille: petite\n---\n${SCRIPT}`);
		expect('interactive' in node).toBe(false);
		expect(node.errors.some((e) => /Fenêtre manquante/.test(e.message))).toBe(true);
	});

	it('clé inconnue : le message cite aussi deplacable et rendu', () => {
		const node = parseFigureContent(`fenetre: 0 ; 4 ; 0 ; 3\nzoom: 2\n---\n${SCRIPT}`);
		expect(node.errors[0].message).toMatch(/deplacable, rendu/);
	});
});

describe('figure à compléter, figure de travail : jamais déplaçables (2.6 Q5)', () => {
	function block(fenceName: string, ...header: string[]) {
		const lines = [
			'```' + fenceName,
			...header,
			'---',
			'A = point(1, 2)',
			'B = point(7, 2)',
			'```'
		];
		return parseFigure(lines, 0, lines.length - 1);
	}

	it('à compléter : deplacable et rendu refusés, message dédié situé', () => {
		const node = block(
			'figure-a-completer',
			'fenetre: 0 ; 10 ; 0 ; 6',
			'verifier: droite_par A ; B',
			'deplacable: oui',
			'rendu: croquis'
		);
		const messages = node.errors.map((e) => e.message);
		expect(node.errors.map((e) => e.line)).toEqual([3, 4]);
		expect(messages[0]).toMatch(
			/^Ligne 3 : « deplacable » : une figure à compléter ne se déplace pas/
		);
		expect(messages[1]).toMatch(
			/^Ligne 4 : « rendu » : une figure à compléter garde le rendu normal/
		);
		expect('interactive' in node).toBe(false);
	});

	it('de travail : même refus, nommé « figure de travail »', () => {
		const node = block('figure-de-travail', 'fenetre: 0 ; 10 ; 0 ; 6', 'déplaçable: non');
		expect(node.errors).toHaveLength(1);
		expect(node.errors[0].message).toMatch(
			/« déplaçable » : une figure de travail ne se déplace pas/
		);
	});
});
