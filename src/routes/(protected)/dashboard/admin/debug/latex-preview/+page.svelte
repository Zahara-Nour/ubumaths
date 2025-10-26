<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { FileDown, Play, AlertCircle, Trash2, Settings2 } from 'lucide-svelte';

	// LaTeX engine options
	const engineOptions = [
		{ value: 'pdflatex', label: 'PDFLaTeX' },
		{ value: 'lualatex', label: 'LuaLaTeX' },
		{ value: 'xelatex', label: 'XeLaTeX' },
		{ value: 'latex', label: 'LaTeX' },
		{ value: 'context', label: 'ConTeXt' }
	];

	// State
	let latexContent = $state(`\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{amsthm}

\\newtheorem{theorem}{Théorème}

\\title{Démonstration LaTeX}
\\author{UbuMaths}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction aux Mathématiques}

Cette page permet de compiler des documents LaTeX et de prévisualiser le PDF résultant.

\\section{Équations du Second Degré}

L'équation générale est :
\\[ ax^2 + bx + c = 0 \\]

Le discriminant est défini par :
\\[ \\Delta = b^2 - 4ac \\]

Les solutions sont données par :
\\[ x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} \\]

\\section{Calcul Intégral}

L'aire sous une courbe est calculée par :
\\[ A = \\int_a^b f(x) \\, dx \\]

\\subsection{Exemple}

Calculons l'intégrale suivante :
\\[ \\int_0^\\pi \\sin(x) \\, dx = [-\\cos(x)]_0^\\pi = 2 \\]

\\section{Limites}

Exemple de limite remarquable :
\\[ \\lim_{x \\to \\infty} \\left(1 + \\frac{1}{x}\\right)^x = e \\]

\\section{Théorèmes}

\\begin{theorem}[Pythagore]
Dans un triangle rectangle, le carré de l'hypoténuse est égal à la somme des carrés des deux autres côtés :
\\[ a^2 + b^2 = c^2 \\]
\\end{theorem}

\\section{Matrices}

Exemple de matrice :
\\[ A = \\begin{pmatrix}
1 & 2 & 3 \\\\
4 & 5 & 6 \\\\
7 & 8 & 9
\\end{pmatrix} \\]

\\end{document}
`);

	let selectedEngine = $state('pdflatex');
	let isCompiling = $state(false);
	let compilationError = $state<string | null>(null);
	let compilationLog = $state<string | null>(null);
	let pdfBlobUrl = $state<string | null>(null);
	let textareaElement: HTMLTextAreaElement | null = null;

	// Regex to detect %!TEX engine comment
	const engineRegex = /% *!TEX.*[^a-zA-Z](((pdf|xe|lua)?latex)|context) *\n/i;

	/**
	 * Auto-detect engine from %!TEX comments
	 */
	let detectedEngine = $derived.by(() => {
		const match = latexContent.match(engineRegex);
		if (match) {
			const engine = match[1].toLowerCase();
			// Validate against available engines
			if (engineOptions.some((opt) => opt.value === engine)) {
				return engine;
			}
		}
		return null;
	});

	/**
	 * Update selected engine when detected engine changes
	 */
	$effect(() => {
		if (detectedEngine) {
			selectedEngine = detectedEngine;
		}
	});

	/**
	 * Compile LaTeX to PDF via server-side proxy (avoids CORS issues)
	 */
	async function compilePdf() {
		isCompiling = true;
		compilationError = null;
		compilationLog = null;

		try {
			// Create FormData for multipart/form-data POST
			const formData = new FormData();
			formData.append('filecontents[]', latexContent);
			formData.append('filename[]', 'document.tex');
			formData.append('engine', selectedEngine);
			formData.append('return', 'pdf');

			const response = await fetch('/api/latex/compile', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const contentType = response.headers.get('content-type');

			// Check if we got a PDF or a log file
			if (contentType?.includes('application/pdf')) {
				// Success! We got a PDF
				const blob = await response.blob();

				// Clean up previous blob URL
				if (pdfBlobUrl) {
					URL.revokeObjectURL(pdfBlobUrl);
				}

				pdfBlobUrl = URL.createObjectURL(blob);
			} else {
				// We got a log file (compilation error)
				const logText = await response.text();
				compilationLog = logText;
				compilationError = 'La compilation a échoué. Consultez le log ci-dessous.';
			}
		} catch (err) {
			compilationError = `Erreur réseau: ${err instanceof Error ? err.message : 'Erreur inconnue'}`;
			console.error('Compilation error:', err);
		} finally {
			isCompiling = false;
		}
	}

	/**
	 * Download the PDF
	 */
	function downloadPdf() {
		if (!pdfBlobUrl) return;

		const link = document.createElement('a');
		link.href = pdfBlobUrl;
		link.download = `latex-${Date.now()}.pdf`;
		link.click();
	}

	/**
	 * Clear output (PDF and errors)
	 */
	function clearOutput() {
		if (pdfBlobUrl) {
			URL.revokeObjectURL(pdfBlobUrl);
			pdfBlobUrl = null;
		}
		compilationError = null;
		compilationLog = null;
	}

	/**
	 * Handle textarea input
	 */
	function handleInput() {
		// Auto-resize textarea
		if (textareaElement) {
			textareaElement.style.height = 'auto';
			textareaElement.style.height = `${textareaElement.scrollHeight}px`;
		}
	}
</script>

<svelte:head>
	<title>LaTeX PDF Preview - UbuMaths Debug</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="mb-2 text-2xl font-bold">LaTeX PDF Compiler</h2>
		<p class="text-muted-foreground">
			Compilez des documents LaTeX en ligne et prévisualisez le PDF. Utilise le serveur TeXLive.net
			pour la compilation.
		</p>
		<div class="mt-3 flex flex-wrap gap-2">
			<Badge variant="outline">LaTeX</Badge>
			<Badge variant="outline">Math Formulas</Badge>
			<Badge variant="outline">PDF Export</Badge>
			<a
				href="https://www.learnlatex.org/"
				target="_blank"
				rel="noopener noreferrer"
				class="text-sm text-primary hover:underline"
			>
				Learn LaTeX →
			</a>
		</div>
	</div>

	{#if compilationError}
		<Card.Root class="border-destructive/50 bg-destructive/5">
			<Card.Content class="pt-6">
				<div class="flex items-start gap-3">
					<AlertCircle class="h-5 w-5 flex-shrink-0 text-destructive" />
					<div class="flex-1">
						<h4 class="mb-1 font-medium text-destructive">Erreur de compilation</h4>
						<p class="text-sm text-destructive/90">{compilationError}</p>
					</div>
				</div>

				{#if compilationLog}
					<div class="mt-4">
						<h5 class="mb-2 text-sm font-medium">Log de compilation :</h5>
						<div
							class="max-h-[400px] overflow-auto rounded-lg border border-destructive/30 bg-muted/50 p-3"
						>
							<pre class="font-mono text-xs break-words whitespace-pre-wrap">{compilationLog}</pre>
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Editor Section -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Settings2 class="h-5 w-5" />
					Éditeur LaTeX
				</Card.Title>
				<Card.Description>
					Entrez votre code LaTeX. Utilisez <code class="rounded bg-muted px-1">%!TEX lualatex</code
					> pour changer de moteur.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-3">
					<!-- Engine selector -->
					<div class="flex items-center gap-3">
						<label for="engine-select" class="text-sm font-medium">Moteur :</label>
						<select
							id="engine-select"
							bind:value={selectedEngine}
							class="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:outline-none"
						>
							{#each engineOptions as option (option.value)}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
						{#if detectedEngine}
							<Badge variant="secondary" class="text-xs">Auto-détecté</Badge>
						{/if}
					</div>

					<Textarea
						bind:value={latexContent}
						bind:ref={textareaElement}
						oninput={handleInput}
						placeholder="Entrez votre code LaTeX..."
						class="font-mono text-sm"
						rows={20}
					/>
					<div class="flex items-center justify-between gap-2">
						<span class="text-xs text-muted-foreground">
							{latexContent.length} caractères
						</span>
						<div class="flex gap-2">
							{#if pdfBlobUrl || compilationError}
								<Button onclick={clearOutput} variant="outline" size="sm">
									<Trash2 class="mr-2 h-4 w-4" />
									Effacer sortie
								</Button>
							{/if}
							<Button onclick={compilePdf} disabled={isCompiling} size="sm">
								<Play class="mr-2 h-4 w-4" />
								{isCompiling ? 'Compilation...' : 'Compiler PDF'}
							</Button>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Preview Section -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<FileDown class="h-5 w-5" />
					Aperçu PDF
				</Card.Title>
				<Card.Description>
					Le PDF compilé apparaîtra ici. Cliquez sur "Télécharger PDF" pour sauvegarder.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="min-h-[400px] overflow-auto rounded-lg border border-border bg-muted/30 p-2">
					{#if isCompiling}
						<div class="flex h-[400px] items-center justify-center text-muted-foreground">
							<div class="text-center">
								<div
									class="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
								></div>
								<p>Compilation en cours...</p>
								<p class="mt-1 text-xs">Cela peut prendre quelques secondes</p>
							</div>
						</div>
					{:else if pdfBlobUrl}
						<div class="space-y-3">
							<div class="flex justify-end">
								<Button onclick={downloadPdf} size="sm" variant="outline">
									<FileDown class="mr-2 h-4 w-4" />
									Télécharger PDF
								</Button>
							</div>
							<embed
								src={pdfBlobUrl}
								type="application/pdf"
								class="h-[600px] w-full rounded border"
							/>
						</div>
					{:else}
						<div class="flex h-[400px] items-center justify-center text-muted-foreground">
							<div class="text-center">
								<FileDown class="mb-3 h-12 w-12 opacity-50" />
								<p>Cliquez sur "Compiler PDF" pour générer le document</p>
							</div>
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Tips Section -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Astuces Syntaxe LaTeX</Card.Title>
			<Card.Description>Quelques exemples de syntaxe utiles</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<div>
					<h4 class="mb-2 font-medium">Équations</h4>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li><code class="rounded bg-muted px-1 py-0.5">\[x^2\]</code> → Équation centrée</li>
						<li><code class="rounded bg-muted px-1 py-0.5">$x^2$</code> → Inline</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5">\frac{'{'}a}{'{'} b}</code> → Fraction
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5">\sqrt{'{'}x}</code> → Racine
						</li>
					</ul>
				</div>
				<div>
					<h4 class="mb-2 font-medium">Symboles</h4>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li><code class="rounded bg-muted px-1 py-0.5">\alpha</code> → α</li>
						<li><code class="rounded bg-muted px-1 py-0.5">\Delta</code> → Δ</li>
						<li><code class="rounded bg-muted px-1 py-0.5">\infty</code> → ∞</li>
						<li><code class="rounded bg-muted px-1 py-0.5">\pm</code> → ±</li>
					</ul>
				</div>
				<div>
					<h4 class="mb-2 font-medium">Moteurs</h4>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li>
							<code class="rounded bg-muted px-1 py-0.5">%!TEX pdflatex</code> → PDFLaTeX
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5">%!TEX lualatex</code> → LuaLaTeX
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5">%!TEX xelatex</code> → XeLaTeX
						</li>
					</ul>
				</div>
				<div>
					<h4 class="mb-2 font-medium">Packages utiles</h4>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li>
							<code class="rounded bg-muted px-1 py-0.5">\usepackage{'{'}amsmath}</code> → Maths avancées
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5">\usepackage{'{'}graphicx}</code> → Images
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5">\usepackage{'{'}tikz}</code> → Dessins
						</li>
					</ul>
				</div>
				<div>
					<h4 class="mb-2 font-medium">Environnements</h4>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li>
							<code class="rounded bg-muted px-1 py-0.5">\begin{'{'}equation}</code> → Équation numérotée
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5">\begin{'{'}align}</code> → Alignement
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5">\begin{'{'}theorem}</code> → Théorème
						</li>
					</ul>
				</div>
				<div>
					<h4 class="mb-2 font-medium">Débogage</h4>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li>Vérifier les <code>\begin</code> / <code>\end</code></li>
						<li>Regarder la ligne d'erreur dans le log</li>
						<li>Chercher <code>!</code> dans le log</li>
						<li>Vérifier les accolades <code>{'{}'}</code></li>
					</ul>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
