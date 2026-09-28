import type {
  AnaliseArquivadaDTO,
  AnaliseCronogramaDTO,
  AnalisePortfolioDTO,
} from '@contratos/ia.contrato';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { descricaoDaGeracao, GRAVIDADE, Marcadores, SAUDE, Secao } from './comum';

/** Conteúdo do relatório, igual no modal, no arquivo e no PDF. */
export function RelatorioDaAnalise({ arquivada }: { arquivada: AnaliseArquivadaDTO }) {
  return arquivada.tipo === 'cronograma' ? (
    <RelatorioCronograma analise={arquivada.analise} />
  ) : (
    <RelatorioPortfolio analise={arquivada.analise} />
  );
}

export function RelatorioCronograma({ analise }: { analise: AnaliseCronogramaDTO }) {
  const saude = SAUDE[analise.saude];
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Etiqueta tom={saude.tom}>{saude.rotulo}</Etiqueta>
        <span className="text-xs text-texto-sutil">{descricaoDaGeracao(analise)}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed">{analise.resumo}</p>

      <Secao titulo="Riscos" vazio="Nenhum risco relevante apontado." quantidade={analise.riscos.length}>
        {analise.riscos.map((risco, indice) => (
          <li key={indice} className="flex flex-col gap-1 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta tom={GRAVIDADE[risco.gravidade].tom}>{GRAVIDADE[risco.gravidade].rotulo}</Etiqueta>
              <span className="text-sm font-medium">{risco.titulo}</span>
            </div>
            <p className="text-sm text-texto-secundario">{risco.detalhe}</p>
            <Marcadores itens={risco.tarefas} />
          </li>
        ))}
      </Secao>

      <Secao titulo="Gargalos por responsável" vazio="Nenhum gargalo apontado." quantidade={analise.gargalos.length}>
        {analise.gargalos.map((gargalo, indice) => (
          <li key={indice} className="py-2.5 text-sm">
            <span className="font-medium">{gargalo.responsavel}</span>
            <span className="text-texto-secundario"> — {gargalo.motivo}</span>
          </li>
        ))}
      </Secao>

      <Secao titulo="Sugestões" vazio="Nenhuma sugestão." quantidade={analise.sugestoes.length}>
        {analise.sugestoes.map((sugestao, indice) => (
          <li key={indice} className="flex flex-col gap-1 py-2.5">
            <span className="text-sm font-medium">{sugestao.acao}</span>
            <p className="text-sm text-texto-secundario">{sugestao.justificativa}</p>
            <Marcadores itens={sugestao.tarefas} />
          </li>
        ))}
      </Secao>
    </>
  );
}

export function RelatorioPortfolio({ analise }: { analise: AnalisePortfolioDTO }) {
  const saude = SAUDE[analise.saude];
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Etiqueta tom={saude.tom}>{saude.rotulo}</Etiqueta>
        <span className="text-xs text-texto-sutil">
          {analise.quantidadeDeProjetos} {analise.quantidadeDeProjetos === 1 ? 'projeto' : 'projetos'} ·{' '}
          {descricaoDaGeracao(analise)}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed">{analise.resumo}</p>

      <Secao titulo="Projetos" vazio="Nenhum projeto comentado." quantidade={analise.projetos.length}>
        {analise.projetos.map((projeto) => (
          <li key={projeto.nome} className="flex flex-col gap-1 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta tom={SAUDE[projeto.saude].tom}>{SAUDE[projeto.saude].rotulo}</Etiqueta>
              <span className="text-sm font-medium">{projeto.nome}</span>
            </div>
            <p className="text-sm text-texto-secundario">{projeto.comentario}</p>
          </li>
        ))}
      </Secao>

      <Secao
        titulo="Conflitos de recursos"
        vazio="Nenhum conflito de recursos apontado."
        quantidade={analise.conflitosDeRecursos.length}
      >
        {analise.conflitosDeRecursos.map((conflito, indice) => (
          <li key={indice} className="flex flex-col gap-1 py-2.5">
            <p className="text-sm">
              <span className="font-medium">{conflito.responsavel}</span>
              <span className="text-texto-secundario"> — {conflito.motivo}</span>
            </p>
            <Marcadores itens={conflito.projetos} />
          </li>
        ))}
      </Secao>

      <Secao titulo="Riscos do portfólio" vazio="Nenhum risco relevante apontado." quantidade={analise.riscos.length}>
        {analise.riscos.map((risco, indice) => (
          <li key={indice} className="flex flex-col gap-1 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta tom={GRAVIDADE[risco.gravidade].tom}>{GRAVIDADE[risco.gravidade].rotulo}</Etiqueta>
              <span className="text-sm font-medium">{risco.titulo}</span>
            </div>
            <p className="text-sm text-texto-secundario">{risco.detalhe}</p>
            <Marcadores itens={risco.projetos} />
          </li>
        ))}
      </Secao>

      <Secao titulo="Prioridades" vazio="Nenhuma prioridade apontada." quantidade={analise.prioridades.length}>
        {analise.prioridades.map((prioridade, indice) => (
          <li key={indice} className="flex flex-col gap-1 py-2.5">
            <span className="text-sm font-medium">{prioridade.acao}</span>
            <p className="text-sm text-texto-secundario">{prioridade.justificativa}</p>
            <Marcadores itens={prioridade.projetos} />
          </li>
        ))}
      </Secao>
    </>
  );
}
