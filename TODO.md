# Itch.io Game Jams Tracker Checklist

This checklist outlines the key components and setup steps for the Itch.io Game Jams Tracker project.

## Project Overview

- [ ] SvelteKit application for tracking Itch.io game jams.
- [ ] Scrapes jam information from Itch.io.
- [ ] Stores data in a SQLite database using Drizzle ORM.
- [ ] Displays scraped data on a frontend.

## Technologies Used

- [ ] **Frontend Framework**: SvelteKit
- [ ] **Database**: SQLite (via ``and`@libsql/client` for Turso), Drizzle ORM
- [ ] **Web Scraping**: Playwright

## Frontend Page Details Checklist

This document outlines the detailed style, layout, pages, and features of the Itch Game Jams Tracker frontend application.

### Style and Layout

- [ ] **Overall Page Structure:**
  - [ ] Minimum screen height (`min-h-screen`).
  - [ ] Dark gray background (`bg-gray-900`).
  - [ ] Responsive padding: `p-4` (mobile), `md:p-6` (medium screens), `lg:p-8` (large screens).
  - [ ] Light gray text color (`text-gray-100`).
  - [ ] Main content area is centered with a maximum width of 7xl (`max-w-7xl mx-auto`).
  - [ ] Vertical spacing between major sections (`space-y-6 md:space-y-8`).

- [ ] **Header Section:**
  - [ ] Uses flexbox for horizontal alignment, with elements justified between and aligned to the start (`flex justify-between items-start`).
  - [ ] **Application Title (`h1`):**
    - [ ] Large font size (`text-2xl md:text-3xl`).
    - [ ] Bold font weight (`font-bold`).
    - [ ] White text color (`text-white`).
    - [ ] Bottom margin (`mb-4`).
  - [ ] **Version and Update Information:**
    - [ ] Container with dark gray background (`bg-gray-700`), light gray text (`text-gray-300`), small font size (`text-xs`), horizontal padding (`px-2`), rounded corners (`rounded`), and shadow (`shadow-lg`).
    - [ ] Minimum height (`min-h-[2.25rem]`) and vertically centered content (`flex flex-col justify-center`).
    - [ ] Displays version (`v{metadata.version}`) and latest update date (`{metadata.latestUpdate}`).
  - [ ] **Time Display Toggle Button:**
    - [ ] Blue background (`bg-blue-600`), white text (`text-white`), horizontal padding (`px-2`), small font size (`text-xs`), rounded corners (`rounded`).
    - [ ] Hover effect (`hover:bg-blue-700`).
    - [ ] Minimum height (`min-h-[2.25rem]`).
    - [ ] Toggles between "UTC" and "Local" text based on `showLocalTime` state.

- [ ] **Search and Category Selection Section:**
  - [ ] Bottom margin (`mb-6`).
  - [ ] Uses flexbox for horizontal alignment, with elements justified between and vertically centered, and a gap between items (`flex justify-between items-center gap-4`).
  - [ ] Each input section (Search and Category Select) takes equal width (`flex-1`).
  - [ ] **Section Titles (`h3`):**
    - [ ] Medium to large font size (`text-lg md:text-xl`).
    - [ ] Semi-bold font weight (`font-semibold`).
    - [ ] Slightly darker gray text color (`text-gray-200`).
    - [ ] Bottom margin (`mb-2`).
  - [ ] **Input Containers (for SearchBar and CategorySelect):**
    - [ ] Dark gray background (`bg-gray-800`), shadow (`shadow-md`), rounded corners (`rounded-lg`).
    - [ ] Responsive padding (`p-1 md:p-2`).

- [ ] **Tab Navigation (Mobile Only):**
  - [ ] Hidden on medium screens and up (`md:hidden`).
  - [ ] Uses flexbox (`flex`), bottom margin (`mb-4`), and a bottom border (`border-b border-gray-700`).
  - [ ] **Tab Buttons:**
    - [ ] Horizontal and vertical padding (`px-4 py-2`).
    - [ ] Medium font weight (`font-medium`).
    - [ ] **Active Tab:** Blue text (`text-blue-400`) and a blue bottom border (`border-b-2 border-blue-400`).
    - [ ] **Inactive Tab:** Gray text (`text-gray-400`).

- [ ] **Jam Lists Section (Desktop/Tablet View):**
  - [ ] Hidden on mobile (`hidden`).
  - [ ] Displays as a grid with 1 column on small screens and 2 columns on medium screens and up (`md:grid grid-cols-1 md:grid-cols-2`).
  - [ ] Gap between grid columns (`gap-6`).
  - [ ] **List Titles (`h3`):** Same styling as Search/Category titles.
  - [ ] **List Containers:**
    - [ ] Dark gray background (`bg-gray-800`), shadow (`shadow-md`), rounded corners (`rounded-lg`).
    - [ ] Responsive padding (`p-2 md:p-4`).
    - [ ] Horizontal scroll if content overflows (`overflow-x-auto`).
  - [ ] **Empty State Message (for Tracked Jams):**
    - [ ] Uses flexbox for vertical alignment, centered items, padding, and gray text (`flex flex-col items-center p-8 text-gray-400`).
    - [ ] Large emoji (`text-5xl mb-2`).

- [ ] **Jam Lists Section (Mobile View):**
  - [ ] Hidden on medium screens and up (`md:hidden`).
  - [ ] Displays either "Tracked Jams" or "Untracked Jams" based on the `activeTab` state.
  - [ ] **List Containers:** Same styling as desktop list containers.

- [ ] **Information Buttons:**
  - [ ] `InfoButtons` component is rendered at the bottom of the main content area. (Specific styling is within the `InfoButtons.svelte` component).

### Pages/Routes

- [ ] **Main Page (`/`):**
  - [ ] Displays the primary interface for tracking and viewing game jams.
  - [ ] Implemented by `src/routes/+page.svelte`.
- [ ] **Info Page (`/info`):**
  - [ ] Likely provides additional information about the application or game jams.
  - [ ] Implemented by `src/routes/info/+page.svelte`.
- [ ] **API Content Endpoint (`/api/content/[slug]`):**
  - [ ] Serves dynamic content based on a slug.
  - [ ] Implemented by `src/routes/api/content/[slug]/+server.ts`.

### Features

- [ ] **Jam Tracking Management:**
  - [ ] Users can add (track) game jams to their personal list.
  - [ ] Users can remove (untrack) game jams from their list.
  - [ ] Tracked jam IDs are persisted using local storage (`useLocalStorage` hook).
- [ ] **Jam Listing and Display:**
  - [ ] Displays two distinct lists: "Tracked Jams" and "Untracked Jams".
  - [ ] Each jam entry includes details such as name, category, and dates.
- [ ] **Filtering and Searching:**
  - [ ] **Search Bar:** Allows users to filter both tracked and untracked jams by name (case-insensitive).
  - [ ] **Category Select:** Enables users to filter jams by predefined categories ("upcoming", "in-progress").
- [ ] **Time Display Toggle:**
  - [ ] A button allows users to switch between displaying jam dates in UTC time or their local time.
- [ ] **Responsive Design:**
  - [ ] The layout adapts to different screen sizes.
  - [ ] On mobile, jam lists are displayed in a tabbed interface ("Tracked Jams" and "Untracked Jams").
  - [ ] On desktop/tablet, jam lists are displayed side-by-side in a two-column grid.
- [ ] **Loading State Indicator:**
  - [ ] A "Loading..." message is displayed while initial data (from local storage) is being fetched.
- [ ] **Application Version Information:**
  - [ ] The current application version and the date of the latest update are displayed in the header.
- [ ] **Informational Buttons:**
  - [ ] Provides access to additional information or external links via `InfoButtons` component.
- [ ] **Error Handling (Jam URLs):**
  - [ ] Invalid jam URLs are logged to the console, and the corresponding jam is filtered out from the display.

## Setup and Running Checklist

- [x] **Scrape Data**: Manually trigger the scraper.
  - To run the scraper, you can call the `scrapeItchIo()` function. This function is designed to be executed in a Node.js environment.
  - **Example Usage (from a script or endpoint):**

    ```javascript
    import { scrapeItchIo } from './path/to/your/scraper/file'; // Adjust path as needed

    async function runScraper() {
    	console.log('Starting Itch.io scraper...');
    	await scrapeItchIo();
    	console.log('Itch.io scraper finished.');
    }

    runScraper();
    ```

  - Ensure all necessary dependencies (Playwright, Drizzle ORM, etc.) are installed and configured.
