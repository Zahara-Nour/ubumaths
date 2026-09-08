/**
 * TipTap Extension — insertion of internal resource links
 * =======================================================
 *
 * Typing `[[` opens a resource search; picking a result inserts the ubumark
 * syntax `[[kind:uuid|label]]`, which the parser already understands
 * (`src/lib/ubumark/types/ast.ts`, `InternalLinkNode`).
 *
 * That syntax existed long before this extension and had never been used once:
 * writing it by hand means knowing a resource's uuid, which nobody does. This is
 * the missing half.
 *
 * NO CUSTOM NODE, unlike the hashtag extension. The editor stores markdown, and
 * `[[kind:uuid|label]]` is valid markdown text — inserting plain text is enough,
 * and it survives the markdown round-trip for free.
 *
 * `char: '[['` is a two-character trigger. TipTap's Suggestion supports it:
 * `char` is typed `string`, it goes through `escapeForRegEx(char)`, and the query
 * is computed with `match[0].slice(char.length)`. That last line only makes sense
 * for multi-character triggers.
 *
 * @see $lib/resources/registry for how the inserted link is later resolved
 */

import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { createSuggestionRenderer, type SuggestionItem } from '$lib/extensions/suggestion-renderer';
import { RESOURCE_KINDS, isResourceKind, type ResourceKind } from '$lib/resources/kinds';

// ============================================================================
// TYPES
// ============================================================================

export interface ResourceLinkOptions {
	/** Maximum number of suggestions to show */
	maxSuggestions: number;
	/** Minimum query length before hitting the network */
	minQueryLength: number;
}

/** One row of `GET /api/search`, narrowed to what the popup needs. */
export interface SearchResult {
	kind: string;
	id: string;
	title: string;
	subtitle: string | null;
}

/** French kind labels, for the popup's secondary line. */
const KIND_LABELS: Record<ResourceKind, string> = {
	exercise: 'Exercice',
	question: 'Question',
	assessment: 'Évaluation',
	chapter: 'Chapitre',
	worksheet_exercise: 'Exercice de fiche',
	document: 'Document'
};

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Ask the search API for resources matching the query.
 *
 * Failure-tolerant: a suggestion popup that throws would break typing. An empty
 * list simply shows "no result", which is also what an offline editor sees.
 */
async function searchResources(query: string, limit: number): Promise<SuggestionItem[]> {
	try {
		const params = new URLSearchParams({
			q: query,
			kinds: RESOURCE_KINDS.join(','),
			limit: String(limit)
		});
		const response = await fetch(`/api/search?${params.toString()}`);
		if (!response.ok) return [];

		const payload: unknown = await response.json();
		const results = (payload as { results?: SearchResult[] }).results ?? [];

		return results.filter((row) => isResourceKind(row.kind)).map(toSuggestionItem);
	} catch {
		return [];
	}
}

/**
 * `id` carries the whole markup to insert, so the command stays trivial and the
 * popup keeps a readable label.
 */
export function toSuggestionItem(row: SearchResult): SuggestionItem {
	const kind = row.kind as ResourceKind;
	// Les `]` casseraient la syntaxe : le libellé du parser est `[^\]]+`, donc un
	// crochet fermant tronquerait le lien. Les retirer laisse des espaces doubles,
	// qu'on ré-écrase — sinon le libellé affiché porte la trace de la réparation.
	const label = sanitiseLabel(insertedLabel(row, kind));

	return {
		id: `[[${kind}:${row.id}|${label}]]`,
		// Dans la liste, le titre seul suffit : la fiche est déjà sur la 2ᵉ ligne.
		label: sanitiseLabel(row.title),
		description: row.subtitle ? `${KIND_LABELS[kind]} · ${row.subtitle}` : KIND_LABELS[kind]
	};
}

function sanitiseLabel(raw: string): string {
	return raw.replaceAll(']', '').replace(/\s+/g, ' ').trim() || 'Sans titre';
}

/**
 * Libellé écrit DANS le texte.
 *
 * Un exercice de fiche emporte le nom de sa fiche : c'est la seule information
 * dont l'élève a besoin pour savoir quoi ouvrir, et elle doit rester lisible même
 * quand le lien ne mène nulle part (l'élève n'atteint une fiche que si elle lui a
 * été distribuée). Le sous-titre de la vue est déjà « Fiche : … ».
 */
function insertedLabel(row: SearchResult, kind: ResourceKind): string {
	if (kind === 'worksheet_exercise' && row.subtitle) {
		return `${row.title} — ${row.subtitle}`;
	}
	return row.title;
}

// ============================================================================
// EXTENSION
// ============================================================================

export const ResourceLink = Extension.create<ResourceLinkOptions>({
	name: 'resourceLink',

	addOptions() {
		return {
			maxSuggestions: 8,
			// Below two characters the API answers 400 anyway; not calling it at
			// all spares a round-trip on every opening bracket pair.
			minQueryLength: 2
		};
	},

	addProseMirrorPlugins() {
		const { maxSuggestions, minQueryLength } = this.options;

		return [
			Suggestion<SuggestionItem>({
				editor: this.editor,
				char: '[[',
				pluginKey: new PluginKey('resourceLinkSuggestion'),
				// A resource title holds spaces, but allowing them here would keep
				// the popup open across a whole paragraph. Searching on one word is
				// enough to find a title, and it matches how hashtags behave.
				allowSpaces: false,
				// `null` disables the prefix check entirely (the guard is
				// `allowedPrefixes !== null`): `[[` must work mid-sentence, after a
				// parenthesis, after a math block — anywhere.
				allowedPrefixes: null,
				startOfLine: false,

				items: async ({ query }) => {
					if (query.length < minQueryLength) return [];
					return searchResources(query, maxSuggestions);
				},

				command: ({ editor, range, props }) => {
					// `props.id` is already the full `[[kind:uuid|label]]` markup.
					editor.chain().focus().deleteRange(range).insertContent(props.id).run();
				},

				render: () =>
					createSuggestionRenderer({
						type: 'resource',
						prefix: '',
						noResultsText: 'Aucune ressource trouvée'
					})
			})
		];
	}
});
