<!--
	InstrumenPoche XML Conversion Page
	===================================
	Allows teachers and admins to import InstrumenPoche XML files
	and convert them to UbuMaths construction format.
-->

<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Badge } from '$lib/components/ui/badge';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import TagsInput from '$lib/components/templates/TagsInput.svelte';
	import { JsonEditor, ConstructionPlayer } from '$lib/constructions/components';
	import { convertInstrumenPoche } from '$lib/constructions/converter';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { goto } from '$app/navigation';
	import {
		Upload,
		FileCode,
		AlertTriangle,
		CheckCircle,
		Play,
		Save,
		ChevronDown,
		ArrowLeft,
		Loader2,
		X,
		Code2
	} from 'lucide-svelte';

	// Types for XML/JSON comparison
	interface XmlJsonPair {
		xml: string;
		json: string;
		stepStartIndex: number; // Index of first step in this pair
	}

	// Props
	let { data }: { data: PageData } = $props();

	// Input state
	let xmlInput = $state('');
	let activeTab = $state('upload');
	let dragOver = $state(false);
	let selectedFile = $state<File | null>(null);

	// Conversion state
	let jsonOutput = $state('');
	let warnings = $state<string[]>([]);
	let conversionErrors = $state<string[]>([]);
	let isConverting = $state(false);
	let isJsonValid = $state(false);

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
		isJsonValid &&
			title.trim().length > 0 &&
			conversionErrors.length === 0 &&
			!isSaving &&
			jsonOutput.length > 0
	);

	let parsedScript = $derived.by(() => {
		if (!jsonOutput || !isJsonValid) return null;
		try {
			return JSON.parse(jsonOutput);
		} catch {
			return null;
		}
	});

	let hasContent = $derived(xmlInput.trim().length > 0 || selectedFile !== null);

	// Parse XML and extract action elements with their JSON equivalents
	let xmlJsonPairs = $derived.by((): XmlJsonPair[] => {
		if (!xmlInput.trim() || !parsedScript?.steps) return [];

		const pairs: XmlJsonPair[] = [];

		// Extract action elements from XML
		const actionRegex = /<action\s+([^>]+)\s*\/>/g;
		const actions: { xml: string; attrs: string }[] = [];
		let match;

		while ((match = actionRegex.exec(xmlInput)) !== null) {
			actions.push({ xml: match[0], attrs: match[1] });
		}

		let stepIndex = 0;
		let actionIndex = 0;

		while (actionIndex < actions.length && stepIndex < parsedScript.steps.length) {
			const action = actions[actionIndex];
			const attrs = action.attrs;
			const pairStartIndex = stepIndex; // Track start index for this pair

			// Check if this is a text "creer" action (followed by "ecrire" which produces the step)
			if (attrs.includes('objet="texte"') && attrs.includes('mouvement="creer"')) {
				// Look for the next "ecrire" action
				if (actionIndex + 1 < actions.length) {
					const nextAction = actions[actionIndex + 1];
					if (
						nextAction.attrs.includes('objet="texte"') &&
						nextAction.attrs.includes('mouvement="ecrire"')
					) {
						// Group both XML actions with JSON steps (text + optional pause if tempo)
						const step = parsedScript.steps[stepIndex];
						let jsonLines = JSON.stringify(step);
						stepIndex++;

						// If ecrire has tempo, there's also a pause step
						if (nextAction.attrs.includes('tempo=') && stepIndex < parsedScript.steps.length) {
							const pauseStep = parsedScript.steps[stepIndex];
							if ('pause' in pauseStep) {
								jsonLines += '\n' + JSON.stringify(pauseStep);
								stepIndex++;
							}
						}

						pairs.push({
							xml: action.xml + '\n' + nextAction.xml,
							json: jsonLines,
							stepStartIndex: pairStartIndex
						});
						actionIndex += 2;
						continue;
					}
				}
				// "creer" without "ecrire" - skip (no JSON output)
				actionIndex++;
				continue;
			}

			// Check if this action produces no JSON output (e.g., some show/hide that don't match)
			// or produces multiple JSON steps

			const step = parsedScript.steps[stepIndex];
			let jsonLines = JSON.stringify(step);

			// Check if compass tracer produces rotate + arc steps
			if (attrs.includes('objet="compas"') && attrs.includes('mouvement="tracer"')) {
				stepIndex++;
				if (stepIndex < parsedScript.steps.length) {
					const arcStep = parsedScript.steps[stepIndex];
					jsonLines += '\n' + JSON.stringify(arcStep);
				}
			}

			// Check if show/montrer with position produces move + show steps
			if (
				attrs.includes('mouvement="montrer"') &&
				(attrs.includes('abscisse=') || attrs.includes('ordonnee='))
			) {
				stepIndex++;
				if (stepIndex < parsedScript.steps.length) {
					const showStep = parsedScript.steps[stepIndex];
					jsonLines += '\n' + JSON.stringify(showStep);
				}
			}

			stepIndex++;

			// Generic tempo handling: any action with tempo produces a pause step after
			if (attrs.includes('tempo=') && stepIndex < parsedScript.steps.length) {
				const nextStep = parsedScript.steps[stepIndex];
				if (nextStep && typeof nextStep === 'object' && 'pause' in nextStep) {
					jsonLines += '\n' + JSON.stringify(nextStep);
					stepIndex++;
				}
			}

			pairs.push({ xml: action.xml, json: jsonLines, stepStartIndex: pairStartIndex });
			actionIndex++;
		}

		return pairs;
	});

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
		jsonOutput = '';
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
			const result = await convertInstrumenPoche(xmlInput);

			if (result.success && result.script) {
				jsonOutput = JSON.stringify(result.script, null, 2);
				warnings = result.warnings;

				// Extract title from script if not set
				if (!title && result.script.title) {
					title = result.script.title;
				}
				if (!description && result.script.description) {
					description = result.script.description;
				}

				toaster.success('Conversion reussie');
				showPreview = true;
			} else {
				conversionErrors = result.errors;
				jsonOutput = '';
				toaster.error('La conversion a echoue');
			}
		} catch (err) {
			conversionErrors = [(err as Error).message || 'Erreur de conversion inattendue'];
			toaster.error('Erreur de conversion');
		} finally {
			isConverting = false;
		}
	}

	// JSON validation callback
	function handleJsonValidate(valid: boolean, _errors: string[]) {
		isJsonValid = valid;
	}

	// Save construction
	async function handleSave() {
		if (!canSave) return;

		isSaving = true;

		try {
			const script = JSON.parse(jsonOutput);

			const response = await fetch('/api/constructions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: title.trim(),
					description: description.trim() || undefined,
					script,
					is_public: isPublic,
					tags: tags.length > 0 ? tags : undefined
				})
			});

			if (response.ok) {
				const { construction } = await response.json();
				toaster.success('Construction enregistree');
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
	<title>Importer une construction - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl p-4 sm:p-6">
	<!-- Header -->
	<div class="mb-6">
		<Button variant="ghost" href="/constructions" class="mb-4 gap-2">
			<ArrowLeft class="h-4 w-4" />
			Retour a la liste
		</Button>

		<h1 class="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
			<FileCode class="h-7 w-7 text-primary sm:h-8 sm:w-8" />
			Importer une construction InstrumenPoche
		</h1>
		<p class="mt-2 text-muted-foreground">
			Convertissez un fichier XML InstrumenPoche au format UbuMaths
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
					Script JSON
					{#if isJsonValid && jsonOutput}
						<Badge variant="secondary" class="gap-1">
							<CheckCircle class="h-3 w-3" />
							Valide
						</Badge>
					{/if}
				</Card.Title>
				<Card.Description>Resultat de la conversion (modifiable)</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- JSON Editor -->
				<div class="overflow-hidden rounded-lg border border-border">
					<JsonEditor bind:value={jsonOutput} height="300px" onValidate={handleJsonValidate} />
				</div>

				<!-- Warnings collapsible -->
				{#if warnings.length > 0}
					<Collapsible.Root bind:open={showWarnings}>
						<Collapsible.Trigger
							class="bg-warning/10 flex w-full items-center justify-between rounded-lg p-3 text-left"
						>
							<div class="flex items-center gap-2">
								<AlertTriangle class="text-warning h-4 w-4" />
								<span class="text-warning font-medium">
									{warnings.length} avertissement{warnings.length > 1 ? 's' : ''}
								</span>
							</div>
							<ChevronDown
								class="text-warning h-4 w-4 transition-transform {showWarnings ? 'rotate-180' : ''}"
							/>
						</Collapsible.Trigger>
						<Collapsible.Content>
							<ul class="bg-warning/5 mt-2 space-y-1 rounded-lg p-3">
								{#each warnings as warning, i (i)}
									<li class="text-warning/90 text-sm">- {warning}</li>
								{/each}
							</ul>
						</Collapsible.Content>
					</Collapsible.Root>
				{/if}

				<!-- Preview collapsible -->
				{#if parsedScript}
					<Collapsible.Root bind:open={showPreview}>
						<Collapsible.Trigger
							class="flex w-full items-center justify-between rounded-lg bg-muted p-3 text-left"
						>
							<div class="flex items-center gap-2">
								<Play class="h-4 w-4" />
								<span class="font-medium">Apercu</span>
							</div>
							<ChevronDown class="h-4 w-4 transition-transform {showPreview ? 'rotate-180' : ''}" />
						</Collapsible.Trigger>
						<Collapsible.Content>
							<div class="mt-2 overflow-hidden rounded-lg border border-border">
								<ConstructionPlayer
									script={parsedScript}
									showControls={true}
									showParameters={false}
									showGrid={true}
								/>
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

	<!-- XML/JSON Comparison Card -->
	<Card.Root class="mt-6">
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Code2 class="h-5 w-5" />
				Comparaison XML / JSON
			</Card.Title>
			<Card.Description>
				Correspondance entre les instructions XML InstrumenPoche et le format JSON UbuMaths
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if xmlJsonPairs.length > 0}
				<div
					class="max-h-[500px] space-y-4 overflow-y-auto rounded-lg border border-border bg-muted/30 p-4"
				>
					{#each xmlJsonPairs as pair, i (i)}
						<div class="space-y-1">
							<!-- XML instruction (blue) -->
							<pre
								class="overflow-x-auto rounded bg-blue-50 p-2 font-mono text-xs break-all whitespace-pre-wrap text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">{pair.xml}</pre>
							<!-- JSON translation (green) with step numbers -->
							{#each pair.json.split('\n') as jsonLine, lineIndex (lineIndex)}
								<pre
									class="overflow-x-auto rounded bg-green-50 p-2 font-mono text-xs break-all whitespace-pre-wrap text-green-700 dark:bg-green-950/50 dark:text-green-300"><span
										class="mr-2 inline-block min-w-[2rem] text-right font-bold text-green-500"
										>[{pair.stepStartIndex + lineIndex}]</span
									>{jsonLine}</pre>
							{/each}
						</div>
					{/each}
				</div>
			{:else}
				<div
					class="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 py-12 text-center"
				>
					<Code2 class="h-12 w-12 text-muted-foreground/50" />
					<p class="mt-2 text-sm text-muted-foreground">
						Importez et convertissez un fichier XML pour voir la correspondance des instructions
					</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
