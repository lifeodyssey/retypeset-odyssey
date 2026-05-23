import { defineConfig } from 'astro/config'
import retypeset from './integration'

/**
 * Standalone-mode Astro config.
 *
 * When this repo is checked out and used directly (Usage A in README), the
 * integration does all the heavy lifting — it loads `default-config.yaml`
 * (and any `retypeset.config.yaml` placed alongside this file), wires up
 * UnoCSS / MDX / partytown / sitemap / pagefind / compress, sets the
 * top-level Astro config from the YAML, and injects every route.
 *
 * Package consumers (Usage B) should mirror this file — `integrations:
 * [retypeset()]` is all they need.
 */
export default defineConfig({
  integrations: [retypeset()],
})
