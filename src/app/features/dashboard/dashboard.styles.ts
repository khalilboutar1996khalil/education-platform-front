/** Shared by the admin and the student dashboards, so both read as one product. */
export const DASHBOARD_STYLES = `
    :host {
      display: block;
    }

    .page {
      animation: ef-fade-up 0.4s ease backwards;
    }

    .state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 60px 0;
      color: var(--ef-text-muted);
    }

    .ghost {
      padding: 9px 14px;
      border-radius: 10px;
      border: 1px solid var(--ef-border);
      background: var(--ef-surface);
      color: var(--ef-ink-green);
      font-weight: 700;
      font-size: 13px;
    }

    /* Hero */
    .hero {
      position: relative;
      overflow: hidden;
      border-radius: 18px;
      padding: 20px 22px;
      margin-bottom: 14px;
      background: linear-gradient(120deg, #14532d 0%, #16a34a 58%, #4ade80 130%);
    }

    .hero__blob {
      position: absolute;
      top: -70px;
      right: 30px;
      width: 190px;
      height: 190px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.07);
      animation: ef-floaty 10s ease-in-out infinite;
    }

    @keyframes ef-floaty {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-9px); }
    }

    .hero__body {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .hero__date {
      font-size: 11px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.72);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 5px;
    }

    .hero__title {
      font-family: var(--ef-font-display);
      font-size: clamp(18px, 2vw, 23px);
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.5px;
      margin-bottom: 5px;
    }

    .hero__sub {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.85);
    }

    .hero__actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .hero__btn {
      padding: 9px 15px;
      border-radius: 10px;
      font-size: 12.5px;
      font-weight: 700;
      color: #fff;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.3);
      transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
    }

    .hero__btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.3);
    }

    .hero__btn--solid {
      background: #fff;
      color: var(--ef-brand-700);
      border-color: #fff;
    }

    .hero__btn--solid:hover {
      background: #fff;
      color: var(--ef-brand-700);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
    }

    /* Tones */
    .tone-green { color: var(--ef-ink-green); background: var(--ef-tint-green); }
    .tone-teal { color: var(--ef-ink-teal); background: var(--ef-tint-teal); }
    .tone-lime { color: var(--ef-ink-lime); background: var(--ef-tint-lime); }
    .tone-emerald { color: var(--ef-ink-emerald); background: var(--ef-tint-emerald); }
    .tone-amber { color: var(--ef-ink-amber); background: var(--ef-tint-amber); }
    .tone-red { color: var(--ef-ink-red); background: var(--ef-tint-red); }

    .av-green { background: #15803d; }
    .av-teal { background: #0f766e; }
    .av-lime { background: #4d7c0f; }
    .av-emerald { background: #047857; }

    /* Stats */
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr));
      gap: 12px;
      margin-bottom: 14px;
    }

    .stat {
      display: flex;
      flex-direction: column;
      gap: 9px;
      padding: 15px;
      border-radius: 15px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      transition: transform 0.25s var(--ef-ease-spring), box-shadow 0.25s, border-color 0.25s;
    }

    .stat:hover {
      transform: translateY(-4px);
      box-shadow: var(--ef-shadow-md);
      border-color: var(--ef-brand-500);
    }

    .stat__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .stat__icon {
      width: 36px;
      height: 36px;
      border-radius: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat__value {
      font-family: var(--ef-font-display);
      font-size: 23px;
      font-weight: 800;
      line-height: 1;
      color: var(--ef-text);
    }

    .stat__label {
      font-size: 12px;
      font-weight: 700;
      color: var(--ef-text);
    }

    .stat__trend {
      font-size: 11px;
      font-weight: 700;
      margin-top: 2px;
      color: var(--ef-ink-green);
    }

    .stat__trend--warn {
      color: var(--ef-ink-amber);
    }

    /* Cards */
    .row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(290px, 100%), 1fr));
      gap: 13px;
      margin-bottom: 13px;
    }

    .stack {
      display: grid;
      gap: 13px;
      align-content: start;
      min-width: 0;
    }

    .card {
      min-width: 0;
      padding: 18px;
      border-radius: 16px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      animation: ef-fade-up 0.5s ease backwards;
    }

    .card__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }

    .card__title {
      font-family: var(--ef-font-display);
      font-size: 14px;
      font-weight: 700;
      color: var(--ef-text);
    }

    .card__title--gap {
      margin-bottom: 14px;
    }

    .pill {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 7px;
      color: var(--ef-ink-green);
      background: var(--ef-tint-green);
    }

    .list {
      display: grid;
      gap: 9px;
    }

    .list--loose {
      gap: 12px;
    }

    .empty {
      font-size: 12.5px;
      color: var(--ef-text-muted);
    }

    /* Bars */
    .bars {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      height: 124px;
    }

    .bars__col {
      flex: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
    }

    .bars__val,
    .bars__day {
      font-size: 10px;
      font-weight: 700;
      color: var(--ef-text-muted);
      text-transform: capitalize;
    }

    .bars__bar {
      width: 100%;
      min-height: 3px;
      border-radius: 6px 6px 3px 3px;
      background: #c7ebd4;
      transition: height 0.9s var(--ef-ease-out);
    }

    .bars__bar--peak {
      background: linear-gradient(180deg, #22c55e, #15803d);
    }

    /* Alerts */
    .alert {
      display: block;
      padding: 11px 13px;
      border-radius: 11px;
      animation: ef-slide-right 0.4s ease both;
    }

    .alert__text {
      font-size: 12.5px;
      font-weight: 700;
      margin-bottom: 2px;
    }

    .alert__meta {
      font-size: 11px;
      font-weight: 600;
      color: var(--ef-text-muted);
    }

    @keyframes ef-slide-right {
      from { opacity: 0; transform: translateX(-12px); }
      to { opacity: 1; transform: translateX(0); }
    }

    /* Module progress */
    .mod__head {
      margin-bottom: 5px;
    }

    .mod__name {
      display: block;
      font-size: 12.5px;
      font-weight: 700;
      color: var(--ef-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .track {
      height: 7px;
      border-radius: 5px;
      overflow: hidden;
      background: var(--ef-surface-2);
    }

    .track__fill {
      height: 100%;
      border-radius: 5px;
      transition: width 1s var(--ef-ease-out);
    }

    .mod__foot {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
      font-size: 10.5px;
      font-weight: 600;
      color: var(--ef-text-muted);
    }

    .mod__pct {
      font-weight: 700;
    }

    /* Agenda */
    .agenda {
      display: flex;
      align-items: center;
      gap: 11px;
    }

    .agenda__date {
      width: 56px;
      flex-shrink: 0;
      padding: 6px 4px;
      border-radius: 10px;
      text-align: center;
    }

    .agenda__day {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .agenda__time {
      font-size: 12px;
      font-weight: 800;
      line-height: 1.2;
    }

    .agenda__main,
    .act__main {
      flex: 1;
      min-width: 0;
    }

    .agenda__title,
    .act__text {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--ef-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .act__text {
      font-weight: 600;
    }

    .agenda__meta,
    .act__time {
      font-size: 11px;
      font-weight: 600;
      color: var(--ef-text-muted);
    }

    /* Activity */
    .act {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .act__av {
      width: 29px;
      height: 29px;
      flex-shrink: 0;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
      color: #fff;
    }

    .act__tag {
      flex-shrink: 0;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      white-space: nowrap;
    }
`;
