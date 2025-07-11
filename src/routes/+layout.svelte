<script lang="ts">
	import '../app.css';
	import { Toaster } from '$lib/components/ui/sonner';
	import { ModeWatcher } from 'mode-watcher';
	let { children } = $props();
</script>

<ModeWatcher defaultMode={'dark'} />
{@render children()}

<footer class="bg-background border-border mt-12 w-full border-t py-6">
	<div class="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row">
		<span class="text-muted-foreground text-sm"
			>&copy; {new Date().getFullYear()} itch-jams. All rights reserved.</span
		>
		<nav class="flex gap-4">
			<a
				href="https://github.com/nielfranci/itch-jams"
				target="_blank"
				rel="noopener"
				class="text-muted-foreground hover:text-foreground transition-colors">GitHub</a
			>
		</nav>
	</div>
</footer>
<Toaster />
