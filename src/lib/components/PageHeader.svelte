<script lang="ts">
	import InfoButtons from '$lib/components/InfoButtons.svelte';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { timePreference } from '$lib/stores/timePreference';

	let { isAdmin = false } = $props();

	let isLocal = $state(false);

	const timePreferenceLabel = $derived(() =>
		$timePreference === 'Local' ? 'Local Time' : 'UTC Time'
	);

	$effect(() => {
		isLocal = $timePreference === 'Local';
	});

	function handleSwitchChange() {
		timePreference.set(isLocal ? 'UTC' : 'Local');
	}
</script>

<!-- Header Section -->
<header class="flex items-center gap-4">
	<h1 class="text-foreground text-2xl font-bold md:text-3xl">Itch Jam Tracker</h1>
	<InfoButtons />
	{#if isAdmin}
		<a href="/admin">
			<Button
				class="bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground ml-2 cursor-pointer rounded border px-4 py-2 font-medium shadow transition-colors"
				>Admin Page</Button
			>
		</a>
	{/if}
	<div class="ml-auto flex items-center gap-2">
		<Label for="time-preference">{timePreferenceLabel()}</Label>
		<Switch id="time-preference" bind:checked={isLocal} onclick={handleSwitchChange} />
	</div>
</header>
