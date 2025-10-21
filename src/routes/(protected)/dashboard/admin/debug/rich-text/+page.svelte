<script lang="ts">
	import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
	import FormRichTextEditor from '$lib/components/rich-text/FormRichTextEditor.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Check, X } from 'lucide-svelte';

	let sentMessages = $state<any[]>([]);
	let formContent = $state('');

	const exampleFormContent = `<h3>Description du template</h3>
<p>Ce template génère des <strong>équations du second degré</strong> avec des coefficients aléatoires.</p>
<p>Formule utilisée : <math-inline latex="ax^2 + bx + c = 0"></math-inline></p>
<p>Difficulté : ⭐⭐⭐</p>`;

	function handleSend(content: any) {
		sentMessages = [...sentMessages, { timestamp: new Date(), content }];
	}

	function clearMessages() {
		sentMessages = [];
	}

	function loadExample() {
		formContent = exampleFormContent;
	}

	function resetForm() {
		formContent = '';
	}

	const comparisons = [
		{
			aspect: "Cas d'usage",
			richText: { label: 'Messagerie', desc: 'Chat, commentaires' },
			formText: { label: 'Formulaires', desc: 'Descriptions, CRUD' }
		},
		{
			aspect: 'Binding',
			richText: { label: 'onSend?: (content: any) => void', desc: 'Callback' },
			formText: { label: 'bind:value', desc: 'Bidirectionnel' }
		},
		{
			aspect: 'Format sortie',
			richText: { label: 'JSON', desc: 'TipTap/ProseMirror' },
			formText: { label: 'HTML', desc: 'String HTML' }
		},
		{
			aspect: 'Contenu initial',
			richText: { check: false, desc: 'Toujours vide' },
			formText: { check: true, desc: 'Chargement supporté' }
		},
		{
			aspect: 'Persistance',
			richText: { check: false, desc: 'Effacé après envoi' },
			formText: { check: true, desc: 'Contenu persistant' }
		},
		{
			aspect: 'Bouton envoi',
			richText: { check: true, desc: 'Bouton intégré' },
			formText: { check: false, desc: 'Pas de bouton' }
		},
		{
			aspect: 'Templates math',
			richText: { label: '9 templates', desc: "Fraction, √, xⁿ, xᵢ, ∫, ∑, lim, f', ±" },
			formText: { label: '4 templates', desc: 'Fraction, √, xⁿ, xᵢ' }
		},
		{
			aspect: 'Émojis',
			richText: { label: 'Tabs catégories', desc: '8 catégories avec onglets' },
			formText: { label: 'Popup scrollable', desc: 'Liste déroulante simple' }
		},
		{
			aspect: 'Heading levels',
			richText: { label: 'H1-H6', desc: '' },
			formText: { label: 'H1-H3', desc: '' }
		}
	];
</script>

<div class="space-y-8">
	<div>
		<h2 class="mb-4 text-2xl font-bold">Comparaison des Éditeurs de Texte Enrichi</h2>
		<p class="text-muted-foreground">
			Cette page compare les deux composants d'éditeur de texte enrichi utilisés dans l'application.
		</p>
		<div class="mt-4 flex flex-wrap gap-4">
			<div class="flex gap-2">
				<Badge variant="outline">RichTextEditor</Badge>
				<span class="text-sm text-muted-foreground">→ Messagerie, Chat</span>
			</div>
			<div class="flex gap-2">
				<Badge variant="outline">FormRichTextEditor</Badge>
				<span class="text-sm text-muted-foreground">→ Formulaires, CRUD</span>
			</div>
		</div>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Tableau Comparatif</Card.Title>
			<Card.Description>Différences techniques et cas d'utilisation</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="overflow-x-auto">
				<table class="w-full border-collapse">
					<thead>
						<tr class="border-b">
							<th class="w-[200px] p-3 text-left text-sm font-medium">Aspect</th>
							<th class="p-3 text-left text-sm font-medium">RichTextEditor</th>
							<th class="p-3 text-left text-sm font-medium">FormRichTextEditor</th>
						</tr>
					</thead>
					<tbody>
						{#each comparisons as comp}
							<tr class="border-b">
								<td class="p-3 font-medium">{comp.aspect}</td>
								<td class="p-3">
									{#if 'check' in comp.richText}
										{#if comp.richText.check}
											<Check class="inline h-4 w-4 text-green-600" />
										{:else}
											<X class="inline h-4 w-4 text-destructive" />
										{/if}
										<span class="ml-2 text-sm">{comp.richText.desc}</span>
									{:else}
										{#if comp.richText.label}
											<Badge variant="secondary" class="mb-1">{comp.richText.label}</Badge>
										{/if}
										{#if comp.richText.desc}
											<p class="text-sm text-muted-foreground">{comp.richText.desc}</p>
										{/if}
									{/if}
								</td>
								<td class="p-3">
									{#if 'check' in comp.formText}
										{#if comp.formText.check}
											<Check class="inline h-4 w-4 text-green-600" />
										{:else}
											<X class="inline h-4 w-4 text-destructive" />
										{/if}
										<span class="ml-2 text-sm">{comp.formText.desc}</span>
									{:else}
										{#if comp.formText.label}
											<Badge variant="secondary" class="mb-1">{comp.formText.label}</Badge>
										{/if}
										{#if comp.formText.desc}
											<p class="text-sm text-muted-foreground">{comp.formText.desc}</p>
										{/if}
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center justify-between">
				<span>Démo : RichTextEditor</span>
				<Badge variant="secondary">Messagerie</Badge>
			</Card.Title>
			<Card.Description>
				Utilisé pour envoyer des messages. Le contenu est effacé après envoi et retourné en JSON.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<RichTextEditor onSend={handleSend} placeholder="Tapez votre message..." />

			<div>
				<div class="mb-2 flex items-center justify-between">
					<h4 class="text-sm font-medium">Messages envoyés ({sentMessages.length})</h4>
					{#if sentMessages.length > 0}
						<Button size="sm" variant="outline" onclick={clearMessages}>Effacer</Button>
					{/if}
				</div>
				{#if sentMessages.length === 0}
					<div
						class="rounded-lg border border-dashed border-border p-4 text-center text-muted-foreground"
					>
						Aucun message envoyé. Tapez du contenu et cliquez sur "Envoyer".
					</div>
				{:else}
					<div class="space-y-3">
						{#each sentMessages as message, i}
							<div class="rounded-lg border border-border bg-muted/50 p-3">
								<div class="mb-2 text-xs text-muted-foreground">
									Message #{i + 1} - {message.timestamp.toLocaleTimeString('fr-FR')}
								</div>
								<details>
									<summary class="cursor-pointer text-sm font-medium">Voir le JSON</summary>
									<pre
										class="mt-2 overflow-x-auto rounded bg-background p-2 text-xs">{JSON.stringify(
											message.content,
											null,
											2
										)}</pre>
								</details>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center justify-between">
				<span>Démo : FormRichTextEditor</span>
				<Badge variant="secondary">Formulaire</Badge>
			</Card.Title>
			<Card.Description>
				Utilisé dans les formulaires avec binding bidirectionnel. Le contenu est persistant et
				retourné en HTML.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div>
				<div class="mb-2 flex items-center justify-between">
					<h4 class="text-sm font-medium">Éditeur</h4>
					<div class="flex gap-2">
						<Button size="sm" variant="outline" onclick={loadExample}>Charger exemple</Button>
						<Button size="sm" variant="outline" onclick={resetForm}>Reset</Button>
					</div>
				</div>
				<FormRichTextEditor bind:value={formContent} placeholder="Entrez une description..." />
			</div>

			<div>
				<h4 class="mb-2 text-sm font-medium">Contenu HTML (temps réel)</h4>
				{#if !formContent}
					<div
						class="rounded-lg border border-dashed border-border p-4 text-center text-muted-foreground"
					>
						Le HTML s'affichera ici en temps réel pendant que vous tapez.
					</div>
				{:else}
					<div class="space-y-2">
						<div class="rounded-lg border border-border bg-muted/50 p-3">
							<p class="mb-2 text-xs font-medium text-muted-foreground">
								Longueur : {formContent.length} caractères
							</p>
							<details open>
								<summary class="cursor-pointer text-sm font-medium">Code HTML</summary>
								<pre
									class="mt-2 overflow-x-auto rounded bg-background p-2 text-xs">{formContent}</pre>
							</details>
						</div>
						<div class="rounded-lg border border-border bg-background p-3">
							<p class="mb-2 text-xs font-medium text-muted-foreground">Rendu visuel :</p>
							<div class="prose prose-sm max-w-none">
								{@html formContent}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Exemples de Code</Card.Title>
			<Card.Description>Comment utiliser chaque composant dans votre code</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<div>
				<h4 class="mb-2 flex items-center gap-2 text-sm font-medium">
					<Badge variant="outline">RichTextEditor</Badge>
					<span class="text-muted-foreground">→ Messagerie / Chat</span>
				</h4>
				<div class="rounded-lg border border-border bg-muted/50 p-4">
					<pre class="overflow-x-auto text-xs"><code
							>&lt;script lang="ts"&gt;
  import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';

  function handleSend(content: any) &#123;
    // content est un objet JSON (format TipTap/ProseMirror)
    console.log('Message reçu:', content);
    await sendMessage(content);
  &#125;
&lt;/script&gt;

&lt;RichTextEditor
  onSend=&#123;handleSend&#125;
  placeholder="Tapez votre message..."
/&gt;</code
						></pre>
				</div>
			</div>

			<div>
				<h4 class="mb-2 flex items-center gap-2 text-sm font-medium">
					<Badge variant="outline">FormRichTextEditor</Badge>
					<span class="text-muted-foreground">→ Formulaires / CRUD</span>
				</h4>
				<div class="rounded-lg border border-border bg-muted/50 p-4">
					<pre class="overflow-x-auto text-xs"><code
							>&lt;script lang="ts"&gt;
  import FormRichTextEditor from '$lib/components/rich-text/FormRichTextEditor.svelte';

  // Pour créer un nouveau contenu
  let description = $state('');

  // Pour éditer du contenu existant
  let existingContent = $state('&lt;h3&gt;Titre&lt;/h3&gt;&lt;p&gt;Contenu...&lt;/p&gt;');

  async function handleSubmit() &#123;
    await saveToDatabase(&#123; description &#125;);
  &#125;
&lt;/script&gt;

&lt;form onsubmit=&#123;handleSubmit&#125;&gt;
  &lt;FormRichTextEditor
    bind:value=&#123;description&#125;
    placeholder="Entrez une description..."
  /&gt;
  &lt;button type="submit"&gt;Enregistrer&lt;/button&gt;
&lt;/form&gt;

&lt;!-- Édition de contenu existant --&gt;
&lt;FormRichTextEditor
  bind:value=&#123;existingContent&#125;
/&gt;</code
						></pre>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
