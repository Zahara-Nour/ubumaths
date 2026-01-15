<!--
	Consent-Aware Button Component
	==============================

	A wrapper around the standard Button that automatically disables
	when the current student lacks parental consent (RGPD Article 8).

	Props:
	- All standard Button props (variant, size, disabled, etc.)
	- requiresConsent: Whether this action requires parental consent (default: true)

	Features:
	- Automatically disables if consent.isReadOnly is true
	- Shows tooltip explaining why button is disabled
	- Falls back to standard Button behavior if requiresConsent is false

	Usage:
	```svelte
	<ConsentButton onclick={handleSubmit}>
		Soumettre
	</ConsentButton>
	```
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { consent } from '$lib/stores/consent.svelte';
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
		size?: 'default' | 'sm' | 'lg' | 'icon';
		requiresConsent?: boolean;
		children?: Snippet;
		onclick?: (e: MouseEvent) => void;
	}

	let {
		variant = 'default',
		size = 'default',
		requiresConsent = true,
		disabled = false,
		children,
		onclick,
		...restProps
	}: Props = $props();

	// Check if button should be disabled due to consent
	const isConsentDisabled = $derived(requiresConsent && consent.isReadOnly);
	const isDisabled = $derived(disabled || isConsentDisabled);
	const tooltipText = $derived(isConsentDisabled ? consent.getDisabledTooltip() : '');
</script>

{#if isConsentDisabled}
	<!-- Wrap in tooltip when disabled due to consent -->
	<Tooltip.Root>
		<Tooltip.Trigger asChild>
			{#snippet child({ props })}
				<span {...props} class="inline-block">
					<Button {variant} {size} disabled={isDisabled} {onclick} {...restProps}>
						{#if children}
							{@render children()}
						{/if}
					</Button>
				</span>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content>
			<p>{tooltipText}</p>
		</Tooltip.Content>
	</Tooltip.Root>
{:else}
	<!-- Standard button without tooltip wrapper -->
	<Button {variant} {size} disabled={isDisabled} {onclick} {...restProps}>
		{#if children}
			{@render children()}
		{/if}
	</Button>
{/if}
