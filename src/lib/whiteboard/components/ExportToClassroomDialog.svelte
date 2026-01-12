<script lang="ts">
	/**
	 * ExportToClassroomDialog - Export whiteboard to Google Classroom
	 *
	 * Allows exporting the current whiteboard as a PDF to a Google Classroom course.
	 * The PDF is uploaded to Google Drive and attached as a CourseWorkMaterial.
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import MySelect from '$lib/components/MySelect.svelte';
	import { GraduationCap, Loader2, ExternalLink, AlertCircle } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { exportToPdf, generateExportFilename } from '../core/pdf-export';

	// ==========================================================================
	// Types
	// ==========================================================================

	interface Course {
		id: string;
		googleCourseId: string;
		name: string;
		section: string | null;
		courseState: string;
	}

	interface Topic {
		id: string;
		googleTopicId: string;
		name: string;
	}

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(false), onOpenChange }: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	let selectedCourseId = $state<string>('');
	let selectedTopicId = $state<string>('');
	let title = $state('');
	let description = $state('');

	let courses = $state<Course[]>([]);
	let topics = $state<Topic[]>([]);

	let isLoadingCourses = $state(false);
	let isLoadingTopics = $state(false);
	let isExporting = $state(false);

	let coursesError = $state<string | null>(null);
	let topicsError = $state<string | null>(null);

	let successLink = $state<string | null>(null);
	let successCourseName = $state<string | null>(null);

	// ==========================================================================
	// Derived
	// ==========================================================================

	const document = $derived(whiteboardStore.document);

	const activeCourses = $derived(courses.filter((c) => c.courseState === 'ACTIVE'));

	const courseItems = $derived(
		activeCourses.map((c) => ({
			value: c.id,
			label: c.section ? `${c.name} - ${c.section}` : c.name
		}))
	);

	const topicItems = $derived([
		{ value: '', label: 'Aucune rubrique (racine)' },
		...topics.map((t) => ({
			value: t.id,
			label: t.name
		}))
	]);

	const canExport = $derived(
		selectedCourseId && title.trim() && !isExporting && !isLoadingCourses && !isLoadingTopics
	);

	// ==========================================================================
	// Effects
	// ==========================================================================

	$effect(() => {
		if (open) {
			// Reset state when dialog opens
			successLink = null;
			successCourseName = null;

			// Pre-fill title with document title
			if (document) {
				title = document.title || 'Sans titre';
			}

			// Fetch courses
			fetchCourses();
		}
	});

	$effect(() => {
		if (selectedCourseId) {
			// Fetch topics when course changes
			fetchTopics(selectedCourseId);
		} else {
			topics = [];
		}
	});

	// ==========================================================================
	// Handlers
	// ==========================================================================

	async function fetchCourses() {
		isLoadingCourses = true;
		coursesError = null;

		try {
			const response = await fetch('/api/google/courses');

			if (!response.ok) {
				if (response.status === 401) {
					coursesError = 'Veuillez reconnecter votre compte Google dans les Paramètres.';
				} else {
					coursesError = 'Impossible de charger les cours.';
				}
				return;
			}

			const data = await response.json();
			courses = data.courses || [];

			if (courses.length === 0) {
				coursesError = 'Aucun cours Google Classroom synchronisé.';
			}
		} catch (err) {
			console.error('[ExportToClassroom] Failed to fetch courses:', err);
			coursesError = 'Erreur de connexion.';
		} finally {
			isLoadingCourses = false;
		}
	}

	async function fetchTopics(courseId: string) {
		isLoadingTopics = true;
		topicsError = null;
		topics = [];
		selectedTopicId = '';

		try {
			const response = await fetch(`/api/google/courses/${courseId}`);

			if (!response.ok) {
				topicsError = 'Impossible de charger les rubriques.';
				return;
			}

			const data = await response.json();
			topics = data.topics || [];
		} catch (err) {
			console.error('[ExportToClassroom] Failed to fetch topics:', err);
			topicsError = 'Erreur de connexion.';
		} finally {
			isLoadingTopics = false;
		}
	}

	function handleCourseChange(value: string) {
		selectedCourseId = value;
	}

	function handleTopicChange(value: string) {
		selectedTopicId = value;
	}

	async function handleExport() {
		if (!document || !canExport) return;

		isExporting = true;

		try {
			// Export document to PDF (all pages)
			const pdfResult = await exportToPdf(document, {
				format: 'pdf',
				pages: 'all',
				includeInstruments: true
			});

			if (!pdfResult.success || !pdfResult.blob) {
				toaster.error(pdfResult.error || "Échec de l'export PDF");
				return;
			}

			// Convert blob to base64
			const pdfBase64 = await blobToBase64(pdfResult.blob);

			// Prepare request body
			const body = {
				pdfBase64,
				filename: generateExportFilename(document, 'pdf'),
				courseId: selectedCourseId,
				topicId: selectedTopicId || undefined,
				title: title.trim(),
				description: description.trim() || undefined
			};

			// Call export API
			const response = await fetch('/api/whiteboard/export-to-classroom', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const errorMessage = errorData.message || `Erreur ${response.status}`;
				toaster.error(errorMessage);
				return;
			}

			const result = await response.json();

			// Show success state
			successLink = result.alternateLink;
			successCourseName = result.courseName;
			toaster.success('Document publié sur Google Classroom');
		} catch (err) {
			console.error('[ExportToClassroom] Export failed:', err);
			toaster.error("Une erreur est survenue lors de l'export");
		} finally {
			isExporting = false;
		}
	}

	function handleClose() {
		open = false;
		onOpenChange?.(false);
	}

	function handleOpenInClassroom() {
		if (successLink) {
			window.open(successLink, '_blank', 'noopener,noreferrer');
		}
	}

	// ==========================================================================
	// Helpers
	// ==========================================================================

	function blobToBase64(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				const result = reader.result as string;
				resolve(result);
			};
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<GraduationCap class="h-5 w-5" />
				Publier sur Classroom
			</Dialog.Title>
			<Dialog.Description>Exportez ce document vers un cours Google Classroom.</Dialog.Description>
		</Dialog.Header>

		{#if successLink}
			<!-- Success State -->
			<div class="space-y-4 py-4">
				<div class="rounded-lg bg-green-50 p-4 text-center dark:bg-green-950">
					<div class="mb-2 text-green-600 dark:text-green-400">
						<GraduationCap class="mx-auto h-12 w-12" />
					</div>
					<p class="font-medium text-green-800 dark:text-green-200">
						Document publié avec succès !
					</p>
					{#if successCourseName}
						<p class="mt-1 text-sm text-green-600 dark:text-green-400">
							Dans : {successCourseName}
						</p>
					{/if}
				</div>

				<Button type="button" onclick={handleOpenInClassroom} class="w-full gap-2">
					<ExternalLink class="h-4 w-4" />
					Ouvrir dans Google Classroom
				</Button>
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={handleClose}>Fermer</Button>
			</Dialog.Footer>
		{:else}
			<!-- Form State -->
			<div class="space-y-4 py-4">
				<!-- Course Selection -->
				<div class="space-y-2">
					<Label for="course">Cours</Label>
					{#if isLoadingCourses}
						<div class="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2 class="h-4 w-4 animate-spin" />
							Chargement des cours...
						</div>
					{:else if coursesError}
						<div class="flex items-center gap-2 text-sm text-destructive">
							<AlertCircle class="h-4 w-4" />
							{coursesError}
						</div>
					{:else}
						<MySelect
							type="single"
							value={selectedCourseId}
							items={courseItems}
							onValueChange={handleCourseChange}
							placeholder="Sélectionnez un cours"
						/>
					{/if}
				</div>

				<!-- Topic Selection -->
				{#if selectedCourseId}
					<div class="space-y-2">
						<Label for="topic">Rubrique (optionnel)</Label>
						{#if isLoadingTopics}
							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 class="h-4 w-4 animate-spin" />
								Chargement des rubriques...
							</div>
						{:else if topicsError}
							<div class="flex items-center gap-2 text-sm text-destructive">
								<AlertCircle class="h-4 w-4" />
								{topicsError}
							</div>
						{:else}
							<MySelect
								type="single"
								value={selectedTopicId}
								items={topicItems}
								onValueChange={handleTopicChange}
								placeholder="Aucune rubrique"
							/>
						{/if}
					</div>
				{/if}

				<!-- Title -->
				<div class="space-y-2">
					<Label for="title">Titre</Label>
					<Input id="title" bind:value={title} placeholder="Titre du document" maxlength={500} />
				</div>

				<!-- Description -->
				<div class="space-y-2">
					<Label for="description">Description (optionnelle)</Label>
					<Textarea
						id="description"
						bind:value={description}
						placeholder="Ajouter une description..."
						rows={3}
						maxlength={5000}
					/>
				</div>
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={handleClose} disabled={isExporting}>
					Annuler
				</Button>
				<Button type="button" onclick={handleExport} disabled={!canExport} class="gap-2">
					{#if isExporting}
						<Loader2 class="h-4 w-4 animate-spin" />
						Publication...
					{:else}
						<GraduationCap class="h-4 w-4" />
						Publier
					{/if}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
