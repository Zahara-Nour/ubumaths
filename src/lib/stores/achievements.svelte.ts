/**
 * Achievements Store
 * ==================
 *
 * Manages achievement state, caching, and notifications for the client.
 *
 * Usage:
 * import { achievementsStore } from '$lib/stores/achievements.svelte';
 *
 * // Initialize (once, typically in layout)
 * achievementsStore.init();
 *
 * // Load achievements for display
 * await achievementsStore.loadAchievements('minesweeper');
 *
 * // Load student's unlocked achievements
 * await achievementsStore.loadStudentAchievements(studentId, 'minesweeper');
 *
 * // Process an event (e.g., after game completion)
 * const unlocked = await achievementsStore.processEvent('minesweeper_game_completed', studentId, eventData);
 *
 * // Access computed values
 * const list = achievementsStore.achievementsList;
 * const count = achievementsStore.unlockedCount;
 * const points = achievementsStore.totalPoints;
 * const percentage = achievementsStore.completionPercentage;
 */

import type {
	Achievement,
	StudentAchievement,
	AchievementProgress,
	AchievementContext,
	AchievementWithProgress,
	UnlockedAchievementResponse
} from '$lib/types/achievements';

// Toast notification type for achievement unlocks
interface AchievementToast {
	id: string;
	achievement: Achievement;
	points: number;
	gidouilles: number;
	timestamp: number;
}

// API response types
interface AchievementsApiResponse {
	success: boolean;
	achievements: Achievement[];
	count: number;
}

interface StudentAchievementsApiResponse {
	success: boolean;
	achievements: StudentAchievement[];
	count: number;
}

interface ProcessEventApiResponse {
	success: boolean;
	eventId: string;
	unlockedAchievements: UnlockedAchievementResponse[];
	count: number;
}

interface ProgressApiResponse {
	success: boolean;
	progress: AchievementProgress;
}

class AchievementsManager {
	// State
	private achievementsCache = $state<Map<string, Achievement>>(new Map());
	private studentAchievementsCache = $state<Map<string, StudentAchievement>>(new Map());
	private progressCache = $state<Map<string, AchievementProgress>>(new Map());

	loading = $state(false);
	error = $state<string | null>(null);
	toastQueue = $state<AchievementToast[]>([]);

	// Current context tracking
	private currentContext = $state<AchievementContext | null>(null);
	private currentStudentId = $state<string | null>(null);
	private initialized = $state(false);

	// Cache expiration (5 minutes)
	private readonly CACHE_TTL = 5 * 60 * 1000;
	private cacheTimestamp = $state<number>(0);

	// Maximum toast queue size to prevent memory exhaustion
	private readonly MAX_TOAST_QUEUE_SIZE = 10;

	/**
	 * Initialize the achievements manager
	 */
	init(): void {
		if (this.initialized) {
			return;
		}
		this.initialized = true;
	}

	/**
	 * Check if cache is still valid
	 */
	private isCacheValid(): boolean {
		return Date.now() - this.cacheTimestamp < this.CACHE_TTL;
	}

	/**
	 * Load all achievements, optionally filtered by context
	 */
	async loadAchievements(context?: AchievementContext): Promise<Achievement[]> {
		// Return cached data if valid and same context
		if (this.isCacheValid() && this.currentContext === context && this.achievementsCache.size > 0) {
			return Array.from(this.achievementsCache.values());
		}

		this.loading = true;
		this.error = null;

		try {
			const url = context ? `/api/achievements?context=${context}` : '/api/achievements';

			const response = await fetch(url);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `Failed to load achievements: ${response.status}`);
			}

			const data: AchievementsApiResponse = await response.json();

			// Update cache
			this.achievementsCache = new Map(data.achievements.map((a) => [a.id, a]));
			this.currentContext = context ?? null;
			this.cacheTimestamp = Date.now();

			return data.achievements;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to load achievements';
			this.error = message;
			console.error('[AchievementsStore] Error loading achievements:', err);
			return [];
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load achievements unlocked by a specific student
	 */
	async loadStudentAchievements(
		studentId: string,
		context?: AchievementContext
	): Promise<StudentAchievement[]> {
		// Return cached data if valid, same student, and same context
		if (
			this.isCacheValid() &&
			this.currentStudentId === studentId &&
			this.currentContext === context &&
			this.studentAchievementsCache.size > 0
		) {
			return Array.from(this.studentAchievementsCache.values());
		}

		this.loading = true;
		this.error = null;

		try {
			const baseUrl = `/api/achievements/student/${studentId}`;
			const url = context ? `${baseUrl}?context=${context}` : baseUrl;

			const response = await fetch(url);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.message || `Failed to load student achievements: ${response.status}`
				);
			}

			const data: StudentAchievementsApiResponse = await response.json();

			// Update cache
			this.studentAchievementsCache = new Map(data.achievements.map((a) => [a.achievement_id, a]));
			this.currentStudentId = studentId;
			this.currentContext = context ?? null;
			this.cacheTimestamp = Date.now();

			return data.achievements;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to load student achievements';
			this.error = message;
			console.error('[AchievementsStore] Error loading student achievements:', err);
			return [];
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load progress for a specific achievement
	 */
	async loadProgress(
		studentId: string,
		achievementId: string
	): Promise<AchievementProgress | null> {
		const cacheKey = `${studentId}:${achievementId}`;

		// Check cache first
		if (this.isCacheValid() && this.progressCache.has(cacheKey)) {
			return this.progressCache.get(cacheKey) ?? null;
		}

		try {
			const response = await fetch(
				`/api/achievements/student/${studentId}/progress/${achievementId}`
			);

			if (response.status === 404) {
				return null;
			}

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `Failed to load progress: ${response.status}`);
			}

			const data: ProgressApiResponse = await response.json();

			// Update cache
			const newProgressCache = new Map(this.progressCache);
			newProgressCache.set(cacheKey, data.progress);
			this.progressCache = newProgressCache;

			return data.progress;
		} catch (err) {
			console.error('[AchievementsStore] Error loading progress:', err);
			return null;
		}
	}

	/**
	 * Process an achievement event
	 * Returns newly unlocked achievements
	 */
	async processEvent(
		eventType: string,
		studentId: string,
		eventData: Record<string, unknown>
	): Promise<UnlockedAchievementResponse[]> {
		this.error = null;

		try {
			const response = await fetch('/api/achievements/events', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					eventType,
					studentId,
					eventData
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `Failed to process event: ${response.status}`);
			}

			const data: ProcessEventApiResponse = await response.json();

			// If achievements were unlocked, invalidate cache and show toasts
			if (data.count > 0) {
				this.invalidateStudentCache();

				// Queue toast notifications for each unlocked achievement
				for (const unlocked of data.unlockedAchievements) {
					// Fetch full achievement details if not in cache
					let achievement = this.achievementsCache.get(unlocked.achievement_id);
					if (!achievement) {
						// Create a minimal achievement object from the response
						achievement = {
							id: unlocked.achievement_id,
							name: unlocked.name,
							icon: unlocked.icon,
							description: '',
							context: 'minesweeper',
							category: 'participation',
							unlock_type: 'automatic',
							is_active: true,
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString(),
							metadata: {
								points: unlocked.points,
								gidouilles_reward: unlocked.gidouilles
							}
						} as Achievement;
					}

					this.queueToast(achievement, unlocked.points, unlocked.gidouilles);
				}
			}

			return data.unlockedAchievements;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to process event';
			this.error = message;
			console.error('[AchievementsStore] Error processing event:', err);
			return [];
		}
	}

	/**
	 * Queue a toast notification for an unlocked achievement
	 * Implements queue size limit to prevent memory exhaustion from rapid unlocks
	 */
	private queueToast(achievement: Achievement, points: number, gidouilles: number): void {
		// Prevent queue overflow by removing oldest toast if at limit
		if (this.toastQueue.length >= this.MAX_TOAST_QUEUE_SIZE) {
			this.toastQueue = this.toastQueue.slice(1);
		}

		const toast: AchievementToast = {
			id: `${achievement.id}-${Date.now()}`,
			achievement,
			points,
			gidouilles,
			timestamp: Date.now()
		};

		this.toastQueue = [...this.toastQueue, toast];
	}

	/**
	 * Show unlock toast (public method for external use)
	 */
	showUnlockToast(achievement: Achievement, points: number, gidouilles: number = 0): void {
		this.queueToast(achievement, points, gidouilles);
	}

	/**
	 * Dismiss the oldest toast notification
	 */
	dismissToast(): void {
		if (this.toastQueue.length > 0) {
			this.toastQueue = this.toastQueue.slice(1);
		}
	}

	/**
	 * Dismiss a specific toast by ID
	 */
	dismissToastById(toastId: string): void {
		this.toastQueue = this.toastQueue.filter((t) => t.id !== toastId);
	}

	/**
	 * Clear all toast notifications
	 */
	clearToasts(): void {
		this.toastQueue = [];
	}

	/**
	 * Invalidate student-specific cache
	 */
	private invalidateStudentCache(): void {
		this.studentAchievementsCache = new Map();
		this.progressCache = new Map();
		this.cacheTimestamp = 0;
	}

	/**
	 * Clear all cached data
	 */
	clearCache(): void {
		this.achievementsCache = new Map();
		this.studentAchievementsCache = new Map();
		this.progressCache = new Map();
		this.currentContext = null;
		this.currentStudentId = null;
		this.cacheTimestamp = 0;
		this.error = null;
	}

	/**
	 * Reset the store completely
	 */
	reset(): void {
		this.clearCache();
		this.clearToasts();
		this.loading = false;
		this.initialized = false;
	}

	// Computed values (using getters for derived state)

	/**
	 * Get list of all achievements with unlock status
	 */
	get achievementsList(): AchievementWithProgress[] {
		const achievements = Array.from(this.achievementsCache.values());

		return achievements.map((achievement) => {
			const studentAchievement = this.studentAchievementsCache.get(achievement.id);
			const progressKey = this.currentStudentId
				? `${this.currentStudentId}:${achievement.id}`
				: null;
			const progress = progressKey ? this.progressCache.get(progressKey) : undefined;

			const result: AchievementWithProgress = {
				...achievement,
				is_unlocked: !!studentAchievement,
				unlocked_at: studentAchievement?.unlocked_at,
				points_awarded: studentAchievement?.points_awarded ?? undefined,
				gidouilles_awarded: studentAchievement?.gidouilles_awarded ?? undefined,
				context_data: studentAchievement?.context_data
			};

			// Add progress if available
			if (progress) {
				result.progress = {
					current_value: progress.current_value,
					target_value: progress.target_value,
					progress_percentage: progress.progress_percentage,
					context_key: progress.context_key ?? undefined
				};
			}

			return result;
		});
	}

	/**
	 * Get number of unlocked achievements
	 */
	get unlockedCount(): number {
		return this.studentAchievementsCache.size;
	}

	/**
	 * Get total achievements available
	 */
	get totalCount(): number {
		return this.achievementsCache.size;
	}

	/**
	 * Get total points earned
	 */
	get totalPoints(): number {
		let total = 0;
		for (const achievement of this.studentAchievementsCache.values()) {
			total += achievement.points_awarded ?? 0;
		}
		return total;
	}

	/**
	 * Get total gidouilles earned
	 */
	get totalGidouilles(): number {
		let total = 0;
		for (const achievement of this.studentAchievementsCache.values()) {
			total += achievement.gidouilles_awarded ?? 0;
		}
		return total;
	}

	/**
	 * Get completion percentage
	 */
	get completionPercentage(): number {
		if (this.achievementsCache.size === 0) {
			return 0;
		}
		return Math.round((this.studentAchievementsCache.size / this.achievementsCache.size) * 100);
	}

	/**
	 * Get the current active toast (oldest in queue)
	 */
	get currentToast(): AchievementToast | null {
		return this.toastQueue.length > 0 ? this.toastQueue[0] : null;
	}

	/**
	 * Check if there are pending toasts
	 */
	get hasToasts(): boolean {
		return this.toastQueue.length > 0;
	}

	/**
	 * Get achievements by category
	 */
	getByCategory(category: string): AchievementWithProgress[] {
		return this.achievementsList.filter((a) => a.category === category);
	}

	/**
	 * Get achievements by rarity
	 */
	getByRarity(rarity: string): AchievementWithProgress[] {
		return this.achievementsList.filter((a) => a.metadata?.rarity === rarity);
	}

	/**
	 * Get only unlocked achievements
	 */
	get unlockedAchievements(): AchievementWithProgress[] {
		return this.achievementsList.filter((a) => a.is_unlocked);
	}

	/**
	 * Get only locked achievements
	 */
	get lockedAchievements(): AchievementWithProgress[] {
		return this.achievementsList.filter((a) => !a.is_unlocked);
	}

	/**
	 * Get achievements with progress (progressive achievements)
	 */
	get inProgressAchievements(): AchievementWithProgress[] {
		return this.achievementsList.filter(
			(a) => !a.is_unlocked && a.progress && a.progress.current_value > 0
		);
	}

	/**
	 * Check if a specific achievement is unlocked
	 */
	isUnlocked(achievementId: string): boolean {
		return this.studentAchievementsCache.has(achievementId);
	}

	/**
	 * Get a specific achievement by ID
	 */
	getAchievement(achievementId: string): Achievement | null {
		return this.achievementsCache.get(achievementId) ?? null;
	}

	/**
	 * Get student achievement data for a specific achievement
	 */
	getStudentAchievement(achievementId: string): StudentAchievement | null {
		return this.studentAchievementsCache.get(achievementId) ?? null;
	}
}

// Export singleton instance
export const achievementsStore = new AchievementsManager();
