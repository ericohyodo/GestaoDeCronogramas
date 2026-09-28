'use client';

import { ShieldAlert } from 'lucide-react';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { ConfiguracaoIa } from '@/modulos/ia/componentes/ConfiguracaoIa';
import { usePermissao } from '@/modulos/usuarios/store/use-sessao-store';

export default function Configuracoes() {
  const ehAdministrador = usePermissao('administracao');

  return (
    <div className="flex flex-col gap-6 p-6">
      <CabecalhoPagina titulo="Configurações" descricao="Ajustes que valem para todos os usuários do aplicativo." />
      {ehAdministrador ? (
        <ConfiguracaoIa />
      ) : (
        <PainelVidro>
          <EstadoVazio
            icone={ShieldAlert}
            titulo="Somente administradores"
            descricao="Peça a um administrador para alterar as configurações do aplicativo."
          />
        </PainelVidro>
      )}
    </div>
  );
}
