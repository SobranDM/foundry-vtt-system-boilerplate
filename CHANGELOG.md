# CHANGELOG

## 2.1.0

- Target Foundry v14 (compatibility, styles object, grid schema)
- Remove deprecated `template.json`; use TypeDataModel exclusively
- Consolidate data models into `module/data/` (no optional generator path)
- Declare actor and item subtypes via `documentTypes` in `system.json`
- Fix ApplicationV2 sheet action wiring (items, rolls, active effects)
- Fix actor sheet item list preparation (`actor.type` vs `system.type`)
- Align item attributes tab with TypeDataModel roll fields
- Generator output cleanup (lockfiles, success message)
- Migrate Sass from deprecated `@import` to `@use` / mixins

## 2.0.0

- Update to Foundry v13 standards
- Improve data model implementation
- Implement ApplicationV2
- Updated dependencies, including Sass
- Switch package manager to pnpm
- Include Typescript types by default

## 1.2.0

- Add support for Foundry v10
