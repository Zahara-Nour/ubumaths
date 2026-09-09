/**
 * Aller-retour markdown des syntaxes SANS nœud TipTap
 * ===================================================
 *
 * `[[type:uuid|libellé]]` et `{{hint:id}}` sont volontairement du TEXTE : pas de
 * nœud personnalisé, ce qui leur permet de traverser l'export markdown sans
 * traitement particulier. Mais l'IMPORT, lui, passe par `parseMarkdown`, qui les
 * reconnaît comme des nœuds ubumark — et la conversion vers TipTap les jetait
 * dans son `default: return []`.
 *
 * Conséquence observée : « quand je bascule sur la vue markdown et que je
 * reviens, le lien a disparu ». Silencieusement, sans erreur.
 *
 * Ces tests font l'aller-retour COMPLET, seule façon de l'attraper : chaque
 * moitié prise isolément avait l'air correcte.
 */

import { describe, it, expect } from 'vitest';
import { tipTapToMarkdown } from '../markdown-export';
import { markdownToTipTap } from '../markdown-import';
import { NUMBER_LINE_TEMPLATE } from '$lib/extensions/number-line-extension';

const UUID = '3f2a1b4c-5d6e-4f7a-8b9c-0d1e2f3a4b5c';

/** Un paragraphe TipTap contenant ce texte. */
function paragraphe(texte: string) {
	return {
		type: 'doc',
		content: [{ type: 'paragraph', content: [{ type: 'text', text: texte }] }]
	};
}

/** Le texte d'un document TipTap, tous nœuds confondus. */
function texteDe(json: ReturnType<typeof markdownToTipTap>): string {
	const morceaux: string[] = [];
	const parcourir = (n: { text?: string; content?: unknown[] }) => {
		if (typeof n.text === 'string') morceaux.push(n.text);
		for (const enfant of (n.content ?? []) as { text?: string; content?: unknown[] }[]) {
			parcourir(enfant);
		}
	};
	parcourir(json as { content?: unknown[] });
	return morceaux.join('');
}

describe('références de ressource', () => {
	it('survit à l’aller-retour markdown', () => {
		const source = `Faire [[exercise:${UUID}|Fractions]] pour demain.`;

		const md = tipTapToMarkdown(paragraphe(source));
		const json = markdownToTipTap(md);

		expect(texteDe(json)).toBe(source);
	});

	it('survit à DEUX allers-retours — la stabilité, pas seulement le premier passage', () => {
		const source = `Voir [[worksheet:${UUID}|Dérivées]].`;

		let json = markdownToTipTap(tipTapToMarkdown(paragraphe(source)));
		json = markdownToTipTap(tipTapToMarkdown(json));

		expect(texteDe(json)).toBe(source);
	});

	it('préserve un exercice DE FICHE, dont l’identifiant est celui de la jonction', () => {
		const source = `[[worksheet_exercise:${UUID}|Exercice 3 — Fiche : Dérivées]]`;

		const json = markdownToTipTap(tipTapToMarkdown(paragraphe(source)));

		expect(texteDe(json)).toBe(source);
	});

	it('préserve plusieurs références dans le même paragraphe', () => {
		const source = `[[exercise:${UUID}|Un]] et [[exercise:${UUID}|Deux]]`;

		const json = markdownToTipTap(tipTapToMarkdown(paragraphe(source)));

		expect(texteDe(json)).toBe(source);
	});
});

describe('références d’indice', () => {
	it('survit à l’aller-retour markdown', () => {
		// Même cause, même correctif : `{{hint:id}}` tombait aussi dans le `default`.
		const source = 'Un coup de pouce : {{hint:derivee}} si besoin.';

		const json = markdownToTipTap(tipTapToMarkdown(paragraphe(source)));

		expect(texteDe(json)).toBe(source);
	});
});

// ============================================================================
// AUDIT DE L'EXPORT — nœuds insérables que le markdown DÉTRUISAIT
// ============================================================================

/**
 * Comparaison systématique entre les extensions TipTap enregistrées et les cas
 * traités par l'export : deux nœuds insérables depuis la barre d'outils
 * tombaient dans son `default: return null`, donc s'exportaient en chaîne vide.
 * Une bascule vers la vue markdown et retour les effaçait.
 */
describe('nœuds sans conversion, trouvés à l’audit de l’export', () => {
	const doc = (content: unknown[]) => ({ type: 'doc', content }) as never;

	it('une droite graduée survit à l’aller-retour', () => {
		// Le nœud ubumark est STRUCTURÉ (config, points, segments) alors que
		// l'éditeur stocke du texte : le parser conserve désormais la source.
		const source = doc([{ type: 'numberLine', attrs: { content: NUMBER_LINE_TEMPLATE } }]);

		const retour = markdownToTipTap(tipTapToMarkdown(source));

		expect(retour.content?.[0]).toEqual({
			type: 'numberLine',
			attrs: { content: NUMBER_LINE_TEMPLATE }
		});
	});

	it('une droite graduée passe par la syntaxe ```line', () => {
		const md = tipTapToMarkdown(
			doc([{ type: 'numberLine', attrs: { content: NUMBER_LINE_TEMPLATE } }])
		);

		expect(md.startsWith('```line\n')).toBe(true);
		expect(md.trimEnd().endsWith('```')).toBe(true);
	});

	it('une liste de tâches survit, cases cochées comprises', () => {
		const source = doc([
			{
				type: 'taskList',
				content: [
					{
						type: 'taskItem',
						attrs: { checked: false },
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'À faire' }] }]
					},
					{
						type: 'taskItem',
						attrs: { checked: true },
						content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Fait' }] }]
					}
				]
			}
		]);

		const md = tipTapToMarkdown(source);
		expect(md).toBe('- [ ] À faire\n- [x] Fait');

		const retour = markdownToTipTap(md);
		const liste = retour.content?.[0];
		expect(liste?.type).toBe('taskList');
		expect(liste?.content?.map((i) => i.attrs?.checked)).toEqual([false, true]);
		// Le préfixe doit être RETIRÉ du texte, sinon la case affiche « [x] Fait ».
		expect(liste?.content?.[1]?.content?.[0]?.content?.[0]?.text).toBe('Fait');
	});

	it('une liste à puces ordinaire reste une liste à puces', () => {
		// La reconnaissance des cases ne doit pas happer les listes normales.
		const retour = markdownToTipTap('- Un point\n- Un autre');

		expect(retour.content?.[0]?.type).toBe('bulletList');
	});

	it('une liste mixte n’est PAS convertie en liste de tâches', () => {
		// Un seul élément coché ne fait pas une liste de tâches : tout ou rien.
		const retour = markdownToTipTap('- [ ] Une tâche\n- Un point ordinaire');

		expect(retour.content?.[0]?.type).toBe('bulletList');
	});
});
