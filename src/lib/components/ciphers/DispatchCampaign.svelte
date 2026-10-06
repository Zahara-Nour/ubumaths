<!--
	Les Dépêches du Czar : la liste des neuf dépêches, puis celle qu'on décrypte.
	Une dépêche décryptée ouvre la suivante. La progression reste dans le
	navigateur (aucune donnée ne quitte l'appareil).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { lettersOnly } from '$lib/ciphers/alphabet';
	import { loadProgress, saveProgress } from '$lib/ciphers/dispatch-progress';
	import {
		CIPHER_PATHS,
		DISPATCHES,
		checkAnswer,
		dispatchCiphertext,
		isUnlocked,
		type Dispatch
	} from '$lib/ciphers/dispatches';
	import { decryptQuery } from '$lib/ciphers/tool-link';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Types
	type Feedback = { kind: 'wrong'; given: number; expected: number } | null;

	// State
	let solved = $state<number[]>([]);
	let current = $state(1);
	let answers = $state<Record<number, string>>({});
	let hintsShown = $state<Record<number, number>>({});
	let feedback = $state<Feedback>(null);
	let confirmingReset = $state(false);

	const dispatch = $derived(DISPATCHES.find((d) => d.number === current) ?? DISPATCHES[0]);
	const ciphertext = $derived(dispatchCiphertext(dispatch));
	const isSolved = $derived(solved.includes(dispatch.number));
	const shownHints = $derived(hintsShown[dispatch.number] ?? 0);
	const toolsAvailable = $derived(dispatch.namedInStory || shownHints > 0 || isSolved);
	const allSolved = $derived(solved.length === DISPATCHES.length);

	// Functions
	/** Le stockage du navigateur, ou null s'il est refusé (navigation privée, réglages) */
	function storage(): Storage | null {
		try {
			return window.localStorage;
		} catch {
			return null;
		}
	}

	onMount(() => {
		solved = loadProgress(storage());
		// On reprend à la première dépêche ouverte et pas encore décryptée
		current =
			DISPATCHES.find((d) => isUnlocked(d.number, solved) && !solved.includes(d.number))?.number ??
			1;
	});

	function select(number: number) {
		if (!isUnlocked(number, solved)) return;
		current = number;
		feedback = null;
	}

	function submit(event: SubmitEvent, target: Dispatch) {
		event.preventDefault();
		const answer = answers[target.number] ?? '';
		if (checkAnswer(target, answer)) {
			solved = [...new Set([...solved, target.number])].sort((a, b) => a - b);
			saveProgress(storage(), solved);
			feedback = null;
			toaster.success(`Dépêche n° ${target.number} décryptée !`);
		} else {
			feedback = {
				kind: 'wrong',
				given: lettersOnly(answer).length,
				expected: lettersOnly(target.plaintext).length
			};
		}
	}

	function showHint(number: number) {
		hintsShown = { ...hintsShown, [number]: Math.min(2, (hintsShown[number] ?? 0) + 1) };
	}

	async function copyCiphertext() {
		try {
			await navigator.clipboard.writeText(ciphertext);
			toaster.success('Dépêche copiée dans le presse-papiers.');
		} catch {
			toaster.error('Copie impossible : sélectionnez le texte à la main.');
		}
	}

	function reset() {
		if (!confirmingReset) {
			confirmingReset = true;
			return;
		}
		solved = [];
		saveProgress(storage(), []);
		answers = {};
		hintsShown = {};
		feedback = null;
		current = 1;
		confirmingReset = false;
	}
</script>

<div class="flex flex-col gap-8">
	<section class="flex flex-col gap-3" aria-labelledby="dispatch-list-title">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 id="dispatch-list-title" class="text-xl font-semibold">Les dépêches interceptées</h2>
			<span class="text-sm text-muted-foreground" data-testid="dispatch-progress">
				{solved.length} / {DISPATCHES.length} décryptée{solved.length > 1 ? 's' : ''}
			</span>
		</div>
		<ol class="grid grid-cols-3 gap-2">
			{#each DISPATCHES as item (item.number)}
				{@const unlocked = isUnlocked(item.number, solved)}
				{@const done = solved.includes(item.number)}
				<li>
					<button
						type="button"
						class={[
							'flex h-full w-full flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors',
							item.number === current ? 'border-primary bg-primary/10' : 'bg-card',
							unlocked ? 'hover:border-primary' : 'cursor-not-allowed opacity-50'
						]}
						disabled={!unlocked}
						aria-current={item.number === current ? 'true' : undefined}
						onclick={() => select(item.number)}
						data-testid={`dispatch-${item.number}`}
					>
						<span class="text-xs text-muted-foreground">
							N° {item.number} ·
							{done ? 'décryptée' : unlocked ? 'à décrypter' : 'verrouillée'}
						</span>
						<span class="hidden font-medium sm:block">{unlocked ? item.title : '???'}</span>
					</button>
				</li>
			{/each}
		</ol>
	</section>

	<article
		class="flex flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground"
		aria-labelledby="dispatch-title"
	>
		<h2 id="dispatch-title" class="text-2xl font-bold">
			Dépêche n° {dispatch.number} : {dispatch.title}
		</h2>
		<p>{dispatch.story}</p>

		<div class="flex flex-col gap-2">
			<span class="text-sm font-medium">Le message intercepté</span>
			<p
				class="rounded-lg border bg-muted/40 px-3 py-2 font-mono break-words whitespace-pre-wrap"
				data-testid="dispatch-ciphertext"
			>
				{ciphertext}
			</p>
			<div class="flex flex-wrap gap-2">
				<Button variant="outline" size="sm" onclick={copyCiphertext}>Copier</Button>
				{#if toolsAvailable}
					<Button
						variant="secondary"
						size="sm"
						href={`${resolve(CIPHER_PATHS[dispatch.key.cipher])}${decryptQuery(ciphertext)}`}
						data-testid="dispatch-tools"
					>
						Décrypter avec les outils du Cabinet
					</Button>
				{/if}
			</div>
		</div>

		{#if isSolved}
			<div class="flex flex-col gap-2" data-testid="dispatch-solved">
				<p class="font-semibold text-primary">Décryptée !</p>
				<p class="rounded-lg border bg-muted/40 px-3 py-2">{dispatch.plaintext}</p>
				<p class="italic">{dispatch.epilogue}</p>
				{#if dispatch.number < DISPATCHES.length}
					<Button class="self-start" onclick={() => select(dispatch.number + 1)}>
						Dépêche suivante
					</Button>
				{:else if allSolved}
					<p class="font-semibold" data-testid="dispatch-campaign-done">
						Toutes les dépêches du Czar sont décryptées. Le Cabinet Noir vous salue, agent.
					</p>
				{/if}
			</div>
		{:else}
			<form class="flex flex-col gap-2" onsubmit={(event) => submit(event, dispatch)}>
				<Label for="dispatch-answer">Votre décryptage (le message en clair)</Label>
				<Textarea
					id="dispatch-answer"
					bind:value={
						() => answers[dispatch.number] ?? '',
						(value) => (answers = { ...answers, [dispatch.number]: value })
					}
					placeholder="Les accents, les espaces et la ponctuation ne comptent pas."
				/>
				<Button type="submit" class="self-start">Vérifier</Button>
				{#if feedback}
					<p class="text-sm text-destructive" role="status" data-testid="dispatch-feedback">
						Ce n’est pas encore ça.
						{#if feedback.given !== feedback.expected}
							Le message clair compte {feedback.expected} lettres ; votre réponse en a {feedback.given}.
						{/if}
					</p>
				{/if}
			</form>

			<div class="flex flex-col gap-2">
				{#each dispatch.hints.slice(0, shownHints) as hint, i (i)}
					<p class="text-sm" data-testid="dispatch-hint">
						<strong>Indice {i + 1} :</strong>
						{hint}
					</p>
				{/each}
				{#if shownHints < dispatch.hints.length}
					<Button
						variant="ghost"
						size="sm"
						class="self-start"
						onclick={() => showHint(dispatch.number)}
					>
						{shownHints === 0 ? 'Un indice' : 'Un autre indice'}
					</Button>
				{/if}
			</div>
		{/if}
	</article>

	<div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
		<span>Votre progression reste dans ce navigateur : aucune donnée n’est envoyée.</span>
		{#if solved.length > 0}
			<Button variant="ghost" size="sm" onclick={reset}>
				{confirmingReset ? 'Confirmer : tout effacer' : 'Recommencer la campagne'}
			</Button>
		{/if}
	</div>
</div>
