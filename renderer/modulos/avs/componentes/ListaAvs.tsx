'use client';

import clsx from 'clsx';
import { ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { AvResumoDTO } from '@contratos/avs.contrato';
import { formatarData } from '@/compartilhado/formatacao';
import { CampoTexto } from '@/compartilhado/ui/Campos';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { EtapaBadge } from './EtapaBadge';

type Aba = 'andamento' | 'concluidas' | 'declinadas';

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: 'andamento', rotulo: 'Em andamento' },
  { chave: 'concluidas', rotulo: 'Concluídas' },
  { chave: 'declinadas', rotulo: 'Declinadas' },
];

function situacaoDaAv(av: AvResumoDTO): Aba {
  if (av.etapaAtual.chave === 'projeto_criado') return 'concluidas';
  if (av.etapaAtual.chave === 'declinada_cliente' || av.etapaAtual.chave === 'declinada_empresa') {
    return 'declinadas';
  }
  return 'andamento';
}

export function ListaAvs({ itens }: { itens: AvResumoDTO[] }) {
  const [aba, setAba] = useState<Aba>('andamento');
  const [busca, setBusca] = useState('');

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return itens
      .filter((av) => situacaoDaAv(av) === aba)
      .filter((av) => {
        if (!termo) return true;
        return [av.numero, av.cliente, av.descricao]
          .filter(Boolean)
          .some((campo) => campo!.toLowerCase().includes(termo));
      });
  }, [itens, aba, busca]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-texto/5 p-1">
          {ABAS.map(({ chave, rotulo }) => (
            <button
              key={chave}
              type="button"
              onClick={() => setAba(chave)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                aba === chave ? 'bg-superficie-solida text-texto shadow-sm' : 'text-texto-secundario hover:text-texto',
              )}
            >
              {rotulo} ({itens.filter((av) => situacaoDaAv(av) === chave).length})
            </button>
          ))}
        </div>
        <CampoTexto
          rotulo="Buscar"
          classeContainer="w-64"
          className="h-8"
          placeholder="Número, cliente ou descrição…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {filtrados.length === 0 ? (
        <EstadoVazio
          icone={ClipboardList}
          titulo="Nenhuma AV aqui"
          descricao={busca ? 'Nada encontrado com esse termo de busca.' : 'Nenhuma AV nessa situação ainda.'}
        />
      ) : (
        <Tabela>
          <thead>
            <tr>
              <CelulaCabecalho className="pl-5">Número</CelulaCabecalho>
              <CelulaCabecalho>Cliente / Descrição</CelulaCabecalho>
              <CelulaCabecalho>Etapa</CelulaCabecalho>
              <CelulaCabecalho className="pr-5">Aberta em</CelulaCabecalho>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((av) => (
              <LinhaTabela key={av.id}>
                <CelulaTabela className="pl-5 font-medium tabular-nums">
                  <Link href={`/avs/detalhe/?id=${av.id}`} className="text-primaria hover:text-primaria-hover">
                    {av.numero}
                  </Link>
                </CelulaTabela>
                <CelulaTabela className="max-w-sm">
                  <p className="truncate font-medium">{av.cliente ?? '—'}</p>
                  <p className="truncate text-xs text-texto-secundario">{av.descricao}</p>
                </CelulaTabela>
                <CelulaTabela>
                  <EtapaBadge etapa={av.etapaAtual} />
                </CelulaTabela>
                <CelulaTabela className="pr-5 text-texto-secundario tabular-nums">
                  {formatarData(av.criadoEm.slice(0, 10))}
                </CelulaTabela>
              </LinhaTabela>
            ))}
          </tbody>
        </Tabela>
      )}
    </div>
  );
}
