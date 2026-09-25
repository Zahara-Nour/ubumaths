/**
 * Colonnes des listes (marqueur ubumark `:colonnes N`)
 *
 * Le schéma TipTap efface en silence tout attribut qu'il ne déclare pas : sans
 * cette déclaration, l'import posait `columns` sur la liste, mais la première
 * édition dans l'éditeur riche le perdait, et l'export n'écrivait plus le
 * marqueur. Déclaré en attribut global pour ne pas remplacer les listes de
 * StarterKit.
 *
 * L'attribut est aussi RENDU (grille) et RÉGLABLE (`setListColumns`, menu
 * « Colonnes » de la barre d'outils) : sinon, un marqueur tapé au-dessus d'une
 * liste devenait au rechargement un réglage invisible, impossible à retirer.
 */
import { Extension, type Editor } from '@tiptap/core';

const LIST_TYPES = ['orderedList', 'bulletList'];

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		listColumns: {
			/** Colonnes de la liste la plus proche du curseur (1 = une seule colonne). */
			setListColumns: (columns: number) => ReturnType;
		};
	}
}

/**
 * Colonnes de la liste la plus proche du curseur : 1 si elle n'en a pas, null si
 * le curseur n'est pas dans une liste.
 */
export function getListColumns(editor: Editor): number | null {
	const { $from } = editor.state.selection;
	for (let depth = $from.depth; depth > 0; depth--) {
		const node = $from.node(depth);
		if (LIST_TYPES.includes(node.type.name)) return Number(node.attrs.columns) || 1;
	}
	return null;
}

export const ListColumns = Extension.create({
	name: 'listColumns',

	addGlobalAttributes() {
		return [
			{
				types: LIST_TYPES,
				attributes: {
					columns: {
						default: null,
						parseHTML: (element) => Number(element.getAttribute('data-columns')) || null,
						renderHTML: (attributes) =>
							attributes.columns
								? {
										'data-columns': attributes.columns,
										style: `display: grid; grid-template-columns: repeat(${attributes.columns}, minmax(0, 1fr)); column-gap: 1.5rem;`
									}
								: {}
					}
				}
			}
		];
	},

	addCommands() {
		return {
			setListColumns:
				(columns: number) =>
				({ state, tr, dispatch }) => {
					const { $from } = state.selection;
					for (let depth = $from.depth; depth > 0; depth--) {
						const node = $from.node(depth);
						if (!LIST_TYPES.includes(node.type.name)) continue;
						if (dispatch) {
							tr.setNodeMarkup($from.before(depth), undefined, {
								...node.attrs,
								columns: columns > 1 ? columns : null
							});
						}
						return true;
					}
					return false;
				}
		};
	}
});
