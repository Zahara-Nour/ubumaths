<!--
	AssigneeAvatars
	===============

	Compact stack of avatar circles representing the users assigned to a card.
	Pure presentational component — takes the resolved member objects and
	renders up to N stacked avatars; anything past the limit collapses into a
	"+M" badge.

	Each circle delegates to the project's UserAvatar, which already handles
	the full fallback cascade (real photo → role-based default image →
	initials). That gives us consistent behaviour with the rest of the app
	(header, friends list, etc.).
-->

<script lang="ts">
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import type { KanbanBoardMember } from '$lib/types/database-helpers';

	type Props = {
		assignees: KanbanBoardMember[];
		/** How many avatars to show inline before collapsing into +N. */
		max?: number;
		/** Tailwind size class applied to each circle (default w-5 h-5). */
		sizeClass?: string;
	};

	let { assignees, max = 3, sizeClass = 'h-5 w-5' }: Props = $props();

	const visible = $derived(assignees.slice(0, max));
	const overflow = $derived(Math.max(0, assignees.length - max));
</script>

<div class="flex -space-x-1.5">
	{#each visible as member (member.id)}
		<div
			class="rounded-full ring-2 ring-card"
			title={member.full_name ?? 'Utilisateur'}
			aria-label={`Assigné·e : ${member.full_name ?? 'utilisateur'}`}
		>
			<UserAvatar
				avatar_url={member.avatar_url}
				role={member.role}
				firstname={member.firstname}
				lastname={member.lastname}
				class={sizeClass}
				decorative
			/>
		</div>
	{/each}

	{#if overflow > 0}
		<div
			class={[
				sizeClass,
				'inline-flex items-center justify-center rounded-full bg-muted text-[0.625rem] font-medium text-muted-foreground ring-2 ring-card'
			]}
			aria-label={`${overflow} autre${overflow > 1 ? 's' : ''} personne${overflow > 1 ? 's' : ''} assignée${overflow > 1 ? 's' : ''}`}
		>
			+{overflow}
		</div>
	{/if}
</div>
