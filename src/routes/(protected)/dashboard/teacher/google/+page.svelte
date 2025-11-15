<!--
	Google Classroom Courses Page
	==============================

	Teacher interface for browsing Google Classroom courses and coursework.
	Displays synced courses with expandable coursework listings.

	FEATURES:
	- List all synced Google Classroom courses
	- Expand/collapse course to view coursework
	- Show coursework sharing status (which UbuMaths classes)
	- Manual sync button
	- Links to Google Classroom and settings
	- Responsive card layout
	- SSR hydration for initial data

	DATA FLOW:
	1. SSR loads initial courses on server-side
	2. Client hydrates with SSR data (instant render)
	3. User can refresh/sync to update data
	4. Coursework loaded on-demand when course expanded
	5. Cached per course (no re-fetch if already loaded)

	NAVIGATION:
	- Route: /dashboard/teacher/google
	- Link from teacher dashboard sidebar
	- Link to settings: /dashboard/teacher/settings/google

	PERFORMANCE:
	- SSR hydration for fast first load
	- On-demand coursework loading (expand to load)
	- Cached coursework data (prevents duplicate fetches)
	- Optimistic UI updates during sync
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		RefreshCw,
		Settings,
		ChevronDown,
		ChevronRight,
		ExternalLink,
		FileText,
		Calendar,
		Paperclip,
		Share2,
		BookOpen
	} from 'lucide-svelte';
	import type { PageData } from './$types';
	import ShareCourseworkDialog from '$lib/components/google/ShareCourseworkDialog.svelte';
	import ManageSharedCourseworkDialog from '$lib/components/google/ManageSharedCourseworkDialog.svelte';

	// ============================================================================
	// Types
	// ============================================================================

	interface Course {
		id: string;
		googleCourseId: string;
		name: string;
		section: string | null;
		description: string | null;
		room: string | null;
		courseState: string;
		alternateLink: string;
		creationTime: string;
		updateTime: string;
	}

	interface SharedClass {
		classId: string;
		className: string;
		visible: boolean;
		categoryName: string | null;
	}

	interface Coursework {
		id: string;
		googleCourseworkId: string;
		title: string;
		description: string | null;
		state: string;
		workType: string;
		dueDate: string | null;
		dueTime: string | null;
		maxPoints: number | null;
		alternateLink: string;
		materialsCount: number;
		sharedWithClasses: SharedClass[];
	}

	interface CourseDetails {
		course: Course;
		coursework: Coursework[];
	}

	interface SyncResult {
		success: boolean;
		coursesSynced: number;
		courseworkSynced: number;
		errors: string[];
	}

	interface Props {
		data: PageData;
	}

	// ============================================================================
	// Props & State
	// ============================================================================

	let { data }: Props = $props();

	// Courses from SSR hydration
	let courses = $state<Course[]>(data.courses || []);

	// Expanded course ID (only one course expanded at a time)
	let expandedCourseId = $state<string | null>(null);

	// Coursework cache (courseId -> CourseDetails)
	let courseworkCache = $state<Map<string, CourseDetails>>(new Map());

	// Loading states
	let syncing = $state(false);
	let loadingCoursework = $state<string | null>(null);
	let refreshing = $state(false);

	// Dialog states
	let shareDialogOpen = $state(false);
	let manageDialogOpen = $state(false);
	let selectedCoursework = $state<Coursework | null>(null);

	// ============================================================================
	// API Functions
	// ============================================================================

	/**
	 * Refresh courses list from API
	 * Updates local state with latest data
	 */
	async function refreshCourses() {
		refreshing = true;
		try {
			const response = await fetch('/api/google/courses');

			if (!response.ok) {
				throw new Error('Failed to fetch courses');
			}

			const data = await response.json();
			courses = data.courses;
			toaster.success('Cours actualisés');
		} catch (error) {
			console.error('[Google Courses] Error refreshing courses:', error);
			toaster.error("Erreur lors de l'actualisation des cours");
		} finally {
			refreshing = false;
		}
	}

	/**
	 * Trigger manual sync with Google Classroom
	 * Syncs courses and coursework, then refreshes list
	 */
	async function handleSync() {
		syncing = true;
		try {
			const response = await fetch('/api/google/sync', {
				method: 'POST'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Sync failed');
			}

			const result: SyncResult = await response.json();

			// Show success/warning based on errors
			if (result.errors.length > 0) {
				toaster.warning(
					`Synchronisation terminée avec ${result.errors.length} erreur(s). ` +
						`${result.coursesSynced} cours, ${result.courseworkSynced} travaux.`
				);
			} else {
				toaster.success(
					`Synchronisation terminée : ${result.coursesSynced} cours, ${result.courseworkSynced} travaux.`
				);
			}

			// Refresh courses to show updated data
			await refreshCourses();

			// Clear coursework cache (data might have changed)
			courseworkCache.clear();
		} catch (error) {
			console.error('[Google Courses] Error syncing:', error);
			const message = error instanceof Error ? error.message : 'Erreur lors de la synchronisation';
			toaster.error(message);
		} finally {
			syncing = false;
		}
	}

	/**
	 * Fetch coursework for a specific course
	 * Results are cached to prevent duplicate requests
	 */
	async function fetchCoursework(courseId: string): Promise<void> {
		// Check cache first
		if (courseworkCache.has(courseId)) {
			console.log('[Google Courses] Using cached coursework for', courseId);
			return;
		}

		loadingCoursework = courseId;
		try {
			const response = await fetch(`/api/google/courses/${courseId}`);

			if (!response.ok) {
				throw new Error('Failed to fetch coursework');
			}

			const data: CourseDetails = await response.json();

			// Cache the result
			courseworkCache.set(courseId, data);
		} catch (error) {
			console.error('[Google Courses] Error fetching coursework:', error);
			toaster.error('Erreur lors du chargement des travaux');
		} finally {
			loadingCoursework = null;
		}
	}

	/**
	 * Toggle course expansion
	 * Loads coursework on first expand
	 */
	async function toggleCourse(courseId: string) {
		if (expandedCourseId === courseId) {
			// Collapse
			expandedCourseId = null;
		} else {
			// Expand
			expandedCourseId = courseId;

			// Load coursework if not cached
			if (!courseworkCache.has(courseId)) {
				await fetchCoursework(courseId);
			}
		}
	}

	// ============================================================================
	// Helper Functions
	// ============================================================================

	/**
	 * Format relative time (e.g., "il y a 5 minutes")
	 */
	function formatRelativeTime(isoString: string): string {
		const date = new Date(isoString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMinutes = Math.floor(diffMs / 60000);

		if (diffMinutes < 1) return "à l'instant";
		if (diffMinutes < 60) return `il y a ${diffMinutes}min`;

		const diffHours = Math.floor(diffMinutes / 60);
		if (diffHours < 24) return `il y a ${diffHours}h`;

		const diffDays = Math.floor(diffHours / 24);
		return `il y a ${diffDays}j`;
	}

	/**
	 * Format due date and time for coursework
	 */
	function formatDueDate(dueDate: string | null, dueTime: string | null): string {
		if (!dueDate) return '';

		const date = new Date(dueDate);
		let formatted = date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});

		if (dueTime) {
			// dueTime format: "HH:MM:SS" or "HH:MM"
			const [hours, minutes] = dueTime.split(':');
			formatted += ` à ${hours}:${minutes}`;
		}

		return formatted;
	}

	/**
	 * Get badge color based on course state
	 */
	function getCourseStateBadgeClass(state: string): string {
		switch (state) {
			case 'ACTIVE':
				return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
			case 'ARCHIVED':
				return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
			case 'PROVISIONED':
				return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
			default:
				return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
		}
	}

	/**
	 * Get label for course state
	 */
	function getCourseStateLabel(state: string): string {
		switch (state) {
			case 'ACTIVE':
				return 'Actif';
			case 'ARCHIVED':
				return 'Archivé';
			case 'PROVISIONED':
				return 'Provisoire';
			default:
				return state;
		}
	}

	// ============================================================================
	// Derived Values
	// ============================================================================

	// Count active vs archived courses
	let activeCourseCount = $derived(courses.filter((c) => c.courseState === 'ACTIVE').length);
	let archivedCourseCount = $derived(courses.filter((c) => c.courseState === 'ARCHIVED').length);
</script>

<svelte:head>
	<title>Google Classroom - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">Google Classroom</h1>
			<p class="mt-2 text-muted-foreground">
				Gérez vos cours et travaux synchronisés depuis Google Classroom
			</p>
		</div>

		<div class="flex flex-wrap gap-2">
			<!-- Sync Button -->
			<Button onclick={handleSync} disabled={syncing} variant="default">
				{#if syncing}
					<span class="flex items-center gap-2">
						<RefreshCw class="h-4 w-4 animate-spin" />
						Synchronisation...
					</span>
				{:else}
					<RefreshCw class="h-4 w-4" />
					Synchroniser
				{/if}
			</Button>

			<!-- Settings Link -->
			<Button href="/dashboard/teacher/settings/google" variant="outline">
				<Settings class="h-4 w-4" />
				Paramètres
			</Button>
		</div>
	</div>

	<!-- Stats Cards -->
	{#if courses.length > 0}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<Card.Root>
				<Card.Content class="pt-6">
					<div class="flex items-center gap-3">
						<div class="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
							<BookOpen class="h-5 w-5 text-blue-600 dark:text-blue-300" />
						</div>
						<div>
							<p class="text-2xl font-bold text-foreground">{courses.length}</p>
							<p class="text-sm text-muted-foreground">
								Cours synchronisé{courses.length > 1 ? 's' : ''}
							</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="pt-6">
					<div class="flex items-center gap-3">
						<div class="rounded-full bg-green-100 p-3 dark:bg-green-900">
							<Badge class="h-5 w-5 bg-transparent text-green-600 dark:text-green-300">
								<span class="text-lg font-bold">{activeCourseCount}</span>
							</Badge>
						</div>
						<div>
							<p class="text-2xl font-bold text-foreground">{activeCourseCount}</p>
							<p class="text-sm text-muted-foreground">
								Cours actif{activeCourseCount > 1 ? 's' : ''}
							</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="pt-6">
					<div class="flex items-center gap-3">
						<div class="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
							<Badge class="h-5 w-5 bg-transparent text-gray-600 dark:text-gray-300">
								<span class="text-lg font-bold">{archivedCourseCount}</span>
							</Badge>
						</div>
						<div>
							<p class="text-2xl font-bold text-foreground">{archivedCourseCount}</p>
							<p class="text-sm text-muted-foreground">
								Cours archivé{archivedCourseCount > 1 ? 's' : ''}
							</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}

	<!-- Courses List -->
	{#if refreshing}
		<!-- Loading Skeleton -->
		<div class="space-y-4">
			{#each Array(3) as _, i (i)}
				<Card.Root>
					<Card.Header>
						<Skeleton class="h-6 w-3/4" />
						<Skeleton class="h-4 w-1/2" />
					</Card.Header>
				</Card.Root>
			{/each}
		</div>
	{:else if courses.length === 0}
		<!-- Empty State -->
		<Card.Root>
			<Card.Content class="flex flex-col items-center justify-center py-12 text-center">
				<BookOpen class="mb-4 h-12 w-12 text-muted-foreground" />
				<h3 class="mb-2 text-lg font-semibold text-foreground">Aucun cours synchronisé</h3>
				<p class="mb-6 max-w-md text-muted-foreground">
					Synchronisez vos cours Google Classroom pour commencer à les gérer dans UbuMaths.
				</p>
				<div class="flex flex-col gap-2 sm:flex-row">
					<Button onclick={handleSync} disabled={syncing}>
						<RefreshCw class="h-4 w-4" />
						Synchroniser maintenant
					</Button>
					<Button href="/dashboard/teacher/settings/google" variant="outline">
						<Settings class="h-4 w-4" />
						Configurer l'intégration
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Course Cards -->
		<div class="space-y-4">
			{#each courses as course (course.id)}
				{@const isExpanded = expandedCourseId === course.id}
				{@const courseDetails = courseworkCache.get(course.id)}
				{@const isLoadingCoursework = loadingCoursework === course.id}

				<Card.Root class="transition-shadow hover:shadow-md">
					<!-- Course Header -->
					<Card.Header class="pb-4">
						<div class="flex items-start justify-between gap-4">
							<div class="min-w-0 flex-1">
								<!-- Course Title & Badges -->
								<div class="mb-2 flex flex-wrap items-center gap-2">
									<Badge class={getCourseStateBadgeClass(course.courseState)}>
										{getCourseStateLabel(course.courseState)}
									</Badge>
									{#if course.section}
										<Badge variant="outline">{course.section}</Badge>
									{/if}
								</div>

								<!-- Course Name -->
								<Card.Title class="text-xl break-words">{course.name}</Card.Title>

								<!-- Course Metadata -->
								<div class="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
									{#if course.room}
										<span>Salle : {course.room}</span>
									{/if}
									<span>Mis à jour : {formatRelativeTime(course.updateTime)}</span>
								</div>
							</div>

							<!-- External Link -->
							<Button
								href={course.alternateLink}
								target="_blank"
								rel="noopener noreferrer"
								variant="ghost"
								size="sm"
								class="shrink-0"
								aria-label="Ouvrir {course.name} dans Google Classroom"
							>
								<ExternalLink class="h-4 w-4" />
							</Button>
						</div>
					</Card.Header>

					<!-- Expand/Collapse Button -->
					<Card.Footer class="border-t border-border pt-4">
						<Button
							onclick={() => toggleCourse(course.id)}
							variant="ghost"
							class="w-full justify-between"
						>
							<span class="flex items-center gap-2">
								{#if isExpanded}
									<ChevronDown class="h-4 w-4" />
									Masquer les travaux
								{:else}
									<ChevronRight class="h-4 w-4" />
									Voir les travaux
								{/if}
							</span>

							{#if courseDetails}
								<Badge variant="secondary">
									{courseDetails.coursework.length}
								</Badge>
							{/if}
						</Button>
					</Card.Footer>

					<!-- Expanded Content: Coursework List -->
					{#if isExpanded}
						<Card.Content class="border-t border-border pt-4">
							{#if isLoadingCoursework}
								<!-- Loading Coursework -->
								<div class="space-y-3">
									{#each Array(3) as _, i (i)}
										<div class="rounded-lg border border-border p-4">
											<Skeleton class="mb-2 h-5 w-3/4" />
											<Skeleton class="h-4 w-1/2" />
										</div>
									{/each}
								</div>
							{:else if courseDetails && courseDetails.coursework.length > 0}
								<!-- Coursework List -->
								<div class="space-y-3">
									{#each courseDetails.coursework as work (work.id)}
										<div
											class="rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
										>
											<!-- Coursework Header -->
											<div class="mb-3 flex items-start justify-between gap-4">
												<div class="min-w-0 flex-1">
													<h4 class="font-semibold break-words text-foreground">
														{work.title}
													</h4>

													{#if work.description}
														<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
															{work.description}
														</p>
													{/if}
												</div>

												<!-- External Link to Coursework -->
												<Button
													href={work.alternateLink}
													target="_blank"
													rel="noopener noreferrer"
													variant="ghost"
													size="sm"
													class="shrink-0"
													aria-label="Ouvrir {work.title} dans Google Classroom"
												>
													<ExternalLink class="h-4 w-4" />
												</Button>
											</div>

											<!-- Coursework Metadata -->
											<div class="mb-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
												{#if work.dueDate}
													<span class="flex items-center gap-1">
														<Calendar class="h-4 w-4" />
														Échéance : {formatDueDate(work.dueDate, work.dueTime)}
													</span>
												{/if}

												{#if work.maxPoints !== null}
													<span>Points : {work.maxPoints}</span>
												{/if}

												{#if work.materialsCount > 0}
													<span class="flex items-center gap-1">
														<Paperclip class="h-4 w-4" />
														{work.materialsCount} fichier{work.materialsCount > 1 ? 's' : ''}
													</span>
												{/if}
											</div>

											<!-- Sharing Status -->
											{#if work.sharedWithClasses.length > 0}
												<div class="flex flex-wrap items-center gap-2">
													<span class="flex items-center gap-1 text-sm text-muted-foreground">
														<Share2 class="h-4 w-4" />
														Partagé avec :
													</span>
													{#each work.sharedWithClasses as sharedClass (sharedClass.classId)}
														<Badge variant="default" class="bg-blue-600 text-white">
															{sharedClass.className}
														</Badge>
													{/each}
													<Button
														variant="outline"
														size="sm"
														onclick={() => {
															selectedCoursework = work;
															manageDialogOpen = true;
														}}
													>
														Gérer
													</Button>
												</div>
											{:else}
												<div class="flex items-center gap-2">
													<span class="text-sm text-muted-foreground">Non partagé</span>
													<Button
														variant="outline"
														size="sm"
														onclick={() => {
															selectedCoursework = work;
															shareDialogOpen = true;
														}}
													>
														Partager
													</Button>
												</div>
											{/if}
										</div>
									{/each}
								</div>
							{:else if courseDetails}
								<!-- No Coursework -->
								<div class="py-8 text-center text-muted-foreground">
									<FileText class="mx-auto mb-2 h-8 w-8" />
									<p>Aucun travail pour ce cours</p>
								</div>
							{/if}
						</Card.Content>
					{/if}
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>

<!-- Share/Manage Dialogs -->
{#if shareDialogOpen && selectedCoursework}
	<ShareCourseworkDialog
		coursework={{
			id: selectedCoursework.id,
			title: selectedCoursework.title,
			description: selectedCoursework.description,
			courseId: expandedCourseId || ''
		}}
		existingShares={selectedCoursework.sharedWithClasses}
		onClose={() => {
			shareDialogOpen = false;
			selectedCoursework = null;
		}}
		onSuccess={async () => {
			shareDialogOpen = false;
			selectedCoursework = null;
			// Refresh coursework data for the expanded course
			if (expandedCourseId) {
				courseworkCache.delete(expandedCourseId);
				await toggleCourse(expandedCourseId);
			}
		}}
	/>
{/if}

{#if manageDialogOpen && selectedCoursework}
	<ManageSharedCourseworkDialog
		coursework={{
			id: selectedCoursework.id,
			title: selectedCoursework.title,
			courseId: expandedCourseId || '',
			sharedWithClasses: selectedCoursework.sharedWithClasses
		}}
		onClose={() => {
			manageDialogOpen = false;
			selectedCoursework = null;
		}}
		onSuccess={async () => {
			manageDialogOpen = false;
			selectedCoursework = null;
			// Refresh coursework data for the expanded course
			if (expandedCourseId) {
				courseworkCache.delete(expandedCourseId);
				await toggleCourse(expandedCourseId);
			}
		}}
	/>
{/if}
