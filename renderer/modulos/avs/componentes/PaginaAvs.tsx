'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Botao } from '@/compartilhado/ui/Botao';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { DashboardAvPanel } from './DashboardAvPanel';
import { ListaAvs } from './ListaAvs';
import { NovaAvModal } from './NovaAvModal';
import { useAvsStore } from '../store/use-avs-store';

/**
 * Não há permissão global de "pode criar AV": quem consegue abrir uma é decidido pela competência
 * comercial dentro do próprio módulo (ver `AutorizacaoAv.exigirCompetencia`), então o botão aparece
 * pra todo mundo logado e o backend recusa com uma mensagem clara quem não pode.
 */
export function PaginaAvs() {
  const { itens, erro, carregar, limparErro } = useAvsStore();
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <CabecalhoPagina
        titulo="Análises de Viabilidade"
        descricao="Do intake comercial até a proposta, uma etapa de cada vez."
        acoes={
          <Botao variante="primario" icone={Plus} onClick={() => setCriando(true)}>
            Nova AV
          </Botao>
        }
      />

      {erro && <MensagemErro mensagem={erro} aoFechar={limparErro} />}

      <DashboardAvPanel />
      <ListaAvs itens={itens} />

      <NovaAvModal aberto={criando} aoFechar={() => setCriando(false)} />
    </div>
  );
}
