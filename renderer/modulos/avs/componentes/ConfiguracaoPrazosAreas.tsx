'use client';

import { CalendarClock } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import type { PrazosConfigDTO } from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { CampoTexto } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';

const AREAS: { chave: keyof PrazosConfigDTO; rotulo: string }[] = [
  { chave: 'produto', rotulo: 'Eng. Produto' },
  { chave: 'processo', rotulo: 'Eng. Processo' },
  { chave: 'pcp', rotulo: 'PCP' },
  { chave: 'custo', rotulo: 'Mapa de Custo' },
];

type Formulario = Record<keyof PrazosConfigDTO, string>;

const paraFormulario = (config: PrazosConfigDTO): Formulario => ({
  produto: String(config.produto),
  processo: String(config.processo),
  pcp: String(config.pcp),
  custo: String(config.custo),
});

/** Seção "Prazos das áreas da AV" da tela de Configurações (só administrador). */
export function ConfiguracaoPrazosAreas() {
  const [salvo, setSalvo] = useState<PrazosConfigDTO | null>(null);
  const [form, setForm] = useState<Formulario | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    clienteDesktop.avs
      .obterPrazosConfig()
      .then((config) => {
        setSalvo(config);
        setForm(paraFormulario(config));
      })
      .catch((falha: unknown) => setErro(mensagemDeErro(falha)));
  }, []);

  const valido =
    !!form && AREAS.every(({ chave }) => /^\d+$/.test(form[chave]) && Number(form[chave]) >= 1 && Number(form[chave]) <= 30);
  const sujo = !!form && !!salvo && JSON.stringify(form) !== JSON.stringify(paraFormulario(salvo));

  /** Grava os quatro prazos de uma vez. */
  const salvar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!form) return;
    setSalvando(true);
    setErro(null);
    setSucesso(null);
    try {
      const config = await clienteDesktop.avs.salvarPrazosConfig({
        produto: Number(form.produto),
        processo: Number(form.processo),
        pcp: Number(form.pcp),
        custo: Number(form.custo),
      });
      setSalvo(config);
      setForm(paraFormulario(config));
      setSucesso('Prazos salvos. Valem para as próximas etapas liberadas.');
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <PainelVidro className="p-6">
      <header className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primaria/10 text-primaria">
          <CalendarClock aria-hidden className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Prazos das áreas da AV</h2>
          <p className="mt-0.5 text-sm text-texto-secundario">
            Dias úteis que cada área tem para preencher a sua aba, contados a partir da liberação da etapa. Vale para
            as próximas etapas liberadas; prazos em curso não mudam.
          </p>
        </div>
      </header>

      {erro && <MensagemErro className="mt-4" mensagem={erro} aoFechar={() => setErro(null)} />}

      {form && (
        <form onSubmit={(evento) => void salvar(evento)} className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {AREAS.map(({ chave, rotulo }) => (
              <CampoTexto
                key={chave}
                rotulo={`${rotulo} (dias úteis)`}
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                step={1}
                value={form[chave]}
                onChange={(evento) => setForm((atual) => (atual ? { ...atual, [chave]: evento.target.value } : atual))}
              />
            ))}
          </div>
          <div className="flex items-center justify-end gap-3">
            {sucesso && <p className="text-sm text-texto-secundario">{sucesso}</p>}
            <Botao type="submit" variante="primario" disabled={salvando || !valido || !sujo}>
              {salvando ? 'Salvando…' : 'Salvar prazos'}
            </Botao>
          </div>
        </form>
      )}
    </PainelVidro>
  );
}
