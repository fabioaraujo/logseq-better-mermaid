export const styles = String.raw`
/* Logseq places renderer UI inside an inline, shrink-to-fit slot. Expand only
   the slot containing Better Mermaid so the diagram can use the block width. */
span.inline:has(> .lsp-hook-ui-slot .better-mermaid),
.lsp-hook-ui-slot:has(.better-mermaid),
.lsp-hook-ui-slot:has(.better-mermaid) > div {
  display: block !important;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  font-size: 0;
  line-height: 0;
}

.better-mermaid {
  position: relative;
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  margin: 0 0 0.5rem;
  color: var(--ls-primary-text-color, #1f2937);
  font-size: 1rem;
  line-height: 1.5;
}

.better-mermaid__frame {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 8px;
  background: color-mix(in srgb, var(--ls-primary-background-color, white) 96%, transparent);
  /* Prevent Logseq's large inherited line-height from turning template
     whitespace between block children into tall anonymous line boxes. */
  font-size: 0;
  line-height: 0;
}

.better-mermaid:hover .better-mermaid__frame,
.better-mermaid:focus-within .better-mermaid__frame {
  border-color: var(--ls-border-color, rgba(127, 127, 127, 0.28));
}

.better-mermaid__canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: max-content;
  transform-origin: 0 0;
  will-change: transform;
}

.better-mermaid__image {
  display: block;
  max-width: none;
  user-select: none;
  pointer-events: none;
}

.better-mermaid__viewport {
  position: relative;
  width: 100%;
  min-width: 0;
  height: 120px;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
  overscroll-behavior: contain;
  background-image: radial-gradient(
    circle,
    color-mix(in srgb, var(--ls-secondary-text-color, #6b7280) 16%, transparent) 0.7px,
    transparent 0.8px
  );
  background-size: 18px 18px;
}

.better-mermaid__viewport.is-dragging {
  cursor: grabbing;
}

.better-mermaid__toolbar {
  position: absolute;
  z-index: 2;
  top: 0.4rem;
  right: 0.4rem;
  display: flex;
  width: max-content;
  margin: 0;
  justify-content: flex-end;
  gap: 0.2rem;
  padding: 0.25rem;
  border: 1px solid var(--ls-border-color, rgba(127, 127, 127, 0.25));
  border-radius: 8px;
  background: color-mix(in srgb, var(--ls-primary-background-color, white) 92%, transparent);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  backdrop-filter: blur(8px);
}

.better-mermaid__button {
  border: 1px solid var(--ls-border-color, rgba(127, 127, 127, 0.35));
  border-radius: 5px;
  padding: 0.15rem 0.42rem;
  color: var(--ls-primary-text-color, #1f2937);
  background: var(--ls-primary-background-color, white);
  font-size: 12px;
  line-height: 1.5;
  cursor: pointer;
}

.better-mermaid__button:hover {
  background: var(--ls-secondary-background-color, #f3f4f6);
}

.better-mermaid__scale {
  min-width: 3.2rem;
  padding: 0.15rem 0.25rem;
  color: var(--ls-secondary-text-color, #6b7280);
  font-size: 11px;
  line-height: 1.7;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.better-mermaid__separator {
  width: 1px;
  margin: 0.18rem 0.15rem;
  background: var(--ls-border-color, rgba(127, 127, 127, 0.28));
}

.better-mermaid__state {
  padding: 0.8rem 1rem;
  border: 1px dashed var(--ls-border-color, rgba(127, 127, 127, 0.35));
  border-radius: 7px;
  color: var(--ls-secondary-text-color, #6b7280);
  font-size: 0.9em;
}

.better-mermaid__error {
  border-style: solid;
  border-color: #dc262666;
  color: var(--ls-error-text-color, #b91c1c);
  white-space: pre-wrap;
}

.better-mermaid__error strong {
  display: block;
  margin-bottom: 0.35rem;
}
`
