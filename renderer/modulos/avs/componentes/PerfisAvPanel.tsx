'use client';

import { ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  AREAS_AV,
  PAPEIS_ESPECIAIS,
  type PapelEspecialDTO,
  type PerfilAvDTO,
} from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { ROTULO_AREA } from '../rotulos';
import { useMeuPerfilAv } from '../store/use-meu-perfil-av';

export const ROTULO_PAPEL_ESPECIAL: Record<PapelEspecialDTO, string> = {
  gerente_engenharia: 'Gerente de Engenharia',
  gestor_programa: 'Gestor de Programa',
};

// =====================================================================================================
// Painel "Fluxo AV/SD" da tela de Usuários (administrador): competências por área (quem pode criar AV
// e assumir cada área) e papéis que dão o aceite da SD. Cada clique grava na hora.
// =====================================================================================================

/** Alterna um item numa lista sem repetição. */
function alternar<T>(lista: readonly T[], item: T): T[] {
  return lista.includes(item) ? lista.filter((atual) => atual !== item) : [...lista, item];
}

export function PerfisAvPanel() {
  const [perfis, setPerfis] = useState<PerfilAvDTO[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [gravando, setGravando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const recarregarMeuPerfil = useMeuPerfilAv((estado) => estado.carregar);

  const carregar = useCallback(
    () =>
      clienteDesktop.avs
        .listarPerfis()
        .then(setPerfis)
        .catch((falha: unknown) => setErro(mensagemDeErro(falha)))
        .finally(() => setCarregando(false)),
    [],
  );

  useEffect(() => {
    clienteDesktop.avs
      .listarPerfis()
      .then(setPerfis)
      .catch((falha: unknown) => setErro(mensagemDeErro(falha)))
      .finally(() => setCarregando(false));
  }, []);

  /** Grava o perfil alterado; em caso de erro volta ao que está no banco. */
  const gravar = async (perfil: PerfilAvDTO) => {
    setErro(null);
    setGravando(perfil.usuarioId);
    setPerfis((atuais) => atuais.map((atual) => (atual.usuarioId === perfil.usuarioId ? perfil : atual)));
    try {
      await clienteDesktop.avs.salvarPerfil({
        usuarioId: perfil.usuarioId,
        papelAv: perfil.papelAv,
        competencias: perfil.competencias,
        papeisEspeciais: perfil.papeisEspeciais,
      });
      void recarregarMeuPerfil(true);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      await carregar();
    } finally {
      setGravando(null);
    }
  };

  const caixa = (marcado: boolean, aoMudar: () => void, rotulo: string, desabilitado: boolean) => (
    <input
      type="checkbox"
      className="size-4 accent-primaria"
      checked={marcado}
      onChange={aoMudar}
      disabled={desabilitado}
      aria-label={rotulo}
    />
  );

  return (
    <PainelVidro className="flex flex-col gap-3 pb-2">
      <div className="flex items-start gap-3 px-5 pt-5">
        <ShieldCheck aria-hidden className="mt-0.5 size-5 text-titulo-secao" />
        <div>
          <h2 className="text-base font-semibold">Fluxo AV / SD</h2>
          <p className="text-sm text-texto-secundario">
            Competências definem quem pode criar AVs e ser responsável por cada área. O aceite da SD (passagem
            do Comercial para a Engenharia) é dado só por quem tem papel de Gerente de Engenharia ou Gestor de
            Programa.
          </p>
        </div>
      </div>
      {erro && <MensagemErro className="mx-5" mensagem={erro} aoFechar={() => setErro(null)} />}
      {carregando ? (
        <p className="px-5 pb-4 text-sm text-texto-secundario">Carregando…</p>
      ) : (
        <Tabela>
          <thead>
            <tr>
              <CelulaCabecalho className="pl-5">Usuário</CelulaCabecalho>
              {AREAS_AV.map((area) => (
                <CelulaCabecalho key={area} className="text-center">
                  {ROTULO_AREA[area]}
                </CelulaCabecalho>
              ))}
              {PAPEIS_ESPECIAIS.map((papel) => (
                <CelulaCabecalho key={papel} className="text-center" ajuda="Pode dar o aceite da SD.">
                  {ROTULO_PAPEL_ESPECIAL[papel]}
                </CelulaCabecalho>
              ))}
              <CelulaCabecalho className="pr-5 text-center" ajuda="Só consulta as AVs; não edita nenhuma área.">
                Só visualiza
              </CelulaCabecalho>
            </tr>
          </thead>
          <tbody>
            {perfis.map((perfil) => {
              const ocupado = gravando === perfil.usuarioId;
              return (
                <LinhaTabela key={perfil.usuarioId}>
                  <CelulaTabela className="pl-5 font-medium">{perfil.nome}</CelulaTabela>
                  {AREAS_AV.map((area) => (
                    <CelulaTabela key={area} className="text-center">
                      {caixa(
                        perfil.competencias.includes(area),
                        () => void gravar({ ...perfil, competencias: alternar(perfil.competencias, area) }),
                        `${ROTULO_AREA[area]} — ${perfil.nome}`,
                        ocupado,
                      )}
                    </CelulaTabela>
                  ))}
                  {PAPEIS_ESPECIAIS.map((papel) => (
                    <CelulaTabela key={papel} className="text-center">
                      {caixa(
                        perfil.papeisEspeciais.includes(papel),
                        () => void gravar({ ...perfil, papeisEspeciais: alternar(perfil.papeisEspeciais, papel) }),
                        `${ROTULO_PAPEL_ESPECIAL[papel]} — ${perfil.nome}`,
                        ocupado,
                      )}
                    </CelulaTabela>
                  ))}
                  <CelulaTabela className="pr-5 text-center">
                    {caixa(
                      perfil.papelAv === 'visualizador',
                      () =>
                        void gravar({ ...perfil, papelAv: perfil.papelAv === 'visualizador' ? 'padrao' : 'visualizador' }),
                      `Só visualiza — ${perfil.nome}`,
                      ocupado,
                    )}
                  </CelulaTabela>
                </LinhaTabela>
              );
            })}
          </tbody>
        </Tabela>
      )}
    </PainelVidro>
  );
}
