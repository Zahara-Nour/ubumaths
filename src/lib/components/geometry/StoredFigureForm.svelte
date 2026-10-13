<!--
	Formulaire d'une figure stockée (ADR 0027) : création et modification.

	Le script s'édite à gauche, la figure se redessine à droite après une pause
	de frappe (400 ms). Un script en erreur ne s'enregistre PAS : le bouton est
	désactivé, et le script est réexécuté au moment de l'envoi (la pause de frappe
	pourrait ne pas être écoulée).

	Poste vers les actions de la page : `?/save`, et `?/delete` si `deletable`.
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import TagBadgeSelector from '$lib/components/TagBadgeSelector.svelte';
	import StoredFigurePreview from '$lib/components/geometry/StoredFigurePreview.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { submitAction } from '$lib/utils/form-action';
	import { getGradeSelectItems } from '$lib/utils/grades';
	import { evaluateFigureScript } from '$lib/utils/geometry-figure-script';

	// ============================================================================
	// TYPES
	// ============================================================================

	interface FigureFormValues {
		title: string;
		description: string | null;
		dsl_script: string;
		grades: string[];
		is_public: boolean;
		tags: string[];
	}

	interface Props {
		initial: FigureFormValues;
		/** Où revenir après l'enregistrement, la suppression ou l'annulation */
		listHref: string;
		deletable?: boolean;
	}

	// ============================================================================
	// CONSTANTES
	// ============================================================================

	const PREVIEW_DELAY_MS = 400;
	const TITLE_MAX = 200;
	const DESCRIPTION_MAX = 2000;
	const SCRIPT_MAX = 100_000;
	const gradeItems = getGradeSelectItems();

	// ============================================================================
	// VARIABLES
	// ============================================================================

	let { initial, listHref, deletable = false }: Props = $props();

	// Copie de travail : la page n'écrit qu'à l'enregistrement
	// svelte-ignore state_referenced_locally
	const start = initial;
	let title = $state(start.title);
	let description = $state(start.description ?? '');
	let script = $state(start.dsl_script);
	let grades = $state<string[]>([...start.grades]);
	let tags = $state<string[]>([...start.tags]);
	let isPublic = $state(start.is_public);
	let previewScript = $state(start.dsl_script);
	let isSaving = $state(false);
	let isDeleting = $state(false);
	let confirmDeleteOpen = $state(false);
	let previewTimer: ReturnType<typeof setTimeout> | undefined;

	// Exécuté dans le navigateur seulement : le rendu serveur n'en a pas besoin
	const result = $derived(browser ? evaluateFigureScript(previewScript) : null);
	const isPreviewPending = $derived(previewScript !== script);
	const scriptError = $derived(result && !result.ok ? result.message : null);
	const canSave = $derived(
		title.trim().length > 0 &&
			script.trim().length > 0 &&
			script.length <= SCRIPT_MAX &&
			!isPreviewPending &&
			result?.ok === true &&
			!isSaving &&
			!isDeleting
	);

	// ============================================================================
	// FONCTIONS
	// ============================================================================

	function handleScriptInput() {
		clearTimeout(previewTimer);
		previewTimer = setTimeout(() => {
			previewScript = script;
		}, PREVIEW_DELAY_MS);
	}

	async function handleSubmit() {
		if (!canSave) return;
		// Contrôle à l'envoi : le script envoyé est celui qui s'exécute, pas l'aperçu
		const check = evaluateFigureScript(script);
		if (!check.ok) {
			previewScript = script;
			toaster.error('Le script contient une erreur : la figure ne peut pas être enregistrée');
			return;
		}

		isSaving = true;
		try {
			const formData = new FormData();
			formData.set('title', title.trim());
			formData.set('description', description.trim());
			formData.set('dsl_script', script);
			formData.set('grades', JSON.stringify(grades));
			formData.set('tags', JSON.stringify(tags));
			formData.set('is_public', isPublic ? 'true' : 'false');
			const outcome = await submitAction('?/save', formData);
			if (!outcome.ok) {
				toaster.error(outcome.message);
				return;
			}
			toaster.success('Figure enregistrée');
			await goto(listHref);
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete() {
		isDeleting = true;
		try {
			const outcome = await submitAction('?/delete', new FormData());
			if (!outcome.ok) {
				toaster.error(outcome.message);
				return;
			}
			toaster.success('Figure supprimée');
			await goto(listHref);
		} finally {
			isDeleting = false;
		}
	}

	onDestroy(() => clearTimeout(previewTimer));
</script>

<form
	class="space-y-6"
	onsubmit={(e) => {
		e.preventDefault();
		handleSubmit();
	}}
>
	<Card.Root>
		<Card.Content class="space-y-4 pt-6">
			<div class="space-y-2">
				<Label for="figure-title">Titre</Label>
				<Input id="figure-title" bind:value={title} maxlength={TITLE_MAX} required />
			</div>
			<div class="space-y-2">
				<Label for="figure-description">Description (facultative)</Label>
				<Textarea
					id="figure-description"
					bind:value={description}
					rows={2}
					maxlength={DESCRIPTION_MAX}
				/>
			</div>
			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<span class="text-sm font-medium">Niveaux</span>
					<MySelect
						type="multiple"
						bind:value={grades}
						items={gradeItems}
						placeholder="Aucun niveau"
						triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
					/>
				</div>
				<div class="space-y-2">
					<span class="text-sm font-medium">Tags</span>
					<TagBadgeSelector bind:value={tags} kind="geometry_figure" />
				</div>
			</div>
			<MyCheckbox
				bind:checked={isPublic}
				label="Figure publique (lisible par tous, même sans compte)"
			/>
		</Card.Content>
	</Card.Root>

	<div class="grid gap-6 xl:grid-cols-2">
		<div class="min-w-0 space-y-2">
			<Label for="figure-script">Script</Label>
			<Textarea
				id="figure-script"
				bind:value={script}
				oninput={handleScriptInput}
				rows={24}
				maxlength={SCRIPT_MAX}
				spellcheck={false}
				class="min-h-[28rem] font-mono text-[13px] leading-relaxed"
				aria-invalid={scriptError !== null}
				aria-describedby={scriptError ? 'figure-script-error' : undefined}
			/>
			<p class="text-xs text-muted-foreground">
				{script.length.toLocaleString('fr-FR')} / {SCRIPT_MAX.toLocaleString('fr-FR')} caractères
			</p>
		</div>
		<div class="min-w-0 space-y-2">
			<span class="text-sm font-medium">
				Aperçu{isPreviewPending ? ' (mise à jour…)' : ''}
			</span>
			<div id="figure-script-error">
				<StoredFigurePreview {result} />
			</div>
		</div>
	</div>

	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			{#if deletable}
				<Button
					type="button"
					variant="destructive"
					disabled={isDeleting || isSaving}
					onclick={() => (confirmDeleteOpen = true)}
				>
					{isDeleting ? 'Suppression…' : 'Supprimer la figure'}
				</Button>
			{/if}
		</div>
		<div class="flex gap-3">
			<Button type="button" variant="outline" href={listHref}>Annuler</Button>
			<Button type="submit" disabled={!canSave}>
				{isSaving ? 'Enregistrement…' : 'Enregistrer'}
			</Button>
		</div>
	</div>
	{#if scriptError}
		<p class="text-right text-sm text-destructive">
			Le script contient une erreur : corrige-la pour pouvoir enregistrer.
		</p>
	{/if}
</form>

{#if deletable}
	<ConfirmDialog
		bind:open={confirmDeleteOpen}
		title="Supprimer cette figure ?"
		description="La figure et ses tags seront supprimés définitivement. Les liens vers sa page publique ne fonctionneront plus."
		confirmLabel="Supprimer"
		onConfirm={handleDelete}
	/>
{/if}
