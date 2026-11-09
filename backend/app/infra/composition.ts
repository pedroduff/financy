import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { toUserDto } from '../application/modules/auth/mappers/user.mapper.js';
import { ChangePassword } from '../application/modules/auth/useCases/changePassword.useCase.js';
import { DeliverAccountEmail } from '../application/modules/auth/useCases/deliverAccountEmail.useCase.js';
import { RemoveAvatar } from '../application/modules/auth/useCases/removeAvatar.useCase.js';
import { RequestPasswordReset } from '../application/modules/auth/useCases/requestPasswordReset.useCase.js';
import { ResetPassword } from '../application/modules/auth/useCases/resetPassword.useCase.js';
import { SignIn } from '../application/modules/auth/useCases/signIn.useCase.js';
import { SignUp } from '../application/modules/auth/useCases/signUp.useCase.js';
import { UpdateAvatar } from '../application/modules/auth/useCases/updateAvatar.useCase.js';
import { UpdateProfile } from '../application/modules/auth/useCases/updateProfile.useCase.js';
import { CreateCategory } from '../application/modules/categories/useCases/createCategory.useCase.js';
import { DeleteCategory } from '../application/modules/categories/useCases/deleteCategory.useCase.js';
import { ListCategories } from '../application/modules/categories/useCases/listCategories.useCase.js';
import { UpdateCategory } from '../application/modules/categories/useCases/updateCategory.useCase.js';
import { GetDashboard } from '../application/modules/dashboard/useCases/getDashboard.useCase.js';
import { CreateTransaction } from '../application/modules/transactions/useCases/createTransaction.useCase.js';
import { DeleteTransaction } from '../application/modules/transactions/useCases/deleteTransaction.useCase.js';
import { ListTransactions } from '../application/modules/transactions/useCases/listTransactions.useCase.js';
import { UpdateTransaction } from '../application/modules/transactions/useCases/updateTransaction.useCase.js';
import type { AccountMailer } from '../application/ports/auth.port.js';
import { ScryptPasswordHasher } from './auth/passwordHasher.js';
import { JwtSessionSigner } from './auth/sessionSigner.js';
import { LocalAvatarStorage } from './avatar/localAvatarStorage.js';
import { SharpAvatarProcessor } from './avatar/sharpAvatarProcessor.js';
import type { Environment } from './config/environment.js';
import { createDatabase } from './DB/client.js';
import { PrismaFinanceQueries } from './DB/queries/finance.queries.js';
import { PrismaAuthRepository } from './DB/repositories/auth.repository.js';
import { PrismaAvatarRepository } from './DB/repositories/avatar.repository.js';
import { PrismaCategoryRepository } from './DB/repositories/category.repository.js';
import { PrismaTransactionRepository } from './DB/repositories/transaction.repository.js';
import { SmtpAccountMailer } from './email/accountMailer.js';

export async function composeApplication(
  env: Environment,
  mailer?: AccountMailer,
) {
  const database = createDatabase(env.DATABASE_URL);
  const passwords = new ScryptPasswordHasher();
  const ids = { generate: () => randomUUID() };
  const auth = {
    repository: new PrismaAuthRepository(database),
    passwords,
    sessions: new JwtSessionSigner(env.JWT_SECRET),
    ids,
    tokens: {
      generate: () => randomBytes(32).toString('base64url'),
      digest: (value: string) =>
        createHash('sha256').update(value).digest('hex'),
    },
    now: () => new Date(),
    dummyHash: await passwords.hash(randomBytes(32).toString('base64url')),
  };
  const categories = new PrismaCategoryRepository(database);
  const transactions = new PrismaTransactionRepository(database);
  const queries = new PrismaFinanceQueries(database);
  const avatar = {
    repository: new PrismaAvatarRepository(database),
    storage: new LocalAvatarStorage(env.AVATAR_DIRECTORY),
    processor: new SharpAvatarProcessor(),
  };
  const transactionDependencies = { categories, transactions, ids };
  return {
    database,
    auth,
    queries,
    avatar,
    updateAvatar: new UpdateAvatar(
      avatar.repository,
      avatar.storage,
      avatar.processor,
      ids,
    ),
    removeAvatar: new RemoveAvatar(avatar.repository),
    signUp: new SignUp(auth),
    signIn: new SignIn(auth),
    updateProfile: new UpdateProfile(auth),
    changePassword: new ChangePassword(auth),
    requestPasswordReset: new RequestPasswordReset(auth),
    resetPassword: new ResetPassword(auth),
    deliverEmail: new DeliverAccountEmail(
      auth,
      mailer ?? new SmtpAccountMailer(env),
    ),
    currentUser: async (id: string) => {
      const account = await auth.repository.findById(id);
      return account ? toUserDto(account.user) : null;
    },
    createCategory: new CreateCategory(categories, ids),
    listCategories: new ListCategories(categories),
    updateCategory: new UpdateCategory(categories),
    deleteCategory: new DeleteCategory(categories),
    createTransaction: new CreateTransaction(transactionDependencies),
    updateTransaction: new UpdateTransaction(transactionDependencies),
    deleteTransaction: new DeleteTransaction(transactionDependencies),
    listTransactions: new ListTransactions(queries),
    getDashboard: new GetDashboard(queries),
  };
}

export type Application = Awaited<ReturnType<typeof composeApplication>>;
