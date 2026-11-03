<!--
	Case signe / marque d'un tableau de signes à compléter
	=======================================================

	Chantier `docs/wip/tableau-signes-progress.md`, PR 3. Une case vide en pointillés ;
	un toucher ouvre juste en dessous les choix (+ / −, ou 0 / ‖ / rien), le choix
	s'écrit dans la case et le menu se referme. Le tableau garde sa taille : rien de
	plus large qu'une cellule n'y est posé (390 px).

	Au clavier, sur la case focalisée : `+` `-` (signe), `0` `z` `|` `r` (marque),
	Retour arrière / Suppr pour la vider ; Entrée / Espace ouvrent le menu.

	La valeur envoyée est le jeton du juge (`isSignCellCorrect`) : `+` `-` `z` `||` `rien`.
-->
<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import type { HiddenCellKind } from '$lib/ubumark/types/variation-table';

	// Types
	interface Choice {
		/** Jeton envoyé au juge */
		token: string;
		/** Ce que la case affiche */
		display: string;
		/** Libellé accessible */
		label: string;
	}

	interface Props {
		kind: Exclude<HiddenCellKind, 'valeur'>;
		/** Jeton choisi, `''` si vide */
		value: string;
		/** Numéro de la case dans la question (à partir de 1) */
		caseNumber: number;
		isCorrect: boolean | null;
		disabled: boolean;
		onChange: (value: string) => void;
	}

	// Constantes
	const SIGN_CHOICES: Choice[] = [
		{ token: '+', display: '+', label: 'plus' },
		{ token: '-', display: '−', label: 'moins' }
	];
	const MARK_CHOICES: Choice[] = [
		{ token: 'z', display: '0', label: 'zéro' },
		{ token: '||', display: '‖', label: 'double barre' },
		{ token: 'rien', display: 'rien', label: 'rien' }
	];
	/** Touches qui écrivent directement un jeton, par nature de case */
	const KEYS: Record<Props['kind'], Record<string, string>> = {
		signe: { '+': '+', '-': '-', '−': '-' },
		marque: { '0': 'z', z: 'z', '|': '||', r: 'rien' }
	};

	let { kind, value, caseNumber, isCorrect, disabled, onChange }: Props = $props();

	// Variables
	let open = $state(false);

	let choices = $derived(kind === 'signe' ? SIGN_CHOICES : MARK_CHOICES);
	let chosen = $derived(choices.find((choice) => choice.token === value));
	let verdict = $derived(isCorrect === true ? 'juste' : isCorrect === false ? 'fausse' : undefined);
	let ariaLabel = $derived(
		`Case ${caseNumber} : ${kind}, ${chosen?.label ?? 'vide'}${verdict ? `, ${verdict}` : ''}`
	);

	// Functions
	function choose(token: string) {
		onChange(token);
		open = false;
	}

	/** Jeton écrit au clavier ; sinon la touche va au déclencheur de bits-ui (Entrée, Espace) */
	function handleKeydown(event: KeyboardEvent, triggerKeydown: unknown) {
		if (writeFromKey(event)) return;
		if (typeof triggerKeydown === 'function') triggerKeydown(event);
	}

	/** Touche qui écrit ou vide la case : `true` si elle a été prise */
	function writeFromKey(event: KeyboardEvent): boolean {
		if (disabled || event.ctrlKey || event.metaKey || event.altKey) return false;
		if (event.key === 'Backspace' || event.key === 'Delete') {
			event.preventDefault();
			onChange('');
			return true;
		}
		const token = KEYS[kind][event.key];
		if (token === undefined) return false;
		event.preventDefault();
		onChange(token);
		return true;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger {disabled}>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				class="signe-case"
				class:signe-case-pleine={chosen !== undefined}
				class:signe-case-rien={chosen?.token === 'rien'}
				class:signe-case-zero={chosen?.token === 'z'}
				data-signe-case={kind}
				data-etat={verdict}
				aria-label={ariaLabel}
				onkeydown={(event) => handleKeydown(event, props.onkeydown)}
			>
				{chosen?.display ?? ''}
			</button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Content class="w-auto p-1" side="bottom" sideOffset={4}>
		<div
			class="signe-menu"
			data-signe-menu
			role="group"
			aria-label={`Case ${caseNumber} : choisir`}
		>
			{#each choices as choice (choice.token)}
				<button
					type="button"
					class="signe-choix"
					class:signe-choix-rien={choice.token === 'rien'}
					aria-label={choice.label}
					aria-pressed={choice.token === value}
					onclick={() => choose(choice.token)}
				>
					{choice.display}
				</button>
			{/each}
		</div>
	</Popover.Content>
</Popover.Root>

<style>
	/* Case de la cellule : assez grande pour le doigt, pas plus large que la cellule */
	.signe-case {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2em;
		height: 2em;
		padding: 0 0.25em;
		border: 1.5px dashed var(--color-muted-foreground);
		border-radius: 0.375rem;
		background: var(--color-background);
		color: var(--color-foreground);
		font-weight: bold;
		font-size: 1.1em;
		line-height: 1;
		cursor: pointer;
		touch-action: manipulation;
	}

	.signe-case-pleine {
		border-style: solid;
		border-color: var(--color-border);
	}

	/* Le 0 comme celui du tableau : graisse normale */
	.signe-case-zero {
		font-weight: normal;
	}

	.signe-case-rien {
		font-size: 0.75em;
		font-weight: normal;
		color: var(--color-muted-foreground);
	}

	.signe-case:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 1px;
	}

	.signe-case:disabled {
		cursor: default;
	}

	.signe-case[data-etat='juste'] {
		border: 2px solid var(--color-success);
		background: color-mix(in oklab, var(--color-success) 10%, transparent);
	}

	.signe-case[data-etat='fausse'] {
		border: 2px solid var(--color-destructive);
		background: color-mix(in oklab, var(--color-destructive) 12%, transparent);
	}

	.signe-menu {
		display: flex;
		gap: 0.25rem;
	}

	/* Cible tactile de 44 px */
	.signe-choix {
		min-width: 2.75rem;
		height: 2.75rem;
		padding: 0 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-background);
		color: var(--color-foreground);
		font-weight: bold;
		font-size: 1.25rem;
		touch-action: manipulation;
	}

	.signe-choix-rien {
		font-size: 0.875rem;
		font-weight: normal;
	}

	.signe-choix:hover {
		background: var(--color-muted);
	}

	.signe-choix[aria-pressed='true'] {
		border: 2px solid var(--color-primary);
	}

	.signe-choix:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 1px;
	}
</style>
