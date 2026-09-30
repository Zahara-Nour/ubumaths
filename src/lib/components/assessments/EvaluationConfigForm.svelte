<!--
	EvaluationConfigForm — réglages d'une évaluation (C20).

	La composition vient de la SÉRIE : ni titre, ni niveau, ni catégories ici.
	- Forme : Entraînement ou Course aux nombres.
	- Temps limite : affiché seulement pour une Course aux nombres, 1 à 60 min,
	  7 min par défaut (Q30). Un Entraînement n'en a pas.
	- Date limite, tentatives, ordre aléatoire.

	Props :
	- initialData : réglages de départ (modification)
	- onSubmit : réglages validés (temps en minutes, date limite en ISO)
	- onCancel, submitLabel
-->

<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import {
		COURSE_TIME_LIMIT_DEFAULT_MINUTES,
		COURSE_TIME_LIMIT_MAX_MINUTES,
		COURSE_TIME_LIMIT_MIN_MINUTES,
		DEFAULT_EVALUATION_SETTINGS,
		EVALUATION_FORM_LABELS,
		isEvaluationForm
	} from '$lib/types/evaluation';
	import type { EvaluationForm, EvaluationSettingsInput } from '$lib/types/evaluation';

	interface Props {
		initialData?: Partial<EvaluationSettingsInput>;
		onSubmit: (settings: EvaluationSettingsInput) => void;
		onCancel?: () => void;
		submitLabel?: string;
	}

	let { initialData, onSubmit, onCancel, submitLabel = 'Créer' }: Props = $props();

	// Instantané des réglages de départ (les champs sont ensuite locaux)
	// svelte-ignore state_referenced_locally
	const init = { ...DEFAULT_EVALUATION_SETTINGS, ...initialData };

	const formItems = (Object.keys(EVALUATION_FORM_LABELS) as EvaluationForm[]).map((value) => ({
		value,
		label: EVALUATION_FORM_LABELS[value]
	}));

	/** ISO → valeur d'un champ `datetime-local` (heure locale) */
	function toLocalInput(iso: string | null): string {
		if (!iso) return '';
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return '';
		date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
		return date.toISOString().slice(0, 16);
	}

	let form = $state<string>(init.form);
	let timeLimitInput = $state(String(init.time_limit_minutes ?? COURSE_TIME_LIMIT_DEFAULT_MINUTES));
	let maxAttemptsInput = $state(init.max_attempts?.toString() ?? '');
	let deadline = $state(toLocalInput(init.deadline));
	let shuffleQuestions = $state(init.shuffle_questions);

	let errors = $state<Record<string, string>>({});

	let isCourse = $derived(form === 'course');

	function validate(): EvaluationSettingsInput | null {
		errors = {};

		let timeLimitMinutes: number | null = null;
		if (form === 'course') {
			const minutes = Number(timeLimitInput);
			if (
				!Number.isInteger(minutes) ||
				minutes < COURSE_TIME_LIMIT_MIN_MINUTES ||
				minutes > COURSE_TIME_LIMIT_MAX_MINUTES
			) {
				errors.timeLimit = `Le temps limite va de ${COURSE_TIME_LIMIT_MIN_MINUTES} à ${COURSE_TIME_LIMIT_MAX_MINUTES} minutes`;
			} else {
				timeLimitMinutes = minutes;
			}
		}

		let maxAttempts: number | null = null;
		if (maxAttemptsInput !== '' && maxAttemptsInput != null) {
			const value = Number(maxAttemptsInput);
			if (!Number.isInteger(value) || value < 1 || value > 10) {
				errors.maxAttempts = 'Entre 1 et 10 tentatives';
			} else {
				maxAttempts = value;
			}
		}

		let deadlineIso: string | null = null;
		if (deadline) {
			const date = new Date(deadline);
			if (Number.isNaN(date.getTime())) {
				errors.deadline = 'Date limite invalide';
			} else {
				deadlineIso = date.toISOString();
			}
		}

		if (!isEvaluationForm(form)) {
			errors.form = 'Choisis une forme';
			return null;
		}
		if (Object.keys(errors).length > 0) return null;

		return {
			form,
			time_limit_minutes: timeLimitMinutes,
			max_attempts: maxAttempts,
			deadline: deadlineIso,
			shuffle_questions: shuffleQuestions
		};
	}

	function handleSubmit() {
		const settings = validate();
		if (settings) onSubmit(settings);
	}

	// Date limite au plus tôt : maintenant
	let minDeadline = $derived(toLocalInput(new Date().toISOString()));
</script>

<!-- novalidate : les bornes sont vérifiées ici, avec un message en français -->
<form
	novalidate
	onsubmit={(e) => {
		e.preventDefault();
		handleSubmit();
	}}
	class="space-y-6"
>
	<!-- Forme -->
	<div class="space-y-2">
		<Label>Forme</Label>
		<MySelect
			type="single"
			bind:value={form}
			items={formItems}
			placeholder="Choisir une forme"
			triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
		/>
		<p class="text-xs text-muted-foreground">
			{isCourse
				? 'Toutes les questions à la fois, avec un temps limite global.'
				: 'Une question à la fois, chacune avec sa durée.'}
		</p>
		{#if errors.form}
			<p class="text-sm text-red-500">{errors.form}</p>
		{/if}
	</div>

	<!-- Temps limite : Course aux nombres seulement (Q30) -->
	{#if isCourse}
		<div class="space-y-2">
			<Label for="timeLimit">Temps limite (minutes)</Label>
			<Input
				id="timeLimit"
				type="number"
				bind:value={timeLimitInput}
				min={COURSE_TIME_LIMIT_MIN_MINUTES}
				max={COURSE_TIME_LIMIT_MAX_MINUTES}
				class="max-w-32 {errors.timeLimit ? 'border-red-500' : ''}"
			/>
			{#if errors.timeLimit}
				<p class="text-sm text-red-500">{errors.timeLimit}</p>
			{/if}
		</div>
	{/if}

	<div class="space-y-4 rounded-lg border p-4">
		<h3 class="font-semibold">{lore.nav.settings}</h3>

		<div class="space-y-2">
			<Label for="deadline">Date limite (facultative)</Label>
			<Input id="deadline" type="datetime-local" bind:value={deadline} min={minDeadline} />
			<p class="text-xs text-muted-foreground">
				Si définie, les {lore.entities.student}s ne pourront plus commencer après cette date
			</p>
			{#if errors.deadline}
				<p class="text-sm text-red-500">{errors.deadline}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="maxAttempts">Nombre de tentatives maximum (facultatif)</Label>
			<Input
				id="maxAttempts"
				type="number"
				bind:value={maxAttemptsInput}
				placeholder="Illimité"
				min="1"
				max="10"
				class={errors.maxAttempts ? 'border-red-500' : ''}
			/>
			{#if errors.maxAttempts}
				<p class="text-sm text-red-500">{errors.maxAttempts}</p>
			{/if}
			<p class="text-xs text-muted-foreground">Laisser vide pour des tentatives illimitées</p>
		</div>

		<MyCheckbox bind:checked={shuffleQuestions} label="Mélanger l'ordre des questions" />
	</div>

	<div class="flex justify-end gap-3">
		{#if onCancel}
			<Button type="button" variant="outline" onclick={onCancel}>{lore.actions.cancel}</Button>
		{/if}
		<Button type="submit">{submitLabel}</Button>
	</div>
</form>
