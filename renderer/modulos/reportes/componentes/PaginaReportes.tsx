'use client';

import clsx from 'clsx';
import { Bug, CheckCircle2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LIMITES_REPORTE,
  STATUS_REPORTE,
  type ConteudoImagemReporteDTO,
  type ImagemReporteDTO,
  type ReporteDetalheDTO,
  type ReporteResumoDTO,
  type StatusReporteDTO,
} from '@contratos/reportes.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { formatarDataHora } from '@/compartilhado/formatacao';
import { Botao } from '@/compartilhado/ui/Botao';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { AreaTexto, Selecao } from '@/compartilhado/ui/Campos';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal } from '@/compartilhado/ui/Modal';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { STATUS_REPORTE_VISUAL, TIPO_REPORTE_VISUAL } from '../rotulos';

type Filtro = StatusReporteDTO | 'todos';

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  ...STATUS_REPORTE.map((status) => ({ valor: status, rotulo: STATUS_REPORTE_VISUAL[status].rotulo })),
];

/**
 * Página do administrador: reportes recebidos, com o detalhe (texto, prints, quem e quando), o log de
 * alterações e as ações para mudar o status (dar baixa) ou comentar. `?id=` abre um reporte direto
 * (link da notificação).
 */
export function PaginaReportes() {
  const router = useRouter();
  const parametros = useSearchParams();
  const selecionadoId = parametros.get('id');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [itens, setItens] = useState<ReporteResumoDTO[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Incrementado depois de cada andamento registrado: recarrega a lista (status e ordem mudam).
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let cancelado = false;
    clienteDesktop.reportes
      .listar(filtro === 'todos' ? undefined : { status: filtro })
      .then((lista) => {
        if (cancelado) return;
        setItens(lista);
        setErro(null);
      })
      .catch((falha: unknown) => !cancelado && setErro(mensagemDeErro(falha)))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [filtro, recarga]);

  const selecionar = (id: string) => router.replace(`/reportes/?id=${encodeURIComponent(id)}`);

  return (
    <div className="flex flex-col gap-6 p-6">
      <CabecalhoPagina
        titulo="Reportes recebidos"
        descricao="Erros e sugestões enviados pelos usuários. Acompanhe, comente e dê baixa; tudo fica registrado no log."
      />

      <div role="tablist" aria-label="Filtrar por status" className="vidro inline-flex w-fit gap-0.5 rounded-xl p-1">
        {FILTROS.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            role="tab"
            aria-selected={filtro === opcao.valor}
            onClick={() => setFiltro(opcao.valor)}
            className={clsx(
              'h-7 rounded-lg px-3 text-xs font-medium transition-colors',
              filtro === opcao.valor ? 'bg-primaria/12 text-primaria' : 'text-texto-secundario hover:bg-texto/6',
            )}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>

      {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <PainelVidro className="p-2">
          {carregando && itens.length === 0 ? (
            <p className="p-4 text-sm text-texto-secundario">Carregando…</p>
          ) : itens.length === 0 ? (
            <EstadoVazio icone={Bug} titulo="Nenhum reporte aqui" descricao="Quando alguém reportar, aparece nesta lista." />
          ) : (
            <ul className="flex flex-col gap-1">
              {itens.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => selecionar(item.id)}
                    aria-current={item.id === selecionadoId ? 'true' : undefined}
                    className={clsx(
                      'flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-colors',
                      item.id === selecionadoId ? 'bg-primaria/10 ring-1 ring-primaria/40' : 'hover:bg-texto/5',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">#{item.numero}</span>
                      <Etiqueta tom={TIPO_REPORTE_VISUAL[item.tipo].tom}>{TIPO_REPORTE_VISUAL[item.tipo].rotulo}</Etiqueta>
                      <Etiqueta tom={STATUS_REPORTE_VISUAL[item.status].tom}>
                        {STATUS_REPORTE_VISUAL[item.status].rotulo}
                      </Etiqueta>
                      <span className="ml-auto text-xs text-texto-sutil">{formatarDataHora(item.criadoEm)}</span>
                    </span>
                    <span className="line-clamp-2 text-sm text-texto-secundario">{item.texto}</span>
                    <span className="text-xs text-texto-sutil">
                      {item.autor ?? 'Usuário removido'}
                      {item.quantidadeImagens > 0 ? ` · ${item.quantidadeImagens} print(s)` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PainelVidro>

        {selecionadoId ? (
          <DetalheDoReporte key={selecionadoId} id={selecionadoId} aoMudar={() => setRecarga((n) => n + 1)} />
        ) : (
          <PainelVidro className="p-6 text-sm text-texto-secundario">Escolha um reporte na lista para ver o detalhe.</PainelVidro>
        )}
      </div>
    </div>
  );
}

/** Texto, prints, log de alterações e ações de um reporte. */
function DetalheDoReporte({ id, aoMudar }: { id: string; aoMudar: () => void }) {
  const [reporte, setReporte] = useState<ReporteDetalheDTO | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusReporteDTO>('aberto');
  const [comentario, setComentario] = useState('');
  const [gravando, setGravando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    clienteDesktop.reportes
      .obter(id)
      .then((lido) => {
        if (cancelado) return;
        setReporte(lido);
        setStatus(lido.status);
      })
      .catch((falha: unknown) => !cancelado && setErro(mensagemDeErro(falha)));
    return () => {
      cancelado = true;
    };
  }, [id]);

  const registrar = async (novoStatus: StatusReporteDTO) => {
    setErro(null);
    setGravando(true);
    try {
      const atualizado = await clienteDesktop.reportes.registrarAndamento({ id, status: novoStatus, comentario });
      setReporte(atualizado);
      setStatus(atualizado.status);
      setComentario('');
      aoMudar();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setGravando(false);
    }
  };

  if (!reporte) {
    return (
      <PainelVidro className="p-6">
        {erro ? <MensagemErro mensagem={erro} /> : <p className="text-sm text-texto-secundario">Carregando…</p>}
      </PainelVidro>
    );
  }

  const nadaAMudar = status === reporte.status && !comentario.trim();

  return (
    <PainelVidro className="flex flex-col gap-5 p-6">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold tabular-nums">#{reporte.numero}</h2>
        <Etiqueta tom={TIPO_REPORTE_VISUAL[reporte.tipo].tom}>{TIPO_REPORTE_VISUAL[reporte.tipo].rotulo}</Etiqueta>
        <Etiqueta tom={STATUS_REPORTE_VISUAL[reporte.status].tom}>{STATUS_REPORTE_VISUAL[reporte.status].rotulo}</Etiqueta>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-texto-sutil">Reportado por</dt>
        <dd>{reporte.autor ?? 'Usuário removido'}</dd>
        <dt className="text-texto-sutil">Data/hora</dt>
        <dd>{formatarDataHora(reporte.criadoEm)}</dd>
        <dt className="text-texto-sutil">Tela</dt>
        <dd className="break-all font-mono text-xs leading-5">{reporte.rota ?? '—'}</dd>
        <dt className="text-texto-sutil">Versão do app</dt>
        <dd>{reporte.versaoApp ?? '—'}</dd>
      </dl>

      <p className="whitespace-pre-wrap rounded-xl border border-borda/60 bg-superficie-solida/60 p-4 text-sm">{reporte.texto}</p>

      {reporte.imagens.length > 0 && <PrintsDoReporte imagens={reporte.imagens} />}

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-titulo-secao">Log de alterações</h3>
        <ol className="flex flex-col gap-2 border-l border-borda pl-4">
          {reporte.eventos.map((evento) => (
            <li key={evento.id} className="relative text-sm">
              <span aria-hidden className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primaria/70" />
              <p>
                <span className="font-medium">{evento.autor ?? 'Usuário removido'}</span>{' '}
                <span className="text-texto-secundario">
                  {evento.tipo === 'criado'
                    ? 'reportou'
                    : evento.tipo === 'comentario'
                      ? 'comentou'
                      : `mudou de ${STATUS_REPORTE_VISUAL[evento.statusDe ?? 'aberto'].rotulo} para ${
                          STATUS_REPORTE_VISUAL[evento.statusPara ?? 'aberto'].rotulo
                        }`}
                </span>{' '}
                <span className="text-xs text-texto-sutil">· {formatarDataHora(evento.criadoEm)}</span>
              </p>
              {evento.comentario && <p className="mt-0.5 whitespace-pre-wrap text-texto-secundario">{evento.comentario}</p>}
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3 border-t border-borda/70 pt-4">
        <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
          <Selecao
            rotulo="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusReporteDTO)}
            opcoes={STATUS_REPORTE.map((valor) => ({ valor, rotulo: STATUS_REPORTE_VISUAL[valor].rotulo }))}
          />
          <AreaTexto
            rotulo="Comentário (opcional)"
            rows={2}
            maxLength={LIMITES_REPORTE.comentario}
            placeholder="Ex.: corrigido na versão 0.5.0"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
        </div>
        {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}
        <div className="flex flex-wrap justify-end gap-2">
          {reporte.status !== 'resolvido' && (
            <Botao icone={CheckCircle2} disabled={gravando} onClick={() => void registrar('resolvido')}>
              Dar baixa (resolvido)
            </Botao>
          )}
          <Botao variante="primario" disabled={gravando || nadaAMudar} onClick={() => void registrar(status)}>
            {gravando ? 'Registrando…' : 'Registrar'}
          </Botao>
        </div>
      </section>
    </PainelVidro>
  );
}

/** Miniaturas dos prints; clique abre em tela cheia. O conteúdo só é buscado ao exibir. */
function PrintsDoReporte({ imagens }: { imagens: ImagemReporteDTO[] }) {
  const [conteudos, setConteudos] = useState<Record<string, ConteudoImagemReporteDTO>>({});
  const [ampliada, setAmpliada] = useState<ConteudoImagemReporteDTO | null>(null);

  useEffect(() => {
    let cancelado = false;
    void Promise.all(
      imagens.map((imagem) =>
        clienteDesktop.reportes
          .obterImagem(imagem.id)
          .then((conteudo) => !cancelado && setConteudos((atual) => ({ ...atual, [imagem.id]: conteudo })))
          .catch(() => undefined),
      ),
    );
    return () => {
      cancelado = true;
    };
  }, [imagens]);

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-titulo-secao">Prints</h3>
      <ul className="grid grid-cols-3 gap-2">
        {imagens.map((imagem) => {
          const conteudo = conteudos[imagem.id];
          return (
            <li key={imagem.id}>
              <button
                type="button"
                disabled={!conteudo}
                onClick={() => conteudo && setAmpliada(conteudo)}
                className="block w-full overflow-hidden rounded-lg border border-borda/70 text-left"
                title={`Ampliar ${imagem.nomeArquivo}`}
              >
                {conteudo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data: URI local, sem loader de otimização
                  <img
                    src={`data:${conteudo.tipoMime};base64,${conteudo.base64}`}
                    alt={imagem.nomeArquivo}
                    className="h-28 w-full object-cover"
                  />
                ) : (
                  <span className="grid h-28 place-items-center text-xs text-texto-sutil">Carregando…</span>
                )}
                <span className="block truncate px-2 py-1 text-[11px] text-texto-secundario">{imagem.nomeArquivo}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Modal aberto={!!ampliada} aoFechar={() => setAmpliada(null)} titulo={ampliada?.nomeArquivo ?? ''} largura="cheia">
        {ampliada && (
          // eslint-disable-next-line @next/next/no-img-element -- data: URI local, sem loader de otimização
          <img
            src={`data:${ampliada.tipoMime};base64,${ampliada.base64}`}
            alt={ampliada.nomeArquivo}
            className="mx-auto max-h-full max-w-full rounded-lg object-contain"
          />
        )}
      </Modal>
    </section>
  );
}
