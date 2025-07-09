# Design Tokens Reference

This document lists all global CSS custom properties (design tokens) defined in `src/theme/tokens.css` and gives guidance on how to use them in components, templates and Tailwind CSS utility overrides.

---

## Brand Colours
| Token | Default |
|-------|---------|
| `--cp-orange` | `#FF7900` |
| `--cp-blue` | `#005EB8` |

Use these for highlights like primary actions or links (orange) and accents (blue).

```css
color: var(--cp-orange);
```

---

## Glassmorphism
| Token | Purpose |
|-------|---------|
| `--glass-bg` | Semi-transparent white background for glass cards |
| `--glass-border` | Light border for glass surfaces |
| `--glass-radius` | Border-radius shared by glass–style elements |
| `--elevation-glass` | Box-shadow for elevated glass cards |

Example (already wrapped in `.glass-card` utility):
```css
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  box-shadow: var(--elevation-glass);
}
```

---

## Glass Buttons
| Token | Purpose |
|-------|---------|
| `--glass-btn-bg` | Idle background |
| `--glass-btn-border` | Border colour |
| `--glass-btn-text` | Text/icon colour |

---

## Inputs
| Token | Purpose |
|-------|---------|
| `--input-bg` | Idle background |
| `--input-bg-focus` | Focus background |
| `--input-ring` | Focus ring colour |
| `--input-border` | Border colour |
| `--input-error` | Validation/error colour |

---

## Avatars
| Token | Purpose |
|-------|---------|
| `--avatar-bg` | Avatar placeholder background |
| `--avatar-ring` | Ring/border colour |

---

## Badges
Badges share three variants per semantic (success, warning, danger, info, neutral):
`--badge-bg-*`, `--badge-text-*`, `--badge-border-*`.

Example:
```css
.badge--approved {
  background: var(--badge-bg-success);
  color: var(--badge-text-success);
  border-color: var(--badge-border-success);
}
```

---

## Pills / Navigation Tabs
| Token | Purpose |
|-------|---------|
| `--pill-text` | Idle text colour |
| `--pill-text-hover` | Text on hover |
| `--pill-text-active` | Active state text |
| `--pill-bg-active` | Active pill background |
| `--pill-shadow-active` | Box-shadow when active |
| `--pill-underline-bg` | Animated underline / accent |

---

## Borders & Shell
| Token | Purpose |
|-------|---------|
| `--border-dark` | Dark outline/border used in cards and indicators |
| `--shell-bg` | Base shell colour (behind overlays) |
| `--shell-overlay-80` | 80 % opaque overlay for auth-shell |
| `--shell-overlay-90` | 90 % opaque overlay for main / legal shells |

---

## Using Tokens in HTML (Tailwind)
When inline classes cannot express a variable colour (e.g. dynamic opacity), prefer a style attribute or utility class override:
```html
<div class="absolute inset-0" style="background: var(--shell-overlay-90)"></div>
```

Or create a utility class in `styles.css`:
```css
.bg-shell-90 {
  background: var(--shell-overlay-90);
}
```

---

## Adding New Tokens
1. Define the variable inside `:root` in `tokens.css`.
2. Reference it in component SCSS, global `styles.css`, or templates.
3. Avoid hard-coding colours elsewhere.

Feel free to expand this document as new tokens are added.
