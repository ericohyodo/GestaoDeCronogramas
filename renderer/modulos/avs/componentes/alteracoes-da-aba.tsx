'use client';

import { RotateCcw } from 'lucide-react';
import { createContext, useContext, useEffect, useState } from 'react';
import { ErroDaApi, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';

/** O que a aba aberta expõe para a moldura (`AvDetalhe`): se há edição pendente e como gravá-la. */
export interface RegistroDaAba {
  sujo: boolean;
  /** Grava a aba; devolve `false` (e mostra o erro na própria aba) se não conseguiu. */
  salvar(): Promise<boolean>;
}

type Registrar = (registro: RegistroDaAba | null) => void;

export const RegistroDaAbaContexto = createContext<Registrar | null>(null);

/** Faz a aba ficar visível para os botões do rodapé e para o aviso de "alterações não salvas". */
export function useRegistrarAba(registro: RegistroDaAba): void {
  const registrar = useContext(RegistroDaAbaContexto);
  useEffect(() => {
    registrar?.(registro);
    return () => registrar?.(null);
  }, [registrar, registro]);
}

/**
 * Compara o estado do formulário com uma "foto" tirada quando ele ficou pronto (dados carregados)
 * ou foi salvo pela última vez. `marcarLimpo` deve ser chamado logo após um salvamento bem-sucedido.
 */
export function useAlteracoes(estado: unknown, pronto: boolean): { sujo: boolean; marcarLimpo(): void } {
  const atual = JSON.stringify(estado);
  const [foto, setFoto] = useState<string | null>(null);
  // Ajuste de estado durante a renderização (padrão recomendado pelo React para "estado derivado").
  if (pronto && foto === null) setFoto(atual);
  return {
    sujo: foto !== null && foto !== atual,
    marcarLimpo: () => setFoto(atual),
  };
}

/** Remonta a aba aberta, relendo os dados do banco (usado após um conflito de edição). */
export const RecarregarAbaContexto = createContext<() => void>(() => undefined);

/** Outro usuário gravou o mesmo trecho depois que esta tela o carregou (gravação otimista). */
export function ehConflitoDeEdicao(erro: unknown): boolean {
  return erro instanceof ErroDaApi && erro.codigo === 'CONFLITO_DE_EDICAO';
}

/**
 * Erro ao salvar uma aba. No conflito de edição oferece "Recarregar": a aba relê o banco (o que foi
 * digitado aqui se perde, por isso a mensagem orienta copiar antes).
 * @param erro exceção capturada no salvamento (`null` = nada a mostrar)
 */
export function ErroDaAba({ erro }: { erro: unknown }) {
  const recarregar = useContext(RecarregarAbaContexto);
  if (erro == null) return null;
  return (
    <div className="flex flex-col gap-2">
      <MensagemErro mensagem={mensagemDeErro(erro)} />
      {ehConflitoDeEdicao(erro) && (
        <div className="flex justify-end">
          <Botao icone={RotateCcw} onClick={recarregar}>
            Recarregar aba
          </Botao>
        </div>
      )}
    </div>
  );
}
