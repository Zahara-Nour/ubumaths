<!--
	Carte « Case N : choix » de l'éditeur de cases (chantier figure-et-choix, PR 1b)
	===============================================================================

	Le bloc ```choix de l'énoncé fait foi : la carte le lit (choix, `plusieurs:`,
	`melanger:`) et le réécrit à sa place à chaque modification. La bonne réponse
	est portée par la case (`expectedAnswer` : `"1"`, `"0;2"`, indices d'origine).

	- Bloc mal écrit (réglage ou ligne illisible, non fermé) : messages du parseur
	  et champ de texte seul ; le bloc se corrige dans l'énoncé, jamais réécrit.
	- Réponse calculée (`{{eval:…}}`) ou hors des choix : champ de texte,
	  « Cocher à la main » revient aux ronds.

	PROPS:
	- statement: énoncé où vit le bloc (bindable)
	- ordinal: rang du bloc parmi les blocs choix de l'énoncé (0 = le premier)
	- caseNumber: numéro de la case affiché (1 = la première)
	- expectedAnswer: bonne réponse de la case (bindable)
-->

<script lang="ts">
	import { templateMarkdown, type TemplateMarkdown } from '$lib/ubumark';
	import {
		choiceIndexesAfterRemoval,
		readCheckedChoices,
		readChoiceCase,
		writeChoiceCase,
		type ChoiceCaseDraft
	} from '$lib/questions/choice-case-editor';
	import { formatChoiceAnswer } from '$lib/questions/choice-case';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import MyCheckbox from './MyCheckbox.svelte';
	import { Plus, Trash2 } from '@lucide/svelte';

	interface Props {
		statement: TemplateMarkdown;
		ordinal: number;
		caseNumber: number;
		expectedAnswer: string;
	}

	// Constantes
	const DYNAMIC_ANSWER_SEED = '{{eval:}}';

	let {
		statement = $bindable(),
		ordinal,
		caseNumber,
		expectedAnswer = $bindable()
	}: Props = $props();

	// Plusieurs cartes sur la page : un groupe radio chacune
	const uid = $props.id();

	let block = $derived(readChoiceCase(statement, ordinal));
	let checked = $derived(
		block ? readCheckedChoices(expectedAnswer ?? '', block.choices.length) : null
	);
	// Réponse qui ne se coche pas : calculée, ou hors des choix
	let textMode = $derived(!block?.rewritable || checked === null);

	// Nombre de bonnes réponses : signalé ici ; le refus d'enregistrer vit dans
	// `choiceAnswerCountErrors` (formulaire et serveur)
	let answerCountWarning = $derived.by(() => {
		if (!block || checked === null) return '';
		if (checked.length === 0) {
			return block.multiple ? 'Coche au moins une bonne réponse.' : 'Coche la bonne réponse.';
		}
		if (checked.length > 1 && !block.multiple) {
			return 'Une seule bonne réponse sans « plusieurs bonnes réponses ».';
		}
		return '';
	});

	function letter(index: number): string {
		return String.fromCharCode(65 + index);
	}

	function write(draft: ChoiceCaseDraft) {
		statement = templateMarkdown(writeChoiceCase(statement, ordinal, draft));
	}

	function draftOf(current: NonNullable<typeof block>): ChoiceCaseDraft {
		return { multiple: current.multiple, shuffle: current.shuffle, choices: [...current.choices] };
	}

	function setChoice(index: number, text: string) {
		if (!block) return;
		const draft = draftOf(block);
		draft.choices[index] = text;
		write(draft);
	}

	function addChoice() {
		if (!block) return;
		const draft = draftOf(block);
		draft.choices.push('');
		write(draft);
	}

	function removeChoice(index: number) {
		if (!block || checked === null) return;
		const draft = draftOf(block);
		draft.choices.splice(index, 1);
		expectedAnswer = formatChoiceAnswer(choiceIndexesAfterRemoval(checked, index));
		write(draft);
	}

	function toggleCorrect(index: number) {
		if (!block || checked === null) return;
		if (!block.multiple) {
			expectedAnswer = formatChoiceAnswer([index]);
			return;
		}
		expectedAnswer = formatChoiceAnswer(
			checked.includes(index) ? checked.filter((i) => i !== index) : [...checked, index]
		);
	}

	// « Plusieurs bonnes réponses » décoché : on garde la première bonne réponse
	function setMultiple(value: boolean) {
		if (!block) return;
		write({ ...draftOf(block), multiple: value });
		if (!value && checked && checked.length > 1) {
			expectedAnswer = formatChoiceAnswer(checked.slice(0, 1));
		}
	}

	function setShuffle(value: boolean) {
		if (!block) return;
		write({ ...draftOf(block), shuffle: value });
	}
</script>

<div class="space-y-3 rounded-md border p-3" data-testid="choice-case-{caseNumber}">
	<p class="text-sm font-medium">Case {caseNumber} : choix</p>

	{#if block && block.errors.length > 0}
		<ul class="list-inside list-disc text-sm text-destructive" role="alert">
			{#each block.errors as message, i (i)}
				<li>{message}</li>
			{/each}
		</ul>
	{/if}

	{#if !block}
		<p class="text-sm text-muted-foreground">Bloc choix introuvable dans l'énoncé.</p>
	{:else if !block.rewritable}
		<p class="text-xs text-muted-foreground">Corrige le bloc ```choix dans l'énoncé.</p>
	{/if}

	{#if textMode}
		<div class="space-y-2">
			<Label for="choice-case-answer-{uid}">
				Bonne réponse{block?.rewritable ? ' (réponse calculée)' : ''}
			</Label>
			<Input id="choice-case-answer-{uid}" bind:value={expectedAnswer} class="font-mono" />
			<p class="text-xs text-muted-foreground">
				Indices des bons choix (0 pour le premier), séparés par « ; », ou une formule
				<code>{DYNAMIC_ANSWER_SEED}</code>.
			</p>
			{#if block?.rewritable}
				<Button variant="outline" size="sm" type="button" onclick={() => (expectedAnswer = '')}>
					Cocher à la main
				</Button>
			{/if}
		</div>
	{/if}

	{#if block?.rewritable}
		<div class="flex flex-wrap gap-4">
			<MyCheckbox
				checked={block.multiple}
				onCheckedChange={(v) => setMultiple(v === true)}
				label="Plusieurs bonnes réponses"
			/>
			<MyCheckbox
				checked={block.shuffle}
				onCheckedChange={(v) => setShuffle(v === true)}
				label="Mélanger les choix"
			/>
		</div>

		<div class="space-y-2">
			{#each block.choices as choice, index (index)}
				<div class="flex items-start gap-3">
					{#if !textMode && checked}
						<div class="flex items-center pt-2">
							{#if block.multiple}
								<MyCheckbox
									checked={checked.includes(index)}
									onCheckedChange={() => toggleCorrect(index)}
									aria-label="Choix {letter(index)} : bonne réponse"
								/>
							{:else}
								<input
									type="radio"
									name="choice-case-correct-{uid}"
									value={index}
									checked={checked.includes(index)}
									onchange={() => toggleCorrect(index)}
									aria-label="Choix {letter(index)} : bonne réponse"
									class="h-4 w-4"
								/>
							{/if}
						</div>
					{/if}
					<span class="pt-2 font-mono text-sm">{letter(index)}</span>
					<Textarea
						value={choice}
						oninput={(e: Event) => setChoice(index, (e.target as HTMLTextAreaElement).value)}
						rows={Math.max(1, choice.split('\n').length)}
						placeholder="Choix {letter(index)} (formules $…$, variables {'{{a}}'})"
						aria-label="Choix {letter(index)}"
						class="min-h-0 flex-1 font-mono"
					/>
					<Button
						variant="destructive"
						size="icon"
						type="button"
						onclick={() => removeChoice(index)}
						disabled={block.choices.length <= 2 || checked === null}
						aria-label="Supprimer le choix {letter(index)}"
					>
						<Trash2 class="h-4 w-4" />
					</Button>
				</div>
			{/each}
		</div>

		<div class="flex flex-wrap gap-2">
			<Button variant="outline" size="sm" type="button" class="gap-2" onclick={addChoice}>
				<Plus class="h-4 w-4" />
				Ajouter un choix
			</Button>
			{#if !textMode}
				<Button
					variant="outline"
					size="sm"
					type="button"
					onclick={() => (expectedAnswer = DYNAMIC_ANSWER_SEED)}
				>
					Réponse calculée
				</Button>
			{/if}
		</div>

		{#if answerCountWarning}
			<p role="alert" class="text-sm text-destructive">{answerCountWarning}</p>
		{/if}
	{/if}
</div>
