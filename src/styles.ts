export const styles = String.raw`
.better-mermaid {
  position: relative;
  margin: 0.5rem 0;
  color: var(--ls-primary-text-color, #1f2937);
}

.better-mermaid__frame {
  position: relative;
  overflow: auto;
  max-width: 100%;
  border: 1px solid transparent;
  border-radius: 8px;
  background: color-mix(in srgb, var(--ls-primary-background-color, white) 96%, transparent);
}

.better-mermaid:hover .better-mermaid__frame,
.better-mermaid:focus-within .better-mermaid__frame {
  border-color: var(--ls-border-color, rgba(127, 127, 127, 0.28));
}

.better-mermaid__canvas {
  display: grid;
  place-items: center;
  min-width: min-content;
  padding: 0.75rem;
  transform-origin: top left;
}

.better-mermaid__canvas > svg,
.better-mermaid__canvas > img {
  display: block;
  max-width: 100%;
  height: auto;
}

.better-mermaid__toolbar {
  position: sticky;
  z-index: 2;
  top: 0.35rem;
  left: 100%;
  display: flex;
  width: max-content;
  justify-content: flex-end;
  gap: 0.2rem;
  padding: 0.25rem;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
}

.better-mermaid:hover .better-mermaid__toolbar,
.better-mermaid:focus-within .better-mermaid__toolbar {
  opacity: 1;
  pointer-events: auto;
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
