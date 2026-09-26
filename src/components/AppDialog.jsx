import React, { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import './AppDialog.css';

/**
 * The one dialog shell for the app (stage 4 of `ui-modernization-calm-canvas`,
 * ADR-012 / design.md §3 D7). It owns the three things that are genuinely hard
 * to hand-roll: the focus trap, Escape dismissal, and returning focus to the
 * control that opened it.
 *
 * Control returns to the invoker through `onCloseAutoFocus` rather than through
 * a `Dialog.Trigger`, because several call sites open a dialog from a row
 * action that is re-rendered (or unmounted) by the very mutation the dialog
 * guards — Radix's own trigger ref would be stale by then.
 */
export function AppDialog({
  open,
  onClose,
  title,
  description,
  hideTitle = false,
  ariaLabel,
  className = 'app-dialog',
  overlayClassName = 'app-dialog-overlay',
  children,
}) {
  const invokerRef = useRef(null);

  useEffect(() => {
    if (open && typeof document !== 'undefined') {
      const active = document.activeElement;
      invokerRef.current = active && active !== document.body ? active : null;
    }
  }, [open]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClassName}>
          <Dialog.Content
            className={className}
            aria-label={title ? undefined : ariaLabel}
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const invoker = invokerRef.current;
              invokerRef.current = null;
              if (
                invoker &&
                typeof invoker.focus === 'function' &&
                typeof document !== 'undefined' &&
                document.contains(invoker)
              ) {
                invoker.focus();
              }
            }}
          >
            {title ? (
              <Dialog.Title className={hideTitle ? 'app-dialog-title app-dialog-title--sr' : 'app-dialog-title'}>
                {title}
              </Dialog.Title>
            ) : null}
            {description ? (
              <Dialog.Description className="app-dialog-description">{description}</Dialog.Description>
            ) : null}
            {children}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * An in-app replacement for the browser's native confirm dialog. Escape (and
 * the overlay) close it without invoking `onConfirm`, so no write is ever
 * issued by dismissal.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
}) {
  return (
    <AppDialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      className="app-dialog app-dialog--confirm"
    >
      <div className="app-dialog-actions">
        {cancelLabel ? (
          <button type="button" className="app-dialog-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
        ) : null}
        <button
          type="button"
          className={`app-dialog-btn app-dialog-btn--primary${tone === 'danger' ? ' app-dialog-btn--danger' : ''}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </AppDialog>
  );
}

/**
 * An in-app replacement for the browser's native prompt. The form is its own
 * component so that it is mounted fresh each time the dialog opens — that is
 * what seeds the input, instead of a setState-in-effect.
 */
function PromptForm({ label, placeholder, initialValue, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  const [value, setValue] = useState(initialValue);

  const submit = (event) => {
    event.preventDefault();
    onConfirm(value);
  };

  return (
    <form className="app-dialog-form" onSubmit={submit}>
      <label className="app-dialog-label" htmlFor="app-dialog-prompt-input">
        {label}
      </label>
      <input
        id="app-dialog-prompt-input"
        className="app-dialog-input"
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        autoFocus
      />
      <div className="app-dialog-actions">
        <button type="button" className="app-dialog-btn" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="submit" className="app-dialog-btn app-dialog-btn--primary">
          {confirmLabel}
        </button>
      </div>
    </form>
  );
}

export function PromptDialog({
  open,
  title,
  label,
  placeholder = '',
  initialValue = '',
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  return (
    <AppDialog open={open} onClose={onCancel} title={title} className="app-dialog app-dialog--prompt">
      <PromptForm
        label={label}
        placeholder={placeholder}
        initialValue={initialValue}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </AppDialog>
  );
}

export default AppDialog;
