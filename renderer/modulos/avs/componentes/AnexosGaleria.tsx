'use client';

import { formatarDataHora } from '@/compartilhado/formatacao';
import { ExternalLink, Eye, FileText, Image as ImageIcon, Paperclip, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AnexoAvDTO, AreaAvDTO, ConteudoAnexoDTO } from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { urlDeBase64 } from '@/compartilhado/arquivos';
import { Ajuda } from '@/compartilhado/ui/Ajuda';
import { Botao, BotaoIcone } from '@/compartilhado/ui/Botao';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal } from '@/compartilhado/ui/Modal';
import { TituloSecao } from './SecaoAv';

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ehImagem(tipoMime: string | null): boolean {
  return !!tipoMime && tipoMime.startsWith('image/');
}

/** O Chromium não desenha TIFF: esses arquivos abrem no visualizador do Windows. */
function ehTiff(tipoMime: string | null): boolean {
  return tipoMime === 'image/tiff';
}

function ehPdf(tipoMime: string | null): boolean {
  return tipoMime === 'application/pdf';
}

/** Galeria de desenhos/evidências anexados a uma AV, com pré-visualização de PDF e imagens. */
export function AnexosGaleria({
  avId,
  secao,
  titulo = 'Desenhos e evidências',
  ajuda,
  aoMudarQuantidade,
  desabilitado = false,
}: {
  avId: string;
  secao: AreaAvDTO;
  titulo?: string;
  /** Explicação do que anexar aqui (aparece ao passar o mouse no ícone de ajuda). */
  ajuda?: string;
  /** Avisa a aba quantos anexos a seção tem (liberação fracionada dos blocos). */
  aoMudarQuantidade?: (quantidade: number) => void;
  /** Bloqueia novos anexos (ex.: PCP declarou "Sem alterações significativas"). */
  desabilitado?: boolean;
}) {
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
  const quantidade = itens.length;
  useEffect(() => {
    if (!carregando) aoMudarQuantidade?.(quantidade);
  }, [quantidade, carregando, aoMudarQuantidade]);

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

  const abrirExterno = async (id: string) => {
    setErro(null);
    try {
      await clienteDesktop.avs.abrirAnexo(id);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
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
        <div className="flex items-center gap-2">
          <TituloSecao>{titulo}</TituloSecao>
          {ajuda && <Ajuda texto={ajuda} />}
        </div>
        <Botao icone={Paperclip} tamanho="sm" onClick={() => void adicionar()} disabled={enviando || desabilitado}>
          {enviando ? 'Anexando…' : 'Anexar arquivo'}
        </Botao>
      </div>

      {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}

      {carregando ? (
        <p className="text-sm text-texto-secundario">Carregando…</p>
      ) : itens.length === 0 ? (
        <p className="text-sm text-texto-secundario">
          Nenhum arquivo anexado ainda. Aceita PDF, JPG, JPEG, TIFF, PNG e BMP.
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
                {ehTiff(anexo.tipoMime) ? (
                  <BotaoIcone
                    icone={ExternalLink}
                    rotulo={`Abrir ${anexo.nomeArquivo} no visualizador do Windows`}
                    onClick={() => void abrirExterno(anexo.id)}
                  />
                ) : (
                  <BotaoIcone icone={Eye} rotulo={`Visualizar ${anexo.nomeArquivo}`} onClick={() => setVisualizando(anexo)} />
                )}
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

      <Modal
        aberto={!!visualizando}
        aoFechar={() => setVisualizando(null)}
        titulo={visualizando?.nomeArquivo ?? ''}
        largura="visualizador"
      >
        {visualizando && <ConteudoDaPrevia key={visualizando.id} anexo={visualizando} />}
      </Modal>
    </div>
  );
}

/**
 * Só existe enquanto o modal está aberto (e é remontado a cada anexo, via `key`). O arquivo vira uma URL
 * `blob:` (sem o limite de ~2 MB das URLs `data:`), revogada quando a prévia sai da tela.
 */
function ConteudoDaPrevia({ anexo }: { anexo: AnexoAvDTO }) {
  const [conteudo, setConteudo] = useState<(ConteudoAnexoDTO & { url: string }) | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    let url: string | null = null;
    clienteDesktop.avs
      .obterConteudoAnexo(anexo.id)
      .then((resultado) => {
        if (cancelado) return;
        url = urlDeBase64(resultado.base64, resultado.tipoMime ?? 'application/octet-stream');
        setConteudo({ ...resultado, url });
      })
      .catch((falha: unknown) => !cancelado && setErro(mensagemDeErro(falha)))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [anexo.id]);

  return (
    <div className="flex h-full flex-col">
      {carregando && <p className="text-sm text-texto-secundario">Carregando pré-visualização…</p>}
      {erro && <MensagemErro mensagem={erro} />}
      {!carregando && conteudo && (
        <>
          {ehImagem(conteudo.tipoMime) && !ehTiff(conteudo.tipoMime) && (
            // eslint-disable-next-line @next/next/no-img-element -- blob: local, sem loader de otimização
            <img
              src={conteudo.url}
              alt={conteudo.nomeArquivo}
              className="mx-auto max-h-full max-w-full rounded-lg object-contain"
            />
          )}
          {ehPdf(conteudo.tipoMime) && (
            <iframe src={conteudo.url} title={conteudo.nomeArquivo} className="min-h-0 w-full flex-1 rounded-lg border border-borda/60" />
          )}
          {(ehTiff(conteudo.tipoMime) || (!ehImagem(conteudo.tipoMime) && !ehPdf(conteudo.tipoMime))) && (
            <p className="text-sm text-texto-secundario">Pré-visualização não disponível para este arquivo.</p>
          )}
        </>
      )}
    </div>
  );
}
