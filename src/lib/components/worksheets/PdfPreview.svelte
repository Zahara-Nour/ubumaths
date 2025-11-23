<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Progress } from '$lib/components/ui/progress';
	import MySelect from '$lib/components/MySelect.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		FileDown,
		Eye,
		Users,
		Download,
		Loader2,
		FileText,
		CheckCircle,
		AlertCircle,
		Printer,
		RefreshCw
	} from 'lucide-svelte';
	import { generateWorksheetTypst } from '$lib/worksheets/typst-generator';
	import type {
		WorksheetWithRelations,
		InstanceData,
		WorksheetExerciseWithExercise
	} from '$lib/types/worksheets';
	import JSZip from 'jszip';
	import {
		getTypstCompiler,
		type TypstCompiler,
		getCompilerError,
		resetCompilerState
	} from '$lib/worksheets/typst-compiler';

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
	}

	let { worksheet, classId, students = [] }: Props = $props();

	// Typst library state
	let typst = $state<TypstCompiler | null>(null);
	let isTypstLoading = $state(true);
	let typstError = $state<string | null>(null);

	// Preview state
	let mode = $state<'worksheet' | 'correction'>('worksheet');
	let selectedStudentId = $state<string | null>(null);
	let isGenerating = $state(false);
	let pdfUrl = $state<string | null>(null);
	let pdfBlob = $state<Blob | null>(null);
	let pdfFilename = $state<string>('');
	let svgContent = $state<string>('');

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
			typstError = getCompilerError() || `Initialization error: ${err}`;
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
	 * Generate a simple instance from worksheet exercises
	 * This creates the data structure needed for Typst generation
	 */
	function generateSimpleInstance(ws: WorksheetWithRelations, studentId?: string): InstanceData {
		const exercises = ws.exercises || [];

		// Sort exercises by position
		const sortedExercises = [...exercises].sort((a, b) => a.position - b.position);

		// Map to resolved exercises
		const resolvedExercises = sortedExercises.map((we: WorksheetExerciseWithExercise) => ({
			exercise_id: we.exercise_id,
			position: we.position,
			parameters: {},
			statement: we.exercise?.statement_md || '',
			solution: we.exercise?.solution_md || ''
		}));

		// Generate a deterministic seed based on student ID if provided
		const seed = studentId ? hashString(ws.id + studentId) : Math.floor(Math.random() * 1000000);

		return {
			exercises: resolvedExercises,
			variant_info: {
				seed,
				version: studentId ? 'student' : 'preview'
			}
		};
	}

	/**
	 * Simple hash function for deterministic seed generation
	 */
	function hashString(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return Math.abs(hash);
	}

	// ============================================================================
	// PDF GENERATION (CLIENT-SIDE)
	// ============================================================================

	async function generatePreview() {
		if (!worksheet || isGenerating || !typst) return;

		isGenerating = true;
		svgContent = '';

		// Clean up previous PDF
		if (pdfUrl) {
			URL.revokeObjectURL(pdfUrl);
			pdfUrl = null;
		}
		pdfBlob = null;

		try {
			// Determine student info
			const studentId =
				selectedStudentId && selectedStudentId !== 'generic' ? selectedStudentId : undefined;
			const studentName = studentId
				? formatStudentName(students.find((s) => s.id === studentId))
				: undefined;

			// Generate instance data
			const instanceData = generateSimpleInstance(worksheet, studentId);

			// Generate Typst content
			const typstContent = generateWorksheetTypst({
				worksheet,
				instance: instanceData,
				config: worksheet.config || {},
				mode,
				studentName,
				className: classId ? 'Classe' : undefined,
				template: worksheet.template
			});

			// Generate SVG for preview
			const svg = await typst.svg({ mainContent: typstContent });
			svgContent = svg;

			// Generate PDF
			const pdfData = await typst.pdf({ mainContent: typstContent });
			pdfBlob = new Blob([pdfData], { type: 'application/pdf' });
			pdfUrl = URL.createObjectURL(pdfBlob);

			// Set filename
			const safeName = studentName ? sanitizeFilename(studentName) : 'preview';
			pdfFilename = `${worksheet.title.replace(/[^a-zA-Z0-9]/g, '_')}_${safeName}_${mode}.pdf`;

			toaster.success('PDF genere avec succes');
		} catch (err) {
			console.error('PDF generation error:', err);
			typstError = `Erreur de compilation: ${err}`;
			toaster.error('Erreur lors de la generation du PDF');
		} finally {
			isGenerating = false;
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
			const folderName = `${worksheet.title.replace(/[^a-zA-Z0-9]/g, '_')}_${mode}`;
			const folder = zip.folder(folderName);

			if (!folder) {
				throw new Error('Failed to create zip folder');
			}

			// Generate PDFs for each student
			for (let i = 0; i < students.length; i++) {
				const student = students[i];
				const studentName = formatStudentName(student);
				batchCurrentStudent = studentName;
				batchProgress = i;

				// Generate instance for this student
				const instanceData = generateSimpleInstance(worksheet, student.id);

				// Generate Typst content
				const typstContent = generateWorksheetTypst({
					worksheet,
					instance: instanceData,
					config: worksheet.config || {},
					mode,
					studentName,
					className: classId ? 'Classe' : undefined,
					template: worksheet.template
				});

				// Compile to PDF
				const pdfData = await typst.pdf({ mainContent: typstContent });

				// Add to zip
				const filename = `${sanitizeFilename(studentName)}_${worksheet.title.replace(/[^a-zA-Z0-9]/g, '_')}_${mode}.pdf`;
				folder.file(filename, pdfData);
			}

			// If correction mode, add master correction document
			if (mode === 'correction') {
				batchCurrentStudent = 'Correction generale...';
				const masterInstance = generateSimpleInstance(worksheet);
				const masterTypst = generateWorksheetTypst({
					worksheet,
					instance: masterInstance,
					config: worksheet.config || {},
					mode: 'correction',
					studentName: 'CORRECTION GENERALE',
					className: classId ? 'Classe' : undefined,
					template: worksheet.template
				});
				const masterPdf = await typst.pdf({ mainContent: masterTypst });
				folder.file('00_CORRECTION_GENERALE.pdf', masterPdf);
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
		const modeLabel = mode === 'correction' ? 'Corrections' : 'Feuilles de travail';

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
- Les exercices peuvent etre melanges selon la configuration
- ${mode === 'correction' ? 'Les solutions sont incluses' : 'Les solutions ne sont pas incluses'}
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

	function sanitizeFilename(name: string): string {
		return name
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '') // Remove accents
			.replace(/[^a-zA-Z0-9_-]/g, '_') // Replace special chars with underscore
			.replace(/__+/g, '_') // Remove duplicate underscores
			.trim();
	}

	// ============================================================================
	// REACTIVE STATEMENTS
	// ============================================================================

	// Track previous values to detect changes
	let prevMode = $state<'worksheet' | 'correction' | null>(null);
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

	// Scale SVG to fit container
	$effect(() => {
		if (svgContent) {
			setTimeout(() => {
				const container = document.getElementById('pdf-svg-preview');
				const svgElem = container?.querySelector('svg');
				if (svgElem && container) {
					const width = Number.parseFloat(svgElem.getAttribute('width') || '0');
					const height = Number.parseFloat(svgElem.getAttribute('height') || '0');
					const containerWidth = container.clientWidth - 40;

					// Only resize if we have valid dimensions
					if (width > 0 && height > 0 && containerWidth > 0) {
						svgElem.setAttribute('width', String(containerWidth));
						svgElem.setAttribute('height', String((height * containerWidth) / width));
					}
				}
			}, 50);
		}
	});
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<FileDown class="h-5 w-5" />
			Generation PDF
		</Card.Title>
		<Card.Description>Generez et previsualisez les PDFs de la feuille de travail</Card.Description>
	</Card.Header>
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
				<Tabs.List class="grid w-full grid-cols-2">
					<Tabs.Trigger value="preview">
						<Eye class="mr-2 h-4 w-4" />
						Apercu
					</Tabs.Trigger>
					<Tabs.Trigger value="batch">
						<Users class="mr-2 h-4 w-4" />
						Generation en lot
					</Tabs.Trigger>
				</Tabs.List>

				<!-- Preview Tab -->
				<Tabs.Content value="preview" class="space-y-4">
					<!-- Controls -->
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="space-y-2">
							<Label>Mode</Label>
							<MySelect
								type="single"
								bind:value={mode}
								items={[
									{ value: 'worksheet', label: 'Feuille de travail' },
									{ value: 'correction', label: 'Correction' }
								]}
							/>
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
						<Button onclick={generatePreview} disabled={isGenerating} variant="outline">
							{#if isGenerating}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Generation...
							{:else}
								<RefreshCw class="mr-2 h-4 w-4" />
								Rafraichir
							{/if}
						</Button>

						<Button onclick={downloadSinglePdf} disabled={!pdfBlob || isGenerating}>
							<Download class="mr-2 h-4 w-4" />
							Telecharger
						</Button>

						<Button variant="outline" disabled={!pdfUrl} onclick={printPdf}>
							<Printer class="mr-2 h-4 w-4" />
							Imprimer
						</Button>
					</div>

					<Separator />

					<!-- SVG Preview -->
					<div class="relative">
						{#if isGenerating}
							<div
								class="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm"
							>
								<div class="space-y-2 text-center">
									<Loader2 class="mx-auto h-8 w-8 animate-spin text-primary" />
									<p class="text-sm text-muted-foreground">Generation du PDF...</p>
								</div>
							</div>
						{/if}

						{#if svgContent}
							<div
								id="pdf-svg-preview"
								class="min-h-[400px] overflow-auto rounded-lg border border-border bg-white p-5"
							>
								{@html svgContent}
							</div>
						{:else}
							<div
								class="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/5 p-12"
							>
								<div class="space-y-3 text-center">
									<FileText class="mx-auto h-12 w-12 text-muted-foreground/50" />
									<p class="text-muted-foreground">
										Cliquez sur "Rafraichir" pour generer un apercu
									</p>
								</div>
							</div>
						{/if}
					</div>
				</Tabs.Content>

				<!-- Batch Tab -->
				<Tabs.Content value="batch" class="space-y-4">
					{#if students.length === 0}
						<div class="border-warning/50 bg-warning/5 rounded-lg border p-4">
							<div class="flex items-start gap-3">
								<AlertCircle class="text-warning mt-0.5 h-5 w-5" />
								<div class="flex-1">
									<p class="font-medium">Aucun eleve disponible</p>
									<p class="mt-1 text-sm text-muted-foreground">
										La generation en lot necessite qu'une classe avec des eleves soit associee a
										cette feuille de travail.
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
									<Badge variant={mode === 'correction' ? 'default' : 'outline'}>
										Mode: {mode === 'correction' ? 'Corrections' : 'Feuilles de travail'}
									</Badge>
								</div>
								<p class="text-sm text-muted-foreground">
									Generez un PDF personnalise pour chaque eleve. Les PDFs seront telecharges dans un
									fichier ZIP.
								</p>
							</div>
						</div>

						<!-- Mode selector for batch -->
						<div class="space-y-2">
							<Label>Mode de generation</Label>
							<MySelect
								type="single"
								bind:value={mode}
								items={[
									{ value: 'worksheet', label: 'Feuilles de travail' },
									{ value: 'correction', label: 'Corrections' }
								]}
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
								<li>- Variantes d'exercices selon la configuration</li>
								<li>- Fichier ZIP contenant tous les PDFs</li>
								<li>- Document de synthese avec la liste des eleves</li>
								{#if mode === 'correction'}
									<li>- Correction generale incluse</li>
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
