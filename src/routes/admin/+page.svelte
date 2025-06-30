<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';

	async function handleSubmit(event: Event) {
		event.preventDefault();
		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		const response = await fetch('?/runScraper', {
			method: 'POST',
			body: formData
		});
		if (response.ok) {
			toast.success('Scraping initiated successfully!');
			await invalidateAll();
		} else {
			toast.error('Failed to initiate scraping.');
		}
	}
</script>

<div class="container mx-auto py-8">
	<h1 class="mb-6 text-3xl font-bold">Admin Panel</h1>

	<div class="bg-card rounded-lg p-6 shadow-md">
		<h2 class="mb-4 text-xl font-semibold">Scraper Control</h2>
		<p class="text-muted-foreground mb-4">
			Click the button below to manually trigger the Itch.io jam scraper. This will fetch the latest
			jam data and update the database.
		</p>
		<form onsubmit={handleSubmit}>
			<Button type="submit">Run Scraper</Button>
		</form>
	</div>
</div>
