# ZSO Gantrisch – Style Guide

> _Version: 2025-12-19_

This document complements `src/theme/TOKENS_README.md` and serves as a single entry-point for designers & developers to understand how to build new UI that matches the current redesign.

---

## 1. Design Principles

- **Mobile-first.** Layouts are authored for <= 768 px first, then progressively enhanced.
- **Glassmorphism.** Cards and overlays use a subtle blurred, translucent background (`--glass-*` tokens) and smooth elevation.
- **Token-driven.** Never hard-code colours or spacing. Extend `src/theme/tokens.css` instead.
- **Dark-by-default.** Light mode is intentionally disabled – dark theme is forced for consistency.

---

## 2. Design Tokens Quick-Reference

| Purpose               | Example token            |
| --------------------- | ------------------------ |
| Brand colour (orange) | `--cp-orange`            |
| Glass card background | `--glass-bg`             |
| Badge success border  | `--badge-border-success` |
| Danger alpha 30 %     | `--danger-30`            |
| Avatar ring colour    | `--avatar-ring`          |

For the full list & how to add new tokens see [`src/theme/TOKENS_README.md`](../src/theme/TOKENS_README.md).

---

## 3. Shared UI Patterns

### 3.1 Glass Card

```html
<header class="glass-card p-6">…content…</header>
```

Behaviour:

- `backdrop-blur-xl`, `backdrop-saturate-150` via Tailwind layer.
- Shadow, border & background derive from `--glass-*` tokens.
- Hover on **interactive** cards can raise elevation or alter border-colour.

### 3.2 Avatar Upload

Re-usable pattern (see `user-detail` & `adsz-detail`):

```html
<div class="relative group">
  <img …class="avatar …" />
  <div class="absolute inset-0 … group-hover:opacity-100" (click)="fileInput.click()">
    <span class="material-symbols-outlined">photo_camera</span>
  </div>
  <input #fileInput type="file" accept="image/*" (change)="onFile($event, id)" hidden />
</div>
```

Guidelines:

- Max file size 2 MB (enforced in component TS).
- Hover overlay uses `bg-black/60` + icon.
- On mobile (no hover) the overlay is triggered on tap.

### 3.3 Badges & Pills

Badges use the `badge` base class plus a modifier, e.g. `badge--active`. Colours reference `--badge-*` tokens.

Pills (`.pill`) are used for nav filters with a sweep underline animation.

### 3.4 Utility Classes

| Class             | Purpose                                |
| ----------------- | -------------------------------------- |
| `.scrollbar`      | Thin custom scrollbar (see global css) |
| `.glow-green`     | Success glow                           |
| `.sparkle`        | Occasional celebratory sparkle         |
| `.animate-pop-in` | Small scale-in animation               |

---

## 4. Layout Patterns

- **Main grids**: Two-column on `md:` (`md:grid md:grid-cols-2 gap-6`).
- **Shell & overlays**: `--shell-overlay-*` tokens control backdrop darkness.
- **Quick-links**: Responsive auto-fit grid with min 96 px column.

---

## 5. Adding New Components

1. **Extend tokens first** if a new colour/shadow is needed.
2. **Place shared styles** in `src/styles.css` inside the appropriate `@layer` block.
3. **Prefix components** with `zso` and omit `.component.ts` suffix (Angular 20 standalone convention).
4. **Write SCSS** with Tailwind utility layers where possible, fall back to custom selectors only for complex cases.

---

## 6. Accessibility

- Minimum touch target 44 × 44 px.
- Ensure contrast ≥ AA on dark background (check Figma plugin or WebAIM).
- Provide `aria-label` for icon-only buttons.

---

## 7. Resources

- **Figma file**: _TBD_ (ask design team)
- **Auth & Routing flow**: [`docs/auth-flow.md`](auth-flow.md)

---

_Last updated 2025-07-10._
