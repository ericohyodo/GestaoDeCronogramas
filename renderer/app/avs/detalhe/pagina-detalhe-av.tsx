'use client';

import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { classeBotao } from '@/compartilhado/ui/Botao';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { AvDetalhe } from '@/modulos/avs/componentes/AvDetalhe';
import { useAvsStore } from '@/modulos/avs/store/use-avs-store';

/** Export estático não gera páginas para IDs desconhecidos no build, por isso o detalhe usa
 * query string: /avs/detalhe/?id=<uuid> — mesmo padrão de /cronograma/. */
export function PaginaDetalheAv() {
  const id = useSearchParams().get('id');
  const carregarUm = useAvsStore((estado) => estado.carregarUm);
  const av = useAvsStore((estado) => estado.detalhesPorId[id ?? '']);

  const [falha, setFalha] = useState<{ id: string; mensagem: string } | null>(null);
  const erro = falha?.id === id ? falha.mensagem : null;

  useEffect(() => {
    if (!id) return;
    carregarUm(id).catch((motivo: unknown) => setFalha({ id, mensagem: mensagemDeErro(motivo) }));
  }, [id, carregarUm]);

  if (!id || erro) {
    return (
      <div className="p-6">
        <PainelVidro>
          <EstadoVazio
            icone={SearchX}
            titulo="AV não encontrada"
            descricao={erro ?? 'Nenhuma AV foi informada.'}
            acao={
              <Link href="/avs/" className={classeBotao()}>
                Voltar para AVs
              </Link>
            }
          />
        </PainelVidro>
      </div>
    );
  }

  if (!av) return null;

  return (
    <div className="p-6">
      <AvDetalhe key={av.id} av={av} />
    </div>
  );
}
