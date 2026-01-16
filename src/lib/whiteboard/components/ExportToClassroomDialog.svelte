<script lang="ts">
	/**
	 * ExportToClassroomDialog V2 - Simplified Export to Google Classroom
	 *
	 * Simplified workflow:
	 * - Select a class (auto-detected based on current schedule)
	 * - Select a date (default: today)
	 * - Title is auto-generated: French date format (e.g., "12 janvier 2026")
	 * - Topic is always "Notes de cours" (error if not found)
	 * - Filename: "JOIN_CODE - YYYY-MM-DD - NN.pdf"
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import MySelect from '$lib/components/MySelect.svelte';
	import {
		GraduationCap,
		Loader2,
		ExternalLink,
		AlertCircle,
		Calendar,
		Sparkles
	} from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { exportToPdf } from '../core/pdf-export';

	// ==========================================================================
	// Types
	// ==========================================================================

	interface ClassSchedule {
		id: string;
		day_of_week: number;
		start_time: string;
		end_time: string;
		period_number: number | null;
		subject: string | null;
		room: string | null;
	}

	interface ClassWithCourse {
		id: string;
		name: string;
		join_code: string;
		google_classroom_course_id: string;
		schedules: ClassSchedule[];
	}

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		/** Pre-selected class ID from parent (e.g., FileDrawer) */
		preselectedClassId?: string | null;
	}

	let { open = $bindable(false), onOpenChange, preselectedClassId = null }: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	let selectedClassId = $state<string>('');
	let selectedDate = $state(getTodayString());
	let classesWithCourse = $state<ClassWithCourse[]>([]);
	let isLoadingClasses = $state(false);
	let isExporting = $state(false);
	let classesError = $state<string | null>(null);
	let wasAutoDetected = $state(false);

	let successLink = $state<string | null>(null);
	let successClassName = $state<string | null>(null);

	// ==========================================================================
	// Derived
	// ==========================================================================

	const document = $derived(whiteboardStore.document);

	const classItems = $derived(
		classesWithCourse.map((c) => ({
			value: c.id,
			label: c.name
		}))
	);

	const selectedClass = $derived(classesWithCourse.find((c) => c.id === selectedClassId));

	/**
	 * Generate title from date in French format
	 * Example: "12 janvier 2026"
	 */
	const generatedTitle = $derived(() => {
		if (!selectedDate) return '';
		const date = new Date(selectedDate + 'T12:00:00'); // Add time to avoid timezone issues
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	});

	/**
	 * Generate filename preview
	 * Example: "6AWB - 2026-01-12 - XX.pdf"
	 */
	const filenamePreview = $derived(() => {
		if (!selectedClass || !selectedDate) return '';
		return `${selectedClass.join_code} - ${selectedDate} - XX.pdf`;
	});

	const canExport = $derived(selectedClassId && selectedDate && !isExporting && !isLoadingClasses);

	// ==========================================================================
	// Effects
	// ==========================================================================

	$effect(() => {
		if (open) {
			// Reset state when dialog opens
			successLink = null;
			successClassName = null;
			selectedDate = getTodayString();
			wasAutoDetected = false;

			// Fetch classes
			fetchClasses();
		}
	});

	// ==========================================================================
	// Handlers
	// ==========================================================================

	async function fetchClasses() {
		isLoadingClasses = true;
		classesError = null;
		selectedClassId = '';

		try {
			const response = await fetch('/api/whiteboard/classes-with-course');

			if (!response.ok) {
				if (response.status === 401) {
					classesError = 'Veuillez vous connecter.';
				} else {
					classesError = 'Impossible de charger les classes.';
				}
				return;
			}

			const data = await response.json();
			classesWithCourse = data.classes || [];

			if (classesWithCourse.length === 0) {
				classesError = "Aucune classe n'est associée à un cours Google Classroom.";
				return;
			}

			// Use preselected class if provided and valid
			if (preselectedClassId) {
				const preselected = classesWithCourse.find((c) => c.id === preselectedClassId);
				if (preselected) {
					selectedClassId = preselected.id;
					wasAutoDetected = false; // Not auto-detected, explicitly selected
					return;
				}
			}

			// Otherwise, try auto-detection based on schedule
			const detected = findCurrentSchedule(classesWithCourse);
			if (detected) {
				selectedClassId = detected.class.id;
				wasAutoDetected = true;
			}
		} catch (err) {
			console.error('[ExportToClassroom] Failed to fetch classes:', err);
			classesError = 'Erreur de connexion.';
		} finally {
			isLoadingClasses = false;
		}
	}

	/**
	 * Find current class based on schedule (adapted from timeMatching.ts)
	 */
	function findCurrentSchedule(classes: ClassWithCourse[]): { class: ClassWithCourse } | null {
		const now = new Date();
		const day = now.getDay();
		const hours = now.getHours().toString().padStart(2, '0');
		const minutes = now.getMinutes().toString().padStart(2, '0');
		const currentTime = `${hours}:${minutes}:00`;

		// Only school days (Sunday=0 to Thursday=4)
		if (day < 0 || day > 4) {
			return null;
		}

		for (const cls of classes) {
			if (!cls.schedules || cls.schedules.length === 0) {
				continue;
			}

			const matchingSchedule = cls.schedules.find(
				(schedule) =>
					schedule.day_of_week === day &&
					isWithinTimeRange(schedule.start_time, schedule.end_time, currentTime)
			);

			if (matchingSchedule) {
				return { class: cls };
			}
		}

		return null;
	}

	/**
	 * Check if current time is within schedule time range
	 */
	function isWithinTimeRange(startTime: string, endTime: string, currentTime: string): boolean {
		const timeToMinutes = (time: string): number => {
			const parts = time.split(':');
			return parseInt(parts[0]) * 60 + parseInt(parts[1]);
		};

		const current = timeToMinutes(currentTime);
		const start = timeToMinutes(startTime);
		const end = timeToMinutes(endTime);

		return current >= start && current < end;
	}

	function handleClassChange(value: string) {
		selectedClassId = value;
		wasAutoDetected = false;
	}

	// Maximum PDF size in bytes (3MB → ~4MB in base64, under Vercel's 4.5MB limit)
	const MAX_PDF_SIZE = 3 * 1024 * 1024;

	async function handleExport() {
		if (!document || !canExport || !selectedClass) return;

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

			// Check PDF size before upload
			const pdfSize = pdfResult.blob.size;
			console.log(`[ExportToClassroom] PDF size: ${(pdfSize / 1024 / 1024).toFixed(2)} MB`);

			if (pdfSize > MAX_PDF_SIZE) {
				const sizeMB = (pdfSize / 1024 / 1024).toFixed(1);
				toaster.error(
					`Le PDF est trop volumineux (${sizeMB} Mo). Maximum: 3 Mo. Essayez de réduire le nombre de pages.`
				);
				return;
			}

			// Convert blob to base64
			const pdfBase64 = await blobToBase64(pdfResult.blob);

			// Prepare request body - simplified API
			const body = {
				pdfBase64,
				classId: selectedClassId,
				date: selectedDate
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
			successClassName = selectedClass.name;
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

	function getTodayString(): string {
		const now = new Date();
		const year = now.getFullYear();
		const month = (now.getMonth() + 1).toString().padStart(2, '0');
		const day = now.getDate().toString().padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

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
			<Dialog.Description>
				Publiez ce document dans la rubrique "Notes de cours" d'un cours Google Classroom.
			</Dialog.Description>
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
					{#if successClassName}
						<p class="mt-1 text-sm text-green-600 dark:text-green-400">
							Classe : {successClassName}
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
				<!-- Class Selection -->
				<div class="space-y-2">
					<Label for="class">Classe</Label>
					{#if isLoadingClasses}
						<div class="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2 class="h-4 w-4 animate-spin" />
							Chargement des classes...
						</div>
					{:else if classesError}
						<div class="space-y-2">
							<div class="flex items-center gap-2 text-sm text-destructive">
								<AlertCircle class="h-4 w-4" />
								{classesError}
							</div>
							<p class="text-xs text-muted-foreground">
								Pour utiliser cette fonctionnalité, associez d'abord un cours Google Classroom à vos
								classes dans
								<a href="/dashboard/teacher/classes" class="text-primary hover:underline">
									Mes Classes
								</a>.
							</p>
						</div>
					{:else}
						<div class="space-y-2">
							<div class="flex items-center gap-2">
								<div class="flex-1">
									<MySelect
										type="single"
										value={selectedClassId}
										items={classItems}
										onValueChange={handleClassChange}
										placeholder="Sélectionnez une classe"
									/>
								</div>
								{#if wasAutoDetected && selectedClass}
									<div class="flex items-center gap-1 text-xs text-primary">
										<Sparkles class="h-3 w-3" />
										Auto
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<!-- Date Selection -->
				{#if !classesError && classesWithCourse.length > 0}
					<div class="space-y-2">
						<Label for="date" class="flex items-center gap-2">
							<Calendar class="h-4 w-4" />
							Date
						</Label>
						<Input id="date" type="date" bind:value={selectedDate} class="w-full" />
					</div>

					<!-- Preview -->
					{#if selectedClass && selectedDate}
						<div class="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
							<div class="text-sm">
								<span class="text-muted-foreground">Titre dans Classroom :</span>
								<span class="ml-2 font-medium">{generatedTitle()}</span>
							</div>
							<div class="text-sm">
								<span class="text-muted-foreground">Nom du fichier :</span>
								<span class="ml-2 font-mono text-xs">{filenamePreview()}</span>
							</div>
							<div class="text-sm">
								<span class="text-muted-foreground">Rubrique :</span>
								<span class="ml-2">Notes de cours</span>
							</div>
						</div>
					{/if}
				{/if}
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
