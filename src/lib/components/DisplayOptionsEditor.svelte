<!--
	Display Options Editor
	======================

	Card with 8 collapsible checkboxes for expression display transformations.
	All props are $bindable() booleans.
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import MyCheckbox from './MyCheckbox.svelte';
	import { ChevronDown } from '@lucide/svelte';

	interface Props {
		open: boolean;
		shuffleTerms: boolean;
		shuffleFactors: boolean;
		shuffleTermsAndFactors: boolean;
		shallowShuffleTerms: boolean;
		shallowShuffleFactors: boolean;
		removeNullTerms: boolean;
		removeUnnecessaryBrackets: boolean;
		removeSpaces: boolean;
	}

	let {
		open = $bindable(),
		shuffleTerms = $bindable(),
		shuffleFactors = $bindable(),
		shuffleTermsAndFactors = $bindable(),
		shallowShuffleTerms = $bindable(),
		shallowShuffleFactors = $bindable(),
		removeNullTerms = $bindable(),
		removeUnnecessaryBrackets = $bindable(),
		removeSpaces = $bindable()
	}: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<Collapsible.Root bind:open>
			<Collapsible.Trigger
				class="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
			>
				<Card.Title>Options d'affichage</Card.Title>
				<ChevronDown class="h-4 w-4 transition-transform duration-200 {open ? 'rotate-180' : ''}" />
			</Collapsible.Trigger>
			<Card.Description>Transformations appliquées aux expressions avant affichage</Card.Description
			>
			<Collapsible.Content>
				<Card.Content class="space-y-3">
					<MyCheckbox bind:checked={shuffleTerms} label="Mélanger les termes (sommes)" />
					<MyCheckbox bind:checked={shuffleFactors} label="Mélanger les facteurs (produits)" />
					<MyCheckbox bind:checked={shuffleTermsAndFactors} label="Mélanger termes et facteurs" />
					<MyCheckbox
						bind:checked={shallowShuffleTerms}
						label="Mélange superficiel (termes au niveau racine)"
					/>
					<MyCheckbox
						bind:checked={shallowShuffleFactors}
						label="Mélange superficiel (facteurs au niveau racine)"
					/>
					<MyCheckbox
						bind:checked={removeNullTerms}
						label="Supprimer les termes nuls (x + 0 → x)"
					/>
					<MyCheckbox
						bind:checked={removeUnnecessaryBrackets}
						label="Supprimer les parenthèses inutiles"
					/>
					<MyCheckbox
						bind:checked={removeSpaces}
						label="Supprimer les espaces de groupement des chiffres"
					/>
				</Card.Content>
			</Collapsible.Content>
		</Collapsible.Root>
	</Card.Header>
</Card.Root>
