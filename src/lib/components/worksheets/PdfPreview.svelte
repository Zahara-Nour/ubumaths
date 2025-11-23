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
	import type { WorksheetWithRelations } from '$lib/types/worksheets';

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

	// Preview state
	let mode = $state<'worksheet' | 'correction'>('worksheet');
	let selectedStudentId = $state<string | null>(null);
	let isGenerating = $state(false);
	let pdfUrl = $state<string | null>(null);
	let pdfBase64 = $state<string | null>(null);
	let pdfFilename = $state<string>('');

	// Batch generation state
	let isBatchGenerating = $state(false);
	let batchProgress = $state(0);
	let batchTotal = $state(0);

	// Typst library state - using unknown since typst.js doesn't have proper types
	let typstLibrary = $state<unknown>(null);
	let isTypstLoading = $state(true);
	let typstError = $state<string | null>(null);

	// Student selection items for MySelect
	let studentItems = $derived(
		students.map((s) => ({
			value: s.id,
			label: formatStudentName(s)
		}))
	);

	// Add "Preview générique" option
	let previewItems = $derived([{ value: 'generic', label: 'Aperçu générique' }, ...studentItems]);

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
			// Load Typst.js library from CDN
			const script = document.createElement('script');
			script.type = 'module';
			script.src =
				'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst.ts/dist/esm/contrib/all-in-one-lite.bundle.js';

			await new Promise((resolve, reject) => {
				script.onload = resolve;
				script.onerror = reject;
				document.head.appendChild(script);
			});

			// Initialize Typst
			const typst = (window as { $typst?: unknown }).$typst;
			if (!typst) {
				throw new Error('Typst library not available');
			}

			typst.setCompilerInitOptions({
				getModule: () =>
					'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm'
			});

			typst.setRendererInitOptions({
				getModule: () =>
					'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm'
			});

			typstLibrary = typst;
			isTypstLoading = false;

			// Generate initial preview
			await generatePreview();
		} catch (error) {
			console.error('Failed to load Typst library:', error);
			typstError = 'Impossible de charger la bibliothèque Typst';
			isTypstLoading = false;
		}
	}

	// ============================================================================
	// PDF GENERATION
	// ============================================================================

	async function generatePreview() {
		if (!worksheet || isGenerating) return;

		isGenerating = true;

		// Clean up previous PDF
		if (pdfUrl) {
			URL.revokeObjectURL(pdfUrl);
			pdfUrl = null;
		}

		try {
			// Determine student info
			const studentName =
				selectedStudentId && selectedStudentId !== 'generic'
					? formatStudentName(students.find((s) => s.id === selectedStudentId))
					: undefined;

			// Call API to generate PDF
			const response = await fetch(`/api/worksheets/${worksheet.id}/pdf`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					mode,
					studentId:
						selectedStudentId && selectedStudentId !== 'generic' ? selectedStudentId : undefined,
					studentName,
					className: classId ? 'Classe' : undefined
				})
			});

			if (!response.ok) {
				throw new Error(`Erreur ${response.status}: ${await response.text()}`);
			}

			const data = await response.json();

			// Convert base64 to blob
			const binaryString = atob(data.pdf);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			const blob = new Blob([bytes], { type: 'application/pdf' });

			// Create URL for preview
			pdfUrl = URL.createObjectURL(blob);
			pdfBase64 = data.pdf;
			pdfFilename = data.filename;

			toaster.success('PDF généré avec succès');
		} catch (error) {
			console.error('PDF generation error:', error);
			toaster.error('Erreur lors de la génération du PDF');
		} finally {
			isGenerating = false;
		}
	}

	async function downloadSinglePdf() {
		if (!pdfBase64 || !pdfFilename) return;

		// Convert base64 to blob
		const binaryString = atob(pdfBase64);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		const blob = new Blob([bytes], { type: 'application/pdf' });

		// Create download link
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = pdfFilename;
		link.click();

		// Cleanup
		URL.revokeObjectURL(url);
	}

	async function generateBatchPdfs() {
		if (!classId || isBatchGenerating) return;

		isBatchGenerating = true;
		batchProgress = 0;
		batchTotal = students.length;

		try {
			// Call batch API
			const response = await fetch(`/api/worksheets/${worksheet.id}/pdf/batch`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					classId,
					mode
				})
			});

			if (!response.ok) {
				throw new Error(`Erreur ${response.status}: ${await response.text()}`);
			}

			// Get zip file
			const blob = await response.blob();

			// Create download link
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `${worksheet.title.replace(/[^a-zA-Z0-9]/g, '_')}_classe_${mode}.zip`;
			link.click();

			// Cleanup
			URL.revokeObjectURL(url);

			toaster.success(`${batchTotal} PDFs générés et téléchargés avec succès`);
		} catch (error) {
			console.error('Batch PDF generation error:', error);
			toaster.error('Erreur lors de la génération des PDFs en lot');
		} finally {
			isBatchGenerating = false;
			batchProgress = 0;
		}
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
		return `${lastName} ${firstName}`.trim() || 'Élève';
	}

	// ============================================================================
	// REACTIVE STATEMENTS
	// ============================================================================

	// Track previous values to detect changes
	let prevMode = $state<'worksheet' | 'correction' | null>(null);
	let prevStudentId = $state<string | null | undefined>(undefined);

	// Regenerate preview when mode or student changes (not on initial load or errors)
	$effect(() => {
		// Capture current values to track as dependencies
		const currentMode = mode;
		const currentStudentId = selectedStudentId;

		// Only regenerate if typst is ready and values have changed from previous
		if (typstLibrary && !isTypstLoading && !isGenerating) {
			// Skip if this is just initialization
			if (prevMode === null) {
				prevMode = currentMode;
				prevStudentId = currentStudentId;
				return;
			}

			// Check if mode or student actually changed
			if (currentMode !== prevMode || currentStudentId !== prevStudentId) {
				prevMode = currentMode;
				prevStudentId = currentStudentId;
				generatePreview();
			}
		}
	});
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<FileDown class="h-5 w-5" />
			Génération PDF
		</Card.Title>
		<Card.Description>Générez et prévisualisez les PDFs de la feuille de travail</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-4">
		{#if isTypstLoading}
			<!-- Loading state -->
			<div class="flex items-center justify-center py-8">
				<div class="space-y-3 text-center">
					<Loader2 class="mx-auto h-8 w-8 animate-spin text-primary" />
					<p class="text-sm text-muted-foreground">Chargement du générateur PDF...</p>
				</div>
			</div>
		{:else if typstError}
			<!-- Error state -->
			<div class="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
				<div class="flex items-start gap-3">
					<AlertCircle class="mt-0.5 h-5 w-5 text-destructive" />
					<div class="flex-1">
						<p class="font-medium text-destructive">Erreur de chargement</p>
						<p class="mt-1 text-sm text-muted-foreground">{typstError}</p>
						<Button variant="outline" size="sm" class="mt-3" onclick={loadTypstLibrary}>
							<RefreshCw class="mr-2 h-4 w-4" />
							Réessayer
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
						Aperçu
					</Tabs.Trigger>
					<Tabs.Trigger value="batch">
						<Users class="mr-2 h-4 w-4" />
						Génération en lot
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
								<Label>Élève</Label>
								<MySelect type="single" bind:value={selectedStudentId} items={previewItems} />
							</div>
						{/if}
					</div>

					<!-- Preview Actions -->
					<div class="flex flex-wrap gap-2">
						<Button onclick={generatePreview} disabled={isGenerating} variant="outline">
							{#if isGenerating}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Génération...
							{:else}
								<RefreshCw class="mr-2 h-4 w-4" />
								Rafraîchir
							{/if}
						</Button>

						<Button onclick={downloadSinglePdf} disabled={!pdfBase64 || isGenerating}>
							<Download class="mr-2 h-4 w-4" />
							Télécharger
						</Button>

						<Button variant="outline" disabled={!pdfUrl}>
							<Printer class="mr-2 h-4 w-4" />
							Imprimer
						</Button>
					</div>

					<Separator />

					<!-- PDF Preview -->
					<div class="relative">
						{#if isGenerating}
							<div
								class="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm"
							>
								<div class="space-y-2 text-center">
									<Loader2 class="mx-auto h-8 w-8 animate-spin text-primary" />
									<p class="text-sm text-muted-foreground">Génération du PDF...</p>
								</div>
							</div>
						{/if}

						{#if pdfUrl}
							<div class="overflow-hidden rounded-lg border bg-white">
								<iframe src={pdfUrl} title="Aperçu PDF" class="h-[600px] w-full" loading="lazy"
								></iframe>
							</div>
						{:else}
							<div
								class="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/5 p-12"
							>
								<div class="space-y-3 text-center">
									<FileText class="mx-auto h-12 w-12 text-muted-foreground/50" />
									<p class="text-muted-foreground">
										Cliquez sur "Rafraîchir" pour générer un aperçu
									</p>
								</div>
							</div>
						{/if}
					</div>
				</Tabs.Content>

				<!-- Batch Tab -->
				<Tabs.Content value="batch" class="space-y-4">
					{#if !classId || students.length === 0}
						<div class="border-warning/50 bg-warning/5 rounded-lg border p-4">
							<div class="flex items-start gap-3">
								<AlertCircle class="text-warning mt-0.5 h-5 w-5" />
								<div class="flex-1">
									<p class="font-medium">Aucune classe sélectionnée</p>
									<p class="mt-1 text-sm text-muted-foreground">
										La génération en lot nécessite qu'une classe soit assignée à cette feuille de
										travail.
									</p>
								</div>
							</div>
						</div>
					{:else}
						<!-- Batch info -->
						<div class="rounded-lg border bg-muted/5 p-4">
							<div class="space-y-2">
								<div class="flex items-center gap-2">
									<Badge variant="secondary">{students.length} élèves</Badge>
									<Badge variant={mode === 'correction' ? 'default' : 'outline'}>
										Mode: {mode === 'correction' ? 'Corrections' : 'Feuilles de travail'}
									</Badge>
								</div>
								<p class="text-sm text-muted-foreground">
									Générez un PDF personnalisé pour chaque élève de la classe. Les PDFs seront
									téléchargés dans un fichier ZIP.
								</p>
							</div>
						</div>

						<!-- Batch actions -->
						<div class="flex flex-wrap gap-2">
							<Button onclick={generateBatchPdfs} disabled={isBatchGenerating}>
								{#if isBatchGenerating}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									Génération en cours...
								{:else}
									<Users class="mr-2 h-4 w-4" />
									Générer pour toute la classe
								{/if}
							</Button>
						</div>

						<!-- Progress -->
						{#if isBatchGenerating && batchTotal > 0}
							<div class="space-y-2">
								<div class="flex items-center justify-between text-sm">
									<span>Progression</span>
									<span class="text-muted-foreground">{batchProgress} / {batchTotal}</span>
								</div>
								<Progress value={(batchProgress / batchTotal) * 100} />
							</div>
						{/if}

						<!-- Features list -->
						<div class="space-y-3 rounded-lg border p-4">
							<h4 class="flex items-center gap-2 font-medium">
								<CheckCircle class="h-4 w-4 text-green-600" />
								Fonctionnalités incluses
							</h4>
							<ul class="space-y-1 text-sm text-muted-foreground">
								<li>• PDF personnalisé avec le nom de chaque élève</li>
								<li>• Variantes d'exercices selon la configuration</li>
								<li>• Fichier ZIP contenant tous les PDFs</li>
								<li>• Document de synthèse avec la liste des élèves</li>
								{#if mode === 'correction'}
									<li>• Correction générale incluse</li>
								{/if}
							</ul>
						</div>
					{/if}
				</Tabs.Content>
			</Tabs.Root>
		{/if}
	</Card.Content>
</Card.Root>
