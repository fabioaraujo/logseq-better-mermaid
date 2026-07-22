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
}

.better-mermaid {
  position: relative;
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  margin: 0.5rem 0;
  color: var(--ls-primary-text-color, #1f2937);
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
  position: relative;
  z-index: 2;
  display: flex;
  width: max-content;
  margin: 0.35rem 0.35rem 0.15rem auto;
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

.better-mermaid__button--primary {
  border-color: var(--ls-link-text-color, #3b82f6);
  color: white;
  background: var(--ls-link-text-color, #3b82f6);
}

.better-mermaid__button--primary:hover {
  filter: brightness(0.94);
  background: var(--ls-link-text-color, #3b82f6);
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

.better-mermaid__editor {
  position: absolute;
  z-index: 5;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-height: 260px;
  padding: 0.75rem;
  border: 1px solid var(--ls-border-color, rgba(127, 127, 127, 0.35));
  border-radius: 8px;
  background: var(--ls-primary-background-color, white);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

.better-mermaid__editor-header,
.better-mermaid__editor-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.better-mermaid__editor-header span {
  color: var(--ls-secondary-text-color, #6b7280);
  font-size: 11px;
}

.better-mermaid__editor-actions {
  justify-content: flex-end;
  margin-top: 0.55rem;
}

.better-mermaid__editor-textarea {
  flex: 1;
  min-height: 220px;
  margin-top: 0.55rem;
  padding: 0.7rem;
  resize: vertical;
  border: 1px solid var(--ls-border-color, rgba(127, 127, 127, 0.35));
  border-radius: 6px;
  outline: none;
  color: var(--ls-primary-text-color, #1f2937);
  background: var(--ls-secondary-background-color, #f7f7f7);
  font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  tab-size: 2;
}

.better-mermaid__editor-textarea:focus {
  border-color: var(--ls-link-text-color, #3b82f6);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ls-link-text-color, #3b82f6) 20%, transparent);
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
