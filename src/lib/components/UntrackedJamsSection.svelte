<script lang="ts">
	import JamListItem from '$lib/components/JamListItem.svelte';
	import type { jam as jamSchema } from '$lib/server/db/schema';

	type Jam = typeof jamSchema.$inferSelect & { category: string };

	let {
		untrackedJams = [],
		isLoading = false,
		hasMore = false,
		onTrack = () => {},
		sentinel = $bindable(),
		untrackedJamsContent = $bindable()
	} = $props();

	function handleTrack(jamId: string) {
		onTrack(jamId);
	}
</script>

<div class="flex flex-grow flex-col">
	<div class="px-0 pb-2">
		<h2 class="text-lg font-semibold">Untracked Jams</h2>
	</div>
	<div
		class="bg-background border-border max-h-[calc(100vh-350px)] overflow-y-auto rounded-lg border"
		bind:this={untrackedJamsContent}
	>
		<div class="p-4">
			{#each untrackedJams as jam (jam.id)}
				<JamListItem {jam} actionType="track" onAction={() => handleTrack(jam.id.toString())} />
			{/each}
			{#if isLoading}
				<div class="text-muted-foreground flex justify-center p-4">Loading jams...</div>
			{:else if !hasMore}
				<div class="text-muted-foreground flex justify-center p-4">No more jams to load.</div>
			{/if}
			{#if hasMore}
				<div bind:this={sentinel} style="height: 1px;"></div>
			{/if}
		</div>
	</div>
</div>
