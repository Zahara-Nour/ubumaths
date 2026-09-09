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
