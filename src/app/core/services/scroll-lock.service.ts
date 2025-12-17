import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

type LockedStyle = {
    element: HTMLElement;
    overflow: string;
    paddingRight: string;
};

@Injectable({ providedIn: 'root' })
export class ScrollLockService {
    private readonly doc = inject(DOCUMENT);

    private lockCount = 0;
    private lockedStyles: LockedStyle[] | null = null;

    lock(): void {
        this.lockCount++;
        if (this.lockCount !== 1) return;

        this.applyLock();
    }

    unlock(): void {
        if (this.lockCount === 0) return;

        this.lockCount--;
        if (this.lockCount !== 0) return;

        this.releaseLock();
    }

    private applyLock(): void {
        const targets = this.getTargets();
        const win = this.doc.defaultView;

        this.lockedStyles = targets.map((element) => ({
            element,
            overflow: element.style.overflow,
            paddingRight: element.style.paddingRight,
        }));

        for (const element of targets) {
            const scrollbarWidth = Math.max(0, element.offsetWidth - element.clientWidth);
            if (scrollbarWidth > 0 && win) {
                const computed = win.getComputedStyle(element);
                const existingPadding = Number.parseFloat(computed.paddingRight || '0') || 0;
                element.style.paddingRight = `${existingPadding + scrollbarWidth}px`;
            }

            element.style.overflow = 'hidden';
        }
    }

    private releaseLock(): void {
        if (!this.lockedStyles) return;

        for (const { element, overflow, paddingRight } of this.lockedStyles) {
            element.style.overflow = overflow;
            element.style.paddingRight = paddingRight;
        }

        this.lockedStyles = null;
    }

    private getTargets(): HTMLElement[] {
        const targets: HTMLElement[] = [];

        if (this.doc.documentElement) targets.push(this.doc.documentElement);
        if (this.doc.body) targets.push(this.doc.body);

        const marked = Array.from(
            this.doc.querySelectorAll<HTMLElement>('[data-scroll-lock-container]')
        );
        for (const element of marked) {
            if (!targets.includes(element)) targets.push(element);
        }

        const byId = this.doc.getElementById('app-scroll-container');
        if (byId && byId instanceof HTMLElement && !targets.includes(byId)) {
            targets.push(byId);
        }

        return targets;
    }
}
