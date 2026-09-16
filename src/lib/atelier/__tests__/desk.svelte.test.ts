/**
 * Le pupitre de la vue Calcul — le lien entre le panneau et l'historique.
 *
 * ⚠️ Ce module existe à cause d'un défaut trouvé en revue : le lot avait libéré
 * « Dériver », « Résoudre », « Variations » et « Image d'un nombre » dans le
 * panneau, mais **aucun composant n'appelait `runAction`**. L'élève cliquait,
 * et rien n'arrivait — ni résultat, ni message. C'était une régression sur le
 * lot précédent, qui affichait au moins « prochain lot ».
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';

function desk(definition = 'x^2-3x+1') {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition });
	return new CalcDesk(atelier);
}

describe('une action du panneau produit quelque chose', () => {
	it('dériver écrit une ligne dans l’historique', () => {
		const d = desk();

		d.runFromPanel('derive', 'f');

		expect(d.entries.length).toBe(1);
		expect(d.entries[0].label).toContain('Dériver');
	});

	it('et cette ligne porte le résultat, pas le nom de l’objet', () => {
		const d = desk();

		d.runFromPanel('derive', 'f');

		expect(d.entries[0].text).toContain('2x-3');
	});

	// ⚠️ Le §6 bis vu depuis l'écran : citer `f(x)` rendait « Points critiques :
	// aucun » sans la moindre erreur.
	it('variations parle vraiment de la fonction', () => {
		const d = desk();

		d.runFromPanel('variations', 'f');

		expect(d.entries[0].text).toContain('3/2');
	});

	it('résoudre trouve le discriminant', () => {
		const d = desk();

		d.runFromPanel('solve', 'f');

		expect(d.entries[0].text).toMatch(/5/);
	});

	// « Image d'un nombre » a besoin d'un nombre : on prépare la saisie plutôt
	// que d'ouvrir une boîte de dialogue.
	it('image prépare la saisie au lieu de répondre à vide', () => {
		const d = desk();

		const outcome = d.runFromPanel('image', 'f');

		expect(outcome).toBe('needs-argument');
		expect(d.draft).toBe('f(');
		expect(d.entries.length).toBe(0);
	});

	it('dit pourquoi quand l’objet ne peut rien produire', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' });
		const d = new CalcDesk(atelier);

		d.runFromPanel('derive', 'f');

		expect(d.entries[0].text).toBe(atelier.get('f')?.message);
		expect(d.entries[0].failed).toBe(true);
	});

	it('ne prétend rien faire d’une action qu’elle ne connaît pas', () => {
		const d = desk();

		expect(d.runFromPanel('table', 'f')).toBe('unsupported');
		expect(d.entries.length).toBe(0);
	});
});

describe('la saisie au clavier', () => {
	it('crée un objet depuis une définition', () => {
		const d = new CalcDesk(new Atelier());

		d.submit('g(x) = x^3');

		expect(d.atelier.names).toEqual(['g']);
	});

	it('ignore une saisie vide sans écrire de ligne', () => {
		const d = new CalcDesk(new Atelier());

		d.submit('   ');

		expect(d.entries.length).toBe(0);
	});

	it('vide le champ après une saisie retenue', () => {
		const d = new CalcDesk(new Atelier());
		d.draft = '2+3';

		d.submit(d.draft);

		expect(d.draft).toBe('');
	});

	it('garde un résultat et le dit', () => {
		const d = new CalcDesk(new Atelier());
		d.submit('1/3 + 1/6');

		d.keep(d.entries[0]);

		expect(d.atelier.names.length).toBe(1);
		expect(d.notice).toContain('Gardé');
	});

	it('dit pourquoi le résultat d’une commande ne se garde pas', () => {
		const d = new CalcDesk(new Atelier());
		d.submit('.variations x^2-3x+1');

		d.keep(d.entries[0]);

		expect(d.atelier.names).toEqual([]);
		expect(d.notice).toContain('commande');
	});
});
