'use client';

import { createContext, useContext, useEffect, useState } from 'react';

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
