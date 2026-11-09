import { useState } from 'react';
import { avatarEndpoint } from '../../lib/avatar';
import { initials } from '../../lib/format';
import type { User } from '../../lib/models';

export function Avatar({
  user,
  large = false,
}: {
  user: User;
  large?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = user.avatarUrl ? avatarEndpoint(user.avatarUrl) : null;
  return (
    <span className={`avatar${large ? ' avatar-large' : ''}`}>
      {src && failedUrl !== src ? (
        <img
          src={src}
          alt={`Foto de ${user.name}`}
          onError={() => setFailedUrl(src)}
        />
      ) : (
        <span role="img" aria-label={`Iniciais de ${user.name}`}>
          {initials(user.name)}
        </span>
      )}
    </span>
  );
}
