'use client';

import { CheckCircle2, KeyRound, Sparkles, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { type ModeloIaDTO, type ProvedorIaDTO, provedorDoModelo } from '@contratos/ia.contrato';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { CampoTexto, Selecao } from '@/compartilhado/ui/Campos';
import { DialogoConfirmacao } from '@/compartilhado/ui/DialogoConfirmacao';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { useIaStore } from '../store/use-ia-store';

const OPCOES_DE_MODELO: { valor: ModeloIaDTO; rotulo: string }[] = [
  { valor: 'claude-opus-5', rotulo: 'Anthropic · Claude Opus 5 — análise mais completa' },
  { valor: 'claude-sonnet-5', rotulo: 'Anthropic · Claude Sonnet 5 — mais econômico' },
  { valor: 'gemini-3.8-flash', rotulo: 'Google · Gemini 3.8 Flash — tem plano gratuito' },
  { valor: 'gemini-3.5-flash-lite', rotulo: 'Google · Gemini 3.5 Flash-Lite — mais leve, tem plano gratuito' },
  { valor: 'openrouter/free', rotulo: 'OpenRouter · Roteador gratuito — escolhe um modelo :free disponível' },
  { valor: 'nvidia/nemotron-3-super-120b-a12b:free', rotulo: 'OpenRouter · Nemotron 3 Super 120B — gratuito' },
  { valor: 'qwen/qwen3.8-27b:free', rotulo: 'OpenRouter · Qwen 3.8 27B — gratuito' },
  { valor: 'nex-agi/nex-n2.5-pro:free', rotulo: 'OpenRouter · Nex N2.5 Pro — gratuito' },
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
      'Custo por uso, na conta da chave: algo em torno de US$ 0,10 a 0,20 por análise com o Opus 5, e cerca de metade com o Sonnet 5.',
      'Use uma chave de um workspace próprio para o app, com limite de gasto mensal no Console.',
    ],
  },
  google: {
    nome: 'Google',
    placeholder: 'Chave do Google AI Studio',
    ondeCriar: 'Crie a chave no Google AI Studio (aistudio.google.com), em "Get API key".',
    avisos: [
      'No plano gratuito da API Gemini, o Google informa na página de preços que o conteúdo enviado é usado para melhorar os produtos dele. Avalie se isso é aceitável para os dados dos projetos; com faturamento ativado no projeto do Google, confira os termos do plano pago.',
      'O plano gratuito tem limites de uso por minuto e por dia: se várias pessoas analisarem ao mesmo tempo, algumas podem ter de tentar de novo.',
    ],
  },
  openrouter: {
    nome: 'OpenRouter',
    placeholder: 'sk-or-v1-…',
    ondeCriar: 'Crie a chave em openrouter.ai/settings/keys.',
    avisos: [
      'Os modelos gratuitos (":free") podem registrar e usar o conteúdo enviado para treinar os modelos, conforme a política de cada provedor. Avalie se isso é aceitável para os dados dos projetos.',
      'O plano gratuito tem limite de requisições por minuto e por dia (maior com créditos comprados na conta). Se o limite for atingido, a análise falha até o limite renovar.',
      'A qualidade varia entre os modelos gratuitos, e o roteador gratuito pode usar um modelo diferente a cada análise (o modelo usado aparece no relatório).',
    ],
  },
};

/** Seção "Inteligência artificial" da tela de Configurações (só administrador). */
export function ConfiguracaoIa() {
  const estado = useIaStore((store) => store.estado);
  const carregar = useIaStore((store) => store.carregar);
  const configurar = useIaStore((store) => store.configurar);
  const removerChave = useIaStore((store) => store.removerChave);

  const [chave, setChave] = useState('');
  const [modeloEscolhido, setModeloEscolhido] = useState<ModeloIaDTO | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState(false);

  useEffect(() => {
    carregar().catch((falha: unknown) => setErro(mensagemDeErro(falha)));
  }, [carregar]);

  const modelo = modeloEscolhido ?? estado?.modelo ?? 'claude-opus-5';
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
            Libera o botão <strong>Analisar com IA</strong> nos cronogramas, para todos os usuários, com o
            provedor e a chave escolhidos aqui.
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
            Cada análise envia ao provedor ({dados.nome}) as atividades, datas, percentuais e nomes dos
            responsáveis do cronograma. A evidência das tarefas não é enviada. Confira se a política da
            empresa permite.
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
