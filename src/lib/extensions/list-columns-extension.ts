/**
 * Attribut `columns` des listes (marqueur ubumark `:colonnes N`)
 *
 * Le schéma TipTap efface en silence tout attribut qu'il ne déclare pas : sans
 * cette déclaration, l'import posait `columns` sur la liste, mais la première
 * édition dans l'éditeur riche le perdait, et l'export n'écrivait plus le
 * marqueur. Déclaré en attribut global pour ne pas remplacer les listes de
 * StarterKit.
 */
import { Extension } from '@tiptap/core';

export const ListColumns = Extension.create({
	name: 'listColumns',

	addGlobalAttributes() {
		return [
			{
				types: ['orderedList', 'bulletList'],
				attributes: {
					columns: {
						default: null,
						parseHTML: (element) => Number(element.getAttribute('data-columns')) || null,
						renderHTML: (attributes) =>
							attributes.columns ? { 'data-columns': attributes.columns } : {}
					}
				}
			}
		];
	}
});
