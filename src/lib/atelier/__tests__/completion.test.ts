/**
 * La complétion des fonctions et des lettres grecques dans Calcul (phase 0
 * `docs/wip/atelier-cas-phase0.md`, PR 3 ; décisions de David du 2026-10-11).
 *
 * Règle unique : la liste s'ouvre quand le mot en cours (lettres seulement) a
 * au moins 2 lettres, est le début d'une proposition, et que la choisir
 * changerait le champ.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { Atelier } from '../atelier.svelte';
import { runInput } from '../calcul';
import { PROPOSALS, insertProposal, proposalsFor } from '../completion';

/** Les insertions proposées pour ce brouillon, curseur à la fin (ou à `caret`). */
const offered = (draft: string, caret = draft.length) =>
	proposalsFor(draft, caret).map((p) => p.insert);

describe('ce qui est proposé', () => {
	it('`si` propose les fonctions, puis les lettres grecques, qui commencent par si', () => {
		expect(offered('si')).toEqual(['sin(', 'sinh(', 'sign(', 'σ']);
	});

	it('`al` propose le symbole α, pas `\\alpha`', () => {
		expect(offered('al')).toEqual(['α']);
	});

	// `pi` en lettres est refusé depuis #896 : la proposition donne le symbole
	it('`pi` propose π', () => {
		expect(offered('pi')).toEqual(['π']);
	});

	it('une majuscule tapée propose la majuscule grecque', () => {
		expect(offered('De')).toEqual(['Δ']);
	});

	it('rien pour une seule lettre', () => {
		expect(offered('s')).toEqual([]);
		expect(offered('2x+a')).toEqual([]);
	});

	it('le mot en cours suit un chiffre ou un signe', () => {
		expect(offered('3ta')).toEqual(['tan(', 'tanh(', 'τ']);
		expect(offered('1+co')).toEqual(['cos(', 'cosh(']);
	});

	it('le mot en cours est celui du curseur, pas la fin du champ', () => {
		expect(offered('co + 1', 2)).toEqual(['cos(', 'cosh(']);
	});

	it('rien pour un mot inconnu', () => {
		expect(offered('zz')).toEqual([]);
	});

	it('`sin` tapé en entier propose encore `sin(` : la parenthèse change le champ', () => {
		expect(offered('sin')).toEqual(['sin(', 'sinh(']);
	});

	it('rien dans le nom d’une commande : c’est la liste des commandes', () => {
		expect(offered('.dé')).toEqual([]);
		expect(offered('.si')).toEqual([]);
	});

	it('après le nom de la commande, comme ailleurs', () => {
		expect(offered('.dériver si')).toEqual(['sin(', 'sinh(', 'sign(', 'σ']);
	});

	// `\alpha` est déjà du LaTeX : y proposer `α` couperait la commande
	it('rien derrière une barre oblique inverse', () => {
		expect(offered('\\al')).toEqual([]);
	});

	// Revue : `\frac{co` proposait `cos(` — une saisie mêlée, que Calcul refuse (#911)
	it('rien dans une saisie en LaTeX', () => {
		expect(offered('\\frac{co')).toEqual([]);
		expect(offered('\\sqrt{2}+si')).toEqual([]);
	});

	// La phase 0 promet « au plus 8 » : la liste des fonctions et des lettres
	// grecques le tient d'elle-même — ce test la garde, préfixe par préfixe
	it('au plus 8 propositions, pour tout début de 2 lettres', () => {
		const prefixes = new Set(PROPOSALS.map((p) => p.label.slice(0, 2)));
		const crowded = [...prefixes].filter((prefix) => offered(prefix).length > 8);

		expect(crowded).toEqual([]);
	});
});

describe('insérer une proposition', () => {
	it('remplace le mot en cours, curseur après l’insertion', () => {
		const sin = proposalsFor('2si', 3)[0];

		expect(insertProposal('2si', 3, sin)).toEqual({ draft: '2sin(', caret: 5 });
	});

	it('au milieu du champ, le reste est gardé', () => {
		const cos = proposalsFor('co + 1', 2)[0];

		expect(insertProposal('co + 1', 2, cos)).toEqual({ draft: 'cos( + 1', caret: 4 });
	});

	it('une lettre grecque remplace son nom', () => {
		const alpha = proposalsFor('2al', 3)[0];

		expect(insertProposal('2al', 3, alpha)).toEqual({ draft: '2α', caret: 2 });
	});
});

/**
 * ⚠️ Le garde-fou de la phase 0 : une proposition que Calcul refuserait
 * enseignerait une écriture fausse. Le module de `/cas` insérait `\alpha` à
 * côté de `sin(` — une saisie mêlée que Calcul refuse depuis #911.
 */
describe('toute proposition est acceptée par Calcul', () => {
	it('chaque fonction, appliquée à un nombre, et chaque lettre, dans un calcul', () => {
		const refused: string[] = [];
		for (const proposal of PROPOSALS) {
			const typed = proposal.insert.endsWith('(')
				? `${proposal.insert}1)`
				: `2${proposal.insert}+1`;
			const result = runInput({ atelier: new Atelier(), engine: new WebReplEngine() }, typed);
			if (result.kind !== 'calcul') refused.push(`${typed} → ${result.kind}`);
		}

		expect(refused).toEqual([]);
	});
});
