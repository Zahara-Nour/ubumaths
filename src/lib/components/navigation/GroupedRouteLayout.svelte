<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '#lib/utils.ts';
	import type { Component, Snippet } from 'svelte';

	type Tab = {
		href: string;
		label: string;
		icon?: Component;
		/** Nombre à signaler (affiché s'il est > 0), ou `'?'` quand il est inconnu. */
		badge?: number | '?';
		/** Infobulle et nom lu de la pastille (ex. « Nombre de signalements inconnu »). */
		badgeLabel?: string;
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
		return page.url.pathname.startsWith(href);
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<!-- Libellé de rubrique, pas un titre : le seul h1 est celui de la page -->
		<div class="text-2xl font-bold tracking-tight sm:text-3xl">{title}</div>
		{#if description}
			<p class="mt-1 text-muted-foreground">{description}</p>
		{/if}
	</div>

	<!-- Tab Navigation -->
	<div
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
				{#if tab.badge === '?' || (tab.badge && tab.badge > 0)}
					<span
						title={tab.badgeLabel}
						class={cn(
							'ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold',
							isActiveTab(tab.href)
								? 'bg-primary-foreground text-primary'
								: 'bg-amber-500 text-white'
						)}
					>
						{tab.badge}
						{#if tab.badgeLabel}
							<span class="sr-only">{tab.badgeLabel}</span>
						{/if}
					</span>
				{/if}
			</a>
		{/each}
	</div>

	<!-- Content -->
	<div role="tabpanel">
		{@render children()}
	</div>
</div>
