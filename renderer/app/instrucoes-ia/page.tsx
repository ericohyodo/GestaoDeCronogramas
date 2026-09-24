'use client';

import { ShieldAlert } from 'lucide-react';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { InstrucoesIa } from '@/modulos/ia/componentes/InstrucoesIa';
import { usePermissao } from '@/modulos/usuarios/store/use-sessao-store';

export default function PaginaInstrucoesIa() {
  const podeEditar = usePermissao('planejamento');

  return (
    <div className="flex flex-col gap-6 p-6">
      <CabecalhoPagina
        titulo="Instruções da IA"
        descricao="O que a IA deve verificar nas análises. As mudanças valem na próxima análise, sem reiniciar o app."
      />
      {podeEditar ? (
        <InstrucoesIa />
      ) : (
        <PainelVidro>
          <EstadoVazio
            icone={ShieldAlert}
            titulo="Somente administrador e gestor"
            descricao="Peça a quem faz o planejamento para ajustar as instruções da IA."
          />
        </PainelVidro>
      )}
    </div>
  );
}
