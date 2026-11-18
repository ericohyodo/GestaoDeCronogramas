'use client';

import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { MeuPerfilAvDTO } from '@contratos/avs.contrato';
import type { SdDTO } from '@contratos/sds.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { classeBotao } from '@/compartilhado/ui/Botao';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { podeDarAceite, useMeuPerfilAv } from '@/modulos/avs/store/use-meu-perfil-av';
import { DetalheSd } from '@/modulos/sds/componentes/DetalheSd';

/** /sds/detalhe/?id=<uuid> — compõe a SD (módulo SDs) com o perfil AV/SD do usuário (módulo AVs). */
export function PaginaDetalheSd() {
  const id = useSearchParams().get('id');
  const carregarPerfil = useMeuPerfilAv((estado) => estado.carregar);
  const [sd, setSd] = useState<SdDTO | null>(null);
  const [perfil, setPerfil] = useState<MeuPerfilAvDTO | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([clienteDesktop.sds.obter(id), carregarPerfil(true)])
      .then(([encontrada, meuPerfil]) => {
        setSd(encontrada);
        setPerfil(meuPerfil);
      })
      .catch((falha: unknown) => setErro(mensagemDeErro(falha)));
  }, [id, carregarPerfil]);

  if (!id || erro) {
    return (
      <div className="p-6">
        <PainelVidro>
          <EstadoVazio
            icone={SearchX}
            titulo="SD não encontrada"
            descricao={erro ?? 'Nenhuma SD foi informada.'}
            acao={
              <Link href="/sds/" className={classeBotao()}>
                Voltar para SDs
              </Link>
            }
          />
        </PainelVidro>
      </div>
    );
  }
  if (!sd) return <p className="p-6 text-sm text-texto-secundario">Carregando SD…</p>;

  const permissoes = {
    comercial: !!perfil && (perfil.administrador || perfil.usuarioId === sd.responsavelComercialId),
    engenharia: podeDarAceite(perfil),
  };
  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <DetalheSd key={sd.id} sdInicial={sd} permissoes={permissoes} aoAtualizar={setSd} />
    </div>
  );
}
