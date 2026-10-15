<!--
	Copies par élève d'une affectation (ADR 0030, lot 5)
	=====================================================
	Une copie par élève visé, à son nom, dans l'ordre alphabétique : le prof
	voit le PDF (toutes les copies à la suite, ou la copie d'un élève choisi)
	avant de l'imprimer. Chaque copie est celle que l'élève reçoit (aperçu
	`…/preview?studentId=`), au niveau de guidage de l'affectation. Le PDF est
	fabriqué dans le navigateur, jamais stocké.
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import { z } from 'zod';
	import { page } from '$app/state';
	import { assignmentCopiesReturn } from '$lib/navigation/return-links';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import PdfSvgView from '$lib/components/worksheets/PdfSvgView.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Progress } from '$lib/components/ui/progress';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { AlertCircle, Download, Printer, RefreshCw } from '@lucide/svelte';
	import { getTypstCompiler, type TypstCompiler } from '$lib/typst/compiler';
	import {
		compileTypstDocument,
		fallbackWarning
	} from '$lib/typst/compiler/correction-fonts-compiler';
	import { fetchExternalImages } from '$lib/typst/image-loader';
	import { pdfPageCount } from '$lib/typst/pdf-page-count';
	import {
		clearTrackedExternalImages,
		getTrackedExternalImages
	} from '$lib/ubumark/generators/typst-generator';
	import { worksheetPdfFileName } from '$lib/worksheets/pdf-file-name';
	import { worksheetHeader } from '$lib/worksheets/worksheet-header';
	import {
		assembleStudentCopies,
		copyRecipientName,
		fetchStudentCopyViews,
		studentCopyTypst,
		type StudentCopy,
		type StudentCopyView
	} from '$lib/worksheets/student-copies';
	import type { PageData } from './$types';

	// ============================================================================
	// TYPES ET CONSTANTES
	// ============================================================================

	let { data }: { data: PageData } = $props();

	/** Valeur du sélecteur pour « toutes les copies » */
	const ALL = 'all';

	/** Ce que la page lit de la copie rendue par l'aperçu ; le reste passe tel quel */
	const copyViewSchema = z
		.object({
			worksheet_id: z.string(),
			title: z.string(),
			type: z.string(),
			exercises: z.array(z.unknown()),
			per_student_copies: z.boolean().optional()
		})
		.passthrough();

	// ============================================================================
	// ÉTAT
	// ============================================================================

	/** Où en est la préparation : copies demandées, PDF compilé, ou échec */
	let phase = $state<'fetching' | 'compiling' | 'ready' | 'error'>('fetching');
	let errorMessage = $state<string | null>(null);
	let received = $state(0);

	let copies = $state.raw<StudentCopy[]>([]);
	let sources = $state.raw<string[]>([]);
	let images = $state.raw<Map<string, Uint8Array>>(new Map());
	let compiler: TypstCompiler | null = null;

	let selected = $state<string>(ALL);
	let svg = $state('');
	let pdfBlob = $state.raw<Blob | null>(null);
	let pdfUrl = $state<string | null>(null);
	let pageCount = $state(0);
	/** La page est quittée : plus rien à mettre à jour */
	let destroyed = false;

	// ============================================================================
	// DÉRIVÉS
	// ============================================================================

	let total = $derived(data.students.length);
	// Deux parents : la fiche, ou l'aperçu de l'affectation (`?depuis=apercu`)
	let backLink = $derived(
		assignmentCopiesReturn(data.worksheetId, data.assignmentId, page.url.searchParams)
	);

	let selectItems = $derived([
		{ value: ALL, label: `Toutes les copies (${total})` },
		...data.students.map((student) => ({
			value: student.id,
			label: [copyRecipientName(student) ?? 'Élève sans nom', student.class_name]
				.filter(Boolean)
				.join(' — ')
		}))
	]);

	/** L'en-tête de la fiche n'a pas de ligne « Nom » : les copies seront anonymes */
	let nameNotPrinted = $derived.by(() => {
		const view = copies[0]?.view;
		return view ? !worksheetHeader(view.type, view).studentName : false;
	});

	// ============================================================================
	// PRÉPARATION
	// ============================================================================

	/** La copie d'un élève, telle que l'aperçu la rend */
	async function fetchView(studentId: string): Promise<StudentCopyView> {
		const url = new URL(
			`/api/worksheets/assignments/${data.assignmentId}/preview`,
			window.location.origin
		);
		url.searchParams.set('studentId', studentId);
		const response = await fetch(url.toString());
		if (!response.ok) {
			const body: unknown = await response.json().catch(() => null);
			const message =
				body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
					? body.message
					: 'Copie illisible';
			throw new Error(message);
		}
		const parsed = copyViewSchema.safeParse(await response.json().catch(() => null));
		if (!parsed.success) throw new Error('Copie illisible');
		return parsed.data as unknown as StudentCopyView;
	}

	async function prepare(): Promise<void> {
		if (total === 0) return;
		phase = 'fetching';
		errorMessage = null;
		received = 0;
		try {
			// Le compilateur se charge pendant que les copies arrivent
			const [loaded, fetched] = await Promise.all([
				getTypstCompiler(),
				fetchStudentCopyViews(data.students, fetchView, {
					onProgress: (done) => {
						received = done;
					}
				})
			]);
			if (destroyed) return;
			// L'adresse nomme la fiche : l'affectation doit en être une
			if (fetched[0] && fetched[0].view.worksheet_id !== data.worksheetId) {
				throw new Error('Cette affectation n’appartient pas à cette fiche');
			}
			compiler = loaded;
			copies = fetched;

			// Le Typst de chaque copie ; les images externes, téléchargées une fois
			clearTrackedExternalImages();
			sources = fetched.map(({ view, recipient }) => studentCopyTypst(view, recipient));
			images = await fetchExternalImages(getTrackedExternalImages());
			if (destroyed) return;
			await compileSelection();
		} catch (err) {
			if (destroyed) return;
			console.error('Copies par élève :', err);
			phase = 'error';
			errorMessage = err instanceof Error ? err.message : 'Impossible de préparer les copies';
		}
	}

	/**
	 * Les compilations passent une par une : elles partagent le compilateur et
	 * son système de fichiers virtuel (images), qu'une compilation vide en
	 * finissant (`resetShadow`)
	 */
	let compileQueue: Promise<void> = Promise.resolve();

	/** Compile la sélection (toutes les copies, ou celle d'un élève), à son tour */
	function compileSelection(): Promise<void> {
		compileQueue = compileQueue.then(compileCurrentSelection);
		return compileQueue;
	}

	async function compileCurrentSelection(): Promise<void> {
		if (destroyed || !compiler || sources.length === 0) return;
		const target = selected;
		const index = copies.findIndex((copy) => copy.recipient.id === target);
		const document =
			target === ALL || index < 0
				? assembleStudentCopies(sources)
				: assembleStudentCopies([sources[index]]);

		phase = 'compiling';
		try {
			const compiled = await compileTypstDocument(document, {
				images,
				svg: true,
				compiler
			});
			// Un autre choix est arrivé pendant la compilation : il est dans la file
			if (destroyed || target !== selected) return;
			releasePdf();
			svg = compiled.data.svg ?? '';
			pdfBlob = new Blob([compiled.data.pdf as BlobPart], { type: 'application/pdf' });
			pdfUrl = URL.createObjectURL(pdfBlob);
			pageCount = pdfPageCount(compiled.data.pdf);
			phase = 'ready';
			if (compiled.fallbackError) toaster.warning(fallbackWarning(compiled.fallbackError));
		} catch (err) {
			if (destroyed || target !== selected) return;
			console.error('Copies par élève, compilation :', err);
			phase = 'error';
			errorMessage = 'Le PDF n’a pas pu être fabriqué';
		}
	}

	function releasePdf() {
		if (pdfUrl) URL.revokeObjectURL(pdfUrl);
		pdfUrl = null;
		pdfBlob = null;
	}

	// ============================================================================
	// ACTIONS
	// ============================================================================

	function handleSelectionChange(value: string) {
		selected = value;
		compileSelection();
	}

	function fileName(): string {
		const title = copies[0]?.view.title ?? 'Fiche';
		const recipient = copies.find((copy) => copy.recipient.id === selected)?.recipient;
		const suffix = recipient ? (copyRecipientName(recipient) ?? 'eleve') : 'copies par eleve';
		return worksheetPdfFileName(title, 'worksheet', suffix);
	}

	function download() {
		if (!pdfBlob) return;
		const url = URL.createObjectURL(pdfBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = fileName();
		link.click();
		URL.revokeObjectURL(url);
	}

	function print() {
		if (!pdfUrl) return;
		const printWindow = window.open(pdfUrl, '_blank');
		printWindow?.addEventListener('load', () => printWindow.print());
	}

	onMount(() => {
		prepare();
		return () => {
			destroyed = true;
			releasePdf();
		};
	});
</script>

<svelte:head>
	<title>Copies par élève</title>
</svelte:head>

<div class="container mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
	<BackLink href={backLink.href} label={backLink.label} />

	<div class="space-y-1">
		<h1 class="text-2xl font-bold">Copies par élève</h1>
		<p class="text-muted-foreground">
			Une copie au nom de chaque élève de l’affectation, dans l’ordre alphabétique, chacune sur une
			nouvelle page. Le PDF est fabriqué dans votre navigateur, il n’est pas enregistré.
		</p>
	</div>

	{#if total === 0}
		<div class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
			Aucun élève n’est visé par cette affectation : il n’y a pas de copie à imprimer.
		</div>
	{:else}
		{#if phase === 'fetching'}
			<div class="space-y-2" aria-live="polite">
				<div class="flex items-center justify-between text-sm">
					<span>Préparation des copies…</span>
					<span class="text-muted-foreground">{received} / {total}</span>
				</div>
				<Progress value={(received / total) * 100} />
			</div>
		{/if}

		{#if phase === 'error'}
			<div class="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
				<div class="flex items-start gap-3">
					<AlertCircle class="mt-0.5 h-5 w-5 text-destructive" />
					<div class="flex-1">
						<p class="font-medium text-destructive">Les copies n’ont pas pu être préparées</p>
						<p class="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
						<Button variant="outline" size="sm" class="mt-3" onclick={prepare}>
							<RefreshCw class="mr-2 h-4 w-4" />
							Réessayer
						</Button>
					</div>
				</div>
			</div>
		{/if}

		{#if nameNotPrinted}
			<div class="flex items-start gap-3 rounded-lg border border-warning/50 bg-warning/5 p-4">
				<AlertCircle class="mt-0.5 h-5 w-5 text-warning" />
				<p class="text-sm">
					Cette fiche n’imprime pas le nom des élèves : son type n’a pas de ligne « Nom ». Pour une
					fiche d’exercices, cochez « Nom de l’élève » dans ses options. Les copies restent dans
					l’ordre alphabétique.
				</p>
			</div>
		{/if}

		<div class="flex flex-wrap items-end gap-4">
			<div class="min-w-64 space-y-2">
				<Label>Copie à afficher</Label>
				<MySelect
					type="single"
					value={selected}
					items={selectItems}
					disabled={copies.length === 0}
					triggerAriaLabel="Copie à afficher"
					onValueChange={handleSelectionChange}
				/>
			</div>
			<div class="flex flex-wrap gap-2">
				<Button onclick={download} disabled={!pdfBlob || phase !== 'ready'}>
					<Download class="mr-2 h-4 w-4" />
					Télécharger
				</Button>
				<Button variant="outline" onclick={print} disabled={!pdfUrl || phase !== 'ready'}>
					<Printer class="mr-2 h-4 w-4" />
					Imprimer
				</Button>
			</div>
			{#if phase === 'ready' && pageCount > 0}
				<span class="self-center text-sm text-muted-foreground" data-testid="apercu-pages">
					{pageCount}
					{pageCount > 1 ? 'pages' : 'page'}
				</span>
			{/if}
		</div>

		<PdfSvgView
			{svg}
			generating={phase === 'compiling'}
			generatingMessage="Fabrication du PDF…"
			emptyMessage="Les copies s’afficheront ici une fois préparées."
		/>
	{/if}
</div>
