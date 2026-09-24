/**
 * Défauts relevés en rédigeant des exercices ubumark, vus dans le PDF (2026-09-24).
 *
 * Points 5-7 : conversion LaTeX → Typst de `$…$`.
 * Point 8 : virgule littérale dans un argument de fonction Typst généré (cases, mat).
 * (Les points 1-4, côté parseur `~…~`, sont livrés à part.)
 */

import { describe, it, expect } from 'vitest';
import { convertLatexToTypstMath } from '../typst-generator';

describe('$…$ : convertLatexToTypstMath', () => {
	it('5. \\varnothing devient emptyset', () => {
		expect(convertLatexToTypstMath('\\mathcal{S}=\\varnothing')).toBe('cal(S)=emptyset');
	});

	it('6. \\sqrt5 (sans accolades) équivaut à \\sqrt{5}', () => {
		expect(convertLatexToTypstMath('60-20\\sqrt5')).toBe('60-20 sqrt(5)');
		expect(convertLatexToTypstMath('\\sqrt x')).toBe('sqrt(x)');
		expect(convertLatexToTypstMath('\\sqrt\\pi')).toBe('sqrt(pi)');
		// Formes existantes inchangées
		expect(convertLatexToTypstMath('\\sqrt{5}')).toBe('sqrt(5)');
		expect(convertLatexToTypstMath('\\sqrt[3]{x}')).toBe('root(3, x)');
	});

	it("7. f_k'(t) : le prime porte sur f, pas sur l'indice", () => {
		expect(convertLatexToTypstMath("f_k'(t)")).toBe("f'_k (t)");
		expect(convertLatexToTypstMath("f_{k}''(t)")).toBe("f''_(k) (t)");
		// Formes existantes inchangées
		expect(convertLatexToTypstMath("f'(x)")).toBe("f'(x)");
		expect(convertLatexToTypstMath('u_n(x)')).toBe('u_n (x)');
	});
});

describe('8. virgule littérale dans un argument de fonction Typst généré', () => {
	// Énoncé réel (« Évolution de la population d'une ville ») : la virgule nue
	// après -300 était lue comme séparateur d'arguments de display(...) →
	// « unexpected argument », et tout le PDF de la fiche échouait.
	const population =
		'\\begin{cases}u_0 & =10000\\\\ u_{n+1} & =1.08u_{n}-300,\\quad n\\in\\mathbb{N}\\end{cases}';

	it('la virgule d’une ligne de cases est protégée', () => {
		expect(convertLatexToTypstMath(population)).toBe(
			'cases(display(u_0 & =10000), display(u_(n+1) & =1.08u_(n)-300"," quad  n in NN))'
		);
	});

	it('les virgules imbriquées (frac, fonctions) restent des séparateurs', () => {
		expect(
			convertLatexToTypstMath('\\begin{cases} x = \\frac{1}{2}, y \\\\ f(a, b) \\end{cases}')
		).toBe('cases(display(x = frac(1, 2)"," y), display(f(a, b)))');
	});

	it('la virgule d’une cellule de matrice est protégée', () => {
		expect(convertLatexToTypstMath('\\begin{pmatrix} a, b & c \\end{pmatrix}')).toBe(
			'mat(delim: "(", a"," b, c)'
		);
	});

	it('le \\, (espace fine) n’est pas une virgule', () => {
		expect(convertLatexToTypstMath('\\begin{cases} 10\\,000 \\end{cases}')).toBe(
			'cases(display(10 thin 000))'
		);
	});
});
