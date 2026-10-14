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
import { historyToJson } from '../history-export';
import { readHistory } from '../history-import';

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

	// « Image d'un nombre » n'est plus une action du panneau : c'est un champ de
	// la carte (phase 0 `/grapheur` §3 A4), qui ne touche pas au brouillon
	it('image calcule depuis la carte sans toucher au brouillon de Calcul', () => {
		const d = desk();
		d.draft = '2+';

		const result = d.image('f', '2');

		expect(result.failed).toBe(false);
		expect(d.draft).toBe('2+');
		expect(d.entries).toHaveLength(1);
		expect(d.runFromPanel('image', 'f')).toBe('unsupported');
	});

	// En attente d'une FONCTION : `a*x`, à paramètre, se dérive depuis Q4
	// (David, 2026-10-14)
	it('dit pourquoi quand l’objet ne peut rien produire', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'h(x) + 1' });
		const d = new CalcDesk(atelier);

		d.runFromPanel('derive', 'f');

		expect(d.entries[0].text).toBe(atelier.get('f')?.message);
		expect(d.entries[0].failed).toBe(true);
	});

	it('dit pourquoi quand le paramètre empêche de conclure (« Résoudre » sur a x)', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' });
		const d = new CalcDesk(atelier);

		d.runFromPanel('solve', 'f');

		expect(d.entries[0].text).toBe(
			"Le résultat dépend de a : donne-lui une valeur (a = 2) pour l'étudier."
		);
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

/**
 * ↑ / ↓ rappellent les saisies (phase 0 `docs/wip/atelier-cas-phase0.md`,
 * PR 1) — ce que `/cas` savait faire et que l'atelier ne savait pas.
 */
describe('le rappel des saisies', () => {
	function typed(...inputs: string[]) {
		const d = new CalcDesk(new Atelier());
		for (const input of inputs) d.submit(input);
		return d;
	}

	it('↑ rappelle la dernière saisie, puis les précédentes', () => {
		const d = typed('1+1', '2+2', '3+3');

		d.recallPrevious();
		expect(d.draft).toBe('3+3');
		d.recallPrevious();
		expect(d.draft).toBe('2+2');
		d.recallPrevious();
		expect(d.draft).toBe('1+1');
	});

	it('↑ sur la plus ancienne ne bouge plus', () => {
		const d = typed('1+1', '2+2');

		d.recallPrevious();
		d.recallPrevious();
		d.recallPrevious();

		expect(d.draft).toBe('1+1');
	});

	it('↓ redescend, puis rend le brouillon d’avant le premier ↑', () => {
		const d = typed('1+1', '2+2');
		d.draft = '2x+';

		d.recallPrevious();
		d.recallPrevious();
		d.recallNext();
		expect(d.draft).toBe('2+2');
		d.recallNext();
		expect(d.draft).toBe('2x+');
	});

	it('↓ sans ↑ ne touche pas au brouillon', () => {
		const d = typed('1+1');
		d.draft = '2x+';

		d.recallNext();

		expect(d.draft).toBe('2x+');
	});

	it('sans saisie, ↑ ne touche pas au brouillon', () => {
		const d = new CalcDesk(new Atelier());
		d.draft = '2x+';

		d.recallPrevious();

		expect(d.draft).toBe('2x+');
	});

	it('rappelle une saisie refusée : c’est celle qu’on veut corriger', () => {
		const d = typed('x = 3');
		expect(d.entries[0].failed).toBe(true);

		d.recallPrevious();

		expect(d.draft).toBe('x = 3');
	});

	it('deux saisies identiques de suite ne sont rappelées qu’une fois', () => {
		const d = typed('1+1', '2+2', '2+2');

		d.recallPrevious();
		d.recallPrevious();

		expect(d.draft).toBe('1+1');
	});

	it('ne rappelle pas une ligne produite par un bouton du panneau', () => {
		const d = typed('1+1');
		d.atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		d.runFromPanel('derive', 'f');
		// La ligne du bouton existe bien : sinon le test ne prouverait rien
		expect(d.entries).toHaveLength(2);

		d.recallPrevious();

		expect(d.draft).toBe('1+1');
	});

	// « Comparer avec M » passe par `submit` : c'est quand même un bouton
	it('ne rappelle pas « Comparer avec M », qui écrit pourtant une commande', () => {
		const d = typed('1+1');
		d.atelier.create({ kind: 'list', name: 'L', definition: '1 ; 2 ; 3' });
		d.atelier.create({ kind: 'list', name: 'M', definition: '4 ; 5 ; 6' });
		d.runFromPanel('compare:M', 'L');
		expect(d.entries.at(-1)?.label).toContain('.comparer');

		d.recallPrevious();

		expect(d.draft).toBe('1+1');
	});

	it('une saisie envoyée remet le rappel au départ', () => {
		const d = typed('1+1', '2+2');
		d.recallPrevious();
		d.recallPrevious();

		d.submit('3+3');
		d.recallPrevious();

		expect(d.draft).toBe('3+3');
	});

	// L'élève rappelle une ligne, la corrige, puis remonte encore : sa
	// correction ne doit pas être perdue
	it('une ligne rappelée puis modifiée est rendue par ↓', () => {
		const d = typed('1+1', '2+2');
		d.recallPrevious();
		d.draft = '2+5';

		d.recallPrevious();
		expect(d.draft).toBe('2+2');
		d.recallNext();
		expect(d.draft).toBe('2+5');
	});

	// Revue : « Comparer » remettait le rappel à zéro, et ↓ perdait le brouillon
	it('un clic sur « Comparer » en plein rappel ne fait pas perdre le brouillon', () => {
		const d = typed('1+1', '3+3');
		d.atelier.create({ kind: 'list', name: 'L', definition: '1 ; 2 ; 3' });
		d.atelier.create({ kind: 'list', name: 'M', definition: '4 ; 5 ; 6' });
		d.draft = '2x+';
		d.recallPrevious();

		d.runFromPanel('compare:M', 'L');
		expect(d.draft).toBe('3+3');
		d.recallNext();

		expect(d.draft).toBe('2x+');
	});

	// Un rejeu est un chargement : comme au rechargement, rien à rappeler — et
	// surtout pas « Comparer avec M », rejoué comme une saisie (revue)
	it('un historique rejoué ne se rappelle pas', () => {
		const source = typed('1+1', '2+2');
		const read = readHistory(historyToJson(source.entries, new Date()));
		if (!read.ok) throw new Error(read.message);
		const d = new CalcDesk(new Atelier());

		d.replay(read.history);
		expect(d.entries).toHaveLength(2);
		d.recallPrevious();

		expect(d.draft).toBe('');
	});

	it('« Repartir de zéro » vide aussi ce qu’on peut rappeler', () => {
		const d = typed('1+1');
		d.clear();
		d.draft = '';

		d.recallPrevious();

		expect(d.draft).toBe('');
	});
});
