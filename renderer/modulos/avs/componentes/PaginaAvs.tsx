'use client';

import { Layers, Plus } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Botao } from '@/compartilhado/ui/Botao';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelLateralDasAvs } from './PainelLateralDasAvs';
import { GruposAvModal } from './GruposAvModal';
import { ListaAvs } from './ListaAvs';
import { NovaAvModal } from './NovaAvModal';
import { useAvsStore } from '../store/use-avs-store';

/**
 * Não há permissão global de "pode criar AV": quem consegue abrir uma é decidido pela competência
 * comercial dentro do próprio módulo (ver `AutorizacaoAv.exigirCompetencia`), então o botão aparece
 * pra todo mundo logado e o backend recusa com uma mensagem clara quem não pode.
 */
export function PaginaAvs({ acoesExtras }: { acoesExtras?: ReactNode }) {
  const { itens, erro, carregar, limparErro } = useAvsStore();
  const [criando, setCriando] = useState(false);
  const [gerenciandoGrupos, setGerenciandoGrupos] = useState(false);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <CabecalhoPagina
        titulo="Análises de Viabilidade"
        descricao="Do intake comercial até a proposta, uma etapa de cada vez."
        acoes={
          <>
            {acoesExtras}
            <Botao icone={Layers} onClick={() => setGerenciandoGrupos(true)}>
              Grupos de AVs
            </Botao>
            <Botao variante="primario" icone={Plus} onClick={() => setCriando(true)}>
              Nova AV
            </Botao>
          </>
        }
      />

      {erro && <MensagemErro mensagem={erro} aoFechar={limparErro} />}

      {/* Lista no centro e o painel à direita (recolhível); em telas estreitas o painel vem antes da lista. */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          {/* A AV de portfólio tem lista própria (módulo AV de Portfólio). */}
          <ListaAvs itens={itens.filter((av) => av.tipo !== 'portfolio')} />
        </div>
        {/* `self-stretch`: a coluna ocupa a altura da lista, para o painel acompanhar a rolagem (sticky). */}
        <div className="order-first xl:order-none xl:self-stretch">
          <PainelLateralDasAvs />
        </div>
      </div>

      <GruposAvModal aberto={gerenciandoGrupos} aoFechar={() => setGerenciandoGrupos(false)} />
      <NovaAvModal aberto={criando} aoFechar={() => setCriando(false)} />
    </div>
  );
}
