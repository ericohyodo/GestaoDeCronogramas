'use client';

import clsx from 'clsx';
import { Eraser, Loader2, MessageSquareText, SendHorizonal } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  LIMITE_DE_CARACTERES_DA_PERGUNTA,
  LIMITE_DE_MENSAGENS_DO_CHAT,
  type MensagemDoChatDTO,
} from '@contratos/ia.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { useIaStore } from '../store/use-ia-store';
import { DESTINO_DOS_DADOS, IaNaoConfigurada, nomeDoModelo } from './comum';

const SUGESTOES = [
  'Quais tarefas estão atrasadas, por projeto?',
  'O que vence nos próximos 14 dias e quem é o responsável?',
  'Quais responsáveis estão com mais tarefas em aberto?',
  'Quais tarefas foram concluídas com atraso?',
];

/** Uma fala na tela; a da IA guarda também o modelo que respondeu. */
type Fala = MensagemDoChatDTO & { modelo?: string };

/**
 * Chat de perguntas e respostas sobre todos os cronogramas em andamento. Só consulta: não altera
 * nada. A conversa fica só na tela (não é gravada) e some ao sair ou ao iniciar uma nova.
 */
export function ChatIa() {
  const estado = useIaStore((store) => store.estado);
  const carregar = useIaStore((store) => store.carregar);

  const [falas, setFalas] = useState<Fala[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroDeCarga, setErroDeCarga] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    carregar().catch((falha: unknown) => setErroDeCarga(mensagemDeErro(falha)));
  }, [carregar]);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [falas, enviando]);

  const perguntar = async (pergunta: string) => {
    const limpa = pergunta.trim();
    if (!limpa || enviando) return;

    const historico: Fala[] = [...falas, { papel: 'usuario', texto: limpa }];
    setFalas(historico);
    setTexto('');
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await clienteDesktop.ia.conversar({
        mensagens: historico
          .slice(-LIMITE_DE_MENSAGENS_DO_CHAT)
          .map(({ papel, texto: conteudo }) => ({ papel, texto: conteudo })),
      });
      setFalas([...historico, { papel: 'ia', texto: resposta.texto, modelo: resposta.modelo }]);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      // A pergunta volta para a caixa, para tentar de novo sem digitar tudo outra vez.
      setFalas(falas);
      setTexto(limpa);
    } finally {
      setEnviando(false);
    }
  };

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    void perguntar(texto);
  };

  const aoTeclar = (evento: KeyboardEvent<HTMLTextAreaElement>) => {
    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault();
      void perguntar(texto);
    }
  };

  const destino = estado ? DESTINO_DOS_DADOS[estado.provedor] : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 p-6">
      <CabecalhoPagina
        titulo="Chat com IA"
        descricao="Pergunte sobre os cronogramas em andamento: prazos, atrasos, responsáveis, datas efetivas. A IA só consulta; nada é alterado."
        acoes={
          <Botao
            icone={Eraser}
            onClick={() => {
              setFalas([]);
              setErro(null);
            }}
            disabled={falas.length === 0 || enviando}
          >
            Nova conversa
          </Botao>
        }
      />

      {erroDeCarga && <MensagemErro mensagem={erroDeCarga} aoFechar={() => setErroDeCarga(null)} />}

      {estado && !estado.configurada ? (
        <PainelVidro>
          <IaNaoConfigurada />
        </PainelVidro>
      ) : (
        <PainelVidro className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5" aria-live="polite">
            {falas.length === 0 ? (
              <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-8">
                <EstadoVazio
                  icone={MessageSquareText}
                  titulo="Faça uma pergunta"
                  descricao="A IA responde com base nas atividades, datas, percentuais e responsáveis de todos os cronogramas em andamento."
                />
                <ul className="flex flex-wrap justify-center gap-2">
                  {SUGESTOES.map((sugestao) => (
                    <li key={sugestao}>
                      <button
                        type="button"
                        onClick={() => void perguntar(sugestao)}
                        disabled={enviando || !estado}
                        className="rounded-full border border-borda px-3 py-1.5 text-xs text-texto-secundario transition-colors hover:border-primaria hover:text-primaria disabled:opacity-50"
                      >
                        {sugestao}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ol className="mx-auto flex max-w-3xl flex-col gap-4">
                {falas.map((fala, indice) => (
                  <li key={indice} className={clsx('flex', fala.papel === 'usuario' && 'justify-end')}>
                    <div
                      className={clsx(
                        'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                        fala.papel === 'usuario' ? 'bg-primaria text-sobre-primaria' : 'bg-texto/5',
                      )}
                    >
                      {fala.texto}
                      {fala.modelo && (
                        <p className="mt-1.5 text-[11px] text-texto-sutil">{nomeDoModelo(fala.modelo)}</p>
                      )}
                    </div>
                  </li>
                ))}
                {enviando && (
                  <li className="flex items-center gap-2 text-xs text-texto-sutil">
                    <Loader2 aria-hidden className="size-4 animate-spin text-primaria" />
                    Consultando os cronogramas… pode levar até 1 minuto.
                  </li>
                )}
              </ol>
            )}
            <div ref={fim} />
          </div>

          <form onSubmit={enviar} className="border-t border-borda/60 p-4">
            {erro && (
              <div className="mx-auto mb-3 max-w-3xl">
                <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />
              </div>
            )}
            <div className="mx-auto flex max-w-3xl items-end gap-2">
              <textarea
                value={texto}
                onChange={(evento) => setTexto(evento.target.value)}
                onKeyDown={aoTeclar}
                rows={2}
                maxLength={LIMITE_DE_CARACTERES_DA_PERGUNTA}
                placeholder="Escreva sua pergunta (Enter envia, Shift + Enter quebra a linha)"
                aria-label="Pergunta para a IA"
                disabled={enviando}
                className="min-h-[3.25rem] flex-1 resize-none rounded-xl border border-borda bg-superficie-solida/70 px-3 py-2 text-sm outline-none focus:border-primaria focus:ring-3 focus:ring-primaria/20 disabled:opacity-60"
              />
              <Botao type="submit" variante="primario" icone={SendHorizonal} disabled={enviando || !texto.trim() || !estado}>
                Enviar
              </Botao>
            </div>
            {destino && (
              <p className="mx-auto mt-2 max-w-3xl text-[11px] text-texto-sutil">
                A cada pergunta, as atividades, datas, percentuais e responsáveis dos cronogramas em andamento são
                enviados {destino}; a evidência das tarefas não é enviada. Confira as respostas antes de decidir.
              </p>
            )}
          </form>
        </PainelVidro>
      )}
    </div>
  );
}
