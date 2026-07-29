<!-- Header -->
<div align="center" style="margin-top: 120px">
  <a href="https://haptic.md/app">
    <img
      src="./.github/assets/icon.svg"
      alt="Haptic"
      height="100"
    />
  </a>

  <h3 align="center">Haptic
  </h3>
  <b>
    Open-Source markdown editor - your new home for notes
  </b>
</div>

<!-- TOC -->
<p align="center">
    <a href="https://haptic.md"><strong>Learn more »</strong></a>
    <br />
    <br />
    <a href="#introduction">Introduction</a>
    ·
    <a href="#tech-stack">Tech Stack</a>
    ·
    <a href="#where-your-notes-live">Storage</a>
    ·
    <a href="#development">Development</a>
    ·
    <a href="#roadmap">Roadmap</a>
  </p>
</p>

<p>
    <a href="https://haptic.md/app">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./.github/assets/haptic-dark.png">
        <source media="(prefers-color-scheme: light)" srcset="./.github/assets/haptic-light.png">
        <img alt="Haptic" src="./.github/assets/haptic-dark.png">
      </picture>
    </a>
</p>

> [!NOTE]
> This is an actively maintained fork of [chroxify/haptic](https://github.com/chroxify/haptic), which has been inactive since early 2025. It is being modernized (Svelte 5, Tauri 2, Tailwind 4) and developed further here. Licensed under AGPLv3, same as upstream — full credit to [@chroxify](https://github.com/chroxify) for the original work.

## Introduction

Haptic is a new local-first & privacy-focused, open-source home for your markdown notes. It's minimal, lightweight, efficient and aims to have _all you need and nothing you don't_.

If you'd like to learn more about Haptic, why it's being built, what its goals are and how it differs from all the other markdown editors out there, you can read more about it [here](https://haptic.md/app).

## Tech Stack

- [Svelte 5](https://svelte.dev/) + [SvelteKit](https://kit.svelte.dev/) – Framework
- [Tauri 2](https://tauri.app/) – Desktop app
- [PGlite](https://pglite.dev/) + [Drizzle](https://orm.drizzle.team/) – Local database (web)
- [TipTap](https://tiptap.dev/) – Markdown editor
- [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn-svelte](https://www.shadcn-svelte.com/) – Styling & components
- [Oxc](https://oxc.rs/) (oxlint + oxfmt) – Linting & formatting
- [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) – Tests

## Where your notes live

- **Desktop** — plain `.md` files in the folder you open ("collection"), with a `.haptic/` metadata folder inside it for daily notes, trash, and per-collection settings. Nothing is locked away; point any other editor at the same folder.
- **Web** — in your browser only, in a Postgres database (PGlite) persisted to IndexedDB. Clearing site data clears your notes, and nothing syncs to the desktop app yet.

## Development

Requires Node >= 22 and [pnpm](https://pnpm.io/). For the desktop app you also need the [Tauri prerequisites](https://tauri.app/start/prerequisites/) (Rust toolchain).

```bash
pnpm install

pnpm --filter=web dev          # web app on http://localhost:5173
pnpm --filter=desktop dev:tauri # desktop app

pnpm check                     # typecheck (svelte-check)
pnpm test                      # unit + storage-adapter contract tests
pnpm --filter=web test:e2e     # Playwright smoke tests
pnpm build                     # build everything
```

The repo is a pnpm + Turborepo workspace: `apps/{web,desktop,homepage}` and `packages/{core,editor,app,ui}`. The two apps share all logic and UI and differ only in their storage adapter — see [`CLAUDE.md`](./CLAUDE.md) for the architecture and [`docs/quality.md`](./docs/quality.md) for tooling policy.

## Self-hosting the web app

`apps/web` builds to a static SPA (`@sveltejs/adapter-static`) — run `pnpm build --filter=web` and serve `apps/web/build` from any static host. All data stays in the visitor's browser, so there is no backend to run.

> The upstream Vercel one-click deploy and the `chroxify/haptic-web` Docker image belong to the original project and are not published from this fork.

## Roadmap

- [ ] Haptic Sync — sync notes across devices (the settings pane exists but is a non-functional stub today)
- [ ] Import notes from pre-0.3 web databases (old data is preserved, importer pending)
- [ ] Note sharing — share single notes or entire collections via link
- [ ] Mobile support for the web app — dependent on PGlite mobile support
- [ ] Native mobile apps for iOS & Android
- [ ] Windows & Linux support for the desktop app
- [ ] App updater — removed during the Tauri 2 migration, pending our own release endpoint

## Contributing

Issues and pull requests are welcome. Please run `pnpm check`, `pnpm test`, and `pnpm build` before opening a PR, and use [conventional commits](https://www.conventionalcommits.org/).

## License

Haptic is licensed under the [GNU Affero General Public License Version 3 (AGPLv3)](./LICENSE), as is the original project it forks.

---
