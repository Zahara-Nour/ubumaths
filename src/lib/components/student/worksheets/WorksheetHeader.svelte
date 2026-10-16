<!--
	WorksheetHeader Component
	=========================
	Header section for the student worksheet detail page.
	Displays worksheet metadata including title, type, class, dates, and instructions.

	Props:
	- worksheet: StudentWorksheetView - The worksheet data from the API
-->

<script lang="ts">
	import { worksheetPdfFileName } from '$lib/worksheets/pdf-file-name';
	import { WORKSHEET_TYPE_LABELS } from '$lib/utils/worksheet-type-labels';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		Calendar,
		CheckCircle,
		FileText,
		GraduationCap,
		ClipboardList,
		PenLine,
		BookOpen,
		Info,
		Download,
		Loader2
	} from '@lucide/svelte';
	import { generateAndDownloadPdf } from '$lib/typst/pdf-generator';
	import {
		generateStudentWorksheetTypst,
		type StudentPdfEnding
	} from '$lib/worksheets/student-worksheet-typst';
	import { fallbackWarning } from '$lib/typst/compiler/correction-fonts-compiler';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { StudentWorksheetView, WorksheetType } from '$lib/types/worksheets';
	import TextSizeSelect from '$lib/components/worksheets/TextSizeSelect.svelte';
	import type { TextSize } from '$lib/typst/text-size';

	interface Props {
		worksheet: StudentWorksheetView;
		/** Taille du texte enregistrée pour l'élève (accessibilité) */
		textSize?: TextSize;
	}

	let { worksheet, textSize: savedTextSize = 'normal' }: Props = $props();

	// L'élève peut la changer (dérivé réassignable : le choix l'emporte jusqu'au
	// prochain chargement) ; enregistrée pour toutes ses fiches
	let textSize = $derived<TextSize>(savedTextSize);
	let isSavingTextSize = $state(false);

	let readOnly = $derived(worksheet.read_only === true);

	// PDF download state
	let isPdfLoading = $state(false);
	let showPdfDialog = $state(false);

	// ============================================================================
	// PDF DOWNLOAD
	// ============================================================================

	/**
	 * Handle PDF download button click
	 * If corrections are available, show dialog to choose
	 * Otherwise, download directly without corrections
	 */
	function handlePdfClick() {
		if (worksheet.show_corrections) {
			showPdfDialog = true;
		} else {
			downloadPdf('none');
		}
	}

	/**
	 * Télécharge la fiche en PDF, suivie de ses réponses ou de son corrigé
	 * (exercices dont la correction est visible seulement)
	 */
	async function downloadPdf(ending: StudentPdfEnding) {
		showPdfDialog = false;
		isPdfLoading = true;

		const kind = ending === 'none' ? 'worksheet' : ending;
		const result = await generateAndDownloadPdf(
			() => generateStudentWorksheetTypst(worksheet, ending, { textSize }),
			worksheetPdfFileName(worksheet.title, kind)
		);

		if (result.success) {
			toaster.success('PDF telecharge !');
			if (result.fallbackError) toaster.warning(fallbackWarning(result.fallbackError));
		} else {
			toaster.error(result.error || 'Erreur lors de la generation du PDF');
		}

		isPdfLoading = false;
	}

	/** Change la taille du texte de toutes les fiches de l'élève */
	async function handleTextSizeChange(size: TextSize) {
		const previous = textSize;
		textSize = size;
		isSavingTextSize = true;
		try {
			const response = await fetch('/api/worksheets/print-settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ textSize: size })
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			toaster.success('Taille du texte enregistrée pour toutes tes fiches');
		} catch {
			textSize = previous;
			toaster.error("La taille du texte n'a pas pu être enregistrée");
		} finally {
			isSavingTextSize = false;
		}
	}

	// Get icon and label for worksheet type (same logic as WorksheetCard)
	function getTypeInfo(type: WorksheetType): { icon: typeof FileText; label: string } {
		switch (type) {
			case 'worksheet':
				return { icon: FileText, label: WORKSHEET_TYPE_LABELS.worksheet };
			case 'assessment':
				return { icon: ClipboardList, label: WORKSHEET_TYPE_LABELS.assessment };
			case 'exam':
				return { icon: GraduationCap, label: WORKSHEET_TYPE_LABELS.exam };
			case 'homework':
				return { icon: PenLine, label: WORKSHEET_TYPE_LABELS.homework };
			default:
				return { icon: BookOpen, label: 'Fiche' };
		}
	}

	// Get badge variant for worksheet type (same logic as WorksheetCard)
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
			default:
				return 'outline';
		}
	}

	// Format closes_at date relative to now (same logic as WorksheetCard)
	function formatClosesAt(closesAt: string | null): { text: string; urgent: boolean } {
		if (!closesAt) {
			return { text: 'Disponible indefiniment', urgent: false };
		}

		const closes = new Date(closesAt);
		const now = new Date();
		const diffMs = closes.getTime() - now.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

		if (diffMs < 0) {
			return { text: "N'est plus disponible", urgent: true };
		}

		if (diffHours < 24) {
			if (diffHours < 1) {
				const diffMinutes = Math.floor(diffMs / (1000 * 60));
				return {
					text: `Disponible encore ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`,
					urgent: true
				};
			}
			return {
				text: `Disponible encore ${diffHours} heure${diffHours > 1 ? 's' : ''}`,
				urgent: true
			};
		}

		if (diffDays === 1) {
			return { text: "Disponible jusqu'a demain", urgent: true };
		}

		if (diffDays < 7) {
			return { text: `Disponible encore ${diffDays} jours`, urgent: diffDays <= 2 };
		}

		// Format as date
		const formattedDate = closes.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: closes.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
		});
		return { text: `Disponible jusqu'au ${formattedDate}`, urgent: false };
	}

	// Derived values
	let typeInfo = $derived(getTypeInfo(worksheet.type));
	let typeBadgeVariant = $derived(getTypeBadgeVariant(worksheet.type));
	let closesInfo = $derived(formatClosesAt(worksheet.closes_at));
	let TypeIcon = $derived(typeInfo.icon);
</script>

<div class="space-y-4">
	<!-- Fiche en cours : « Quitter » ; consultation seule : simple retour -->
	<BackLink
		href="/dashboard/student/worksheets"
		label={readOnly ? 'Retour aux fiches' : 'Quitter'}
		kind={readOnly ? 'back' : 'quit'}
		class="mb-0"
	/>

	<!-- Header Card -->
	<Card.Root>
		<Card.Header>
			<!-- Badges Row -->
			<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant={typeBadgeVariant}>
						<TypeIcon class="mr-1 h-3 w-3" />
						{typeInfo.label}
					</Badge>
					{#if worksheet.show_corrections}
						<Badge variant="success">
							<CheckCircle class="mr-1 h-3 w-3" />
							Corrections disponibles
						</Badge>
					{/if}
				</div>

				<TextSizeSelect
					value={textSize}
					onchange={handleTextSizeChange}
					disabled={isSavingTextSize}
				/>

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

			<!-- Title -->
			<Card.Title class="text-2xl leading-tight sm:text-3xl">{worksheet.title}</Card.Title>
		</Card.Header>

		<Card.Content class="space-y-4">
			<!-- Availability (only show if there's a deadline) -->
			{#if worksheet.closes_at}
				<div
					class="flex items-center gap-2"
					class:text-destructive={closesInfo.urgent}
					class:text-muted-foreground={!closesInfo.urgent}
				>
					<Calendar class="h-4 w-4 flex-shrink-0" />
					<span class:font-medium={closesInfo.urgent}>{closesInfo.text}</span>
				</div>
			{/if}

			<!-- Description -->
			{#if worksheet.description}
				<div class="text-muted-foreground">
					<p>{worksheet.description}</p>
				</div>
			{/if}

			<!-- Instructions -->
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
</div>

<!-- PDF Download Dialog -->
<Dialog.Root bind:open={showPdfDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Telecharger en PDF</Dialog.Title>
			<Dialog.Description>
				Ajouter à la fin les réponses seules, ou le corrigé détaillé ?
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="flex-col gap-2 sm:flex-row">
			<Button variant="outline" onclick={() => downloadPdf('none')} class="w-full sm:w-auto">
				Sans corrections
			</Button>
			<Button variant="outline" onclick={() => downloadPdf('answers')} class="w-full sm:w-auto">
				Avec réponses
			</Button>
			<Button onclick={() => downloadPdf('correction')} class="w-full sm:w-auto">
				Avec corrigé
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
