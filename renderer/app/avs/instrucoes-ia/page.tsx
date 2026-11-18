'use client';

import { ShieldAlert } from 'lucide-react';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { InstrucoesIa } from '@/modulos/ia/componentes/InstrucoesIa';
import { usePermissao } from '@/modulos/usuarios/store/use-sessao-store';

export default function InstrucoesDaIaDasAvs() {
  const podeEditar = usePermissao('planejamento');

  return (
    <div className="flex flex-col gap-6 p-6">
      <CabecalhoPagina
        titulo="Instruções da IA — AVs"
        descricao="O que a IA deve verificar ao analisar as AVs e ao responder no chat. Valem só para o módulo de AVs e passam a valer na próxima análise, sem reiniciar o app."
      />
      {podeEditar ? (
        <InstrucoesIa escopo="avs" />
      ) : (
        <PainelVidro>
          <EstadoVazio
            icone={ShieldAlert}
            titulo="Somente administrador e gestor"
            descricao="Peça a quem coordena as AVs para ajustar as instruções da IA."
          />
        </PainelVidro>
      )}
    </div>
  );
}
