'use client';

import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { classeBotao } from '@/compartilhado/ui/Botao';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { CabecalhoCronograma } from '@/modulos/cronogramas/componentes/CabecalhoCronograma';
import { useCronogramasStore } from '@/modulos/cronogramas/store/use-cronogramas-store';
import { useResponsaveisStore } from '@/modulos/responsaveis/store/use-responsaveis-store';
import { PainelEstrutura } from '@/modulos/tarefas/componentes/PainelEstrutura';
import { usePermissao } from '@/modulos/usuarios/store/use-sessao-store';

/** Compõe os módulos Cronogramas, Tarefas e Responsáveis; os módulos não se conhecem entre si. */
export function DetalheCronograma() {
  const id = useSearchParams().get('id');
  const carregarUm = useCronogramasStore((estado) => estado.carregarUm);
  const cronograma = useCronogramasStore((estado) => estado.itens.find((item) => item.id === id));
  const responsaveis = useResponsaveisStore((estado) => estado.itens);
  const carregarResponsaveis = useResponsaveisStore((estado) => estado.carregar);
  const podeEditarTarefas = usePermissao('tarefas');
  const podeEditarFases = usePermissao('planejamento');

  // A falha fica associada ao id: ao navegar para outro cronograma, o erro anterior some sozinho.
  const [falha, setFalha] = useState<{ id: string; mensagem: string } | null>(null);
  const erro = falha?.id === id ? falha.mensagem : null;

  useEffect(() => {
    if (!id) return;
    carregarUm(id).catch((motivo: unknown) => setFalha({ id, mensagem: mensagemDeErro(motivo) }));
  }, [id, carregarUm]);

  useEffect(() => {
    void carregarResponsaveis();
  }, [carregarResponsaveis]);

  if (!id || erro) {
    return (
      <div className="p-6">
        <PainelVidro>
          <EstadoVazio
            icone={SearchX}
            titulo="Cronograma não encontrado"
            descricao={erro ?? 'Nenhum cronograma foi informado.'}
            acao={
              <Link href="/" className={classeBotao()}>
                Voltar para cronogramas
              </Link>
            }
          />
        </PainelVidro>
      </div>
    );
  }

  if (!cronograma) return null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 p-6">
      <CabecalhoCronograma cronograma={cronograma} podeEditar={podeEditarFases} />
      <PainelEstrutura
        cronogramaId={cronograma.id}
        periodo={{ inicio: cronograma.dataInicio, fim: cronograma.dataFim }}
        responsaveis={responsaveis}
        podeEditarTarefas={podeEditarTarefas}
        podeEditarFases={podeEditarFases}
      />
    </div>
  );
}
