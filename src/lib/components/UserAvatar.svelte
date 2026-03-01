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
	const imgSrc = $derived(avatar_url || fallbackSrc);
	const initials = $derived(getAvatarInitials(firstname, lastname));

	function handleImgError(e: Event) {
		const img = e.currentTarget as HTMLImageElement;
		if (avatar_url && img.dataset.fallback !== 'true') {
			img.dataset.fallback = 'true';
			img.src = fallbackSrc;
		} else {
			img.style.display = 'none';
		}
	}
</script>

<div class={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}>
	<span class="absolute inset-0 flex items-center justify-center bg-muted text-xs">
		{initials}
	</span>
	{#key imgSrc}
		<img
			src={imgSrc}
			alt={firstname ? `${firstname} ${lastname ?? ''}`.trim() : 'User'}
			class="relative z-10 aspect-square size-full object-cover"
			loading="lazy"
			onerror={handleImgError}
		/>
	{/key}
</div>
