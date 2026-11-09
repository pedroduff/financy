import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { queryClient, useFeedback } from '../../app/providers';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/dialog';
import { ErrorMessage } from '../../components/ui/states';
import { uploadAvatar } from '../../lib/avatar';
import { ApiError, graphql } from '../../lib/graphql';
import type { User } from '../../lib/models';

export function AvatarEditor({ user }: { user: User }) {
  const input = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<{
    file: File;
    version: number;
  } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const notify = useFeedback();

  useEffect(() => {
    if (!selection) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(selection.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selection]);

  async function updateCache(result: User) {
    await queryClient.cancelQueries({ queryKey: ['me'] });
    queryClient.setQueryData<User | null>(['me'], (current) => {
      if (!current || current.id !== result.id) return current;
      if (current.avatarVersion > result.avatarVersion) return current;
      return {
        ...current,
        avatarUrl: result.avatarUrl,
        avatarVersion: result.avatarVersion,
      };
    });
  }

  async function handleError(failure: Error) {
    if (failure instanceof ApiError && failure.code === 'CONFLICT') {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      const current = queryClient.getQueryData<User | null>(['me']);
      if (current?.id === user.id)
        setSelection((previous) =>
          previous ? { ...previous, version: current.avatarVersion } : null,
        );
    }
  }

  const upload = useMutation({
    mutationFn: (selected: { file: File; version: number }) =>
      uploadAvatar(selected.file, selected.version),
    onSuccess: async (result) => {
      await updateCache(result);
      setSelection(null);
      notify('Sua foto foi atualizada.');
    },
    onError: handleError,
  });
  const remove = useMutation({
    mutationFn: async (expectedVersion: number) =>
      (
        await graphql<{ removeAvatar: User }>(
          'mutation($expectedVersion:Int!){removeAvatar(expectedVersion:$expectedVersion){id name email avatarUrl avatarVersion}}',
          { expectedVersion },
        )
      ).removeAvatar,
    onSuccess: async (result) => {
      await updateCache(result);
      setConfirmRemoval(false);
      notify('Sua foto foi removida.');
    },
    onError: handleError,
  });
  const busy = upload.isPending || remove.isPending;

  function discard() {
    setSelection(null);
    setError(null);
    upload.reset();
    if (input.current) input.current.value = '';
  }

  return (
    <section
      className="avatar-editor"
      aria-label="Foto do perfil"
      aria-busy={busy}
    >
      <p className="field-hint" id="avatar-hint">
        JPEG, PNG ou WebP estáticos, até 5 MiB. A foto será recortada ao centro.
      </p>
      <input
        ref={input}
        className="sr-only"
        type="file"
        tabIndex={-1}
        aria-label="Selecionar foto do perfil"
        aria-describedby="avatar-hint"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.item(0);
          discard();
          remove.reset();
          if (!file) return;
          if (
            file.size === 0 ||
            file.size > 5 * 1024 * 1024 ||
            !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
          ) {
            setError(
              new Error('Escolha uma imagem JPEG, PNG ou WebP de até 5 MiB.'),
            );
            return;
          }
          setSelection({ file, version: user.avatarVersion });
        }}
      />
      {selection && preview ? (
        <div className="avatar-preview">
          <span className="avatar avatar-large">
            <img
              src={preview}
              alt="Prévia da nova foto"
              onError={() =>
                setError(
                  new Error(
                    'Não foi possível abrir esta imagem. Escolha outro arquivo.',
                  ),
                )
              }
            />
          </span>
          <div className="avatar-actions">
            <Button
              disabled={busy || !!error}
              onClick={() => upload.mutate(selection)}
            >
              {upload.isPending ? 'Enviando…' : 'Salvar foto'}
            </Button>
            <Button variant="outline" disabled={busy} onClick={discard}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="avatar-actions">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {user.avatarUrl ? 'Alterar foto' : 'Adicionar foto'}
          </Button>
          {user.avatarUrl && (
            <Button
              variant="link"
              size="sm"
              disabled={busy}
              onClick={() => {
                remove.reset();
                setConfirmRemoval(true);
              }}
            >
              Remover foto
            </Button>
          )}
        </div>
      )}
      <ErrorMessage error={error ?? upload.error} />
      {upload.isPending && (
        <p role="status" className="field-hint">
          Enviando sua foto…
        </p>
      )}
      {confirmRemoval && (
        <Modal
          title="Remover foto"
          description="Sua foto será removida e o avatar voltará a mostrar suas iniciais."
          busy={remove.isPending}
          onClose={() => setConfirmRemoval(false)}
        >
          <ErrorMessage error={remove.error} />
          <div className="avatar-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmRemoval(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => remove.mutate(user.avatarVersion)}
            >
              {remove.isPending ? 'Removendo…' : 'Confirmar remoção'}
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
