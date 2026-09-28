'use client';

import clsx from 'clsx';
import { CheckCircle2, ChevronRight, ListChecks, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import type { ItemDaChecklistDTO } from '@contratos/ia.contrato';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao, BotaoIcone } from '@/compartilhado/ui/Botao';
import { AreaTexto } from '@/compartilhado/ui/Campos';
import { DialogoConfirmacao } from '@/compartilhado/ui/DialogoConfirmacao';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { useIaStore } from '../store/use-ia-store';

// Os mesmos limites do processo principal, para avisar antes de salvar.
const LIMITE_DE_ITENS = 30;
const LIMITE_POR_ITEM = 300;
const LIMITE_DE_ORIENTACOES = 4000;

/**
 * O que a IA verifica nas análises: checklist e orientações da empresa, editáveis com o app
 * rodando. A parte fixa (formato da resposta, leitura dos dados) aparece só para consulta.
 */
export function InstrucoesIa() {
  const instrucoes = useIaStore((store) => store.instrucoes);
  const carregarInstrucoes = useIaStore((store) => store.carregarInstrucoes);
  const salvarInstrucoes = useIaStore((store) => store.salvarInstrucoes);
  const restaurarChecklist = useIaStore((store) => store.restaurarChecklist);

  // Rascunho local: `null` enquanto espelha o que está salvo.
  const [rascunho, setRascunho] = useState<{ checklist: ItemDaChecklistDTO[]; orientacoes: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [restaurando, setRestaurando] = useState(false);
  const [mostrarFixas, setMostrarFixas] = useState(false);

  useEffect(() => {
    carregarInstrucoes().catch((falha: unknown) => setErro(mensagemDeErro(falha)));
  }, [carregarInstrucoes]);

  if (!instrucoes) {
    return erro ? <MensagemErro mensagem={erro} /> : null;
  }

  const atual = rascunho ?? { checklist: instrucoes.checklist, orientacoes: instrucoes.orientacoes };
  const alterado = rascunho !== null;
  const editar = (mudanca: Partial<typeof atual>) => {
    setSucesso(null);
    setRascunho({ ...atual, ...mudanca });
  };
  const editarItem = (indice: number, mudanca: Partial<ItemDaChecklistDTO>) =>
    editar({ checklist: atual.checklist.map((item, i) => (i === indice ? { ...item, ...mudanca } : item)) });

  const salvar = async (evento: FormEvent) => {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await salvarInstrucoes(atual);
      setRascunho(null);
      setSucesso('Instruções salvas. As próximas análises já seguem estas regras.');
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  const ativos = atual.checklist.filter((item) => item.ativo && item.texto.trim()).length;
  const atualizadoEm = instrucoes.atualizadoEm
    ? new Date(instrucoes.atualizadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  return (
    <form onSubmit={salvar} className="flex flex-col gap-5">
      <PainelVidro className="p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primaria/10 text-primaria">
              <ListChecks aria-hidden className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Checklist de verificação</h2>
              <p className="mt-0.5 text-sm text-texto-secundario">
                Pontos que a IA verifica obrigatoriamente em cada análise de cronograma.{' '}
                <span className="tabular-nums">{ativos}</span> ativo(s).
              </p>
            </div>
          </div>
          <Botao variante="fantasma" icone={RotateCcw} onClick={() => setRestaurando(true)} disabled={salvando}>
            Restaurar padrão
          </Botao>
        </header>

        <ul className="mt-4 flex flex-col gap-2">
          {atual.checklist.map((item, indice) => (
            <li key={indice} className="flex items-start gap-2">
              <input
                type="checkbox"
                aria-label={item.ativo ? 'Desativar este ponto' : 'Ativar este ponto'}
                checked={item.ativo}
                onChange={(evento) => editarItem(indice, { ativo: evento.target.checked })}
                className="mt-2.5 size-4 shrink-0 accent-[var(--primaria)]"
              />
              <textarea
                value={item.texto}
                rows={1}
                maxLength={LIMITE_POR_ITEM}
                onChange={(evento) => editarItem(indice, { texto: evento.target.value })}
                placeholder="Descreva o que a IA deve verificar"
                className={clsx(
                  'field-sizing-content min-h-9 w-full resize-none rounded-lg border border-borda bg-superficie-solida/80 px-3 py-2 text-sm',
                  'focus:border-primaria focus:outline-none focus:ring-3 focus:ring-primaria/20',
                  !item.ativo && 'text-texto-sutil line-through',
                )}
              />
              <BotaoIcone
                icone={Trash2}
                rotulo="Remover este ponto"
                onClick={() => editar({ checklist: atual.checklist.filter((_, i) => i !== indice) })}
                className="mt-0.5"
              />
            </li>
          ))}
        </ul>
        <Botao
          icone={Plus}
          className="mt-3"
          disabled={atual.checklist.length >= LIMITE_DE_ITENS}
          onClick={() => editar({ checklist: [...atual.checklist, { texto: '', ativo: true }] })}
        >
          Adicionar ponto
        </Botao>
      </PainelVidro>

      <PainelVidro className="p-6">
        <AreaTexto
          rotulo="Orientações da empresa"
          dica={`Valem para a análise de cada cronograma e para a do portfólio. ${atual.orientacoes.length}/${LIMITE_DE_ORIENTACOES} caracteres.`}
          value={atual.orientacoes}
          maxLength={LIMITE_DE_ORIENTACOES}
          rows={5}
          onChange={(evento) => editar({ orientacoes: evento.target.value })}
          placeholder={'Ex.: A data de SOP combinada com o cliente nunca pode atrasar.\nPriorize riscos que afetam entregas ao cliente.'}
        />

        <button
          type="button"
          aria-expanded={mostrarFixas}
          onClick={() => setMostrarFixas((valor) => !valor)}
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-texto-secundario hover:text-texto"
        >
          <ChevronRight aria-hidden className={clsx('size-4 transition-transform', mostrarFixas && 'rotate-90')} />
          O que a IA sempre recebe (fixo no aplicativo)
        </button>
        {mostrarFixas && (
          <pre className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border border-borda-vidro bg-texto/3 p-4 font-sans text-xs leading-relaxed text-texto-secundario">
            {instrucoes.instrucoesFixas}
          </pre>
        )}
      </PainelVidro>

      {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}
      <div className="flex flex-wrap items-center gap-3">
        <Botao type="submit" variante="primario" disabled={salvando || !alterado}>
          {salvando ? 'Salvando…' : 'Salvar instruções'}
        </Botao>
        {alterado && (
          <Botao variante="fantasma" onClick={() => setRascunho(null)} disabled={salvando}>
            Descartar alterações
          </Botao>
        )}
        {sucesso ? (
          <span className="flex items-center gap-1.5 text-sm text-sucesso">
            <CheckCircle2 aria-hidden className="size-4" />
            {sucesso}
          </span>
        ) : (
          <span className="text-xs text-texto-sutil">
            {atualizadoEm ? `Última alteração: ${atualizadoEm}` : 'Usando a checklist padrão.'}
          </span>
        )}
      </div>

      <DialogoConfirmacao
        aberto={restaurando}
        titulo="Restaurar checklist padrão"
        mensagem="A checklist volta aos pontos padrão de APQP. As orientações da empresa são mantidas."
        rotuloConfirmar="Restaurar"
        aoConfirmar={async () => {
          await restaurarChecklist();
          setRascunho(null);
          setSucesso('Checklist restaurada ao padrão.');
        }}
        aoFechar={() => setRestaurando(false)}
      />
    </form>
  );
}
