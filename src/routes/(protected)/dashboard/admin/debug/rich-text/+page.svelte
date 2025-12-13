<script lang="ts">
	import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
	import RichTextDisplay from '$lib/components/rich-text/RichTextDisplay.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { Copy, Check, RotateCcw, Play, Eye, Code, Settings, Beaker } from 'lucide-svelte';
	import type { MathTemplateLevel, RichTextMode } from '$lib/components/rich-text/types';

	// ============================================
	// Side-by-side comparison state
	// ============================================
	let chatMessages = $state<Array<{ timestamp: Date; content: unknown }>>([]);
	let formHtmlContent = $state('');
	let formJsonContent = $state<unknown>(null);

	function handleChatSend(content: unknown) {
		chatMessages = [...chatMessages, { timestamp: new Date(), content }];
	}

	function clearChatMessages() {
		chatMessages = [];
	}

	// ============================================
	// Playground state
	// ============================================
	let playgroundMode = $state<RichTextMode>('form');
	let playgroundMathTemplates = $state<MathTemplateLevel>('full');
	let showSendButtonSelect = $state<'auto' | 'true' | 'false'>('auto');
	let playgroundShowClearButton = $state(true);
	let playgroundMinHeight = $state('150px');
	let playgroundDisabled = $state(false);

	// Derived: convert select value to actual prop value
	let playgroundShowSendButton = $derived(
		showSendButtonSelect === 'auto' ? undefined : showSendButtonSelect === 'true'
	);

	let playgroundHtmlValue = $state('');
	let playgroundJsonValue = $state<unknown>(null);
	let playgroundSentMessages = $state<Array<{ timestamp: Date; content: unknown }>>([]);

	function handlePlaygroundSend(content: unknown) {
		playgroundSentMessages = [...playgroundSentMessages, { timestamp: new Date(), content }];
	}

	function resetPlayground() {
		playgroundMode = 'form';
		playgroundMathTemplates = 'full';
		showSendButtonSelect = 'auto';
		playgroundShowClearButton = true;
		playgroundMinHeight = '150px';
		playgroundDisabled = false;
		playgroundHtmlValue = '';
		playgroundJsonValue = null;
		playgroundSentMessages = [];
	}

	// Computed: effective showSendButton value
	let effectiveShowSendButton = $derived(playgroundShowSendButton ?? playgroundMode === 'chat');

	// ============================================
	// Content loading examples
	// ============================================
	const exampleContents = {
		simple: "<p>Texte simple avec du <strong>gras</strong> et de l'<em>italique</em>.</p>",
		math: `<h3>Formule mathématique</h3>
<p>L'équation du second degré : <span data-math-inline>ax^2 + bx + c = 0</span></p>
<p>Sa solution est donnée par : <span data-math-inline>x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}</span></p>`,
		emojis: `<h3>Feedback élève ⭐</h3>
<p>Excellent travail ! 👏 Tu as bien compris les fractions. 🎯</p>
<p>Points forts :</p>
<ul><li>✅ Calcul correct</li><li>✅ Présentation soignée</li></ul>
<p>Continue comme ça ! 💪🔥</p>`,
		complex: `<h2>Template de question</h2>
<p>Ce template génère des <strong>équations du second degré</strong> avec des coefficients aléatoires.</p>
<h3>Formule utilisée</h3>
<p>Formule générale : <span data-math-inline>ax^2 + bx + c = 0</span></p>
<p>Discriminant : <span data-math-inline>\\Delta = b^2 - 4ac</span></p>
<h3>Paramètres</h3>
<ul>
<li><code>a</code> : coefficient de x² (entier de 1 à 5)</li>
<li><code>b</code> : coefficient de x (entier de -10 à 10)</li>
<li><code>c</code> : terme constant (entier de -20 à 20)</li>
</ul>
<blockquote><p>⚠️ Le discriminant doit être positif pour avoir des solutions réelles.</p></blockquote>
<p>Difficulté : ⭐⭐⭐ | Niveau : 1ère</p>`,
		taskList: `<h3>Todo list</h3>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="true">Réviser les fractions</li>
<li data-type="taskItem" data-checked="true">Faire les exercices 1-5</li>
<li data-type="taskItem" data-checked="false">Préparer le contrôle</li>
</ul>`
	};

	function loadExample(key: keyof typeof exampleContents) {
		if (playgroundMode === 'form') {
			playgroundHtmlValue = exampleContents[key];
		}
	}

	// ============================================
	// Copy to clipboard
	// ============================================
	let copiedHtml = $state(false);
	let copiedJson = $state(false);

	async function copyToClipboard(text: string, type: 'html' | 'json') {
		await navigator.clipboard.writeText(text);
		if (type === 'html') {
			copiedHtml = true;
			setTimeout(() => (copiedHtml = false), 2000);
		} else {
			copiedJson = true;
			setTimeout(() => (copiedJson = false), 2000);
		}
	}

	// ============================================
	// Select items for MySelect
	// ============================================
	const modeItems = [
		{ value: 'form', label: 'Form (binding)' },
		{ value: 'chat', label: 'Chat (callback)' }
	];

	const mathTemplatesItems = [
		{ value: 'full', label: 'Full (9 templates)' },
		{ value: 'basic', label: 'Basic (4 templates)' },
		{ value: 'none', label: 'None (masqué)' }
	];

	const showSendButtonItems = [
		{ value: 'auto', label: 'Auto (mode-based)' },
		{ value: 'true', label: 'Toujours visible' },
		{ value: 'false', label: 'Toujours masqué' }
	];

	const minHeightItems = [
		{ value: '100px', label: '100px (défaut)' },
		{ value: '150px', label: '150px' },
		{ value: '200px', label: '200px' },
		{ value: '300px', label: '300px' }
	];
</script>

<div class="space-y-8">
	<!-- Header -->
	<div>
		<h1 class="mb-2 text-3xl font-bold">RichTextEditor Debug</h1>
		<p class="text-muted-foreground">
			Page de test du composant unifié <code>RichTextEditor</code> avec support des modes
			<Badge variant="outline">chat</Badge> et <Badge variant="outline">form</Badge>.
		</p>
	</div>

	<Separator />

	<!-- ============================================ -->
	<!-- Section 1: Side-by-side comparison -->
	<!-- ============================================ -->
	<section>
		<div class="mb-4 flex items-center gap-2">
			<Eye class="h-5 w-5" />
			<h2 class="text-2xl font-semibold">Comparaison côte-à-côte</h2>
		</div>
		<p class="mb-6 text-muted-foreground">
			Les deux modes du composant unifié avec leurs comportements par défaut.
		</p>

		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Chat Mode -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center justify-between">
						<span>Mode Chat</span>
						<Badge>mode="chat"</Badge>
					</Card.Title>
					<Card.Description>
						Callback <code>onSend</code>, contenu effacé après envoi, bouton Envoyer intégré
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<RichTextEditor mode="chat" onSend={handleChatSend} minHeight="120px" />

					<div>
						<div class="mb-2 flex items-center justify-between">
							<span class="text-sm font-medium">Messages envoyés ({chatMessages.length})</span>
							{#if chatMessages.length > 0}
								<Button size="sm" variant="ghost" onclick={clearChatMessages}>
									<RotateCcw class="mr-1 h-3 w-3" />
									Clear
								</Button>
							{/if}
						</div>
						{#if chatMessages.length === 0}
							<div
								class="rounded border border-dashed p-3 text-center text-sm text-muted-foreground"
							>
								Tapez du texte et cliquez sur Envoyer
							</div>
						{:else}
							<div class="max-h-48 space-y-2 overflow-y-auto">
								{#each chatMessages as msg, i (i)}
									<details class="rounded border bg-muted/30 p-2">
										<summary class="cursor-pointer text-xs">
											#{i + 1} - {msg.timestamp.toLocaleTimeString('fr-FR')}
										</summary>
										<pre class="mt-2 overflow-x-auto text-xs">{JSON.stringify(
												msg.content,
												null,
												2
											)}</pre>
									</details>
								{/each}
							</div>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Form Mode -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center justify-between">
						<span>Mode Form</span>
						<Badge variant="secondary">mode="form" (défaut)</Badge>
					</Card.Title>
					<Card.Description>
						Binding <code>bind:value</code>, contenu persistant, pas de bouton Envoyer
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<RichTextEditor
						mode="form"
						bind:value={formHtmlContent}
						bind:jsonValue={formJsonContent}
						minHeight="120px"
					/>

					<div class="grid gap-2">
						<details class="rounded border bg-muted/30 p-2">
							<summary class="cursor-pointer text-xs font-medium">
								HTML ({formHtmlContent.length} chars)
							</summary>
							<pre class="mt-2 max-h-32 overflow-auto text-xs">{formHtmlContent || '(vide)'}</pre>
						</details>
						<details class="rounded border bg-muted/30 p-2">
							<summary class="cursor-pointer text-xs font-medium">JSON</summary>
							<pre class="mt-2 max-h-32 overflow-auto text-xs">{JSON.stringify(
									formJsonContent,
									null,
									2
								)}</pre>
						</details>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</section>

	<Separator />

	<!-- ============================================ -->
	<!-- Section 2: Configurable Playground -->
	<!-- ============================================ -->
	<section>
		<div class="mb-4 flex items-center gap-2">
			<Beaker class="h-5 w-5" />
			<h2 class="text-2xl font-semibold">Playground configurable</h2>
		</div>
		<p class="mb-6 text-muted-foreground">Testez toutes les combinaisons de props en temps réel.</p>

		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Controls Panel -->
			<Card.Root class="lg:col-span-1">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Settings class="h-4 w-4" />
						Contrôles
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div>
						<label class="mb-1 block text-sm font-medium">mode</label>
						<MySelect type="single" items={modeItems} bind:value={playgroundMode} />
					</div>

					<div>
						<label class="mb-1 block text-sm font-medium">mathTemplates</label>
						<MySelect
							type="single"
							items={mathTemplatesItems}
							bind:value={playgroundMathTemplates}
						/>
					</div>

					<div>
						<label class="mb-1 block text-sm font-medium">showSendButton</label>
						<MySelect type="single" items={showSendButtonItems} bind:value={showSendButtonSelect} />
						<p class="mt-1 text-xs text-muted-foreground">
							Effectif : {effectiveShowSendButton ? 'visible' : 'masqué'}
						</p>
					</div>

					<div>
						<label class="mb-1 block text-sm font-medium">minHeight</label>
						<MySelect type="single" items={minHeightItems} bind:value={playgroundMinHeight} />
					</div>

					<div class="space-y-2">
						<MyCheckbox bind:checked={playgroundShowClearButton} label="showClearButton" />
						<MyCheckbox bind:checked={playgroundDisabled} label="disabled" />
					</div>

					<Separator />

					<div>
						<p class="mb-2 text-sm font-medium">Charger un exemple</p>
						<div class="flex flex-wrap gap-1">
							<Button size="sm" variant="outline" onclick={() => loadExample('simple')}>
								Simple
							</Button>
							<Button size="sm" variant="outline" onclick={() => loadExample('math')}>Math</Button>
							<Button size="sm" variant="outline" onclick={() => loadExample('emojis')}>
								Emojis
							</Button>
							<Button size="sm" variant="outline" onclick={() => loadExample('complex')}>
								Complexe
							</Button>
							<Button size="sm" variant="outline" onclick={() => loadExample('taskList')}>
								Tasks
							</Button>
						</div>
						{#if playgroundMode === 'chat'}
							<p class="mt-1 text-xs text-muted-foreground">
								⚠️ Chargement disponible en mode form uniquement
							</p>
						{/if}
					</div>

					<Button variant="outline" class="w-full" onclick={resetPlayground}>
						<RotateCcw class="mr-2 h-4 w-4" />
						Reset tout
					</Button>
				</Card.Content>
			</Card.Root>

			<!-- Editor + Output -->
			<Card.Root class="lg:col-span-2">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Play class="h-4 w-4" />
						Éditeur
					</Card.Title>
					<Card.Description>
						Props actifs :
						<code class="text-xs">
							mode="{playgroundMode}" mathTemplates="{playgroundMathTemplates}" showSendButton={'{'}
							{playgroundShowSendButton === undefined ? 'undefined' : playgroundShowSendButton}
							} showClearButton={'{'}
							{playgroundShowClearButton}
							} minHeight="{playgroundMinHeight}" disabled={'{'}
							{playgroundDisabled}
							}
						</code>
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					{#if playgroundMode === 'form'}
						<RichTextEditor
							mode="form"
							bind:value={playgroundHtmlValue}
							bind:jsonValue={playgroundJsonValue}
							mathTemplates={playgroundMathTemplates}
							showSendButton={playgroundShowSendButton}
							showClearButton={playgroundShowClearButton}
							minHeight={playgroundMinHeight}
							disabled={playgroundDisabled}
						/>
					{:else}
						<RichTextEditor
							mode="chat"
							onSend={handlePlaygroundSend}
							mathTemplates={playgroundMathTemplates}
							showSendButton={playgroundShowSendButton}
							showClearButton={playgroundShowClearButton}
							minHeight={playgroundMinHeight}
							disabled={playgroundDisabled}
						/>
					{/if}

					<Separator />

					<!-- Output Inspection -->
					<div>
						<h4 class="mb-2 flex items-center gap-2 text-sm font-medium">
							<Eye class="h-4 w-4" />
							Output
						</h4>

						{#if playgroundMode === 'form'}
							<div class="grid gap-2 md:grid-cols-2">
								<!-- HTML Output -->
								<div class="rounded border p-3">
									<div class="mb-2 flex items-center justify-between">
										<span class="text-xs font-medium"
											>HTML ({playgroundHtmlValue.length} chars)</span
										>
										<Button
											size="sm"
											variant="ghost"
											class="h-6 px-2"
											onclick={() => copyToClipboard(playgroundHtmlValue, 'html')}
										>
											{#if copiedHtml}
												<Check class="h-3 w-3 text-green-600" />
											{:else}
												<Copy class="h-3 w-3" />
											{/if}
										</Button>
									</div>
									<pre
										class="max-h-40 overflow-auto rounded bg-muted/50 p-2 text-xs">{playgroundHtmlValue ||
											'(vide)'}</pre>
								</div>

								<!-- JSON Output -->
								<div class="rounded border p-3">
									<div class="mb-2 flex items-center justify-between">
										<span class="text-xs font-medium">JSON</span>
										<Button
											size="sm"
											variant="ghost"
											class="h-6 px-2"
											onclick={() =>
												copyToClipboard(JSON.stringify(playgroundJsonValue, null, 2), 'json')}
										>
											{#if copiedJson}
												<Check class="h-3 w-3 text-green-600" />
											{:else}
												<Copy class="h-3 w-3" />
											{/if}
										</Button>
									</div>
									<pre
										class="max-h-40 overflow-auto rounded bg-muted/50 p-2 text-xs">{JSON.stringify(
											playgroundJsonValue,
											null,
											2
										)}</pre>
								</div>
							</div>

							<!-- Visual Render -->
							<div class="mt-2 rounded border p-3">
								<span class="mb-2 block text-xs font-medium">Rendu visuel</span>
								{#if playgroundHtmlValue}
									<div class="prose prose-sm max-w-none rounded bg-background p-2">
										{@html playgroundHtmlValue}
									</div>
								{:else}
									<p class="text-sm text-muted-foreground">(vide)</p>
								{/if}
							</div>
						{:else}
							<!-- Chat mode output -->
							<div class="rounded border p-3">
								<div class="mb-2 flex items-center justify-between">
									<span class="text-xs font-medium">
										Messages envoyés ({playgroundSentMessages.length})
									</span>
									{#if playgroundSentMessages.length > 0}
										<Button
											size="sm"
											variant="ghost"
											class="h-6 px-2"
											onclick={() => (playgroundSentMessages = [])}
										>
											<RotateCcw class="h-3 w-3" />
										</Button>
									{/if}
								</div>
								{#if playgroundSentMessages.length === 0}
									<p class="text-sm text-muted-foreground">Aucun message envoyé</p>
								{:else}
									<div class="max-h-60 space-y-2 overflow-y-auto">
										{#each playgroundSentMessages as msg, i (i)}
											<div class="rounded bg-muted/50 p-2">
												<div class="mb-1 flex items-center justify-between">
													<span class="text-xs text-muted-foreground">
														#{i + 1} - {msg.timestamp.toLocaleTimeString('fr-FR')}
													</span>
													<Button
														size="sm"
														variant="ghost"
														class="h-5 px-1"
														onclick={() =>
															copyToClipboard(JSON.stringify(msg.content, null, 2), 'json')}
													>
														<Copy class="h-3 w-3" />
													</Button>
												</div>
												<pre class="overflow-x-auto text-xs">{JSON.stringify(
														msg.content,
														null,
														2
													)}</pre>
												<!-- Visual render of message -->
												<details class="mt-2">
													<summary class="cursor-pointer text-xs text-muted-foreground">
														Voir le rendu
													</summary>
													<div class="mt-1 rounded bg-background p-2">
														<RichTextDisplay content={msg.content} />
													</div>
												</details>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</section>

	<Separator />

	<!-- ============================================ -->
	<!-- Section 3: Code Examples -->
	<!-- ============================================ -->
	<section>
		<div class="mb-4 flex items-center gap-2">
			<Code class="h-5 w-5" />
			<h2 class="text-2xl font-semibold">Exemples de code</h2>
		</div>
		<p class="mb-6 text-muted-foreground">Comment utiliser le composant unifié dans votre code.</p>

		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Form Mode Example -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Badge variant="secondary">Form</Badge>
						Formulaires / CRUD
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<pre class="overflow-x-auto rounded bg-muted p-4 text-xs"><code
							>&lt;script lang="ts"&gt;
  import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';

  let description = $state('');
  let jsonContent = $state&lt;unknown&gt;(null);

  // Pour éditer du contenu existant
  let existingHtml = $state('&lt;p&gt;Contenu...&lt;/p&gt;');
&lt;/script&gt;

&lt;!-- Création --&gt;
&lt;RichTextEditor bind:value=&#123;description&#125; /&gt;

&lt;!-- Avec JSON --&gt;
&lt;RichTextEditor
  bind:value=&#123;description&#125;
  bind:jsonValue=&#123;jsonContent&#125;
/&gt;

&lt;!-- Édition existante --&gt;
&lt;RichTextEditor bind:value=&#123;existingHtml&#125; /&gt;

&lt;!-- Options --&gt;
&lt;RichTextEditor
  bind:value=&#123;description&#125;
  mathTemplates="basic"
  showClearButton=&#123;false&#125;
  minHeight="200px"
/&gt;</code
						></pre>
				</Card.Content>
			</Card.Root>

			<!-- Chat Mode Example -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Badge>Chat</Badge>
						Messagerie / Temps réel
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<pre class="overflow-x-auto rounded bg-muted p-4 text-xs"><code
							>&lt;script lang="ts"&gt;
  import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';

  async function handleSend(content: unknown) &#123;
    // content = JSON TipTap/ProseMirror
    await sendMessage(content);
  &#125;
&lt;/script&gt;

&lt;!-- Basic --&gt;
&lt;RichTextEditor
  mode="chat"
  onSend=&#123;handleSend&#125;
/&gt;

&lt;!-- Avec options --&gt;
&lt;RichTextEditor
  mode="chat"
  onSend=&#123;handleSend&#125;
  mathTemplates="none"
  minHeight="100px"
/&gt;</code
						></pre>
				</Card.Content>
			</Card.Root>

			<!-- Props Reference -->
			<Card.Root class="lg:col-span-2">
				<Card.Header>
					<Card.Title>Référence des Props</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b">
									<th class="p-2 text-left font-medium">Prop</th>
									<th class="p-2 text-left font-medium">Type</th>
									<th class="p-2 text-left font-medium">Défaut</th>
									<th class="p-2 text-left font-medium">Description</th>
								</tr>
							</thead>
							<tbody>
								<tr class="border-b">
									<td class="p-2"><code>mode</code></td>
									<td class="p-2"><code>'chat' | 'form'</code></td>
									<td class="p-2"><code>'form'</code></td>
									<td class="p-2">Mode d'utilisation</td>
								</tr>
								<tr class="border-b">
									<td class="p-2"><code>value</code></td>
									<td class="p-2"><code>string</code></td>
									<td class="p-2"><code>''</code></td>
									<td class="p-2">Contenu HTML (bindable, mode form)</td>
								</tr>
								<tr class="border-b">
									<td class="p-2"><code>jsonValue</code></td>
									<td class="p-2"><code>unknown</code></td>
									<td class="p-2"><code>null</code></td>
									<td class="p-2">Contenu JSON TipTap (bindable, optionnel)</td>
								</tr>
								<tr class="border-b">
									<td class="p-2"><code>onSend</code></td>
									<td class="p-2"><code>(content: unknown) => void</code></td>
									<td class="p-2">-</td>
									<td class="p-2">Callback envoi (mode chat)</td>
								</tr>
								<tr class="border-b">
									<td class="p-2"><code>mathTemplates</code></td>
									<td class="p-2"><code>'full' | 'basic' | 'none'</code></td>
									<td class="p-2"><code>'full'</code></td>
									<td class="p-2">Niveau des templates math (9/4/0)</td>
								</tr>
								<tr class="border-b">
									<td class="p-2"><code>showSendButton</code></td>
									<td class="p-2"><code>boolean</code></td>
									<td class="p-2"><code>mode === 'chat'</code></td>
									<td class="p-2">Afficher le bouton Envoyer</td>
								</tr>
								<tr class="border-b">
									<td class="p-2"><code>showClearButton</code></td>
									<td class="p-2"><code>boolean</code></td>
									<td class="p-2"><code>true</code></td>
									<td class="p-2">Afficher le bouton Effacer</td>
								</tr>
								<tr class="border-b">
									<td class="p-2"><code>minHeight</code></td>
									<td class="p-2"><code>string</code></td>
									<td class="p-2"><code>'100px'</code></td>
									<td class="p-2">Hauteur minimum de l'éditeur</td>
								</tr>
								<tr class="border-b">
									<td class="p-2"><code>disabled</code></td>
									<td class="p-2"><code>boolean</code></td>
									<td class="p-2"><code>false</code></td>
									<td class="p-2">Désactiver l'éditeur</td>
								</tr>
							</tbody>
						</table>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</section>
</div>
