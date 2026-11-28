<!--
	Page de conversion XML InstrumenPoche
	=====================================
	Le prof importe un fichier XML InstrumenPoche et le convertit en script DSL
	de construction (seul format accepté depuis M38, 2026-11-28).
-->

<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '#lib/components/ui/button/index.ts';
	import BackLink from '#lib/components/navigation/BackLink.svelte';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import * as Tabs from '#lib/components/ui/tabs/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Collapsible from '#lib/components/ui/collapsible/index.ts';
	import MyCheckbox from '#lib/components/MyCheckbox.svelte';
	import TagsInput from '#lib/components/templates/TagsInput.svelte';
	import ConstructionPlayer from '#lib/constructions-v2/components/ConstructionPlayer.svelte';
	import { convertXmlToDsl } from '#lib/constructions-v2/converter.ts';
	import { toaster } from '#lib/stores/toaster.svelte.ts';
	import { goto } from '$app/navigation';
	import {
		Upload,
		FileCode,
		AlertTriangle,
		Play,
		Save,
		ChevronDown,
		Loader2,
		X,
		Code2
	} from '@lucide/svelte';

	// Props
	let { data }: { data: PageData } = $props();

	// Input state
	let xmlInput = $state('');
	let activeTab = $state('upload');
	let dragOver = $state(false);
	let selectedFile = $state<File | null>(null);

	// Conversion state
	let dslOutput = $state('');
	let warnings = $state<string[]>([]);
	let conversionErrors = $state<string[]>([]);
	let isConverting = $state(false);

	// Metadata state
	let title = $state('');
	let description = $state('');
	let tags = $state<string[]>([]);
	let isPublic = $state(true);

	// UI state
	let isSaving = $state(false);
	let showWarnings = $state(true);
	let showPreview = $state(false);

	// Constants
	const XML_PLACEHOLDER =
		'<INSTRUMENPOCHE version="...">\n  <action objet="point" mouvement="creer" ... />\n  ...\n</INSTRUMENPOCHE>';

	// Derived states
	let canSave = $derived(
		dslOutput.length > 0 && title.trim().length > 0 && conversionErrors.length === 0 && !isSaving
	);

	let hasContent = $derived(xmlInput.trim().length > 0 || selectedFile !== null);

	// File handling
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		const file = event.dataTransfer?.files[0];
		if (file) processFile(file);
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) processFile(file);
	}

	function processFile(file: File) {
		if (!file.name.endsWith('.xml')) {
			toaster.error('Seuls les fichiers .xml sont acceptes');
			return;
		}

		selectedFile = file;

		const reader = new FileReader();
		reader.onload = (e) => {
			xmlInput = e.target?.result as string;
			// Auto-fill title from filename
			if (!title) {
				title = file.name.replace(/\.xml$/, '');
			}
			handleConvert();
		};
		reader.onerror = () => toaster.error('Erreur lors de la lecture du fichier');
		reader.readAsText(file);
	}

	function clearFile() {
		selectedFile = null;
		xmlInput = '';
		dslOutput = '';
		warnings = [];
		conversionErrors = [];
		showPreview = false;
	}

	// Conversion
	async function handleConvert() {
		if (!xmlInput.trim()) {
			toaster.warning('Veuillez fournir du contenu XML');
			return;
		}

		isConverting = true;
		conversionErrors = [];
		warnings = [];

		try {
			const result = await convertXmlToDsl(xmlInput);
			if (result.success && result.dsl) {
				dslOutput = result.dsl;
				warnings = result.warnings;
				toaster.success('Conversion réussie');
				showPreview = true;
			} else {
				dslOutput = '';
				conversionErrors =
					result.errors.length > 0 ? result.errors : ['La conversion n’a produit aucun script'];
				toaster.error('La conversion a échoué');
			}
		} catch (err) {
			dslOutput = '';
			conversionErrors = [(err as Error).message || 'Erreur de conversion inattendue'];
			toaster.error('Erreur de conversion');
		} finally {
			isConverting = false;
		}
	}

	async function handleCopyDsl() {
		try {
			await navigator.clipboard.writeText(dslOutput);
			toaster.success('Script DSL copié');
		} catch {
			toaster.error('Copie impossible : sélectionnez le script à la main');
		}
	}

	// Save construction
	async function handleSave() {
		if (!canSave) return;

		isSaving = true;

		try {
			const response = await fetch('/api/constructions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: title.trim(),
					description: description.trim() || undefined,
					is_public: isPublic,
					tags: tags.length > 0 ? tags : undefined,
					format: 'dsl',
					dsl_script: dslOutput
				})
			});

			if (response.ok) {
				const { construction } = await response.json();
				toaster.success('Construction enregistrée');
				await goto(`/constructions/${construction.id}`);
			} else {
				const errorData = await response.json();
				toaster.error(errorData.message || "Erreur lors de l'enregistrement");
			}
		} catch (err) {
			console.error('Save error:', err);
			toaster.error('Erreur de connexion');
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Importer une construction - Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-7xl p-4 sm:p-6">
	<!-- Header -->
	<div class="mb-6">
		<BackLink href="/constructions" label="Retour aux constructions" />
		<h1 class="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
			<FileCode class="h-7 w-7 text-primary sm:h-8 sm:w-8" />
			Importer une construction InstrumenPoche
		</h1>
		<p class="mt-2 text-muted-foreground">
			Convertissez un fichier XML InstrumenPoche au format Chiphre
		</p>
	</div>

	<!-- Main content - Two column layout -->
	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Left Panel: Input -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Source XML</Card.Title>
				<Card.Description>
					Importez un fichier XML ou collez directement le contenu
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<Tabs.Root bind:value={activeTab}>
					<Tabs.List class="mb-4 grid w-full grid-cols-2">
						<Tabs.Trigger value="upload">
							<Upload class="mr-2 h-4 w-4" />
							Fichier
						</Tabs.Trigger>
						<Tabs.Trigger value="paste">
							<FileCode class="mr-2 h-4 w-4" />
							Coller
						</Tabs.Trigger>
					</Tabs.List>

					<Tabs.Content value="upload" class="mt-0">
						{#if selectedFile}
							<!-- File selected state -->
							<div
								class="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4"
							>
								<div class="flex items-center gap-3">
									<FileCode class="h-8 w-8 text-primary" />
									<div>
										<p class="font-medium">{selectedFile.name}</p>
										<p class="text-sm text-muted-foreground">
											{(selectedFile.size / 1024).toFixed(2)} Ko
										</p>
									</div>
								</div>
								<Button variant="ghost" size="icon" onclick={clearFile}>
									<X class="h-4 w-4" />
								</Button>
							</div>
						{:else}
							<!-- Drop zone -->
							<div
								class="relative rounded-lg border-2 border-dashed p-8 text-center transition-colors {dragOver
									? 'border-primary bg-primary/5'
									: 'border-muted-foreground/25 hover:border-muted-foreground/50'}"
								ondragover={handleDragOver}
								ondragleave={handleDragLeave}
								ondrop={handleDrop}
								role="button"
								tabindex="0"
							>
								<Upload class="mx-auto h-12 w-12 text-muted-foreground" />
								<p class="mt-2 font-medium">Glissez-deposez un fichier .xml ici</p>
								<p class="text-sm text-muted-foreground">ou cliquez pour selectionner</p>

								<input
									type="file"
									accept=".xml"
									onchange={handleFileSelect}
									class="absolute inset-0 cursor-pointer opacity-0"
								/>
							</div>
						{/if}
					</Tabs.Content>

					<Tabs.Content value="paste" class="mt-0">
						<Textarea
							bind:value={xmlInput}
							placeholder={XML_PLACEHOLDER}
							rows={12}
							class="font-mono text-sm"
						/>
					</Tabs.Content>
				</Tabs.Root>

				<!-- Convert button -->
				<Button onclick={handleConvert} disabled={!hasContent || isConverting} class="mt-4 w-full">
					{#if isConverting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Conversion en cours...
					{:else}
						<Play class="mr-2 h-4 w-4" />
						Convertir
					{/if}
				</Button>

				<!-- Conversion errors -->
				{#if conversionErrors.length > 0}
					<div class="mt-4 rounded-lg bg-destructive/10 p-4">
						<div class="flex items-start gap-2">
							<AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
							<div class="flex-1">
								<p class="font-medium text-destructive">Erreurs de conversion</p>
								<ul class="mt-2 list-inside list-disc space-y-1 text-sm text-destructive/90">
									{#each conversionErrors as error, i (i)}
										<li>{error}</li>
									{/each}
								</ul>
							</div>
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Right Panel: Output -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Code2 class="h-5 w-5" />
					Script DSL
				</Card.Title>
				<Card.Description>
					Résultat de la conversion, modifiable ensuite dans l’éditeur de constructions
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if dslOutput}
					<div class="overflow-hidden rounded-lg border border-border">
						<pre
							class="max-h-[400px] overflow-auto bg-muted p-4 font-mono text-sm">{dslOutput}</pre>
					</div>

					<Button variant="outline" onclick={handleCopyDsl}>Copier le DSL</Button>
				{:else}
					<div
						class="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 py-12 text-center"
					>
						<Code2 class="h-12 w-12 text-muted-foreground/50" />
						<p class="mt-2 text-sm text-muted-foreground">
							Importez et convertissez un fichier XML pour voir le script
						</p>
					</div>
				{/if}

				<!-- Warnings collapsible -->
				{#if warnings.length > 0}
					<Collapsible.Root bind:open={showWarnings}>
						<Collapsible.Trigger
							class="flex w-full items-center justify-between rounded-lg bg-warning/10 p-3 text-left"
						>
							<div class="flex items-center gap-2">
								<AlertTriangle class="h-4 w-4 text-warning" />
								<span class="font-medium text-warning">
									{warnings.length} avertissement{warnings.length > 1 ? 's' : ''}
								</span>
							</div>
							<ChevronDown
								class="h-4 w-4 text-warning transition-transform {showWarnings ? 'rotate-180' : ''}"
							/>
						</Collapsible.Trigger>
						<Collapsible.Content>
							<ul class="mt-2 space-y-1 rounded-lg bg-warning/5 p-3">
								{#each warnings as warning, i (i)}
									<li class="text-sm text-warning/90">- {warning}</li>
								{/each}
							</ul>
						</Collapsible.Content>
					</Collapsible.Root>
				{/if}

				<!-- Preview collapsible -->
				{#if dslOutput}
					<Collapsible.Root bind:open={showPreview}>
						<Collapsible.Trigger
							class="flex w-full items-center justify-between rounded-lg bg-muted p-3 text-left"
						>
							<div class="flex items-center gap-2">
								<Play class="h-4 w-4" />
								<span class="font-medium">Aperçu</span>
							</div>
							<ChevronDown class="h-4 w-4 transition-transform {showPreview ? 'rotate-180' : ''}" />
						</Collapsible.Trigger>
						<Collapsible.Content>
							<div class="mt-2 overflow-hidden rounded-lg border border-border">
								<ConstructionPlayer script={dslOutput} showGrid={true} />
							</div>
						</Collapsible.Content>
					</Collapsible.Root>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Metadata Form -->
	<Card.Root class="mt-6">
		<Card.Header>
			<Card.Title>Metadonnees</Card.Title>
			<Card.Description>Informations sur la construction</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-6 md:grid-cols-2">
				<!-- Title -->
				<div class="space-y-2">
					<Label for="title">Titre *</Label>
					<Input
						id="title"
						bind:value={title}
						placeholder="Titre de la construction"
						maxlength={200}
					/>
				</div>

				<!-- Description -->
				<div class="space-y-2 md:row-span-2">
					<Label for="description">Description</Label>
					<Textarea
						id="description"
						bind:value={description}
						placeholder="Description optionnelle..."
						rows={4}
						maxlength={2000}
					/>
				</div>

				<!-- Tags -->
				<div class="space-y-2">
					<Label>Tags</Label>
					<TagsInput
						bind:tags
						suggestions={data.existingTags}
						maxTags={10}
						placeholder="Ajouter un tag..."
					/>
				</div>

				<!-- Public checkbox -->
				<div class="flex items-center pt-6">
					<MyCheckbox bind:checked={isPublic} label="Construction publique" />
				</div>
			</div>
		</Card.Content>
		<Card.Footer class="flex justify-end border-t pt-6">
			<Button onclick={handleSave} disabled={!canSave} size="lg">
				{#if isSaving}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Enregistrement...
				{:else}
					<Save class="mr-2 h-4 w-4" />
					Enregistrer la construction
				{/if}
			</Button>
		</Card.Footer>
	</Card.Root>
</div>
