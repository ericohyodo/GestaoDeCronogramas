/**
 * Manchas desfocadas de baixa saturação que dão ao vidro algo para "refratar".
 * Ocultas quando a janela usa Acrylic nativo (o desktop desfocado faz esse papel).
 */
export function FundoDecorativo() {
  return (
    <div aria-hidden className="fundo-decorativo pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -left-40 -top-48 size-[36rem] rounded-full blur-3xl"
        style={{ background: 'var(--mancha-1)' }}
      />
      <div
        className="absolute -bottom-56 -right-40 size-[42rem] rounded-full blur-3xl"
        style={{ background: 'var(--mancha-2)' }}
      />
      <div
        className="absolute left-[45%] top-[35%] size-[26rem] rounded-full blur-3xl"
        style={{ background: 'var(--mancha-1)' }}
      />
    </div>
  );
}
