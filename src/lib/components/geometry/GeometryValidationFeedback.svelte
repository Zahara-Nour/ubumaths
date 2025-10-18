<script lang="ts">
	/**
	 * GeometryValidationFeedback Component
	 * Displays validation results with visual feedback
	 * Shows errors, warnings, and success messages
	 */

	import type { ValidationResults } from '$lib/types/geometry';

	interface Props {
		results: ValidationResults;
	}

	let { results }: Props = $props();

	const scorePercentage = $derived((results.score / results.maxScore) * 100);
	const scoreColor = $derived(
		scorePercentage >= 90
			? 'text-green-600'
			: scorePercentage >= 60
				? 'text-yellow-600'
				: 'text-destructive'
	);

	const statusIcon = $derived(results.isValid ? '✅' : '⚠️');
	const statusText = $derived(
		results.isValid ? 'Construction correcte !' : 'Construction incomplète ou incorrecte'
	);
	const statusColor = $derived(results.isValid ? 'text-green-600' : 'text-yellow-600');
</script>

<div class="validation-feedback" class:valid={results.isValid}>
	<!-- Status Header -->
	<div class="feedback-header">
		<div class="status">
			<span class="status-icon">{statusIcon}</span>
			<span class="status-text {statusColor}">{statusText}</span>
		</div>

		<div class="score">
			<span class="score-value {scoreColor}">{results.score}</span>
			<span class="score-separator">/</span>
			<span class="score-max">{results.maxScore}</span>
		</div>
	</div>

	<!-- Progress Bar -->
	<div class="progress-bar">
		<div class="progress-fill" style="width: {scorePercentage}%"></div>
	</div>

	<!-- Errors Section -->
	{#if results.errors.length > 0}
		<div class="feedback-section errors">
			<h4 class="section-title">❌ Erreurs à corriger:</h4>
			<ul class="feedback-list">
				{#each results.errors as error, i (`error-${i}`)}
					<li class="feedback-item error">
						<span class="item-code">{error.code}:</span>
						<span class="item-message">{error.message}</span>

						{#if error.expectedValue !== undefined && error.actualValue !== undefined}
							<span class="item-details">
								(attendu: {error.expectedValue}, obtenu: {error.actualValue})
							</span>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Warnings Section -->
	{#if results.warnings.length > 0}
		<div class="feedback-section warnings">
			<h4 class="section-title">⚠️ Avertissements:</h4>
			<ul class="feedback-list">
				{#each results.warnings as warning, i (`warning-${i}`)}
					<li class="feedback-item warning">
						<span class="item-code">{warning.code}:</span>
						<span class="item-message">{warning.message}</span>

						{#if warning.suggestion}
							<span class="item-suggestion">💡 {warning.suggestion}</span>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- General Feedback -->
	{#if results.feedback.length > 0}
		<div class="feedback-section general">
			<h4 class="section-title">📝 Commentaires:</h4>
			<ul class="feedback-list">
				{#each results.feedback as comment, i (i)}
					<li class="feedback-item general">{comment}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Measurements -->
	{#if results.measurements && Object.keys(results.measurements).length > 0}
		<div class="feedback-section measurements">
			<h4 class="section-title">📐 Mesures détectées:</h4>
			<div class="measurements-grid">
				{#each Object.entries(results.measurements) as [name, value] (name)}
					<div class="measurement-item">
						<span class="measurement-name">{name}:</span>
						<span class="measurement-value">{value.toFixed(2)}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Objects Created/Missing -->
	{#if results.objectsCreated && results.objectsCreated.length > 0}
		<div class="feedback-section objects">
			<h4 class="section-title">✓ Objets créés:</h4>
			<div class="objects-list">
				{#each results.objectsCreated as obj (obj)}
					<span class="object-tag created">{obj}</span>
				{/each}
			</div>
		</div>
	{/if}

	{#if results.objectsMissing && results.objectsMissing.length > 0}
		<div class="feedback-section objects">
			<h4 class="section-title">⚠️ Objets manquants:</h4>
			<div class="objects-list">
				{#each results.objectsMissing as obj (obj)}
					<span class="object-tag missing">{obj}</span>
				{/each}
			</div>
		</div>
	{/if}

	{#if results.objectsIncorrect && results.objectsIncorrect.length > 0}
		<div class="feedback-section objects">
			<h4 class="section-title">❌ Objets incorrects:</h4>
			<div class="objects-list">
				{#each results.objectsIncorrect as obj (obj)}
					<span class="object-tag incorrect">{obj}</span>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.validation-feedback {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
		background: hsl(var(--card));
		border: 2px solid hsl(var(--border));
		border-radius: 0.5rem;
	}

	.validation-feedback.valid {
		border-color: hsl(142 76% 36% / 0.5);
		background: hsl(142 76% 36% / 0.05);
	}

	.feedback-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 1rem;
		border-bottom: 1px solid hsl(var(--border));
	}

	.status {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.status-icon {
		font-size: 1.5rem;
	}

	.status-text {
		font-weight: 600;
		font-size: 1.125rem;
	}

	.score {
		display: flex;
		align-items: baseline;
		gap: 0.25rem;
		font-weight: 600;
	}

	.score-value {
		font-size: 2rem;
		line-height: 1;
	}

	.score-separator {
		font-size: 1.25rem;
		color: hsl(var(--muted-foreground));
	}

	.score-max {
		font-size: 1.25rem;
		color: hsl(var(--muted-foreground));
	}

	.progress-bar {
		height: 0.5rem;
		background: hsl(var(--muted));
		border-radius: 9999px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, hsl(var(--primary)), hsl(142 76% 36%));
		transition: width 0.5s ease;
	}

	.feedback-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 0.375rem;
	}

	.feedback-section.errors {
		background: hsl(0 84% 60% / 0.05);
		border: 1px solid hsl(0 84% 60% / 0.2);
	}

	.feedback-section.warnings {
		background: hsl(48 96% 53% / 0.05);
		border: 1px solid hsl(48 96% 53% / 0.2);
	}

	.feedback-section.general {
		background: hsl(var(--muted) / 0.3);
		border: 1px solid hsl(var(--border));
	}

	.feedback-section.measurements {
		background: hsl(221 83% 53% / 0.05);
		border: 1px solid hsl(221 83% 53% / 0.2);
	}

	.feedback-section.objects {
		background: hsl(var(--muted) / 0.2);
		border: 1px solid hsl(var(--border));
	}

	.section-title {
		font-weight: 600;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: hsl(var(--foreground));
	}

	.feedback-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.feedback-item {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.25rem;
		line-height: 1.5;
	}

	.feedback-item.error {
		background: hsl(0 84% 60% / 0.1);
	}

	.feedback-item.warning {
		background: hsl(48 96% 53% / 0.1);
	}

	.item-code {
		font-weight: 600;
		font-family: monospace;
		font-size: 0.875rem;
	}

	.item-message {
		flex: 1;
	}

	.item-details {
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
		font-style: italic;
	}

	.item-suggestion {
		width: 100%;
		padding-top: 0.25rem;
		font-size: 0.875rem;
		color: hsl(var(--primary));
	}

	.measurements-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.75rem;
	}

	.measurement-item {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		background: hsl(var(--background));
		border: 1px solid hsl(var(--border));
		border-radius: 0.25rem;
	}

	.measurement-name {
		font-weight: 500;
	}

	.measurement-value {
		font-family: monospace;
		font-weight: 600;
		color: hsl(var(--primary));
	}

	.objects-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.object-tag {
		padding: 0.25rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		font-family: monospace;
		border-radius: 9999px;
	}

	.object-tag.created {
		background: hsl(142 76% 36% / 0.1);
		color: hsl(142 76% 36%);
		border: 1px solid hsl(142 76% 36% / 0.3);
	}

	.object-tag.missing {
		background: hsl(48 96% 53% / 0.1);
		color: hsl(48 96% 53% / 0.8);
		border: 1px solid hsl(48 96% 53% / 0.3);
	}

	.object-tag.incorrect {
		background: hsl(0 84% 60% / 0.1);
		color: hsl(0 84% 60%);
		border: 1px solid hsl(0 84% 60% / 0.3);
	}
</style>
