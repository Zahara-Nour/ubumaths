/**
 * Garder la dérivée comme objet — décision D7, « les deux gestes distincts ».
 *
 * ⚠️ Par voie **symbolique**, jamais par le texte. Le lot 3 gardait un résultat
 * en relisant la sortie de la commande ; mesuré, ça donnait des objets faux avec
 * un message de succès (`.résoudre x^2-4=0` gardait « 0 »). `promote` refuse
 * donc les commandes — et « garder f' » passe par la dérivation de l'arbre.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';

function deskWith(definition = 'x^2-3x+1') {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition }, 'text');
	return new CalcDesk(atelier);
}

describe('garder la dérivée', () => {
	/**
	 * ⚠️ Le nom n'est PAS `f’` : l'apostrophe n'est pas un caractère
	 * d'identifiant pour le parseur, donc un objet nommé ainsi ne pourrait
	 * jamais être cité dans une autre définition. On prend le prochain nom
	 * libre — ce qui compte, c'est que l'objet soit UTILISABLE.
	 */
	it('crée un second objet, nommé comme les autres', () => {
		const d = deskWith();

		d.runFromPanel('keep-derivative', 'f');

		expect(d.atelier.names.length).toBe(2);
		expect(d.atelier.names).toContain('f');
	});

	it('et cet objet est citable dans un calcul', () => {
		const d = deskWith();
		d.runFromPanel('keep-derivative', 'f');
		const derivee = d.atelier.names.find((n) => n !== 'f')!;

		d.submit(`${derivee}(2)`);

		// f = x²−3x+1 → f' = 2x−3 → f'(2) = 1
		expect(d.entries[1].text).toBe('1');
	});

	it('avec la dérivée pour définition', () => {
		const d = deskWith();

		d.runFromPanel('keep-derivative', 'f');

		const nom = d.atelier.names.find((n) => n !== 'f')!;
		expect(d.atelier.get(nom)?.definition.replace(/\s/g, '')).toContain('2x');
		expect(d.atelier.get(nom)?.status).toBe('ok');
	});

	// §4 N2 : c'est une FONCTION, donc traçable — tout l'intérêt du geste
	it('traçable comme n’importe quelle fonction', () => {
		const d = deskWith();

		d.runFromPanel('keep-derivative', 'f');

		const nom = d.atelier.names.find((n) => n !== 'f')!;
		expect(d.atelier.get(nom)?.kind).toBe('function');
	});

	it('dit ce qu’elle a gardé', () => {
		const d = deskWith();

		d.runFromPanel('keep-derivative', 'f');

		expect(d.entries[0].text).toContain('dérivée de f');
	});

	// ⚠️ L'autre geste de D7 reste distinct : « afficher » ne crée rien
	it('« Dériver » seul ne crée toujours aucun objet', () => {
		const d = deskWith();

		d.runFromPanel('derive', 'f');

		expect(d.atelier.names).toEqual(['f']);
	});
});

describe('les cas limites', () => {
	it('donne un nom neuf à chaque fois, jamais d’écrasement', () => {
		const d = deskWith();
		d.runFromPanel('keep-derivative', 'f');

		d.runFromPanel('keep-derivative', 'f');

		expect(new Set(d.atelier.names).size).toBe(3);
	});

	it('refuse sur un objet en attente, avec le message de l’objet', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' }, 'text');
		const d = new CalcDesk(atelier);

		d.runFromPanel('keep-derivative', 'f');

		expect(d.entries[0].failed).toBe(true);
		expect(atelier.names).toEqual(['f']);
	});

	it('substitue avant de dériver', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'g', definition: 'x^2' }, 'text');
		atelier.create({ kind: 'function', name: 'f', definition: 'g(x) + 1' }, 'text');
		const d = new CalcDesk(atelier);

		d.runFromPanel('keep-derivative', 'f');

		// Sans substitution, la dérivée citerait g' au lieu de valoir 2x
		const nom = d.atelier.names.find((n) => n !== 'f' && n !== 'g')!;
		expect(d.atelier.get(nom)?.definition.replace(/\s/g, '')).toContain('2x');
	});

	it('dérive une constante en zéro, sans broncher', () => {
		const d = deskWith('7');

		d.runFromPanel('keep-derivative', 'f');

		const nom = d.atelier.names.find((n) => n !== 'f')!;
		expect(d.atelier.get(nom)?.status).toBe('ok');
	});
});

describe('ce que le panneau propose', () => {
	it('offre le geste sur une fonction, sans le reléguer', async () => {
		const { actionsFor } = await import('../actions');
		const d = deskWith();

		const action = actionsFor(d.atelier.get('f')!).find((a) => a.id === 'keep-derivative');

		expect(action).toBeDefined();
		expect(action?.disabledReason).toBeUndefined();
	});

	// ⚠️ La garde du lot 3 : une action proposée doit RÉPONDRE
	it('et ce geste produit quelque chose', () => {
		const d = deskWith();

		expect(d.runFromPanel('keep-derivative', 'f')).toBe('ok');
		expect(d.entries.length).toBe(1);
	});

	it('ne l’offre pas sur une liste', async () => {
		const { actionsFor } = await import('../actions');
		const atelier = d0();

		const ids = actionsFor(atelier.get('L')!).map((a) => a.id);

		expect(ids).not.toContain('keep-derivative');
	});
});

function d0() {
	const atelier = new Atelier();
	atelier.create({ kind: 'list', name: 'L', definition: '1 ; 2' }, 'text');
	return atelier;
}
