/** Shared look for the confirmation card and links on the password pages. */
export const AUTH_PAGE_STYLES = `
  form {
    display: grid;
    gap: 14px;
  }

  .intro {
    margin: 0 0 4px;
    font-size: 13.5px;
    line-height: 1.6;
    color: var(--ef-text-muted);
  }

  .alt {
    text-align: center;
    margin-top: 18px;
    font-size: 13px;
    color: var(--ef-text-subtle);
  }

  .alt a {
    font-weight: 700;
  }

  .done {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
    padding: 28px 20px;
    border-radius: var(--ef-radius-lg);
    background: var(--ef-surface);
    border: 1px solid var(--ef-border);
    animation: ef-pop-in 0.3s var(--ef-ease-spring) both;
  }

  .done__icon {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--ef-tint-green);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .done__title {
    font-family: var(--ef-font-display);
    font-size: 17px;
    font-weight: 800;
    color: var(--ef-text);
  }

  .done__text {
    font-size: 13.5px;
    line-height: 1.65;
    color: var(--ef-text-muted);
  }

  .done__link {
    font-size: 13px;
    font-weight: 700;
    margin-top: 4px;
  }
`;
