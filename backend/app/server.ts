import { composeApplication } from './infra/composition.js';
import { readEnvironment } from './infra/config/environment.js';
import { createApp } from './infra/http/app.js';

const env = readEnvironment(process.env);
const application = await composeApplication(env);
const app = await createApp(application, env);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close();
  });
}

try {
  await application.database.$connect();
  await app.listen({ host: env.HOST, port: env.PORT });
} catch {
  app.log.error(
    { code: 'STARTUP_FAILED' },
    'Não foi possível iniciar o servidor. Verifique o banco e as configurações.',
  );
  await app.close();
  process.exitCode = 1;
}
