<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { X } from '@lucide/svelte';

	let { searchTerm = $bindable(), onSearch = () => {}, onClear = () => {} } = $props();

	let debounceTimeout: ReturnType<typeof setTimeout>;
	const SEARCH_TERM_KEY = 'itchjam-search-term';

	function handleInput() {
		localStorage.setItem(SEARCH_TERM_KEY, searchTerm);
		clearTimeout(debounceTimeout);
		debounceTimeout = setTimeout(() => {
			onSearch(searchTerm);
		}, 500); // 500ms debounce
	}

	function handleClear() {
		searchTerm = '';
		localStorage.setItem(SEARCH_TERM_KEY, '');
		onClear();
	}
</script>

<div class="flex flex-col gap-6">
	<h3 class="mb-2 text-lg font-semibold">Search</h3>
	<div class="relative w-full">
		<Input
			type="text"
			placeholder="Search for a jam..."
			class="bg-card text-card-foreground border-border focus:ring-primary w-full rounded border-0 px-4 py-2 pr-10 focus:ring-2 focus:outline-none"
			bind:value={searchTerm}
			oninput={handleInput}
		/>
		{#if searchTerm}
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 transition-colors"
				onclick={handleClear}
				aria-label="Clear search"
			>
				<X class="size-5" />
			</button>
		{/if}
	</div>
</div>
