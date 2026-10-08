# Changelog

## 0.1.24 - 2026-10-08

### Compatibility

- Requires Astro 7 and Node.js 22.12.0 or newer. The theme configures the Unified Markdown processor, preserving the existing remark/rehype pipeline and HTML whitespace behavior.

### Features

- Preserve the consuming blog's `publicDir` so independently owned HTML documents can ship with CSS, JavaScript, and images. Consumer files override theme defaults in development and static builds.
- Support custom public directories and deployment bases; reject generated-route collisions and prevent theme asset path escapes.

### Security and validation

- Update Astro, MDX, image processing, Markdown rendering, and affected transitive dependencies. Pin KaTeX to the fixed, non-deprecated 0.18.10 release.
- Add five static-asset regression tests and run them in CI and the npm publishing workflow.
- The unresolved `braces@3.0.3` advisory remains visible. Consumer projects still need transitive security overrides because package-local pnpm overrides do not propagate to consumers.
