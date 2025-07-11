<script lang="ts">
	import { authClient, signIn } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Button from '$lib/components/ui/button/button.svelte';

	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);

	async function handleLogin() {
		error = null;
		const { data, error: authError } = await signIn.email({ email, password });

		if (authError) {
			error = authError.message ?? 'An unknown error occurred.';
		} else if (data?.user) {
			const session = await authClient.getSession();
			if (session?.data?.user?.role === 'admin') {
				goto('/admin');
			} else {
				goto('/');
			}
		}
	}
</script>

<div class="bg-background flex min-h-screen items-center justify-center px-4">
	<div class="border-border bg-card w-full max-w-md rounded-xl border p-8 shadow-lg">
		<h1 class="text-card-foreground mb-6 text-center text-3xl font-bold">Login</h1>
		<form class="space-y-5" onsubmit={handleLogin}>
			<div class="space-y-2">
				<!-- Email Field -->
				<!-- This is the email input component -->
				<Label for="email" class="text-card-foreground">Email</Label>
				<Input
					id="email"
					type="email"
					bind:value={email}
					required
					autocomplete="email"
					placeholder="you@example.com"
				/>
			</div>
			<div class="space-y-2">
				<!-- Password Field -->
				<!-- This is the password input component -->
				<Label for="password" class="text-card-foreground">Password</Label>
				<Input
					id="password"
					type="password"
					bind:value={password}
					required
					autocomplete="current-password"
					placeholder="Your password"
				/>
			</div>
			{#if error}
				<p class="text-destructive text-center text-sm">{error}</p>
			{/if}
			<Button type="submit" class="w-full">Login</Button>
		</form>
		<p class="text-muted-foreground mt-6 text-center">
			Don't have an account?
			<a href="/signup" class="text-primary hover:underline">Sign Up</a>
		</p>
	</div>
</div>
