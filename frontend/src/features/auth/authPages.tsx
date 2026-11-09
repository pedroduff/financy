import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { z } from 'zod';
import { clearSession, queryClient, useFeedback } from '../../app/providers';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';
import { AssetIcon } from '../../components/ui/icon';
import { ErrorMessage } from '../../components/ui/states';
import { assets } from '../../lib/assets';
import { graphql } from '../../lib/graphql';
import type { User } from '../../lib/models';

const email = z.email('Informe um e-mail válido.').max(254);
export const newPasswordSchema = z
  .string()
  .refine(
    (value) => [...value].length >= 15 && [...value].length <= 128,
    'A senha deve ter entre 15 e 128 caracteres.',
  );
const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe sua senha.'),
  rememberMe: z.boolean(),
});
const signupSchema = z.object({
  name: z.string().trim().min(1, 'Informe seu nome.').max(100),
  email,
  password: newPasswordSchema,
});
const resetSchema = z
  .object({ newPassword: newPasswordSchema, confirmation: z.string() })
  .refine((input) => input.newPassword === input.confirmation, {
    message: 'As senhas devem ser iguais.',
    path: ['confirmation'],
  });

function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-layout">
      <Link to="/" aria-label="Financy — início">
        <img src={assets.login.logo} alt="Financy" />
      </Link>
      <section className="auth-card">
        <header>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </header>
        {children}
      </section>
    </main>
  );
}

export function LoginPage() {
  const notify = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });
  const login = useMutation({
    mutationFn: (input: z.infer<typeof loginSchema>) =>
      graphql<{ signIn: User }>(
        'mutation($input:SignInInput!){signIn(input:$input){id name email avatarUrl avatarVersion}}',
        { input },
      ),
    onSuccess: async (data) => {
      await queryClient.cancelQueries();
      queryClient.clear();
      queryClient.setQueryData(['me'], data.signIn);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from?.startsWith('/') && !from.startsWith('//') ? from : '/', {
        replace: true,
      });
      notify('Você entrou na sua conta.');
    },
  });
  return (
    <AuthLayout
      title="Fazer login"
      subtitle="Entre na sua conta para continuar"
    >
      <form
        className="form-stack"
        onSubmit={form.handleSubmit((values) => login.mutate(values))}
        noValidate
      >
        <div className="fields-stack">
          <Field
            label="E-mail"
            type="email"
            autoComplete="email"
            placeholder="mail@exemplo.com"
            icon={assets.login.mail}
            {...form.register('email')}
            error={form.formState.errors.email?.message}
          />
          <Field
            label="Senha"
            type="password"
            autoComplete="current-password"
            placeholder="Digite sua senha"
            icon={assets.login.lock}
            {...form.register('password')}
            error={form.formState.errors.password?.message}
          />
          <div className="login-options">
            <label className="checkbox">
              <input type="checkbox" {...form.register('rememberMe')} />
              Lembrar-me
            </label>
            <Link className="text-link" to="/forgot-password">
              Recuperar senha
            </Link>
          </div>
        </div>
        <ErrorMessage error={login.error} />
        <Button type="submit" className="full-width" disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <div className="divider">
        <span>ou</span>
      </div>
      <div className="auth-alternative">
        <p>Ainda não tem uma conta?</p>
        <Link
          className="button button-outline button-md full-width"
          to="/sign-up"
        >
          <AssetIcon src={assets.login['user-round-plus']} />
          Criar conta
        </Link>
      </div>
    </AuthLayout>
  );
}

export function SignupPage() {
  const notify = useFeedback();
  const navigate = useNavigate();
  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  const signup = useMutation({
    mutationFn: (input: z.infer<typeof signupSchema>) =>
      graphql('mutation($input:SignUpInput!){signUp(input:$input){id}}', {
        input,
      }),
    onSuccess: () => {
      notify('Conta criada. Faça login para começar.');
      navigate('/');
    },
  });
  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Comece a controlar suas finanças ainda hoje"
    >
      <form
        className="form-stack"
        onSubmit={form.handleSubmit((values) => signup.mutate(values))}
        noValidate
      >
        <div className="fields-stack">
          <Field
            label="Nome completo"
            autoComplete="name"
            placeholder="Seu nome completo"
            icon={assets.signup['user-round']}
            {...form.register('name')}
            error={form.formState.errors.name?.message}
          />
          <Field
            label="E-mail"
            type="email"
            autoComplete="email"
            placeholder="mail@exemplo.com"
            icon={assets.signup.mail}
            {...form.register('email')}
            error={form.formState.errors.email?.message}
          />
          <Field
            label="Senha"
            type="password"
            autoComplete="new-password"
            placeholder="Digite sua senha"
            hint="Use de 15 a 128 caracteres. Espaços são permitidos."
            icon={assets.signup.lock}
            {...form.register('password')}
            error={form.formState.errors.password?.message}
          />
        </div>
        <ErrorMessage error={signup.error} />
        <Button
          type="submit"
          className="full-width"
          disabled={signup.isPending}
        >
          {signup.isPending ? 'Cadastrando…' : 'Cadastrar'}
        </Button>
      </form>
      <div className="divider">
        <span>ou</span>
      </div>
      <div className="auth-alternative">
        <p>Já tem uma conta?</p>
        <Link className="button button-outline button-md full-width" to="/">
          <AssetIcon src={assets.signup['log-in']} />
          Fazer login
        </Link>
      </div>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const form = useForm({
    resolver: zodResolver(z.object({ email })),
    defaultValues: { email: '' },
  });
  const request = useMutation({
    mutationFn: (input: { email: string }) =>
      graphql(
        'mutation($email:String!){requestPasswordReset(email:$email)}',
        input,
      ),
  });
  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Enviaremos um link para você criar uma nova senha"
    >
      {request.isSuccess ? (
        <div className="form-stack">
          <p className="success-message" role="status">
            Se houver uma conta com esse e-mail, enviaremos as instruções para
            redefinir sua senha. Confira também a pasta de spam.
          </p>
          <Button variant="outline" onClick={() => request.reset()}>
            Solicitar novamente
          </Button>
        </div>
      ) : (
        <form
          className="form-stack"
          onSubmit={form.handleSubmit((values) => request.mutate(values))}
          noValidate
        >
          <Field
            label="E-mail"
            type="email"
            autoComplete="email"
            placeholder="mail@exemplo.com"
            icon={assets.login.mail}
            {...form.register('email')}
            error={form.formState.errors.email?.message}
          />
          <ErrorMessage error={request.error} />
          <Button
            type="submit"
            className="full-width"
            disabled={request.isPending}
          >
            {request.isPending ? 'Enviando…' : 'Enviar link de recuperação'}
          </Button>
        </form>
      )}
      <Link className="text-link center" to="/">
        Voltar para o login
      </Link>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [search, setSearch] = useSearchParams();
  const [token] = useState(() => search.get('token') ?? '');
  useEffect(() => {
    if (search.has('token')) setSearch({}, { replace: true });
  }, [search, setSearch]);
  const form = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: '', confirmation: '' },
  });
  const reset = useMutation({
    mutationFn: (input: z.infer<typeof resetSchema>) =>
      graphql(
        'mutation($token:String!,$newPassword:String!){resetPassword(token:$token,newPassword:$newPassword)}',
        { token, newPassword: input.newPassword },
      ),
    onSuccess: clearSession,
  });
  return (
    <AuthLayout
      title="Redefinir senha"
      subtitle="Escolha uma nova senha para sua conta"
    >
      {reset.isSuccess ? (
        <div className="form-stack">
          <p className="success-message" role="status">
            Senha redefinida. Entre novamente com sua nova senha.
          </p>
          <Link className="button button-primary button-md full-width" to="/">
            Fazer login
          </Link>
        </div>
      ) : !token ? (
        <div className="form-stack">
          <p className="error-message" role="alert">
            O link de recuperação está incompleto. Solicite um novo link.
          </p>
          <Link className="text-link" to="/forgot-password">
            Solicitar outro link
          </Link>
        </div>
      ) : (
        <form
          className="form-stack"
          onSubmit={form.handleSubmit((values) => reset.mutate(values))}
          noValidate
        >
          <Field
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            hint="Use de 15 a 128 caracteres."
            icon={assets.login.lock}
            {...form.register('newPassword')}
            error={form.formState.errors.newPassword?.message}
          />
          <Field
            label="Confirmar nova senha"
            type="password"
            autoComplete="new-password"
            icon={assets.login.lock}
            {...form.register('confirmation')}
            error={form.formState.errors.confirmation?.message}
          />
          <ErrorMessage error={reset.error} />
          {reset.isError && (
            <Link className="text-link" to="/forgot-password">
              Solicitar outro link
            </Link>
          )}
          <Button
            type="submit"
            className="full-width"
            disabled={reset.isPending}
          >
            {reset.isPending ? 'Salvando…' : 'Salvar nova senha'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
