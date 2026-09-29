import { useId } from 'react';

function toName(label: string | undefined, fallback: string) {
  if (!label) return fallback;
  return (
    String(label)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || fallback
  );
}

// Base shared props
type BaseProps = {
  className?: string;
  label?: string;
  error?: string;
  id?: string;
};

// Discriminate by the `as` prop so onChange gets the proper event type
type InputAsInputElement = BaseProps & {
  as?: 'input';
} & React.InputHTMLAttributes<HTMLInputElement>;

type InputAsTextareaElement = BaseProps & {
  as: 'textarea';
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export type InputProps = InputAsInputElement | InputAsTextareaElement;

export default function Input(props: InputProps) {
  const { className = '', label, error, as = 'input', id, name, ...rest } = props;
  const autoId = useId();
  const inputId = id || `field-${autoId}`;
  const inputName = name || toName(label, inputId);

  const sharedClasses = `w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
    error ? 'border-red-400 focus:ring-red-100' : ''
  } ${className}`;

  return (
    <label className="block" htmlFor={inputId}>
      {label && (
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
      )}

      {as === 'textarea' ? (
        <textarea
          id={inputId}
          name={inputName}
          className={sharedClasses}
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={inputId}
          name={inputName}
          className={sharedClasses}
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}