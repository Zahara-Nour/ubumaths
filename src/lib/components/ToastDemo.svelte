<script lang="ts">
	import { toaster } from '$lib/stores/toaster.svelte';

	function showSuccessToast() {
		toaster.success({
			title: 'Success!',
			description: 'Operation completed successfully.'
		});
	}

	function showErrorToast() {
		toaster.error({
			title: 'Error!',
			description: 'Something went wrong.'
		});
	}

	function showWarningToast() {
		toaster.warning({
			title: 'Warning!',
			description: 'Please check your input.'
		});
	}

	function showInfoToast() {
		toaster.info({
			title: 'Information',
			description: 'This is a demo toast notification.'
		});
	}

	function showLongToast() {
		toaster.info({
			title: 'Long Message',
			description:
				'This is a longer toast message that demonstrates how the toast handles more content. It will stay visible longer.',
			duration: 7000
		});
	}

	function showPersistentToast() {
		toaster.create({
			title: 'Persistent Toast',
			description: 'This toast stays until you dismiss it manually!',
			duration: Infinity,
			closable: true
		});
	}
</script>

<div class="toast-demo card p-6">
	<h2 class="text-on-surface-token mb-4 text-xl font-semibold">Toast Notifications Demo</h2>
	<p class="text-on-surface-token mb-6">
		Click the buttons below to see different types of toast notifications:
	</p>

	<div class="button-grid">
		<button onclick={showSuccessToast} class="btn variant-filled-success"> Success Toast </button>

		<button onclick={showErrorToast} class="btn variant-filled-error"> Error Toast </button>

		<button onclick={showWarningToast} class="btn variant-filled-warning"> Warning Toast </button>

		<button onclick={showInfoToast} class="btn variant-filled-primary"> Info Toast </button>

		<button onclick={showLongToast} class="btn variant-filled-secondary"> Long Message </button>

		<button onclick={showPersistentToast} class="btn variant-filled-tertiary">
			Persistent Toast
		</button>
	</div>
</div>

<style>
	.toast-demo {
		max-width: 600px;
		margin: 0 auto;
	}

	.button-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
	}
</style>
