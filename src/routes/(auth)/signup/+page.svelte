<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);

	async function handleSignup() {
		error = null;
		const { data, error: authError } = await authClient.signUp.email({
			email,
			password,
			name: email
		});

		if (authError) {
			error = authError.message ?? 'An unknown error occurred.';
		} else if (data?.user) {
			goto('/');
		}
	}
</script>

<div class="signup-container">
	<h1>Sign Up</h1>
	<form onsubmit={handleSignup}>
		<div class="form-group">
			<label for="email">Email</label>
			<input type="email" id="email" bind:value={email} required />
		</div>
		<div class="form-group">
			<label for="password">Password</label>
			<input type="password" id="password" bind:value={password} required />
		</div>
		{#if error}
			<p class="error-message">{error}</p>
		{/if}
		<button type="submit">Sign Up</button>
	</form>
	<p>Already have an account? <a href="/login">Login</a></p>
</div>

<style>
	.signup-container {
		max-width: 400px;
		margin: 50px auto;
		padding: 20px;
		border: 1px solid #ddd;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		background-color: #fff;
	}

	h1 {
		text-align: center;
		color: #333;
		margin-bottom: 20px;
	}

	.form-group {
		margin-bottom: 15px;
	}

	label {
		display: block;
		margin-bottom: 5px;
		color: #555;
		font-weight: bold;
	}

	input[type='email'],
	input[type='password'] {
		width: 100%;
		padding: 10px;
		border: 1px solid #ccc;
		border-radius: 4px;
		box-sizing: border-box; /* Ensures padding doesn't increase width */
	}

	button {
		width: 100%;
		padding: 10px;
		background-color: #28a745; /* Green for signup */
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 16px;
		cursor: pointer;
		transition: background-color 0.3s ease;
	}

	button:hover {
		background-color: #218838;
	}

	.error-message {
		color: red;
		margin-bottom: 15px;
		text-align: center;
	}

	p {
		text-align: center;
		margin-top: 20px;
		color: #666;
	}

	p a {
		color: #007bff;
		text-decoration: none;
	}

	p a:hover {
		text-decoration: underline;
	}
</style>
