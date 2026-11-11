'use client';

import { FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { formatarDataLocal } from '@/compartilhado/formatacao';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { STATUS_SD_VISUAL as STATUS } from '../rotulos';
import { useSdsStore } from '../store/use-sds-store';

/** Cada SD nasce de uma AV e herda o número dela (AV 26-007 → SD 26-007 → PRO 26-007). */
export function PaginaSds() {
  const { itens, erro, carregando, carregar, limparErro } = useSdsStore();
  const router = useRouter();

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <CabecalhoPagina
        titulo="Solicitações de Desenvolvimento"
        descricao="Passagem de bastão do Comercial para a Engenharia. O número acompanha o da AV e o do projeto."
      />

      {erro && <MensagemErro mensagem={erro} aoFechar={limparErro} />}

      {carregando && itens.length === 0 ? (
        <p className="text-sm text-texto-secundario">Carregando SDs…</p>
      ) : itens.length === 0 ? (
        <EstadoVazio
          icone={FileText}
          titulo="Nenhuma SD ainda"
          descricao="Finalize uma AV na aba Resumo (Finalizar AV e Criar Pré SD) para gerar a primeira."
        />
      ) : (
        <Tabela>
          <thead>
            <tr>
              <CelulaCabecalho className="pl-5">SD</CelulaCabecalho>
              <CelulaCabecalho>AV de origem</CelulaCabecalho>
              <CelulaCabecalho>Cliente / Descrição</CelulaCabecalho>
              <CelulaCabecalho>Status</CelulaCabecalho>
              <CelulaCabecalho>Projeto</CelulaCabecalho>
              <CelulaCabecalho className="pr-5">Criada em</CelulaCabecalho>
            </tr>
          </thead>
          <tbody>
            {itens.map((sd) => (
              <LinhaTabela
                key={sd.id}
                className="cursor-pointer"
                onClick={() => router.push(`/sds/detalhe/?id=${sd.id}`)}
              >
                <CelulaTabela className="pl-5 font-medium tabular-nums">
                  <Link
                    href={`/sds/detalhe/?id=${sd.id}`}
                    className="text-primaria hover:text-primaria-hover"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {sd.numero}
                  </Link>
                </CelulaTabela>
                <CelulaTabela className="tabular-nums">
                  <Link
                    href={`/avs/detalhe/?id=${sd.avId}`}
                    className="text-primaria hover:text-primaria-hover"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {sd.avNumero}
                  </Link>
                </CelulaTabela>
                <CelulaTabela className="max-w-sm">
                  <p className="truncate font-medium">{sd.cliente ?? '—'}</p>
                  <p className="truncate text-xs text-texto-secundario">{sd.descricao}</p>
                </CelulaTabela>
                <CelulaTabela>
                  <Etiqueta tom={STATUS[sd.status].tom}>{STATUS[sd.status].rotulo}</Etiqueta>
                </CelulaTabela>
                <CelulaTabela className="tabular-nums text-texto-secundario">{sd.numeroProjeto}</CelulaTabela>
                <CelulaTabela className="pr-5 tabular-nums text-texto-secundario">
                  {formatarDataLocal(sd.criadoEm)}
                </CelulaTabela>
              </LinhaTabela>
            ))}
          </tbody>
        </Tabela>
      )}
    </div>
  );
}
