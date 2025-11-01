<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { FileDown, Eye, AlertCircle } from 'lucide-svelte';

	// Type for typst library
	type TypstLibrary = {
		setCompilerInitOptions: (options: { getModule: () => string }) => void;
		setRendererInitOptions: (options: { getModule: () => string }) => void;
		svg: (options: { mainContent: string }) => Promise<string>;
		pdf: (options: { mainContent: string }) => Promise<Uint8Array>;
	};

	// State
	let typstContent = $state(`= Démonstration Typst.ts

== Introduction aux Mathématiques

Cette page permet de créer des documents PDF à partir de *syntaxe Typst*, particulièrement utile pour les documents mathématiques.

== Formules Mathématiques

=== Équations du second degré

L'équation générale est : $ a x^2 + b x + c = 0 $

Le discriminant est défini par :
$ Delta = b^2 - 4 a c $

Les solutions sont données par :
$ x_(1,2) = (-b plus.minus sqrt(Delta)) / (2a) $

=== Calcul Intégral

L'aire sous une courbe est calculée par :
$ A = integral_a^b f(x) d x $

=== Limites

Exemple de limite :
$ lim_(x arrow infinity) (1 + 1/x)^x = e $

== Listes et Structure

Concepts importants :
- Algèbre : résolution d'équations
- Géométrie : théorème de Pythagore
- Analyse : dérivées et intégrales
- Probabilités : loi normale

== Théorème de Pythagore

Dans un triangle rectangle :
$ a^2 + b^2 = c^2 $

où $c$ est l'hypoténuse.

== Conclusion

Typst permet de créer facilement des documents mathématiques professionnels avec une syntaxe simple et claire.
`);

	let svgContent = $state('');
	let isInitialized = $state(false);
	let isRendering = $state(false);
	let isExporting = $state(false);
	let error = $state<string | null>(null);
	let textareaElement: HTMLTextAreaElement | null = null;

	// Debounce timer for preview updates
	let previewTimer: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Initialize typst.ts compiler and renderer
	 */
	function initializeTypst() {
		const typst = (window as { $typst?: TypstLibrary }).$typst;
		if (!typst) {
			error = 'Typst library not loaded';
			return;
		}

		try {
			typst.setCompilerInitOptions({
				getModule: () =>
					'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm'
			});
			typst.setRendererInitOptions({
				getModule: () =>
					'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm'
			});
			isInitialized = true;
			error = null;
		} catch (err) {
			error = `Initialization error: ${err}`;
			console.error('Typst initialization error:', err);
		}
	}

	/**
	 * Render typst content to SVG
	 */
	async function renderPreview(content: string) {
		const typst = (window as { $typst?: TypstLibrary }).$typst;
		if (!isInitialized || !typst) {
			return;
		}

		isRendering = true;
		error = null;

		try {
			const svg = await typst.svg({ mainContent: content });
			svgContent = svg;
		} catch (err) {
			error = `Compilation error: ${err}`;
			console.error('Typst rendering error:', err);
			svgContent = '';
		} finally {
			isRendering = false;
		}
	}

	/**
	 * Export content as PDF
	 */
	async function exportPdf() {
		const typst = (window as { $typst?: TypstLibrary }).$typst;
		if (!isInitialized || !typst) {
			return;
		}

		isExporting = true;
		error = null;

		try {
			const pdfData = await typst.pdf({ mainContent: typstContent });
			// Type assertion: pdfData is Uint8Array from typst, compatible with BlobPart
			const pdfFile = new Blob([pdfData as unknown as BlobPart], { type: 'application/pdf' });

			// Create download link
			const link = document.createElement('a');
			link.href = URL.createObjectURL(pdfFile);
			link.download = `document-${Date.now()}.pdf`;
			link.target = '_blank';
			link.click();

			// Cleanup
			URL.revokeObjectURL(link.href);
		} catch (err) {
			error = `PDF export error: ${err}`;
			console.error('PDF export error:', err);
		} finally {
			isExporting = false;
		}
	}

	/**
	 * Handle textarea input with debouncing
	 */
	function handleInput() {
		if (previewTimer) {
			clearTimeout(previewTimer);
		}

		previewTimer = setTimeout(() => {
			renderPreview(typstContent);
		}, 300);

		// Auto-resize textarea
		if (textareaElement) {
			textareaElement.style.height = 'auto';
			textareaElement.style.height = `${textareaElement.scrollHeight}px`;
		}
	}

	onMount(() => {
		// Load typst.ts library from CDN
		const script = document.createElement('script');
		script.type = 'module';
		script.src =
			'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst.ts/dist/esm/contrib/all-in-one-lite.bundle.js';
		script.id = 'typst-script';

		script.addEventListener('load', () => {
			initializeTypst();
			// Initial render
			renderPreview(typstContent);
		});

		script.addEventListener('error', () => {
			error = 'Failed to load Typst library from CDN';
		});

		document.head.appendChild(script);

		// Cleanup
		return () => {
			if (previewTimer) {
				clearTimeout(previewTimer);
			}
			const existingScript = document.getElementById('typst-script');
			if (existingScript) {
				existingScript.remove();
			}
		};
	});

	// Effect to scale SVG to fit container
	$effect(() => {
		if (svgContent) {
			// Wait for next tick to ensure DOM is updated
			setTimeout(() => {
				const container = document.getElementById('svg-preview');
				const svgElem = container?.querySelector('svg');
				if (svgElem && container) {
					const width = Number.parseFloat(svgElem.getAttribute('width') || '0');
					const height = Number.parseFloat(svgElem.getAttribute('height') || '0');
					const containerWidth = container.clientWidth - 40;

					if (width > 0) {
						svgElem.setAttribute('width', String(containerWidth));
						svgElem.setAttribute('height', String((height * containerWidth) / width));
					}
				}
			}, 0);
		}
	});
</script>

<svelte:head>
	<title>Typst PDF Preview - UbuMaths Debug</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="mb-2 text-2xl font-bold">Typst.ts PDF Export</h2>
		<p class="text-muted-foreground">
			Créez des documents PDF à partir de syntaxe Typst. Particulièrement utile pour les documents
			mathématiques avec formules complexes.
		</p>
		<div class="mt-3 flex flex-wrap gap-2">
			<Badge variant="outline">Typst Syntax</Badge>
			<Badge variant="outline">Math Formulas</Badge>
			<Badge variant="outline">PDF Export</Badge>
			<a
				href="https://typst.app/docs/"
				target="_blank"
				rel="noopener noreferrer"
				class="text-sm text-primary hover:underline"
			>
				Documentation Typst →
			</a>
		</div>
	</div>

	{#if error}
		<Card.Root class="border-destructive/50 bg-destructive/5">
			<Card.Content class="flex items-start gap-3 pt-6">
				<AlertCircle class="h-5 w-5 text-destructive" />
				<div class="flex-1">
					<h4 class="mb-1 font-medium text-destructive">Error</h4>
					<p class="text-sm text-destructive/90">{error}</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Editor Section -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Eye class="h-5 w-5" />
					Éditeur Typst
				</Card.Title>
				<Card.Description>
					Entrez votre contenu en syntaxe Typst. Le preview se met à jour automatiquement.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-3">
					<Textarea
						bind:value={typstContent}
						bind:ref={textareaElement}
						oninput={handleInput}
						placeholder="Entrez votre contenu Typst..."
						class="font-mono text-sm"
						rows={20}
					/>
					<div class="flex items-center justify-between">
						<span class="text-xs text-muted-foreground">
							{typstContent.length} caractères
						</span>
						<Button onclick={exportPdf} disabled={isExporting || !isInitialized} size="sm">
							<FileDown class="mr-2 h-4 w-4" />
							{isExporting ? 'Export en cours...' : 'Exporter en PDF'}
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Preview Section -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<FileDown class="h-5 w-5" />
					Aperçu SVG
				</Card.Title>
				<Card.Description>
					Prévisualisation en temps réel du document. Cliquez sur "Exporter en PDF" pour
					télécharger.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div
					id="svg-preview"
					class="min-h-[400px] overflow-auto rounded-lg border border-border bg-white p-5"
				>
					{#if !isInitialized}
						<div class="flex h-[400px] items-center justify-center text-muted-foreground">
							<div class="text-center">
								<div
									class="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
								></div>
								<p>Chargement de Typst.ts...</p>
							</div>
						</div>
					{:else if isRendering}
						<div class="flex h-[400px] items-center justify-center text-muted-foreground">
							<div class="text-center">
								<div
									class="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
								></div>
								<p>Compilation en cours...</p>
							</div>
						</div>
					{:else if svgContent}
						{@html svgContent}
					{:else}
						<div class="flex h-[400px] items-center justify-center text-muted-foreground">
							<p>Aucun contenu à afficher</p>
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Tips Section -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Astuces Syntaxe Typst</Card.Title>
			<Card.Description>Quelques exemples de syntaxe utiles</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<h4 class="mb-2 font-medium">Formatage de texte</h4>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li>
							<code class="rounded bg-muted px-1 py-0.5">*gras*</code> → <strong>gras</strong>
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5">_italique_</code> → <em>italique</em>
						</li>
						<li><code class="rounded bg-muted px-1 py-0.5">= Titre</code> → Titre niveau 1</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5">== Sous-titre</code> → Titre niveau 2
						</li>
					</ul>
				</div>
				<div>
					<h4 class="mb-2 font-medium">Mathématiques</h4>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li><code class="rounded bg-muted px-1 py-0.5">$ x^2 $</code> → Exposant</li>
						<li><code class="rounded bg-muted px-1 py-0.5">$ sqrt(x) $</code> → Racine carrée</li>
						<li><code class="rounded bg-muted px-1 py-0.5">$ integral $</code> → Intégrale</li>
						<li><code class="rounded bg-muted px-1 py-0.5">$ sum $</code> → Somme</li>
					</ul>
				</div>
				<div>
					<h4 class="mb-2 font-medium">Listes</h4>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li><code class="rounded bg-muted px-1 py-0.5">- Item</code> → Liste à puces</li>
						<li><code class="rounded bg-muted px-1 py-0.5">+ Item</code> → Liste numérotée</li>
					</ul>
				</div>
				<div>
					<h4 class="mb-2 font-medium">Symboles mathématiques</h4>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li><code class="rounded bg-muted px-1 py-0.5">arrow</code> → →</li>
						<li><code class="rounded bg-muted px-1 py-0.5">infinity</code> → ∞</li>
						<li><code class="rounded bg-muted px-1 py-0.5">plus.minus</code> → ±</li>
						<li><code class="rounded bg-muted px-1 py-0.5">Delta</code> → Δ</li>
					</ul>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
