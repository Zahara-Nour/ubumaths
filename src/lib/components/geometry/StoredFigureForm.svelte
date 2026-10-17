<!--
	Formulaire d'une figure stockée (ADR 0027) : création et modification.

	Le texte s'édite à gauche, la figure se redessine à droite après une pause
	de frappe (400 ms). Un texte en erreur (en-tête ou script) ne s'enregistre
	PAS : le bouton est désactivé, et le texte est réexécuté au moment de l'envoi
	(la pause de frappe pourrait ne pas être écoulée).

	Texte = contenu d'un bloc ```figure : en-tête, `---`, script (sans `---`,
	script nu). Les champs « Affichage » lisent et écrivent les lignes de
	l'en-tête (`stored-figure-header.ts`) : modifier l'en-tête à la main met les
	champs à jour, et un champ ne touche qu'à sa ligne, jamais au script.

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
	import { evaluateStoredFigure } from '$lib/utils/geometry-figure-script';
	import {
		hasFigureHeader,
		readHeaderField,
		readWindowFields,
		withBareScriptHeader,
		writeHeaderField,
		writeWindowFields,
		type StoredFigureFieldKey
	} from '$lib/utils/stored-figure-header';
	import { formatFigureWindow } from '$lib/ubumark/utils/figure-view';
	import { FIGURE_RENDER_MODES, FIGURE_SIZES, type FigureWindow } from '$lib/ubumark/types/figure';

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
	const sizeItems = FIGURE_SIZES.map((size) => ({ value: size, label: size }));
	const renderItems = Object.keys(FIGURE_RENDER_MODES).map((word) => ({
		value: word,
		label: word
	}));
	const WINDOW_LABELS = ['x min', 'x max', 'y min', 'y max'] as const;

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

	/** Fenêtre que montre l'aperçu (après zoom ou déplacement) */
	let currentWindow = $state<FigureWindow | null>(null);

	// Exécuté dans le navigateur seulement : le rendu serveur n'en a pas besoin
	const result = $derived(browser ? evaluateStoredFigure(previewScript) : null);
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

	// Champs « Affichage » : valeurs BRUTES de l'en-tête (une ligne en erreur
	// reste lisible dans son champ, le message vient du parseur)
	const windowFields = $derived(readWindowFields(script));
	const sizeField = $derived(readHeaderField(script, 'taille')?.toLowerCase() ?? 'moyenne');
	const axesField = $derived(readHeaderField(script, 'axes')?.toLowerCase() === 'oui');
	const gridField = $derived(readHeaderField(script, 'grille') ?? '');
	const ticksField = $derived(readHeaderField(script, 'graduations') ?? '');
	const draggableField = $derived(readHeaderField(script, 'deplacable')?.toLowerCase() === 'oui');
	const renderField = $derived(readHeaderField(script, 'rendu')?.toLowerCase() ?? 'normal');

	// ============================================================================
	// FONCTIONS
	// ============================================================================

	/** Le texte a changé : l'aperçu suivra après la pause de frappe */
	function scheduleRefresh() {
		clearTimeout(previewTimer);
		previewTimer = setTimeout(() => {
			previewScript = script;
		}, PREVIEW_DELAY_MS);
	}

	/**
	 * Écrire une clé de l'en-tête. Valeur par défaut sur une clé absente : rien
	 * à écrire (un script nu le reste) ; valeur vide : la ligne disparaît.
	 */
	function setField(key: StoredFigureFieldKey, value: string, defaultValue: string | null) {
		if (readHeaderField(script, key) === null && value === defaultValue) return;
		script = writeHeaderField(
			withBareScriptHeader(script),
			key,
			value.trim() === '' ? null : value
		);
		scheduleRefresh();
	}

	function setWindowField(index: number, value: string) {
		const bounds = [...windowFields];
		// `;` sépare les bornes dans la ligne : tapé dans un champ, il décalerait les quatre
		bounds[index] = value.replaceAll(';', '');
		script = writeWindowFields(withBareScriptHeader(script), bounds);
		scheduleRefresh();
	}

	function takeCurrentFraming() {
		if (!currentWindow) return;
		const updated = writeHeaderField(
			withBareScriptHeader(script),
			'fenetre',
			formatFigureWindow(currentWindow)
		);
		if (updated === script) return;
		script = updated;
		scheduleRefresh();
	}

	async function handleSubmit() {
		if (isSaving || isDeleting) return;
		// Contrôle à l'envoi : le script envoyé est celui qui s'exécute, pas l'aperçu
		// (Entrée dans un champ peut arriver avant la fin de la pause de frappe)
		clearTimeout(previewTimer);
		previewScript = script;
		const check = evaluateStoredFigure(script);
		if (!check.ok) {
			toaster.error('Le texte contient une erreur : la figure ne peut pas être enregistrée');
			return;
		}
		if (!title.trim()) {
			toaster.error('Le titre est requis');
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
			const outcome = await submitAction<{ id?: string; warning?: string }>('?/save', formData);
			if (!outcome.ok) {
				toaster.error(outcome.message);
				return;
			}
			// Créée mais sans ses tags : on la rouvre en modification (un nouvel envoi
			// depuis cette page créerait un doublon)
			if (outcome.data?.warning && outcome.data.id) {
				toaster.warning(outcome.data.warning);
				await goto(`${listHref}/${outcome.data.id}/edit`);
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

	<Card.Root>
		<Card.Header>
			<Card.Title class="text-base">Affichage</Card.Title>
			<Card.Description>
				Ces champs écrivent l'en-tête du texte (au-dessus de la ligne ---) ; l'en-tête modifié à la
				main les met à jour.
				{#if !hasFigureHeader(script)}
					<span class="mt-1 block text-warning">
						Texte sans en-tête : régler un champ crée l'en-tête, qui garde l'affichage actuel
						(grille, axes, points déplaçables).
					</span>
				{/if}
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<fieldset class="space-y-2">
				<legend class="text-sm font-medium">Fenêtre (vide : vue par défaut)</legend>
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
					{#each WINDOW_LABELS as label, index (label)}
						<div class="space-y-1">
							<Label for="figure-window-{index}" class="text-xs text-muted-foreground">
								{label}
							</Label>
							<Input
								id="figure-window-{index}"
								inputmode="decimal"
								value={windowFields[index]}
								oninput={(e) => setWindowField(index, e.currentTarget.value)}
							/>
						</div>
					{/each}
				</div>
			</fieldset>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div class="space-y-2">
					<span class="text-sm font-medium">Taille</span>
					<MySelect
						type="single"
						bind:value={() => sizeField, (v) => setField('taille', v, 'moyenne')}
						items={sizeItems}
						placeholder="Taille"
						triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
					/>
				</div>
				<div class="space-y-2">
					<span class="text-sm font-medium">Rendu</span>
					<MySelect
						type="single"
						bind:value={() => renderField, (v) => setField('rendu', v, 'normal')}
						items={renderItems}
						placeholder="Rendu"
						triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
					/>
				</div>
				<div class="space-y-2">
					<Label for="figure-grid">Grille (pas, vide : aucune)</Label>
					<Input
						id="figure-grid"
						value={gridField}
						placeholder="ex. 1 ou 1 ; 2"
						oninput={(e) => setField('grille', e.currentTarget.value, '')}
					/>
				</div>
				<div class="space-y-2">
					<Label for="figure-ticks">Graduations (pas, ou non)</Label>
					<Input
						id="figure-ticks"
						value={ticksField}
						placeholder="pas de la grille"
						oninput={(e) => setField('graduations', e.currentTarget.value, '')}
					/>
				</div>
			</div>
			<div class="flex flex-wrap gap-x-6 gap-y-2">
				<MyCheckbox
					bind:checked={() => axesField, (v) => setField('axes', v ? 'oui' : 'non', 'non')}
					label="Axes"
				/>
				<MyCheckbox
					bind:checked={
						() => draggableField, (v) => setField('deplacable', v ? 'oui' : 'non', 'non')
					}
					label="Points déplaçables (les curseurs restent toujours actifs)"
				/>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="grid gap-6 xl:grid-cols-2">
		<div class="min-w-0 space-y-2">
			<Label for="figure-script">Texte de la figure (en-tête, ---, script)</Label>
			<Textarea
				id="figure-script"
				bind:value={script}
				oninput={scheduleRefresh}
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
				<StoredFigurePreview {result} onWindowChange={(w) => (currentWindow = w)} />
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={!result?.ok || currentWindow === null || isPreviewPending}
					onclick={takeCurrentFraming}
				>
					Prendre le cadrage actuel
				</Button>
				<span class="text-xs text-muted-foreground">
					Zoom à la molette, déplacement avec la barre d'espace enfoncée
				</span>
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
			Le texte contient une erreur : corrige-la pour pouvoir enregistrer.
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
