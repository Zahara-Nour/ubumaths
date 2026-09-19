/**
 * `.simplifier` : les étapes se composent-elles, et le bouton fait-il quelque
 * chose ?
 *
 * ⚠️ Deux maillons qu'aucun test serveur ne prouve :
 *
 * 1. `PedagogicalSimplifyRenderer` produit du `\begin{aligned}` et du
 *    `\textcolor{blue}{…}` — c'est MathLive qui les compose, dans un vrai
 *    navigateur. Et la longueur du markup ne prouve rien : mesuré,
 *    `convertLatexToMarkup('')` rend déjà 79 caractères. Le seul signal
 *    exploitable est la classe `ML__error`.
 * 2. Que les étapes se calculent ne dit RIEN sur le fait que « Comment ? »
 *    les déplie (#339 : 14 tests verts sur une action morte).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, tick } from 'svelte';
import { convertLatexToMarkup } from 'mathlive';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { simplifySteps } from '../simplify-steps';
import CalculView from '$lib/components/atelier/CalculView.svelte';

/** Le marqueur que MathLive pose sur ce qu'il n'a pas su composer. */
const ERROR_MARKER = 'ML__error';

const TITRE = 'On simplifie le radical';

let monte: Record<string, unknown> | null = null;
let cible: HTMLDivElement | null = null;

afterEach(() => {
	if (monte !== null) unmount(monte);
	cible?.remove();
	monte = null;
	cible = null;
});

function markupOf(latex: string): string {
	return convertLatexToMarkup(latex, { defaultMode: 'inline-math' });
}

function afficher(saisie: string): HTMLElement {
	const desk = new CalcDesk(new Atelier());
	desk.submit(saisie);

	cible = document.createElement('div');
	document.body.appendChild(cible);
	monte = mount(CalculView, { target: cible, props: { desk } });
	return cible;
}

/** Cliquer comme un navigateur clique — `element.click()` court-circuite. */
function cliquer(element: HTMLElement): void {
	for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
		element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
	}
}

function bouton(racine: HTMLElement, libelle: string): HTMLElement {
	const trouve = [...racine.querySelectorAll('button')].find((b) =>
		(b.textContent ?? '').includes(libelle)
	);
	expect(trouve, `bouton « ${libelle} » introuvable`).toBeDefined();
	return trouve as HTMLElement;
}

describe('les étapes se composent', () => {
	it('le marqueur d’erreur existe bien — sinon ce fichier ne garde rien', () => {
		expect(markupOf('\\pasunecommande{3}')).toContain(ERROR_MARKER);
	});

	it('le décor du renderer passe MathLive', () => {
		const { steps } = simplifySteps('sqrt(12)+sqrt(3)')!;

		const decorated = steps.filter((s) => {
			const latex = s.expressionLatex ?? '';
			return latex.includes('\\begin{aligned}') && latex.includes('\\textcolor');
		});
		expect(decorated.length).toBeGreaterThan(0);

		for (const step of steps) {
			if (step.expressionLatex === undefined) continue;
			expect(markupOf(step.expressionLatex)).not.toContain(ERROR_MARKER);
		}
	});

	it('la réponse de la ligne aussi', () => {
		expect(markupOf(simplifySteps('2/6+1/4')!.answer)).not.toContain(ERROR_MARKER);
	});
});

describe('le dépliage de `.simplifier`', () => {
	it('les étapes sont absentes tant qu’on n’a pas cliqué', () => {
		const racine = afficher('.simplifier sqrt(8)');

		expect(racine.textContent).toContain('Comment ?');
		expect(racine.textContent).not.toContain(TITRE);
	});

	it('cliquer « Comment ? » fait apparaître les étapes', async () => {
		const racine = afficher('.simplifier sqrt(8)');

		cliquer(bouton(racine, 'Comment ?'));
		await tick();

		expect(racine.textContent).toContain(TITRE);
		expect(racine.textContent).toContain('carrés parfaits');
	});

	it('recliquer les replie', async () => {
		const racine = afficher('.simplifier sqrt(8)');

		cliquer(bouton(racine, 'Comment ?'));
		await tick();
		cliquer(bouton(racine, 'Masquer le détail'));
		await tick();

		expect(racine.textContent).not.toContain(TITRE);
	});

	it('une expression déjà simplifiée n’offre pas le bouton', () => {
		const racine = afficher('.simplifier 2x+3');

		expect(racine.textContent).not.toContain('Comment ?');
	});
});
