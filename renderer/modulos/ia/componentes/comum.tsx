import { FileDown, History, KeyRound, Loader2, RefreshCw } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import type { GravidadeDTO, ProvedorIaDTO, SaudeDoCronogramaDTO } from '@contratos/ia.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import type { Tom } from '@/compartilhado/ui/Etiqueta';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { RodapeModal } from '@/compartilhado/ui/Modal';

export const SAUDE: Record<SaudeDoCronogramaDTO, { rotulo: string; tom: Tom }> = {
  no_prazo: { rotulo: 'No prazo', tom: 'sucesso' },
  atencao: { rotulo: 'Atenção', tom: 'alerta' },
  critico: { rotulo: 'Crítico', tom: 'perigo' },
};

export const GRAVIDADE: Record<GravidadeDTO, { rotulo: string; tom: Tom }> = {
  alta: { rotulo: 'Alta', tom: 'perigo' },
  media: { rotulo: 'Média', tom: 'alerta' },
  baixa: { rotulo: 'Baixa', tom: 'neutro' },
};

const NOME_DO_MODELO: Record<string, string> = {
  'claude-opus-5': 'Claude Opus 5',
  'claude-sonnet-5': 'Claude Sonnet 5',
  'gemini-3.8-flash': 'Gemini 3.8 Flash',
  'gemini-3.5-flash-lite': 'Gemini 3.5 Flash-Lite',
  'openrouter/free': 'OpenRouter (roteador gratuito)',
  'nvidia/nemotron-3-super-120b-a12b:free': 'Nemotron 3 Super 120B (OpenRouter)',
  'qwen/qwen3.8-27b:free': 'Qwen 3.8 27B (OpenRouter)',
  'nex-agi/nex-n2.5-pro:free': 'Nex N2.5 Pro (OpenRouter)',
};

export const DESTINO_DOS_DADOS: Record<ProvedorIaDTO, string> = {
  anthropic: 'à Anthropic',
  google: 'ao Google',
  openrouter: 'ao OpenRouter e ao provedor do modelo gratuito',
};

export function nomeDoModelo(modelo: string): string {
  return NOME_DO_MODELO[modelo] ?? modelo;
}

export function dataEHora(iso: string): string {
  const data = new Date(iso);
  const dia = data.toLocaleDateString('pt-BR');
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} às ${hora}`;
}

/** "24/09/2026 às 10:56 · Gemini 3.5 Flash-Lite · por Érico" */
export function descricaoDaGeracao(analise: { geradaEm: string; modelo: string; geradaPor: string | null }): string {
  const partes = [dataEHora(analise.geradaEm), nomeDoModelo(analise.modelo)];
  if (analise.geradaPor) partes.push(`por ${analise.geradaPor}`);
  return partes.join(' · ');
}

/** Pergunta onde salvar, gera o PDF da análise e o abre. */
export function useExportarPdfDaAnalise() {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const exportar = async (analiseId: string) => {
    setGerando(true);
    setErro(null);
    try {
      await clienteDesktop.impressao.exportarAnalisePdf(analiseId);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setGerando(false);
    }
  };
  return { exportar, gerando, erro, limparErro: () => setErro(null) };
}

export function IaNaoConfigurada() {
  return (
    <EstadoVazio
      icone={KeyRound}
      titulo="A IA ainda não foi configurada"
      descricao="Peça ao administrador para informar a chave da API em Configurações."
    />
  );
}

export function Analisando({ provedor, oQueVai }: { provedor: ProvedorIaDTO | undefined; oQueVai: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Loader2 aria-hidden className="size-7 animate-spin text-primaria" />
      <p className="text-sm font-medium">Analisando…</p>
      <p className="max-w-sm text-xs text-texto-sutil">
        Pode levar até 1 minuto. {oQueVai} são enviados {DESTINO_DOS_DADOS[provedor ?? 'anthropic']} para a
        análise; a evidência das tarefas não é enviada.
      </p>
    </div>
  );
}

export function FalhaNaAnalise({
  mensagem,
  aoTentarDeNovo,
  aoFechar,
}: {
  mensagem: string;
  aoTentarDeNovo: () => void;
  aoFechar: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <MensagemErro mensagem={mensagem || 'Não foi possível gerar a análise.'} />
      <RodapeModal>
        <Botao variante="fantasma" onClick={aoFechar}>
          Fechar
        </Botao>
        <Botao variante="primario" icone={RefreshCw} onClick={aoTentarDeNovo}>
          Tentar de novo
        </Botao>
      </RodapeModal>
    </div>
  );
}

export const AVISO_DA_IA =
  'Análise gerada por IA a partir dos dados do app. Confira antes de tomar decisões; nada foi alterado.';

/** Corpo rolável + rodapé fixo com "Exportar PDF" e "Gerar nova análise". */
export function MolduraDoRelatorio({
  children,
  analiseId,
  aviso,
  aoGerarDeNovo,
  aoFechar,
}: {
  children: ReactNode;
  analiseId: string;
  /** Ex.: a análise salva é de outro dia. */
  aviso?: string | null;
  aoGerarDeNovo: () => void;
  aoFechar: () => void;
}) {
  const pdf = useExportarPdfDaAnalise();
  return (
    <div className="flex flex-col">
      {aviso && (
        <p className="etiqueta tom-alerta mb-3 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-xs">
          <History aria-hidden className="mt-px size-3.5 shrink-0" />
          {aviso}
        </p>
      )}
      <div className="-mx-6 max-h-[58vh] overflow-y-auto px-6">
        {children}
        <p className="mt-4 text-xs text-texto-sutil">{AVISO_DA_IA}</p>
      </div>
      {pdf.erro && (
        <div className="mt-3">
          <MensagemErro mensagem={pdf.erro} aoFechar={pdf.limparErro} />
        </div>
      )}
      <RodapeModal>
        <Botao variante="fantasma" onClick={aoFechar}>
          Fechar
        </Botao>
        <Botao icone={FileDown} onClick={() => void pdf.exportar(analiseId)} disabled={pdf.gerando}>
          {pdf.gerando ? 'Gerando PDF…' : 'Exportar PDF'}
        </Botao>
        <Botao icone={RefreshCw} onClick={aoGerarDeNovo}>
          Gerar nova análise
        </Botao>
      </RodapeModal>
    </div>
  );
}

export function Secao({
  titulo,
  vazio,
  quantidade,
  children,
}: {
  titulo: string;
  vazio: string;
  quantidade: number;
  children: ReactNode;
}) {
  return (
    <section className="mt-5">
      <h3 className="border-b border-borda/70 pb-1.5 text-xs font-semibold uppercase tracking-wider text-texto-sutil">
        {titulo}
      </h3>
      {quantidade === 0 ? (
        <p className="py-2.5 text-sm text-texto-sutil">{vazio}</p>
      ) : (
        <ul className="divide-y divide-borda/50">{children}</ul>
      )}
    </section>
  );
}

/** Chips com números de tarefas ("4.7") ou nomes de projetos. */
export function Marcadores({ itens }: { itens: string[] }) {
  if (itens.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {itens.map((item) => (
        <span
          key={item}
          className="rounded-md border border-borda px-1.5 text-[11px] font-medium tabular-nums text-texto-secundario"
        >
          {item}
        </span>
      ))}
    </div>
  );
}
