# itch-jams-tracker

[![License](https://img.shields.io/github/license/your-org/itch-jams-tracker?style=flat-square)](LICENSE)
[![SvelteKit](https://img.shields.io/badge/built%20with-SvelteKit-ff3e00?style=flat-square)](https://kit.svelte.dev/)
[![Drizzle ORM](https://img.shields.io/badge/ORM-Drizzle-4B8BBE?style=flat-square)](https://orm.drizzle.team/)

> **Disclaimer:** This project is a community-driven, non-profit initiative and is not affiliated with or endorsed by itch.io or its owners. All content is for educational and community purposes only.

A modern, open-source SvelteKit app for tracking and managing itch.io game jams. Built with SvelteKit, Drizzle ORM, and Tailwind CSS.

---

## 🚀 Features

- Track and manage itch.io game jams
- Clean, responsive UI with dark mode support
- Modern Svelte 5 codebase
- SQLite database with Drizzle ORM
- Authentication & admin panel
- Community-driven and FOSS

---

## 🛠️ Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/nielpattin/itch-jams-tracker.git
cd itch-jams-tracker
pnpm install
```

### 2. Development

Start the development server:

```bash
pnpm dev
```

Or open the app automatically:

```bash
pnpm dev --open
```

### 3. Database Setup

Generate and apply migrations:

```bash
pnpm db:generate --name=init
pnpm db:migrate
```

Seed the database (optional):

```bash
pnpm db:seed
```

---

## 🏗️ Building for Production

Create a production build:

```bash
pnpm build
```

Preview the production build:

```bash
pnpm preview
```

> To deploy, install the appropriate [SvelteKit adapter](https://kit.svelte.dev/docs/adapters) for your target environment.

---

---

## Issues

Found a bug or have a feature request?
Please [open an issue](https://github.com/your-org/itch-jams-tracker/issues) on GitHub.

---

## 📄 License

This project is licensed under the GNU General Public License v3.0. See the [`LICENSE`](LICENSE) file for details.
