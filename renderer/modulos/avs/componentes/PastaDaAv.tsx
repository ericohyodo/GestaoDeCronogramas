'use client';

import { ExternalLink, File, Folder, FolderOpen, FolderPlus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { AvDetalheDTO, ConteudoDaPastaDTO } from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { formatarDataHora, formatarTamanho } from '@/compartilhado/formatacao';
import { Botao, BotaoIcone } from '@/compartilhado/ui/Botao';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal } from '@/compartilhado/ui/Modal';
import { useAvsStore } from '../store/use-avs-store';

/**
 * Pasta da AV no Windows, no cabeçalho da AV: "Arquivos da AV" abre a lista do que há na pasta (e-mails,
 * desenhos, orçamentos do Comercial). Sem pasta, oferece criar.
 */
export function PastaDaAv({ av }: { av: AvDetalheDTO }) {
  const carregarUm = useAvsStore((estado) => estado.carregarUm);
  const [aberto, setAberto] = useState(false);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const criar = async () => {
    setCriando(true);
    setErro(null);
    try {
      await clienteDesktop.avs.criarPasta(av.id);
      await carregarUm(av.id);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setCriando(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {av.pasta ? (
        <Botao tamanho="sm" icone={FolderOpen} onClick={() => setAberto(true)} title={av.pasta}>
          Arquivos da AV
        </Botao>
      ) : (
        <Botao tamanho="sm" icone={FolderPlus} onClick={() => void criar()} disabled={criando}>
          {criando ? 'Criando pasta…' : 'Criar pasta da AV'}
        </Botao>
      )}
      {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}
      <Modal
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo={`Arquivos da ${av.numero}`}
        descricao={av.pasta ?? undefined}
        largura="lg"
      >
        {aberto && <ConteudoDaPasta av={av} aoRecriar={() => void criar()} />}
      </Modal>
    </div>
  );
}

/** Lista o que há na pasta; clique abre o item no programa padrão do Windows. */
function ConteudoDaPasta({ av, aoRecriar }: { av: AvDetalheDTO; aoRecriar: () => void }) {
  const [conteudo, setConteudo] = useState<ConteudoDaPastaDTO | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let cancelado = false;
    clienteDesktop.avs
      .listarArquivosDaPasta(av.id)
      .then((lido) => !cancelado && setConteudo(lido))
      .catch((falha: unknown) => !cancelado && setErro(mensagemDeErro(falha)));
    return () => {
      cancelado = true;
    };
  }, [av.id, recarga]);

  const abrir = useCallback(
    async (caminhoRelativo: string | null) => {
      setErro(null);
      try {
        await clienteDesktop.avs.abrirDaPasta({ avId: av.id, caminhoRelativo });
      } catch (falha) {
        setErro(mensagemDeErro(falha));
      }
    },
    [av.id],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-2">
        <BotaoIcone icone={RefreshCw} rotulo="Atualizar lista" onClick={() => setRecarga((n) => n + 1)} />
        <Botao tamanho="sm" icone={ExternalLink} onClick={() => void abrir(null)} disabled={conteudo?.existe === false}>
          Abrir no Explorer
        </Botao>
      </div>
      {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}
      {conteudo === null ? (
        !erro && <p className="text-sm text-texto-secundario">Lendo a pasta…</p>
      ) : !conteudo.existe ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-borda p-4 text-sm">
          <p>A pasta não foi encontrada ou não está acessível agora (rede fora do ar?).</p>
          <Botao tamanho="sm" icone={FolderPlus} onClick={aoRecriar}>
            Criar a pasta de novo
          </Botao>
        </div>
      ) : conteudo.itens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-borda px-3 py-6 text-center text-sm text-texto-secundario">
          A pasta está vazia.
        </p>
      ) : (
        <ul className="flex max-h-[55dvh] flex-col overflow-y-auto rounded-lg border border-borda/60">
          {conteudo.itens.map((item) => (
            <li key={item.caminhoRelativo}>
              <button
                type="button"
                onClick={() => void abrir(item.caminhoRelativo)}
                title={`Abrir ${item.caminhoRelativo}`}
                className="flex w-full items-center gap-2.5 border-b border-borda/40 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-texto/5"
                style={{ paddingLeft: `${12 + item.profundidade * 20}px` }}
              >
                {item.ehPasta ? (
                  <Folder aria-hidden className="size-4 shrink-0 text-primaria" />
                ) : (
                  <File aria-hidden className="size-4 shrink-0 text-texto-sutil" />
                )}
                <span className="min-w-0 flex-1 truncate">{item.nome}</span>
                {!item.ehPasta && item.tamanhoBytes !== null && (
                  <span className="shrink-0 text-xs tabular-nums text-texto-sutil">{formatarTamanho(item.tamanhoBytes)}</span>
                )}
                <span className="w-32 shrink-0 text-right text-xs tabular-nums text-texto-sutil">{formatarDataHora(item.modificadoEm)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {conteudo?.limitado && <p className="text-xs text-texto-sutil">Mostrando os primeiros 500 itens. Abra no Explorer para ver tudo.</p>}
    </div>
  );
}
