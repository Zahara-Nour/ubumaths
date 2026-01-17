<!--
	Teacher Assignment Preview Page
	================================
	Allows teachers to preview what students see for a worksheet assignment.
	Two modes:
	- Teacher mode: Fixed seed, all corrections visible
	- Student simulation: View as specific student
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import MySelect from '$lib/components/MySelect.svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import { getTypstService, PRIORITY } from '$lib/typst/service';
	import { generateStudentWorksheetTypst } from '$lib/worksheets/student-worksheet-typst';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		ArrowLeft,
		Eye,
		User,
		Users,
		ChevronLeft,
		ChevronRight,
		X,
		Info,
		Loader2,
		Calendar,
		CheckCircle,
		FileText,
		GraduationCap,
		ClipboardList,
		FileQuestion,
		PenLine,
		BookOpen,
		Download
	} from 'lucide-svelte';
	import type { PageData } from './$types';
	import type { StudentWorksheetView, WorksheetType } from '$lib/types/worksheets';

	let { data }: { data: PageData } = $props();

	// State
	let selectedStudentId = $state<string | null>(null);
	let worksheet = $state<StudentWorksheetView | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Preview metadata from API
	let previewMode = $state<'teacher' | 'student'>('teacher');
	let previewStudentName = $state<string | null>(null);

	// Modal state
	let modalOpen = $state(false);
	let currentExerciseIndex = $state(0);

	// PDF download state
	let isPdfLoading = $state(false);
	let showPdfDialog = $state(false);

	// Build student options for selector (sorted alphabetically)
	let studentOptions = $derived([
		{ value: '', label: 'Vue enseignant (corrections visibles)' },
		...data.students
			.map((s) => ({
				value: s.id,
				label: [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Eleve sans nom',
				description: s.class_name || undefined
			}))
			.sort((a, b) => a.label.localeCompare(b.label, 'fr'))
	]);

	// Fetch preview data when student selection changes
	async function fetchPreview() {
		loading = true;
		error = null;

		try {
			const url = new URL(
				`/api/worksheets/assignments/${data.assignmentId}/preview`,
				window.location.origin
			);
			if (selectedStudentId) {
				url.searchParams.set('studentId', selectedStudentId);
			}

			const response = await fetch(url.toString());

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
				throw new Error(errorData.message || 'Erreur lors du chargement');
			}

			const responseData = await response.json();
			worksheet = responseData as StudentWorksheetView;
			previewMode = responseData.preview_mode || 'teacher';
			previewStudentName = responseData.preview_student_name || null;
		} catch (err) {
			console.error('Error fetching preview:', err);
			error = err instanceof Error ? err.message : 'Erreur lors du chargement';
		} finally {
			loading = false;
		}
	}

	// Fetch on mount and when selection changes
	onMount(() => {
		fetchPreview();
	});

	// Track previous studentId to detect changes
	let previousStudentId = $state<string | null | undefined>(undefined);

	$effect(() => {
		// Re-fetch when student selection changes (skip initial mount, handled by onMount)
		if (previousStudentId !== undefined && selectedStudentId !== previousStudentId) {
			fetchPreview();
		}
		previousStudentId = selectedStudentId;
	});

	// PDF download functions
	function handlePdfClick() {
		if (worksheet?.show_corrections) {
			showPdfDialog = true;
		} else {
			downloadPdf(false);
		}
	}

	async function downloadPdf(includeSolution: boolean) {
		if (!worksheet) return;
		showPdfDialog = false;
		isPdfLoading = true;

		try {
			const typstContent = generateStudentWorksheetTypst(worksheet, includeSolution);
			const service = getTypstService();
			await service.initialize();

			const result = await service.compileWithPriority(
				typstContent,
				{ format: 'pdf' },
				PRIORITY.URGENT
			);

			if (!result.success || !result.data) {
				toaster.error(result.error || 'Erreur lors de la compilation PDF');
				return;
			}

			const pdfData = result.data as Uint8Array;
			const blob = new Blob([new Uint8Array(pdfData)], { type: 'application/pdf' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			const suffix = previewStudentName ? `_${previewStudentName.replace(/\s+/g, '_')}` : '';
			a.download = `${worksheet.title.replace(/[^a-zA-Z0-9]/g, '_')}${suffix}.pdf`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toaster.success('PDF telecharge !');
		} catch (err) {
			console.error('[PDF] Error during PDF generation:', err);
			toaster.error('Erreur lors de la generation du PDF');
		} finally {
			isPdfLoading = false;
		}
	}

	// Type helpers
	function getTypeInfo(type: WorksheetType): { icon: typeof FileText; label: string } {
		switch (type) {
			case 'worksheet':
				return { icon: FileText, label: 'Fiche de travail' };
			case 'assessment':
				return { icon: ClipboardList, label: 'Evaluation' };
			case 'exam':
				return { icon: GraduationCap, label: 'Examen' };
			case 'quiz':
				return { icon: FileQuestion, label: 'Quiz' };
			case 'homework':
				return { icon: PenLine, label: 'Devoir' };
			default:
				return { icon: BookOpen, label: 'Fiche' };
		}
	}

	function getTypeBadgeVariant(
		type: WorksheetType
	): 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success' {
		switch (type) {
			case 'exam':
				return 'destructive';
			case 'assessment':
				return 'warning';
			case 'homework':
				return 'default';
			case 'quiz':
				return 'secondary';
			default:
				return 'outline';
		}
	}

	function formatClosesAt(closesAt: string | null): { text: string; urgent: boolean } {
		if (!closesAt) {
			return { text: 'Disponible indefiniment', urgent: false };
		}

		const closes = new Date(closesAt);
		const now = new Date();
		const diffMs = closes.getTime() - now.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffMs < 0) {
			return { text: "N'est plus disponible", urgent: true };
		}

		if (diffDays < 7) {
			return { text: `Disponible encore ${diffDays} jour(s)`, urgent: diffDays <= 2 };
		}

		const formattedDate = closes.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long'
		});
		return { text: `Disponible jusqu'au ${formattedDate}`, urgent: false };
	}

	// Derived values
	let exercises = $derived(worksheet?.exercises ?? []);
	let currentExercise = $derived(exercises[currentExerciseIndex] ?? null);
	let hasCorrection = $derived(
		currentExercise?.correction_visible && currentExercise?.correction !== null
	);
	let canGoPrev = $derived(currentExerciseIndex > 0);
	let canGoNext = $derived(currentExerciseIndex < exercises.length - 1);
	let typeInfo = $derived(worksheet ? getTypeInfo(worksheet.type) : null);
	let typeBadgeVariant = $derived(worksheet ? getTypeBadgeVariant(worksheet.type) : 'outline');
	let closesInfo = $derived(worksheet ? formatClosesAt(worksheet.closes_at) : null);
	let TypeIcon = $derived(typeInfo?.icon ?? FileText);

	// Modal navigation
	function openExercise(index: number) {
		currentExerciseIndex = index;
		modalOpen = true;
	}

	function goPrev() {
		if (canGoPrev) currentExerciseIndex--;
	}

	function goNext() {
		if (canGoNext) currentExerciseIndex++;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowLeft' && canGoPrev) {
			e.preventDefault();
			goPrev();
		} else if (e.key === 'ArrowRight' && canGoNext) {
			e.preventDefault();
			goNext();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			modalOpen = false;
		}
	}
</script>

<svelte:head>
	<title>Previsualisation - {worksheet?.title ?? 'Chargement...'}</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Header with back button and student selector -->
	<div class="mb-6 space-y-4">
		<div class="flex items-center justify-between">
			<Button
				variant="ghost"
				href="/dashboard/teacher/contenu/worksheets/{data.worksheetId}"
				class="gap-2 pl-2"
			>
				<ArrowLeft class="h-4 w-4" />
				Retour a la feuille
			</Button>

			<!-- Preview mode badge -->
			<Badge variant={previewMode === 'teacher' ? 'default' : 'secondary'} class="gap-1">
				{#if previewMode === 'teacher'}
					<Eye class="h-3 w-3" />
					Vue enseignant
				{:else}
					<User class="h-3 w-3" />
					Vue eleve
				{/if}
			</Badge>
		</div>

		<!-- Student selector -->
		<Card.Root>
			<Card.Content class="py-4">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
					<div class="flex shrink-0 items-center gap-2 text-sm font-medium">
						<Users class="h-4 w-4 text-muted-foreground" />
						Previsualiser comme :
					</div>
					<MySelect
						type="single"
						bind:value={selectedStudentId}
						items={studentOptions}
						placeholder="Selectionnez un eleve..."
						fitContent
					/>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Loading state -->
	{#if loading}
		<div class="flex items-center justify-center py-12" role="status" aria-live="polite">
			<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
			<span class="sr-only">Chargement en cours...</span>
		</div>
	{:else if error}
		<!-- Error state -->
		<Card.Root class="border-destructive">
			<Card.Content class="py-8 text-center">
				<p class="text-destructive">{error}</p>
				<Button variant="outline" class="mt-4" onclick={fetchPreview}>Reessayer</Button>
			</Card.Content>
		</Card.Root>
	{:else if worksheet}
		<!-- Worksheet header -->
		<Card.Root class="mb-6">
			<Card.Header>
				<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
					<div class="flex flex-wrap items-center gap-2">
						<Badge variant={typeBadgeVariant}>
							<TypeIcon class="mr-1 h-3 w-3" />
							{typeInfo?.label}
						</Badge>
						{#if worksheet.show_corrections}
							<Badge variant="success">
								<CheckCircle class="mr-1 h-3 w-3" />
								Corrections disponibles
							</Badge>
						{/if}
					</div>
					<!-- PDF Download Button -->
					<Button
						onclick={handlePdfClick}
						variant="outline"
						size="sm"
						title="Telecharger en PDF"
						disabled={isPdfLoading}
					>
						{#if isPdfLoading}
							<Loader2 class="h-4 w-4 animate-spin sm:mr-2" />
							<span class="sr-only sm:not-sr-only">Generation...</span>
						{:else}
							<Download class="h-4 w-4 sm:mr-2" />
							<span class="sr-only sm:not-sr-only">PDF</span>
						{/if}
					</Button>
				</div>
				<Card.Title class="text-2xl">{worksheet.title}</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if worksheet.closes_at && closesInfo}
					<div
						class="flex items-center gap-2"
						class:text-destructive={closesInfo.urgent}
						class:text-muted-foreground={!closesInfo.urgent}
					>
						<Calendar class="h-4 w-4 flex-shrink-0" />
						<span class:font-medium={closesInfo.urgent}>{closesInfo.text}</span>
					</div>
				{/if}

				{#if worksheet.description}
					<p class="text-muted-foreground">{worksheet.description}</p>
				{/if}

				{#if worksheet.instructions}
					<div
						class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/50"
					>
						<div class="mb-2 flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
							<Info class="h-4 w-4" />
							Instructions
						</div>
						<p class="text-sm text-blue-600 dark:text-blue-400">
							{worksheet.instructions}
						</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Exercises list -->
		<div class="space-y-3">
			<h2 class="text-lg font-semibold">Exercices ({exercises.length})</h2>
			{#each exercises as exercise, i (exercise.id)}
				<button
					type="button"
					onclick={() => openExercise(i)}
					class="flex w-full items-center gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/50"
				>
					<div
						class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
					>
						<span class="text-sm font-semibold">{i + 1}</span>
					</div>
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<span class="font-medium">
								Exercice {i + 1}{#if exercise.title}: {exercise.title}{/if}
							</span>
							{#if exercise.correction_visible && exercise.correction}
								<BookOpen
									class="h-4 w-4 text-green-600 dark:text-green-500"
									aria-label="Correction disponible"
								/>
							{/if}
						</div>
						{#if exercise.tags && exercise.tags.length > 0}
							<div class="mt-1 flex flex-wrap gap-1">
								{#each exercise.tags as tag (tag)}
									<Badge variant="secondary" class="text-xs">{tag}</Badge>
								{/each}
							</div>
						{/if}
					</div>
					{#if exercise.points !== null}
						<Badge variant="outline" class="font-normal">
							{exercise.points} point{exercise.points !== 1 ? 's' : ''}
						</Badge>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<!-- Exercise Modal (simplified for teacher preview) -->
<Dialog.Root bind:open={modalOpen}>
	<Dialog.Content
		class="fixed inset-0 !top-0 !left-0 z-50 flex h-screen !max-h-none w-screen !max-w-none !translate-x-0 !translate-y-0 flex-col rounded-none border-none p-0"
		onkeydown={handleKeydown}
		showCloseButton={false}
	>
		<!-- Header -->
		<div class="flex items-center justify-between gap-4 border-b border-border bg-card px-6 py-4">
			<div class="flex items-center gap-3">
				<Dialog.Title class="flex items-center gap-3 text-xl font-semibold">
					Exercice {currentExerciseIndex + 1}{#if currentExercise?.title}: {currentExercise.title}{/if}
					{#if currentExercise?.points !== null}
						<Badge variant="outline" class="font-normal">
							{currentExercise?.points} point{currentExercise?.points !== 1 ? 's' : ''}
						</Badge>
					{/if}
				</Dialog.Title>
			</div>
			<div class="flex items-center gap-2">
				<Badge variant={previewMode === 'teacher' ? 'default' : 'secondary'} class="text-xs">
					{previewMode === 'teacher' ? 'Vue enseignant' : previewStudentName}
				</Badge>
				<Button variant="ghost" size="icon" onclick={() => (modalOpen = false)} aria-label="Fermer">
					<X class="h-5 w-5" />
				</Button>
			</div>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto p-6">
			{#if currentExercise}
				{#if currentExercise.custom_instructions}
					<div
						class="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/50"
					>
						<div class="flex items-start gap-2">
							<Info class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
							<p class="text-sm text-amber-700 dark:text-amber-300">
								{currentExercise.custom_instructions}
							</p>
						</div>
					</div>
				{/if}

				{#if hasCorrection}
					<Tabs.Root value="statement" class="w-full">
						<Tabs.List class="grid w-full grid-cols-2">
							<Tabs.Trigger value="statement">Enonce</Tabs.Trigger>
							<Tabs.Trigger value="correction">Correction</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Content value="statement" class="mt-4">
							<div class="prose prose-sm max-w-none dark:prose-invert">
								<MarkdownRenderer content={currentExercise.statement} />
							</div>
						</Tabs.Content>
						<Tabs.Content value="correction" class="mt-4">
							<div
								class="prose prose-sm max-w-none text-green-800 dark:text-green-200 dark:prose-invert"
							>
								<MarkdownRenderer content={currentExercise.correction ?? ''} />
							</div>
						</Tabs.Content>
					</Tabs.Root>
				{:else}
					<div class="prose prose-sm max-w-none dark:prose-invert">
						<MarkdownRenderer content={currentExercise.statement} />
					</div>
					{#if previewMode === 'student'}
						<div class="mt-4 rounded-md border border-muted bg-muted/50 p-3">
							<p class="text-sm text-muted-foreground">
								Les corrections ne sont pas encore disponibles pour cet eleve.
							</p>
						</div>
					{/if}
				{/if}
			{:else}
				<div class="flex flex-1 items-center justify-center p-8">
					<p class="text-muted-foreground">Exercice non disponible</p>
				</div>
			{/if}
		</div>

		<!-- Footer with navigation -->
		<div class="flex-shrink-0 border-t border-border bg-card px-6 py-3">
			<div class="flex items-center justify-between">
				<Button
					variant="outline"
					size="sm"
					onclick={goPrev}
					disabled={!canGoPrev}
					aria-label="Exercice precedent"
				>
					<ChevronLeft class="mr-1 h-4 w-4" />
					Precedent
				</Button>

				<span class="text-sm text-muted-foreground">
					{currentExerciseIndex + 1} / {exercises.length}
				</span>

				<Button
					variant="outline"
					size="sm"
					onclick={goNext}
					disabled={!canGoNext}
					aria-label="Exercice suivant"
				>
					Suivant
					<ChevronRight class="ml-1 h-4 w-4" />
				</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

<!-- PDF Download Dialog -->
<Dialog.Root bind:open={showPdfDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Telecharger en PDF</Dialog.Title>
			<Dialog.Description>Voulez-vous inclure les corrections dans le PDF ?</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="flex-col gap-2 sm:flex-row">
			<Button variant="outline" onclick={() => downloadPdf(false)}>Sans corrections</Button>
			<Button onclick={() => downloadPdf(true)}>Avec corrections</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
