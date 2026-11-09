import {
  type ComponentPropsWithRef,
  type ReactNode,
  useId,
  useState,
} from 'react';
import { assets } from '../../lib/assets';
import { AssetIcon } from './icon';

type Props = ComponentPropsWithRef<'input'> & {
  label: string;
  error?: string | undefined;
  hint?: string;
  icon?: string;
};

export function Field({
  label,
  error,
  hint,
  icon,
  type = 'text',
  ref,
  ...props
}: Props) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const [visible, setVisible] = useState(false);
  return (
    <div className={`field ${error ? 'field-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div
        className={`field-control ${props.disabled ? 'field-disabled' : ''}`}
      >
        {icon && <AssetIcon src={icon} />}
        <input
          ref={ref}
          {...props}
          id={id}
          type={type === 'password' && visible ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${id}-help` : undefined}
        />
        {type === 'password' && (
          <button
            className="password-toggle"
            type="button"
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            <AssetIcon
              src={visible ? assets.icons.eye : assets.login['eye-closed']}
            />
          </button>
        )}
      </div>
      {(error || hint) && (
        <p className="field-hint" id={`${id}-help`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

type SelectProps = ComponentPropsWithRef<'select'> & {
  label: string;
  error?: string | undefined;
  children: ReactNode;
};

export function Select({ label, error, children, ref, ...props }: SelectProps) {
  const id = useId();
  return (
    <div className={`field ${error ? 'field-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="field-control select-control">
        <select
          ref={ref}
          {...props}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        >
          {children}
        </select>
        <AssetIcon src={assets.transactions['chevron-down']} />
      </div>
      {error && (
        <p className="field-hint" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
