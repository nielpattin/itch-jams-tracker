<script lang="ts">
	import { ChevronDown } from '@lucide/svelte';

	type JamStatusFilter = 'all' | 'upcoming' | 'in-progress' | 'voting' | 'ended';

	let { selectedCategory = $bindable(), onCategoryChange = () => {} } = $props();

	const JAM_STATUSES: JamStatusFilter[] = ['all', 'upcoming', 'in-progress', 'voting', 'ended'];

	function handleChange() {
		onCategoryChange(selectedCategory);
	}
</script>

<div class="flex flex-col gap-6">
	<h3 class="mb-2 text-lg font-semibold">Category</h3>
	<div class="relative mb-2">
		<select
			class="bg-card text-card-foreground border-border focus:ring-primary w-full appearance-none rounded border px-4 py-2 pr-10 focus:ring-2 focus:outline-none"
			bind:value={selectedCategory}
			onchange={handleChange}
		>
			{#each JAM_STATUSES as status}
				<option value={status}>
					{status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
				</option>
			{/each}
		</select>
		<div
			class="text-card-foreground pointer-events-none absolute inset-y-0 right-0 flex items-center px-2"
		>
			<ChevronDown class="size-4" />
		</div>
	</div>
</div>
