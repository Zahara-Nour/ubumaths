/**
 * `pi` tapé en lettres dans Calcul : la notation custom le lit p·i (i étant
 * l'imaginaire). On obtenait « en attente de p » ou un résultat faux.
 *
 * Décision de David (2026-10-06) : on REFUSE, avec un message qui dit quoi
 * écrire — pas d'acceptation silencieuse de `pi`.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';

const PI_MESSAGE = 'Écris π avec \\pi ou le symbole π.';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

describe('pi en lettres : refusé, avec le message', () => {
	it.each(['f(x)=sin(pi x)', 'f(x)=pi*x', '.resoudre cos(x)=pi', '2pi', 'a = 3pi', 'pi'])(
		'%s',
		(input) => {
			const s = session();
			const result = runInput(s, input);

			expect(result).toEqual({ kind: 'refus', message: PI_MESSAGE });
		}
	);

	it('refusée, la définition ne crée aucun objet', () => {
		const s = session();
		runInput(s, 'f(x)=pi*x');

		expect(s.atelier.get('f')).toBeUndefined();
	});
});

describe('π écrit correctement : accepté', () => {
	it.each(['f(x)=\\pi x', 'f(x)=π x', 'f(x)=sin(\\pi x)'])('%s définit f', (input) => {
		const result = runInput(session(), input);

		expect(result.kind).toBe('definition');
	});

	it('2\\pi se calcule', () => {
		const result = runInput(session(), '2\\pi');

		expect(result.kind).toBe('calcul');
	});

	it('.resoudre cos(x)=\\pi n’est pas refusée pour π', () => {
		const result = runInput(session(), '.resoudre cos(x)=\\pi');

		expect(result).not.toEqual({ kind: 'refus', message: PI_MESSAGE });
	});

	// `p*i` : deux lettres séparées, voulues — et des mots qui contiennent « pi »
	it.each(['p*i', 'L = pile ; face', 'L = épi ; blé'])('%s n’est pas refusé pour π', (input) => {
		const s = session();
		if (input === 'p*i') runInput(s, 'p = 2');
		const result = runInput(s, input);

		expect(result).not.toEqual({ kind: 'refus', message: PI_MESSAGE });
	});
});
