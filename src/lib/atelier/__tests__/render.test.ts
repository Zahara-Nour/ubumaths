/**
 * Le rendu du résultat — §3 et §6 ter.
 *
 * Aujourd'hui ni `/calc` ni `/cas` ne rendent le résultat en mathématiques :
 * l'un affiche le texte brut en `font-mono` (avec le commentaire « will be
 * replaced by proper LaTeX rendering » resté en place), l'autre du HTML échappé.
 * Le champ `latex` de `ReplExecutionResult` existe mais n'est JAMAIS rempli.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { renderResult } from '../render';

function render(input: string) {
	const engine = new WebReplEngine();
	return renderResult(engine.execute(input));
}

describe('ce qui se rend en mathématiques', () => {
	it('rend une fraction comme une fraction', () => {
		expect(render('1/3 + 1/6').latex).toBe('\\dfrac{1}{2}');
	});

	it('garde l’exactitude d’une racine', () => {
		expect(render('sqrt(8)').latex).toBe('2 \\sqrt{2}');
	});

	it('rend un entier', () => {
		expect(render('2+3').latex).toBe('5');
	});

	it('rend une expression littérale', () => {
		expect(render('(x^2-1)/(x+1)').latex).toContain('x^2');
	});

	// §3 N3 : le mode décimal se voit
	it('rend une valeur décimale quand le mode le demande', () => {
		const engine = new WebReplEngine();
		engine.execute('.decimal');

		expect(renderResult(engine.execute('sqrt(8)')).latex).toMatch(/2[.,]8/);
	});
});

describe('ce qui ne se rend PAS en mathématiques', () => {
	// ⚠️ Mesuré le 2026-09-16 : reparser la sortie texte est un PIÈGE.
	// `(x^2-1)/(x+1)` rend « (x^2-1):/(x+1)  (variables: x) », et reparser cette
	// chaîne donne « v a r \imaginaryI a b l \exponentialE s » — le mot
	// « variables » lu comme un produit de lettres.
	it('ne reparse jamais la sortie texte', () => {
		const rendered = render('(x^2-1)/(x+1)');

		expect(rendered.latex).not.toContain('imaginaryI');
		expect(rendered.latex).not.toContain('exponentialE');
	});

	// §3 L1 : mieux vaut du texte propre qu'un rendu mathématique faux
	it('rend le texte tel quel quand une commande répond en phrases', () => {
		const engine = new WebReplEngine();

		const rendered = renderResult(engine.execute('.vars'));

		expect(rendered.latex).toBeUndefined();
		expect(rendered.text).toContain('variable');
	});

	it('laisse une erreur en texte', () => {
		const rendered = render('1/0 +');

		expect(rendered.latex).toBeUndefined();
		expect(rendered.text.trim()).not.toBe('');
	});
});

describe('les grandeurs gardent leur unité', () => {
	// ⚠️ Mesuré : le moteur rend « \dfrac{123}{10} km » DANS le champ texte —
	// du LaTeX mélangé à du texte, que /calc affiche littéralement en font-mono.
	// L'AST, lui, a perdu l'unité : il ne rend que \dfrac{123}{10}.
	it('n’efface pas l’unité du résultat', () => {
		const rendered = render('12[km] + 300[m]');

		expect(rendered.latex).toContain('km');
	});

	it('n’affiche jamais la commande LaTeX brute à l’élève', () => {
		const rendered = render('12[km] + 300[m]');

		// Le texte de repli ne doit pas être « \dfrac{123}{10} km »
		expect(rendered.latex).toBeDefined();
	});
});

/**
 * ⚠️ La branche « le texte contient déjà du LaTeX » est la SEULE où le LaTeX
 * rendu ne vient pas de notre arbre : c'est le texte du moteur, dérivé de ce
 * que l'élève a tapé, et il finit dans un `{@html}`. MathLive accepte des
 * commandes qui posent des attributs HTML (`\htmlStyle`, `\class`, `\cssId`).
 */
describe('le texte promu en LaTeX est bridé', () => {
	it('laisse passer ce qui écrit un nombre avec son unité', () => {
		const rendered = renderResult({
			success: true,
			output: '\\dfrac{123}{10} km'
		} as never);

		expect(rendered.latex).toBe('\\dfrac{123}{10} km');
	});

	it('refuse une commande qui poserait des attributs', () => {
		for (const hostile of [
			'\\htmlStyle{color:red}{1}',
			'\\class{x}{1}',
			'\\cssId{y}{1}',
			'\\href{javascript:alert(1)}{1}'
		]) {
			const rendered = renderResult({ success: true, output: hostile } as never);
			expect(rendered.latex, hostile).toBeUndefined();
			// Et le texte reste affiché, échappé par Svelte
			expect(rendered.text, hostile).toBe(hostile);
		}
	});
});

describe('ce qui ne regarde pas l’élève', () => {
	it('retire la ligne « LaTeX: … » que les commandes ajoutent', () => {
		const engine = new WebReplEngine();

		const rendered = renderResult(engine.execute('.diff x^2'), { fromCommand: true });

		expect(rendered.text).not.toContain('LaTeX:');
	});

	/**
	 * ⚠️ Pour une COMMANDE, `result.ast` porte l'ENTRÉE, pas le résultat.
	 * Rendre cet arbre afficherait « x^2 » là où `.dériver x^2` répond « 2x » :
	 * un résultat faux, joliment composé — le pire des deux mondes.
	 */
	it('ne rend pas l’entrée d’une commande comme si c’était son résultat', () => {
		const engine = new WebReplEngine();

		const rendered = renderResult(engine.execute('.diff x^2'), { fromCommand: true });

		expect(rendered.latex).toBeUndefined();
	});

	it('retire l’annotation « (variables: x) »', () => {
		expect(render('(x^2-1)/(x+1)').text).not.toContain('variables:');
	});
});
