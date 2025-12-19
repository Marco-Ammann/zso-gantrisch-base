# ZSO Gantrisch – Component Cookbook

Schnelle Copy-&-Paste-Vorlagen für die wichtigsten wiederverwendbaren UI-Bausteine. Alle Beispiele sind Standalone-Komponenten (Angular 20) und nutzen die vereinheitlichten Tokens / Utility-Klassen.

> **Hinweis**: Tailwind-Klassen sind bewusst belassen, um visuelles Verhalten ersichtlich zu machen. Passe Props / `@Input()`s nach Bedarf an.

---

## 1 · Glass Card

```html
<section class="glass-card p-6 space-y-4">
  <h2 class="text-xl font-semibold">Titel</h2>
  <p>Beliebiger Inhalt…</p>
</section>
```

Tipps

- Verwende `hover:`-States nur, wenn die Card interaktiv ist (`cursor-pointer` etc.).
- Kleinere Cards: `p-4` und Schriftgrößen entsprechend anpassen.

---

## 2 · Avatar Upload

```html
<div class="relative group">
  <img [src]="photoUrl" class="avatar w-24 h-24 rounded-full object-cover" *ngIf="photoUrl; else placeholder" />
  <ng-template #placeholder>
    <div class="avatar w-24 h-24 rounded-full flex items-center justify-center">
      <span class="text-2xl">{{ initials }}</span>
    </div>
  </ng-template>

  <div class="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" (click)="fileEl.click()">
    <span class="material-symbols-outlined text-white text-2xl">photo_camera</span>
  </div>
  <input #fileEl type="file" accept="image/*" hidden (change)="onFile($event)" />
</div>
```

> Siehe `user-detail` & `adsz-detail` Pages für TS Logik.

---

## 3 · Badge

```html
<span class="badge badge--approved">Aktiv</span>
```

Modifiers: `--approved`, `--pending`, `--blocked`, `--info`, `--neutral` (Farben via Tokens).

---

## 4 · Pill Navigation

```html
<button class="pill" [class.pill-active]="active" (click)="select('alle')">Alle</button>
```

Animation der Unterstreichung erfolgt automatisch via CSS Keyframes (`underline-sweep`).

---

## 5 · Quick-Links Grid

```html
<div class="grid gap-4 auto-rows-fr" style="grid-template-columns:repeat(auto-fit,minmax(96px,1fr))">
  <button class="glass-card p-4 flex flex-col items-center gap-2">
    <span class="material-symbols-outlined text-3xl">map</span>
    <span class="text-xs">Karten</span>
  </button>
  <!-- …weitere Links -->
</div>
```

---

## 6 · Modal (CDK Overlay)

Siehe `zso-adzs-create-modal` für komplette Implementierung. Essenzielle Styles:

```css
.dialog-backdrop {
  @apply bg-black/50 backdrop-blur;
}
.dialog-content {
  @apply glass-card p-6 w-[90vw] max-w-lg;
}
```

---

_Last updated 2025-12-19_
