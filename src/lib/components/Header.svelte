<script lang="ts">
	import { AppBar } from '@skeletonlabs/skeleton-svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { fontSize } from '$lib/stores/fontSize.svelte';
	import { goto } from '$app/navigation';
	import { invalidate } from '$app/navigation';
	import type { Session, User, SupabaseClient } from '@supabase/supabase-js';

	let {
		title = 'UbuMaths',
		session = null,
		user = null,
		supabase
	}: {
		title?: string;
		session?: Session | null;
		user?: User | null;
		supabase?: SupabaseClient;
	} = $props();

	async function handleLogout() {
		if (!supabase) return;
		await supabase.auth.signOut();
		await invalidate('supabase:auth');
		goto('/');
	}
</script>

<AppBar>
	{#snippet lead()}
		<h1 class="text-2xl font-bold">{title}</h1>
	{/snippet}

	{#snippet trail()}
		<nav class="flex items-center gap-2">
			<!-- Home link -->
			<a href="/" class="btn btn-sm variant-ghost-surface">Home</a>

			<!-- Auth buttons -->
			{#if session}
				<div class="flex items-center gap-2 border-l border-surface-400-500 pl-2">
					<span class="text-sm">{user?.email}</span>
					<button onclick={handleLogout} class="btn btn-sm variant-filled-primary">
						Logout
					</button>
				</div>
			{:else}
				<a href="/login" class="btn btn-sm variant-filled-primary">Login</a>
			{/if}

			<!-- Font size controls -->
			<div class="flex items-center gap-1 border-l border-surface-400-500 pl-2">
				<button
					onclick={() => fontSize.decrease()}
					disabled={!fontSize.canDecrease}
					class="btn-icon btn-icon-sm variant-filled-surface"
					aria-label="Decrease font size"
					title="Decrease font size"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
					</svg>
				</button>
				<span class="text-sm font-medium">A</span>
				<button
					onclick={() => fontSize.increase()}
					disabled={!fontSize.canIncrease}
					class="btn-icon btn-icon-sm variant-filled-surface"
					aria-label="Increase font size"
					title="Increase font size"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
				</button>
			</div>

			<!-- Dark mode toggle -->
			<button
				onclick={() => theme.toggle()}
				class="btn-icon btn-icon-sm variant-filled-surface"
				aria-label="Toggle dark mode"
			>
				{#if theme.dark}
					<!-- Sun icon -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
						/>
					</svg>
				{:else}
					<!-- Moon icon -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
						/>
					</svg>
				{/if}
			</button>
		</nav>
	{/snippet}
</AppBar>
