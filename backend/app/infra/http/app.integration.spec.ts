import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { AvatarCleanupWorker } from '../avatar/avatarCleanupWorker.js';
import type { Application } from '../composition.js';
import { composeApplication } from '../composition.js';
import { readEnvironment } from '../config/environment.js';
import { EmailWorker } from '../email/emailWorker.js';
import { createApp } from './app.js';

type Result = {
  data: {
    signUp: { id: string; name: string; email: string };
    signIn: { id: string };
    me: { id: string; name: string } | null;
    createCategory: { id: string; name: string };
    updateCategory: { id: string; name: string };
    deleteCategory: { id: string };
    createTransaction: { id: string; amountInCents: string };
    updateTransaction: { id: string; amountInCents: string };
    transactions: { totalCount: number; items: { id: string }[] };
    dashboard: {
      incomeInCents: string;
      expenseInCents: string;
      balanceInCents: string;
      transactionCount: number;
    };
    categoryOverview: { categoryCount: number; transactionCount: number };
    requestPasswordReset: boolean;
    resetPassword: boolean;
    changePassword: boolean;
    updateProfile: { name: string; email: string };
  } | null;
  errors?: { message: string; extensions: { code: string } }[];
};

const password = 'Uma senha longa para teste 123';
const replacementPassword = 'Outra senha longa para teste 456';
const suite = describe;

suite('GraphQL with PostgreSQL', () => {
  let application: Application;
  let app: Awaited<ReturnType<typeof createApp>>;
  const emails: string[] = [];
  const sent: { email: string; token: string }[] = [];
  const notices: string[] = [];
  let ipCounter = 1;
  let avatarDirectory: string;
  const avatarKeys = new Set<string>();

  beforeAll(async () => {
    avatarDirectory = await mkdtemp(join(tmpdir(), 'financy-avatar-test-'));
    const databaseUrl =
      process.env.TEST_DATABASE_URL ??
      'postgresql://app:app@localhost:5432/app_test';
    if (!new URL(databaseUrl).pathname.endsWith('_test'))
      throw new Error('Utilize um banco separado com sufixo _test.');
    const env = readEnvironment({
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrl,
      JWT_SECRET: randomUUID() + randomUUID(),
      FRONTEND_URL: 'http://localhost:5173',
      AVATAR_DIRECTORY: avatarDirectory,
    });
    application = await composeApplication(env, {
      sendReset: async (email, token) => {
        sent.push({ email, token });
      },
      sendPasswordChanged: async (email) => {
        notices.push(email);
      },
    });
    app = await createApp(application, env, {
      emailWorker: false,
      avatarWorker: false,
    });
    await app.ready();
  });

  afterAll(async () => {
    if (application) {
      const avatars = await application.database.user.findMany({
        where: { email: { in: emails } },
        select: { avatarKey: true },
      });
      for (const user of avatars)
        if (user.avatarKey) avatarKeys.add(user.avatarKey);
      await application.database.avatarFile.deleteMany({
        where: { key: { in: [...avatarKeys] } },
      });
      const users = await application.database.user.findMany({
        where: { email: { in: emails } },
        select: { id: true },
      });
      const userIds = users.map((user) => user.id);
      await application.database.transaction.deleteMany({
        where: { userId: { in: userIds } },
      });
      await application.database.category.deleteMany({
        where: { userId: { in: userIds } },
      });
      await application.database.user.deleteMany({
        where: { id: { in: userIds } },
      });
      await application.database.accountEmailJob.deleteMany({
        where: { email: { in: emails } },
      });
    }
    if (app) await app.close();
    if (avatarDirectory)
      await rm(avatarDirectory, { recursive: true, force: true });
  });

  async function query(
    query: string,
    variables: Record<string, unknown> = {},
    cookie = '',
    ip = '127.0.0.1',
  ) {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      remoteAddress: ip,
      headers: {
        'x-financy-request': '1',
        origin: 'http://localhost:5173',
        cookie,
      },
      payload: { query, variables },
    });
    return { response, body: response.json<Result>() };
  }

  async function account() {
    const email = `${randomUUID()}@example.test`;
    emails.push(email);
    const ip = `127.0.0.${ipCounter++}`;
    const created = await query(
      'mutation($input:SignUpInput!){signUp(input:$input){id name email}}',
      { input: { name: 'Conta teste', email, password } },
      '',
      ip,
    );
    expect(created.body.errors).toBeUndefined();
    const logged = await query(
      'mutation($input:SignInInput!){signIn(input:$input){id}}',
      { input: { email, password } },
      '',
      ip,
    );
    expect(logged.body.errors).toBeUndefined();
    const session = logged.response.cookies.at(0);
    if (!session || !created.body.data) throw new Error('Conta não criada.');
    return {
      email,
      ip,
      userId: created.body.data.signUp.id,
      cookie: `${session.name}=${session.value}`,
    };
  }

  async function category(cookie: string, name = 'Alimentação') {
    const result = await query(
      'mutation($input:CategoryInput!){createCategory(input:$input){id name}}',
      { input: { name, icon: 'utensils', color: 'green' } },
      cookie,
    );
    expect(result.body.errors).toBeUndefined();
    if (!result.body.data) throw new Error('Categoria não criada.');
    return result.body.data.createCategory.id;
  }

  async function uploadPhoto(
    owner: { cookie: string; ip: string },
    expectedVersion = 0,
    options: {
      bytes?: Buffer;
      mime?: string;
      filename?: string;
      extraFile?: boolean;
      headers?: Record<string, string>;
      fileFirst?: boolean;
    } = {},
  ) {
    const bytes =
      options.bytes ??
      (await sharp({
        create: { width: 30, height: 15, channels: 3, background: 'green' },
      })
        .png()
        .toBuffer());
    const boundary = `avatar-${randomUUID()}`;
    const field = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="expectedVersion"\r\n\r\n${expectedVersion}\r\n`,
    );
    const file = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${options.filename ?? 'photo.png'}"\r\nContent-Type: ${options.mime ?? 'image/png'}\r\n\r\n`,
      ),
      bytes,
      Buffer.from('\r\n'),
    ]);
    const payload = Buffer.concat([
      ...(options.fileFirst ? [file, field] : [field, file]),
      ...(options.extraFile ? [file] : []),
      Buffer.from(`--${boundary}--\r\n`),
    ]);
    const response = await app.inject({
      method: 'POST',
      url: '/me/avatar',
      remoteAddress: owner.ip,
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        cookie: owner.cookie,
        'x-financy-request': '1',
        origin: 'http://localhost:5173',
        ...options.headers,
      },
      payload,
    });
    const current = await application.database.user.findMany({
      where: { email: { in: emails }, avatarKey: { not: null } },
      select: { avatarKey: true },
    });
    for (const user of current)
      if (user.avatarKey) avatarKeys.add(user.avatarKey);
    return response;
  }

  it('stores, replaces and removes a private avatar, retaining it in all user responses', async () => {
    const owner = await account();
    const foreign = await account();
    const uploaded = await uploadPhoto(owner, 0, { fileFirst: true });
    expect(uploaded.statusCode).toBe(200);
    const photo = uploaded.json<{ avatarUrl: string; avatarVersion: number }>();
    expect(photo.avatarVersion).toBe(1);
    const image = await app.inject({
      method: 'GET',
      url: photo.avatarUrl,
      headers: { cookie: owner.cookie },
    });
    expect(image.statusCode).toBe(200);
    expect(image.headers['content-type']).toBe('image/webp');
    expect(image.headers['cache-control']).toBe('no-store');
    expect(await sharp(image.rawPayload).metadata()).toMatchObject({
      width: 256,
      height: 256,
    });
    expect(
      (await app.inject({ method: 'GET', url: photo.avatarUrl })).statusCode,
    ).toBe(401);
    await uploadPhoto(foreign);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: photo.avatarUrl,
          headers: { cookie: foreign.cookie },
        })
      ).statusCode,
    ).toBe(404);
    const renamed = await query(
      'mutation{updateProfile(name:"Novo nome"){name avatarUrl avatarVersion}}',
      {},
      owner.cookie,
    );
    expect(renamed.body.data?.updateProfile).toMatchObject({
      avatarUrl: photo.avatarUrl,
      avatarVersion: photo.avatarVersion,
    });
    const replaced = await uploadPhoto(owner, 1);
    expect(replaced.statusCode).toBe(200);
    expect(replaced.json()).toMatchObject({ avatarVersion: 2 });
    expect(
      (
        await app.inject({
          method: 'GET',
          url: photo.avatarUrl,
          headers: { cookie: owner.cookie },
        })
      ).statusCode,
    ).toBe(404);
    const removed = await query(
      'mutation{removeAvatar(expectedVersion:2){avatarUrl avatarVersion}}',
      {},
      owner.cookie,
    );
    expect(removed.body.errors).toBeUndefined();
    expect(removed.body.data).toMatchObject({
      removeAvatar: { avatarUrl: null, avatarVersion: 3 },
    });
    expect(
      (
        await app.inject({
          method: 'GET',
          url: replaced.json<{ avatarUrl: string }>().avatarUrl,
          headers: { cookie: owner.cookie },
        })
      ).statusCode,
    ).toBe(404);
  });

  it('rejects unauthenticated, CSRF, malformed, excessive and invalid image uploads without losing the previous photo', async () => {
    const owner = await account();
    const photo = (await uploadPhoto(owner)).json<{ avatarUrl: string }>();
    expect(
      (await uploadPhoto(owner, 1, { headers: { cookie: '' } })).statusCode,
    ).toBe(401);
    expect(
      (await uploadPhoto(owner, 1, { headers: { 'x-financy-request': '' } }))
        .statusCode,
    ).toBe(403);
    expect(
      (
        await uploadPhoto(owner, 1, {
          headers: { origin: 'https://example.invalid' },
        })
      ).statusCode,
    ).toBe(403);
    for (const options of [
      { bytes: Buffer.from('invalid') },
      { mime: 'image/jpeg' },
      { filename: 'photo.svg' },
      { extraFile: true },
      { bytes: Buffer.alloc(5 * 1024 * 1024 + 1) },
    ]) {
      const response = await uploadPhoto(owner, 1, options);
      expect([400, 413]).toContain(response.statusCode);
    }
    expect(
      (
        await app.inject({
          method: 'GET',
          url: photo.avatarUrl,
          headers: { cookie: owner.cookie },
        })
      ).statusCode,
    ).toBe(200);
    await application.database.session.deleteMany({
      where: { userId: owner.userId },
    });
    expect(
      (
        await app.inject({
          method: 'GET',
          url: photo.avatarUrl,
          headers: { cookie: owner.cookie },
        })
      ).statusCode,
    ).toBe(401);
  });

  it('limits uploads per account even when requests use different IPs', async () => {
    const owner = await account();
    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await uploadPhoto(
        { ...owner, ip: `127.1.0.${attempt + 1}` },
        0,
        { bytes: Buffer.from('invalid') },
      );
      expect(response.statusCode).toBe(400);
    }
    const limited = await uploadPhoto({ ...owner, ip: '127.1.0.20' });
    expect(limited.statusCode).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
    expect(
      await application.database.user.findUnique({
        where: { id: owner.userId },
      }),
    ).toMatchObject({ avatarKey: null, avatarVersion: 0 });
  });

  it('allows only one concurrent avatar mutation and rejects stale uploads after removal', async () => {
    const owner = await account();
    await uploadPhoto(owner);
    const results = await Promise.allSettled([
      application.removeAvatar.execute({
        userId: owner.userId,
        expectedVersion: 1,
      }),
      application.removeAvatar.execute({
        userId: owner.userId,
        expectedVersion: 1,
      }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.find((result) => result.status === 'rejected'),
    ).toMatchObject({ reason: { code: 'CONFLICT' } });
    const stale = await uploadPhoto(owner, 1);
    expect(stale.statusCode).toBe(409);
    const current = await application.database.user.findUniqueOrThrow({
      where: { id: owner.userId },
    });
    expect(current).toMatchObject({ avatarKey: null, avatarVersion: 2 });
  });

  it('resumes durable cleanup after failure, removing expired reservations and retaining the active image', async () => {
    const owner = await account();
    await uploadPhoto(owner);
    const previous = await application.database.user.findUniqueOrThrow({
      where: { id: owner.userId },
    });
    await uploadPhoto(owner, 1);
    const current = await application.database.user.findUniqueOrThrow({
      where: { id: owner.userId },
    });
    const abandoned = `${randomUUID()}.webp`;
    avatarKeys.add(abandoned);
    await application.avatar.repository.reserve(abandoned);
    await application.avatar.storage.write(
      abandoned,
      Buffer.from('partial write'),
    );
    await application.database.avatarFile.update({
      where: { key: abandoned },
      data: { expiresAt: new Date(0) },
    });
    const failures: string[] = [];
    const remove = vi
      .spyOn(application.avatar.storage, 'remove')
      .mockRejectedValueOnce(new Error('Disk unavailable.'));
    const failedWorker = new AvatarCleanupWorker(
      application.avatar.repository,
      application.avatar.storage,
      () => failures.push('failed'),
    );
    await failedWorker.tick();
    expect(failures).toEqual(['failed']);
    remove.mockRestore();
    const restartedWorker = new AvatarCleanupWorker(
      application.avatar.repository,
      application.avatar.storage,
      () => failures.push('failed again'),
    );
    await restartedWorker.tick();
    if (!previous.avatarKey || !current.avatarKey)
      throw new Error('Avatar missing.');
    expect(
      await application.avatar.storage.read(previous.avatarKey),
    ).toBeNull();
    expect(await application.avatar.storage.read(abandoned)).toBeNull();
    expect(
      await application.avatar.storage.read(current.avatarKey),
    ).not.toBeNull();
    expect(
      await application.database.avatarFile.findUnique({
        where: { key: current.avatarKey },
      }),
    ).toMatchObject({ expiresAt: null });
  });

  async function transaction(
    cookie: string,
    categoryId: string,
    amountInCents: string,
    date: string,
    type = 'INCOME',
  ) {
    return query(
      'mutation($input:TransactionInput!){createTransaction(input:$input){id amountInCents}}',
      {
        input: {
          categoryId,
          amountInCents,
          date,
          type,
          description: 'Lançamento de teste',
        },
      },
      cookie,
    );
  }

  it('blocks missing CSRF headers and untrusted origins', async () => {
    const missing = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: { query: '{me{id}}' },
    });
    expect(missing.statusCode).toBe(403);
    const foreign = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: { 'x-financy-request': '1', origin: 'https://example.invalid' },
      payload: { query: '{me{id}}' },
    });
    expect(foreign.statusCode).toBe(403);
  });

  it('protects private operations and sets an HttpOnly session cookie', async () => {
    const anonymous = await query('{transactions{totalCount}}');
    expect(anonymous.body.errors?.at(0)?.extensions.code).toBe(
      'UNAUTHENTICATED',
    );
    const owner = await account();
    const result = await query('{me{id name}}', {}, owner.cookie);
    expect(result.body.data?.me?.id).toBe(owner.userId);
    const record = await application.database.user.findUniqueOrThrow({
      where: { id: owner.userId },
    });
    expect(record.passwordHash).not.toContain(password);
    const remembered = await query(
      'mutation($input:SignInInput!){signIn(input:$input){id}}',
      { input: { email: owner.email, password, rememberMe: true } },
      '',
      owner.ip,
    );
    expect(remembered.response.headers['set-cookie']).toMatch(/HttpOnly/i);
    expect(remembered.response.headers['set-cookie']).toMatch(
      /Max-Age=2592000/,
    );
  });

  it('enforces category uniqueness under case and whitespace normalization', async () => {
    const owner = await account();
    await category(owner.cookie);
    const duplicate = await query(
      'mutation($input:CategoryInput!){createCategory(input:$input){id}}',
      { input: { name: ' ALIMENTAÇÃO ', icon: 'utensils', color: 'green' } },
      owner.cookie,
    );
    expect(duplicate.body.errors?.at(0)?.extensions.code).toBe('CONFLICT');
    const foreign = await account();
    await category(foreign.cookie);
  });

  it('isolates categories, transactions, dashboards and statistics between users', async () => {
    const owner = await account();
    const foreign = await account();
    const categoryId = await category(owner.cookie);
    const created = await transaction(
      owner.cookie,
      categoryId,
      '10000',
      '2099-12-01',
    );
    expect(created.body.errors).toBeUndefined();
    const id = created.body.data?.createTransaction.id;
    const invalid = await transaction(
      foreign.cookie,
      categoryId,
      '10000',
      '2099-12-01',
    );
    expect(invalid.body.errors?.at(0)?.extensions.code).toBe('NOT_FOUND');
    const update = await query(
      'mutation($id:ID!,$input:CategoryInput!){updateCategory(id:$id,input:$input){id}}',
      {
        id: categoryId,
        input: { name: 'Inválido', icon: 'utensils', color: 'red' },
      },
      foreign.cookie,
    );
    expect(update.body.errors?.at(0)?.extensions.code).toBe('NOT_FOUND');
    const deletion = await query(
      'mutation($id:ID!){deleteTransaction(id:$id){id}}',
      { id },
      foreign.cookie,
    );
    expect(deletion.body.errors?.at(0)?.extensions.code).toBe('NOT_FOUND');
    const view = await query(
      '{transactions{totalCount} categoryOverview{categoryCount transactionCount} dashboard(startDate:"2099-12-01",endDate:"2099-12-31"){balanceInCents transactionCount}}',
      {},
      foreign.cookie,
    );
    expect(view.body.data?.transactions.totalCount).toBe(0);
    expect(view.body.data?.categoryOverview).toEqual({
      categoryCount: 0,
      transactionCount: 0,
    });
    expect(view.body.data?.dashboard.balanceInCents).toBe('0');
    const direct = await application.database.transaction
      .create({
        data: {
          id: randomUUID(),
          userId: foreign.userId,
          categoryId,
          description: 'Inválido',
          amountInCents: 100n,
          type: 'INCOME',
          date: new Date('2099-12-01'),
        },
      })
      .catch((error: unknown) => error);
    expect(direct).toMatchObject({ code: 'P2003' });
  });

  it('includes future entries only inside the chosen period and preserves exact cents', async () => {
    const owner = await account();
    const id = await category(owner.cookie);
    for (const [amount, date, type] of [
      ['500000', '2099-12-01', 'INCOME'],
      ['150000', '2099-12-15', 'EXPENSE'],
      ['30000', '2099-12-31', 'EXPENSE'],
      ['999999', '2099-11-30', 'INCOME'],
    ] as const) {
      expect(
        (await transaction(owner.cookie, id, amount, date, type)).body.errors,
      ).toBeUndefined();
    }
    const result = await query(
      '{dashboard(startDate:"2099-12-01",endDate:"2099-12-31"){incomeInCents expenseInCents balanceInCents transactionCount}}',
      {},
      owner.cookie,
    );
    expect(result.body.data?.dashboard).toEqual({
      incomeInCents: '500000',
      expenseInCents: '180000',
      balanceInCents: '320000',
      transactionCount: 3,
    });
    const precise = await transaction(
      owner.cookie,
      id,
      '9007199254740993',
      '2100-01-01',
    );
    expect(precise.body.data?.createTransaction.amountInCents).toBe(
      '9007199254740993',
    );
    expect(
      (
        await transaction(owner.cookie, id, '100', '2099-02-29')
      ).body.errors?.at(0)?.extensions.code,
    ).toBe('VALIDATION_ERROR');
  });

  it('prevents deleting a category in use and allows deletion after moving the transaction', async () => {
    const owner = await account();
    const categoryId = await category(owner.cookie);
    const target = await category(owner.cookie, 'Outra');
    const created = await transaction(
      owner.cookie,
      categoryId,
      '100',
      '2099-12-01',
    );
    const blocked = await query(
      'mutation($id:ID!){deleteCategory(id:$id){id}}',
      { id: categoryId },
      owner.cookie,
    );
    expect(blocked.body.errors?.at(0)?.extensions.code).toBe('CONFLICT');
    const moved = await query(
      'mutation($id:ID!,$input:TransactionInput!){updateTransaction(id:$id,input:$input){id amountInCents}}',
      {
        id: created.body.data?.createTransaction.id,
        input: {
          categoryId: target,
          description: 'Movida',
          amountInCents: '200',
          date: '2099-12-01',
          type: 'EXPENSE',
        },
      },
      owner.cookie,
    );
    expect(moved.body.errors).toBeUndefined();
    const deleted = await query(
      'mutation($id:ID!){deleteCategory(id:$id){id}}',
      { id: categoryId },
      owner.cookie,
    );
    expect(deleted.body.data?.deleteCategory.id).toBe(categoryId);
  });

  it('changes profile name, validates the current password and revokes existing sessions', async () => {
    const owner = await account();
    const profile = await query(
      'mutation{updateProfile(name:" Novo nome "){name email}}',
      {},
      owner.cookie,
    );
    expect(profile.body.data?.updateProfile).toEqual({
      name: 'Novo nome',
      email: owner.email,
    });
    const wrong = await query(
      'mutation($currentPassword:String!,$newPassword:String!){changePassword(currentPassword:$currentPassword,newPassword:$newPassword)}',
      { currentPassword: 'incorreta', newPassword: replacementPassword },
      owner.cookie,
      owner.ip,
    );
    expect(wrong.body.errors?.at(0)?.extensions.code).toBe('VALIDATION_ERROR');
    const changed = await query(
      'mutation($currentPassword:String!,$newPassword:String!){changePassword(currentPassword:$currentPassword,newPassword:$newPassword)}',
      { currentPassword: password, newPassword: replacementPassword },
      owner.cookie,
      owner.ip,
    );
    expect(changed.body.data?.changePassword).toBe(true);
    expect(
      (await query('{me{id}}', {}, owner.cookie)).body.data?.me,
    ).toBeNull();
    expect(
      await application.database.session.count({
        where: { userId: owner.userId },
      }),
    ).toBe(0);
  });

  it('uses identical reset responses and consumes a reset token once under concurrency', async () => {
    const owner = await account();
    const absentEmail = `${randomUUID()}@example.test`;
    emails.push(absentEmail);
    const existing = await query(
      'mutation($email:String!){requestPasswordReset(email:$email)}',
      { email: owner.email },
      '',
      owner.ip,
    );
    const absent = await query(
      'mutation($email:String!){requestPasswordReset(email:$email)}',
      { email: absentEmail },
      '',
      owner.ip,
    );
    expect(existing.body).toEqual(absent.body);
    const worker = new EmailWorker(
      application.database,
      application.deliverEmail,
      () => {},
    );
    for (
      let i = 0;
      i < 15 && !sent.some((message) => message.email === owner.email);
      i++
    )
      await worker.tick();
    const delivered = sent.find((message) => message.email === owner.email);
    if (!delivered) throw new Error('E-mail de recuperação não processado.');
    expect(sent.some((message) => message.email === absentEmail)).toBe(false);
    const stored = await application.database.passwordReset.findFirstOrThrow({
      where: { userId: owner.userId },
    });
    expect(stored.tokenHash).not.toBe(delivered.token);
    const operation =
      'mutation($token:String!,$newPassword:String!){resetPassword(token:$token,newPassword:$newPassword)}';
    const results = await Promise.all([
      query(
        operation,
        { token: delivered.token, newPassword: replacementPassword },
        '',
        owner.ip,
      ),
      query(
        operation,
        { token: delivered.token, newPassword: replacementPassword },
        '',
        owner.ip,
      ),
    ]);
    expect(
      results.filter((item) => item.body.data?.resetPassword === true),
    ).toHaveLength(1);
    expect(
      results.filter(
        (item) =>
          item.body.errors?.at(0)?.extensions.code === 'VALIDATION_ERROR',
      ),
    ).toHaveLength(1);
    expect(
      (await query('{me{id}}', {}, owner.cookie)).body.data?.me,
    ).toBeNull();
    await worker.stop();
  });

  it('rejects expired sessions, tampered JWTs and expired reset links', async () => {
    const owner = await account();
    const tampered = `${owner.cookie.slice(0, -4)}xxxx`;
    expect((await query('{me{id}}', {}, tampered)).body.data?.me).toBeNull();
    await application.database.session.updateMany({
      where: { userId: owner.userId },
      data: { expiresAt: new Date(0) },
    });
    expect(
      (await query('{me{id}}', {}, owner.cookie)).body.data?.me,
    ).toBeNull();
    const token = application.auth.tokens.generate();
    await application.database.passwordReset.create({
      data: {
        id: randomUUID(),
        userId: owner.userId,
        tokenHash: application.auth.tokens.digest(token),
        expiresAt: new Date(0),
      },
    });
    const reset = await query(
      'mutation($token:String!,$newPassword:String!){resetPassword(token:$token,newPassword:$newPassword)}',
      { token, newPassword: replacementPassword },
      '',
      owner.ip,
    );
    expect(reset.body.errors?.at(0)?.extensions.code).toBe('VALIDATION_ERROR');
  });

  it('cancels queued recovery requests when a password changes', async () => {
    const owner = await account();
    await application.auth.repository.enqueueReset(owner.email);
    const job = await application.database.accountEmailJob.findFirstOrThrow({
      where: { email: owner.email, kind: 'RESET' },
    });
    await application.changePassword.execute({
      userId: owner.userId,
      currentPassword: password,
      newPassword: replacementPassword,
    });
    await application.deliverEmail.execute(job);
    expect(sent.some((message) => message.email === owner.email)).toBe(false);
    expect(
      await application.database.passwordReset.count({
        where: { userId: owner.userId },
      }),
    ).toBe(0);
  });
});
