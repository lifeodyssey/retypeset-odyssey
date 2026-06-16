# DESIGN.md

The design source-of-truth for retypeset-odyssey. Read this before changing
visuals, adding pages, or making typographic decisions. Update it (don't
diverge silently) when the system shifts.

This file is the canonical design context the `/impeccable` skill loads.
The flagship consumer is [zhenjia.dev](https://zhenjia.dev).

For generating on-brand visuals with tools that can't read this repo (v0,
Figma Make, Stitch, an LLM mockup), see the self-contained paste-in prompt in
`DESIGN_PROMPT.md` — keep the two in sync.

## Origin

retypeset-odyssey forks [astro-theme-retypeset](https://github.com/radishzzz/astro-theme-retypeset).
The upstream tagline is the cleanest one-liner anyone has written about this
visual system:

> creates a reading experience reminiscent of paper books, reviving the beauty
> of typography. Details in every sight, elegance in every space.

That sentence is binding. Every design decision here either reinforces
"paper book typography revived on a screen" or it is wrong.

Our fork adds operational scope (trilingual content, tag URL encoding, npm
packaging, SEO redirects), not aesthetic deviations. Visual changes should
treat the upstream as the spine and themselves as fascia — additive,
non-contradictory.

## Design Context

### Users
The reader is a stranger who landed via search or a feed — often technical
(AI coding agents, oceanography, software engineering), often Japanese or
English-speaking despite the Chinese primary. They scan first, commit
second.

On navigation pages (`/categories`, `/tags`, `/timeline`), the explicit job
is **"find a post I half-remember"**. Fast in, fast out. These pages are
tools, not vitrines. Visual decoration that slows the scan is a regression.

Content pages (`/posts/<slug>`) are the opposite: they reward leaning in.
The two modes coexist in the same typographic system without competing.

### Brand Personality
Three words: **lyrical, academic, time-aware.**

- **Lyrical** comes from the Chinese subtitle "人生若只如初见" (Nalan
  Xingde), the "Life Odyssey" naming, and Snell Roundhand showing up in
  headings and dates. There is a poem hiding behind the math.
- **Academic** comes from STIX (the LaTeX-adjacent math-friendly serif),
  citations baked into post conventions, and the bibliography category. The
  author writes from a research posture, not a "growth" one.
- **Time-aware** comes from the persona convention of dating every claim
  ("as of 2026-05") and from the existence of `/timeline` itself. The
  author treats their writing as a thing that ages, not a thing that
  stands still.

The voice these three words exclude is just as important: not playful,
not corporate, not opinion-as-marketing, not "framework of the week".

### Aesthetic Direction
A pre-WYSIWYG book page reimagined for the screen. Wide white margins on
desktop. Section title pinned to a right sidebar — the way a textbook's
running head sits in the gutter. Body left-aligned and ranging. A single
saturated yellow (`oklch(0.93 0.195 103)`) used like a highlighter pen,
nothing else does color. Hover reveals a half-em yellow underline behind
the link, simulating a marker stroke after the eye lands.

Light mode is the default and the canon. Dark mode exists for late-night
readers but is not the brand.

The site should feel like a thing someone made carefully, by hand, for one
audience: people who would still own physical books in 2026.

### Design Principles
1. **Typography carries the design.** If a change would work without the
   custom fonts, it is the wrong change. Hierarchy, rhythm, and emotion
   come from font-role + weight + size, never from boxes or icons.
2. **One accent, used sparingly.** The yellow highlight is the only chroma
   on the page. Adding a second accent color is a regression.
3. **Density is honesty.** A reader who came to find a post wants 80
   visible tags, not 12 oversized chips. Resist the urge to "let it
   breathe" on index/navigation pages.
4. **Right-rail title, left-flow content.** Page identity lives in the
   pinned right column (`uno-desktop-column`). The main column is for
   what the reader came for. Do not duplicate the title at the top of
   the main column.
5. **Motion only on intent.** Hover is the only place animation is welcome
   (the highlight underline). No scroll-jacking, no entrance staggers,
   no decorative reveals. Page transitions are Astro's defaults.

## Typographic System

Already encoded in `uno.config.ts`:

| Role         | Family          | Where it appears                          |
|--------------|-----------------|-------------------------------------------|
| `font-title` | Snell-Black     | Site title, page H1 on listing pages      |
| `font-navbar`| STIX-Italic     | Subtitle, breadcrumbs, post metadata      |
| `font-time`  | Snell-Bold      | Dates, reading-time, all temporal labels  |
| `font-serif` | STIX            | Body copy (with `heti` CJK typography)    |
| `EarlySummer`| EarlySummer-VF  | CJK characters (subset, variable weight)  |
| (fallback)   | NotoSansSC      | CJK fallback when EarlySummer misses      |

Rules:
- **Never introduce a fifth font role.** If a new context needs a different
  voice, it's either `font-title` (display), `font-navbar` (italic
  metadata), or `font-serif` (body) — pick one.
- **No sans-serif outside system UI fallback.** The site has no design role
  for sans-serif body. Adding one would break the paper-book contract.
- **Scale = 0.85 → 1.0 → 1.25 → 1.5 → 2 → 2.5rem.** Mostly via UnoCSS
  utilities (`text-3.5`, `text-4`, `text-5`, `text-6`, `text-8`, `text-9`).

H1 has TWO distinct slots and they are not interchangeable:

- **Site title H1** (in `Header.astro`, every page): `font-title text-8 lg:text-9`
  (~32→36px). The brand mark, always at the top of the right-rail column.
- **Page H1** (per-page heading like "Tags" / "Categories" / "Timeline"):
  `font-bold text-5 lg:text-6` (~20→24px). A deliberate step down — the
  site title already does the loud work, so the page identity sits as
  a sub-heading rather than competing. Using the H1 slot bigger here
  would double-stack two large headings and lose the paper-book quiet.

Upstream Retypeset doesn't have per-page H1 at all (just the site title +
`<title>`); our fork adds the smaller page H1 so each destination has a
named anchor when scanned independently.

## Color System

Defined in `default-config.yaml > color`. Light is canon; dark mirrors it
with reduced contrast.

| Token       | Light                              | Role                                |
|-------------|------------------------------------|-------------------------------------|
| background  | `oklch(96% 0.005 298)`             | Page surface (slight purple tint)   |
| primary     | `oklch(25% 0.005 298)`             | Body text, hovered links            |
| secondary   | `oklch(40% 0.005 298)`             | Metadata, borders, idle text        |
| highlight   | `oklch(0.93 0.195 103 / 0.5)`      | The single accent — yellow marker   |

`hue 298` is the cohesion glue: every "neutral" is faintly purple (chroma
0.005), which makes the yellow accent feel like a deliberate punch rather
than a default browser highlight. **Never tint a neutral toward a different
hue.** Never raise chroma on a neutral past 0.02.

The 60-30-10 here:
- **60%** background (paper)
- **30%** secondary/primary text + hairline borders
- **10%** is `highlight` and `font-title` (Snell), used like punctuation

## Spatial System

Two shortcuts in `uno.config.ts` are the spine:

```
uno-desktop-column   fixed right-[max(5rem,calc(50vw-35rem))] w-14rem
uno-decorative-line  mb-4.5 h-0.25 w-10 bg-secondary/25 lg:(mb-6 w-11)
```

`uno-desktop-column` is the right-rail position for page titles, subtitles,
counts, language switchers. New pages MUST use this — it's how a reader
recognizes which kind of page they're on.

`uno-decorative-line` is the only non-typographic separator we use. Reach
for it instead of inventing borders, dividers, or section backgrounds.

Spacing scale (UnoCSS units, 1 = 0.25rem):
- Within a row of metadata: `gap-3` to `gap-6`
- Between list items: `mb-5.5 lg:mb-7.5` (post list pattern)
- Between major sections: `mb-7.5 lg:mb-10.5` (page section pattern)

## Interaction Signature

The one piece of motion on the site is the highlight underline:

```css
.highlight-hover::after {
  position: absolute;
  left: 0;
  bottom: 0.7em;    /* 0.35em for inline-in-text variants */
  height: 0.5em;
  width: 100%;
  background: var(--highlight);
  z-index: -1;
  transition: width 200ms ease-out;
}
```

It is a marker-pen swipe that appears behind a link on hover. It is the
ONLY way links "react" — no underline, no color shift, no transform. New
interactive surfaces should reuse this primitive (`.highlight-hover` class
+ ensure parent is `position: relative`), not invent new ones.

## What This Site Is Not

A negative reference list, since the positive vocabulary above is narrow
and easy to drift away from.

- **Not a Vercel/Linear-style dev blog.** No Inter, no card grids, no
  gradient hero, no auto-staggered fade-ins, no monospace as decoration.
- **Not a Medium/Substack author page.** No subscribe-to-newsletter CTA,
  no "follow for more", no end-of-post related-posts carousel.
- **Not a WordPress dashboard.** No sidebar widgets, no visit counter, no
  most-popular module, no "recent comments".
- **Not Notion/Obsidian public.** No graph view, no kanban, no database
  embed, no Mermaid as decoration. (Mermaid is allowed inside a post when
  the post earns it; never on chrome.)
- **Not an AI-design-system reference.** No glassmorphism, no purple-blue
  gradient, no neon on dark, no rounded-rectangle-with-soft-shadow card,
  no large icon above heading. Anything from the impeccable `<absolute_bans>`
  list is a non-starter.

## Updating This Doc

When the system shifts (new font role, new shortcut, new accent), update
this file in the same commit as the code change. A README for the design
that lags the code is worse than no README.
