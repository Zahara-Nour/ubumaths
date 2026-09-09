/**
 * Resource Link Extension Test Suite
 * ==================================
 *
 * L'extension permet de taper `[[` pour chercher une ressource et insérer la
 * syntaxe ubumark `[[kind:uuid|libellé]]`.
 *
 * Ce que ces tests protègent en priorité : **le déclencheur à deux caractères**.
 * J'ai affirmé à trois reprises, sans le vérifier, que l'infrastructure
 * `Suggestion` de TipTap n'acceptait qu'un caractère unique et que `[[` exigeait
 * donc une règle ProseMirror sur mesure. C'est faux — `char` est typé `string`,
 * il passe par `escapeForRegEx()`, et la requête est calculée avec
 * `match[0].slice(char.length)`. Ce test fige ce comportement pour que personne
 * (moi compris) n'ait à le re-supposer, et pour qu'une mise à jour de TipTap qui
 * le casserait se voie en CI.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { findSuggestionMatch } from '@tiptap/suggestion';
import { ResourceLink, toSuggestionItem, createDebouncedSearch } from '../resource-link-extension';
import { createSuggestionRenderer } from '../suggestion-renderer';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createTestEditor(content = ''): Editor {
	return new Editor({ extensions: [StarterKit, ResourceLink], content });
}

/**
 * Place le curseur après `text` et demande à TipTap si un déclencheur s'y trouve.
 * C'est exactement le chemin que suit le plugin à chaque frappe.
 */
function matchAfterTyping(text: string, char = '[[') {
	const editor = createTestEditor(`<p>${text}</p>`);
	editor.commands.focus('end');
	// ⚠️ Pas de destructuration `{ $from }` ici : ce fichier est en `.svelte.test.ts`,
	// donc compilé par Svelte, qui RÉSERVE le préfixe `$` même dans du TypeScript
	// ordinaire (svelte.dev/e/dollar_prefix_invalid). L'échec est un refus de
	// compilation, pas un test rouge — donc silencieux si on ne lit pas la sortie.
	const position = editor.state.selection.$from;

	const match = findSuggestionMatch({
		char,
		allowSpaces: false,
		allowToIncludeChar: false,
		allowedPrefixes: null,
		startOfLine: false,
		$position: position
	});

	editor.destroy();
	return match;
}

// ============================================================================
// LE DÉCLENCHEUR À DEUX CARACTÈRES
// ============================================================================

describe('déclencheur `[[`', () => {
	it('reconnaît un déclencheur de DEUX caractères', () => {
		const match = matchAfterTyping('[[frac');

		expect(match).not.toBeNull();
		expect(match?.query).toBe('frac');
		expect(match?.text).toBe('[[frac');
	});

	it('retire bien les deux caractères de la requête, pas un seul', () => {
		// Le piège si `char` était traité comme un caractère unique : la requête
		// vaudrait « [frac » et toutes les recherches partiraient avec un crochet.
		expect(matchAfterTyping('[[fractions')?.query).toBe('fractions');
		expect(matchAfterTyping('[[fractions')?.query.startsWith('[')).toBe(false);
	});

	it('ne se déclenche pas sur un crochet simple', () => {
		expect(matchAfterTyping('[frac')).toBeNull();
	});

	it('se déclenche en milieu de phrase, pas seulement en début de ligne', () => {
		// `allowedPrefixes: null` désactive le contrôle de préfixe : on doit
		// pouvoir référencer une ressource au fil du texte.
		const match = matchAfterTyping('Voir aussi [[pythagore');

		expect(match).not.toBeNull();
		expect(match?.query).toBe('pythagore');
	});

	it('se déclenche juste après une parenthèse', () => {
		expect(matchAfterTyping('(cf. [[aires')?.query).toBe('aires');
	});

	it("s'arrête au premier espace", () => {
		// Choix assumé : la requête porte sur un mot, comme les hashtags.
		// Sans ça la popup resterait ouverte sur tout un paragraphe.
		expect(matchAfterTyping('[[frac tions')).toBeNull();
	});
});

// ============================================================================
// LE TEXTE INSÉRÉ
// ============================================================================

describe('construction du lien', () => {
	const row = {
		kind: 'exercise',
		id: '550e8400-e29b-41d4-a716-446655440000',
		title: 'Additionner des fractions',
		subtitle: 'Nombres et calculs'
	};

	it('produit la syntaxe ubumark attendue', () => {
		expect(toSuggestionItem(row).id).toBe(
			'[[exercise:550e8400-e29b-41d4-a716-446655440000|Additionner des fractions]]'
		);
	});

	it('affiche le type et le sous-titre en secondaire', () => {
		expect(toSuggestionItem(row).description).toBe('Exercice · Nombres et calculs');
		expect(toSuggestionItem({ ...row, subtitle: null }).description).toBe('Exercice');
	});

	it("retire les crochets fermants d'un titre, qui casseraient la syntaxe", () => {
		// `[[exercise:uuid|Suite ] finale]]` serait tronqué par le parser, dont le
		// libellé est `[^\]]+`.
		const item = toSuggestionItem({ ...row, title: 'Suite ] piégeuse' });

		expect(item.id).toBe('[[exercise:550e8400-e29b-41d4-a716-446655440000|Suite piégeuse]]');
	});

	it('ne produit jamais un libellé vide', () => {
		expect(toSuggestionItem({ ...row, title: '   ' }).label).toBe('Sans titre');
	});

	it('un exercice de fiche emporte le NOM DE LA FICHE dans le texte inséré', () => {
		// L'élève doit voir le lien avec la fiche. Le libellé est la seule chose
		// qui lui reste quand le lien ne mène nulle part (fiche non distribuée),
		// donc « Exercice 3 » tout seul ne lui apprendrait rien.
		const item = toSuggestionItem({
			kind: 'worksheet_exercise',
			id: '550e8400-e29b-41d4-a716-446655440000',
			title: 'Exercice 3',
			subtitle: 'Fiche : Dérivées'
		});

		expect(item.id).toBe(
			'[[worksheet_exercise:550e8400-e29b-41d4-a716-446655440000|Exercice 3 — Fiche : Dérivées]]'
		);
		// Dans la liste en revanche, la fiche est déjà sur la deuxième ligne.
		expect(item.label).toBe('Exercice 3');
		expect(item.description).toBe('Exercice de fiche · Fiche : Dérivées');
	});
});

// ============================================================================
// L'EXTENSION DANS L'ÉDITEUR
// ============================================================================

describe('intégration éditeur', () => {
	it("s'enregistre sans casser l'éditeur", () => {
		const editor = createTestEditor('<p>Bonjour</p>');

		expect(editor.getText()).toBe('Bonjour');
		editor.destroy();
	});

	it('insère le lien comme du texte, donc exportable en markdown', () => {
		// Pas de nœud personnalisé : la syntaxe est du markdown valide, et elle
		// survit gratuitement à l'aller-retour d'export.
		const editor = createTestEditor('<p></p>');
		const markup = toSuggestionItem(row()).id;

		editor.chain().focus().insertContent(markup).run();

		expect(editor.getText()).toContain('[[exercise:');
		expect(editor.getText()).toContain('|Additionner des fractions]]');
		editor.destroy();
	});

	function row() {
		return {
			kind: 'exercise',
			id: '550e8400-e29b-41d4-a716-446655440000',
			title: 'Additionner des fractions',
			subtitle: null
		};
	}
});

// ============================================================================
// L'ÉTAT VIDE : POURQUOI, PAS SEULEMENT « RIEN »
// ============================================================================

/**
 * Le 2026-09-08, David tape `[[` et lit « Aucune ressource trouvée » alors que
 * 127 exercices de fiche venaient d'être mis en ligne. Trois causes possibles
 * produisaient le même message : requête trop courte, recherche en échec, et
 * vraie absence de résultat. Ces tests fixent la distinction.
 */
describe('état vide de la popup', () => {
	/** Rend la popup et renvoie le texte affiché quand la liste est vide. */
	function emptyMessageFor(query: string, emptyText: (q: string) => string): string {
		const renderer = createSuggestionRenderer({
			type: 'resource',
			prefix: '',
			noResultsText: 'Aucune ressource trouvée',
			emptyText
		});

		renderer.onStart({
			items: [],
			query,
			command: () => {},
			clientRect: () => new DOMRect(0, 0, 0, 0)
		} as never);

		const popup = document.querySelector('.suggestion-no-results');
		const text = popup?.textContent ?? '';
		renderer.onExit();
		return text;
	}

	it('invite à taper plutôt que d’annoncer une absence, sous le seuil', () => {
		const message = emptyMessageFor('', (q) =>
			q.length < 2 ? 'Tape au moins 2 lettres du titre ou de la fiche' : 'Aucune ressource trouvée'
		);

		expect(message).toBe('Tape au moins 2 lettres du titre ou de la fiche');
	});

	it('dit « aucune ressource » seulement quand une vraie recherche a eu lieu', () => {
		const message = emptyMessageFor('integrale', (q) =>
			q.length < 2 ? 'Tape au moins 2 lettres du titre ou de la fiche' : 'Aucune ressource trouvée'
		);

		expect(message).toBe('Aucune ressource trouvée');
	});

	it('retombe sur `noResultsText` quand aucun `emptyText` n’est fourni', () => {
		// Les extensions hashtag et mention n'en passent pas : leur comportement
		// ne doit pas changer.
		const renderer = createSuggestionRenderer({
			type: 'hashtag',
			prefix: '#',
			noResultsText: 'Aucun hashtag trouvé'
		});
		renderer.onStart({
			items: [],
			query: 'x',
			command: () => {},
			clientRect: () => new DOMRect(0, 0, 0, 0)
		} as never);

		expect(document.querySelector('.suggestion-no-results')?.textContent).toBe(
			'Aucun hashtag trouvé'
		);
		renderer.onExit();
	});
});

// ============================================================================
// ANTI-REBOND : UNE REQUÊTE PAR PAUSE, PAS UNE PAR TOUCHE
// ============================================================================

describe('anti-rebond de la recherche', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	function urlsAppelees(): string[] {
		return fetchMock.mock.calls.map((call) => String(call[0]));
	}

	beforeEach(() => {
		vi.useFakeTimers();
		fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: [] })
		});
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('taper un mot entier ne coûte qu’UNE requête, celle du mot complet', async () => {
		// Le cœur du sujet : `/api/search` est limité à 30 appels par minute et par
		// compte. Sans rebond, « integral » en consommait sept, et quelques
		// recherches suffisaient à déclencher un 429 rendu en « aucune ressource
		// trouvée ».
		const search = createDebouncedSearch(250);

		const frappes = ['in', 'int', 'inte', 'integ', 'integr', 'integra', 'integral'];
		const promesses = frappes.map((q) => search(q, 8, null, null));
		await vi.advanceTimersByTimeAsync(300);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(urlsAppelees()[0]).toContain('q=integral');

		// Et c'est bien la dernière frappe qui reçoit le résultat.
		await expect(promesses[promesses.length - 1]).resolves.toEqual({ items: [], failed: false });
	});

	it('deux recherches séparées par une pause coûtent deux requêtes', async () => {
		const search = createDebouncedSearch(250);

		void search('derivation', 8, null, null);
		await vi.advanceTimersByTimeAsync(300);
		void search('scalaire', 8, null, null);
		await vi.advanceTimersByTimeAsync(300);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(urlsAppelees()[1]).toContain('q=scalaire');
	});

	it('n’envoie plus le paramètre `kinds`, pour rester insensible aux migrations', async () => {
		// Demander TOUS les types revient à n'en filtrer aucun ; l'omettre évite
		// le plafond `p_kinds` de la fonction SQL.
		const search = createDebouncedSearch(0);
		void search('integral', 8, null, null);
		await vi.advanceTimersByTimeAsync(10);

		expect(urlsAppelees()[0]).not.toContain('kinds=');
		expect(urlsAppelees()[0]).toContain('limit=8');
	});

	it('transmet le niveau de la classe quand il est connu', async () => {
		const search = createDebouncedSearch(0);
		void search('scalaire', 8, ['1_SPE'], null);
		await vi.advanceTimersByTimeAsync(10);

		expect(urlsAppelees()[0]).toContain('grades=1_SPE');
	});

	it('n’envoie aucun niveau quand le contexte ne le donne pas', async () => {
		// Éditeur d'exercices, chat… : rien ne justifierait de filtrer là-bas.
		const search = createDebouncedSearch(0);
		void search('scalaire', 8, null, null);
		await vi.advanceTimersByTimeAsync(10);

		expect(urlsAppelees()[0]).not.toContain('grades=');
	});

	it('transmet le type quand un préfixe le précise', async () => {
		const search = createDebouncedSearch(0);
		void search('derivees', 8, null, 'worksheet');
		await vi.advanceTimersByTimeAsync(10);

		expect(urlsAppelees()[0]).toContain('kinds=worksheet');
	});

	it('n’envoie aucun type sans préfixe', async () => {
		// Demander TOUS les types revient à n'en filtrer aucun.
		const search = createDebouncedSearch(0);
		void search('derivees', 8, null, null);
		await vi.advanceTimersByTimeAsync(10);

		expect(urlsAppelees()[0]).not.toContain('kinds=');
	});

	it('signale un échec au lieu de le faire passer pour une absence de résultat', async () => {
		fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
		const search = createDebouncedSearch(0);

		const promesse = search('integral', 8, null, null);
		await vi.advanceTimersByTimeAsync(10);

		// `failed: true` est ce qui permet à la popup d'écrire « Recherche
		// indisponible » plutôt que de mentir.
		await expect(promesse).resolves.toEqual({ items: [], failed: true });
	});

	it('traite une panne réseau comme un échec, pas comme un vide', async () => {
		fetchMock.mockRejectedValue(new Error('offline'));
		const search = createDebouncedSearch(0);

		const promesse = search('integral', 8, null, null);
		await vi.advanceTimersByTimeAsync(10);

		await expect(promesse).resolves.toEqual({ items: [], failed: true });
	});
});
