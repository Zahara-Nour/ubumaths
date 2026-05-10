<script lang="ts">
	import { goto } from '$app/navigation';
	import ExerciseForm, {
		buildInitialForm,
		buildSubmitBody,
		type ExerciseFormState
	} from '$lib/components/python/exercises/ExerciseForm.svelte';

	let { data } = $props();

	// Read the exercise once at mount to seed the form. ExerciseForm clones the
	// initial state, so subsequent reactive changes to data.exercise (e.g. via
	// invalidate) won't propagate — that's intentional for the edit flow.
	// svelte-ignore state_referenced_locally
	const initialForm: ExerciseFormState = buildInitialForm(data.exercise);

	async function handleUpdate(form: ExerciseFormState) {
		const res = await fetch(`/api/python-exercises/${data.exercise.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: data.exercise.id, ...buildSubmitBody(form) })
		});

		if (!res.ok) {
			const message = await res.text();
			throw new Error(`HTTP ${res.status} : ${message || res.statusText}`);
		}

		await goto(`/python-exercises/${data.exercise.id}`);
	}
</script>

<svelte:head>
	<title>Modifier {data.exercise.title} – UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-3xl p-4">
	<header class="mb-6">
		<h1 class="text-2xl font-bold">Modifier l'exercice</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Modifie le formulaire, vérifie que la solution passe toujours, puis enregistre.
		</p>
	</header>

	<ExerciseForm
		{initialForm}
		mode="edit"
		cancelHref={`/python-exercises/${data.exercise.id}`}
		onSubmit={handleUpdate}
	/>
</div>
