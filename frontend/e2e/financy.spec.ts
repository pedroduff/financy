import { randomUUID } from 'node:crypto';
import { expect, type Page, test } from '@playwright/test';

const password = 'Minha frase de senha de teste 2026';
const avatarFile = {
  name: 'avatar.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAFAAAAAoCAIAAADmAupWAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAe0lEQVRoge3XUQ3AUAhDUQQ+LdfQzE7EsvDxToIAaKEtc56uqlnvwMBhOCudG45oRaXZ0tk2ScEjSSvRMlk6z0O+pWffMNhSf0Aw65BjuF8hmHXIMRyGs9K54YhWVJotnQtq1jswcBjOSueGI1pRabZ0tk1S8EjS6iMEL74Jp3HToyjZAAAAAElFTkSuQmCC',
    'base64',
  ),
};

async function createAccount(page: Page) {
  const email = `financy-e2e-${randomUUID()}@example.test`;
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Fazer login' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Criar conta', exact: true }).click();
  await page
    .getByLabel('Nome completo', { exact: true })
    .fill('Conta de teste');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Fazer login' }),
  ).toBeVisible();
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(
    page.getByRole('navigation', { name: 'Navegação principal' }),
  ).toBeVisible();
  return email;
}

test('desktop: real account, categories, future transactions, profile and password recovery', async ({
  page,
  request,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Fazer login' }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('login.png'),
    fullPage: true,
  });
  const email = await createAccount(page);
  await page
    .getByRole('button', { name: 'Nova transação', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Crie sua primeira categoria' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Ir para categorias' }).click();
  for (const [name, icon, color] of [
    ['Alimentação', 'Alimentação', 'Azul'],
    ['Salário', 'Trabalho', 'Verde'],
  ]) {
    await page
      .getByRole('button', { name: 'Nova categoria', exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Título', { exact: true }).fill(name ?? '');
    await dialog
      .getByLabel('Descrição', { exact: true })
      .fill(
        name === 'Alimentação'
          ? 'Restaurantes, delivery e refeições'
          : 'Renda mensal e bonificações',
      );
    await dialog.getByRole('button', { name: icon, exact: true }).click();
    await dialog.getByRole('button', { name: color, exact: true }).click();
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(dialog).not.toBeVisible();
  }
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Transações' })
    .click();
  await page.getByLabel('Período', { exact: true }).selectOption('custom');
  await page.getByLabel('Data inicial', { exact: true }).fill('2099-12-01');
  await page.getByLabel('Data final', { exact: true }).fill('2099-12-31');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  for (const item of [
    {
      description: 'Salário futuro',
      type: 'Receita',
      amount: '5000,00',
      category: 'Salário',
    },
    {
      description: 'Almoço futuro',
      type: 'Despesa',
      amount: '1500,00',
      category: 'Alimentação',
    },
  ]) {
    await page
      .getByRole('button', { name: 'Nova transação', exact: true })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: item.type, exact: true }).click();
    await dialog
      .getByLabel('Descrição', { exact: true })
      .fill(item.description);
    await dialog.getByLabel('Data', { exact: true }).fill('2099-12-15');
    await dialog.getByLabel('Valor', { exact: true }).fill(item.amount);
    await dialog
      .getByLabel('Categoria', { exact: true })
      .selectOption({ label: item.category });
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByText(item.description, { exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole('button', {
      name: 'Editar transação Almoço futuro',
      exact: true,
    })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Valor', { exact: true })
    .fill('1800,00');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Salvar', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Dashboard' })
    .click();
  await expect(
    page
      .locator('.financial-stat')
      .filter({ hasText: 'Saldo do período' })
      .locator('strong'),
  ).toHaveText('R$ 3.200,00');
  await page.screenshot({
    path: testInfo.outputPath('dashboard.png'),
    fullPage: true,
  });
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Categorias' })
    .click();
  await page
    .getByRole('button', { name: 'Excluir categoria Alimentação', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar exclusão' })
    .click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Fechar', exact: true })
    .click();
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  await page
    .getByLabel('Nome completo', { exact: true })
    .fill('Nome atualizado');
  await page
    .getByRole('button', { name: 'Salvar alterações', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Nome atualizado', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Sair da conta', exact: true })
    .click();
  await page
    .getByRole('link', { name: 'Recuperar senha', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Recuperar senha', exact: true }),
  ).toBeVisible();
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page
    .getByRole('button', { name: 'Enviar link de recuperação', exact: true })
    .click();
  await expect(
    page.getByText(/Se houver uma conta com esse e-mail/),
  ).toBeVisible();
  let resetLink = '';
  await expect
    .poll(
      async () => {
        const response = await request.get(
          'http://localhost:8025/api/v1/messages',
        );
        const messages = (await response.json()) as {
          messages: {
            ID: string;
            To: { Address: string }[];
            Subject: string;
          }[];
        };
        const message = messages.messages.find(
          (item) =>
            item.To.some((to) => to.Address === email) &&
            item.Subject.includes('Redefina'),
        );
        if (!message) return false;
        const detail = (await (
          await request.get(
            `http://localhost:8025/api/v1/message/${message.ID}`,
          )
        ).json()) as { Text: string };
        resetLink =
          detail.Text.match(
            /http:\/\/localhost:5174\/reset-password\?token=[\w-]+/,
          )?.at(0) ?? '';
        return Boolean(resetLink);
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  await page.goto(resetLink);
  const newPassword = 'Uma nova senha longa de teste 2026';
  await page.getByLabel('Nova senha', { exact: true }).fill(newPassword);
  await page
    .getByLabel('Confirmar nova senha', { exact: true })
    .fill(newPassword);
  await page
    .getByRole('button', { name: 'Salvar nova senha', exact: true })
    .click();
  await expect(
    page.getByText('Senha redefinida. Entre novamente com sua nova senha.'),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Fazer login', exact: true }).click();
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(newPassword);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(
    page.getByRole('navigation', { name: 'Navegação principal' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  await page.getByText('Alterar senha', { exact: true }).click();
  await page.getByLabel('Senha atual', { exact: true }).fill(newPassword);
  const changedPassword = 'Minha senha final de teste 2026';
  await page.getByLabel('Nova senha', { exact: true }).fill(changedPassword);
  await page
    .getByLabel('Confirmar nova senha', { exact: true })
    .fill(changedPassword);
  await page
    .getByRole('button', { name: 'Salvar nova senha', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Fazer login', exact: true }),
  ).toBeVisible();
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(changedPassword);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(
    page.getByRole('navigation', { name: 'Navegação principal' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Nova transação', exact: true })
    .waitFor();
  await page.request.post('http://localhost:3001/graphql', {
    headers: { 'x-financy-request': '1', origin: 'http://localhost:5174' },
    data: { query: 'mutation{signOut}' },
  });
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Categorias' })
    .click();
  await page
    .getByRole('button', { name: 'Nova categoria', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Título', { exact: true })
    .fill('Sessão expirada');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Salvar', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Fazer login', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('avatar: preview, cancel, upload, replace, reload, sign in and remove', async ({
  page,
}, testInfo) => {
  const email = await createAccount(page);
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  const selector = page.getByLabel('Selecionar foto do perfil', {
    exact: true,
  });
  const menuAvatar = page
    .getByRole('link', { name: 'Meu perfil', exact: true })
    .getByRole('img');
  await expect(menuAvatar).toHaveAccessibleName('Iniciais de Conta de teste');
  await selector.setInputFiles(avatarFile);
  await expect(
    page.getByRole('img', { name: 'Prévia da nova foto' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(
    page.getByRole('img', { name: 'Prévia da nova foto' }),
  ).not.toBeVisible();
  await expect(menuAvatar).toHaveAccessibleName('Iniciais de Conta de teste');
  await selector.setInputFiles({
    name: 'avatar.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg/>'),
  });
  await expect(page.getByRole('alert')).toHaveText(/Escolha uma imagem JPEG/);
  await selector.setInputFiles(avatarFile);
  await page
    .getByLabel('Nome completo', { exact: true })
    .fill('Nome ainda em edição');
  await page.getByRole('button', { name: 'Salvar foto', exact: true }).click();
  await expect(menuAvatar).toHaveAttribute('src', /\/me\/avatar\/1\?/);
  await expect
    .poll(() =>
      menuAvatar.evaluate(
        (element) =>
          element instanceof HTMLImageElement &&
          element.complete &&
          element.naturalWidth === 256,
      ),
    )
    .toBe(true);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue(
    'Nome ainda em edição',
  );
  await page
    .getByRole('button', { name: 'Salvar alterações', exact: true })
    .click();
  await expect(menuAvatar).toHaveAccessibleName('Foto de Nome ainda em edição');
  await expect(menuAvatar).toHaveAttribute('src', /\/me\/avatar\/1\?/);
  await selector.setInputFiles({
    ...avatarFile,
    buffer: Buffer.from('corrupt image'),
  });
  await expect(page.getByRole('alert')).toHaveText(
    /Não foi possível abrir esta imagem/,
  );
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await selector.setInputFiles(avatarFile);
  await page.route('**/me/avatar', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'INTERNAL_ERROR',
        message: 'Falha de teste no envio.',
      }),
    }),
  );
  await page.getByRole('button', { name: 'Salvar foto', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Falha de teste no envio.');
  await expect(menuAvatar).toHaveAttribute('src', /\/me\/avatar\/1\?/);
  await page.unroute('**/me/avatar');
  await page.getByRole('button', { name: 'Salvar foto', exact: true }).click();
  await expect(menuAvatar).toHaveAttribute('src', /\/me\/avatar\/2\?/);
  await page.reload();
  await expect(menuAvatar).toHaveAttribute('src', /\/me\/avatar\/2\?/);
  await page.screenshot({
    path: testInfo.outputPath('profile-avatar.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath('profile-avatar-mobile.png'),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole('button', { name: 'Sair da conta', exact: true })
    .click();
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(menuAvatar).toHaveAttribute('src', /\/me\/avatar\/2\?/);
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Remover foto', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancelar', exact: true })
    .click();
  await expect(menuAvatar).toHaveAttribute('src', /\/me\/avatar\/2\?/);
  await page.getByRole('button', { name: 'Remover foto', exact: true }).click();
  await page
    .getByRole('button', { name: 'Confirmar remoção', exact: true })
    .click();
  await expect(menuAvatar).toHaveAccessibleName(
    'Iniciais de Nome ainda em edição',
  );
  await expect(
    page.getByRole('button', { name: 'Adicionar foto', exact: true }),
  ).toBeVisible();
});

test('mobile: responsive layout and keyboard-accessible category dialog', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await createAccount(page);
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Categorias' })
    .click();
  await page
    .getByRole('button', { name: 'Nova categoria', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Título', { exact: true })).toBeFocused();
  await dialog.getByLabel('Título', { exact: true }).fill('Casa');
  await page.screenshot({
    path: testInfo.outputPath('category-mobile.png'),
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Nova categoria', exact: true }),
  ).toBeFocused();
  const dimensions = await page.evaluate(() => ({
    width: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.width);
});
