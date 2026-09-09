/**
 * Extension TipTap — cercle trigonométrique
 * ======================================
 *
 * Nœud atomique pour les blocs ```trig, avec aperçu rendu dans l'éditeur.
 *
 * Le contenu reste du TEXTE, dans la syntaxe que le parser ubumark comprend
 * déjà : c'est ce qui permet à l'arbre de traverser l'aller-retour markdown
 * sans conversion structurelle. Le nœud ubumark, lui, est structuré ; le
 * reconstruire depuis cette structure demanderait un sérialiseur qui n'existe
 * pas.
 *
 * Jusqu'ici, un cercle n'était RENDU que dans l'affichage markdown : impossible
 * d'en insérer un depuis l'éditeur riche.
 *
 * @module extensions/trig-circle-extension
 */

import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { SvelteNodeViewRenderer } from 'svelte-tiptap';
import TrigCircleNodeView from './TrigCircleNodeView.svelte';

/** Gabarit d'un cercle neuf : les quarts, le repère le plus courant. */
export const TRIG_CIRCLE_TEMPLATE = `preset: quarters`;

/** ```trig suivi d'un espace ou d'une entrée. */
const TRIG_CIRCLE_INPUT_REGEX = /```trig[\s\n]$/;

export const TrigCircleExtension = Node.create({
	name: 'trigCircle',

	group: 'block',

	atom: true,

	draggable: true,

	addAttributes() {
		return {
			content: {
				default: TRIG_CIRCLE_TEMPLATE,
				parseHTML: (element: HTMLElement) =>
					element.getAttribute('data-content') || TRIG_CIRCLE_TEMPLATE,
				renderHTML: (attributes) => ({ 'data-content': attributes.content })
			}
		};
	},

	parseHTML() {
		return [
			{ tag: 'div[data-type="trig-circle"]' },
			{
				// Un bloc de code ```trig collé depuis du markdown.
				tag: 'pre',
				getAttrs: (element) => {
					const code = (element as HTMLElement).querySelector('code');
					if (code?.classList.contains('language-trig')) {
						return { content: code.textContent || TRIG_CIRCLE_TEMPLATE };
					}
					return false;
				}
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, {
				'data-type': 'trig-circle',
				class: 'trig-circle-wrapper'
			}),
			// Repli lisible si le nœud est rendu hors de l'éditeur.
			['pre', {}, ['code', { class: 'language-trig' }, HTMLAttributes['data-content']]]
		];
	},

	addNodeView() {
		return SvelteNodeViewRenderer(TrigCircleNodeView);
	},

	addInputRules() {
		return [
			new InputRule({
				find: TRIG_CIRCLE_INPUT_REGEX,
				handler: ({ state, range, chain }) => {
					chain()
						.deleteRange(range)
						.insertContentAt(range.from, {
							type: this.name,
							attrs: { content: TRIG_CIRCLE_TEMPLATE }
						})
						.run();
					void state;
				}
			})
		];
	},

	addCommands() {
		return {
			insertTrigCircle:
				(content?: string) =>
				({ commands }) =>
					commands.insertContent({
						type: this.name,
						attrs: { content: content || TRIG_CIRCLE_TEMPLATE }
					})
		};
	}
});

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		trigCircle: {
			insertTrigCircle: (content?: string) => ReturnType;
		};
	}
}

export default TrigCircleExtension;
