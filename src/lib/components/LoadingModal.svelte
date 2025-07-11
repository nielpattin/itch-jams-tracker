<script lang="ts">
	let {
		showProgressModal = false,
		fadeIn = false,
		progress = 0,
		progressAnimationDuration = 300
	} = $props();
</script>

{#if showProgressModal}
	<div
		class="bg-background/80 fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500"
		style="opacity: {fadeIn ? 0 : 1}; pointer-events: {fadeIn ? 'none' : 'auto'};"
	>
		<div class="bg-card flex w-full max-w-lg flex-col items-center rounded p-6 shadow-lg">
			<div class="mb-4 w-full">
				<div class="bg-muted h-2 w-full rounded">
					<div
						class="bg-primary h-2 rounded"
						style="width: {progress}%; transition: width {progressAnimationDuration}ms linear;"
					></div>
				</div>
			</div>
			<span class="text-card-foreground flex items-center gap-2 font-medium">
				Loading your preferences...
				<span class="text-muted-foreground ml-2 font-mono text-xs"
					>{Math.round((progress / 100) * 100)}%</span
				>
			</span>
		</div>
	</div>
{/if}
