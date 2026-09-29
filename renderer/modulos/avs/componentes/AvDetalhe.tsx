'use client';

import { Ban, Save, SkipForward } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvDetalheDTO } from '@contratos/avs.contrato';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { AbaComercial } from './AbaComercial';
import { AbaEngProcesso } from './AbaEngProcesso';
import { AbaEngProduto } from './AbaEngProduto';
import { AbaMapaCusto } from './AbaMapaCusto';
import { AbaPcp } from './AbaPcp';
import { AbaResumo } from './AbaResumo';
import { AbasDaAv, type AbaAv } from './AbasDaAv';
import { RegistroDaAbaContexto, type RegistroDaAba } from './alteracoes-da-aba';
import { DeclinarModal } from './DeclinarModal';
import { EquipePanel } from './EquipePanel';
import { EtapaBadge } from './EtapaBadge';
import { HistoricoPanel } from './HistoricoPanel';
import { useAvsStore } from '../store/use-avs-store';

/** Da Proposta Enviada em diante (e nas AVs encerradas) não há mais o que preencher: abre no Resumo. */
function abreNoResumo(av: AvDetalheDTO): boolean {
  return av.etapaAtual.terminal || av.etapaAtual.chave === 'proposta_enviada' || av.etapaAtual.chave === 'sd_aberta';
}

/** Quem chama isto precisa montar com `key={av.id}`, pra reiniciar a aba selecionada e os
 * formulários ao trocar de AV (ver `pagina-detalhe-av.tsx`). */
export function AvDetalhe({ av }: { av: AvDetalheDTO }) {
  const avancarEtapa = useAvsStore((estado) => estado.avancarEtapa);
  const carregarGrupos = useAvsStore((estado) => estado.carregarGrupos);
  const aplicarAoGrupo = useAvsStore((estado) => estado.aplicarAoGrupo);
  const grupos = useAvsStore((estado) => estado.grupos);
  const [operando, setOperando] = useState<'salvar' | 'liberar' | 'trocar' | null>(null);
  const [erroAvanco, setErroAvanco] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [declinando, setDeclinando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaAv>(() =>
    abreNoResumo(av) ? 'resumo' : (av.etapaAtual.area ?? 'resumo'),
  );
  const [abaPendente, setAbaPendente] = useState<AbaAv | null>(null);
  // Quantas outras AVs abertas do grupo receberiam os dados; `null` = sem pergunta em andamento.
  const [perguntaGrupo, setPerguntaGrupo] = useState<number | null>(null);

  // A aba aberta se registra aqui: é ela quem sabe se há edição pendente e como gravá-la.
  const abaRegistrada = useRef<RegistroDaAba | null>(null);
  const registrar = useCallback((registro: RegistroDaAba | null) => {
    abaRegistrada.current = registro;
  }, []);

  // Só para mostrar "AV i de N" e os atalhos para as outras AVs do grupo no cabeçalho.
  const grupoId = av.grupo?.id;
  useEffect(() => {
    if (grupoId) carregarGrupos().catch(() => undefined);
  }, [grupoId, carregarGrupos]);
  const avsDoGrupo = grupos.find((grupo) => grupo.id === grupoId)?.avs ?? [];

  const etapa = av.etapaAtual;
  const ehAbaDeArea = abaAtiva !== 'resumo';
  const podeLiberar =
    !etapa.terminal &&
    etapa.area === abaAtiva &&
    etapa.chave !== 'proposta_enviada' &&
    etapa.chave !== 'sd_aberta';
  const podeDeclinarAgora = !etapa.terminal;

  const salvar = async (): Promise<boolean> => {
    const registro = abaRegistrada.current;
    return registro ? registro.salvar() : true;
  };

  const salvarAba = async () => {
    setOperando('salvar');
    setAviso(null);
    if (await salvar()) setAviso(`Salvo às ${new Date().toLocaleTimeString('pt-BR', { timeStyle: 'short' })}.`);
    setOperando(null);
  };

  const avancar = async () => {
    const atualizada = await avancarEtapa({ avId: av.id });
    setAbaAtiva(abreNoResumo(atualizada) ? 'resumo' : (atualizada.etapaAtual.area ?? 'resumo'));
  };

  const salvarELiberar = async () => {
    setOperando('liberar');
    setAviso(null);
    setErroAvanco(null);
    try {
      if (!(await salvar())) return;
      // Comercial de uma AV em grupo: oferece levar os dados para as demais antes de liberar.
      if (abaAtiva === 'comercial' && av.grupo) {
        const grupoId = av.grupo.id;
        const grupo = (await carregarGrupos()).find((g) => g.id === grupoId);
        const outras = grupo?.avs.filter((outra) => outra.id !== av.id && !outra.etapaAtual.terminal).length ?? 0;
        if (outras > 0) {
          setPerguntaGrupo(outras);
          return;
        }
      }
      await avancar();
    } catch (falha) {
      setErroAvanco(mensagemDeErro(falha));
    } finally {
      setOperando(null);
    }
  };

  const decidirGrupo = async (aplicar: boolean) => {
    setPerguntaGrupo(null);
    setOperando('liberar');
    setErroAvanco(null);
    try {
      if (aplicar) {
        const { aplicadas, ignoradas } = await aplicarAoGrupo({ avId: av.id, secao: 'comercial' });
        setAviso(
          `Dados aplicados a ${aplicadas} AV(s) do grupo` +
            (ignoradas.length ? `; ignoradas: ${ignoradas.map((i) => `${i.numero} (${i.motivo})`).join(', ')}.` : '.'),
        );
      }
      await avancar();
    } catch (falha) {
      setErroAvanco(mensagemDeErro(falha));
    } finally {
      setOperando(null);
    }
  };

  const selecionarAba = (aba: AbaAv) => {
    if (aba === abaAtiva) return;
    setAviso(null);
    if (abaRegistrada.current?.sujo) setAbaPendente(aba);
    else setAbaAtiva(aba);
  };

  const sairDaAba = async (gravar: boolean) => {
    if (!abaPendente) return;
    setOperando('trocar');
    if (!gravar || (await salvar())) {
      setAbaAtiva(abaPendente);
      setAbaPendente(null);
    }
    setOperando(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <PainelVidro className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-texto-sutil">AV</p>
            <h1 className="text-xl font-semibold tabular-nums">{av.numero}</h1>
            {av.grupo && (
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-titulo-secao">
                <span className="font-medium">Grupo: {av.grupo.nome}</span>
                {avsDoGrupo.length > 0 && (
                  <>
                    <span>
                      · AV {avsDoGrupo.findIndex((outra) => outra.id === av.id) + 1} de {avsDoGrupo.length}
                    </span>
                    {avsDoGrupo
                      .filter((outra) => outra.id !== av.id)
                      .map((outra) => (
                        <Link
                          key={outra.id}
                          href={`/avs/detalhe/?id=${outra.id}`}
                          className="tabular-nums text-primaria hover:text-primaria-hover"
                        >
                          {outra.numero}
                        </Link>
                      ))}
                  </>
                )}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <EtapaBadge etapa={etapa} />
            {/* Preenchida sozinha: é o dia em que a AV foi criada no sistema. */}
            {av.criadoPorNome && (
              <p className="text-xs text-texto-secundario">
                Aberta por: <span className="font-medium text-texto">{av.criadoPorNome}</span>
              </p>
            )}
            <p className="text-xs text-texto-secundario">
              Data de abertura:{' '}
              <span className="font-medium tabular-nums text-texto">
                {new Date(av.criadoEm).toLocaleDateString('pt-BR')}
              </span>
            </p>
          </div>
        </div>

        {etapa.terminal ? (
          <p className="text-sm text-texto-secundario">
            {etapa.chave === 'projeto_criado'
              ? 'Esta AV foi concluída.'
              : 'Esta AV foi declinada e não pode mais avançar.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {etapa.chave === 'sd_aberta' && (
              <p className="text-sm text-texto-secundario">
                A análise foi finalizada e a Pré-SD foi criada.{' '}
                <Link href="/sds/" className="text-primaria hover:text-primaria-hover">
                  Abrir o módulo de SDs
                </Link>
                . A abertura e o fechamento da SD (que criam o projeto) ainda não foram implementados.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {podeDeclinarAgora && (
                <Botao variante="perigo" icone={Ban} onClick={() => setDeclinando(true)}>
                  Declinar AV
                </Botao>
              )}
            </div>
          </div>
        )}
        {erroAvanco && <MensagemErro mensagem={erroAvanco} aoFechar={() => setErroAvanco(null)} />}
      </PainelVidro>

      <div className="flex flex-col gap-5">
        <AbasDaAv abaAtiva={abaAtiva} aoSelecionar={selecionarAba} etapaAtual={etapa} />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
          <RegistroDaAbaContexto.Provider value={registrar}>
            <div className="flex flex-col gap-5">
              {abaAtiva === 'comercial' && <AbaComercial av={av} />}
              {abaAtiva === 'produto' && <AbaEngProduto av={av} />}
              {abaAtiva === 'processo' && <AbaEngProcesso av={av} />}
              {abaAtiva === 'pcp' && <AbaPcp av={av} />}
              {abaAtiva === 'custo' && <AbaMapaCusto av={av} />}
              {abaAtiva === 'resumo' && <AbaResumo av={av} />}

              {ehAbaDeArea && (
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {aviso && <p className="text-xs text-texto-secundario">{aviso}</p>}
                  {erroAvanco && <MensagemErro mensagem={erroAvanco} aoFechar={() => setErroAvanco(null)} />}
                  <Botao icone={Save} onClick={() => void salvarAba()} disabled={operando !== null}>
                    {operando === 'salvar' ? 'Salvando…' : 'Salvar'}
                  </Botao>
                  <Botao
                    variante="primario"
                    icone={SkipForward}
                    onClick={() => void salvarELiberar()}
                    disabled={operando !== null || !podeLiberar}
                    title={
                      podeLiberar
                        ? undefined
                        : 'Só a aba da etapa atual pode liberar a próxima etapa (a partir da Proposta Enviada, use o Resumo).'
                    }
                  >
                    {operando === 'liberar' ? 'Liberando…' : 'Salvar e Liberar Próximo'}
                  </Botao>
                </div>
              )}
            </div>
          </RegistroDaAbaContexto.Provider>
          <div className="flex flex-col gap-5">
            <EquipePanel av={av} />
            <HistoricoPanel avId={av.id} />
          </div>
        </div>
      </div>

      <Modal
        aberto={perguntaGrupo !== null}
        aoFechar={() => setPerguntaGrupo(null)}
        titulo="Aplicar ao grupo?"
        descricao={`A AV ${av.numero} faz parte do grupo "${av.grupo?.nome ?? ''}" (${perguntaGrupo ?? 0} outra(s) AV(s) aberta(s)). Deseja levar cliente, contatos comercial e técnico e demais dados comerciais para as outras AVs do grupo? Só campos preenchidos são copiados.`}
        largura="md"
      >
        <RodapeModal>
          <Botao onClick={() => setPerguntaGrupo(null)}>Cancelar</Botao>
          <Botao onClick={() => void decidirGrupo(false)}>Só liberar</Botao>
          <Botao variante="primario" onClick={() => void decidirGrupo(true)}>
            Aplicar ao grupo e liberar
          </Botao>
        </RodapeModal>
      </Modal>

      <Modal
        aberto={abaPendente !== null}
        aoFechar={() => setAbaPendente(null)}
        titulo="Alterações não salvas"
        descricao="Esta aba tem alterações que ainda não foram salvas. O que deseja fazer antes de sair?"
        largura="sm"
      >
        <RodapeModal>
          <Botao onClick={() => setAbaPendente(null)} disabled={operando === 'trocar'}>
            Continuar editando
          </Botao>
          <Botao variante="perigo" onClick={() => void sairDaAba(false)} disabled={operando === 'trocar'}>
            Descartar
          </Botao>
          <Botao variante="primario" onClick={() => void sairDaAba(true)} disabled={operando === 'trocar'}>
            {operando === 'trocar' ? 'Salvando…' : 'Salvar e sair'}
          </Botao>
        </RodapeModal>
      </Modal>

      <DeclinarModal avId={av.id} aberto={declinando} aoFechar={() => setDeclinando(false)} />
    </div>
  );
}
