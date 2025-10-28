<script lang="ts">
	import { onMount } from 'svelte';

	let containerEl: HTMLDivElement;
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			// Wait for Swagger UI scripts to load
			await waitForSwaggerUI();

			// Initialize Swagger UI
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const SwaggerUIBundle = (window as any).SwaggerUIBundle;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const SwaggerUIStandalonePreset = (window as any).SwaggerUIStandalonePreset;

			SwaggerUIBundle({
				url: '/api/openapi.json',
				dom_id: '#swagger-ui',
				deepLinking: true,
				presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
				plugins: [SwaggerUIBundle.plugins.DownloadUrl],
				layout: 'StandaloneLayout',
				defaultModelsExpandDepth: 1,
				defaultModelExpandDepth: 1,
				docExpansion: 'list',
				filter: true,
				showExtensions: true,
				showCommonExtensions: true,
				tryItOutEnabled: true,
				requestSnippetsEnabled: true,
				onComplete: () => {
					loading = false;
				}
			});
		} catch (err) {
			console.error('Failed to initialize Swagger UI:', err);
			error = err instanceof Error ? err.message : 'Failed to load API documentation';
			loading = false;
		}
	});

	/**
	 * Wait for Swagger UI scripts to load
	 */
	function waitForSwaggerUI(): Promise<void> {
		return new Promise((resolve, reject) => {
			let attempts = 0;
			const maxAttempts = 50; // 5 seconds max

			const checkInterval = setInterval(() => {
				attempts++;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				if ((window as any).SwaggerUIBundle) {
					clearInterval(checkInterval);
					resolve();
				} else if (attempts >= maxAttempts) {
					clearInterval(checkInterval);
					reject(new Error('Swagger UI failed to load'));
				}
			}, 100);
		});
	}
</script>

<svelte:head>
	<title>UbuMaths API Documentation</title>
	<meta name="description" content="Comprehensive API documentation for the UbuMaths platform" />

	<!-- Swagger UI CSS -->
	<link
		rel="stylesheet"
		type="text/css"
		href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css"
	/>

	<!-- Swagger UI Scripts -->
	<script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
	<script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>

	<style>
		/* Custom styling for Swagger UI */
		#swagger-ui {
			max-width: 1400px;
			margin: 0 auto;
		}

		/* Dark mode support */
		@media (prefers-color-scheme: dark) {
			.swagger-ui {
				filter: invert(0.9) hue-rotate(180deg);
			}

			.swagger-ui img {
				filter: invert(1) hue-rotate(180deg);
			}
		}

		/* Loading spinner */
		.loading-container {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			min-height: 60vh;
			gap: 1rem;
		}

		.spinner {
			border: 4px solid rgba(0, 0, 0, 0.1);
			border-radius: 50%;
			border-top: 4px solid #3498db;
			width: 40px;
			height: 40px;
			animation: spin 1s linear infinite;
		}

		@keyframes spin {
			0% {
				transform: rotate(0deg);
			}
			100% {
				transform: rotate(360deg);
			}
		}

		/* Error message styling */
		.error-container {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			min-height: 60vh;
			gap: 1rem;
			padding: 2rem;
			text-align: center;
		}

		.error-message {
			color: #e74c3c;
			font-size: 1.125rem;
			max-width: 600px;
		}

		/* Header styling */
		.api-docs-header {
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
			padding: 2rem 1rem;
			margin-bottom: 2rem;
		}

		.api-docs-header h1 {
			max-width: 1400px;
			margin: 0 auto 0.5rem;
			font-size: 2rem;
			font-weight: 700;
		}

		.api-docs-header p {
			max-width: 1400px;
			margin: 0 auto;
			opacity: 0.9;
			font-size: 1.125rem;
		}

		.api-docs-links {
			max-width: 1400px;
			margin: 1rem auto 0;
			display: flex;
			gap: 1rem;
			flex-wrap: wrap;
		}

		.api-docs-links a {
			color: white;
			text-decoration: underline;
			opacity: 0.9;
			transition: opacity 0.2s;
		}

		.api-docs-links a:hover {
			opacity: 1;
		}
	</style>
</svelte:head>

<div class="api-docs-header">
	<h1>UbuMaths API Documentation</h1>
	<p>Comprehensive REST API documentation with interactive testing</p>
	<div class="api-docs-links">
		<a href="/api/openapi.json" target="_blank" rel="noopener noreferrer"
			>Download OpenAPI Spec (JSON)</a
		>
		<a href="/" target="_blank" rel="noopener noreferrer">Return to UbuMaths</a>
	</div>
</div>

{#if loading}
	<div class="loading-container">
		<div class="spinner"></div>
		<p>Loading API documentation...</p>
	</div>
{:else if error}
	<div class="error-container">
		<p class="error-message">{error}</p>
		<p>Please try refreshing the page or contact support if the problem persists.</p>
	</div>
{/if}

<div id="swagger-ui" bind:this={containerEl}></div>
