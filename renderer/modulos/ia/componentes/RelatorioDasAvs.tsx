import type { AnaliseAvsDTO } from '@contratos/ia.contrato';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { descricaoDaGeracao, SAUDE } from './comum';

/** Seções que a IA devolve, na ordem em que aparecem (as instruções fixas pedem exatamente estes títulos). */
const SECOES = ['RESUMO', 'PONTOS DE ATENÇÃO', 'GARGALOS', 'PRÓXIMAS AÇÕES'] as const;
type Secao = (typeof SECOES)[number];

/** Separa o texto nas seções conhecidas; o que vier antes da primeira vira "RESUMO". */
export function separarSecoes(texto: string): Partial<Record<Secao, string[]>> {
  const resultado: Partial<Record<Secao, string[]>> = {};
  let atual: Secao = 'RESUMO';
  for (const linhaBruta of texto.split('\n')) {
    const linha = linhaBruta.trim();
    if (!linha) continue;
    const cabecalho = SECOES.find((secao) => linha.toUpperCase().replace(/[*#:\s]+$/g, '').replace(/^[*#\s]+/, '') === secao);
    if (cabecalho) {
      atual = cabecalho;
      resultado[atual] ??= [];
      continue;
    }
    (resultado[atual] ??= []).push(linha);
  }
  return resultado;
}

/** Conteúdo da análise de AVs, igual no modal, no arquivo e no PDF. */
export function RelatorioDasAvs({ analise }: { analise: AnaliseAvsDTO }) {
  const saude = SAUDE[analise.saude];
  const secoes = separarSecoes(analise.texto);
  const resumo = secoes.RESUMO?.join(' ') ?? '';

  return (
    <div className="selecionavel">
      <div className="flex flex-wrap items-center gap-2">
        <Etiqueta tom={saude.tom}>{saude.rotulo}</Etiqueta>
        <span className="text-xs text-texto-sutil">
          {analise.quantidadeDeAvs} AV(s) · {descricaoDaGeracao(analise)}
        </span>
      </div>
      {resumo && <p className="mt-3 text-sm leading-relaxed">{resumo}</p>}

      {SECOES.filter((secao) => secao !== 'RESUMO').map((secao) => {
        const linhas = secoes[secao] ?? [];
        return (
          <section key={secao} className="mt-5">
            <h3 className="border-b border-borda/70 pb-1.5 text-xs font-semibold uppercase tracking-wider text-texto-sutil">
              {secao}
            </h3>
            {linhas.length === 0 ? (
              <p className="py-2.5 text-sm text-texto-sutil">Nada apontado.</p>
            ) : (
              <ul className="divide-y divide-borda/50">
                {linhas.map((linha, indice) => (
                  <li key={indice} className="py-2 text-sm leading-relaxed">
                    {linha.replace(/^[-•*]\s*/, '')}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
