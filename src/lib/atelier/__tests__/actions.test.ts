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

	// Depuis le lot 5b de `/grapheur`, 👁 trace et « Sur le graphique » choisit
	// nuage ou escalier : la suite garde ses deux tracés, plus en boutons
	it('propose les gestes d’une suite, et ses deux tracés', () => {
		a.create({ kind: 'sequence', name: 'u', definition: '0,5u_n + 3' });

		expect(ids('u')).toContain('terms');
		a.setPlotted('u', true);
		expect(a.setSequenceDisplay('u', { representation: 'cobweb' }).ok).toBe(true);
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
	// D3 — une valeur numérique libre est pilotable. Depuis le lot 4 de
	// `/grapheur`, le curseur est DANS la carte, plus un bouton d'action.
	it('une valeur numérique a un curseur, réglé dans la carte', () => {
		a.create({ kind: 'value', name: 'k', definition: '3' });
		expect(ids('k')).not.toContain('slider');
		const k = a.get('k');
		expect(k && k.kind === 'value' && k.slider).toBeTruthy();
	});

	// D4 — une grandeur n'est pas pilotable (la carte dit pourquoi)
	it('une grandeur n’a pas de curseur', () => {
		a.create({ kind: 'value', name: 'd', definition: '12[km]' });

		const d = a.get('d');
		expect(d && d.kind === 'value' && d.slider).toBeFalsy();
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
	// fil des lots : ce test a rougi quand « Tracer » a été câblé, puis quand la
	// vue Calcul a câblé « Dériver ». C'est le signal attendu, pas une régression.
	it('dit qu’une action attend son lot, au lieu de ne rien faire', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });

		const tabuler = action('f', 'table');
		expect(tabuler).toBeDefined();
		expect(tabuler?.disabledReason).toContain('prochain lot');
	});

	// Les quatre que la vue Calcul a câblées ne l'annoncent plus.
	it('ne fait plus attendre les actions de la vue Calcul', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });

		// « image » n'est plus une action : c'est un champ de la carte (lot 3b)
		for (const id of ['derive', 'solve', 'variations']) {
			expect(action('f', id), id).toBeDefined();
			expect(action('f', id)?.disabledReason, id).toBeUndefined();
		}
	});

	// « Tracer », lui, répond depuis le lot « vue Graphe ».
	it('propose de tracer une fonction utilisable', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });
		expect(action('f', 'plot')?.disabledReason).toBeUndefined();
	});

	// Un même bouton qui bascule, plutôt que deux dont un est inutile.
	it('propose de retirer du graphe ce qui y est déjà', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });
		a.setPlotted('f', true);
		expect(action('f', 'plot')?.label).toBe('Retirer du graphe');
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
