/**
 * Six défauts que l'élève VOIT, relevés en mesurant l'atelier le 2026-10-14
 * (`docs/wip/atelier-progress.md`, « État mesuré »), corrigés ensemble à la
 * demande de David (« ok pour la petite PR »).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk, type Entry } from '../desk.svelte';
import { derivativeName } from '../names';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';

// =============================================================================
// Décor
// =============================================================================

function desk(): CalcDesk {
	return new CalcDesk(new Atelier(), new WebReplEngine());
}

/** La ligne que produit une saisie. */
function lineOf(input: string, on: CalcDesk = desk()): Entry {
	on.submit(input);
	const entry = on.entries.at(-1);
	if (entry === undefined) throw new Error(`aucune ligne pour ${input} (${on.notice})`);
	return entry;
}

/** Ce que l'élève lit : la formule si la ligne en a une, sinon le texte. */
function shown(entry: Entry): string {
	return entry.latex ?? entry.text;
}

// =============================================================================
// Tests
// =============================================================================

describe('l’image depuis la carte f′', () => {
	it('se calcule, comme f′(1) tapé dans Calcul', () => {
		const withF = desk();
		withF.atelier.create({ kind: 'function', name: 'f', definition: 'x^3' }, 'text');
		withF.runFromPanel('derive', 'f');

		const image = withF.image(derivativeName('f'), '2');

		expect(image).toEqual({ text: '12', failed: false });
		expect(shown(lineOf("f'(2)", withF))).toBe('12');
	});
});

describe('les refus de .intégrer parlent la langue de l’élève', () => {
	it('le point singulier est nommé dans SA variable : t, pas x', () => {
		const line = lineOf('.intégrer 1/t de -1 à 1');

		expect(line.failed).toBe(true);
		expect(line.text).toContain('t ≈ 0');
		expect(line.text).not.toContain('x ≈');
	});

	it('une borne en fraction s’écrit 1/2, pas « 1:/2 »', () => {
		const line = lineOf('.intégrer 1/x de -1 à 1/2');

		expect(line.failed).toBe(true);
		expect(line.text).toContain('[-1 ; 1/2]');
		expect(line.text).not.toContain(':/');
	});

	it('une borne en π s’écrit π, pas « \\pi »', () => {
		const line = lineOf('.intégrer tan(x) de 0 à \\pi');

		expect(line.failed).toBe(true);
		expect(line.text).toContain('[0 ; π]');
	});

	it('une saisie illisible garde le refus de lecture, comme .dériver', () => {
		expect(lineOf('.intégrer )(').text).toBe(lineOf('.dériver )(').text);
	});

	it('une primitive non trouvée : un refus en français, pas la sortie du terminal', () => {
		const line = lineOf('.intégrer 1/(x^2-2)');

		expect(line.failed).toBe(true);
		expect(line.text).not.toMatch(/Non résolu|Technique tentée|∫/);
		expect(line.text).toMatch(/^Je ne sais pas calculer/);
	});
});

describe('« … en min » convertit, comme .convertir', () => {
	it.each([
		['2,5 h en min', /150.*min/],
		['12 km + 300 m en m', /12\s*300.*m/],
		['2 h 30 min en min', /150.*min/]
	])('%s', (input, expected) => {
		const line = lineOf(input);

		expect(line.failed).toBe(false);
		expect(shown(line)).toMatch(expected);
		// Avant : un produit de lettres, « 2,5 h e n m i n »
		expect(shown(line)).not.toMatch(/exponentialE|imaginaryI/);
	});

	it('la même réponse que le calcul suivi de .convertir', () => {
		const twoSteps = desk();
		twoSteps.submit('2,5 h');
		twoSteps.submit('.convertir min');

		expect(shown(lineOf('2,5 h en min'))).toBe(shown(twoSteps.entries.at(-1)!));
	});

	it('pas une grandeur à gauche : un refus qui la cite, sans toucher la grandeur d’avant', () => {
		const withKm = desk();
		withKm.submit('5 km');

		const line = lineOf('3 en m', withKm);

		expect(line.failed).toBe(true);
		expect(line.text).toContain("n'est pas une grandeur");
		// Revue : la ligne refusée effaçait les 5 km du moteur
		expect(shown(lineOf('.convertir m', withKm))).toMatch(/5\s*000.*m/);
	});

	it.each([
		['1/0 en m', 'Division par zéro'],
		['2 h 30 en min', '« 30 » inattendu ici']
	])('%s : l’erreur de la partie gauche, telle quelle', (input, expected) => {
		expect(shown(lineOf(input))).toContain(expected);
	});

	it('« en » sans unité derrière : rien ne change', () => {
		// `e n` reste un produit de lettres : pas une conversion
		expect(lineOf('2 en').failed).toBe(false);
	});
});

describe('la réciproque d’une expression à paramètres sans carte', () => {
	it('dit que le résultat dépend des paramètres, pas « la réciproque de f »', () => {
		const line = lineOf('.réciproque a x + b');

		expect(line.failed).toBe(true);
		expect(line.text).not.toContain('de f');
		expect(line.text).toContain('Le résultat dépend de a et b');
	});

	it('un seul paramètre : même refus que .variations ou .limite', () => {
		expect(lineOf('.réciproque x + a').text).toBe(
			"Le résultat dépend de a : donne-lui une valeur (a = 2) pour l'étudier."
		);
	});

	it('sans x et à plusieurs lettres : la variable n’est pas connue, il le dit', () => {
		const line = lineOf('.réciproque a t + b');

		expect(line.failed).toBe(true);
		expect(line.text).toContain('quelle lettre est la variable parmi a, b et t');
	});

	it('une lettre grecque s’écrit comme l’élève l’a tapée', () => {
		// Et sans proposer `α = 2`, qui ne définit rien (lu comme un test d'égalité)
		expect(lineOf('.réciproque \\alpha x').text).toBe(
			"Le résultat dépend de α : remplace-la par un nombre pour l'étudier."
		);
	});

	it('sans paramètre, rien ne change', () => {
		expect(lineOf('.réciproque 2x+3').failed).toBe(false);
	});
});
