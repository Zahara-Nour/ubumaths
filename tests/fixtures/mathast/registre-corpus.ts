/**
 * Corpus du registre des commandes — le CONTRAT de la réponse brute
 * (chantier `registre-reference`, décision D4, question Q6 ; journal
 * `docs/wip/registre-reference-progress.md`).
 *
 * Une entrée = une ligne tapée par l'élève et la réponse brute écrite À
 * L'AVANCE, d'après l'ADR 0032 (la forme se choisit par le but de la
 * commande). Le registre (`WebReplEngine`, champ `answer`) et l'Atelier
 * (`runInput`, champ `latex`) sont jugés contre elle ; plus tard `pnpm math`
 * et la calculatrice.
 *
 * - `attendu` est en LaTeX. Un ensemble commence par `S =` (solutions) ou
 *   `D =` (domaine) ; un verdict s'écrit `\text{vrai}` / `\text{faux}`.
 * - `refus: true` : la ligne doit être refusée, et `attendu` est le message.
 * - Comparaison : `checkForm` (espaces, signe ×, ordre des termes…), plus un
 *   contrôle numérique qui distingue « autre écriture » de « autre valeur »
 *   (`src/lib/mathAST/cli/__tests__/registre-corpus/compare.ts`).
 *
 * ⚠️ Un attendu ne s'ajoute ni ne se change sans la validation de David
 * (page à cocher) : c'est le contrat, pas une photographie du moteur.
 */

// =============================================================================
// Types
// =============================================================================

export interface RegistreCase {
	/** `deriver-03` : stable, cité par les listes « connues fausses » */
	readonly id: string;
	/** La ligne telle que l'élève la tape dans l'Atelier, noms français */
	readonly ligne: string;
	/** La réponse brute en LaTeX ; pour un refus, le message */
	readonly attendu: string;
	readonly refus?: true;
	/** Pourquoi cet attendu (règle de l'ADR 0032, décision du chantier) */
	readonly note?: string;
}

// =============================================================================
// Corpus
// =============================================================================

export const REGISTRE_CORPUS: Readonly<Record<string, readonly RegistreCase[]>> = {
	dériver: [
		{ id: 'deriver-01', ligne: '.dériver x^2', attendu: '2x' },
		{ id: 'deriver-02', ligne: '.dériver 3x^2-5x+2', attendu: '6x-5' },
		{
			id: 'deriver-03',
			ligne: '.dériver x*e^x',
			attendu: '(x+1)e^x',
			note: 'Réduite, exponentielle commune en facteur (ADR 0032, D1).'
		},
		{
			id: 'deriver-04',
			ligne: '.dériver (2x+1)/(x-3)',
			attendu: '-\\frac{7}{(x-3)^2}',
			note: 'Réduite : le numérateur est calculé.'
		},
		{ id: 'deriver-05', ligne: '.dériver ln(x^2+1)', attendu: '\\frac{2x}{x^2+1}' },
		{ id: 'deriver-06', ligne: '.dériver sin(x)^2', attendu: '2\\cos(x)\\sin(x)' },
		{ id: 'deriver-07', ligne: '.dériver sqrt(x)', attendu: '\\frac{1}{2\\sqrt{x}}' },
		{ id: 'deriver-08', ligne: '.dériver e^(2x+1)', attendu: '2e^{2x+1}' },
		{ id: 'deriver-09', ligne: '.dériver 1/x', attendu: '-\\frac{1}{x^2}' },
		{
			id: 'deriver-10',
			ligne: '.dériver (x^2+1)e^(-x)',
			attendu: '-(x^2-2x+1)e^{-x}',
			note: 'Exponentielle commune en facteur ; le − du terme de gauche sort de la somme en facteur (tidy-spec, 2026-10-20). Validé par David le 2026-11-01.'
		},
		{ id: 'deriver-11', ligne: '.dériver x*ln(x)', attendu: '\\ln(x)+1' },
		{
			id: 'deriver-12',
			ligne: '.dériver (3x-1)^2',
			attendu: '18x-6',
			note: 'Réduite : 6(3x−1) est une forme factorisée.'
		}
	],

	simplifier: [
		{
			id: 'simplifier-01',
			ligne: '.simplifier (x^2-1)/(x+1)',
			attendu: '\\frac{x^2-1}{x+1}',
			note: 'Pas de simplification qui perd le domaine sans hypothèse (ADR 0032, S3).'
		},
		{ id: 'simplifier-02', ligne: '.simplifier 2x+3x', attendu: '5x' },
		{ id: 'simplifier-03', ligne: '.simplifier x^2*x^3', attendu: 'x^5' },
		{ id: 'simplifier-04', ligne: '.simplifier (x+1)^2-x^2', attendu: '2x+1' },
		{ id: 'simplifier-05', ligne: '.simplifier sqrt(12)', attendu: '2\\sqrt{3}' },
		{ id: 'simplifier-06', ligne: '.simplifier ln(e^x)', attendu: 'x' },
		{ id: 'simplifier-07', ligne: '.simplifier sin(x)^2+cos(x)^2', attendu: '1' },
		{ id: 'simplifier-08', ligne: '.simplifier 3/6', attendu: '\\frac{1}{2}' },
		{ id: 'simplifier-09', ligne: '.simplifier (2x)/4', attendu: '\\frac{x}{2}' },
		{
			id: 'simplifier-10',
			ligne: '.simplifier x/x',
			attendu: '\\frac{x}{x}',
			note: 'S3 : 1 seulement pour x ≠ 0 (bouton de l’Atelier).'
		}
	],

	résoudre: [
		{
			id: 'resoudre-01',
			ligne: '.résoudre 2x+1=7',
			attendu: 'S = \\{3\\}',
			note: 'Q2 : la réponse brute est l’ensemble des solutions, équations comprises.'
		},
		{ id: 'resoudre-02', ligne: '.résoudre 2x+1<7', attendu: 'S = ]-\\infty ; 3[' },
		{
			id: 'resoudre-03',
			ligne: '.résoudre x^2-3x+1=0',
			attendu: 'S = \\{\\frac{3-\\sqrt{5}}{2} ; \\frac{3+\\sqrt{5}}{2}\\}'
		},
		{ id: 'resoudre-04', ligne: '.résoudre x^2=4', attendu: 'S = \\{-2 ; 2\\}' },
		{ id: 'resoudre-05', ligne: '.résoudre x^2+1=0', attendu: 'S = \\emptyset' },
		{
			id: 'resoudre-06',
			ligne: '.résoudre e^x=3',
			attendu: 'S = \\{\\ln(3)\\}',
			note: 'La valeur approchée va au bouton ≈, pas dans la réponse.'
		},
		{ id: 'resoudre-07', ligne: '.résoudre ln(x)=2', attendu: 'S = \\{e^2\\}' },
		{ id: 'resoudre-08', ligne: '.résoudre x^2-5x+6<=0', attendu: 'S = [2 ; 3]' },
		{ id: 'resoudre-09', ligne: '.résoudre 3x-4>=2x+1', attendu: 'S = [5 ; +\\infty[' },
		{
			id: 'resoudre-10',
			ligne: '.résoudre (x-1)(x+2)=0',
			attendu: 'S = \\{-2 ; 1\\}',
			note: 'Solutions dans l’ordre croissant de leur valeur ; sans valeur (paramètre), ordre du calcul (David, 2026-11-01).'
		},
		{
			id: 'resoudre-11',
			ligne: '.résoudre x^2>4',
			attendu: 'S = ]-\\infty ; -2[ \\cup ]2 ; +\\infty['
		}
	],

	intégrer: [
		{
			id: 'integrer-01',
			ligne: '.intégrer x^2',
			attendu: '\\frac{1}{3}x^3 + C',
			note: 'Q3 : la constante est dans la réponse brute.'
		},
		{ id: 'integrer-02', ligne: '.intégrer x*e^x', attendu: '(x-1)e^x + C' },
		{ id: 'integrer-03', ligne: '.intégrer cos(x)', attendu: '\\sin(x) + C' },
		{ id: 'integrer-04', ligne: '.intégrer 1/x', attendu: '\\ln|x| + C' },
		{ id: 'integrer-05', ligne: '.intégrer e^(2x)', attendu: '\\frac{1}{2}e^{2x} + C' },
		{ id: 'integrer-06', ligne: '.intégrer 3x^2+2x', attendu: 'x^3+x^2 + C' },
		{ id: 'integrer-07', ligne: '.intégrer x^2 de 0 à 1', attendu: '\\frac{1}{3}' },
		{ id: 'integrer-08', ligne: '.intégrer e^x de 0 à 1', attendu: 'e-1' },
		{ id: 'integrer-09', ligne: '.intégrer 1/x de 1 à e', attendu: '1' },
		{ id: 'integrer-10', ligne: '.intégrer 2x+1 de -1 à 2', attendu: '6' }
	],

	évaluer: [
		{ id: 'evaluer-01', ligne: '.évaluer x^2+1 en x=3', attendu: '10' },
		{ id: 'evaluer-02', ligne: '.évaluer 2x-5 en x=-1', attendu: '-7' },
		{ id: 'evaluer-03', ligne: '.évaluer x^2-3x en x=1/2', attendu: '-\\frac{5}{4}' },
		{ id: 'evaluer-04', ligne: '.évaluer sqrt(x) en x=8', attendu: '2\\sqrt{2}' },
		{ id: 'evaluer-05', ligne: '.évaluer e^x en x=0', attendu: '1' },
		{ id: 'evaluer-06', ligne: '.évaluer ln(x) en x=e^2', attendu: '2' },
		{ id: 'evaluer-07', ligne: '.évaluer (x+1)/(x-1) en x=3', attendu: '2' },
		{
			id: 'evaluer-08',
			ligne: '.évaluer 3x^2 en x=0,5',
			attendu: '0,75',
			note: 'Un décimal tapé reste décimal (ADR 0032, S1).'
		}
	],

	taylor: [
		{
			id: 'taylor-01',
			ligne: '.taylor e^x 3',
			attendu: '1+x+\\frac{1}{2}x^2+\\frac{1}{6}x^3'
		},
		{
			id: 'taylor-02',
			ligne: '.taylor sin(x) 5',
			attendu: 'x-\\frac{1}{6}x^3+\\frac{1}{120}x^5'
		},
		{
			id: 'taylor-03',
			ligne: '.taylor cos(x) 4',
			attendu: '1-\\frac{1}{2}x^2+\\frac{1}{24}x^4'
		},
		{
			id: 'taylor-04',
			ligne: '.taylor ln(1+x) 3',
			attendu: 'x-\\frac{1}{2}x^2+\\frac{1}{3}x^3'
		},
		{ id: 'taylor-05', ligne: '.taylor 1/(1-x) 3', attendu: '1+x+x^2+x^3' },
		{
			id: 'taylor-06',
			ligne: '.taylor sqrt(1+x) 2',
			attendu: '1+\\frac{1}{2}x-\\frac{1}{8}x^2'
		}
	],

	domaine: [
		{ id: 'domaine-01', ligne: '.domaine 1/x', attendu: 'D = \\mathbb{R} \\setminus \\{0\\}' },
		{ id: 'domaine-02', ligne: '.domaine sqrt(x-2)', attendu: 'D = [2 ; +\\infty[' },
		{ id: 'domaine-03', ligne: '.domaine ln(x-2)', attendu: 'D = ]2 ; +\\infty[' },
		{
			id: 'domaine-04',
			ligne: '.domaine 1/(x^2-4)',
			attendu: 'D = \\mathbb{R} \\setminus \\{-2 ; 2\\}'
		},
		{ id: 'domaine-05', ligne: '.domaine sqrt(4-x^2)', attendu: 'D = [-2 ; 2]' },
		{ id: 'domaine-06', ligne: '.domaine ln(x^2+1)', attendu: 'D = \\mathbb{R}' },
		{ id: 'domaine-07', ligne: '.domaine x^2+3', attendu: 'D = \\mathbb{R}' },
		{ id: 'domaine-08', ligne: '.domaine 1/sqrt(x)', attendu: 'D = ]0 ; +\\infty[' },
		{ id: 'domaine-09', ligne: '.domaine ln(x)/x', attendu: 'D = ]0 ; +\\infty[' }
	],

	équivalent: [
		{ id: 'equivalent-01', ligne: '.équivalent (x+1)^2 et x^2+2x+1', attendu: '\\text{vrai}' },
		{ id: 'equivalent-02', ligne: '.équivalent (x+1)^2 et x^2+1', attendu: '\\text{faux}' },
		{ id: 'equivalent-03', ligne: '.équivalent 2(x+3) et 2x+6', attendu: '\\text{vrai}' },
		{
			id: 'equivalent-04',
			ligne: '.équivalent sin(x)^2+cos(x)^2 et 1',
			attendu: '\\text{vrai}'
		},
		{
			id: 'equivalent-05',
			ligne: '.équivalent sqrt(x^2) et x',
			attendu: '\\text{faux}',
			note: '√(x²) = |x|.'
		}
	],

	calcul: [
		{ id: 'calcul-01', ligne: '2+3*4', attendu: '14' },
		{ id: 'calcul-02', ligne: '1/2+1/3', attendu: '\\frac{5}{6}' },
		{ id: 'calcul-03', ligne: 'sqrt(8)', attendu: '2\\sqrt{2}' },
		{ id: 'calcul-04', ligne: '2^10', attendu: '1024' },
		{ id: 'calcul-05', ligne: '(-3)^2', attendu: '9' },
		{
			id: 'calcul-06',
			ligne: '0,1+0,2',
			attendu: '0,3',
			note: 'Virgule décimale française, décimal gardé (S1).'
		},
		{ id: 'calcul-07', ligne: '3/4*8/9', attendu: '\\frac{2}{3}' },
		{ id: 'calcul-08', ligne: 'e^0', attendu: '1' },
		{ id: 'calcul-09', ligne: 'ln(e^3)', attendu: '3' },
		{ id: 'calcul-10', ligne: '10/4', attendu: '\\frac{5}{2}' }
	],

	refus: [
		{
			id: 'refus-01',
			ligne: '.foo x',
			refus: true,
			attendu: "« .foo » n'est pas une commande. Peut-être : « .domaine » ou « .fonctions » ?"
		},
		{
			id: 'refus-02',
			ligne: '.dériver',
			refus: true,
			attendu: 'Rien à dériver : écris une expression après la commande.'
		},
		{
			id: 'refus-03',
			ligne: '.résoudre x^2+',
			refus: true,
			attendu: 'Expression incomplète : il manque quelque chose à la fin'
		},
		{
			id: 'refus-04',
			ligne: '.intégrer 1/x de -1 à 1',
			refus: true,
			attendu:
				"L'intégrale diverge ou n'est pas définie sur [-1 ; 1] : la primitive n'y est pas définie (x ≈ 0)"
		}
	]
};

/** Toutes les entrées, dans l'ordre du corpus */
export const REGISTRE_CASES: readonly RegistreCase[] = Object.values(REGISTRE_CORPUS).flat();
