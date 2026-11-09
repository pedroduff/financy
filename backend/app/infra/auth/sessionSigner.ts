import { jwtVerify, SignJWT } from 'jose';
import type {
  SessionData,
  SessionSigner,
} from '../../application/ports/auth.port.js';
import { DomainError } from '../../domain/errors/domain.error.js';
import { EntityId } from '../../domain/valueObjects/entityId.valueObject.js';

export class JwtSessionSigner implements SessionSigner {
  private readonly key: Uint8Array;

  constructor(secret: string) {
    this.key = new TextEncoder().encode(secret);
  }

  async sign(session: SessionData) {
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(session.userId)
      .setJti(session.id)
      .setIssuer('financy')
      .setAudience('financy-web')
      .setIssuedAt()
      .setExpirationTime(Math.floor(session.expiresAt.getTime() / 1000))
      .sign(this.key);
  }

  async verify(token: string) {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: ['HS256'],
        issuer: 'financy',
        audience: 'financy-web',
        requiredClaims: ['sub', 'jti', 'exp', 'iat'],
      });
      return {
        userId: new EntityId(payload.sub ?? '').value,
        sessionId: new EntityId(payload.jti ?? '').value,
      };
    } catch {
      throw new DomainError(
        'UNAUTHENTICATED',
        'Sua sessão expirou. Faça login novamente.',
      );
    }
  }
}
