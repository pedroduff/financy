import * as Dialog from '@radix-ui/react-dialog';
import { type ReactNode, useRef } from 'react';
import { assets } from '../../lib/assets';
import { Button } from './button';
import { AssetIcon } from './icon';

export function Modal({
  title,
  description,
  onClose,
  busy = false,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  const content = useRef<HTMLDivElement>(null);
  const previousFocus = useRef(document.activeElement);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          ref={content}
          className="dialog-content"
          onOpenAutoFocus={(event) => {
            const firstInput = content.current?.querySelector<HTMLInputElement>(
              'input:not(:disabled)',
            );
            if (firstInput) {
              event.preventDefault();
              firstInput.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            if (
              previousFocus.current instanceof HTMLElement &&
              previousFocus.current.isConnected
            ) {
              event.preventDefault();
              previousFocus.current.focus();
            }
          }}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <div className="dialog-header">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={busy}
                aria-label="Fechar"
              >
                <AssetIcon src={assets.transactionDialog.x} />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
