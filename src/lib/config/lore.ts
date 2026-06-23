/**
 * Chiphre lore lexicon — single source of the pataphysical UI vocabulary.
 *
 * Sprint 1 (lexicon only): generic UI terms → Chiphre terms (Compendium §V).
 * Out of scope here: voices/tone/quotes, math-concept nicknames. The math
 * content itself (statements, corrections, hints) is NEVER rebranded — only
 * the UI "decor" (buttons, navigation, titles, feature labels, notifications).
 *
 * Spec: docs/wip/sprint1-lexique-spec.md
 *
 * Convention: keys in English (code), values in French (UI strings).
 */

export const lore = {
	/** Actions / buttons */
	actions: {
		save: 'Empocher',
		delete: 'Passer à la trappe',
		cancel: 'Renoncer',
		confirm: 'Décréter',
		restart: 'Remettre le couvert',
		search: 'Fouiller',
		filter: 'Trier dans la trappe'
	},
	/** Navigation / places (bare terms — callers compose "Mon …" etc.) */
	nav: {
		dashboard: 'Cabinet des Phynances',
		shop: 'Marché Polonais',
		inventory: 'Trappe à Trésors',
		settings: 'Décrets Royaux',
		profile: 'Blason',
		logout: 'Quitter le Royaume',
		help: 'Le Bréviaire Pataphysique',
		legalTerms: 'Édits Royaux',
		privacy: 'Sceau Secret'
	},
	/** Entities / people */
	entities: {
		student: 'Galopin',
		studentFeminine: 'Galopine',
		studentsCollective: 'les Polonais',
		teacher: 'Maître Phynancier',
		class: 'Bataillon',
		friends: 'Conjurés'
	},
	/** Learning / objects */
	learning: {
		exercise: 'Corvée',
		homework: 'Corvée Domestique',
		exam: 'Décervelage',
		baccalaureate: 'le Décervelage Suprême',
		brevet: 'le Petit Décervelage',
		hint: 'Coup de pouce de Conscience',
		badge: 'Médaille de la Gidouille',
		notification: 'Décret',
		streak: 'Constance Royale',
		vipCard: 'Carte Pataphysique'
	},
	/** Economy */
	economy: {
		virtualCurrency: 'Gidouille',
		realCurrency: 'Phynances',
		subscription: 'Pacte Phynancier'
	},
	/** Feedback — labels only, not a voice/tone rewrite */
	feedback: {
		wrong: 'Pataphysique',
		correct: 'Coup de Maître',
		errorPrefix: 'Cornegidouille'
	},
	/** Difficulty levels */
	difficulty: {
		easy: 'Polonais',
		medium: 'Galopin Aguerri',
		hard: 'Décervelage Royal'
	},
	/**
	 * The taught discipline. Internal wording ONLY — never use in the public
	 * manifesto / landing page, legal/RGPD pages, or official certificates.
	 */
	discipline: 'Mathres'
} as const;

/** Student noun adapted to gender ('f' → Galopine, otherwise Galopin). */
export function galopin(gender?: 'f' | 'm' | null | undefined): string {
	return gender === 'f' ? lore.entities.studentFeminine : lore.entities.student;
}
