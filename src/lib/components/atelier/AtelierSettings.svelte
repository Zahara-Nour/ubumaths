<script lang="ts">
	/**
	 * La fenêtre de réglages de l'atelier.
	 *
	 * Phase 0 `docs/wip/atelier-reglages-phase0.md` : un réglage pour l'instant,
	 * la saisie dans Calcul. Le choix prend effet tout de suite, sans bouton
	 * « Enregistrer » ; c'est le conteneur qui le retient dans ce navigateur.
	 */
	import Settings from '@lucide/svelte/icons/settings';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';
	import type { InputMode } from '$lib/atelier/input-mode';

	interface Choice {
		value: InputMode;
		label: string;
		detail: string;
		/** L'écriture mathématique est en essai (décision de David, 2026-10-14) */
		badge?: string;
	}

	let { inputMode = $bindable('text') }: { inputMode?: InputMode } = $props();

	const CHOICES: readonly Choice[] = [
		{
			value: 'text',
			label: 'Texte',
			detail: 'On tape x^2, sqrt(2), et un point devant les commandes : .résoudre x^2=4'
		},
		{
			value: 'math',
			label: 'Écriture mathématique',
			badge: 'nouveau, en essai',
			detail:
				'x², √2 et les fractions s’affichent comme sur le cahier ; les commandes s’écrivent sans point : résoudre x² = 4. Clavier mathématique à l’écran.'
		}
	];

	const uid = $props.id();
</script>

<Dialog.Root>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<!-- Icône seule, comme le reste de la barre (lot 1 de `atelier-refonte-interface-phase0.md`) -->
			<button type="button" class="reglages" aria-label="Réglages" title="Réglages" {...props}>
				<Settings size={18} aria-hidden="true" />
			</button>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Réglages de l’atelier</Dialog.Title>
			<Dialog.Description>Ils valent pour ce navigateur.</Dialog.Description>
		</Dialog.Header>
		<fieldset class="space-y-3">
			<legend class="mb-2 font-medium">Saisie dans Calcul</legend>
			<RadioGroup.Root
				value={inputMode}
				onValueChange={(value) => (inputMode = value === 'math' ? 'math' : 'text')}
			>
				{#each CHOICES as choice (choice.value)}
					<div class="flex items-start gap-3">
						<RadioGroup.Item
							value={choice.value}
							id="{uid}-{choice.value}"
							aria-describedby="{uid}-{choice.value}-detail"
							class="mt-1"
						/>
						<!-- Le nom du choix seul ; l'explication en description (lecteurs d'écran) -->
						<div class="flex-1">
							<Label for="{uid}-{choice.value}" class="cursor-pointer">
								{choice.label}
								{#if choice.badge}
									<span class="text-xs font-normal text-muted-foreground">({choice.badge})</span>
								{/if}
							</Label>
							<p id="{uid}-{choice.value}-detail" class="mt-1 text-sm text-muted-foreground">
								{choice.detail}
							</p>
						</div>
					</div>
				{/each}
			</RadioGroup.Root>
		</fieldset>
	</Dialog.Content>
</Dialog.Root>

<style>
	/* Comme les boutons de la barre (`ToolButton`) : lisible et visable en projection */
	.reglages {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.5rem;
		min-height: 2.5rem;
		border: 1px solid transparent;
		border-radius: 0.375rem;
		background: none;
		color: var(--color-foreground);
		cursor: pointer;
	}
	.reglages:hover {
		background: var(--color-muted);
		border-color: var(--color-border);
	}

	.reglages:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}
</style>
