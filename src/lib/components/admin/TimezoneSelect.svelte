<script lang="ts">
	/**
	 * TimezoneSelect - IANA Timezone Selector with Search
	 *
	 * Features:
	 * - Searchable dropdown with all IANA timezones
	 * - Grouped by region (Common, Europe, America, Asia, etc.)
	 * - Shows UTC offset for each timezone
	 * - Common timezones marked with ★
	 *
	 * @example
	 * <TimezoneSelect bind:value={selectedTimezone} />
	 */

	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import {
		TIMEZONE_GROUPS,
		getTimezoneLabel,
		getTimezoneOffset,
		DEFAULT_TIMEZONE
	} from '$lib/utils/timezones';

	let {
		value = $bindable(DEFAULT_TIMEZONE),
		disabled = false,
		required = false,
		label = 'Fuseau horaire'
	}: {
		value?: string;
		disabled?: boolean;
		required?: boolean;
		label?: string;
	} = $props();

	let searchQuery = $state('');
	let isOpen = $state(false);
	let dropdownRef = $state<HTMLDivElement | null>(null);

	// Selected timezone display
	const selectedDisplay = $derived(() => {
		const label = getTimezoneLabel(value);
		const offset = getTimezoneOffset(value);
		return `${label} (UTC${offset})`;
	});

	// Filtered timezones by search query
	const filteredGroups = $derived(() => {
		const query = searchQuery.toLowerCase().trim();

		if (!query) {
			return TIMEZONE_GROUPS;
		}

		const filtered: Record<string, string[]> = {};

		for (const [region, timezones] of Object.entries(TIMEZONE_GROUPS)) {
			const matchedTimezones = timezones.filter((tz) => {
				const label = getTimezoneLabel(tz).toLowerCase();
				const offset = getTimezoneOffset(tz);
				return (
					label.includes(query) ||
					tz.toLowerCase().includes(query) ||
					offset.includes(query) ||
					region.toLowerCase().includes(query)
				);
			});

			if (matchedTimezones.length > 0) {
				filtered[region] = matchedTimezones;
			}
		}

		return filtered;
	});

	function selectTimezone(tz: string) {
		value = tz;
		isOpen = false;
		searchQuery = '';
	}

	function toggleDropdown() {
		if (!disabled) {
			isOpen = !isOpen;
			if (isOpen) {
				searchQuery = '';
			}
		}
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
			isOpen = false;
			searchQuery = '';
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});
</script>

<div class="space-y-2">
	{#if label}
		<Label class="text-sm font-medium text-foreground">
			{label}
			{#if required}
				<span class="text-destructive">*</span>
			{/if}
		</Label>
	{/if}

	<div class="relative" bind:this={dropdownRef}>
		<!-- Trigger Button -->
		<Button
			type="button"
			variant="outline"
			onclick={toggleDropdown}
			{disabled}
			class="w-full justify-between text-left font-normal"
		>
			<span class="truncate">{selectedDisplay()}</span>
			<svg
				class="ml-2 h-4 w-4 shrink-0 opacity-50"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="6 9 12 15 18 9"></polyline>
			</svg>
		</Button>

		<!-- Dropdown -->
		{#if isOpen}
			<div
				class="absolute z-50 mt-2 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md"
			>
				<!-- Search Input -->
				<div class="border-b border-border p-2">
					<Input
						type="text"
						placeholder="Rechercher un fuseau horaire..."
						bind:value={searchQuery}
						class="h-9"
					/>
				</div>

				<!-- Timezone List -->
				<div class="max-h-[300px] overflow-y-auto p-1">
					{#each Object.entries(filteredGroups()) as [region, timezones] (region)}
						<div class="py-1">
							<div
								class="px-2 py-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
							>
								{region}
							</div>
							{#each timezones as tz (tz)}
								{@const label = getTimezoneLabel(tz)}
								{@const offset = getTimezoneOffset(tz)}
								{@const isCommon = region === 'Common'}
								{@const isSelected = tz === value}

								<button
									type="button"
									onclick={() => selectTimezone(tz)}
									class="flex w-full items-center justify-between rounded-sm px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground {isSelected
										? 'bg-accent text-accent-foreground'
										: ''}"
								>
									<span class="flex items-center gap-2">
										{#if isCommon}
											<span class="text-yellow-500">★</span>
										{/if}
										<span>{label}</span>
										<span class="text-xs text-muted-foreground">UTC{offset}</span>
									</span>
									{#if isSelected}
										<span class="text-accent-foreground">✓</span>
									{/if}
								</button>
							{/each}
						</div>
					{:else}
						<div class="p-4 text-center text-sm text-muted-foreground">
							Aucun fuseau horaire trouvé
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
