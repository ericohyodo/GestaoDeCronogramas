import clsx from 'clsx';
import { CircleAlert, X } from 'lucide-react';

interface PropsMensagemErro {
  mensagem: string;
  aoFechar?: () => void;
  className?: string;
}

export function MensagemErro({ mensagem, aoFechar, className }: PropsMensagemErro) {
  return (
    <div
      role="alert"
      className={clsx(
        'etiqueta tom-perigo flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-sm',
        className,
      )}
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1">{mensagem}</p>
      {aoFechar && (
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Dispensar mensagem"
          className="rounded p-0.5 opacity-70 hover:opacity-100"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}
