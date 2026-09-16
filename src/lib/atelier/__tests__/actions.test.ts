/**
 * Les actions attachées aux objets — §3.
 *
 * C'est le mécanisme de progressivité 6ᵉ → terminale : l'outil ne montre que ce
 * que l'objet appelle, donc un atelier sans fonction n'affiche jamais
 * « dériver ». Pas de sélecteur de niveau, pas de réglage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { actionsFor } from '../actions';

let a: Atelier;

beforeEach(() => {
	a = new Atelier();
});

/** Les identifiants des actions proposées, pour comparer sans le libellé. */
function ids(name: string): string[] {
	return actionsFor(a.get(name)!).map((action) => action.id);
}

function action(name: string, id: string) {
	return actionsFor(a.get(name)!).find((x) => x.id === id);
}

describe('progressivité', () => {
	// N1 — un atelier sans fonction ne montre jamais « dériver »
	it('ne propose aucune action de fonction quand il n’y a que des valeurs', () => {
		a.create({ kind: 'value', name: 'k', definition: '3' });
		a.create({ kind: 'list', name: 'L', definition: '1;2;3' });

		expect(ids('k')).not.toContain('derive');
		expect(ids('L')).not.toContain('derive');
		expect(ids('k')).not.toContain('plot');
	});

	// N2 — les actions arrivent avec l'objet, pas avec un réglage
	it('propose les actions de fonction dès qu’une fonction existe', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });

		expect(ids('f')).toContain('plot');
		expect(ids('f')).toContain('derive');
		expect(ids('f')).toContain('table');
		expect(ids('f')).toContain('solve');
		expect(ids('f')).toContain('variations');
	});

	it('propose les actions de liste sur une liste', () => {
		a.create({ kind: 'list', name: 'L', definition: '1;2;3' });

		expect(ids('L')).toContain('stats');
		expect(ids('L')).toContain('scatter');
		expect(ids('L')).toContain('fit');
	});

	it('propose les deux tracés d’une suite', () => {
		a.create({ kind: 'sequence', name: 'u', definition: '0,5u_n + 3' });

		expect(ids('u')).toContain('plot-points');
		expect(ids('u')).toContain('plot-cobweb');
	});

	// Renommer et supprimer valent pour tout objet, quel que soit son état
	it('propose toujours de renommer et de supprimer', () => {
		a.create({ kind: 'function', name: 'f' }); // incomplète
		a.create({ kind: 'value', name: 'k', definition: '3' });

		for (const name of ['f', 'k']) {
			expect(ids(name)).toContain('rename');
			expect(ids(name)).toContain('remove');
		}
	});
});

describe('curseur et unités', () => {
	// D3 — une valeur numérique libre est pilotable : l'action EXISTE, même si
	// la vue qui la rendra n'est pas encore écrite.
	it('propose de régler le curseur d’une valeur numérique', () => {
		a.create({ kind: 'value', name: 'k', definition: '3' });
		expect(ids('k')).toContain('slider');
	});

	// D4 — une grandeur n'est pas pilotable, et on dit pourquoi
	it('désactive le curseur d’une grandeur, avec sa raison', () => {
		a.create({ kind: 'value', name: 'd', definition: '12[km]' });

		const slider = action('d', 'slider');
		expect(slider).toBeDefined();
		expect(slider?.disabledReason).toBeTruthy();
	});

	it('ne propose « convertir » que sur une grandeur', () => {
		a.create({ kind: 'value', name: 'd', definition: '12[km]' });
		a.create({ kind: 'value', name: 'k', definition: '3' });

		expect(ids('d')).toContain('convert');
		expect(ids('k')).not.toContain('convert');
	});
});

describe('objets qui ne peuvent rien produire (§3 L2)', () => {
	// Visible et désactivée AVEC sa raison : sinon l'élève croit que l'outil ne
	// sait pas faire, au lieu de comprendre qu'il lui manque quelque chose.
	it('désactive les actions d’un objet en attente, en disant ce qui manque', () => {
		a.create({ kind: 'function', name: 'f', definition: 'a*x' });
		expect(a.get('f')?.status).toBe('pending');

		const plot = action('f', 'plot');
		expect(plot).toBeDefined();
		expect(plot?.disabledReason).toContain('a');
	});

	it('désactive les actions d’un objet en erreur', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^^2' });
		expect(action('f', 'plot')?.disabledReason).toBeTruthy();
	});

	it('désactive les actions d’un objet encore vide', () => {
		a.create({ kind: 'function', name: 'f' });
		expect(action('f', 'plot')?.disabledReason).toBeTruthy();
	});

	// …mais jamais renommer ni supprimer : ce sont les seuls gestes qui restent
	// possibles quand tout le reste est bloqué.
	it('laisse supprimer un objet en erreur', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^^2' });

		// Supprimer est le dernier geste qui doit rester possible quand tout le
		// reste est bloqué — jamais désactivé par l'état de l'objet.
		expect(action('f', 'remove')?.disabledReason).toBeUndefined();
		// Renommer existe aussi, mais attend son lot.
		expect(ids('f')).toContain('rename');
	});

	// ⚠️ Une action dont la vue n'existe pas encore est VISIBLE et désactivée
	// avec sa raison — jamais un bouton qui ne répond pas. Cette liste se vide au
	// fil des lots ; ce test rougira alors, et c'est voulu.
	it('dit qu’une action attend son lot, au lieu de ne rien faire', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });

		const tracer = action('f', 'plot');
		expect(tracer).toBeDefined();
		expect(tracer?.disabledReason).toContain('prochain lot');
	});
});

describe('libellés', () => {
	it('sont en français et parlent à un élève', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });

		const labels = actionsFor(a.get('f')!).map((x) => x.label);
		expect(labels).toContain('Tracer');
		expect(labels).toContain('Dériver');
		// pas de vocabulaire de développeur
		expect(labels.join(' ').toLowerCase()).not.toContain('diff');
	});
});
