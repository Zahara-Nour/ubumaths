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
import { isResourceKind, type ResourceKind } from '$lib/resources/kinds';
import { parseResourceQuery, prefixHint } from '$lib/resources/prefixes';

// ============================================================================
// TYPES
// ============================================================================

export interface ResourceLinkOptions {
	/** Maximum number of suggestions to show */
	maxSuggestions: number;
	/** Minimum query length before hitting the network */
	minQueryLength: number;
	/** Pause de frappe avant d'interroger l'API, en millisecondes */
	debounceMs: number;
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
	worksheet: 'Fiche d’exercices',
	worksheet_exercise: 'Exercice de fiche',
	question: 'Question',
	assessment: 'Série de questions',
	chapter: 'Chapitre',
	python_exercise: 'Exercice Python',
	python_notebook: 'Notebook Python',
	construction: 'Construction',
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
/**
 * Résultat d'une recherche, échec compris.
 *
 * Renvoyer un tableau vide dans les deux cas revenait à afficher « aucune
 * ressource trouvée » alors que la requête n'avait jamais abouti — un message
 * faux, et impossible à diagnostiquer depuis l'éditeur.
 */
interface SearchOutcome {
	items: SuggestionItem[];
	failed: boolean;
}

async function searchResources(
	query: string,
	limit: number,
	grades: string[] | null,
	kind: ResourceKind | null
): Promise<SearchOutcome> {
	try {
		// PAS de `kinds` : demander TOUS les types revient à n'en filtrer aucun, et
		// l'omettre supprime un couplage qui a déjà mordu. La fonction SQL borne la
		// taille du tableau `p_kinds` ; ce plafond a valu un temps exactement la
		// taille du vocabulaire, si bien qu'ajouter un type rendait la recherche
		// vide — sans erreur, sans trace. Ne rien envoyer rend aussi le déploiement
		// insensible à l'ordre : le sélecteur continue de marcher tant que la
		// migration qui ajoute un type n'est pas encore appliquée.
		const params = new URLSearchParams({
			q: query,
			limit: String(limit)
		});
		// Le niveau de la classe dont on écrit la séance. Absent partout ailleurs
		// (éditeur d'exercices, chat…), où aucun contexte ne le justifierait.
		if (grades && grades.length > 0) params.set('grades', grades.join(','));
		// Un seul type quand le professeur l'a précisé par un préfixe. Sans
		// préfixe, aucun `kinds` : demander tous les types revient à n'en filtrer
		// aucun, et l'omettre garde le déploiement insensible à l'ordre.
		if (kind) params.set('kinds', kind);
		const response = await fetch(`/api/search?${params.toString()}`);
		if (!response.ok) return { items: [], failed: true };

		const payload: unknown = await response.json();
		const results = (payload as { results?: SearchResult[] }).results ?? [];

		return {
			items: results.filter((row) => isResourceKind(row.kind)).map(toSuggestionItem),
			failed: false
		};
	} catch {
		return { items: [], failed: true };
	}
}

/**
 * Anti-rebond : UNE requête par pause de frappe, pas une par touche.
 *
 * `/api/search` est limité à 30 appels par minute et par compte — une garde
 * légitime, la requête étant structurellement chère (UNION ALL sur six branches,
 * `unaccent` par ligne). Sans rebond, taper « integral » en consommait sept :
 * quelques recherches suffisaient à déclencher un 429, rendu en « aucune
 * ressource trouvée ». La popup mentait, et le prof n'avait aucun moyen de le
 * savoir.
 *
 * La dernière frappe gagne : une recherche supplantée voit son minuteur annulé
 * et ne se résout jamais, donc TipTap ne met pas à jour la popup avec un
 * résultat périmé.
 */
export function createDebouncedSearch(delayMs: number) {
	let timer: ReturnType<typeof setTimeout> | undefined;

	return (
		query: string,
		limit: number,
		grades: string[] | null,
		kind: ResourceKind | null
	): Promise<SearchOutcome> =>
		new Promise<SearchOutcome>((resolve) => {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => {
				searchResources(query, limit, grades, kind).then(resolve);
			}, delayMs);
		});
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

export interface ResourceLinkStorage {
	/**
	 * Niveaux auxquels restreindre la recherche, ou `null` pour ne pas filtrer.
	 *
	 * DANS LE STOCKAGE, PAS DANS LES OPTIONS. `createEditorExtensions()` met en
	 * cache un unique jeu d'extensions partagé par tous les éditeurs de la page —
	 * c'est délibéré, sans quoi ProseMirror refuse deux plugins de même clé. Une
	 * option figée à la configuration serait donc commune à tous les éditeurs, et
	 * survivrait à une navigation d'une classe vers une autre. Le stockage, lui,
	 * est propre à chaque instance d'éditeur.
	 */
	grades: string[] | null;
}

/**
 * `editor.storage` est une interface vide dans `@tiptap/core`, prévue pour être
 * augmentée : sans cette déclaration, `editor.storage.resourceLink` ne compile
 * pas. Même mécanisme que l'augmentation de `Commands` dans les extensions
 * voisines (math, blank, number-line).
 */
declare module '@tiptap/core' {
	interface Storage {
		resourceLink: ResourceLinkStorage;
	}
}

export const ResourceLink = Extension.create<ResourceLinkOptions, ResourceLinkStorage>({
	name: 'resourceLink',

	addStorage() {
		return { grades: null };
	},

	addOptions() {
		return {
			maxSuggestions: 8,
			// Below two characters the API answers 400 anyway; not calling it at
			// all spares a round-trip on every opening bracket pair.
			minQueryLength: 2,
			// Assez court pour rester vif à la frappe, assez long pour qu'un mot
			// entier ne coûte qu'une seule requête.
			debounceMs: 250
		};
	},

	addProseMirrorPlugins() {
		const { maxSuggestions, minQueryLength, debounceMs } = this.options;
		const search = createDebouncedSearch(debounceMs);
		// Capturé ici, LU au moment de la requête : le niveau peut changer après la
		// création de l'éditeur (chargement de la classe, navigation).
		const editor = this.editor;

		// Mémorise POURQUOI la dernière liste était vide, pour que la popup le dise.
		// Une seule popup à la fois, donc une seule variable suffit.
		let lastSearchFailed = false;

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
					// `exos:derivees#3` → type, texte, numéro. Le seuil porte sur le
					// TEXTE : `exos:` seul ne doit pas déclencher de requête.
					const parsed = parseResourceQuery(query);
					if (parsed.text.length < minQueryLength) {
						lastSearchFailed = false;
						return [];
					}
					const outcome = await search(
						parsed.text,
						maxSuggestions,
						editor.storage.resourceLink.grades,
						parsed.kind
					);
					lastSearchFailed = outcome.failed;
					return outcome.items;
				},

				command: ({ editor, range, props }) => {
					// `props.id` is already the full `[[kind:uuid|label]]` markup.
					editor.chain().focus().deleteRange(range).insertContent(props.id).run();
				},

				render: () =>
					createSuggestionRenderer({
						type: 'resource',
						prefix: '',
						noResultsText: 'Aucune ressource trouvée',
						// Trois raisons distinctes d'être vide, trois messages.
						emptyText: (query) => {
							if (lastSearchFailed) return 'Recherche indisponible — réessaie dans un instant';
							const parsed = parseResourceQuery(query);
							if (parsed.text.length < minQueryLength) {
								return parsed.kind
									? `Tape au moins ${minQueryLength} lettres du titre`
									: `Tape au moins ${minQueryLength} lettres — ou un type : ${prefixHint()}`;
							}
							return 'Aucune ressource trouvée';
						}
					})
			})
		];
	}
});
