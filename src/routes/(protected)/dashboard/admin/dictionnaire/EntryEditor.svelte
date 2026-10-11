<!--
	Fiche d'une entrée du dictionnaire, en édition (ADR 0022, comportements 6 à 9)
	===========================================================================

	Édite un brouillon ; « Enregistrer » l'envoie au serveur, qui vérifie les
	règles de cohérence. Un refus montre ses messages et ne change rien.
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { GRADE_CODES, GRADES, type GradeCode } from '$lib/types/grades';
	import { markDictionaryEdited } from '$lib/dictionary/fetch-dictionary';
	import { refreshLexiconRuntime } from '$lib/lexicon/runtime-store.svelte';
	import {
		draftToInput,
		newItemKey,
		parallelGrades,
		pruneShares,
		rowToDraft,
		type AdminDictionaryRow,
		type DictionaryVersion,
		type DraftField,
		type EntryDraft
	} from '$lib/dictionary/admin-draft';
	import { Plus, Trash2, Eye, EyeOff, History, Save } from '@lucide/svelte';

	interface Props {
		/** L'entrée ouverte, ou `null` pour une nouvelle entrée. */
		row: AdminDictionaryRow | null;
		/** Noms des mots principaux, pour le renvoi. */
		principalNames: string[];
		onsaved: (row: AdminDictionaryRow) => void;
	}

	let { row, principalNames, onsaved }: Props = $props();

	// La page recrée la fiche (`{#key}`) quand une autre entrée est ouverte
	// svelte-ignore state_referenced_locally
	let draft = $state<EntryDraft>(rowToDraft(row));
	let problems = $state<string[]>([]);
	let saving = $state(false);
	let versions = $state<DictionaryVersion[] | null>(null);

	// Ce que la ligne enregistrée donnerait : le brouillon en diffère-t-il ?
	// svelte-ignore state_referenced_locally
	const savedInput = JSON.stringify(draftToInput(rowToDraft(row)));
	let dirty = $derived(JSON.stringify(draftToInput(draft)) !== savedInput);

	const gradeItems = GRADE_CODES.map((code) => ({ value: code, label: GRADES[code].displayName }));

	let derivedItems = $derived([
		{ value: '', label: '(aucun : mot principal)' },
		...principalNames.map((name) => ({ value: name, label: name }))
	]);

	/** La page demande confirmation avant de quitter une fiche modifiée. */
	export function isDirty(): boolean {
		return dirty;
	}

	function toggle(list: GradeCode[], grade: GradeCode, on: boolean): GradeCode[] {
		return on ? [...list.filter((g) => g !== grade), grade] : list.filter((g) => g !== grade);
	}

	function addItem(field: DraftField) {
		const last = field.items.at(-1)?.grade ?? draft.grade;
		field.items.push({ key: newItemKey(), grade: last, content: '', sharedWith: [] });
	}

	/** Réponse d'erreur du serveur : ses messages de refus, ou son message seul. */
	async function readProblems(response: Response): Promise<string[]> {
		const body: unknown = await response.json().catch(() => null);
		if (body && typeof body === 'object') {
			if ('problems' in body && Array.isArray(body.problems)) return body.problems.map(String);
			if ('message' in body && typeof body.message === 'string') return [body.message];
		}
		return [`Erreur ${response.status}`];
	}

	async function send(body: object, url: string, method: 'POST' | 'PATCH') {
		saving = true;
		problems = [];
		try {
			const response = await fetch(url, {
				method,
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!response.ok) {
				problems = await readProblems(response);
				toaster.error('Rien n’a été enregistré');
				return;
			}
			const saved: AdminDictionaryRow = await response.json();
			// Le site montre tout de suite la modification à l'admin
			markDictionaryEdited();
			void refreshLexiconRuntime();
			versions = null;
			toaster.success('Enregistré');
			onsaved(saved);
		} catch {
			problems = ['Serveur injoignable : rien n’a été enregistré.'];
		} finally {
			saving = false;
		}
	}

	function save() {
		const entry = draftToInput(draft);
		if (row) void send({ entry }, `/api/admin/dictionnaire/${row.id}`, 'PATCH');
		else void send(entry, '/api/admin/dictionnaire', 'POST');
	}

	function toggleHidden() {
		if (row) void send({ hidden: !row.hidden }, `/api/admin/dictionnaire/${row.id}`, 'PATCH');
	}

	async function loadVersions() {
		if (!row) return;
		try {
			const response = await fetch(`/api/admin/dictionnaire/${row.id}/versions`);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			versions = await response.json();
		} catch {
			toaster.error('Historique illisible : serveur injoignable ou réponse invalide');
		}
	}

	function versionSummary(entry: DictionaryVersion['entry']): string {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return '';
		const definitions = entry.definitions;
		if (!definitions || typeof definitions !== 'object' || Array.isArray(definitions)) return '';
		const items = definitions.items;
		if (!Array.isArray(items)) return '';
		return items
			.map((item) =>
				item && typeof item === 'object' && !Array.isArray(item) ? String(item.content ?? '') : ''
			)
			.join(' · ');
	}
</script>

{#snippet shares(grade: GradeCode, selected: GradeCode[], onchange: (next: GradeCode[]) => void)}
	{@const parallels = parallelGrades(grade)}
	{#if parallels.length > 0}
		<div class="flex flex-wrap items-center gap-3 text-sm">
			<span class="text-muted-foreground">Partagé avec</span>
			{#each parallels as other (other)}
				<MyCheckbox
					checked={selected.includes(other)}
					label={GRADES[other].displayName}
					onchange={(on) => onchange(toggle(selected, other, on))}
				/>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet gradedField(title: string, field: DraftField)}
	<fieldset class="space-y-3">
		<legend class="font-semibold">{title}</legend>
		{#each field.items as item, index (item.key)}
			<div class="space-y-2 rounded-md border p-3">
				<div class="flex items-center gap-2">
					<div class="w-48">
						<MySelect
							type="single"
							bind:value={item.grade}
							onValueChange={(grade) =>
								(item.sharedWith = pruneShares(grade as GradeCode, item.sharedWith))}
							items={gradeItems}
							triggerAriaLabel={`${title} ${index + 1} : ${GRADES[item.grade].displayName}`}
						/>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onclick={() => field.items.splice(index, 1)}
						aria-label="Retirer ce niveau"
					>
						<Trash2 class="size-4" />
					</Button>
				</div>
				<Textarea bind:value={item.content} rows={3} aria-label={`${title} ${index + 1}`} />
				{#if item.content.trim() !== ''}
					<div class="rounded bg-muted/50 p-2 text-sm">
						<InlineMarkdown content={item.content} />
					</div>
				{/if}
				{@render shares(item.grade, item.sharedWith, (next) => (item.sharedWith = next))}
			</div>
		{/each}
		<Button variant="outline" size="sm" onclick={() => addItem(field)}>
			<Plus class="mr-1 size-4" /> Ajouter un niveau
		</Button>
	</fieldset>
{/snippet}

<div class="space-y-6">
	<div class="flex flex-wrap items-center gap-2">
		<h2 class="text-xl font-bold">{row ? row.term : 'Nouvelle entrée'}</h2>
		{#if row?.hidden}<Badge variant="secondary">masquée</Badge>{/if}
	</div>
	{#if row?.hidden}
		<p class="text-sm text-muted-foreground">
			Masquée : personne ne la lit, et ses règles ne sont pas vérifiées. Elles le seront à son
			réaffichage.
		</p>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		<label class="space-y-1 text-sm">
			<span class="font-medium">Mot</span>
			<Input bind:value={draft.term} />
		</label>
		<label class="space-y-1 text-sm">
			<span class="font-medium">Étiquette de sens (mot à plusieurs sens)</span>
			<Input bind:value={draft.sense} placeholder="ex. géométrie" />
		</label>
		<div class="space-y-1 text-sm">
			<span class="font-medium">Niveau du mot</span>
			<MySelect
				type="single"
				bind:value={draft.grade}
				onValueChange={(grade) =>
					(draft.sharedWith = pruneShares(grade as GradeCode, draft.sharedWith))}
				items={gradeItems}
				triggerAriaLabel={`Niveau du mot : ${GRADES[draft.grade].displayName}`}
			/>
		</div>
		<div class="space-y-1 text-sm">
			<span class="font-medium">Renvoi vers</span>
			<MySelect
				type="single"
				bind:value={draft.derivedFrom}
				items={derivedItems}
				triggerAriaLabel={`Renvoi vers : ${draft.derivedFrom || 'aucun'}`}
			/>
		</div>
		<label class="space-y-1 text-sm">
			<span class="font-medium">Thèmes (séparés par des virgules)</span>
			<Input bind:value={draft.tags} />
		</label>
		<label class="space-y-1 text-sm">
			<span class="font-medium">Synonymes</span>
			<Input bind:value={draft.synonyms} />
		</label>
		<label class="space-y-1 text-sm">
			<span class="font-medium">Formes conjuguées</span>
			<Input bind:value={draft.forms} placeholder="ex. résous, résolvez" />
		</label>
		<div class="flex items-end pb-2">
			<MyCheckbox bind:checked={draft.neverLinked} label="Jamais souligné dans les énoncés" />
		</div>
	</div>

	{@render shares(draft.grade, draft.sharedWith, (next) => (draft.sharedWith = next))}

	{@render gradedField('Définitions', draft.definitions)}
	{@render gradedField('Exemples', draft.exemples)}

	<label class="block space-y-1 text-sm">
		<span class="font-semibold">Note historique</span>
		<Textarea bind:value={draft.history} rows={3} />
	</label>

	{#if problems.length > 0}
		<div role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
			<p class="font-semibold">Rien n’a été enregistré :</p>
			<ul class="list-disc pl-5">
				{#each problems as problem (problem)}<li>{problem}</li>{/each}
			</ul>
		</div>
	{/if}

	<div class="flex flex-wrap gap-2">
		<Button onclick={save} disabled={saving}>
			<Save class="mr-1 size-4" />
			{row ? 'Enregistrer' : 'Ajouter l’entrée'}
		</Button>
		{#if row}
			<!-- Masquer recharge la fiche : le brouillon non enregistré serait perdu -->
			<Button variant="outline" onclick={toggleHidden} disabled={saving || dirty}>
				{#if row.hidden}
					<Eye class="mr-1 size-4" /> Réafficher
				{:else}
					<EyeOff class="mr-1 size-4" /> Masquer
				{/if}
			</Button>
			<Button variant="ghost" onclick={loadVersions}>
				<History class="mr-1 size-4" /> Historique
			</Button>
		{/if}
	</div>
	{#if row && dirty}
		<p class="text-sm text-muted-foreground">
			Enregistre d’abord tes modifications pour {row.hidden ? 'réafficher' : 'masquer'} l’entrée.
		</p>
	{/if}

	{#if versions}
		<section class="space-y-2">
			<h3 class="font-semibold">Versions précédentes</h3>
			{#if versions.length === 0}
				<p class="text-sm text-muted-foreground">Aucune modification depuis la reprise.</p>
			{/if}
			<ul class="space-y-2 text-sm">
				{#each versions as version (version.id)}
					<li class="rounded border p-2">
						<p class="text-muted-foreground">
							Remplacée le {new Date(version.savedAt).toLocaleString('fr-FR')}
							{#if version.savedBy}par {version.savedBy}{/if}
						</p>
						<p>{versionSummary(version.entry)}</p>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
