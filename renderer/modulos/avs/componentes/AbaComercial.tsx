'use client';

import { type FormEvent, useState } from 'react';
import type { AtualizarComercialEntrada, AvDetalheDTO } from '@contratos/avs.contrato';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { AreaTexto, CampoData, CampoTexto } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { useAvsStore } from '../store/use-avs-store';

type CamposTexto = Omit<AtualizarComercialEntrada, 'avId' | 'volumeAnual'>;

function paraFormulario(av: AvDetalheDTO): CamposTexto & { volumeAnual: string } {
  return {
    cliente: av.cliente ?? '',
    codigo: av.codigo ?? '',
    descricao: av.descricao,
    complexidade: av.complexidade ?? '',
    solicitante: av.solicitante ?? '',
    prazoCliente: av.prazoCliente ?? '',
    desenhoClienteRef: av.desenhoClienteRef ?? '',
    contatoComercial: av.contatoComercial ?? '',
    emailComercial: av.emailComercial ?? '',
    foneComercial: av.foneComercial ?? '',
    contatoTecnico: av.contatoTecnico ?? '',
    dataFechamento: av.dataFechamento ?? '',
    programa: av.programa ?? '',
    volumeAnual: av.volumeAnual != null ? String(av.volumeAnual) : '',
    anoSopEop: av.anoSopEop ?? '',
    respAbertura: av.respAbertura ?? '',
    linha: av.linha ?? '',
    origemProjeto: av.origemProjeto ?? '',
    localEntrega: av.localEntrega ?? '',
    conceitoLogistico: av.conceitoLogistico ?? '',
    respEmbalagem: av.respEmbalagem ?? '',
    infoComplementarComercial: av.infoComplementarComercial ?? '',
  };
}

/** O estado inicial só é recalculado ao montar: depende de `AvDetalhe` estar montado com
 * `key={av.id}` lá em cima (ver `pagina-detalhe-av.tsx`) pra reiniciar o formulário ao trocar de AV. */
export function AbaComercial({ av }: { av: AvDetalheDTO }) {
  const atualizarComercial = useAvsStore((estado) => estado.atualizarComercial);
  const [campos, setCampos] = useState(() => paraFormulario(av));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const def = <K extends keyof CamposTexto>(campo: K) => ({
    value: campos[campo] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setCampos((atual) => ({ ...atual, [campo]: e.target.value })),
  });

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await atualizarComercial({
        avId: av.id,
        ...campos,
        volumeAnual: campos.volumeAnual.trim() ? Number(campos.volumeAnual) : null,
      });
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <PainelVidro className="flex flex-col gap-4 p-5">
        <p className="text-xs font-medium text-texto-sutil">Identificação</p>
        <CampoTexto rotulo="Descrição do item/produto" maxLength={200} required {...def('descricao')} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CampoTexto rotulo="Cliente" {...def('cliente')} />
          <CampoTexto rotulo="Código" {...def('codigo')} />
          <CampoTexto rotulo="Complexidade" {...def('complexidade')} />
          <CampoTexto rotulo="Solicitante" {...def('solicitante')} />
          <CampoData rotulo="Prazo do cliente" {...def('prazoCliente')} />
          <CampoTexto rotulo="Desenho (ref. cliente)" {...def('desenhoClienteRef')} />
          <CampoTexto rotulo="Programa" {...def('programa')} />
          <CampoTexto
            rotulo="Volume anual"
            type="number"
            min={0}
            value={campos.volumeAnual}
            onChange={(e) => setCampos((atual) => ({ ...atual, volumeAnual: e.target.value }))}
          />
          <CampoTexto rotulo="Ano SOP/EOP" {...def('anoSopEop')} />
        </div>
      </PainelVidro>

      <PainelVidro className="flex flex-col gap-4 p-5">
        <p className="text-xs font-medium text-texto-sutil">Contato</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CampoTexto rotulo="Contato comercial" {...def('contatoComercial')} />
          <CampoTexto rotulo="E-mail comercial" type="email" {...def('emailComercial')} />
          <CampoTexto rotulo="Telefone comercial" {...def('foneComercial')} />
          <CampoTexto rotulo="Contato técnico" {...def('contatoTecnico')} />
          <CampoData rotulo="Data de fechamento" {...def('dataFechamento')} />
          <CampoTexto rotulo="Responsável pela abertura" {...def('respAbertura')} />
        </div>
      </PainelVidro>

      <PainelVidro className="flex flex-col gap-4 p-5">
        <p className="text-xs font-medium text-texto-sutil">Logística</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CampoTexto rotulo="Linha" {...def('linha')} />
          <CampoTexto rotulo="Origem do projeto" {...def('origemProjeto')} />
          <CampoTexto rotulo="Local de entrega" {...def('localEntrega')} />
          <CampoTexto rotulo="Conceito logístico" {...def('conceitoLogistico')} />
          <CampoTexto rotulo="Responsável pela embalagem" {...def('respEmbalagem')} />
        </div>
      </PainelVidro>

      <PainelVidro className="flex flex-col gap-3 p-5">
        <p className="text-xs font-medium text-texto-sutil">Observações</p>
        <AreaTexto rotulo="Informações complementares" rows={4} {...def('infoComplementarComercial')} />
      </PainelVidro>

      {erro && <MensagemErro mensagem={erro} />}
      <Botao type="submit" variante="primario" disabled={salvando} className="self-end">
        {salvando ? 'Salvando…' : 'Salvar alterações'}
      </Botao>
    </form>
  );
}
