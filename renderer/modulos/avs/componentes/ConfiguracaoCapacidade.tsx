'use client';

import { Factory } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import type { CapacidadeConfigDTO } from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { CampoTexto } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';

interface Formulario {
  horasPorTurno: string;
  diasProdutivosMes: string;
}

const paraFormulario = (config: CapacidadeConfigDTO): Formulario => ({
  horasPorTurno: String(config.horasPorTurno),
  diasProdutivosMes: String(config.diasProdutivosMes),
});

/** Seção "Capacidade do PCP" da tela de Configurações (só administrador): base do cálculo de turnos. */
export function ConfiguracaoCapacidade() {
  const [salvo, setSalvo] = useState<CapacidadeConfigDTO | null>(null);
  const [form, setForm] = useState<Formulario | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    clienteDesktop.avs
      .obterCapacidadeConfig()
      .then((config) => {
        setSalvo(config);
        setForm(paraFormulario(config));
      })
      .catch((falha: unknown) => setErro(mensagemDeErro(falha)));
  }, []);

  const horas = Number(form?.horasPorTurno);
  const dias = Number(form?.diasProdutivosMes);
  const valido =
    !!form && Number.isFinite(horas) && horas > 0 && horas <= 24 && Number.isInteger(dias) && dias >= 1 && dias <= 31;
  const sujo = !!form && !!salvo && JSON.stringify(form) !== JSON.stringify(paraFormulario(salvo));

  /** Grava os dois parâmetros de uma vez. */
  const salvar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!valido) return;
    setSalvando(true);
    setErro(null);
    setSucesso(null);
    try {
      const config = await clienteDesktop.avs.salvarCapacidadeConfig({ horasPorTurno: horas, diasProdutivosMes: dias });
      setSalvo(config);
      setForm(paraFormulario(config));
      setSucesso('Parâmetros salvos. Os turnos do PCP passam a usar estes valores.');
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
          <Factory aria-hidden className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Capacidade do PCP</h2>
          <p className="mt-0.5 text-sm text-texto-secundario">
            Base do cálculo de turnos na carga de máquina da AV: turnos = carga do mês ÷ (peças por hora × horas por
            turno × dias produtivos no mês).
          </p>
        </div>
      </header>

      {erro && <MensagemErro className="mt-4" mensagem={erro} aoFechar={() => setErro(null)} />}

      {form && (
        <form onSubmit={(evento) => void salvar(evento)} className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <CampoTexto
              rotulo="Horas por turno"
              type="number"
              min={0.5}
              max={24}
              step="0.1"
              value={form.horasPorTurno}
              onChange={(e) => setForm((atual) => (atual ? { ...atual, horasPorTurno: e.target.value } : atual))}
            />
            <CampoTexto
              rotulo="Dias produtivos por mês"
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              step={1}
              value={form.diasProdutivosMes}
              onChange={(e) => setForm((atual) => (atual ? { ...atual, diasProdutivosMes: e.target.value } : atual))}
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            {sucesso && <p className="text-sm text-texto-secundario">{sucesso}</p>}
            <Botao type="submit" variante="primario" disabled={salvando || !valido || !sujo}>
              {salvando ? 'Salvando…' : 'Salvar capacidade'}
            </Botao>
          </div>
        </form>
      )}
    </PainelVidro>
  );
}
