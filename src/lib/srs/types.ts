/**
 * SRS (Spaced Repetition System) Types
 * =====================================
 *
 * Type definitions for the Anki-style spaced repetition system.
 *
 * Architecture:
 * - Decks contain Cards
 * - Cards reference either QuestionTemplates (template-based) or custom content
 * - CardStats track FSRS metadata globally per user + card reference
 * - ReviewSessions track study sessions for analytics
 *
 * FSRS Algorithm:
 * - Uses FSRS-6 algorithm (Free Spaced Repetition Scheduler)
 * - 4 grades: Again (1), Hard (2), Good (3), Easy (4)
 * - Tracks Difficulty, Stability, Retrievability (DSR model)
 */

import type { ContentField, QuestionInstance } from '$lib/questions/types';
import type { TemplateMarkdown } from '$lib/shared/markdown';

// ============================================================================
// DECK TYPES
// ============================================================================

/**
 * Type of deck
 */
export type DeckType = 'official' | 'personal';

/**
 * FSRS configuration for a deck
 */
export interface FSRSConfig {
	/**
	 * Desired retention rate (0.7 to 0.97)
	 * Recommended: 0.9 (90%)
	 */
	desiredRetention: number;

	/**
	 * FSRS-6 parameters (21 values)
	 * If not provided, uses DEFAULT_FSRS_PARAMS
	 */
	parameters?: number[];

	/**
	 * Maximum interval in days
	 * Default: 36500 (100 years)
	 */
	maximumInterval?: number;
}

/**
 * Deck of flashcards
 */
export interface Deck {
	id: string;
	name: string;
	description?: string;

	/**
	 * Owner of the deck (student or teacher)
	 */
	ownerId: string;

	/**
	 * Type of deck
	 */
	deckType: DeckType;

	/**
	 * Whether this deck was assigned by a teacher (read-only for student)
	 */
	isAssigned: boolean;

	/**
	 * FSRS configuration
	 */
	config: FSRSConfig;

	/**
	 * Creation metadata
	 */
	createdAt: string;
	updatedAt: string;
}

/**
 * Database representation of a deck
 */
export interface DbDeck {
	id: string;
	name: string;
	description: string | null;
	owner_id: string;
	deck_type: DeckType;
	is_assigned: boolean;
	config: FSRSConfig; // JSONB
	created_at: string;
	updated_at: string;
}

// ============================================================================
// CARD TYPES
// ============================================================================

/**
 * Type of card
 */
export type CardType = 'template' | 'custom';

/**
 * Card state in FSRS
 */
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

/**
 * Grade given by user after reviewing
 */
export enum Grade {
	AGAIN = 1, // Forgot, start over
	HARD = 2, // Difficult, remembered with effort
	GOOD = 3, // Remembered after thinking
	EASY = 4 // Immediately remembered
}

/**
 * Reference to either a template or custom card
 */
export type CardReference =
	| {
			type: 'template';
			templateId: string;
	  }
	| {
			type: 'custom';
			customCardId: string;
	  };

/**
 * Card in a deck
 *
 * Template-based cards:
 * - Reference a QuestionTemplate
 * - Generate new instance with random seed at each review
 * - Stats tracked by (user_id, template_id)
 *
 * Custom cards:
 * - Front and back content defined by user
 * - Static content (no regeneration)
 * - Stats tracked by (user_id, card_id)
 */
export interface Card {
	id: string;
	deckId: string;

	/**
	 * Type of card
	 */
	cardType: CardType;

	/**
	 * For template-based cards: QuestionTemplate ID
	 */
	templateId?: string;

	/**
	 * For custom cards: Front content (question) as markdown template
	 */
	frontContent?: TemplateMarkdown;

	/**
	 * For custom cards: Back content (answer + correction) as markdown template
	 */
	backContent?: TemplateMarkdown;

	/**
	 * Creation metadata
	 */
	createdAt: string;
	updatedAt: string;
}

/**
 * Database representation of a card
 *
 * Note: Database still stores ContentField[] for backward compatibility.
 * Conversion to/from TemplateMarkdown happens at the boundary layer.
 */
export interface DbCard {
	id: string;
	deck_id: string;
	card_type: CardType;
	template_id: string | null;
	front_content: ContentField[] | null; // JSONB - will be migrated to string in Phase 7
	back_content: ContentField[] | null; // JSONB - will be migrated to string in Phase 7
	created_at: string;
	updated_at: string;
}

// ============================================================================
// CARD STATS (FSRS METADATA)
// ============================================================================

/**
 * Review history entry
 */
export interface ReviewHistoryEntry {
	/**
	 * When the review happened
	 */
	date: string; // ISO 8601

	/**
	 * Grade given (1-4)
	 */
	grade: Grade;

	/**
	 * Days elapsed since last review
	 */
	elapsedDays: number;

	/**
	 * Retrievability at time of review (0-1)
	 */
	retrievability: number;

	/**
	 * Time spent on this review (seconds)
	 */
	timeSpent?: number;
}

/**
 * FSRS statistics for a card (global per user + card reference)
 *
 * For template-based cards: Shared across all decks using same template
 * For custom cards: Unique to that card
 */
export interface CardStats {
	id: string;
	userId: string;

	/**
	 * Type of card reference
	 */
	cardReferenceType: 'template' | 'custom';

	/**
	 * ID of referenced entity (template_id or custom_card_id)
	 */
	cardReferenceId: string;

	// ===== FSRS DSR Model =====

	/**
	 * Difficulty (D): 1-10
	 * Higher = more difficult
	 */
	difficulty: number;

	/**
	 * Stability (S): Days
	 * Time before retrievability drops to 90%
	 */
	stability: number;

	/**
	 * State in learning process
	 */
	state: CardState;

	// ===== Scheduling =====

	/**
	 * When card was last reviewed
	 */
	lastReview: string | null; // ISO 8601

	/**
	 * When card should be reviewed next
	 */
	nextReview: string; // ISO 8601

	// ===== Statistics =====

	/**
	 * Total number of reviews
	 */
	totalReviews: number;

	/**
	 * History of all reviews
	 */
	reviewHistory: ReviewHistoryEntry[];

	/**
	 * Metadata
	 */
	createdAt: string;
	updatedAt: string;
}

/**
 * Database representation of card stats
 */
export interface DbCardStats {
	id: string;
	user_id: string;
	card_reference_type: 'template' | 'custom';
	card_reference_id: string;
	difficulty: number;
	stability: number;
	state: CardState;
	last_review: string | null;
	next_review: string;
	total_reviews: number;
	review_history: ReviewHistoryEntry[]; // JSONB
	created_at: string;
	updated_at: string;
}

// ============================================================================
// REVIEW SESSION
// ============================================================================

/**
 * Review session (for analytics)
 */
export interface ReviewSession {
	id: string;
	userId: string;
	deckId: string;

	/**
	 * When session started
	 */
	startedAt: string;

	/**
	 * When session completed
	 */
	completedAt: string | null;

	/**
	 * Number of cards reviewed
	 */
	cardsReviewed: number;

	/**
	 * Number of correct reviews (grade >= Good)
	 */
	correctCount: number;

	/**
	 * Total time spent (seconds)
	 */
	totalTime: number;

	/**
	 * Average time per card (seconds)
	 */
	averageTime: number;
}

/**
 * Database representation of review session
 */
export interface DbReviewSession {
	id: string;
	user_id: string;
	deck_id: string;
	started_at: string;
	completed_at: string | null;
	cards_reviewed: number;
	correct_count: number;
	total_time: number;
	average_time: number;
}

// ============================================================================
// DECK ASSIGNMENT
// ============================================================================

/**
 * Deck assignment (teacher → student)
 */
export interface DeckAssignment {
	id: string;

	/**
	 * Source deck (teacher's template deck)
	 */
	sourceDeckId: string;

	/**
	 * Teacher who assigned
	 */
	assignedBy: string;

	/**
	 * Student OR class ID who received assignment
	 */
	assignedTo: string;

	/**
	 * Type of assignment target
	 */
	assignmentType: 'student' | 'class';

	/**
	 * When assignment was created
	 */
	assignedAt: string;
}

/**
 * Database representation of deck assignment
 */
export interface DbDeckAssignment {
	id: string;
	source_deck_id: string;
	assigned_by: string;
	assigned_to: string;
	assignment_type: 'student' | 'class';
	assigned_at: string;
}

// ============================================================================
// REVIEW DATA (Runtime)
// ============================================================================

/**
 * Card ready for review (with stats and generated instance)
 */
export interface ReviewCard {
	/**
	 * Card metadata
	 */
	card: Card;

	/**
	 * FSRS stats for this card
	 */
	stats: CardStats;

	/**
	 * For template cards: Generated instance
	 * For custom cards: undefined
	 */
	instance?: QuestionInstance;

	/**
	 * Whether this card is due for review
	 */
	isDue: boolean;

	/**
	 * Days until next review (negative if overdue)
	 */
	daysUntilDue: number;
}

/**
 * Result of a review submission
 */
export interface ReviewResult {
	/**
	 * Grade given
	 */
	grade: Grade;

	/**
	 * Time spent on review (seconds)
	 */
	timeSpent: number;

	/**
	 * Updated card stats
	 */
	updatedStats: CardStats;

	/**
	 * Days until next review
	 */
	daysUntilNext: number;
}

/**
 * Summary stats for a deck
 */
export interface DeckSummary {
	deck: Deck;

	/**
	 * Total cards in deck
	 */
	totalCards: number;

	/**
	 * Cards due for review now
	 */
	dueCount: number;

	/**
	 * New cards (never reviewed)
	 */
	newCount: number;

	/**
	 * Cards in learning state
	 */
	learningCount: number;

	/**
	 * Cards in review state
	 */
	reviewCount: number;

	/**
	 * Next review date
	 */
	nextReviewDate: string | null;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request to create a new deck
 */
export interface CreateDeckRequest {
	name: string;
	description?: string;
	deckType: DeckType;
	config?: FSRSConfig;
}

/**
 * Request to create a new card
 */
export interface CreateCardRequest {
	deckId: string;
	cardType: CardType;
	templateId?: string;
	frontContent?: TemplateMarkdown;
	backContent?: TemplateMarkdown;
}

/**
 * Request to assign deck to students
 */
export interface AssignDeckRequest {
	targetType: 'student' | 'class';
	targetIds: string[]; // Student IDs or Class IDs
}

/**
 * Request to submit a review
 */
export interface SubmitReviewRequest {
	cardId: string;
	grade: Grade;
	timeSpent: number;
}

/**
 * Response for due cards
 */
export interface DueCardsResponse {
	cards: ReviewCard[];
	totalDue: number;
}
