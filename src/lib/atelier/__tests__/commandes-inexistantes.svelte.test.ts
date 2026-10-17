/**
 * Atelier — les commandes de `/cas` qui n'existent pas dans l'atelier
 *
 * Décision de David (2026-10-13) : les commandes qui créent ou effacent des
 * noms (`.poser`, `.définir`, `.effacer`, `.oublier`, `.oublier-fonction`,
 * `.dérivée-de`, `.inv` — la réciproque donnée à la main) **ne sont pas censées
 * exister** dans l'atelier — le panneau fait la même chose. Pas de refus
 * particulier : elles répondent comme toute commande inconnue.
 *
 * Mesuré le 2026-10-13 sur main : elles n'étaient grisées que dans la liste
 * déroulante ; tapées en entier, elles partaient au moteur. `.effacer`
 * désynchronisait le moteur du panneau (`a + 1` rendait « a+1 » avec
 * `a = 3` affiché), `.définir` créait une fonction invisible, et `.latex`
 * basculait la saisie en LaTeX (`sqrt(2)*sqrt(8)` devenait « s q r t »).
 *
 * `.réciproque` n'en est plus : c'est la réciproque CALCULÉE (lot 3 de
 * `docs/wip/atelier-reciproque-phase0.md`), servie par l'atelier.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';

function deskWithNames() {
	const atelier = new Atelier();
	const desk = new CalcDesk(atelier);
	desk.submit('a = 3');
	desk.submit('f(x) = x^2');
	return { atelier, desk };
}

const lastText = (desk: CalcDesk) => desk.entries.at(-1)?.text ?? '';

describe('les commandes de noms de /cas', () => {
	it.each([
		['.poser b 2', 'poser'],
		['.définir g(x)=x', 'définir'],
		['.effacer', 'effacer'],
		['.oublier a', 'oublier'],
		['.oublier-fonction f', 'oublier-fonction'],
		['.dérivée-de f', 'dérivée-de'],
		['.let b 2', 'let'],
		['.def g(x)=x', 'def'],
		['.clear', 'clear'],
		['.unset a', 'unset'],
		['.undef f', 'undef'],
		['.inv f', 'inv'],
		[".def' f", "def'"],
		// Les raccourcis du registre ne rouvrent pas la porte
		['.clr', 'clr'],
		['.del a', 'del'],
		['.inverse f', 'inverse']
	])('« %s » répond comme une commande inconnue', (input, written) => {
		const { desk } = deskWithNames();
		desk.submit(input);

		expect(lastText(desk)).toContain(`« .${written} » n'est pas une commande.`);
	});

	it('« .effacer » ne vide pas le moteur : a + 1 vaut toujours 4', () => {
		const { desk } = deskWithNames();
		desk.submit('.effacer');
		desk.submit('a+1');

		expect(lastText(desk)).toBe('4');
	});

	it('« .définir » ne crée pas de fonction cachée au panneau', () => {
		const { atelier, desk } = deskWithNames();
		desk.submit('.définir g(x)=x+1');
		desk.submit('g(2)');

		expect(atelier.objects.map((o) => o.name)).toEqual(['a', 'f']);
		expect(lastText(desk)).not.toBe('3');
	});
});

describe('les bascules de saisie de /cas', () => {
	it.each(['.auto', '.latex', '.texte', '.custom'])(
		'« %s » ne change pas la lecture des calculs suivants',
		(input) => {
			const { desk } = deskWithNames();
			desk.submit(input);
			desk.submit('sqrt(2)*sqrt(8)');

			expect(lastText(desk)).toBe('4');
		}
	);

	// En mode texte, le moteur lisait `\frac` lettre à lettre
	it('« .texte » ne change pas la lecture d’un calcul tapé en LaTeX', () => {
		const { desk } = deskWithNames();
		desk.submit('.texte');
		desk.submit('\\frac{1}{2}+1');

		expect(lastText(desk)).toBe('3/2');
	});

	it.each(['.l', '.tex', '.c', '.cust'])(
		'le raccourci « %s » seul ne bascule pas la saisie',
		(input) => {
			const { desk } = deskWithNames();
			desk.submit(input);
			desk.submit('sqrt(2)*sqrt(8)');

			expect(lastText(desk)).toBe('4');
		}
	);

	it('« .latex » seul demande l’expression', () => {
		const { desk } = deskWithNames();
		desk.submit('.latex');

		expect(lastText(desk)).toBe("Écris l'expression après la commande : « .latex x^2/2 ».");
	});

	it('« .auto » n’est pas une commande de l’atelier', () => {
		const { desk } = deskWithNames();
		desk.submit('.auto');

		expect(lastText(desk)).toContain("« .auto » n'est pas une commande.");
	});

	// La commande de développeur garde son sens : écrire la réponse en LaTeX
	it('« .latex sqrt(2) » écrit l’expression en LaTeX', () => {
		const { desk } = deskWithNames();
		desk.submit('.latex sqrt(2)');

		expect(lastText(desk)).toContain('\\sqrt');
		expect(lastText(desk)).not.toContain('Input mode');
	});
});
