<script lang="ts" module>
	import { SvelteSet } from 'svelte/reactivity';
	const failedUrls = new SvelteSet<string>();
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { getAvatarFallback, getAvatarInitials, type UserRole } from '$lib/utils/avatar';

	interface Props {
		avatar_url?: string | null;
		role?: string | null;
		firstname?: string | null;
		lastname?: string | null;
		class?: string;
	}

	let {
		avatar_url = null,
		role = 'student',
		firstname = null,
		lastname = null,
		class: className = 'h-10 w-10'
	}: Props = $props();

	const fallbackSrc = $derived(getAvatarFallback((role as UserRole) || 'student'));
	const initials = $derived(getAvatarInitials(firstname, lastname));
	const src = $derived(avatar_url && !failedUrls.has(avatar_url) ? avatar_url : fallbackSrc);

	function handleImgError() {
		if (avatar_url) {
			failedUrls.add(avatar_url);
		}
	}
</script>

<div class={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}>
	<span class="absolute inset-0 flex items-center justify-center bg-muted text-xs">
		{initials}
	</span>
	<img
		{src}
		alt={firstname ? `${firstname} ${lastname ?? ''}`.trim() : 'User'}
		class="relative z-10 aspect-square size-full object-cover"
		onerror={handleImgError}
	/>
</div>
