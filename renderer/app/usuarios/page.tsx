'use client';

import { PerfisAvPanel } from '@/modulos/avs/componentes/PerfisAvPanel';
import { PaginaUsuarios } from '@/modulos/usuarios/componentes/PaginaUsuarios';
import { usePermissao } from '@/modulos/usuarios/store/use-sessao-store';

export default function Usuarios() {
  const administrador = usePermissao('administracao');
  return (
    <>
      <PaginaUsuarios />
      {administrador && (
        <div className="px-6 pb-6">
          <PerfisAvPanel />
        </div>
      )}
    </>
  );
}
