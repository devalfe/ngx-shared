# ngx-shared

Monorepo for an Angular shared library used across micro-frontends.

This repository contains the Angular library `@devalfe/ngx-global-state`, which provides a distributed global state and message bus utilities for micro-frontend architectures.

If you are looking for library-specific usage and API docs, see: `projects/ngx-global-state/README.md`.

## Overview

- Language: TypeScript
- Framework: Angular 20 (Angular CLI workspace; library project)
- Build tools: Angular Build + ng-packagr
- Testing: Jest (jsdom, ts-jest)
- Linting/Formatting: ESLint, Prettier
- Docs: Compodoc
- Release/Tooling: Husky, Commitizen (cz-git), Semantic Release (configured, dry-run script present)
- Package manager: npm

Entry points:

- Library public API: `projects/ngx-global-state/src/public-api.ts`
- Package build config: `projects/ngx-global-state/ng-package.json` (ng-packagr)

Published package name (from usage docs in the library): `@devalfe/ngx-global-state`.

## Requirements

- Node.js (LTS recommended; project uses TypeScript ~5.9 and Angular 20)
- npm (Angular CLI is used via npm scripts; workspace sets packageManager to npm)

Global installs are not required; all commands below use npm scripts.

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Build the library (production config by default):

```bash
npm run build        # Or: npm run build:lib for ng-packagr directly
```

3. Run tests:

```bash
npm test
```

4. Generate documentation:

```bash
npm run docs
npm run docs:serve   # serves docs at http://localhost:8080
```

## Scripts

The most relevant npm scripts defined in package.json:

- ng: `ng`
- start: `ng serve` (NOTE: This is an Angular workspace for a library; there is no app configured to serve. See TODO below.)
- build: `ng build` (builds the library using Angular build system)
- watch: `ng build --watch --configuration development`
- build:lib: `ng-packagr -p projects/ngx-global-state/ng-package.json`
- publish:lib: `cd dist/ngx-global-state && npm publish --access restricted`
- pack:lib: `npm run build:lib && cd dist/ngx-global-state && npm pack`
- clean: `rimraf dist`
- test: `jest`
- test:staged: `jest -o --bail`
- test:watch: `jest --watch`
- test:coverage: `jest --ci --runInBand --coverage`
- docs: `compodoc -p tsconfig.json -d docs`
- docs:serve: `compodoc -s -d docs`
- lint: `eslint .`
- lint:fix: `eslint . --fix`
- format: `prettier --write .`
- format:check: `prettier --check .`
- commit: `cz`
- prepare: `husky`
- release:dry: `semantic-release --dry-run`

## Using the library

After you publish `@devalfe/ngx-global-state` to your registry, install it in an Angular app:

```bash
npm install @devalfe/ngx-global-state --save
```

Quick bootstrap example (see the library README for full API):

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideGlobalState, provideMessageBus } from '@devalfe/ngx-global-state';

bootstrapApplication(AppComponent, {
  providers: [
    ...provideGlobalState({ appId: 'shell', persistence: 'session', crossApp: 'none' }),
    ...provideMessageBus({ appId: 'shell' }),
  ],
});
```

## Environment variables

- No environment variables are currently required by the library or build.
- TODO: If publishing to a private registry, document required npm auth variables here (e.g., NPM_TOKEN) and usage for CI.

## Tests

- Runner: Jest (jsdom)
- Config: `jest.config.ts`
- Setup files: `projects/ngx-global-state/test/setup-tests.ts`
- Source under test: `projects/ngx-global-state/src/lib/**/*.ts`

Common commands:

```bash
npm test                 # run all tests
npm run test:watch       # watch mode
npm run test:coverage    # CI-friendly with coverage
```

## Linting & formatting

```bash
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

## Documentation (Compodoc)

Generate static docs and serve them locally:

```bash
npm run docs
npm run docs:serve  # http://localhost:8080
```

## Build, pack, and publish

- Build via Angular: `npm run build`
- Build via ng-packagr directly: `npm run build:lib`
- Create a tarball: `npm run pack:lib` (outputs under `dist/ngx-global-state`)
- Publish (restricted access by default): `npm run publish:lib`

The library output is located at `dist/ngx-global-state/`.

## Project structure

- angular.json — Angular workspace config (library project: ngx-global-state)
- projects/ngx-global-state — Library source
  - src/public-api.ts — entry point of the library package
  - src/lib/\*\* — implementation
  - test/\*\* — jest setup and utilities
  - README.md — library-specific docs (Spanish)
- jest.config.ts — Jest configuration
- eslint.config.cjs — ESLint configuration
- tsconfig\*.json — TypeScript configuration
- dist/ngx-global-state — Build artifacts (generated)

## Versioning & releases

- Conventional commits recommended via Commitizen: `npm run commit`
- Pre-commit hooks via Husky are prepared with `npm run prepare`
- Semantic Release is present; a dry-run script is provided: `npm run release:dry`
- TODO: Configure CI and real release workflow if needed.

## License

- TODO: Add a LICENSE file to the repository and state the license here (e.g., MIT). Currently, no license file is present in the repo root.
