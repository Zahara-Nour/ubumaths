# Guide d'Intégration des Templates dans le Composeur

Ce guide explique comment intégrer les templates dans le composeur de messages existant.

## Modifications à apporter à `/routes/(protected)/messages/compose/+page.svelte`

### 1. Imports à ajouter

```typescript
import { messageTemplates } from '$lib/stores/messageTemplates.svelte';
import type { MessageTemplate, TriggerType } from '$lib/types/messageTemplates';
import { buildGlobalContext } from '$lib/templates/templateEngine';
import { getUserInputVariables } from '$lib/templates/templateVariables';
```

### 2. Nouvelles variables d'état

Ajouter après les variables existantes :

```typescript
let useTemplate = $state(false);
let activeTemplate = $state<MessageTemplate | null>(null);
let templateUserInputs = $state<Record<string, string>>({});
let showFullPreview = $state(false);
```

### 3. Charger template depuis URL (dans onMount)

Ajouter après le code de récupération des params existants :

```typescript
// Check if we're using a template
const templateId = $page.url.searchParams.get('templateId');
const triggerType = $page.url.searchParams.get('triggerType') as TriggerType;
const classIdForTemplate = $page.url.searchParams.get('classId');

if (templateId) {
	loadTemplate(templateId);
} else if (triggerType) {
	findAndLoadTemplate(triggerType, classIdForTemplate);
}
```

### 4. Nouvelles fonctions

```typescript
async function loadTemplate(templateId: string) {
	const template = await messageTemplates.loadTemplate(templateId);
	if (template) {
		activateTemplate(template);
	}
}

async function findAndLoadTemplate(triggerType: TriggerType, classId?: string | null) {
	const template = await messageTemplates.findMatchingTemplate(triggerType, classId || undefined);
	if (template) {
		activateTemplate(template);
	}
}

function activateTemplate(template: MessageTemplate) {
	activeTemplate = template;
	useTemplate = true;

	// Get user input variables
	const userInputVars = getUserInputVariables(template.trigger_type);
	templateUserInputs = Object.fromEntries(userInputVars.map((v) => [v.name, '']));

	// Pre-fill subject
	subject = template.subject_template;

	// Disable recipient selection if already set from context
	// (handled by existing reply logic)
}

function deactivateTemplate() {
	useTemplate = false;
	activeTemplate = null;
	templateUserInputs = {};
	showFullPreview = false;
}

function renderCurrentTemplate() {
	if (!activeTemplate) return;

	// Get user profile for global context
	const supabase = getSupabase();
	supabase.auth.getUser().then(({ data: { user } }) => {
		if (!user) return;

		supabase
			.from('profiles')
			.select('full_name, first_name')
			.eq('id', user.id)
			.single()
			.then(({ data: profile }) => {
				if (!profile) return;

				// Build global context
				const globalData = buildGlobalContext(profile);

				// Merge with user inputs
				const allData = { ...globalData, ...templateUserInputs };

				// Apply template
				messageTemplates.applyTemplate(activeTemplate, allData);

				// Update content
				if (messageTemplates.renderedTemplate) {
					content = messageTemplates.renderedTemplate.body;
					subject = messageTemplates.renderedTemplate.subject;
				}
			});
	});
}

// Call renderCurrentTemplate whenever templateUserInputs changes
$effect(() => {
	if (useTemplate && Object.keys(templateUserInputs).length > 0) {
		renderCurrentTemplate();
	}
});
```

### 5. Modifier la section de formulaire

Envelopper le formulaire existant dans une condition :

```svelte
{#if useTemplate && activeTemplate}
	<!-- Template Mode: Simplified Form -->
	<div class="mx-auto max-w-4xl space-y-6">
		<!-- Template Banner -->
		<div
			class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20"
		>
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium text-blue-900 dark:text-blue-100">
						📝 Utilisation du template: {activeTemplate.title}
					</p>
					<p class="text-sm text-blue-700 dark:text-blue-300">
						{activeTemplate.description || 'Remplissez les champs ci-dessous'}
					</p>
				</div>
				<Button variant="outline" size="sm" onclick={deactivateTemplate}>Mode libre</Button>
			</div>
		</div>

		<!-- Destinataire (locked) -->
		<div class="space-y-2">
			<Label>Destinataire</Label>
			<div class="rounded-md border border-border bg-muted/50 p-3">
				{#if selectedRecipients.length > 0}
					<span class="text-sm">
						{selectedRecipients.length} destinataire(s) sélectionné(s) ✓
					</span>
				{:else}
					<span class="text-sm text-muted-foreground">Aucun destinataire sélectionné</span>
				{/if}
			</div>
		</div>

		<!-- Sujet (locked preview) -->
		<div class="space-y-2">
			<Label>Sujet</Label>
			<div class="rounded-md border border-border bg-muted/50 p-3">
				<span class="font-mono text-sm">{subject}</span>
			</div>
		</div>

		<!-- User Input Fields -->
		{#each getUserInputVariables(activeTemplate.trigger_type) as variable}
			<div class="space-y-2">
				<Label for={`input-${variable.name}`}>
					{variable.label}
					{variable.required ? '*' : ''}
				</Label>
				{#if variable.name.includes('message') || variable.name.includes('question')}
					<FormRichTextEditor
						bind:value={templateUserInputs[variable.name]}
						placeholder={variable.description || variable.example}
					/>
				{:else}
					<Input
						id={`input-${variable.name}`}
						bind:value={templateUserInputs[variable.name]}
						placeholder={variable.example}
						required={variable.required}
					/>
				{/if}
			</div>
		{/each}

		<!-- Preview Toggle -->
		<div class="space-y-2">
			<Button
				type="button"
				variant="outline"
				onclick={() => {
					showFullPreview = !showFullPreview;
					renderCurrentTemplate();
				}}
			>
				{showFullPreview ? '▼' : '▶'} Aperçu du message complet
			</Button>

			{#if showFullPreview && messageTemplates.renderedTemplate}
				<div class="rounded-lg border border-border bg-card p-4">
					<div class="mb-2">
						<strong>Sujet:</strong>
						{messageTemplates.renderedTemplate.subject}
					</div>
					<div class="prose prose-sm dark:prose-invert">
						{@html messageTemplates.renderedTemplate.body}
					</div>
				</div>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex items-center justify-end gap-3 border-t border-border pt-4">
			<Button type="button" variant="outline" onclick={() => goto('/messages/inbox')}>
				Annuler
			</Button>
			<Button onclick={handleSubmit} disabled={isSending}>
				{#if isSending}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Envoi en cours...
				{:else}
					<Send class="mr-2 h-4 w-4" />
					Envoyer
				{/if}
			</Button>
		</div>
	</div>
{:else}
	<!-- Normal Mode: Full Form (existing code) -->
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		class="mx-auto max-w-4xl space-y-6"
	>
		<!-- Existing form content remains unchanged -->
	</form>
{/if}
```

### 6. Modifier handleSubmit

Ajouter au début de la fonction :

```typescript
async function handleSubmit() {
	// If using template, render final version first
	if (useTemplate && activeTemplate) {
		renderCurrentTemplate();
		// Wait a tick for rendering to complete
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	// Rest of existing handleSubmit code...
	if (!subject.trim()) {
		toaster.error('Le sujet est requis');
		return;
	}
	// ... etc
}
```

## Utilisation depuis d'autres pages

### Exemple 1: Depuis une page d'assessment

```svelte
<script>
	import { goto } from '$app/navigation';

	function askQuestionAboutAssessment(assessment, teacher) {
		const params = new URLSearchParams({
			triggerType: 'assessment_question',
			recipientId: teacher.id,
			// Context data will be auto-filled
			assessment_title: assessment.title,
			assessment_link: `${window.location.origin}/assessments/${assessment.id}`,
			teacher_name: teacher.full_name
		});

		goto(`/messages/compose?${params}`);
	}
</script>
```

### Exemple 2: Depuis une page SRS

```svelte
<script>
	function askHelpForDeck(deck, teacher) {
		const params = new URLSearchParams({
			triggerType: 'srs_help',
			recipientId: teacher.id,
			classId: deck.class_id,
			deck_name: deck.name,
			deck_link: `${window.location.origin}/srs/decks/${deck.id}`,
			teacher_name: teacher.full_name
		});

		goto(`/messages/compose?${params}`);
	}
</script>
```

## Notes importantes

1. **Permissions**: Les templates sont automatiquement filtrés par RLS selon le rôle de l'utilisateur

2. **Context data**: Les variables auto-remplies (comme `student_name`, `today_date`) sont gérées automatiquement par `buildGlobalContext()`

3. **User input**: Seules les variables marquées `userInput: true` sont demandées à l'utilisateur

4. **Preview**: L'aperçu se met à jour automatiquement grâce au `$effect` qui surveille `templateUserInputs`

5. **Mode libre**: L'utilisateur peut toujours basculer en mode libre pour écrire un message personnalisé

## Tests

Après implémentation, tester :

- ✅ Chargement template depuis URL avec `templateId`
- ✅ Recherche auto template avec `triggerType` + `classId`
- ✅ Formulaire simplifié avec champs userInput uniquement
- ✅ Preview mise à jour en temps réel
- ✅ Envoi du message avec template
- ✅ Basculement vers mode libre
