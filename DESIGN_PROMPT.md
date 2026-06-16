# DESIGN_PROMPT.md

A copy-paste prompt for **generative design tools** (v0, Figma Make, Stitch,
Lovable, or ChatGPT/Claude when you ask for a mockup). Paste this whole file
in, then add one line at the bottom: *"Now design `<the page or component you
want>`."*

Unlike `DESIGN.md` (the in-repo reference an agent reads before editing
code), this file is self-contained on purpose — it carries every value a tool
needs without access to the codebase. When the design system shifts, update
both in the same commit.

---

## Brief

Design in the visual language of **retypeset-odyssey**: *a pre-WYSIWYG book
page reimagined for the screen.* The upstream tagline is binding —

> a reading experience reminiscent of paper books, reviving the beauty of
> typography. Details in every sight, elegance in every space.

Every choice either reinforces "paper-book typography revived on a screen" or
it is wrong. Three words for the voice: **lyrical, academic, time-aware.**
Not playful, not corporate, not "framework of the week".

## Non-negotiable constraints

1. **Typography carries everything.** Hierarchy, rhythm and emotion come from
   font role + weight + size — never from boxes, cards, icons or color. If a
   layout would still work stripped of its custom fonts, it is the wrong
   layout.
2. **One accent, used like a highlighter.** A single saturated yellow is the
   only chroma on the page. A second accent color is a regression.
3. **Density is honesty.** Index/navigation surfaces (tag lists, archives)
   should show many small items, not few oversized chips. Do not "let it
   breathe" where the reader came to scan.
4. **Right-rail identity, left-flow content.** The page title / section label
   sits pinned in a fixed right-hand column; the main column, left-aligned and
   ranging, holds only what the reader came for. Never duplicate the title at
   the top of the main column.
5. **Motion only on intent.** The single allowed animation is a hover
   highlight. No scroll effects, no entrance staggers, no decorative reveals.
6. **Light mode is canon.** Dark mode, if shown, is the same system at reduced
   contrast — not a different look.

## Tokens (use these exact values)

**Color** — neutrals are faintly purple (hue 298, chroma ~0.005) so the yellow
reads as a deliberate punch. Never tint a neutral toward another hue; never
push a neutral's chroma past 0.02.

| Token | Light value | Role |
|---|---|---|
| background | `oklch(96% 0.005 298)` | page surface (paper) |
| primary | `oklch(25% 0.005 298)` | body text, hovered links |
| secondary | `oklch(40% 0.005 298)` | metadata, hairline borders, idle text |
| highlight | `oklch(0.93 0.195 103 / 0.5)` | the only accent — yellow marker |

Proportion is 60 / 30 / 10: 60% paper background, 30% text + hairlines, 10%
the yellow highlight and the script display face, used like punctuation.

**Type** — four roles, never a fifth. No sans-serif for body or headings.

| Role | Face | Used for |
|---|---|---|
| display | Snell Roundhand (script) | site title, dates, temporal labels |
| metadata | STIX Two Text *italic* | subtitle, breadcrumbs, post meta |
| body | STIX Two Text (LaTeX-adjacent serif) | all reading copy |
| CJK | a warm humanist CJK serif (e.g. Noto Serif SC) | Chinese/Japanese |

Size scale: `0.85 → 1.0 → 1.25 → 1.5 → 2 → 2.5rem`. Site title large
(~32–36px); per-page heading a deliberate step **down** (~20–24px) so two big
headings never stack.

**Space & line** — wide white margins on desktop. The only decorative
separator is a short thin rule: ~40px wide, 1px, `secondary` at 25% opacity.
Do not invent borders, dividers or section backgrounds beyond this.

**The interaction signature** — on hover, a half-em yellow bar swipes in
*behind* the link text (a marker stroke after the eye lands), `transition:
width 200ms ease-out`. This is the ONLY way links react: no static underline,
no color shift, no transform. Reuse this primitive; do not invent new hovers.

## Prohibitions (turn these away on sight)

- **Not a Vercel/Linear dev blog**: no Inter/Geist, no card grids, no gradient
  hero, no auto-staggered fade-ins, no monospace as decoration.
- **Not a Medium/Substack page**: no subscribe CTA, no "follow for more", no
  end-of-post related-posts carousel.
- **Not a WordPress dashboard**: no sidebar widgets, no visit counter, no
  "most popular", no recent-comments module.
- **Not Notion/Obsidian public**: no graph view, no kanban, no database embed,
  no diagrams as chrome.
- **Not an AI-design-system reference**: no glassmorphism, no purple-blue
  gradient, no neon-on-dark, no rounded-rectangle-with-soft-shadow card, no
  large icon stacked above a heading.

If a request seems to need one of these, solve it with type, spacing and the
single accent instead.

## Task template

Fill in and append to the paste:

```
Now design: <page or component, e.g. "a 404 page" / "a footnotes block" /
            "the post-list row for a new collection">
Context:    <where it lives, what the reader is doing there>
Must:       <anything specific — but stay inside the constraints and tokens above>
```

Deliver light mode first. Annotate which font role and which token each element
uses, so the output can be checked against this brief rather than eyeballed.
