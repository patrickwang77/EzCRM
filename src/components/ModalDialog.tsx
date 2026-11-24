import React, { useEffect, useRef } from 'react';

export interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  ariaLabelledBy?: string;
  ariaLabel?: string;
  /** 'center' for standard modals, 'right' for slide-over drawers */
  placement?: 'center' | 'right';
  /** Enable click-outside light dismiss (uses native closedby="any" + Safari pointer rect fallback) */
  lightDismiss?: boolean;
  /** Additional classes applied to the <dialog> shell */
  className?: string;
  children: React.ReactNode;
}

/**
 * Native HTML <dialog> wrapper opened via .showModal().
 * Provides browser-native top-layer, inert background, focus containment, Esc dismissal,
 * focus restoration to invoker, and overscroll containment (in index.css).
 */
export const ModalDialog: React.FC<ModalDialogProps> = ({
  open,
  onClose,
  ariaLabelledBy,
  ariaLabel,
  placement = 'center',
  lightDismiss = true,
  className = '',
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Synchronize React open state with native showModal() / close()
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Listen for native close (Esc, form[method=dialog], closedby="any") and reset returnValue
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onCloseRef.current();
    };
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, []);

  // Fallback light-dismiss for browsers without <dialog closedby="any"> (e.g. Safari)
  useEffect(() => {
    if (!lightDismiss) return;
    if (typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype) {
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog) return;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    let pressedOutside = false;
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e) && dialog.open) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, [lightDismiss]);

  if (!open) return null;

  const basePlacementClasses =
    placement === 'right'
      ? 'm-0 ml-auto h-dvh max-h-dvh w-full bg-transparent p-0 border-0 overflow-visible'
      : 'm-auto w-[calc(100%-2rem)] bg-transparent p-0 border-0 overflow-visible';

  const dialogAttrs: Record<string, unknown> = {};
  if (lightDismiss) {
    dialogAttrs.closedby = 'any';
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={ariaLabelledBy}
      aria-label={!ariaLabelledBy ? ariaLabel : undefined}
      className={`${basePlacementClasses} ${className}`}
      {...dialogAttrs}
    >
      {children}
    </dialog>
  );
};
