'use client';

import { useEffect, useState } from 'react';
import { AREAS_AV, type AreaAvDTO, type AvDetalheDTO } from '@contratos/avs.contrato';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { Selecao } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { ROTULO_AREA } from '../rotulos';
import { useAvsStore } from '../store/use-avs-store';

/** O estado inicial só é recalculado ao montar: depende de `AvDetalhe` estar montado com
 * `key={av.id}` lá em cima (ver `pagina-detalhe-av.tsx`) pra reiniciar a seleção ao trocar de AV. */
export function EquipePanel({ av }: { av: AvDetalheDTO }) {
  const membros = useAvsStore((estado) => estado.membros);
  const carregarMembros = useAvsStore((estado) => estado.carregarMembros);
  const atualizarEquipe = useAvsStore((estado) => estado.atualizarEquipe);

  const [equipe, setEquipe] = useState<Partial<Record<AreaAvDTO, string>>>(() =>
    Object.fromEntries(AREAS_AV.map((area) => [area, av.membros[area]?.id ?? ''])),
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void carregarMembros();
  }, [carregarMembros]);

  const opcoes = [
    { valor: '', rotulo: '— ninguém designado —' },
    ...membros.map((membro) => ({ valor: membro.id, rotulo: membro.nome })),
  ];

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await atualizarEquipe({ avId: av.id, membros: equipe });
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <PainelVidro className="flex flex-col gap-3 p-5">
      <p className="text-xs font-medium text-texto-sutil">Equipe por área</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {AREAS_AV.map((area) => (
          <Selecao
            key={area}
            rotulo={ROTULO_AREA[area]}
            opcoes={opcoes}
            value={equipe[area] ?? ''}
            onChange={(e) => setEquipe((atual) => ({ ...atual, [area]: e.target.value }))}
          />
        ))}
      </div>
      {erro && <MensagemErro mensagem={erro} />}
      <Botao variante="secundario" onClick={() => void salvar()} disabled={salvando} className="self-end">
        {salvando ? 'Salvando…' : 'Salvar equipe'}
      </Botao>
    </PainelVidro>
  );
}
