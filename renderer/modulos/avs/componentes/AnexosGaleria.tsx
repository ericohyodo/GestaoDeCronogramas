'use client';

import { Eye, FileText, Image as ImageIcon, Paperclip, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AnexoAvDTO, AreaAvDTO, ConteudoAnexoDTO } from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao, BotaoIcone } from '@/compartilhado/ui/Botao';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal } from '@/compartilhado/ui/Modal';

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ehImagem(tipoMime: string | null): boolean {
  return !!tipoMime && tipoMime.startsWith('image/');
}

function ehPdf(tipoMime: string | null): boolean {
  return tipoMime === 'application/pdf';
}

/** Galeria de desenhos/evidências anexados a uma AV, com pré-visualização de PDF e imagens. */
export function AnexosGaleria({ avId, secao }: { avId: string; secao: AreaAvDTO }) {
  const [anexos, setAnexos] = useState<AnexoAvDTO[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [visualizando, setVisualizando] = useState<AnexoAvDTO | null>(null);

  useEffect(() => {
    let cancelado = false;
    clienteDesktop.avs
      .listarAnexos(avId)
      .then((lista) => {
        if (!cancelado) setAnexos(lista);
      })
      .catch((falha: unknown) => !cancelado && setErro(mensagemDeErro(falha)))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [avId]);

  const itens = anexos.filter((anexo) => anexo.secao === secao);

  const adicionar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      const resultado = await clienteDesktop.avs.selecionarEAnexar({ avId, secao });
      if (resultado) setAnexos(resultado);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setEnviando(false);
    }
  };

  const excluir = async (id: string) => {
    setExcluindoId(id);
    setErro(null);
    try {
      await clienteDesktop.avs.excluirAnexo(id);
      setAnexos((atual) => atual.filter((anexo) => anexo.id !== id));
      if (visualizando?.id === id) setVisualizando(null);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setExcluindoId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-texto-sutil">Desenhos e evidências</p>
        <Botao icone={Paperclip} tamanho="sm" onClick={() => void adicionar()} disabled={enviando}>
          {enviando ? 'Anexando…' : 'Anexar arquivo'}
        </Botao>
      </div>

      {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}

      {carregando ? (
        <p className="text-sm text-texto-secundario">Carregando…</p>
      ) : itens.length === 0 ? (
        <p className="text-sm text-texto-secundario">
          Nenhum arquivo anexado ainda. Aceita PDF, JPG, JPEG, PNG e BMP.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {itens.map((anexo) => (
            <li
              key={anexo.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-borda/60 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {ehImagem(anexo.tipoMime) ? (
                  <ImageIcon className="size-4 shrink-0 text-texto-sutil" aria-hidden />
                ) : (
                  <FileText className="size-4 shrink-0 text-texto-sutil" aria-hidden />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm">{anexo.nomeArquivo}</p>
                  <p className="text-xs text-texto-sutil">
                    {formatarTamanho(anexo.tamanhoBytes)} · {formatarDataHora(anexo.criadoEm)}
                    {anexo.criadoPor ? ` · ${anexo.criadoPor}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <BotaoIcone icone={Eye} rotulo={`Visualizar ${anexo.nomeArquivo}`} onClick={() => setVisualizando(anexo)} />
                <BotaoIcone
                  icone={Trash2}
                  rotulo={`Excluir ${anexo.nomeArquivo}`}
                  onClick={() => void excluir(anexo.id)}
                  disabled={excluindoId === anexo.id}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <PreviaAnexoModal
        key={visualizando?.id ?? 'nenhum'}
        anexo={visualizando}
        aoFechar={() => setVisualizando(null)}
      />
    </div>
  );
}

/** `key={anexo.id}` no chamador reinicia este componente a cada troca de anexo (mesmo truque
 * usado em `AvDetalhe`/`pagina-detalhe-av.tsx` para o estado de `AbaEngProduto`). */
function PreviaAnexoModal({ anexo, aoFechar }: { anexo: AnexoAvDTO | null; aoFechar: () => void }) {
  const [conteudo, setConteudo] = useState<ConteudoAnexoDTO | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!anexo) return;
    let cancelado = false;
    clienteDesktop.avs
      .obterConteudoAnexo(anexo.id)
      .then((resultado) => !cancelado && setConteudo(resultado))
      .catch((falha: unknown) => !cancelado && setErro(mensagemDeErro(falha)))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [anexo]);

  return (
    <Modal aberto={!!anexo} aoFechar={aoFechar} titulo={anexo?.nomeArquivo ?? ''} largura="lg">
      {carregando && <p className="text-sm text-texto-secundario">Carregando pré-visualização…</p>}
      {erro && <MensagemErro mensagem={erro} />}
      {!carregando && conteudo && anexo && (
        <>
          {ehImagem(conteudo.tipoMime) && (
            // eslint-disable-next-line @next/next/no-img-element -- data: URI local, sem loader de otimização
            <img
              src={`data:${conteudo.tipoMime};base64,${conteudo.base64}`}
              alt={conteudo.nomeArquivo}
              className="mx-auto max-h-[70vh] rounded-lg object-contain"
            />
          )}
          {ehPdf(conteudo.tipoMime) && (
            <iframe
              src={`data:application/pdf;base64,${conteudo.base64}`}
              title={conteudo.nomeArquivo}
              className="h-[70vh] w-full rounded-lg border border-borda/60"
            />
          )}
          {!ehImagem(conteudo.tipoMime) && !ehPdf(conteudo.tipoMime) && (
            <p className="text-sm text-texto-secundario">Pré-visualização não disponível para este arquivo.</p>
          )}
        </>
      )}
    </Modal>
  );
}
