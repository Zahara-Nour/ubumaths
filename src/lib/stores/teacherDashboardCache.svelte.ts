/**
 * Teacher Dashboard Cache Store
 * ===============================
 *
 * Centralized caching system for teacher dashboard with 5 separate caches:
 * 1. Student Basic Info (2h TTL)
 * 2A. Student Rewards (10min TTL + optimistic)
 * 2B. Student Warnings (10min TTL + optimistic, per period)
 * 3. Class Info (24h TTL)
 * 4. School Info (24h TTL)
 *
 * FEATURES:
 * - Automatic TTL-based expiration
 * - Manual invalidation
 * - Optimistic UI updates
 * - Composite key for warnings (classId:periodId)
 * - Memory-efficient with auto-cleanup
 *
 * USAGE:
 * ```typescript
 * import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
 *
 * // Get rewards with auto-fetch
 * const rewards = await teacherCache.getStudentRewards(classId);
 *
 * // Optimistic update
 * teacherCache.updateGidouillesOptimistic(classId, studentId, +5);
 *
 * // Manual invalidation
 * teacherCache.invalidateRewards(classId);
 * ```
 */

import type {
	BasicStudent,
	StudentRewards,
	StudentWarningCounts,
	ClassInfo,
	SchoolInfo,
	CachedStudents,
	CachedRewards,
	CachedWarnings,
	CachedClass,
	CachedSchool,
	CacheStats
} from '$lib/types/teacher-cache';
import type { StudentVipCards } from '$lib/types/vip-card';
import type { ClassWithData } from '$lib/server/students';
import { createLogger } from '$lib/utils/logger';
import { browser } from '$app/environment';
import { SvelteMap } from 'svelte/reactivity';

// ============================================================================
// CACHE CLASS
// ============================================================================

export class TeacherDashboardCache {
	// Cache stores with SvelteMap for native reactivity (no $state needed)
	private studentsCache = new SvelteMap<string, CachedStudents>();
	private rewardsCache = new SvelteMap<string, CachedRewards>();
	private warningsCache = new SvelteMap<string, CachedWarnings>();
	private classesCache = new SvelteMap<string, CachedClass>();
	private schoolCache = new SvelteMap<string, CachedSchool>();
	private periodsCache = new SvelteMap<
		string,
		{ currentPeriod: unknown | null; allPeriods: unknown[]; cachedAt: number }
	>();

	// TTL configurations (in milliseconds)
	private readonly STUDENTS_TTL = 2 * 60 * 60 * 1000; // 2 hours
	private readonly REWARDS_TTL = 10 * 60 * 1000; // 10 minutes
	private readonly WARNINGS_TTL = 10 * 60 * 1000; // 10 minutes
	private readonly CLASS_TTL = 24 * 60 * 60 * 1000; // 24 hours
	private readonly SCHOOL_TTL = 24 * 60 * 60 * 1000; // 24 hours
	private readonly PERIODS_TTL = 60 * 60 * 1000; // 1 hour (quasi-static)

	// Monitoring (controlled by ENABLE_CACHE_MONITORING env variable)
	private readonly monitoringEnabled =
		browser && import.meta.env.VITE_ENABLE_CACHE_MONITORING === 'true';
	private readonly logger = createLogger('teacherDashboardCache.svelte.ts', 'trace');

	/**
	 * Conditional logging helper
	 * Only logs if monitoring is enabled
	 * @private
	 */
	private log(level: 'trace' | 'info' | 'warn' | 'error', message: string, ...args: unknown[]) {
		if (!this.monitoringEnabled) return;
		this.logger[level](message, ...args);
	}

	// ========================================================================
	// GETTERS (Async with auto-fetch)
	// ========================================================================

	/**
	 * Get student basic info for a class
	 * Auto-fetches if cache expired or missing
	 *
	 * @param classId - The class ID
	 * @returns Promise resolving to array of basic student data
	 */
	async getStudentBasic(classId: string): Promise<BasicStudent[]> {
		const startTime = performance.now();
		const cached = this.studentsCache.get(classId);
		const now = Date.now();

		// Return cached data if fresh
		if (cached && now - cached.fetchedAt < this.STUDENTS_TTL) {
			const elapsed = (performance.now() - startTime).toFixed(2);
			this.log('info', `Cache HIT: Student basic for class ${classId} (${elapsed}ms)`);
			return cached.students;
		}

		const ttlExpired = cached ? 'TTL expired' : 'Not in cache';
		this.log(
			'info',
			`Cache MISS: Student basic for class ${classId} (${ttlExpired}) - Fetching...`
		);

		// Fetch from API
		const students = await this.fetchStudentBasic(classId);
		this.studentsCache.set(classId, { students, fetchedAt: now });

		const elapsed = (performance.now() - startTime).toFixed(2);
		this.log(
			'info',
			`Fetched student basic for class ${classId}: ${students.length} students (${elapsed}ms)`
		);
		return students;
	}

	/**
	 * Get student rewards for a class
	 * Auto-fetches if cache expired or missing
	 *
	 * @param classId - The class ID
	 * @returns Promise resolving to Map of studentId → rewards
	 */
	async getStudentRewards(classId: string): Promise<Map<string, StudentRewards>> {
		const startTime = performance.now();
		const cached = this.rewardsCache.get(classId);
		const now = Date.now();

		// Return cached data if fresh
		if (cached && now - cached.fetchedAt < this.REWARDS_TTL) {
			const elapsed = (performance.now() - startTime).toFixed(2);
			this.log('info', `Cache HIT: Rewards for class ${classId} (${elapsed}ms)`);
			return cached.rewards;
		}

		const ttlExpired = cached ? 'TTL expired' : 'Not in cache';
		this.log('info', `Cache MISS: Rewards for class ${classId} (${ttlExpired}) - Fetching...`);

		// Fetch from API
		const rewards = await this.fetchStudentRewards(classId);
		this.rewardsCache.set(classId, { rewards, fetchedAt: now });

		const elapsed = (performance.now() - startTime).toFixed(2);
		this.log(
			'info',
			`Fetched rewards for class ${classId}: ${rewards.size} students (${elapsed}ms)`
		);
		return rewards;
	}

	/**
	 * Get student warnings for a class and academic period
	 * Auto-fetches if cache expired or missing
	 * Uses composite key: ${classId}:${periodId}
	 *
	 * Note: StudentWarningCounts includes warnings: Warning[] array
	 *
	 * @param classId - The class ID
	 * @param periodId - The academic period ID
	 * @returns Promise resolving to Map of studentId → warning counts (with warnings array)
	 */
	async getStudentWarnings(
		classId: string,
		periodId: string
	): Promise<Map<string, StudentWarningCounts>> {
		const startTime = performance.now();
		const key = `${classId}:${periodId}`;
		const cached = this.warningsCache.get(key);
		const now = Date.now();

		// Return cached data if fresh
		if (cached && now - cached.fetchedAt < this.WARNINGS_TTL) {
			const elapsed = (performance.now() - startTime).toFixed(2);
			this.log('info', `Cache HIT: Warnings for class:period ${key} (${elapsed}ms)`);
			return cached.warnings;
		}

		const ttlExpired = cached ? 'TTL expired' : 'Not in cache';
		this.log('info', `Cache MISS: Warnings for class:period ${key} (${ttlExpired}) - Fetching...`);

		// Fetch from API
		const warnings = await this.fetchStudentWarnings(classId, periodId);
		this.warningsCache.set(key, { warnings, fetchedAt: now });

		const elapsed = (performance.now() - startTime).toFixed(2);
		this.log(
			'info',
			`Fetched warnings for class:period ${key}: ${warnings.size} students (${elapsed}ms)`
		);
		return warnings;
	}

	/**
	 * Get class information
	 * Auto-fetches if cache expired or missing
	 *
	 * @param classId - The class ID
	 * @returns Promise resolving to class info with schedules
	 */
	async getClassInfo(classId: string): Promise<ClassInfo> {
		const startTime = performance.now();
		const cached = this.classesCache.get(classId);
		const now = Date.now();

		// Return cached data if fresh
		if (cached && now - cached.fetchedAt < this.CLASS_TTL) {
			const elapsed = (performance.now() - startTime).toFixed(2);
			this.log('info', `Cache HIT: Class info for ${classId} (${elapsed}ms)`);
			return cached.classInfo;
		}

		const ttlExpired = cached ? 'TTL expired' : 'Not in cache';
		this.log('info', `Cache MISS: Class info for ${classId} (${ttlExpired}) - Fetching...`);

		// Fetch from API
		const classInfo = await this.fetchClassInfo(classId);
		this.classesCache.set(classId, { classInfo, fetchedAt: now });

		const elapsed = (performance.now() - startTime).toFixed(2);
		this.log('info', `Fetched class info for ${classId} (${elapsed}ms)`);
		return classInfo;
	}

	/**
	 * Get school information with periods
	 * Auto-fetches if cache expired or missing
	 *
	 * @param schoolId - The school ID
	 * @returns Promise resolving to school info with periods
	 */
	async getSchoolInfo(schoolId: string): Promise<SchoolInfo> {
		const startTime = performance.now();
		const cached = this.schoolCache.get(schoolId);
		const now = Date.now();

		// Return cached data if fresh
		if (cached && now - cached.fetchedAt < this.SCHOOL_TTL) {
			const elapsed = (performance.now() - startTime).toFixed(2);
			this.log('info', `Cache HIT: School info for ${schoolId} (${elapsed}ms)`);
			return cached.schoolInfo;
		}

		const ttlExpired = cached ? 'TTL expired' : 'Not in cache';
		this.log('info', `Cache MISS: School info for ${schoolId} (${ttlExpired}) - Fetching...`);

		// Fetch from API
		const schoolInfo = await this.fetchSchoolInfo(schoolId);
		this.schoolCache.set(schoolId, { schoolInfo, fetchedAt: now });

		const elapsed = (performance.now() - startTime).toFixed(2);
		this.log('info', `Fetched school info for ${schoolId} (${elapsed}ms)`);
		return schoolInfo;
	}

	// ========================================================================
	// SYNC GETTERS (for derived state)
	// ========================================================================

	/**
	 * Get cached rewards synchronously (for $derived)
	 * Returns null if not cached
	 *
	 * @param classId - The class ID
	 * @returns Cached rewards map or null
	 */
	getRewardsSync(classId: string): Map<string, StudentRewards> | null {
		const cached = this.rewardsCache.get(classId);
		if (!cached) return null;

		const now = Date.now();
		if (now - cached.fetchedAt >= this.REWARDS_TTL) return null;

		return cached.rewards;
	}

	/**
	 * Get the rewards SvelteMap for a class (REACTIVE - no TTL check)
	 *
	 * IMPORTANT: Returns the SvelteMap itself so components can call .get()
	 * directly in their $derived, allowing Svelte to track the reactive access.
	 *
	 * @param classId - The class ID
	 * @returns SvelteMap of rewards or null if not cached
	 */
	getRewardsMapReactive(classId: string): Map<string, StudentRewards> | null {
		const cached = this.rewardsCache.get(classId);
		return cached ? cached.rewards : null;
	}

	/**
	 * Get cached warnings synchronously (for $derived)
	 * Returns null if not cached
	 *
	 * Note: StudentWarningCounts includes warnings: Warning[] array
	 *
	 * @param classId - The class ID
	 * @param periodId - The academic period ID
	 * @returns Cached warnings map (counts + warnings array) or null
	 */
	getWarningsSync(classId: string, periodId: string): Map<string, StudentWarningCounts> | null {
		const key = `${classId}:${periodId}`;
		const cached = this.warningsCache.get(key);
		if (!cached) return null;

		const now = Date.now();
		if (now - cached.fetchedAt >= this.WARNINGS_TTL) return null;

		return cached.warnings;
	}

	/**
	 * Get cached students synchronously (for $derived)
	 * Returns empty array if not cached
	 *
	 * @param classId - The class ID
	 * @returns Cached students array or empty array
	 */
	getStudentsSync(classId: string): BasicStudent[] {
		const cached = this.studentsCache.get(classId);
		if (!cached) return [];

		const now = Date.now();
		if (now - cached.fetchedAt >= this.STUDENTS_TTL) return [];

		return cached.students;
	}

	/**
	 * Check if students are cached for a class (for loading state detection)
	 * Returns true if valid cache exists, false if loading is needed
	 *
	 * @param classId - The class ID
	 * @returns true if students are cached and not expired
	 */
	hasStudentsCached(classId: string): boolean {
		const cached = this.studentsCache.get(classId);
		if (!cached) return false;

		const now = Date.now();
		return now - cached.fetchedAt < this.STUDENTS_TTL;
	}

	/**
	 * Get all cached classes synchronously (for $derived)
	 * Returns empty array if cache is empty or expired
	 *
	 * Converts ClassInfo (Cache 3) to ClassWithData format
	 *
	 * @returns Array of cached classes or empty array
	 */
	getAllClassesSync(): ClassWithData[] {
		const classes: ClassWithData[] = [];
		const now = Date.now();

		for (const [_classId, cached] of this.classesCache) {
			// Skip if expired
			if (now - cached.fetchedAt >= this.CLASS_TTL) continue;

			// Convert ClassInfo to ClassWithData format
			classes.push({
				id: cached.classInfo.id,
				teacher_id: cached.classInfo.teacher_id,
				name: cached.classInfo.name,
				description: cached.classInfo.description,
				join_code: cached.classInfo.join_code,
				is_active: cached.classInfo.is_active,
				created_at: cached.classInfo.created_at,
				updated_at: cached.classInfo.updated_at,
				google_classroom_course_id: cached.classInfo.google_classroom_course_id,
				student_count: cached.classInfo.student_count,
				schedules: cached.classInfo.schedules
			});
		}

		return classes;
	}

	// ========================================================================
	// OPTIMISTIC UPDATES
	// ========================================================================

	/**
	 * Update gidouilles optimistically (instant UI feedback)
	 *
	 * REACTIVITY: Creates new objects and uses .set() to trigger SvelteMap reactivity
	 *
	 * @param classId - The class ID
	 * @param studentId - The student ID
	 * @param delta - The change amount (positive or negative)
	 */
	updateGidouillesOptimistic(classId: string, studentId: string, delta: number): void {
		const cached = this.rewardsCache.get(classId);
		if (!cached) return;

		const rewards = cached.rewards.get(studentId);
		if (!rewards) return;

		// Create new rewards object to trigger reactivity
		const newGidouilles = Math.max(0, rewards.gidouilles + delta);
		const updatedRewards: StudentRewards = {
			...rewards,
			gidouilles: newGidouilles
		};

		// Create new Map with updated student rewards
		const newRewardsMap = new SvelteMap(cached.rewards);
		newRewardsMap.set(studentId, updatedRewards);

		// Update cache with new object to trigger SvelteMap reactivity
		this.rewardsCache.set(classId, {
			...cached,
			rewards: newRewardsMap
		});

		this.log(
			'trace',
			`[Cache] Optimistic gidouilles update: student ${studentId} → ${newGidouilles}`
		);
	}

	/**
	 * Update bonus optimistically (instant UI feedback)
	 *
	 * REACTIVITY: Creates new objects and uses .set() to trigger SvelteMap reactivity
	 *
	 * @param classId - The class ID
	 * @param studentId - The student ID
	 * @param delta - The change amount (positive or negative)
	 */
	updateBonusOptimistic(classId: string, studentId: string, delta: number): void {
		const cached = this.rewardsCache.get(classId);
		if (!cached) return;

		const rewards = cached.rewards.get(studentId);
		if (!rewards) return;

		// Create new rewards object to trigger reactivity
		const newBonus = Math.max(0, (rewards.bonus ?? 0) + delta);
		const updatedRewards: StudentRewards = {
			...rewards,
			bonus: newBonus
		};

		// Create new Map with updated student rewards
		const newRewardsMap = new SvelteMap(cached.rewards);
		newRewardsMap.set(studentId, updatedRewards);

		// Update cache with new object to trigger SvelteMap reactivity
		this.rewardsCache.set(classId, {
			...cached,
			rewards: newRewardsMap
		});

		this.log('trace', `[Cache] Optimistic bonus update: student ${studentId} → ${newBonus}`);
	}

	/**
	 * Update VIP cards optimistically (instant UI feedback)
	 *
	 * REACTIVITY: SvelteMap is automatically reactive. Calling .set() will notify
	 * all $derived/$effect that read from this Map via .get()
	 *
	 * @param classId - The class ID
	 * @param studentId - The student ID
	 * @param vipCards - The new VIP cards object
	 */
	updateVipCardsOptimistic(classId: string, studentId: string, vipCards: StudentVipCards): void {
		const cached = this.rewardsCache.get(classId);
		if (!cached) return;

		const rewards = cached.rewards.get(studentId);
		if (!rewards) return;

		// Create new rewards object with updated VIP cards
		const updatedRewards: StudentRewards = {
			...rewards,
			vip_cards: vipCards
		};

		// Update the SvelteMap - this automatically triggers reactivity
		// for all $derived that read via .get(studentId)
		cached.rewards.set(studentId, updatedRewards);

		this.log('trace', `[Cache] Optimistic VIP cards update: student ${studentId}`);
	}

	/**
	 * Add a VIP card optimistically (instant UI feedback)
	 *
	 * @param classId - The class ID
	 * @param studentId - The student ID
	 * @param cardInstance - The new VIP card instance data
	 */
	addVipCardOptimistic(
		classId: string,
		studentId: string,
		cardInstance: { id: string; card_id: string; status: string; granted_at: string }
	): void {
		const cached = this.rewardsCache.get(classId);
		if (!cached) return;

		const rewards = cached.rewards.get(studentId);
		if (!rewards) return;

		// Add the new card to the existing vip_cards
		const currentCards = (rewards.vip_cards || {}) as StudentVipCards;
		const updatedCards: StudentVipCards = {
			...currentCards,
			[cardInstance.id]: {
				cardId: cardInstance.card_id,
				earnedAt: cardInstance.granted_at,
				usedAt: null
			}
		};

		// Update the rewards with the new cards
		const updatedRewards: StudentRewards = {
			...rewards,
			vip_cards: updatedCards
		};

		cached.rewards.set(studentId, updatedRewards);
		this.log(
			'trace',
			`[Cache] Optimistic VIP card add: student ${studentId}, card ${cardInstance.card_id}`
		);
	}

	/**
	 * Update warnings optimistically (instant UI feedback)
	 *
	 * REACTIVITY: Creates new Map and uses .set() to trigger SvelteMap reactivity
	 *
	 * @param classId - The class ID
	 * @param periodId - The academic period ID
	 * @param studentId - The student ID
	 * @param counts - The new warning counts
	 */
	updateWarningsOptimistic(
		classId: string,
		periodId: string,
		studentId: string,
		counts: StudentWarningCounts
	): void {
		const key = `${classId}:${periodId}`;
		const cached = this.warningsCache.get(key);
		if (!cached) return;

		// Update the EXISTING SvelteMap to trigger reactivity
		// (Don't create a new SvelteMap - mutate the existing one)
		cached.warnings.set(studentId, counts);

		const total = counts.C + counts.M + counts.R + counts.T;
		this.log('trace', `[Cache] Optimistic warnings update: student ${studentId}, total: ${total}`);
	}

	// ========================================================================
	// INVALIDATION
	// ========================================================================

	/**
	 * Invalidate student basic cache for a class
	 *
	 * @param classId - The class ID
	 */
	invalidateStudents(classId: string): void {
		this.studentsCache.delete(classId);
		this.log('trace', 'Cache invalidated: students for class:', classId);
	}

	/**
	 * Invalidate rewards cache for a class
	 *
	 * @param classId - The class ID
	 */
	invalidateRewards(classId: string): void {
		this.rewardsCache.delete(classId);
		this.log('trace', 'Cache invalidated: rewards for class:', classId);
	}

	/**
	 * Invalidate warnings cache for a specific class and period
	 *
	 * @param classId - The class ID
	 * @param periodId - The academic period ID
	 */
	invalidateWarnings(classId: string, periodId: string): void {
		const key = `${classId}:${periodId}`;
		this.warningsCache.delete(key);
		this.log('trace', 'Cache invalidated: warnings for class:period:', key);
	}

	/**
	 * Invalidate all warnings for a class (all periods)
	 *
	 * @param classId - The class ID
	 */
	invalidateAllWarningsForClass(classId: string): void {
		const keys = Array.from(this.warningsCache.keys());
		const deleted = keys.filter((key) => {
			if (key.startsWith(`${classId}:`)) {
				this.warningsCache.delete(key);
				return true;
			}
			return false;
		});
		this.log(
			'trace',
			'[Cache] Invalidated all warnings for class:',
			classId,
			`(${deleted.length} periods)`
		);
	}

	/**
	 * Invalidate class info cache
	 *
	 * @param classId - The class ID
	 */
	invalidateClass(classId: string): void {
		this.classesCache.delete(classId);
		this.log('trace', 'Cache invalidated: class info for:', classId);
	}

	/**
	 * Invalidate school info cache
	 *
	 * @param schoolId - The school ID
	 */
	invalidateSchool(schoolId: string): void {
		this.schoolCache.delete(schoolId);
		this.log('trace', 'Cache invalidated: school info for:', schoolId);
	}

	/**
	 * Clear all caches
	 */
	invalidateAll(): void {
		this.studentsCache.clear();
		this.rewardsCache.clear();
		this.warningsCache.clear();
		this.classesCache.clear();
		this.schoolCache.clear();
		this.log('trace', 'Cache: All caches cleared');
	}

	// ========================================================================
	// API FETCH METHODS
	// ========================================================================

	/**
	 * Fetch student basic info from API
	 * @private
	 */
	private async fetchStudentBasic(classId: string): Promise<BasicStudent[]> {
		try {
			const response = await fetch(`/api/classes/${classId}/students`, {
				credentials: 'include'
			});
			if (!response.ok) {
				throw new Error(`Failed to fetch students: ${response.statusText}`);
			}
			const data = await response.json();
			return data.students || [];
		} catch (error) {
			console.error('[Cache] Error fetching student basic:', error);
			return [];
		}
	}

	/**
	 * Fetch student rewards from API
	 * Returns SvelteMap for reactive data
	 * @private
	 */
	private async fetchStudentRewards(classId: string): Promise<SvelteMap<string, StudentRewards>> {
		try {
			const response = await fetch(`/api/classes/${classId}/gidouilles`, {
				credentials: 'include'
			});
			if (!response.ok) {
				throw new Error(`Failed to fetch rewards: ${response.statusText}`);
			}
			const data = await response.json();
			const rewardsMap = new SvelteMap<string, StudentRewards>();

			for (const item of data.gidouilles || []) {
				rewardsMap.set(item.student_id, {
					gidouilles: item.gidouilles || 0,
					bonus: item.bonus || 0,
					vip_cards: item.vip_cards || {}
				});
			}

			return rewardsMap;
		} catch (error) {
			console.error('[Cache] Error fetching rewards:', error);
			return new SvelteMap();
		}
	}

	/**
	 * Fetch student warnings from API
	 * Returns SvelteMap for reactive data
	 * @private
	 */
	private async fetchStudentWarnings(
		classId: string,
		periodId: string
	): Promise<SvelteMap<string, StudentWarningCounts>> {
		try {
			const response = await fetch(`/api/classes/${classId}/warnings?period_id=${periodId}`, {
				credentials: 'include'
			});
			if (!response.ok) {
				throw new Error(`Failed to fetch warnings: ${response.statusText}`);
			}
			const data = await response.json();
			const warningsMap = new SvelteMap<string, StudentWarningCounts>();

			for (const [studentId, counts] of Object.entries(data.warnings || {})) {
				warningsMap.set(studentId, counts as StudentWarningCounts);
			}

			return warningsMap;
		} catch (error) {
			console.error('[Cache] Error fetching warnings:', error);
			return new SvelteMap();
		}
	}

	/**
	 * Fetch class info from API
	 * NOTE: This currently throws an error as the endpoint doesn't exist yet.
	 * For now, class info will be populated via hydration from load functions.
	 * @private
	 */
	private async fetchClassInfo(_classId: string): Promise<ClassInfo> {
		console.warn('[Cache] fetchClassInfo not implemented yet - use hydration instead');
		throw new Error('Class info fetch not implemented - use hydrateClassInfo() instead');
	}

	/**
	 * Fetch school info from API
	 * NOTE: This currently throws an error as the endpoint doesn't exist yet.
	 * For now, school info will be populated via hydration from load functions.
	 * @private
	 */
	private async fetchSchoolInfo(_schoolId: string): Promise<SchoolInfo> {
		console.warn('[Cache] fetchSchoolInfo not implemented yet - use hydration instead');
		throw new Error('School info fetch not implemented - use hydrateSchoolInfo() instead');
	}

	// ========================================================================
	// HYDRATION METHODS (for pre-filling cache from load functions)
	// ========================================================================

	/**
	 * Hydrate student basic cache from load function data
	 *
	 * @param classId - The class ID
	 * @param students - Array of student data from load function
	 */
	hydrateStudents(classId: string, students: BasicStudent[]): void {
		this.studentsCache.set(classId, {
			students,
			fetchedAt: Date.now()
		});
		this.log(
			'trace',
			`[Cache] Hydrated students for class ${classId}: ${students.length} students`
		);
	}

	/**
	 * Hydrate rewards cache from load function data
	 *
	 * Uses SvelteMap for reactive rewards data
	 *
	 * @param classId - The class ID
	 * @param students - Array of students with gidouilles, bonus, and vip_cards
	 */
	hydrateRewards(
		classId: string,
		students: Array<{ id: string; gidouilles: number; bonus: number; vip_cards: StudentVipCards }>
	): void {
		const rewardsMap = new SvelteMap<string, StudentRewards>();

		for (const student of students) {
			rewardsMap.set(student.id, {
				gidouilles: student.gidouilles,
				bonus: student.bonus,
				vip_cards: student.vip_cards
			});
		}

		this.rewardsCache.set(classId, {
			rewards: rewardsMap,
			fetchedAt: Date.now()
		});

		this.log('trace', `[Cache] Hydrated rewards for class ${classId}: ${students.length} students`);
	}

	/**
	 * Hydrate warnings cache from load function data
	 *
	 * Converts regular Map to SvelteMap for reactive warnings data
	 *
	 * @param classId - The class ID
	 * @param periodId - The academic period ID
	 * @param warningsMap - Map of studentId → warning counts
	 */
	hydrateWarnings(
		classId: string,
		periodId: string,
		warningsMap: Map<string, StudentWarningCounts>
	): void {
		const key = `${classId}:${periodId}`;

		// Convert regular Map to SvelteMap for reactivity
		const reactiveWarningsMap = new SvelteMap(warningsMap);

		this.warningsCache.set(key, {
			warnings: reactiveWarningsMap,
			fetchedAt: Date.now()
		});

		this.log(
			'trace',
			`[Cache] Hydrated warnings for class:period ${key}: ${warningsMap.size} students`
		);
	}

	/**
	 * Hydrate class info cache
	 *
	 * @param classId - The class ID
	 * @param classInfo - Class information object
	 */
	hydrateClassInfo(classId: string, classInfo: ClassInfo): void {
		this.classesCache.set(classId, {
			classInfo,
			fetchedAt: Date.now()
		});

		this.log('trace', `[Cache] Hydrated class info for class ${classId}`);
	}

	/**
	 * Hydrate cache with all teacher classes
	 *
	 * Accepts ClassWithData array and hydrates Cache 3 for each class
	 *
	 * @param classes - Array of class data to cache
	 */
	hydrateAllClasses(classes: ClassWithData[]): void {
		for (const classData of classes) {
			this.hydrateClassInfo(classData.id, classData);
		}
		this.log('trace', `[Cache] Hydrated ${classes.length} classes`);
	}

	/**
	 * Hydrate school info cache
	 *
	 * @param schoolId - The school ID
	 * @param schoolInfo - School information object
	 */
	hydrateSchoolInfo(schoolId: string, schoolInfo: SchoolInfo): void {
		this.schoolCache.set(schoolId, {
			schoolInfo,
			fetchedAt: Date.now()
		});

		this.log('trace', `[Cache] Hydrated school info for school ${schoolId}`);
	}

	// ========================================================================
	// PERIODS CACHE
	// ========================================================================

	/**
	 * Set periods in cache (currentPeriod + allPeriods)
	 * Key: schoolId
	 */
	setPeriods(schoolId: string, currentPeriod: unknown | null, allPeriods: unknown[]): void {
		this.periodsCache.set(schoolId, {
			currentPeriod,
			allPeriods,
			cachedAt: Date.now()
		});
		this.log('trace', `[Cache] Periods stored for school ${schoolId}`);
	}

	/**
	 * Get periods from cache (sync, reactive)
	 * Returns null if not cached or expired
	 */
	getPeriodsSync(
		schoolId: string
	): { currentPeriod: unknown | null; allPeriods: unknown[] } | null {
		const cached = this.periodsCache.get(schoolId);
		if (!cached) return null;

		// Check if expired
		if (Date.now() - cached.cachedAt > this.PERIODS_TTL) {
			this.periodsCache.delete(schoolId);
			this.log('trace', `[Cache] Periods expired for school ${schoolId}`);
			return null;
		}

		return {
			currentPeriod: cached.currentPeriod,
			allPeriods: cached.allPeriods
		};
	}

	/**
	 * Invalidate periods cache
	 */
	invalidatePeriods(schoolId: string): void {
		this.periodsCache.delete(schoolId);
		this.log('trace', `[Cache] Periods invalidated for school ${schoolId}`);
	}

	// ========================================================================
	// CACHE STATISTICS
	// ========================================================================

	/**
	 * Get cache statistics for monitoring
	 *
	 * @returns Cache statistics object
	 */
	getStats(): CacheStats {
		const totalEntries =
			this.studentsCache.size +
			this.rewardsCache.size +
			this.warningsCache.size +
			this.classesCache.size +
			this.schoolCache.size +
			this.periodsCache.size;

		// Estimate memory: ~1KB per entry (rough estimate)
		const estimatedBytes = totalEntries * 1024;
		const memoryEstimate =
			estimatedBytes < 1024 * 1024
				? `${Math.round(estimatedBytes / 1024)}KB`
				: `${(estimatedBytes / (1024 * 1024)).toFixed(2)}MB`;

		return {
			students: this.studentsCache.size,
			rewards: this.rewardsCache.size,
			warnings: this.warningsCache.size,
			classes: this.classesCache.size,
			school: this.schoolCache.size,
			periods: this.periodsCache.size,
			totalEntries,
			memoryEstimate
		};
	}

	/**
	 * Log cache statistics to console
	 */
	logStats(): void {
		const stats = this.getStats();
		this.log('trace', '[Cache] Statistics:', stats);
	}
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of the teacher dashboard cache
 */
export const teacherCache = new TeacherDashboardCache();
