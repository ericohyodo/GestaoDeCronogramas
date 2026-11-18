'use client';

import { Package, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Botao, classeBotao } from '@/compartilhado/ui/Botao';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { ListaAvs } from '../ListaAvs';
import { useAvsStore } from '../../store/use-avs-store';
import { NovaAvPortfolioModal } from './NovaAvPortfolioModal';

/** Lista das AVs de Item de Portfólio (mesma lista da AV, só com as de portfólio). */
export function PaginaAvsPortfolio() {
  const { itens, erro, carregar, limparErro } = useAvsStore();
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <CabecalhoPagina
        titulo="AVs de Portfólio"
        descricao="Itens já desenvolvidos: o desenho confere? Temos capacidade? Os custos estão atualizados?"
        acoes={
          <>
            <Link href="/portfolio/itens/" className={classeBotao()}>
              <Package aria-hidden className="size-4" />
              Itens de portfólio
            </Link>
            <Botao variante="primario" icone={Plus} onClick={() => setCriando(true)}>
              Nova AV de Portfólio
            </Botao>
          </>
        }
      />
      {erro && <MensagemErro mensagem={erro} aoFechar={limparErro} />}
      <ListaAvs itens={itens.filter((av) => av.tipo === 'portfolio')} />
      <NovaAvPortfolioModal aberto={criando} aoFechar={() => setCriando(false)} />
    </div>
  );
}
