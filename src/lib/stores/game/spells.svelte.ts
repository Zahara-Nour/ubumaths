// Game spells store with Svelte 5 runes
// Author: Claude Code
// Date: 2025-10-15

import type { GameSpell, GameSpellDeck, GameElement } from '$lib/types/game';

class SpellsStore {
	private _spells = $state<GameSpell[]>([]);
	private _activeDeck = $state<GameSpellDeck | null>(null);
	private _allDecks = $state<GameSpellDeck[]>([]);

	get spells() {
		return this._spells;
	}

	set spells(value: GameSpell[]) {
		this._spells = value;
	}

	get activeDeck() {
		return this._activeDeck;
	}

	set activeDeck(deck: GameSpellDeck | null) {
		this._activeDeck = deck;
	}

	get allDecks() {
		return this._allDecks;
	}

	set allDecks(decks: GameSpellDeck[]) {
		this._allDecks = decks;
	}

	// Derived values
	get spellsByElement() {
		const grouped: Record<GameElement, GameSpell[]> = {
			fire: [],
			water: [],
			earth: [],
			wind: []
		};

		for (const spell of this._spells) {
			grouped[spell.element].push(spell);
		}

		return grouped;
	}

	get activeDeckSpells() {
		if (!this._activeDeck) return [];

		return this._activeDeck.spell_ids
			.map((spellId) => this._spells.find((s) => s.id === spellId))
			.filter((s): s is GameSpell => s !== undefined);
	}

	get totalSpells() {
		return this._spells.length;
	}

	// Methods
	getSpellById(id: string): GameSpell | undefined {
		return this._spells.find((s) => s.id === id);
	}

	getSpellByNum(spellNum: number): GameSpell | undefined {
		return this._spells.find((s) => s.spell_num === spellNum);
	}

	getSpellsByElement(element: GameElement): GameSpell[] {
		return this._spells.filter((s) => s.element === element);
	}

	hasSpell(spellNum: number): boolean {
		return this._spells.some((s) => s.spell_num === spellNum);
	}

	addSpell(spell: GameSpell) {
		this._spells.push(spell);
	}

	updateSpell(spellId: string, updates: Partial<GameSpell>) {
		const index = this._spells.findIndex((s) => s.id === spellId);
		if (index !== -1) {
			this._spells[index] = { ...this._spells[index], ...updates };
		}
	}

	removeSpell(spellId: string) {
		this._spells = this._spells.filter((s) => s.id !== spellId);
	}

	setActiveDeck(deckId: string) {
		const deck = this._allDecks.find((d) => d.id === deckId);
		if (deck) {
			this._activeDeck = deck;
		}
	}

	reset() {
		this._spells = [];
		this._activeDeck = null;
		this._allDecks = [];
	}
}

export const spellsStore = new SpellsStore();
