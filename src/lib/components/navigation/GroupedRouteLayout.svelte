<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils.js';
	import type { Component, Snippet } from 'svelte';

	type Tab = {
		href: string;
		label: string;
		icon?: Component;
		badge?: number;
	};

	let {
		title,
		description,
		tabs,
		children
	}: {
		title: string;
		description?: string;
		tabs: Tab[];
		children: Snippet;
	} = $props();

	function isActiveTab(href: string): boolean {
		return $page.url.pathname.startsWith(href);
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
		{#if description}
			<p class="mt-1 text-muted-foreground">{description}</p>
		{/if}
	</div>

	<!-- Tab Navigation -->
	<nav
		class="inline-flex h-auto w-fit items-center justify-center gap-3 rounded-lg bg-muted p-2 text-muted-foreground"
		role="tablist"
	>
		{#each tabs as tab (tab.href)}
			<a
				href={tab.href}
				role="tab"
				aria-selected={isActiveTab(tab.href)}
				class={cn(
					'inline-flex h-auto flex-none items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium whitespace-nowrap text-foreground transition-[color,box-shadow] hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring',
					isActiveTab(tab.href) &&
						'border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground'
				)}
			>
				{#if tab.icon}
					<tab.icon class="size-4" />
				{/if}
				{tab.label}
				{#if tab.badge && tab.badge > 0}
					<span
						class={cn(
							'ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold',
							isActiveTab(tab.href)
								? 'bg-primary-foreground text-primary'
								: 'bg-amber-500 text-white'
						)}
					>
						{tab.badge}
					</span>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- Content -->
	<div role="tabpanel">
		{@render children()}
	</div>
</div>
