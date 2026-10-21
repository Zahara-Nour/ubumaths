<script lang="ts">
	import {
		sanitizeForFileName,
		worksheetPdfFileName,
		type WorksheetPdfKind
	} from '$lib/worksheets/pdf-file-name';
	import { lore } from '$lib/config/lore';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Progress } from '$lib/components/ui/progress';
	import MySelect from '$lib/components/MySelect.svelte';
	import CodeViewer from '$lib/components/CodeViewer.svelte';
	import PdfSvgView from './PdfSvgView.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		FileDown,
		Eye,
		Users,
		Download,
		Loader2,
		CheckCircle,
		AlertCircle,
		Printer,
		RefreshCw,
		Code,
		Copy,
		FileCode
	} from '@lucide/svelte';
	import { generateWorksheetTypst } from '$lib/typst/generators';
	import { documentFromTeacherCopy } from '$lib/worksheets/document/teacher-adapter';
	import { renderMarkdownPreview } from '$lib/worksheets/document/render-exercise';
	import {
		clearTrackedExternalImages,
		getTrackedExternalImages
	} from '$lib/ubumark/generators/typst-generator';
	import { fetchExternalImages } from '$lib/typst/image-loader';
	import { pdfPageCount } from '$lib/typst/pdf-page-count';
	import {
		compileTypstDocument,
		fallbackWarning
	} from '$lib/typst/compiler/correction-fonts-compiler';
	import type { WorksheetWithRelations, InstanceData } from '$lib/types/worksheets';
	import { worksheetLocale } from '$lib/types/worksheets';
	import { documentLabels } from '$lib/typst/labels';
	import { buildWorksheetCopy, GUIDANCE_LEVEL_ITEMS } from '$lib/worksheets/worksheet-copy';
	import {
		DEFAULT_GUIDANCE_LEVEL,
		isGuidanceLevel,
		type GuidanceLevel
	} from '$lib/worksheets/student-copy';
	import JSZip from 'jszip';
	import TextSizeSelect from './TextSizeSelect.svelte';
	import type { TextSize } from '$lib/typst/text-size';
	import {
		getTypstCompiler,
		type TypstCompiler,
		getCompilerError,
		resetCompilerState
	} from '$lib/typst/compiler';

	// ============================================================================
	// PROPS AND STATE
	// ============================================================================

	interface Props {
		worksheet: WorksheetWithRelations;
		classId?: string;
		students?: Array<{
			id: string;
			first_name: string | null;
			last_name: string | null;
		}>;
		/**
		 * `editor` : tout l'outillage — modes, sources markdown et Typst, lot par
		 * élève. `reader` : voir et télécharger, rien d'autre.
		 *
		 * `reader` sert au lien de consultation du cahier de texte. Ce n'est pas
		 * qu'une question d'encombrement : le mode « correction » y serait une
		 * fuite, et les onglets de source n'ont aucun sens pour une famille.
		 * Un seul réglage plutôt qu'un drapeau par bouton à masquer.
		 */
		variant?: 'editor' | 'reader';
	}

	let { worksheet, classId, students = [], variant = 'editor' }: Props = $props();

	const estLecteur = $derived(variant === 'reader');

	// Typst library state
	let typst = $state<TypstCompiler | null>(null);
	let isTypstLoading = $state(true);
	let typstError = $state<string | null>(null);

	// Preview state : les trois PDF de la fiche
	const PDF_KIND_ITEMS: { value: WorksheetPdfKind; label: string }[] = [
		{ value: 'worksheet', label: 'Fiche' },
		{ value: 'answers', label: 'Réponses' },
		{ value: 'correction', label: 'Corrigé' },
		// Chaque correction sous son énoncé (demande de David, 2026-10-14)
		{ value: 'worksheet_correction', label: 'Fiche + corrigé' }
	];
	let modeChoisi = $state<WorksheetPdfKind>('worksheet');

	// Verrou, pas simple masquage : même si un sélecteur subsistait quelque part,
	// le mode retomberait sur « fiche ».
	const mode = $derived(estLecteur ? ('worksheet' as const) : modeChoisi);
	// Ce que le générateur reçoit : « Fiche + corrigé » est une fiche, corrections sous les énoncés
	const generatorMode = $derived(mode === 'worksheet_correction' ? ('worksheet' as const) : mode);
	const inlineCorrections = $derived(mode === 'worksheet_correction');
	let selectedStudentId = $state<string | undefined>(undefined);

	// Niveau de guidage imprimé hors affectation (ADR 0023) : guidé par défaut.
	// Le lecteur du cahier public n'a pas le choix : toujours guidé.
	let niveauChoisi = $state<string>(DEFAULT_GUIDANCE_LEVEL);
	const printLevel = $derived<GuidanceLevel>(
		!estLecteur && isGuidanceLevel(niveauChoisi) ? niveauChoisi : DEFAULT_GUIDANCE_LEVEL
	);
	// Taille du texte (accessibilité) : choisie au coup par coup, jamais
	// enregistrée ; normale à chaque ouverture
	let textSize = $state<TextSize>('normal');
	let isGenerating = $state(false);
	let pdfUrl = $state<string | null>(null);
	let pdfBlob = $state<Blob | null>(null);
	let pdfFilename = $state<string>('');
	// Pages du PDF compilé (« Aperçu : N pages ») ; 0 : inconnu ou pas encore compilé
	let pageCount = $state(0);
	let svgContent = $state<string>('');
	let typstContent = $state<string>('');
	let markdownContent = $state<string>('');

	// Batch generation state
	let isBatchGenerating = $state(false);
	let batchProgress = $state(0);
	let batchTotal = $state(0);
	let batchCurrentStudent = $state<string>('');

	// Student selection items for MySelect
	let studentItems = $derived(
		students.map((s) => ({
			value: s.id,
			label: formatStudentName(s)
		}))
	);

	// Add "Preview generique" option
	let previewItems = $derived([{ value: 'generic', label: 'Apercu generique' }, ...studentItems]);

	// ============================================================================
	// LIFECYCLE
	// ============================================================================

	onMount(() => {
		loadTypstLibrary();

		// Cleanup on unmount
		return () => {
			if (pdfUrl) {
				URL.revokeObjectURL(pdfUrl);
			}
		};
	});

	// ============================================================================
	// TYPST LIBRARY LOADING
	// ============================================================================

	async function loadTypstLibrary() {
		isTypstLoading = true;
		typstError = null;

		try {
			const compiler = await getTypstCompiler();
			typst = compiler;
			typstError = null;
			isTypstLoading = false;

			// Generate initial preview
			generatePreview();
		} catch (err) {
			typstError = getCompilerError() || `Erreur d’initialisation : ${err}`;
			isTypstLoading = false;
			console.error('Typst initialization error:', err);
		}
	}

	async function retryLoadTypst() {
		resetCompilerState();
		await loadTypstLibrary();
	}

	// ============================================================================
	// INSTANCE GENERATION
	// ============================================================================

	/**
	 * La copie imprimée hors affectation (ADR 0023) : le calcul de toutes les
	 * copies, au niveau choisi, avec la graine de la fiche — la même pour tous
	 * les élèves du lot, et pour la correction générale.
	 */
	function generateSimpleInstance(ws: WorksheetWithRelations): InstanceData {
		return buildWorksheetCopy(ws, {
			assignmentId: null,
			worksheetId: ws.id,
			level: printLevel,
			individualized: false,
			locale: worksheetLocale(ws.config)
		});
	}

	/**
	 * Changer le niveau à imprimer (onglet Aperçu ou Lot) refait l'aperçu. Une
	 * génération en cours le rattrape en finissant (voir `generatePreview`).
	 */
	function handlePrintLevelChange(level: string) {
		niveauChoisi = level;
		generatePreview();
	}

	function handleTextSizeChange(size: TextSize) {
		textSize = size;
		generatePreview();
	}

	// ============================================================================
	// PDF GENERATION (CLIENT-SIDE)
	// ============================================================================

	async function generatePreview() {
		if (!worksheet || isGenerating || !typst) return;

		isGenerating = true;
		svgContent = '';
		// Le niveau de CETTE génération : changé entre-temps, on recommence
		const levelAtStart = printLevel;
		const sizeAtStart = textSize;

		// Clean up previous PDF
		if (pdfUrl) {
			URL.revokeObjectURL(pdfUrl);
			pdfUrl = null;
		}
		pdfBlob = null;
		pageCount = 0;

		try {
			// Determine student info
			const studentId =
				selectedStudentId && selectedStudentId !== 'generic' ? selectedStudentId : undefined;
			const studentName = studentId
				? formatStudentName(students.find((s) => s.id === studentId))
				: undefined;

			// Generate instance data
			const instanceData = generateSimpleInstance(worksheet);

			// Aperçu à l'écran : le même document que le PDF (ordre, numéros, corrections)
			markdownContent = renderMarkdownPreview(
				documentFromTeacherCopy({
					worksheet,
					instance: instanceData,
					config: worksheet.config || {}
				}),
				generatorMode,
				{
					inlineCorrections,
					// Comme le titre du PDF
					titleSuffix: inlineCorrections
						? ` — ${documentLabels(worksheetLocale(worksheet.config)).correction}`
						: undefined
				}
			);

			// Clear tracked images before generating Typst
			clearTrackedExternalImages();

			// Generate Typst content
			const generatedTypst = generateWorksheetTypst({
				worksheet,
				instance: instanceData,
				config: worksheet.config || {},
				mode: generatorMode,
				inlineCorrections,
				studentName,
				className: classId ? 'Classe' : undefined,
				template: worksheet.template,
				textSize
			});
			// Images externes, posées dans le système de fichiers virtuel à la compilation
			const imageData = await fetchExternalImages(getTrackedExternalImages());

			// Aperçu SVG et PDF ; le Corrigé passe par le compilateur de ses polices,
			// et retombe sur la police standard si elles échouent
			const compiled = await compileTypstDocument(generatedTypst, {
				images: imageData,
				svg: true,
				compiler: typst ?? undefined
			});
			typstContent = compiled.typst;
			svgContent = compiled.data.svg ?? '';
			pdfBlob = new Blob([compiled.data.pdf as BlobPart], { type: 'application/pdf' });
			pdfUrl = URL.createObjectURL(pdfBlob);
			pageCount = pdfPageCount(compiled.data.pdf);
			pdfFilename = worksheetPdfFileName(worksheet.title, mode, studentName);

			toaster.success('PDF genere avec succes');
			if (compiled.fallbackError) toaster.warning(fallbackWarning(compiled.fallbackError));
		} catch (err) {
			console.error('PDF generation error:', err);
			typstError = `Erreur de compilation: ${err}`;
			toaster.error('Erreur lors de la generation du PDF');
		} finally {
			isGenerating = false;
		}
		// Niveau ou taille changés pendant la génération : le changement n'est pas perdu
		if (printLevel !== levelAtStart || textSize !== sizeAtStart) {
			generatePreview();
		}
	}

	async function downloadSinglePdf() {
		if (!pdfBlob || !pdfFilename) return;

		// Create download link
		const url = URL.createObjectURL(pdfBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = pdfFilename;
		link.click();

		// Cleanup
		URL.revokeObjectURL(url);
	}

	async function printPdf() {
		if (!pdfUrl) return;

		// Open PDF in new window for printing
		const printWindow = window.open(pdfUrl, '_blank');
		if (printWindow) {
			printWindow.addEventListener('load', () => {
				printWindow.print();
			});
		}
	}

	// ============================================================================
	// BATCH PDF GENERATION (CLIENT-SIDE)
	// ============================================================================

	async function generateBatchPdfs() {
		if (!typst || isBatchGenerating || students.length === 0) return;

		isBatchGenerating = true;
		batchProgress = 0;
		batchTotal = students.length;
		batchCurrentStudent = '';

		try {
			const zip = new JSZip();
			const folderName = `${sanitizeForFileName(worksheet.title)}_${mode}`;
			const folder = zip.folder(folderName);

			if (!folder) {
				throw new Error('Impossible de créer le dossier de l’archive zip');
			}

			// Pre-fetch external images by generating a sample Typst content first
			batchCurrentStudent = 'Chargement des images...';
			clearTrackedExternalImages();

			// Generate sample Typst to collect external image URLs
			const sampleInstance = generateSimpleInstance(worksheet);
			generateWorksheetTypst({
				worksheet,
				instance: sampleInstance,
				config: worksheet.config || {},
				mode: generatorMode,
				inlineCorrections,
				studentName: formatStudentName(students[0]),
				className: classId ? 'Classe' : undefined,
				template: worksheet.template
			});

			// Images externes, téléchargées une fois pour tous les PDF
			const imageData = await fetchExternalImages(getTrackedExternalImages());
			// Première erreur de police du Corrigé : un seul avertissement pour le lot
			let firstFallbackError: string | null = null;
			const compileForBatch = async (source: string) => {
				const compiled = await compileTypstDocument(source, {
					images: imageData,
					compiler: typst ?? undefined
				});
				firstFallbackError ??= compiled.fallbackError;
				return compiled.data.pdf;
			};

			// Generate PDFs for each student
			for (let i = 0; i < students.length; i++) {
				const student = students[i];
				const studentName = formatStudentName(student);
				batchCurrentStudent = studentName;
				batchProgress = i;

				// Generate instance for this student
				const instanceData = generateSimpleInstance(worksheet);

				// Clear tracked images (to avoid memory accumulation, images are already mapped)
				clearTrackedExternalImages();

				// Generate Typst content
				const typstContent = generateWorksheetTypst({
					worksheet,
					instance: instanceData,
					config: worksheet.config || {},
					mode: generatorMode,
					inlineCorrections,
					studentName,
					className: classId ? 'Classe' : undefined,
					template: worksheet.template
				});

				const pdfData = await compileForBatch(typstContent);
				folder.file(worksheetPdfFileName(worksheet.title, mode, studentName), pdfData);
			}

			// Corrigés : un exemplaire général, sans nom d'élève (et sans énoncé)
			if (mode === 'answers' || mode === 'correction') {
				const general = mode === 'answers' ? 'REPONSES GENERALES' : 'CORRECTION GENERALE';
				batchCurrentStudent =
					mode === 'answers' ? 'Reponses generales...' : 'Correction generale...';
				const masterInstance = generateSimpleInstance(worksheet);
				clearTrackedExternalImages();
				const masterTypst = generateWorksheetTypst({
					worksheet,
					instance: masterInstance,
					config: worksheet.config || {},
					mode: generatorMode,
					studentName: general,
					className: classId ? 'Classe' : undefined,
					template: worksheet.template
				});
				const masterPdf = await compileForBatch(masterTypst);
				folder.file(`00_${general.replace(' ', '_')}.pdf`, masterPdf);
			}

			// Add summary document
			const summary = generateBatchSummary();
			folder.file('00_SOMMAIRE.txt', summary);

			batchProgress = batchTotal;
			batchCurrentStudent = 'Creation du fichier ZIP...';

			// Generate zip file
			const zipData = await zip.generateAsync({
				type: 'blob',
				compression: 'DEFLATE',
				compressionOptions: { level: 6 }
			});

			// Download zip
			const url = URL.createObjectURL(zipData);
			const link = document.createElement('a');
			link.href = url;
			link.download = `${folderName}.zip`;
			link.click();
			URL.revokeObjectURL(url);

			toaster.success(`${batchTotal} PDFs generes et telecharges avec succes`);
			if (firstFallbackError) toaster.warning(fallbackWarning(firstFallbackError));
		} catch (err) {
			console.error('Batch PDF generation error:', err);
			toaster.error('Erreur lors de la generation des PDFs en lot');
		} finally {
			isBatchGenerating = false;
			batchProgress = 0;
			batchCurrentStudent = '';
		}
	}

	function generateBatchSummary(): string {
		const date = new Date().toLocaleString('fr-FR');
		const modeLabel = PDF_KIND_ITEMS.find((item) => item.value === mode)?.label ?? 'Fiche';

		return `========================================
GENERATION BATCH DE PDFS
========================================

Feuille de travail : ${worksheet.title}
Type : ${worksheet.type}
Mode : ${modeLabel}
Date de generation : ${date}

========================================
LISTE DES ELEVES (${students.length})
========================================

${students.map((s, i) => `${i + 1}. ${formatStudentName(s)}`).join('\n')}

========================================
INFORMATIONS
========================================

- Chaque PDF est personnalise avec le nom de l'eleve
- Les ${lore.learning.exercise}s peuvent etre melangees selon la configuration
- ${
			mode === 'worksheet'
				? 'Les solutions ne sont pas incluses'
				: mode === 'worksheet_correction'
					? 'Chaque correction sous son enonce'
					: 'Sans les enonces : ' + (mode === 'answers' ? 'les reponses seules' : 'le corrige')
		}
- Generation effectuee cote client (navigateur)

========================================
`;
	}

	// ============================================================================
	// UTILITIES
	// ============================================================================

	function formatStudentName(
		student: { first_name: string | null; last_name: string | null } | undefined
	): string {
		if (!student) return '';
		const firstName = student.first_name || '';
		const lastName = student.last_name || '';
		return `${lastName} ${firstName}`.trim() || 'Eleve';
	}

	// ============================================================================
	// REACTIVE STATEMENTS
	// ============================================================================

	// Track previous values to detect changes
	let prevMode = $state<WorksheetPdfKind | null>(null);
	let prevStudentId = $state<string | null | undefined>(undefined);
	let hasInitialized = $state(false);

	// Regenerate preview when mode or student changes
	$effect(() => {
		// Capture current values to track as dependencies
		const currentMode = mode;
		const currentStudentId = selectedStudentId;

		// Skip if not yet initialized, Typst not ready, or currently generating
		if (!hasInitialized || !typst || isGenerating) return;

		// Check if mode or student actually changed
		if (currentMode !== prevMode || currentStudentId !== prevStudentId) {
			prevMode = currentMode;
			prevStudentId = currentStudentId;
			generatePreview();
		}
	});

	// Mark as initialized after Typst is ready
	$effect(() => {
		if (typst && !hasInitialized) {
			prevMode = mode;
			prevStudentId = selectedStudentId;
			hasInitialized = true;
		}
	});
</script>

<Card.Root>
	{#if !estLecteur}
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<FileDown class="h-5 w-5" />
				Generation PDF
			</Card.Title>
			<Card.Description>Generez et previsualisez les PDFs de la feuille de travail</Card.Description
			>
		</Card.Header>
	{/if}
	<Card.Content class="space-y-4">
		{#if isTypstLoading}
			<!-- Loading state -->
			<div class="flex items-center justify-center py-8">
				<div class="space-y-3 text-center">
					<Loader2 class="mx-auto h-8 w-8 animate-spin text-primary" />
					<p class="text-sm text-muted-foreground">Chargement du generateur PDF...</p>
				</div>
			</div>
		{:else if typstError && !typst}
			<!-- Error state (only show if Typst completely failed) -->
			<div class="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
				<div class="flex items-start gap-3">
					<AlertCircle class="mt-0.5 h-5 w-5 text-destructive" />
					<div class="flex-1">
						<p class="font-medium text-destructive">Erreur de chargement</p>
						<p class="mt-1 text-sm text-muted-foreground">{typstError}</p>
						<Button variant="outline" size="sm" class="mt-3" onclick={retryLoadTypst}>
							<RefreshCw class="mr-2 h-4 w-4" />
							Reessayer
						</Button>
					</div>
				</div>
			</div>
		{:else}
			<!-- Main content -->
			<Tabs.Root value="preview">
				{#if !estLecteur}
					<Tabs.List class="grid w-full grid-cols-4">
						<Tabs.Trigger value="preview">
							<Eye class="mr-2 h-4 w-4" />
							Apercu
						</Tabs.Trigger>
						<Tabs.Trigger value="markdown">
							<FileCode class="mr-2 h-4 w-4" />
							Markdown
						</Tabs.Trigger>
						<Tabs.Trigger value="typst">
							<Code class="mr-2 h-4 w-4" />
							Typst
						</Tabs.Trigger>
						<Tabs.Trigger value="batch">
							<Users class="mr-2 h-4 w-4" />
							Lot
						</Tabs.Trigger>
					</Tabs.List>
				{/if}

				<!-- Preview Tab -->
				<Tabs.Content value="preview" class="space-y-4">
					<!-- Controls -->
					<div class="grid gap-4 sm:grid-cols-2">
						{#if !estLecteur}
							<div class="space-y-2">
								<Label>PDF</Label>
								<MySelect
									type="single"
									bind:value={modeChoisi}
									items={PDF_KIND_ITEMS}
									disabled={isBatchGenerating}
									triggerAriaLabel="PDF à générer"
								/>
							</div>
						{/if}

						{#if !estLecteur}
							<div class="space-y-2">
								<Label>Niveau à imprimer</Label>
								<MySelect
									type="single"
									bind:value={niveauChoisi}
									items={GUIDANCE_LEVEL_ITEMS}
									triggerAriaLabel="Niveau à imprimer"
									onValueChange={handlePrintLevelChange}
								/>
							</div>
						{/if}

						<!-- Pour tous, lecteur du cahier compris : un élève malvoyant peut l'utiliser -->
						<div class="flex items-end">
							<TextSizeSelect value={textSize} onchange={handleTextSizeChange} />
						</div>

						{#if students.length > 0}
							<div class="space-y-2">
								<Label>Eleve</Label>
								<MySelect type="single" bind:value={selectedStudentId} items={previewItems} />
							</div>
						{/if}
					</div>

					<!-- Preview Actions -->
					<div class="flex flex-wrap gap-2">
						{#if !estLecteur}
							<Button onclick={generatePreview} disabled={isGenerating} variant="outline">
								{#if isGenerating}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									Generation...
								{:else}
									<RefreshCw class="mr-2 h-4 w-4" />
									Rafraichir
								{/if}
							</Button>
						{/if}

						<Button onclick={downloadSinglePdf} disabled={!pdfBlob || isGenerating}>
							<Download class="mr-2 h-4 w-4" />
							Telecharger
						</Button>

						{#if !estLecteur}
							<Button variant="outline" disabled={!pdfUrl} onclick={printPdf}>
								<Printer class="mr-2 h-4 w-4" />
								Imprimer
							</Button>
						{/if}

						<!-- Nombre de pages : régler les cadres de réponse sans imprimer pour voir -->
						{#if pageCount > 0 && !isGenerating}
							<span
								class="flex items-center gap-1 self-center text-sm {pageCount > 1
									? 'text-amber-600'
									: 'text-muted-foreground'}"
								data-testid="apercu-pages"
							>
								{#if pageCount > 1}<AlertCircle class="h-4 w-4" />{/if}
								Aperçu : {pageCount}
								{pageCount > 1 ? 'pages' : 'page'}
							</span>
						{/if}
					</div>

					{#if !estLecteur}
						<Separator />
					{/if}

					<!-- SVG Preview -->
					<PdfSvgView svg={svgContent} generating={isGenerating} />
				</Tabs.Content>

				<!-- Markdown Tab -->
				<Tabs.Content value="markdown" class="space-y-4">
					{#if markdownContent}
						<div class="flex justify-end">
							<Button
								variant="outline"
								size="sm"
								onclick={() => {
									navigator.clipboard.writeText(markdownContent);
									toaster.success('Markdown copie dans le presse-papier');
								}}
							>
								<Copy class="mr-2 h-4 w-4" />
								Copier
							</Button>
						</div>
						<CodeViewer value={markdownContent} height="500px" label="Code Markdown" />
					{:else}
						<div class="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/5 p-12">
							<div class="space-y-3 text-center">
								<FileCode class="mx-auto h-12 w-12 text-muted-foreground/50" />
								<p class="text-muted-foreground">Generez un apercu pour voir le markdown</p>
							</div>
						</div>
					{/if}
				</Tabs.Content>

				<!-- Typst Code Tab -->
				<Tabs.Content value="typst" class="space-y-4">
					{#if typstContent}
						<div class="flex justify-end">
							<Button
								variant="outline"
								size="sm"
								onclick={() => {
									navigator.clipboard.writeText(typstContent);
									toaster.success('Code Typst copie dans le presse-papier');
								}}
							>
								<Copy class="mr-2 h-4 w-4" />
								Copier
							</Button>
						</div>
						<CodeViewer value={typstContent} height="500px" label="Code Typst" />
					{:else}
						<div class="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/5 p-12">
							<div class="space-y-3 text-center">
								<Code class="mx-auto h-12 w-12 text-muted-foreground/50" />
								<p class="text-muted-foreground">Generez un apercu pour voir le code Typst</p>
							</div>
						</div>
					{/if}
				</Tabs.Content>

				<!-- Batch Tab -->
				<Tabs.Content value="batch" class="space-y-4">
					{#if students.length === 0}
						<div class="rounded-lg border border-warning/50 bg-warning/5 p-4">
							<div class="flex items-start gap-3">
								<AlertCircle class="mt-0.5 h-5 w-5 text-warning" />
								<div class="flex-1">
									<p class="font-medium">Aucun eleve disponible</p>
									<p class="mt-1 text-sm text-muted-foreground">
										La generation en lot necessite qu'un {lore.entities.class} avec des eleves soit associee
										a cette feuille de travail.
									</p>
								</div>
							</div>
						</div>
					{:else}
						<!-- Batch info -->
						<div class="rounded-lg border bg-muted/5 p-4">
							<div class="space-y-2">
								<div class="flex items-center gap-2">
									<Badge variant="secondary">{students.length} eleves</Badge>
									<Badge variant={mode === 'worksheet' ? 'outline' : 'default'}>
										PDF : {PDF_KIND_ITEMS.find((item) => item.value === mode)?.label}
									</Badge>
								</div>
								<p class="text-sm text-muted-foreground">
									Un PDF par élève, à son nom (même copie pour tous, au niveau choisi), téléchargés
									dans un fichier ZIP.
								</p>
							</div>
						</div>

						<!-- Mode selector for batch -->
						<div class="space-y-2">
							<Label>PDF à générer</Label>
							<MySelect
								type="single"
								bind:value={modeChoisi}
								items={PDF_KIND_ITEMS}
								disabled={isBatchGenerating}
								triggerAriaLabel="PDF à générer pour le lot"
							/>
						</div>

						<div class="space-y-2">
							<Label>Niveau à imprimer</Label>
							<MySelect
								type="single"
								bind:value={niveauChoisi}
								items={GUIDANCE_LEVEL_ITEMS}
								triggerAriaLabel="Niveau à imprimer"
								onValueChange={handlePrintLevelChange}
							/>
						</div>

						<!-- Batch actions -->
						<div class="flex flex-wrap gap-2">
							<Button onclick={generateBatchPdfs} disabled={isBatchGenerating}>
								{#if isBatchGenerating}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									Generation en cours...
								{:else}
									<Users class="mr-2 h-4 w-4" />
									Generer pour tous les eleves
								{/if}
							</Button>
						</div>

						<!-- Progress -->
						{#if isBatchGenerating && batchTotal > 0}
							<div class="space-y-2">
								<div class="flex items-center justify-between text-sm">
									<span class="truncate">{batchCurrentStudent}</span>
									<span class="text-muted-foreground">{batchProgress} / {batchTotal}</span>
								</div>
								<Progress value={(batchProgress / batchTotal) * 100} />
							</div>
						{/if}

						<!-- Features list -->
						<div class="space-y-3 rounded-lg border p-4">
							<h4 class="flex items-center gap-2 font-medium">
								<CheckCircle class="h-4 w-4 text-green-600" />
								Fonctionnalites incluses
							</h4>
							<ul class="space-y-1 text-sm text-muted-foreground">
								<li>- PDF personnalise avec le nom de chaque eleve</li>
								<li>- Variantes de {lore.learning.exercise}s selon la configuration</li>
								<li>- Fichier ZIP contenant tous les PDFs</li>
								<li>- Document de synthese avec la liste des eleves</li>
								{#if mode === 'worksheet_correction'}
									<li>- Chaque correction sous son enonce</li>
								{:else if mode === 'correction'}
									<li>- Correction generale incluse</li>
								{:else if mode === 'answers'}
									<li>- Reponses generales incluses</li>
								{/if}
								<li>- Generation 100% cote client (pas de serveur)</li>
							</ul>
						</div>
					{/if}
				</Tabs.Content>
			</Tabs.Root>
		{/if}
	</Card.Content>
</Card.Root>
