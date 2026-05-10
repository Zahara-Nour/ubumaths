<script lang="ts">
	import { goto } from '$app/navigation';
	import ExerciseForm, {
		emptyExerciseForm,
		buildSubmitBody,
		type ExerciseFormState
	} from '$lib/components/python/exercises/ExerciseForm.svelte';

	const initialForm = emptyExerciseForm();

	async function handleCreate(form: ExerciseFormState) {
		const res = await fetch('/api/python-exercises', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(buildSubmitBody(form))
		});

		if (!res.ok) {
			const message = await res.text();
			throw new Error(`HTTP ${res.status} : ${message || res.statusText}`);
		}

		const { exercise } = (await res.json()) as { exercise: { id: string } };
		await goto(`/python-exercises/${exercise.id}`);
	}
</script>

<svelte:head>
	<title>Créer un exercice Python – UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-3xl p-4">
	<header class="mb-6">
		<h1 class="text-2xl font-bold">Créer un exercice Python</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Remplis le formulaire, vérifie que ta solution passe la validation, puis crée l'exercice. Tu
			obtiens un lien partageable.
		</p>
	</header>

	<ExerciseForm {initialForm} mode="create" onSubmit={handleCreate} />
</div>
