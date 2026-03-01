<script lang="ts">
	import { cn } from '$lib/utils.js';
	import {
		getAvatarUrl,
		getAvatarFallback,
		getAvatarInitials,
		type UserRole
	} from '$lib/utils/avatar';

	interface Props {
		avatar_url?: string | null;
		role?: string | null;
		firstname?: string | null;
		lastname?: string | null;
		class?: string;
		user?: { user_metadata?: { picture?: string; avatar_url?: string } };
	}

	let {
		avatar_url = null,
		role = 'student',
		firstname = null,
		lastname = null,
		class: className = 'h-10 w-10',
		user = undefined
	}: Props = $props();

	const primarySrc = $derived(getAvatarUrl({ avatar_url, role }, user));
	const fallbackSrc = $derived(getAvatarFallback((role as UserRole) || 'student'));
	const initials = $derived(getAvatarInitials(firstname, lastname));

	let primaryFailed = $state(false);
	let fallbackFailed = $state(false);

	// Reset when the avatar source changes
	$effect(() => {
		void primarySrc;
		primaryFailed = false;
		fallbackFailed = false;
	});

	const imgSrc = $derived(!primaryFailed ? primarySrc : fallbackSrc);
	const showImg = $derived(!primaryFailed || (!fallbackFailed && primarySrc !== fallbackSrc));

	function handleImgError() {
		if (!primaryFailed) {
			primaryFailed = true;
		} else {
			fallbackFailed = true;
		}
	}
</script>

<div class={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}>
	{#if showImg}
		{#key imgSrc}
			<img
				src={imgSrc}
				alt={firstname ? `${firstname} ${lastname ?? ''}`.trim() : 'User'}
				class="aspect-square size-full object-cover"
				loading="lazy"
				onerror={handleImgError}
			/>
		{/key}
	{:else}
		<span class="flex size-full items-center justify-center rounded-full bg-muted text-xs">
			{initials}
		</span>
	{/if}
</div>
