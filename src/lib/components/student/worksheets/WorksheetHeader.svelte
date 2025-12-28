<!--
	WorksheetHeader Component
	=========================
	Header section for the student worksheet detail page.
	Displays worksheet metadata including title, type, class, dates, and instructions.

	Props:
	- worksheet: StudentWorksheetView - The worksheet data from the API
-->

<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		ArrowLeft,
		Calendar,
		CheckCircle,
		FileText,
		GraduationCap,
		ClipboardList,
		FileQuestion,
		PenLine,
		BookOpen,
		Info,
		Download,
		Loader2
	} from 'lucide-svelte';
	import { getTypstService, PRIORITY } from '$lib/typst/service';
	import { generateStudentWorksheetTypst } from '$lib/worksheets/student-worksheet-typst';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { StudentWorksheetView, WorksheetType } from '$lib/types/worksheets';

	interface Props {
		worksheet: StudentWorksheetView;
	}

	let { worksheet }: Props = $props();

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
			downloadPdf(false);
		}
	}

	/**
	 * Download worksheet as PDF
	 */
	async function downloadPdf(includeSolution: boolean) {
		showPdfDialog = false;
		isPdfLoading = true;

		try {
			// Generate Typst content
			const typstContent = generateStudentWorksheetTypst(worksheet, includeSolution);

			// Compile to PDF using TypstService
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

			// Download the PDF
			const pdfData = result.data as Uint8Array;
			const blob = new Blob([new Uint8Array(pdfData)], { type: 'application/pdf' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${worksheet.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toaster.success('PDF telecharge !');
		} catch (error) {
			console.error('[PDF] Error during PDF generation:', error);
			toaster.error('Erreur lors de la generation du PDF');
		} finally {
			isPdfLoading = false;
		}
	}

	// Get icon and label for worksheet type (same logic as WorksheetCard)
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
			case 'quiz':
				return 'secondary';
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
	<!-- Back Button -->
	<Button variant="ghost" href="/dashboard/student/worksheets" class="gap-2 pl-2">
		<ArrowLeft class="h-4 w-4" />
		Retour aux fiches
	</Button>

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
			<Dialog.Description>Voulez-vous inclure les corrections dans le PDF ?</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="flex-col gap-2 sm:flex-row">
			<Button variant="outline" onclick={() => downloadPdf(false)} class="w-full sm:w-auto">
				Sans corrections
			</Button>
			<Button onclick={() => downloadPdf(true)} class="w-full sm:w-auto">Avec corrections</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
