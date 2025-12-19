# ZSO Gantrisch – Project Overview

> A condensed knowledge base (≈ 2-3 min read) suitable for onboarding new devs **or** feeding into an LLM like _Claude.ai_.

---

## 1. Tech Stack

| Layer           | Choices                                                |
| --------------- | ------------------------------------------------------ |
| **Frontend**    | Angular 20 (standalone components), Tailwind CSS       |
| **Backend**     | Firebase (Firestore + Auth + Storage)                  |
| **Hosting**     | Static hosting (FTP/any web server) + Firebase backend |
| **Design**      | Glassmorphism + dark-first theme, driven by CSS tokens |
| **State mgmt.** | RxJS (signals/observables)                             |

---

## 2. Repo Structure (key paths)

```
src/
  app/
    core/            ► models, services, guards, interceptors
      auth/          ► login / register / verify-email pages + guards
    features/
      dashboard/     ► redesigned mobile-first dashboard
      adsz/          ► overview + detail of AdZS (civil protection members)
      admin/         ► admin area (incl. user management)
      places/        ► places overview + detail + notes
    shared/          ► reusable components (cards, modals, chips…)
  theme/
    tokens.css       ► design tokens (colors, spacing…)
    TOKENS_README.md ► detailed token guide
styles.css           ► Tailwind layers + utility classes
```

---

## 3. Routing & Guard Flow (high level)

```
/(datenschutz|impressum|changelog) → LegalShell (public)
/auth/*                       → AuthShell  (public)
/dashboard, /adsz, /places…   → MainShell  (protected)

canActivate chain (protected routes):
  SessionGuard → UserDocGuard → VerifiedGuard → ApprovedGuard
  + optional per-route guards (e.g. RoleGuard, FeatureFlagGuard)
```

- `AuthRedirectGuard` handles post-login redirect logic.
- `AuthInterceptor` attaches JWT to API calls & refreshes on 401/403.

Detailed sequence diagrams live in [`docs/auth-flow.md`](auth-flow.md).

---

## 4. Design Tokens Philosophy

- **Single source:** `theme/tokens.css`, no hard-coded hex/RGB in components.
- **Naming:** semantic (`--badge-bg-danger`) or functional families (`--danger-10`).
- **Layers:** `@layer base | components | utilities` in `styles.css`.

For quick reference see `docs/style-guide.md`.

---

## 5. Shared UI Patterns

- `glass-card` – blurred, translucent container with tokenized background.
- `avatar` – gradient bg + ring, hover upload overlay.
- `badge`, `pill` – status and filter chips.
- `.scrollbar` utility – consistent dark thin scrollbars.

Examples in `docs/component-cookbook.md`.

---

## 6. Mobile-First Grid Conventions

- Detail pages: `.main-grid md:grid-cols-2 gap-6`.
- Quick-links: `auto-fit` grid with `minmax(96px,1fr)`.
- Sidebar cards max-width constrained (`max-w-3xl`).

---

## 7. Feature Roadmap

1. **AdZS Deletion & Cascade Unlink**
2. Legal pages → shared UI refactor
3. I18n groundwork (de-CH ⇢ en)

---

_Last updated 2025-12-19_
