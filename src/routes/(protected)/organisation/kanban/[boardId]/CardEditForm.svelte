<!--
	CardEditForm
	============

	Internal subcomponent of `CardEditDialog`. Renders the title + description
	editor and the optional due-date picker, pushing the working values up via
	`bind:` props.

	Why a dedicated component? It is mounted inside a `{#key card.id}` block in
	the parent, so swapping the edited card automatically remounts this
	subtree — the `$bindable` props re-initialise from the parent's freshly
	seeded values on mount, no `$effect` needed.
-->

<script lang="ts">
	import { CalendarDays, Settings2, X } from 'lucide-svelte';
	import { CalendarDate, type DateValue } from '@internationalized/date';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import { Calendar } from '$lib/components/ui/calendar';
	import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
	import type { KanbanTag } from '$lib/types/database-helpers';
	import { TAG_COLOR_TOKENS } from './tag-colors';

	type Props = {
		/** Current title (bindable so the parent can read it). */
		title: string;
		/** Current description / markdown (bindable). */
		description: string;
		/** Optional due date as an ISO 8601 string at UTC midnight, or null. */
		dueDate: string | null;
		/** Selected tag ids (bindable; the parent diffs against the initial set). */
		tagIds: string[];
		/** Full per-board tag palette, sorted alphabetically by the parent. */
		availableTags: KanbanTag[];
		/** Open the manage-tags dialog (owner only). Hidden when undefined. */
		onManageTags?: () => void;
	};

	let {
		title = $bindable(''),
		description = $bindable(''),
		dueDate = $bindable<string | null>(null),
		tagIds = $bindable<string[]>([]),
		availableTags,
		onManageTags
	}: Props = $props();

	const selectedSet = $derived(new Set(tagIds));

	function toggleTag(tagId: string) {
		if (selectedSet.has(tagId)) {
			tagIds = tagIds.filter((id) => id !== tagId);
		} else {
			tagIds = [...tagIds, tagId];
		}
	}

	// --- Due-date plumbing ---
	// The Calendar component speaks `@internationalized/date` DateValue. We mirror
	// the bindable ISO string into a local DateValue and back, so both sides can
	// keep their natural representations.

	function toDateValue(iso: string | null): DateValue | undefined {
		if (!iso) return undefined;
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return undefined;
		// We treat the stored timestamp as a calendar date (no meaningful time).
		// Reading UTC components keeps "2026-06-12T00:00:00.000Z" → 2026-06-12
		// regardless of the user's timezone.
		return new CalendarDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
	}

	function fromDateValue(dv: DateValue | undefined): string | null {
		if (!dv) return null;
		return new Date(Date.UTC(dv.year, dv.month - 1, dv.day, 0, 0, 0)).toISOString();
	}

	let calendarValue = $state<DateValue | undefined>(toDateValue(dueDate));
	let popoverOpen = $state(false);

	// Sync local DateValue → parent ISO whenever the user picks (or clears) a
	// date. Comparing first avoids a re-write loop when the parent updates
	// `dueDate` from elsewhere.
	$effect(() => {
		const next = fromDateValue(calendarValue);
		if (next !== dueDate) dueDate = next;
	});

	const dueDateLabel = $derived.by(() => {
		if (!dueDate) return 'Aucune échéance';
		const d = new Date(dueDate);
		if (Number.isNaN(d.getTime())) return 'Aucune échéance';
		const sameYear = d.getUTCFullYear() === new Date().getUTCFullYear();
		return new Intl.DateTimeFormat('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: sameYear ? undefined : 'numeric',
			timeZone: 'UTC'
		}).format(d);
	});

	function clearDate() {
		calendarValue = undefined;
		popoverOpen = false;
	}

	function handleDatePicked(next: DateValue | undefined) {
		calendarValue = next;
		if (next) popoverOpen = false;
	}
</script>

<div class="flex flex-col gap-2">
	<Label for="card-title">Titre</Label>
	<Input
		id="card-title"
		bind:value={title}
		placeholder="Titre de la carte"
		maxlength={200}
		required
	/>
	<p class="text-xs text-muted-foreground">{title.length} / 200</p>
</div>

<div class="flex flex-col gap-2">
	<Label>Échéance</Label>
	<div class="flex items-center gap-2">
		<Popover.Root bind:open={popoverOpen}>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						type="button"
						variant="outline"
						class="justify-start gap-2 font-normal {!dueDate ? 'text-muted-foreground' : ''}"
					>
						<CalendarDays class="h-4 w-4" aria-hidden="true" />
						{dueDateLabel}
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-auto p-0" align="start">
				<Calendar
					type="single"
					value={calendarValue}
					onValueChange={handleDatePicked}
					locale="fr-FR"
				/>
			</Popover.Content>
		</Popover.Root>
		{#if dueDate}
			<Button
				type="button"
				variant="ghost"
				size="icon"
				onclick={clearDate}
				aria-label="Retirer l'échéance"
			>
				<X class="h-4 w-4" aria-hidden="true" />
			</Button>
		{/if}
	</div>
</div>

<div class="flex flex-col gap-2">
	<div class="flex items-center justify-between">
		<Label>Tags</Label>
		{#if onManageTags}
			<Button
				type="button"
				variant="ghost"
				size="sm"
				class="h-7 gap-1 text-xs"
				onclick={onManageTags}
			>
				<Settings2 class="h-3.5 w-3.5" aria-hidden="true" />
				Gérer les tags
			</Button>
		{/if}
	</div>
	{#if availableTags.length === 0}
		<p class="text-sm text-muted-foreground">
			{#if onManageTags}
				Aucun tag sur ce tableau. Cliquez sur « Gérer les tags » pour en créer.
			{:else}
				Aucun tag disponible sur ce tableau.
			{/if}
		</p>
	{:else}
		<!--
			Toggle list. Each tag chip is a real <button> so it's keyboard
			activatable. Selected chips get a darker swatch background; unselected
			ones use a subtler tinted background plus an outline.
		-->
		<div class="flex flex-wrap gap-1.5" role="group" aria-label="Sélectionner des tags">
			{#each availableTags as tag (tag.id)}
				{@const selected = selectedSet.has(tag.id)}
				<button
					type="button"
					aria-pressed={selected}
					class={[
						'inline-flex items-center rounded px-2 py-1 text-xs font-medium transition-colors',
						selected
							? TAG_COLOR_TOKENS[tag.color].swatch
							: `border border-transparent ${TAG_COLOR_TOKENS[tag.color].chip} opacity-70 hover:opacity-100`
					]}
					onclick={() => toggleTag(tag.id)}
				>
					{tag.name}
				</button>
			{/each}
		</div>
	{/if}
</div>

<div class="flex flex-col gap-2">
	<Label for="card-description">Description</Label>
	<div id="card-description" class="rounded-md border">
		<RichTextEditor
			bind:markdownValue={description}
			preset="standard"
			minHeight="200px"
			maxHeight="40vh"
		/>
	</div>
	<p class="text-xs text-muted-foreground">
		{description.length} / 50000 caractères
	</p>
</div>
