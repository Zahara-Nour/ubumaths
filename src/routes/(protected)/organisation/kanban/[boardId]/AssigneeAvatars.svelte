<!--
	AssigneeAvatars
	===============

	Compact stack of avatar circles representing the users assigned to a card.
	Pure presentational component — takes the resolved member objects (id +
	name + avatar_url) and renders up to N stacked avatars; anything past the
	limit is shown as "+M" badge.

	Avatar resolution falls back gracefully:
	- avatar_url present AND image loads → <img>
	- avatar_url present BUT image fails to load (broken URL, 404, RLS) →
	  initials over the deterministic colour
	- avatar_url missing → initials directly
	- full_name missing → "?" on the colour

	The colour is always set on the wrapping div, so the initials are visible
	underneath while an image is still loading (avoids a flash of empty disc).
-->

<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import type { KanbanBoardMember } from '$lib/types/database-helpers';

	type Props = {
		assignees: KanbanBoardMember[];
		/** How many avatars to show inline before collapsing into +N. */
		max?: number;
		/** Tailwind size class applied to each circle (default w-5 h-5). */
		sizeClass?: string;
	};

	let { assignees, max = 3, sizeClass = 'h-5 w-5 text-[0.625rem]' }: Props = $props();

	const visible = $derived(assignees.slice(0, max));
	const overflow = $derived(Math.max(0, assignees.length - max));

	// Ids whose avatar_url failed to load. Marked via the <img onerror>
	// handler; once an id is in here we render initials instead of the
	// broken-image icon the browser would otherwise display.
	const failedAvatars = new SvelteSet<string>();

	/**
	 * Build the displayed initials from a full name: first letter of the
	 * first word + first letter of the last word (if different), e.g.
	 * "Jean Dupont" → "JD". Falls back to "?" when no name is available.
	 */
	function initials(name: string | null): string {
		if (!name) return '?';
		const parts = name.trim().split(/\s+/);
		if (parts.length === 0) return '?';
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}

	/**
	 * Deterministic background colour based on the user id, so the same user
	 * always gets the same shade across cards and dialogs. We use literal hex
	 * codes rather than Tailwind utilities so the JIT can't strip the dynamic
	 * class names (it can't statically infer which one we'll pick).
	 */
	const COLORS = [
		'#3b82f6', // blue
		'#a855f7', // purple
		'#ec4899', // pink
		'#f97316', // orange
		'#f59e0b', // amber
		'#22c55e', // green
		'#14b8a6', // teal
		'#0ea5e9' // sky
	] as const;

	function colorFor(id: string): string {
		let hash = 0;
		for (let i = 0; i < id.length; i++) {
			hash = (hash * 31 + id.charCodeAt(i)) | 0;
		}
		return COLORS[Math.abs(hash) % COLORS.length];
	}
</script>

<div class="flex -space-x-1.5">
	{#each visible as member (member.id)}
		{@const showImage = !!member.avatar_url && !failedAvatars.has(member.id)}
		<div
			class={[
				sizeClass,
				'inline-flex items-center justify-center overflow-hidden rounded-full font-medium text-white ring-2 ring-card'
			]}
			style={`background-color: ${colorFor(member.id)}`}
			title={member.full_name ?? 'Utilisateur'}
			aria-label={`Assigné·e : ${member.full_name ?? 'utilisateur'}`}
		>
			{#if showImage}
				<img
					src={member.avatar_url}
					alt={member.full_name ?? 'avatar'}
					class="h-full w-full object-cover"
					onerror={() => failedAvatars.add(member.id)}
				/>
			{:else}
				{initials(member.full_name)}
			{/if}
		</div>
	{/each}

	{#if overflow > 0}
		<div
			class={[
				sizeClass,
				'inline-flex items-center justify-center rounded-full bg-muted font-medium text-muted-foreground ring-2 ring-card'
			]}
			aria-label={`${overflow} autre${overflow > 1 ? 's' : ''} personne${overflow > 1 ? 's' : ''} assignée${overflow > 1 ? 's' : ''}`}
		>
			+{overflow}
		</div>
	{/if}
</div>
