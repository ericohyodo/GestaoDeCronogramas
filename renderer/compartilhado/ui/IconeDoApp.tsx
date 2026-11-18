import clsx from 'clsx';

/**
 * Ícone do app ("Etapas": AV → SD → PRO), o mesmo do executável (recursos/icone.svg), para a barra de título
 * e a tela de login. As cores são fixas: é a marca, igual no tema claro e no escuro.
 * @param className tamanho (ex.: `size-6`)
 */
export function IconeDoApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" aria-hidden className={clsx('shrink-0', className)}>
      <rect width="256" height="256" rx="56" fill="#14305c" />
      <path d="M58 84 L98 128 L58 172" fill="none" stroke="#ffffff" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M114 84 L154 128 L114 172" fill="none" stroke="#7aa6e2" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M170 84 L210 128 L170 172" fill="none" stroke="#2dd4bf" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
