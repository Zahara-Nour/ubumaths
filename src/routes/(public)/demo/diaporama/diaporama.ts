/**
 * Vitrine : le contenu du diaporama de `/demo/diaporama`
 * ======================================================
 *
 * Textes ubumark, code Python, figure et page de tableau blanc des 13 diapositives
 * (plan validé par David le 2026-10-25, chantier demo-debug, PR 6i). Les questions
 * du minuteur sont celles de `/demo/questions`.
 */
import { pythonPageOf } from '$lib/atelier/to-python';
import type { Page } from '$lib/whiteboard/types/document';
import { DEMO_FIGURES, type DemoFigure } from '../geometrie/figures';

// Constantes
// Durée de chaque ligne du développement (ms)
export const EXPANSION_STEP_MS = 2000;
// Durée de chaque question du minuteur (s)
export const TIMER_QUESTION_SECONDS = 10;

/** $(x+1)^2$ développé ligne par ligne, chaque ligne marquée « -> » (fragment) */
export const EXPANSION_MARKDOWN = `## $(x+1)^2$, pas à pas

$(x+1)^2 = (x+1)(x+1)$ ->

$\\phantom{(x+1)^2} = x^2 + x + x + 1$ ->

$\\phantom{(x+1)^2} = x^2 + 2x + 1$ ->`;

export const FORMULAS_MARKDOWN = `## Des formules écrites en ubumark

Le discriminant de $ax^2 + bx + c$ est $\\Delta = b^2 - 4ac$ ; s'il est positif :

$$x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$$

| $x$ | $0$ | $\\frac{\\pi}{6}$ | $\\frac{\\pi}{4}$ | $\\frac{\\pi}{3}$ |
| --- | --- | --- | --- | --- |
| $\\cos x$ | $1$ | $\\frac{\\sqrt{3}}{2}$ | $\\frac{\\sqrt{2}}{2}$ | $\\frac{1}{2}$ |`;

export const PYTHON_CODE = `def f(x):
    return x**2 - 2

# Balayage : encadrer la solution positive de f(x) = 0
a = 1
while f(a + 0.1) < 0:
    a = a + 0.1
print(round(a, 1), "< racine de 2 <", round(a + 0.1, 1))`;

export const PYTHON_MARKDOWN = `\`\`\`python
${PYTHON_CODE}
\`\`\``;

export const TRIG_MARKDOWN = `## Résoudre $\\cos x = \\frac{1}{2}$

\`\`\`trig
preset: custom
equation: cos(x) = 1/2
projections: true
color: blue
\`\`\``;

/** L’équation de la diapositive à annoter */
export const ANNOTATION_MARKDOWN = '$3x - 5 = 7 \\iff 3x = 12 \\iff x = 4$';

export const WHITEBOARD_PAGE: Page = {
	id: 'demo-diaporama-tableau',
	width: 1024,
	height: 600,
	background: {
		type: 'plain',
		style: 'grid',
		color: '#ffffff',
		gridSpacing: 20,
		gridOpacity: 0.2
	},
	elements: [
		{
			id: 'cote-1',
			type: 'shape',
			shapeType: 'line',
			start: { x: 200, y: 450 },
			end: { x: 600, y: 450 },
			color: '#2563eb',
			strokeWidth: 3,
			opacity: 1,
			roughness: 1
		},
		{
			id: 'cote-2',
			type: 'shape',
			shapeType: 'line',
			start: { x: 600, y: 450 },
			end: { x: 600, y: 150 },
			color: '#2563eb',
			strokeWidth: 3,
			opacity: 1,
			roughness: 1
		},
		{
			id: 'cote-3',
			type: 'shape',
			shapeType: 'line',
			start: { x: 600, y: 150 },
			end: { x: 200, y: 450 },
			color: '#2563eb',
			strokeWidth: 3,
			opacity: 1,
			roughness: 1
		},
		{
			id: 'angle-droit',
			type: 'shape',
			shapeType: 'rectangle',
			start: { x: 570, y: 420 },
			end: { x: 600, y: 450 },
			color: '#dc2626',
			strokeWidth: 2,
			opacity: 1,
			roughness: 1
		},
		{
			id: 'cercle',
			type: 'shape',
			shapeType: 'circle',
			start: { x: 720, y: 180 },
			end: { x: 880, y: 340 },
			color: '#16a34a',
			strokeWidth: 3,
			opacity: 1,
			fillMode: 'hachure',
			fill: '#bbf7d0',
			roughness: 1
		}
	]
};

// Functions
/** L'adresse de `/python` qui ouvre le code de la diapositive Python */
export function pythonDemoUrl(): string {
	const page = pythonPageOf(PYTHON_CODE);
	// Le code est court : l'adresse ne peut pas être refusée
	return page.ok ? page.url : '/python';
}

/** La droite d'Euler de `/demo/geometrie`, la figure manipulable du diaporama */
export function eulerFigure(): DemoFigure {
	const figure = DEMO_FIGURES.find((f) => f.title === "Droite d'Euler");
	if (!figure) throw new Error("Figure « Droite d'Euler » absente de /demo/geometrie");
	return figure;
}
