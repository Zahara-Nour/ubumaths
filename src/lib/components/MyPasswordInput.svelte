<!--
	MyPasswordInput
	===============
	Champ mot de passe avec bouton « afficher / masquer ».

	Sans lui, on tape à l'aveugle — ce qui mène droit au blocage anti-force-brute
	après quelques essais, blocage de quinze minutes qui n'apprend rien à personne.

	Le bouton porte `tabindex={-1}` : il ne doit pas s'intercaler dans la
	tabulation entre le champ et le bouton de validation. On l'atteint à la
	souris ou au lecteur d'écran, pas en tabulant vers l'envoi.

	@example
	```svelte
	<MyPasswordInput id="password" name="password" autocomplete="current-password" required />
	<MyPasswordInput id="pwd" bind:value={password} autocomplete="new-password" />
	```
-->
<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Eye, EyeOff } from '@lucide/svelte';

	interface Props {
		/** Identifiant du champ, à relier au `<Label for>`. */
		id: string;
		/** Nom du champ pour une soumission de formulaire classique. */
		name?: string;
		/** Valeur liée, pour les formulaires pilotés côté client. */
		value?: string;
		autocomplete?: 'current-password' | 'new-password';
		required?: boolean;
		disabled?: boolean;
		placeholder?: string;
		class?: string;
	}

	let {
		id,
		name,
		value = $bindable(''),
		autocomplete = 'current-password',
		required = false,
		disabled = false,
		placeholder,
		class: className = ''
	}: Props = $props();

	let visible = $state(false);
</script>

<div class="relative">
	<Input
		{id}
		{name}
		{required}
		{disabled}
		{placeholder}
		{autocomplete}
		type={visible ? 'text' : 'password'}
		bind:value
		class="pr-10 {className}"
	/>
	<button
		type="button"
		class="absolute inset-y-0 right-0 flex items-center rounded-md px-3 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
		onclick={() => (visible = !visible)}
		aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
		aria-pressed={visible}
		aria-controls={id}
		{disabled}
		tabindex={-1}
	>
		{#if visible}
			<EyeOff class="h-4 w-4" />
		{:else}
			<Eye class="h-4 w-4" />
		{/if}
	</button>
</div>
