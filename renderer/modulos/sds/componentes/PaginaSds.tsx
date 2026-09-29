'use client';

import { FileText } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import type { StatusSdDTO } from '@contratos/sds.contrato';
import { formatarData } from '@/compartilhado/formatacao';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { Etiqueta, type Tom } from '@/compartilhado/ui/Etiqueta';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { useSdsStore } from '../store/use-sds-store';

const STATUS: Record<StatusSdDTO, { rotulo: string; tom: Tom }> = {
  pre_sd: { rotulo: 'Pré-SD', tom: 'alerta' },
  aberta: { rotulo: 'Aberta', tom: 'info' },
  fechada: { rotulo: 'Fechada', tom: 'sucesso' },
  cancelada: { rotulo: 'Cancelada', tom: 'perigo' },
};

/** Cada SD nasce de uma AV e herda o número dela (AV 0007-26 → SD 0007-26 → PRO 0007-26). */
export function PaginaSds() {
  const { itens, erro, carregar, limparErro } = useSdsStore();

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <CabecalhoPagina
        titulo="Solicitações de Desenvolvimento"
        descricao="SDs criadas a partir das AVs finalizadas. O número acompanha o da AV e o do projeto."
      />

      {erro && <MensagemErro mensagem={erro} aoFechar={limparErro} />}

      {itens.length === 0 ? (
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
              <LinhaTabela key={sd.id}>
                <CelulaTabela className="pl-5 font-medium tabular-nums">{sd.numero}</CelulaTabela>
                <CelulaTabela className="tabular-nums">
                  <Link href={`/avs/detalhe/?id=${sd.avId}`} className="text-primaria hover:text-primaria-hover">
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
                  {formatarData(sd.criadoEm.slice(0, 10))}
                </CelulaTabela>
              </LinhaTabela>
            ))}
          </tbody>
        </Tabela>
      )}
    </div>
  );
}
