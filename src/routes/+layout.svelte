<script lang="ts">
	import '../app.css';
	import { Toaster } from '$lib/components/ui/sonner';
	import { ModeWatcher } from 'mode-watcher';
	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	let { children } = $props();
	console.log('MODE:', dev ? 'development' : 'production');

	injectAnalytics({ mode: dev ? 'development' : 'production' });
</script>

<ModeWatcher defaultMode={'dark'} />
{@render children()}

<Toaster />
