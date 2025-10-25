<!--
	AnswerConfigEditor Component
	============================
	Configure automatic answer validation for riddles

	Props:
	- config: AnswerConfig | null - Current answer configuration
	- onChange: (config: AnswerConfig | null) => void
-->

<script lang="ts">
	import type { AnswerConfig, AnswerType } from '$lib/types/riddle';
	import { getAnswerTypeLabel } from '$lib/types/riddle';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Card from '$lib/components/ui/card';
	import { Switch } from '$lib/components/ui/switch';
	import { Plus, X, CheckCircle2 } from 'lucide-svelte';

	interface Props {
		config: AnswerConfig | null;
		onChange: (config: AnswerConfig | null) => void;
	}

	let { config, onChange }: Props = $props();

	// State
	let enabled = $state(config !== null);
	let answerType = $state<AnswerType>(config?.type || 'text');
	let answerValue = $state<string>(
		typeof config?.value === 'string' ? config.value : String(config?.value || '')
	);
	let tolerance = $state(config?.options?.tolerance ?? 0.01);
	let caseSensitive = $state(config?.options?.caseSensitive ?? false);
	let qcmChoices = $state<string[]>(config?.options?.choices || ['', '', '']);
	let correctChoices = $state<number[]>(
		Array.isArray(config?.value) ? config.value : [config?.value || 0]
	);
	let multipleAnswers = $state(config?.options?.multipleAnswers ?? false);
	let exactMatch = $state(config?.options?.exactMatch ?? true);

	// Update config when any field changes
	$effect(() => {
		if (!enabled) {
			onChange(null);
			return;
		}

		let value: string | number | number[];
		let options: AnswerConfig['options'] = {};

		switch (answerType) {
			case 'numerical':
				value = parseFloat(answerValue);
				options.tolerance = tolerance;
				break;
			case 'text':
				value = answerValue;
				options.caseSensitive = caseSensitive;
				break;
			case 'qcm':
				value = multipleAnswers ? correctChoices : correctChoices[0];
				options.choices = qcmChoices.filter((c) => c.trim().length > 0);
				options.multipleAnswers = multipleAnswers;
				break;
			case 'math':
				value = answerValue;
				options.exactMatch = exactMatch;
				break;
		}

		const newConfig: AnswerConfig = {
			type: answerType,
			value,
			options
		};

		onChange(newConfig);
	});

	function handleToggleEnabled() {
		enabled = !enabled;
	}

	function handleTypeChange(type: AnswerType) {
		answerType = type;
		// Reset values for new type
		answerValue = '';
		correctChoices = [0];
	}

	function addQcmChoice() {
		qcmChoices = [...qcmChoices, ''];
	}

	function removeQcmChoice(index: number) {
		qcmChoices = qcmChoices.filter((_, i) => i !== index);
		// Adjust correct choices if needed
		correctChoices = correctChoices.filter((i) => i < qcmChoices.length - 1);
	}

	function toggleCorrectChoice(index: number) {
		if (multipleAnswers) {
			if (correctChoices.includes(index)) {
				correctChoices = correctChoices.filter((i) => i !== index);
			} else {
				correctChoices = [...correctChoices, index];
			}
		} else {
			correctChoices = [index];
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div>
				<Card.Title class="text-base">Validation automatique</Card.Title>
				<Card.Description>
					Configurez la validation automatique des réponses (optionnel)
				</Card.Description>
			</div>
			<Switch checked={enabled} onCheckedChange={handleToggleEnabled} />
		</div>
	</Card.Header>

	{#if enabled}
		<Card.Content class="space-y-4">
			<!-- Type Selection -->
			<div class="space-y-2">
				<Label for="answer-type">Type de réponse</Label>
				<Select.Root
					selected={{ value: answerType, label: getAnswerTypeLabel(answerType) }}
					onSelectedChange={(v) => v && handleTypeChange(v.value as AnswerType)}
				>
					<Select.Trigger id="answer-type">
						<Select.Value />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="text">Texte</Select.Item>
						<Select.Item value="numerical">Numérique</Select.Item>
						<Select.Item value="qcm">QCM (choix multiples)</Select.Item>
						<Select.Item value="math">Expression mathématique</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>

			<!-- Configuration based on type -->
			{#if answerType === 'numerical'}
				<!-- Numerical Answer -->
				<div class="space-y-4 rounded-lg border bg-muted/30 p-4">
					<div class="space-y-2">
						<Label for="answer-value">Réponse correcte (nombre)</Label>
						<Input
							id="answer-value"
							type="number"
							step="any"
							bind:value={answerValue}
							placeholder="42"
							required
						/>
					</div>
					<div class="space-y-2">
						<Label for="tolerance">Tolérance</Label>
						<Input
							id="tolerance"
							type="number"
							step="0.001"
							bind:value={tolerance}
							placeholder="0.01"
						/>
						<p class="text-xs text-muted-foreground">
							Les réponses à ±{tolerance} de {answerValue || '...'} seront acceptées
						</p>
					</div>
				</div>
			{:else if answerType === 'text'}
				<!-- Text Answer -->
				<div class="space-y-4 rounded-lg border bg-muted/30 p-4">
					<div class="space-y-2">
						<Label for="answer-value">Réponse correcte (texte)</Label>
						<Input
							id="answer-value"
							type="text"
							bind:value={answerValue}
							placeholder="triangle"
							required
						/>
					</div>
					<div class="flex items-center gap-2">
						<Switch id="case-sensitive" bind:checked={caseSensitive} />
						<Label for="case-sensitive" class="cursor-pointer">Sensible à la casse</Label>
					</div>
				</div>
			{:else if answerType === 'qcm'}
				<!-- QCM Answer -->
				<div class="space-y-4 rounded-lg border bg-muted/30 p-4">
					<div class="flex items-center justify-between">
						<Label>Choix de réponses</Label>
						<div class="flex items-center gap-2">
							<Switch id="multiple-answers" bind:checked={multipleAnswers} />
							<Label for="multiple-answers" class="cursor-pointer text-xs">Réponses multiples</Label
							>
						</div>
					</div>

					<div class="space-y-2">
						{#each qcmChoices as _choice, index (index)}
							<div class="flex items-center gap-2">
								<Button
									type="button"
									variant={correctChoices.includes(index) ? 'default' : 'outline'}
									size="icon"
									class="shrink-0"
									onclick={() => toggleCorrectChoice(index)}
								>
									{#if correctChoices.includes(index)}
										<CheckCircle2 class="h-4 w-4" />
									{:else}
										{String.fromCharCode(65 + index)}
									{/if}
								</Button>
								<Input
									type="text"
									bind:value={qcmChoices[index]}
									placeholder={`Choix ${String.fromCharCode(65 + index)}`}
								/>
								{#if qcmChoices.length > 2}
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onclick={() => removeQcmChoice(index)}
									>
										<X class="h-4 w-4" />
									</Button>
								{/if}
							</div>
						{/each}
					</div>

					<Button type="button" variant="outline" size="sm" onclick={addQcmChoice}>
						<Plus class="mr-2 h-4 w-4" />
						Ajouter un choix
					</Button>

					{#if correctChoices.length > 0}
						<div class="rounded-lg bg-green-50 p-3 dark:bg-green-950">
							<p class="text-xs font-medium text-green-700 dark:text-green-300">
								Réponse(s) correcte(s):
								{correctChoices
									.map((i) => String.fromCharCode(65 + i))
									.sort()
									.join(', ')}
							</p>
						</div>
					{/if}
				</div>
			{:else if answerType === 'math'}
				<!-- Math Expression Answer -->
				<div class="space-y-4 rounded-lg border bg-muted/30 p-4">
					<div class="space-y-2">
						<Label for="answer-value">Expression mathématique correcte</Label>
						<Input
							id="answer-value"
							type="text"
							bind:value={answerValue}
							placeholder="2x + 3"
							required
						/>
					</div>
					<div class="flex items-center gap-2">
						<Switch id="exact-match" bind:checked={exactMatch} />
						<Label for="exact-match" class="cursor-pointer">Correspondance exacte</Label>
					</div>
					<p class="text-xs text-muted-foreground">
						Note: La validation d'expressions mathématiques compare les formes textuelles
					</p>
				</div>
			{/if}

			<!-- Preview -->
			<div class="rounded-lg bg-primary/5 p-3">
				<p class="text-xs font-medium text-primary">
					✓ Validation automatique activée - Les élèves recevront un feedback immédiat
				</p>
			</div>
		</Card.Content>
	{:else}
		<Card.Content>
			<div class="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
				Validation manuelle par le professeur via la messagerie interne
			</div>
		</Card.Content>
	{/if}
</Card.Root>
