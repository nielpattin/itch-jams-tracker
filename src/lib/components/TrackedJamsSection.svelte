<script lang="ts">
	import JamListItem from '$lib/components/JamListItem.svelte';
	import type { jam as jamSchema } from '$lib/server/db/schema';

	type Jam = typeof jamSchema.$inferSelect & { category: string };

	let { trackedJams = [], onUntrack = () => {} } = $props();

	function handleUntrack(jamId: string) {
		onUntrack(jamId);
	}
</script>

<div class="flex flex-grow flex-col">
	<div class="px-0 pb-2">
		<h2 class="text-lg font-semibold">Tracked Jams ({trackedJams.length})</h2>
	</div>
	<div
		class="bg-background border-border max-h-[calc(100vh-350px)] overflow-y-auto rounded-lg border"
	>
		<div class="p-4">
			{#if trackedJams.length > 0}
				{#each trackedJams as jam (jam.id)}
					<JamListItem
						{jam}
						actionType="untrack"
						onAction={() => handleUntrack(jam.id.toString())}
					/>
				{/each}
			{:else}
				<div class="text-muted-foreground flex justify-center p-4">No tracked jams.</div>
			{/if}
		</div>
	</div>
</div>
