'use client';

import { ArrowRight, Ban } from 'lucide-react';
import { useState } from 'react';
import type { AvDetalheDTO } from '@contratos/avs.contrato';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { AbaComercial } from './AbaComercial';
import { DeclinarModal } from './DeclinarModal';
import { EquipePanel } from './EquipePanel';
import { EtapaBadge } from './EtapaBadge';
import { HistoricoPanel } from './HistoricoPanel';
import { useAvsStore } from '../store/use-avs-store';

const NOME_DA_PROXIMA_AREA: Record<string, string> = {
  comercial: 'Engenharia de Produto',
  eng_produto: 'Engenharia de Processo',
  eng_processo: 'PCP',
  pcp: 'Mapa de Custo',
  mapa_custo: 'confirmação de envio da proposta',
  proposta_enviada: 'abertura da SD',
};

export function AvDetalhe({ av }: { av: AvDetalheDTO }) {
  const avancarEtapa = useAvsStore((estado) => estado.avancarEtapa);
  const [avancando, setAvancando] = useState(false);
  const [erroAvanco, setErroAvanco] = useState<string | null>(null);
  const [declinando, setDeclinando] = useState(false);

  const etapa = av.etapaAtual;
  const podeAvancarAgora = !etapa.terminal && etapa.chave !== 'sd_aberta';
  const podeDeclinarAgora = !etapa.terminal;

  const avancar = async () => {
    setAvancando(true);
    setErroAvanco(null);
    try {
      await avancarEtapa({ avId: av.id });
    } catch (falha) {
      setErroAvanco(mensagemDeErro(falha));
    } finally {
      setAvancando(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PainelVidro className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-texto-sutil">AV</p>
            <h1 className="text-xl font-semibold tabular-nums">{av.numero}</h1>
          </div>
          <EtapaBadge etapa={etapa} />
        </div>

        {etapa.terminal ? (
          <p className="text-sm text-texto-secundario">
            {etapa.chave === 'projeto_criado'
              ? 'Esta AV foi concluída.'
              : 'Esta AV foi declinada e não pode mais avançar.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {etapa.chave === 'sd_aberta' && (
              <p className="text-sm text-texto-secundario">
                A abertura e o fechamento da SD (que criam o projeto automaticamente) ainda não foram
                implementados nesta versão.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {podeAvancarAgora && (
                <Botao
                  variante="primario"
                  icone={ArrowRight}
                  onClick={() => void avancar()}
                  disabled={avancando}
                >
                  {avancando
                    ? 'Avançando…'
                    : `Avançar para ${NOME_DA_PROXIMA_AREA[etapa.chave] ?? 'a próxima etapa'}`}
                </Botao>
              )}
              {podeDeclinarAgora && (
                <Botao variante="perigo" icone={Ban} onClick={() => setDeclinando(true)}>
                  Declinar AV
                </Botao>
              )}
            </div>
          </div>
        )}
        {erroAvanco && <MensagemErro mensagem={erroAvanco} aoFechar={() => setErroAvanco(null)} />}
      </PainelVidro>

      {/* `key`: reinicia os formulários com os dados certos ao navegar para outra AV. */}
      <div key={av.id} className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        <AbaComercial av={av} />
        <div className="flex flex-col gap-5">
          <EquipePanel av={av} />
          <HistoricoPanel avId={av.id} />
        </div>
      </div>

      <DeclinarModal avId={av.id} aberto={declinando} aoFechar={() => setDeclinando(false)} />
    </div>
  );
}
