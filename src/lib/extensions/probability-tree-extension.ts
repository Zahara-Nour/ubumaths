/**
 * Extension TipTap — arbre de probabilité
 * ======================================
 *
 * Nœud atomique pour les blocs ```probtree, avec aperçu rendu dans l'éditeur.
 *
 * Le contenu reste du TEXTE, dans la syntaxe que le parser ubumark comprend
 * déjà : c'est ce qui permet à l'arbre de traverser l'aller-retour markdown
 * sans conversion structurelle. Le nœud ubumark, lui, est structuré ; le
 * reconstruire depuis cette structure demanderait un sérialiseur qui n'existe
 * pas.
 *
 * Jusqu'ici, un arbre n'était RENDU que dans l'affichage markdown : impossible
 * d'en insérer un depuis l'éditeur riche.
 *
 * @module extensions/probability-tree-extension
 */

import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { SvelteNodeViewRenderer } from 'svelte-tiptap';
import ProbabilityTreeNodeView from './ProbabilityTreeNodeView.svelte';

/** Gabarit d'un arbre neuf : deux issues équiprobables, la forme la plus courante. */
export const PROBABILITY_TREE_TEMPLATE = `root: Urne

Rouge:1/2
Bleue:1/2`;

/** ```probtree suivi d'un espace ou d'une entrée. */
const PROBABILITY_TREE_INPUT_REGEX = /```probtree[\s\n]$/;

export const ProbabilityTreeExtension = Node.create({
	name: 'probabilityTree',

	group: 'block',

	atom: true,

	draggable: true,

	addAttributes() {
		return {
			content: {
				default: PROBABILITY_TREE_TEMPLATE,
				parseHTML: (element: HTMLElement) =>
					element.getAttribute('data-content') || PROBABILITY_TREE_TEMPLATE,
				renderHTML: (attributes) => ({ 'data-content': attributes.content })
			}
		};
	},

	parseHTML() {
		return [
			{ tag: 'div[data-type="probability-tree"]' },
			{
				// Un bloc de code ```probtree collé depuis du markdown.
				tag: 'pre',
				getAttrs: (element) => {
					const code = (element as HTMLElement).querySelector('code');
					if (code?.classList.contains('language-probtree')) {
						return { content: code.textContent || PROBABILITY_TREE_TEMPLATE };
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
				'data-type': 'probability-tree',
				class: 'probability-tree-wrapper'
			}),
			// Repli lisible si le nœud est rendu hors de l'éditeur.
			['pre', {}, ['code', { class: 'language-probtree' }, HTMLAttributes['data-content']]]
		];
	},

	addNodeView() {
		return SvelteNodeViewRenderer(ProbabilityTreeNodeView);
	},

	addInputRules() {
		return [
			new InputRule({
				find: PROBABILITY_TREE_INPUT_REGEX,
				handler: ({ state, range, chain }) => {
					chain()
						.deleteRange(range)
						.insertContentAt(range.from, {
							type: this.name,
							attrs: { content: PROBABILITY_TREE_TEMPLATE }
						})
						.run();
					void state;
				}
			})
		];
	},

	addCommands() {
		return {
			insertProbabilityTree:
				(content?: string) =>
				({ commands }) =>
					commands.insertContent({
						type: this.name,
						attrs: { content: content || PROBABILITY_TREE_TEMPLATE }
					})
		};
	}
});

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		probabilityTree: {
			insertProbabilityTree: (content?: string) => ReturnType;
		};
	}
}

export default ProbabilityTreeExtension;
