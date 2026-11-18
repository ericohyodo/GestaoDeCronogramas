'use client';

import clsx from 'clsx';
import { Bug, ImagePlus, Lightbulb, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { type ClipboardEvent, useRef, useState } from 'react';
import { LIMITES_REPORTE, type TipoReporteDTO } from '@contratos/reportes.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { formatarTamanho } from '@/compartilhado/formatacao';
import { Botao, BotaoIcone } from '@/compartilhado/ui/Botao';
import { AreaTexto } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';
import { imagensColadas, lerPrint, type PrintSelecionado, TIPOS_DE_PRINT } from '../imagens-do-reporte';

/**
 * Item do menu lateral "Reportar erro / sugestão": abre o formulário sem sair da tela atual (a rota vai
 * junto no reporte, para quem for analisar saber onde aconteceu).
 */
export function BotaoReportar() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        title="Reportar um erro ou enviar uma sugestão"
        // Mesmo desenho dos itens do menu: uma linha, alinhado à esquerda (o rótulo longo quebrava e centralizava).
        className="flex h-9 w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 text-left text-sm font-medium text-texto-secundario transition-colors hover:bg-texto/6 hover:text-texto"
      >
        <Bug aria-hidden className="size-4 shrink-0" />
        Erros e sugestões
      </button>
      <Modal
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo="Reportar erro / sugestão"
        descricao="Conte o que aconteceu ou o que poderia melhorar. A tela atual e a versão do app vão junto."
        largura="lg"
      >
        <FormularioDoReporte aoFechar={() => setAberto(false)} />
      </Modal>
    </>
  );
}

let contador = 0;
const chaveLocal = () => `${Date.now()}-${contador++}`;

/** Só existe com o modal aberto: ao fechar, o rascunho é descartado. */
function FormularioDoReporte({ aoFechar }: { aoFechar: () => void }) {
  const rota = usePathname();
  const [tipo, setTipo] = useState<TipoReporteDTO>('erro');
  const [texto, setTexto] = useState('');
  const [prints, setPrints] = useState<PrintSelecionado[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<number | null>(null);
  const seletor = useRef<HTMLInputElement>(null);

  const adicionar = async (arquivos: File[]) => {
    setErro(null);
    const vagas = LIMITES_REPORTE.imagens - prints.length;
    if (arquivos.length > vagas) {
      setErro(`Anexe no máximo ${LIMITES_REPORTE.imagens} imagens.`);
      arquivos = arquivos.slice(0, Math.max(0, vagas));
    }
    const lidos = await Promise.all(arquivos.map((arquivo) => lerPrint(arquivo, chaveLocal())));
    const recusa = lidos.find((lido): lido is string => typeof lido === 'string');
    if (recusa) setErro(recusa);
    setPrints((atual) =>
      [...atual, ...lidos.filter((lido): lido is PrintSelecionado => typeof lido !== 'string')].slice(
        0,
        LIMITES_REPORTE.imagens,
      ),
    );
  };

  const aoColar = (evento: ClipboardEvent) => {
    const imagens = imagensColadas(evento.clipboardData);
    if (imagens.length === 0) return; // texto colado segue normal para o campo
    evento.preventDefault();
    void adicionar(imagens);
  };

  const enviar = async () => {
    setErro(null);
    setEnviando(true);
    try {
      const { numero } = await clienteDesktop.reportes.criar({
        tipo,
        texto,
        rota: `${rota}${window.location.search}`,
        imagens: prints.map(({ nomeArquivo, base64 }) => ({ nomeArquivo, base64 })),
      });
      setEnviado(numero);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setEnviando(false);
    }
  };

  if (enviado !== null) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">
          Reporte <span className="font-semibold">#{enviado}</span> enviado. Os administradores foram avisados e você
          recebe uma notificação quando ele for resolvido.
        </p>
        <RodapeModal>
          <Botao variante="primario" onClick={aoFechar}>
            Fechar
          </Botao>
        </RodapeModal>
      </div>
    );
  }

  return (
    // Não é um <form>: o modal pode abrir por cima de abas que já são formulários (forms aninhados recarregam a página).
    <div className="flex flex-col gap-4" onPaste={aoColar}>
      <div role="radiogroup" aria-label="Tipo do reporte" className="inline-flex w-fit gap-1 rounded-xl border border-borda/70 p-1">
        {(
          [
            { valor: 'erro', rotulo: 'Erro', icone: Bug },
            { valor: 'sugestao', rotulo: 'Sugestão', icone: Lightbulb },
          ] as const
        ).map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            role="radio"
            aria-checked={tipo === opcao.valor}
            onClick={() => setTipo(opcao.valor)}
            className={clsx(
              'flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
              tipo === opcao.valor ? 'bg-primaria/12 text-primaria' : 'text-texto-secundario hover:bg-texto/6',
            )}
          >
            <opcao.icone aria-hidden className="size-4" />
            {opcao.rotulo}
          </button>
        ))}
      </div>

      <AreaTexto
        rotulo={tipo === 'erro' ? 'O que aconteceu?' : 'Qual é a sugestão?'}
        dica={`${texto.length}/${LIMITES_REPORTE.texto}`}
        placeholder={
          tipo === 'erro'
            ? 'Ex.: Na AV 26-012, aba PCP, cliquei em Salvar e apareceu a mensagem…'
            : 'Ex.: Seria útil filtrar a lista de AVs por cliente…'
        }
        rows={6}
        maxLength={LIMITES_REPORTE.texto}
        required
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">
            Prints <span className="font-normal text-texto-sutil">(opcional, até {LIMITES_REPORTE.imagens})</span>
          </p>
          <Botao
            tamanho="sm"
            icone={ImagePlus}
            disabled={prints.length >= LIMITES_REPORTE.imagens}
            onClick={() => seletor.current?.click()}
          >
            Anexar imagem
          </Botao>
          <input
            ref={seletor}
            type="file"
            hidden
            multiple
            accept={TIPOS_DE_PRINT.join(',')}
            onChange={(e) => {
              void adicionar(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
        </div>
        {prints.length === 0 ? (
          <p className="rounded-lg border border-dashed border-borda px-3 py-4 text-center text-xs text-texto-secundario">
            Tire o print com <kbd className="font-semibold">Win + Shift + S</kbd> e cole aqui com{' '}
            <kbd className="font-semibold">Ctrl + V</kbd>. Aceita PNG, JPG e BMP de até 10 MB.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {prints.map((print) => (
              <li key={print.chave} className="relative overflow-hidden rounded-lg border border-borda/70">
                {/* eslint-disable-next-line @next/next/no-img-element -- data: URI local, sem loader de otimização */}
                <img
                  src={`data:${print.tipoMime};base64,${print.base64}`}
                  alt={print.nomeArquivo}
                  className="h-24 w-full object-cover"
                />
                <p className="truncate px-2 py-1 text-[11px] text-texto-secundario">
                  {print.nomeArquivo} · {formatarTamanho(print.tamanhoBytes)}
                </p>
                <BotaoIcone
                  icone={X}
                  rotulo={`Remover ${print.nomeArquivo}`}
                  onClick={() => setPrints((atual) => atual.filter((p) => p.chave !== print.chave))}
                  className="absolute right-1 top-1 bg-superficie-solida/90"
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}

      <RodapeModal>
        <Botao onClick={aoFechar}>Cancelar</Botao>
        <Botao variante="primario" onClick={() => void enviar()} disabled={!texto.trim() || enviando}>
          {enviando ? 'Enviando…' : 'Enviar'}
        </Botao>
      </RodapeModal>
    </div>
  );
}
