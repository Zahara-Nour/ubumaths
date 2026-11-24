/**
 * Brancher la lecture des formules pour les lecteurs d'écran (E32)
 *
 * MathLive pose sur chaque formule affichée (`<math-span>`, `<math-div>`) un
 * `aria-label` en anglais, balises de synthèse vocale comprises (« the fraction
 * <break time="150ms"/> pie over… »). À chaque rendu d'une formule, on le
 * remplace : en français par défaut, en anglais sans balises dans un contenu
 * anglais (ancêtre `lang="en"`).
 *
 * Un seul écouteur sur le document : les formules sont écrites à une
 * soixantaine d'endroits, aucun n'a à s'en occuper.
 *
 * @module utils/formula-speech/install
 */

import { speakLatexInFrench } from './french.ts';
import { stripSpeechMarkup } from './speech-markup.ts';

// Constantes
const FORMULA_ELEMENTS = new Set(['math-span', 'math-div']);

// Variables
let installed = false;

// Fonctions
function isInEnglishContent(element: Element): boolean {
	const lang = element.closest('[lang]')?.getAttribute('lang') ?? '';
	return lang.toLowerCase().startsWith('en');
}

/** Lecture anglaise : celle de MathLive (déjà chargé, puisqu'il vient de rendre la formule) */
async function speakLatexInEnglish(latex: string): Promise<string> {
	const { convertLatexToSpeakableText } = await import('mathlive');
	return stripSpeechMarkup(convertLatexToSpeakableText(latex));
}

function labelFormula(element: Element, latex: string): void {
	// Morceau d'une formule découpée : son conteneur porte la lecture entière
	if (element.getAttribute('aria-hidden') === 'true') return;
	if (!isInEnglishContent(element)) {
		element.setAttribute('aria-label', speakLatexInFrench(latex));
		return;
	}
	// En attendant MathLive, pas de balises lues telles quelles
	element.setAttribute('aria-label', stripSpeechMarkup(element.getAttribute('aria-label') ?? ''));
	speakLatexInEnglish(latex)
		.then((spoken) => {
			// Entre-temps la formule a pu changer : son propre rendu repassera ici
			if ((element.textContent ?? '').trim() === latex.trim()) {
				element.setAttribute('aria-label', spoken);
			}
		})
		.catch((e) => console.debug('[Lecture des formules] lecture anglaise impossible :', e));
}

function onFormulaRendered(event: Event): void {
	const element = event.target;
	if (!(element instanceof Element) || !FORMULA_ELEMENTS.has(element.localName)) return;
	const content: unknown = event instanceof CustomEvent ? event.detail?.content : undefined;
	labelFormula(element, typeof content === 'string' ? content : (element.textContent ?? ''));
}

/**
 * À appeler une fois, dans le navigateur. Les formules déjà rendues sont
 * reprises ; les suivantes le sont à leur événement `render`.
 */
export function installFormulaSpeech(): void {
	if (installed || typeof document === 'undefined') return;
	installed = true;
	document.addEventListener('render', onFormulaRendered);
	for (const element of document.querySelectorAll('math-span[aria-label], math-div[aria-label]')) {
		labelFormula(element, element.textContent ?? '');
	}
}
