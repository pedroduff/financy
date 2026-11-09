import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  clearSession,
  queryClient,
  useCurrentUser,
  useFeedback,
} from '../../app/providers';
import { Avatar } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';
import { AssetIcon } from '../../components/ui/icon';
import { ErrorMessage } from '../../components/ui/states';
import { assets } from '../../lib/assets';
import { graphql } from '../../lib/graphql';
import type { User } from '../../lib/models';
import { newPasswordSchema } from '../auth/authPages';
import { AvatarEditor } from './avatarEditor';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe sua senha atual.'),
    newPassword: newPasswordSchema,
    confirmation: z.string(),
  })
  .refine((input) => input.newPassword === input.confirmation, {
    path: ['confirmation'],
    message: 'As senhas devem ser iguais.',
  });

export function ProfilePage() {
  const { data: user } = useCurrentUser();
  const notify = useFeedback();
  const navigate = useNavigate();
  const nameForm = useForm({
    resolver: zodResolver(
      z.object({
        name: z.string().trim().min(1, 'Informe seu nome.').max(100),
      }),
    ),
    values: { name: user?.name ?? '' },
    resetOptions: { keepDirtyValues: true },
  });
  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmation: '' },
  });
  const update = useMutation({
    mutationFn: (input: { name: string }) =>
      graphql<{ updateProfile: User }>(
        'mutation($name:String!){updateProfile(name:$name){id name email avatarUrl avatarVersion}}',
        input,
      ),
    onSuccess: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['me'] });
      queryClient.setQueryData<User | null>(['me'], (current) =>
        current?.id === data.updateProfile.id
          ? { ...current, name: data.updateProfile.name }
          : current,
      );
      nameForm.reset({ name: data.updateProfile.name });
      notify('Seu nome foi atualizado.');
    },
  });
  const logout = useMutation({
    mutationFn: () => graphql('mutation{signOut}'),
    onSuccess: async () => {
      await clearSession();
      navigate('/');
    },
  });
  const change = useMutation({
    mutationFn: (input: z.infer<typeof passwordSchema>) =>
      graphql(
        'mutation($currentPassword:String!,$newPassword:String!){changePassword(currentPassword:$currentPassword,newPassword:$newPassword)}',
        {
          currentPassword: input.currentPassword,
          newPassword: input.newPassword,
        },
      ),
    onSuccess: async () => {
      await clearSession();
      navigate('/');
      notify('Senha alterada. Faça login com a nova senha.');
    },
  });
  if (!user) return null;
  return (
    <main className="profile-layout">
      <section className="profile-card">
        <header className="profile-header">
          <Avatar key={user.id} user={user} large />
          <div>
            <h1>{user.name}</h1>
            <p>{user.email}</p>
          </div>
        </header>
        <AvatarEditor key={user.id} user={user} />
        <hr />
        <form
          className="form-stack"
          onSubmit={nameForm.handleSubmit((values) => update.mutate(values))}
          noValidate
        >
          <Field
            label="Nome completo"
            autoComplete="name"
            icon={assets.profile['user-round']}
            {...nameForm.register('name')}
            error={nameForm.formState.errors.name?.message}
          />
          <Field
            label="E-mail"
            type="email"
            value={user.email}
            readOnly
            disabled
            hint="O e-mail não pode ser alterado"
            icon={assets.profile.mail}
          />
          <ErrorMessage error={update.error} />
          <Button
            type="submit"
            disabled={update.isPending}
            className="full-width"
          >
            {update.isPending ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </form>
        <details className="password-section">
          <summary>Alterar senha</summary>
          <form
            className="form-stack"
            onSubmit={passwordForm.handleSubmit((values) =>
              change.mutate(values),
            )}
            noValidate
          >
            <Field
              label="Senha atual"
              type="password"
              autoComplete="current-password"
              {...passwordForm.register('currentPassword')}
              error={passwordForm.formState.errors.currentPassword?.message}
            />
            <Field
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              hint="Use de 15 a 128 caracteres."
              {...passwordForm.register('newPassword')}
              error={passwordForm.formState.errors.newPassword?.message}
            />
            <Field
              label="Confirmar nova senha"
              type="password"
              autoComplete="new-password"
              {...passwordForm.register('confirmation')}
              error={passwordForm.formState.errors.confirmation?.message}
            />
            <ErrorMessage error={change.error} />
            <Button type="submit" disabled={change.isPending}>
              {change.isPending ? 'Alterando…' : 'Salvar nova senha'}
            </Button>
          </form>
        </details>
        <ErrorMessage error={logout.error} />
        <Button
          variant="outline"
          className="full-width"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          <AssetIcon src={assets.profile['log-out']} />
          {logout.isPending ? 'Saindo…' : 'Sair da conta'}
        </Button>
      </section>
    </main>
  );
}
