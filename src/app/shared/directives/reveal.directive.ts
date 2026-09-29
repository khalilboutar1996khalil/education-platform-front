import { AfterViewInit, Directive, ElementRef, OnDestroy, inject, signal } from '@angular/core';

@Directive({
  selector: '[appReveal]',
  standalone: true,
  host: {
    class: 'ef-reveal',
    // A signal, not a plain field: the host element sits inside an OnPush component, and the
    // IntersectionObserver fires outside any template event. A plain field would never be picked
    // up and the section would stay at opacity 0 forever.
    '[class.is-visible]': 'visible()',
  },
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);

  protected readonly visible = signal(false);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    const node = this.el.nativeElement as HTMLElement;

    // Anything already on screen at load must not wait for a scroll that may never come.
    if (this.isOnScreen(node)) {
      this.visible.set(true);
      return;
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.visible.set(true);
          this.observer?.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private isOnScreen(node: HTMLElement): boolean {
    const rect = node.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }
}
