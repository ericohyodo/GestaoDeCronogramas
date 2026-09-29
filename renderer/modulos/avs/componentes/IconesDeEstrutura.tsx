import type { TipoNoEstruturaDTO } from '@contratos/avs.contrato';

/**
 * Ícones próprios de cada tipo de item da estrutura do produto, no estilo das árvores de montagem de CAD:
 * conjunto (cubos empilhados, laranja), componente (cubo, verde), matéria-prima (barras metálicas empilhadas, cinza), embalagem (caixa, marrom) e insumo (gota, azul).
 */
export function IconeDeEstrutura({ tipo, className = 'size-5' }: { tipo: TipoNoEstruturaDTO; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={`shrink-0 ${className}`} fill="none" strokeLinejoin="round" strokeLinecap="round">
      {tipo === 'conjunto' && (
        <>
          <path d="M4 11l6 3 6-3v3l-6 3-6-3z" fill="#e39a2d" stroke="#a5690f" strokeWidth="1" />
          <path d="M10 2l6 3v6l-6 3-6-3V5z" fill="#f4bb5b" stroke="#a5690f" strokeWidth="1" />
          <path d="M4 5l6 3 6-3M10 8v6" stroke="#a5690f" strokeWidth="1" />
        </>
      )}
      {tipo === 'componente' && (
        <>
          <path d="M10 3l6 3.2v6.6L10 16l-6-3.2V6.2z" fill="#62c06f" stroke="#2c8a3c" strokeWidth="1" />
          <path d="M4 6.2l6 3.3 6-3.3M10 9.5V16" stroke="#2c8a3c" strokeWidth="1" />
          <path d="M10 3l6 3.2-6 3.3-6-3.3z" fill="#8fd99a" stroke="#2c8a3c" strokeWidth="1" />
        </>
      )}
      {tipo === 'materia_prima' && (
        <>
          <path d="M2.5 15.5l3.2-3.2h8.6l3.2 3.2z" fill="#9aa6b2" stroke="#5d6975" strokeWidth="1" />
          <path d="M5.7 12.3l2.6-3.3h4.4l2.6 3.3z" fill="#c3ccd5" stroke="#5d6975" strokeWidth="1" />
          <path d="M8.3 9l1.7-3.5L11.7 9z" fill="#e4e9ee" stroke="#5d6975" strokeWidth="1" />
          <path d="M2.5 15.5h15" stroke="#5d6975" strokeWidth="1" />
        </>
      )}
      {tipo === 'embalagem' && (
        <>
          <path d="M3 8l7-3 7 3v7l-7 3-7-3z" fill="#cf9b62" stroke="#875829" strokeWidth="1" />
          <path d="M3 8l7 3 7-3M10 11v7" stroke="#875829" strokeWidth="1" />
          <path d="M6.6 6.5l7 3" stroke="#f6e7bd" strokeWidth="1.8" />
        </>
      )}
      {tipo === 'insumo' && (
        <>
          <path d="M10 2.5c3.1 3.8 5.1 6.3 5.1 8.9a5.1 5.1 0 0 1-10.2 0c0-2.6 2-5.1 5.1-8.9z" fill="#5eaae8" stroke="#2a6db0" strokeWidth="1" />
          <path d="M7.6 12.2a2.5 2.5 0 0 0 2.1 2.2" stroke="#ffffff" strokeWidth="1.2" />
        </>
      )}
    </svg>
  );
}
