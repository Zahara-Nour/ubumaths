# Fragment Overlap Bug - RESOLVED

**Status**: Fixed on 2026-01-24

## Problem

When a fragment became visible on a slide, it overlapped with the previous text instead of appearing below it.

## Root Cause

**Conflict between `app.css` and slide font-sizes.**

`app.css` has rules for `main p` and `main h1` that set `line-height` using **fixed `rem` values**:

```css
main p,
main li {
	line-height: calc(1.5rem * var(--font-scale)) !important; /* = 24px */
}
```

But slides use **large font-sizes** (42px for paragraphs, 105px for h1). With a 24px line-height on 42px text, the text overflows its container and overlaps adjacent elements.

### Debug Data

Before fix:

- P: `fontSize: 42px`, `lineHeight: 24px`, `height: 24px`
- Text visually ~42px tall but container only 24px → overflow of 18px

After fix:

- P: `fontSize: 42px`, `lineHeight: 63px`, `height: 63px`
- Text fits properly in container

## Solution

Added relative `line-height` rules in `Slide.svelte` that override the fixed `rem` values:

```css
:global(.slide-content h1),
:global(.slide-content h2),
:global(.slide-content h3),
:global(.slide-content h4),
:global(.slide-content h5),
:global(.slide-content h6) {
	line-height: 1.2 !important;
}

:global(.slide-content p),
:global(.slide-content li) {
	line-height: 1.5 !important;
}
```

Using relative values (1.2, 1.5) instead of `rem` units ensures the line-height scales proportionally with the font-size.

## Files Modified

- `src/lib/slides/core/Slide.svelte` - Added line-height override rules and changed fragment hiding from `visibility: hidden` to `opacity: 0` + `pointer-events: none`

## Key Insight

The issue was NOT with fragment visibility/opacity handling as initially suspected. The real problem was a CSS specificity conflict where global `line-height` rules in `app.css` were overriding the expected text sizing in slides.

## To Reproduce (Historical)

1. `pnpm dev -- --port 5175`
2. Go to `http://localhost:5175/slides/demo`
3. Press Space to reveal the fragment on first slide
4. Before fix: "Construit avec Svelte 5 + UbuMark" overlapped "Systeme de presentation pour UbuMaths"
5. After fix: Text stacks properly without overlap
