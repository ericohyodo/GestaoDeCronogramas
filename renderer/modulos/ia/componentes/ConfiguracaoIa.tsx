'use client';

import { CheckCircle2, KeyRound, Sparkles, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import {
  type EscopoIaDTO,
  MODELO_PADRAO,
  type ModeloIaDTO,
  type ProvedorIaDTO,
  provedorDoModelo,
} from '@contratos/ia.contrato';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { CampoTexto, Selecao } from '@/compartilhado/ui/Campos';
import { DialogoConfirmacao } from '@/compartilhado/ui/DialogoConfirmacao';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { usarStoreIa } from '../store/use-ia-store';

const OPCOES_DE_MODELO: { valor: ModeloIaDTO; rotulo: string }[] = [
  { valor: 'claude-opus-5-5', rotulo: 'Anthropic · Claude Opus 5.5 — análise mais completa' },
  { valor: 'claude-sonnet-5-5', rotulo: 'Anthropic · Claude Sonnet 5.5 — equilíbrio entre qualidade e custo' },
  { valor: 'claude-haiku-5-5', rotulo: 'Anthropic · Claude Haiku 5.5 — mais rápido e econômico' },
  { valor: 'claude-opus-5', rotulo: 'Anthropic · Claude Opus 5 — geração anterior do Opus' },
  { valor: 'claude-sonnet-5', rotulo: 'Anthropic · Claude Sonnet 5 — geração anterior do Sonnet' },
];

const PROVEDOR: Record<
  ProvedorIaDTO,
  { nome: string; placeholder: string; ondeCriar: string; avisos: string[] }
> = {
  anthropic: {
    nome: 'Anthropic',
    placeholder: 'sk-ant-…',
    ondeCriar: 'Crie a chave no Console da Anthropic (console.anthropic.com), em API Keys.',
    avisos: [
      'Custo por uso, na conta da chave: algo em torno de US$ 0,08 a 0,16 por análise com o Opus 5.5 (US$ 0,10 a 0,20 com o Opus 5), cerca de metade com os Sonnet e bem menos com o Haiku 5.5.',
      'Use uma chave de um workspace próprio para o app, com limite de gasto mensal no Console.',
    ],
  },
};

/** Seção "Inteligência artificial" da tela de Configurações (só administrador). */
export function ConfiguracaoIa({ escopo = 'projetos' }: { escopo?: EscopoIaDTO }) {
  const usarStore = usarStoreIa(escopo);
  const estado = usarStore((store) => store.estado);
  const carregar = usarStore((store) => store.carregar);
  const configurar = usarStore((store) => store.configurar);
  const removerChave = usarStore((store) => store.removerChave);

  const [chave, setChave] = useState('');
  const [modeloEscolhido, setModeloEscolhido] = useState<ModeloIaDTO | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState(false);

  useEffect(() => {
    carregar().catch((falha: unknown) => setErro(mensagemDeErro(falha)));
  }, [carregar]);

  const modelo = modeloEscolhido ?? estado?.modelo ?? MODELO_PADRAO;
  const provedor = provedorDoModelo(modelo);
  const dados = PROVEDOR[provedor];
  const finalDaChave = estado?.chaves[provedor] ?? null;
  const emUso = estado?.configurada && estado.modelo === modelo;

  const salvar = async (evento: FormEvent) => {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    setSucesso(null);
    try {
      await configurar({ chave: chave.trim() || undefined, modelo });
      setChave('');
      setModeloEscolhido(null);
      setSucesso('Configuração testada e salva. A análise com IA já está disponível para todos.');
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <PainelVidro className="p-6">
      <header className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primaria/10 text-primaria">
          <Sparkles aria-hidden className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Inteligência artificial</h2>
          <p className="mt-0.5 text-sm text-texto-secundario">
            {escopo === 'avs' ? (
              <>
                Libera a <strong>Análise com IA</strong> e o <strong>Chat</strong> do módulo de AVs, para todos os
                usuários. O modelo escolhido vale só para as AVs; as chaves de API de cada provedor são as mesmas do
                módulo de Projetos.
              </>
            ) : (
              <>
                Libera o botão <strong>Analisar com IA</strong> nos cronogramas, para todos os usuários, com o
                provedor e a chave escolhidos aqui.
              </>
            )}
          </p>
        </div>
      </header>

      <p className="mt-4 flex items-center gap-2 text-sm">
        {estado?.configurada ? (
          <>
            <CheckCircle2 aria-hidden className="size-4 text-sucesso" />
            Em uso: {OPCOES_DE_MODELO.find((opcao) => opcao.valor === estado.modelo)?.rotulo ?? estado.modelo}
          </>
        ) : (
          <>
            <KeyRound aria-hidden className="size-4 text-texto-sutil" />
            <span className="text-texto-secundario">Ainda não configurada</span>
          </>
        )}
      </p>

      <form onSubmit={salvar} className="mt-4 grid max-w-xl gap-4">
        <Selecao
          rotulo="Provedor e modelo"
          value={modelo}
          onChange={(evento) => {
            setModeloEscolhido(evento.target.value as ModeloIaDTO);
            setChave('');
            setSucesso(null);
          }}
          opcoes={OPCOES_DE_MODELO}
        />
        <CampoTexto
          rotulo={`Chave da API (${dados.nome})`}
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={chave}
          onChange={(evento) => setChave(evento.target.value)}
          placeholder={
            finalDaChave ? `Salva (termina em ${finalDaChave}); deixe em branco para mantê-la` : dados.placeholder
          }
          dica={dados.ondeCriar}
        />

        {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}
        {sucesso && (
          <p className="flex items-center gap-2 text-sm text-sucesso">
            <CheckCircle2 aria-hidden className="size-4" />
            {sucesso}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Botao type="submit" variante="primario" disabled={salvando || (!chave.trim() && !finalDaChave)}>
            {salvando ? 'Testando…' : emUso && !chave.trim() ? 'Testar de novo' : 'Testar e salvar'}
          </Botao>
          {emUso && (
            <Botao variante="fantasma" icone={Trash2} onClick={() => setRemovendo(true)} disabled={salvando}>
              Remover chave
            </Botao>
          )}
        </div>
      </form>

      <div className="mt-6 max-w-xl rounded-xl border border-borda-vidro bg-texto/3 px-4 py-3 text-xs leading-relaxed text-texto-secundario">
        <p className="font-medium text-texto">Antes de ativar</p>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          <li>
            {escopo === 'avs'
              ? `Cada análise ou pergunta envia ao provedor (${dados.nome}) o resumo das AVs: cliente, descrição, etapa, prazo, responsável, classificação do produto e valores consolidados. Confira se a política da empresa permite.`
              : `Cada análise envia ao provedor (${dados.nome}) as atividades, datas, percentuais e nomes dos responsáveis do cronograma. A evidência das tarefas não é enviada. Confira se a política da empresa permite.`}
          </li>
          {dados.avisos.map((aviso) => (
            <li key={aviso}>{aviso}</li>
          ))}
          <li>
            O app fica numa pasta compartilhada: a chave é guardada cifrada no banco, mas quem tem o app
            pode, com esforço, extraí-la. Não use uma chave pessoal com cartão sem limite, e troque-a aqui
            se precisar.
          </li>
        </ul>
      </div>

      <DialogoConfirmacao
        aberto={removendo}
        titulo="Remover chave da API"
        mensagem="A análise com IA fica indisponível para todos até uma nova chave ser informada."
        rotuloConfirmar="Remover"
        aoConfirmar={async () => {
          await removerChave();
          setSucesso(null);
        }}
        aoFechar={() => setRemovendo(false)}
      />
    </PainelVidro>
  );
}
