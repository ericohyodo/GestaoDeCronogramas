'use client';

import { ArrowLeft, CheckCircle2, ExternalLink, FolderKanban, Paperclip, Send, Trash2, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AnexoSdDTO, SdDTO } from '@contratos/sds.contrato';
import { ErroDaApi, clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import {
  formatarDataHora,
  formatarTamanho,
  hojeIso,
} from '@/compartilhado/formatacao';
import { Botao, BotaoIcone } from '@/compartilhado/ui/Botao';
import { AreaTexto, CampoData, CampoTexto } from '@/compartilhado/ui/Campos';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { STATUS_SD_VISUAL } from '../rotulos';
import { type EntradaDoModalDeAceite, ModalAceiteSd } from './ModalAceiteSd';
import { leadTimeValido } from '../prazo-do-aceite';

// =====================================================================================================
// Formulário da SD — passagem de bastão do Comercial para a Engenharia.
//   Bloco 1 (Comercial): data de envio da cotação, nº do PO, prazo acordado (lead time), evidência de
//   oficialização e observações.
//   Bloco 2 (no fim da página): aceite do Gerente de Engenharia / Gestor de Programa.
// As permissões vêm do servidor; aqui só decidimos o que oferecer na tela.
// =====================================================================================================

interface Permissoes {
  /** Responsável pelo Comercial da AV (ou administrador). */
  comercial: boolean;
  /** Gerente de Engenharia ou Gestor de Programa. */
  engenharia: boolean;
}

interface Formulario {
  dataEnvioCotacao: string;
  numeroPo: string;
  observacoes: string;
  /** Texto do campo numérico (vazio = não informado). */
  leadTimeDias: string;
  leadTimeObservacao: string;
}

const paraFormulario = (sd: SdDTO): Formulario => ({
  dataEnvioCotacao: sd.dataEnvioCotacao ?? '',
  numeroPo: sd.numeroPo ?? '',
  observacoes: sd.observacoes ?? '',
  leadTimeDias: sd.leadTimeDias === null ? '' : String(sd.leadTimeDias),
  leadTimeObservacao: sd.leadTimeObservacao ?? '',
});

/**
 * @param sdInicial SD carregada pela página
 * @param permissoes o que o usuário logado pode fazer
 * @param aoAtualizar avisa a página quando a SD muda (status, versão)
 */
export function DetalheSd({
  sdInicial,
  permissoes,
  aoAtualizar,
}: {
  sdInicial: SdDTO;
  permissoes: Permissoes;
  aoAtualizar: (sd: SdDTO) => void;
}) {
  const [sd, setSd] = useState(sdInicial);
  const [form, setForm] = useState<Formulario>(() => paraFormulario(sdInicial));
  const [evidencias, setEvidencias] = useState<AnexoSdDTO[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [conflito, setConflito] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [operando, setOperando] = useState<string | null>(null);
  const [aceiteAberto, setAceiteAberto] = useState(false);
  const [devolucaoAberta, setDevolucaoAberta] = useState(false);
  // Parecer da Engenharia: observação no aceite ou motivo (obrigatório) da devolução ao Comercial.
  const [parecer, setParecer] = useState('');

  useEffect(() => {
    clienteDesktop.sds
      .listarEvidencias(sdInicial.id)
      .then(setEvidencias)
      .catch((falha: unknown) => setErro(mensagemDeErro(falha)));
  }, [sdInicial.id]);

  const editavel = permissoes.comercial && sd.status === 'pre_sd';
  const sujo = JSON.stringify(form) !== JSON.stringify(paraFormulario(sd));
  // Vazio é permitido ao salvar (preenche depois); preenchido, precisa ser inteiro de 1 a 1825.
  const leadTimeOk = form.leadTimeDias === '' || leadTimeValido(form.leadTimeDias);
  const prontaParaAbrir = !!form.dataEnvioCotacao && leadTimeValido(form.leadTimeDias) && evidencias.length > 0;

  /** Executa uma ação da tela mostrando erro/conflito de forma uniforme. */
  const executar = async (nome: string, acao: () => Promise<void>) => {
    setOperando(nome);
    setErro(null);
    setAviso(null);
    setConflito(false);
    try {
      await acao();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      setConflito(falha instanceof ErroDaApi && falha.codigo === 'CONFLITO_DE_EDICAO');
    } finally {
      setOperando(null);
    }
  };

  const aplicar = (nova: SdDTO) => {
    setSd(nova);
    setForm(paraFormulario(nova));
    aoAtualizar(nova);
  };

  const gravarFormulario = async (): Promise<SdDTO> => {
    const salva = await clienteDesktop.sds.salvar({
      id: sd.id,
      versaoEsperada: sd.versao,
      dataEnvioCotacao: form.dataEnvioCotacao || null,
      numeroPo: form.numeroPo || null,
      observacoes: form.observacoes || null,
      leadTimeDias: form.leadTimeDias ? Number(form.leadTimeDias) : null,
      leadTimeObservacao: form.leadTimeObservacao || null,
    });
    aplicar(salva);
    return salva;
  };

  const salvar = () =>
    executar('salvar', async () => {
      await gravarFormulario();
      setAviso('Formulário salvo.');
    });

  const abrir = () =>
    executar('abrir', async () => {
      if (sujo) await gravarFormulario();
      aplicar(await clienteDesktop.sds.abrir(sd.id));
      setAviso('SD aberta e enviada para o aceite da Engenharia.');
    });

  const recarregar = () =>
    executar('recarregar', async () => {
      aplicar(await clienteDesktop.sds.obter(sd.id));
    });

  const anexar = () =>
    executar('anexar', async () => {
      const lista = await clienteDesktop.sds.anexarEvidencias(sd.id);
      if (lista) setEvidencias(lista);
    });

  const excluirEvidencia = (anexoId: string) =>
    executar('excluir', async () => {
      await clienteDesktop.sds.excluirEvidencia(anexoId);
      setEvidencias((atuais) => atuais.filter((anexo) => anexo.id !== anexoId));
    });

  const abrirEvidencia = (anexoId: string) =>
    executar('abrir-evidencia', () => clienteDesktop.sds.abrirEvidencia(anexoId).then(() => undefined));

  const aceitar = (entrada: EntradaDoModalDeAceite) =>
    executar('aceitar', async () => {
      aplicar(await clienteDesktop.sds.aceitar({ id: sd.id, parecer: parecer.trim() || null, ...entrada }));
      setParecer('');
      setAceiteAberto(false);
      setAviso('Aceite registrado. O projeto foi criado em Gestão de Projetos.');
    });

  const devolver = () =>
    executar('devolver', async () => {
      aplicar(await clienteDesktop.sds.devolver({ id: sd.id, motivo: parecer }));
      setDevolucaoAberta(false);
      setParecer('');
    });

  const status = STATUS_SD_VISUAL[sd.status];
  const ocupado = operando !== null;

  return (
    <div className="flex flex-col gap-5">
      {/* ---------- Cabeçalho ---------- */}
      <PainelVidro className="flex flex-col gap-3 p-5">
        <Link
          href="/sds/"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-texto-secundario hover:text-texto"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          SDs
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-texto-sutil">Solicitação de Desenvolvimento</p>
            <h1 className="text-xl font-semibold tabular-nums">{sd.numero}</h1>
            <p className="mt-1 text-sm text-texto-secundario">
              {sd.cliente ? `${sd.cliente} · ` : ''}
              {sd.descricao}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 text-xs text-texto-secundario">
            <Etiqueta tom={status.tom}>{status.rotulo}</Etiqueta>
            <p>
              Origem:{' '}
              <Link href={`/avs/detalhe/?id=${sd.avId}`} className="font-medium tabular-nums text-primaria">
                {sd.avNumero}
              </Link>
            </p>
            <p>
              Projeto: <span className="font-medium tabular-nums text-texto">{sd.numeroProjeto}</span>
            </p>
          </div>
        </div>
        {erro && (
          <div className="flex flex-col gap-2">
            <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />
            {conflito && (
              <Botao className="self-end" onClick={() => void recarregar()}>
                Recarregar SD
              </Botao>
            )}
          </div>
        )}
        {aviso && <p className="text-sm text-texto-secundario">{aviso}</p>}
      </PainelVidro>

      {sd.devolucaoMotivo && sd.status === 'pre_sd' && (
        <MensagemErro
          mensagem={`Devolvida pela Engenharia${sd.devolucaoPorNome ? ` (${sd.devolucaoPorNome})` : ''}${
            sd.devolucaoEm ? ` em ${formatarDataHora(sd.devolucaoEm)}` : ''
          }: ${sd.devolucaoMotivo}`}
        />
      )}

      {/* ---------- Bloco 1: Comercial ---------- */}
      <PainelVidro data-tour="sd-comercial" className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-base font-semibold">1. Comercial — oficialização do cliente</h2>
          <p className="text-sm text-texto-secundario">
            Preenchido pelo responsável Comercial da AV
            {sd.responsavelComercialNome ? ` (${sd.responsavelComercialNome})` : ''}. Para abrir a SD é preciso a
            data de envio da cotação, o prazo acordado com o cliente e ao menos uma evidência do cliente (PO, e-mail
            ou documento).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoData
            rotulo="Data de envio da cotação *"
            value={form.dataEnvioCotacao}
            max={hojeIso()}
            disabled={!editavel}
            onChange={(e) => setForm((atual) => ({ ...atual, dataEnvioCotacao: e.target.value }))}
          />
          <CampoTexto
            rotulo="Nº do pedido (PO) do cliente"
            value={form.numeroPo}
            maxLength={60}
            disabled={!editavel}
            placeholder="Ex.: 4500012345"
            onChange={(e) => setForm((atual) => ({ ...atual, numeroPo: e.target.value }))}
          />
          <CampoTexto
            rotulo="Prazo acordado com o cliente (dias corridos) *"
            type="number"
            inputMode="numeric"
            min={1}
            max={1825}
            step={1}
            value={form.leadTimeDias}
            disabled={!editavel}
            placeholder="Ex.: 180"
            dica="Lead time do pedido até a entrega/SOP; define o término do projeto no aceite."
            erro={leadTimeOk ? undefined : 'Informe um número inteiro de dias, de 1 a 1825.'}
            onChange={(e) => setForm((atual) => ({ ...atual, leadTimeDias: e.target.value }))}
          />
          <AreaTexto
            rotulo="Observação do prazo"
            value={form.leadTimeObservacao}
            maxLength={500}
            rows={2}
            disabled={!editavel}
            placeholder="Ex.: SOP em mar/27; PPAP até jan/27"
            onChange={(e) => setForm((atual) => ({ ...atual, leadTimeObservacao: e.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-texto-secundario">
              Evidência de oficialização do cliente (PO) *
            </p>
            {editavel && (
              <Botao icone={Paperclip} tamanho="sm" onClick={() => void anexar()} disabled={ocupado}>
                Anexar e-mail ou documento
              </Botao>
            )}
          </div>
          {evidencias.length === 0 ? (
            <p className="rounded-lg border border-dashed border-borda px-3 py-4 text-center text-sm text-texto-sutil">
              Nenhuma evidência anexada. Aceita e-mails do Outlook (.msg), .eml, PDF, Word, Excel e imagens.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-borda/60 rounded-lg border border-borda">
              {evidencias.map((anexo) => (
                <li key={anexo.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <Paperclip aria-hidden className="size-4 shrink-0 text-texto-sutil" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{anexo.nomeArquivo}</p>
                    <p className="text-xs text-texto-sutil">
                      {formatarTamanho(anexo.tamanhoBytes)} · {anexo.usuarioNome ?? '—'} ·{' '}
                      {formatarDataHora(anexo.criadoEm)}
                    </p>
                  </div>
                  <BotaoIcone
                    icone={ExternalLink}
                    rotulo={`Abrir ${anexo.nomeArquivo}`}
                    onClick={() => void abrirEvidencia(anexo.id)}
                  />
                  {editavel && (
                    <BotaoIcone
                      icone={Trash2}
                      rotulo={`Excluir ${anexo.nomeArquivo}`}
                      onClick={() => void excluirEvidencia(anexo.id)}
                      disabled={ocupado}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <AreaTexto
          rotulo="Observações para a Engenharia"
          value={form.observacoes}
          maxLength={2000}
          disabled={!editavel}
          onChange={(e) => setForm((atual) => ({ ...atual, observacoes: e.target.value }))}
        />

        {sd.abertaEm && (
          <p className="text-xs text-texto-secundario">
            Aberta por <span className="font-medium text-texto">{sd.abertaPorNome ?? '—'}</span> em{' '}
            {formatarDataHora(sd.abertaEm)}.
          </p>
        )}

        {editavel && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Botao onClick={() => void salvar()} disabled={ocupado || !sujo || !leadTimeOk}>
              {operando === 'salvar' ? 'Salvando…' : 'Salvar'}
            </Botao>
            <Botao
              variante="primario"
              icone={Send}
              onClick={() => void abrir()}
              disabled={ocupado || !prontaParaAbrir}
              title={
                prontaParaAbrir
                  ? undefined
                  : 'Informe a data de envio da cotação e o prazo acordado, e anexe a evidência do cliente.'
              }
            >
              {operando === 'abrir' ? 'Abrindo…' : 'Abrir SD e enviar à Engenharia'}
            </Botao>
          </div>
        )}
        {!permissoes.comercial && sd.status === 'pre_sd' && (
          <p className="text-xs text-texto-sutil">Somente leitura: aguardando o Comercial abrir a SD.</p>
        )}
      </PainelVidro>

      {/* ---------- Bloco 2: Aceite da Engenharia (fim da página) ---------- */}
      <PainelVidro className={sd.status === 'pre_sd' ? 'flex flex-col gap-3 p-5 opacity-60' : 'flex flex-col gap-3 p-5'}>
        <div>
          <h2 className="text-base font-semibold">2. Aceite da Engenharia</h2>
          <p className="text-sm text-texto-secundario">
            Dado pelo Gerente de Engenharia ou por um Gestor de Programa. O aceite fecha a SD, cria o projeto{' '}
            <span className="font-medium tabular-nums">{sd.numeroProjeto}</span> e conclui a AV.
          </p>
        </div>

        {sd.status === 'fechada' ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-borda px-4 py-3">
            <p className="flex items-center gap-2 text-sm">
              <CheckCircle2 aria-hidden className="size-4 text-sucesso" />
              Aceite de <span className="font-medium">{sd.aceitePorNome ?? '—'}</span>
              {sd.aceiteEm && <> em {formatarDataHora(sd.aceiteEm)}</>}
            </p>
            {sd.prazoJustificativa && (
              <p className="basis-full whitespace-pre-line text-sm text-texto-secundario">
                <span className="font-medium text-texto">Prazo alterado no aceite: </span>
                {sd.prazoJustificativa}
              </p>
            )}
            {sd.parecerAceite && (
              <p className="basis-full whitespace-pre-line text-sm text-texto-secundario">
                <span className="font-medium text-texto">Parecer: </span>
                {sd.parecerAceite}
              </p>
            )}
            {sd.cronogramaId && (
              <Link href={`/cronograma/?id=${sd.cronogramaId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primaria">
                <FolderKanban aria-hidden className="size-4" />
                Abrir projeto {sd.numeroProjeto}
              </Link>
            )}
          </div>
        ) : sd.status === 'aberta' ? (
          // Os botões ficam sempre à vista; só funcionam para quem tem o papel (o servidor confere de novo).
          <div className="flex flex-col gap-2">
            <div data-tour="sd-parecer">
            <AreaTexto
              rotulo="Parecer da Engenharia"
              ajuda="Observações sobre a SD: inconsistências, evidência que não é de fato o PO, condições do aceite. Obrigatório para devolver ao Comercial; opcional no aceite."
              placeholder={
                permissoes.engenharia
                  ? 'Ex.: o anexo é a cotação, não o pedido do cliente. Anexar o PO assinado.'
                  : 'Preenchido pelo Gerente de Engenharia ou Gestor de Programa.'
              }
              value={parecer}
              maxLength={2000}
              disabled={!permissoes.engenharia}
              onChange={(e) => setParecer(e.target.value)}
            />
            </div>
            {!permissoes.engenharia && (
              <p className="text-sm text-texto-secundario">
                Aguardando o aceite do Gerente de Engenharia ou de um Gestor de Programa. Os papéis são atribuídos
                pelo administrador em Usuários › Fluxo AV / SD.
              </p>
            )}
            <div data-tour="sd-aceite" className="flex flex-wrap justify-end gap-2">
              <Botao
                variante="perigo"
                icone={Undo2}
                onClick={() => setDevolucaoAberta(true)}
                disabled={ocupado || !permissoes.engenharia || !parecer.trim()}
                title={
                  !permissoes.engenharia
                    ? 'Só o Gerente de Engenharia ou um Gestor de Programa'
                    : !parecer.trim()
                      ? 'Escreva o parecer (motivo da devolução) antes de devolver'
                      : undefined
                }
              >
                Devolver ao Comercial
              </Botao>
              <Botao
                variante="primario"
                icone={CheckCircle2}
                onClick={() => setAceiteAberto(true)}
                disabled={ocupado || !permissoes.engenharia}
                title={permissoes.engenharia ? undefined : 'Só o Gerente de Engenharia ou um Gestor de Programa'}
              >
                Dar aceite e criar projeto
              </Botao>
            </div>
          </div>
        ) : (
          <p className="text-sm text-texto-sutil">Disponível depois que o Comercial abrir a SD.</p>
        )}
      </PainelVidro>

      {aceiteAberto && (
        <ModalAceiteSd
          sd={sd}
          aberto
          operando={operando === 'aceitar'}
          aoFechar={() => setAceiteAberto(false)}
          aoAceitar={(entrada) => void aceitar(entrada)}
        />
      )}

      <Modal
        aberto={devolucaoAberta}
        aoFechar={() => setDevolucaoAberta(false)}
        titulo={`Devolver a ${sd.numero} ao Comercial`}
        descricao="O Comercial verá este parecer no topo da SD e poderá corrigir e abrir de novo."
        largura="sm"
      >
        <p className="whitespace-pre-line rounded-lg border border-borda px-3 py-2 text-sm">{parecer}</p>
        <RodapeModal>
          <Botao onClick={() => setDevolucaoAberta(false)}>Cancelar</Botao>
          <Botao variante="perigo" onClick={() => void devolver()} disabled={ocupado || !parecer.trim()}>
            Devolver
          </Botao>
        </RodapeModal>
      </Modal>
    </div>
  );
}
