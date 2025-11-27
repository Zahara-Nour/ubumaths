<script lang="ts">
	/**
	 * QuestionCompareView Example
	 * ============================
	 *
	 * Example usage of QuestionCompareView component.
	 * This file demonstrates how to use the component with sample data.
	 */

	import QuestionCompareView from './QuestionCompareView.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Sample original question (old format)
	const originalQuestion = {
		description: 'Calcul mental avec addition',
		subdescription: 'Additions simples',
		grade: '6',
		enounces: ['$a+$b=', '$c+$d='],
		solutionss: [['$a+$b'], ['$c+$d']],
		options: [
			['MAX=10', 'MIN=1'],
			['MAX=20', 'MIN=5']
		]
	};

	// Sample transformed question (new format)
	const transformedQuestion = {
		name: 'Calcul mental avec addition',
		description: 'Additions simples',
		grade_level: 6,
		enounce_template: '{{a}} + {{b}} = ?',
		solution_template: '{{a + b}}',
		validation_rules: [
			{
				type: 'numeric_range',
				variable: 'a',
				min: 1,
				max: 10
			},
			{
				type: 'numeric_range',
				variable: 'b',
				min: 1,
				max: 10
			}
		]
	};

	// Sample warnings
	const warnings = [
		'Option "MAX" convertie en validation_rules.max',
		'Option "MIN" convertie en validation_rules.min'
	];

	// Sample errors (empty for successful transformation)
	const errors: string[] = [];

	/**
	 * Handle approve action
	 */
	function handleApprove() {
		toaster.success('Question approuvée avec succès');
		console.log('Approved:', transformedQuestion);
	}

	/**
	 * Handle reject action
	 */
	function handleReject(reason: string) {
		toaster.error('Question rejetée');
		console.log('Rejected with reason:', reason);
	}
</script>

<div class="container mx-auto py-8">
	<h1 class="mb-6 text-3xl font-bold">QuestionCompareView Example</h1>

	<QuestionCompareView
		original={originalQuestion}
		transformed={transformedQuestion}
		{warnings}
		{errors}
		onApprove={handleApprove}
		onReject={handleReject}
	/>
</div>
