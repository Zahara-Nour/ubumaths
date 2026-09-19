/**
 * Atelier — la simplification expliquée.
 *
 * ⚠️ Ce que `.simplifier` rendait, **mesuré** le 2026-09-19 :
 *
 *   .simplifier x+x        → « Simplified: x+x »       (rien n'a bougé)
 *   .simplifier sqrt(8)    → « Simplified: sqrt(8) »   (rien n'a bougé)
 *   .simplifier 2/6+1/4    → « Simplified: 7/12 »      (juste, mais tombé du ciel)
 *
 * Le `simplify()` algorithmique laisse donc passer `x + x` et `√8` — ce n'est
 * pas une impression, c'est la sortie du moteur. `pedagogical-simplify` rend
 * `2x` et `2√2`, **et** nomme la règle utilisée.
 *
 * L'intention est `auto`, la seule qui convienne à un élève qui a tapé
 * « simplifier » sans en dire plus : elle réduit et n'applique que les
 * transformations non ambiguës. `x² - 4` reste donc `x² - 4` — factoriser
 * n'est pas « simplifier », c'est une autre demande.
 */

import { describe, it, expect } from 'vitest';
import { simplifySteps } from '../simplify-steps';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

function stepsOf(input: string) {
	const result = runInput(session(), input);
	expect(result.kind).toBe('commande');
	return result.kind === 'commande' ? result : null!;
}

describe('ce que le moteur ne savait pas faire', () => {
	it('le radical s’extrait', () => {
		const simplified = simplifySteps('sqrt(8)');

		expect(simplified).not.toBeNull();
		expect(simplified!.answer).toBe('2 \\sqrt{2}');
		expect(simplified!.steps[0].title).toBe('On simplifie le radical');
	});

	it('les termes semblables se regroupent', () => {
		const simplified = simplifySteps('x+x');

		expect(simplified!.answer).toBe('2 x');
		expect(simplified!.steps[0].title).toBe('On regroupe les termes semblables');
	});

	it('la fraction rationnelle se réduit', () => {
		const simplified = simplifySteps('(x^2-1)/(x+1)');

		expect(simplified!.answer).toBe('x - 1');
		expect(simplified!.steps[0].title).toBe('On réduit la fraction');
	});
});

describe('la règle est nommée, pas seulement appliquée', () => {
	it('chaque étape porte son explication', () => {
		const simplified = simplifySteps('sqrt(8)');

		expect(simplified!.steps[0].explanation).toContain('carrés parfaits');
	});

	it('et son écriture en LaTeX, jamais la notation du terminal', () => {
		const latex = simplifySteps('sqrt(8)')!.steps[0].expressionLatex ?? '';

		expect(latex).toContain('\\sqrt{2}');
		expect(latex).not.toContain('sqrt(');
	});
});

describe('deux fois la même étape ne s’affiche qu’une fois', () => {
	/**
	 * ⚠️ Mesuré sur le module : `3x + 2x - x` émet **deux** étapes
	 * `combine-like-terms`, et le rendu des deux est identique au caractère
	 * près — même titre, même « 3x + 2x - x = 4x ». Le module ne sait pas
	 * rendre l'étape intermédiaire : il colore le tout et montre le résultat
	 * final. Afficher deux fois la même ligne ferait croire à l'élève qu'il a
	 * raté quelque chose entre les deux.
	 *
	 * On ne replie QUE l'identique consécutif : deux règles différentes qui
	 * rendent la même image restent deux étapes, parce qu'elles disent deux
	 * choses (√12 + √3 : « on simplifie le radical », puis « on regroupe »).
	 */
	it('la même règle rendue à l’identique est repliée', () => {
		const simplified = simplifySteps('3x+2x-x');

		expect(simplified!.answer).toBe('4 x');
		expect(simplified!.steps).toHaveLength(1);
	});

	it('deux règles différentes restent deux étapes', () => {
		const titres = simplifySteps('sqrt(12)+sqrt(3)')!.steps.map((s) => s.title);

		expect(titres).toEqual(['On simplifie le radical', 'On regroupe les termes semblables']);
	});
});

describe('le repli — la ligne garde alors la sortie du moteur', () => {
	it('une expression déjà simplifiée ne produit aucune étape', () => {
		expect(simplifySteps('2x+3')).toBeNull();
	});

	it('`x² - 4` n’est PAS factorisé : `auto` s’y refuse', () => {
		// Décision du module, pas un oubli : « simplifier » ne dit pas
		// « factoriser ». Le repli garde donc la réponse du moteur.
		expect(simplifySteps('x^2-4')).toBeNull();
	});

	it('une inéquation sort du périmètre V1 du module', () => {
		// `PedagogicalSimplifyNotImplemented` — attrapée, jamais propagée.
		expect(simplifySteps('2x+1<7')).toBeNull();
	});

	it('une entrée que le parseur refuse', () => {
		expect(simplifySteps('')).toBeNull();
		expect(simplifySteps('   ')).toBeNull();
		expect(simplifySteps('###')).toBeNull();
	});
});

describe('`.simplifier` reçoit vraiment les étapes', () => {
	/**
	 * ⚠️ Le chemin COMPLET, pas la fonction en isolation : deux moitiés vertes
	 * ne font pas un geste vivant (#339).
	 */
	it('la commande tapée à la main', () => {
		const result = stepsOf('.simplifier sqrt(8)');

		expect(result.steps).toBeDefined();
		expect(result.steps![0].title).toBe('On simplifie le radical');
	});

	it('la ligne porte la réponse en mathématiques', () => {
		expect(stepsOf('.simplifier x+x').latex).toBe('2 x');
	});

	it('les raccourcis passent par le même chemin', () => {
		// `.s`, `.simp` et `.simplify` se résolvent tous vers `simplify`.
		expect(stepsOf('.s x+x').steps![0].title).toBe('On regroupe les termes semblables');
		expect(stepsOf('.simp x+x').steps).toBeDefined();
	});

	it('les noms d’objets sont substitués avant la simplification', () => {
		const s = session();
		s.atelier.create({ kind: 'value', name: 'a', definition: 'sqrt(8)' });
		const result = runInput(s, '.simplifier a');

		expect(result.kind === 'commande' && result.latex).toBe('2 \\sqrt{2}');
	});

	it('sans étapes, la commande garde exactement ce qu’elle affichait', () => {
		const result = stepsOf('.simplifier 2x+3');

		expect(result.steps).toBeUndefined();
		expect(result.output).toContain('Simplified');
	});

	it('une inéquation ne fait pas tomber la commande', () => {
		const result = runInput(session(), '.simplifier 2x+1<7');

		expect(result.kind).toBe('commande');
	});
});
