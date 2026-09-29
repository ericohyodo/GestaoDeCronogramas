'use client';

import { FolderOpen, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { TemplateAvDTO, TemplateAvEntrada, TipoTemplateAvDTO } from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao, BotaoIcone } from '@/compartilhado/ui/Botao';
import { DialogoConfirmacao } from '@/compartilhado/ui/DialogoConfirmacao';
import { CLASSE_CELULA_EDITAVEL } from './TabelaDeMateriais';

type ItensDoTipo<T extends TipoTemplateAvDTO> = Extract<TemplateAvDTO, { tipo: T }>['itens'];

/**
 * Salvar a tabela atual como template e carregar um template salvo. Os templates são globais
 * (compartilhados entre AVs) e cada tipo tem o seu próprio conjunto. Carregar substitui a tabela.
 */
export function BarraDeTemplates<T extends TipoTemplateAvDTO>({
  tipo,
  itens,
  aoCarregar,
}: {
  tipo: T;
  /** Itens atuais da tabela, no formato gravado no template. */
  itens: () => ItensDoTipo<T>;
  aoCarregar: (itens: ItensDoTipo<T>) => void;
}) {
  const [templates, setTemplates] = useState<TemplateAvDTO[]>([]);
  const [modo, setModo] = useState<'fechado' | 'salvar' | 'carregar'>('fechado');
  const [nome, setNome] = useState('');
  const [escolhido, setEscolhido] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  const recarregar = useCallback(async () => {
    setTemplates(await clienteDesktop.avs.listarTemplates(tipo));
  }, [tipo]);

  useEffect(() => {
    clienteDesktop.avs
      .listarTemplates(tipo)
      .then(setTemplates)
      .catch((falha: unknown) => setMensagem({ texto: mensagemDeErro(falha), erro: true }));
  }, [tipo]);

  const executar = async (acao: () => Promise<string>) => {
    setOcupado(true);
    setMensagem(null);
    try {
      setMensagem({ texto: await acao(), erro: false });
    } catch (falha) {
      setMensagem({ texto: mensagemDeErro(falha), erro: true });
    } finally {
      setOcupado(false);
    }
  };

  const salvar = () =>
    executar(async () => {
      const entrada = { tipo, nome, itens: itens() } as TemplateAvEntrada;
      const salvo = await clienteDesktop.avs.salvarTemplate(entrada);
      await recarregar();
      setNome('');
      setModo('fechado');
      return `Template "${salvo.nome}" salvo.`;
    });

  const carregar = () =>
    executar(async () => {
      const template = templates.find((item) => item.id === escolhido);
      if (!template) throw new Error('Escolha um template.');
      aoCarregar(template.itens as ItensDoTipo<T>);
      setModo('fechado');
      return `Template "${template.nome}" carregado. Salve a aba para gravar.`;
    });

  // Nada de window.confirm: no Electron o diálogo nativo deixa os campos sem aceitar digitação.
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const templateEscolhido = templates.find((item) => item.id === escolhido);

  const excluir = () =>
    executar(async () => {
      if (!templateEscolhido) throw new Error('Escolha um template.');
      await clienteDesktop.avs.excluirTemplate(templateEscolhido.id);
      setEscolhido('');
      await recarregar();
      return `Template "${templateEscolhido.nome}" excluído.`;
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Botao tamanho="sm" icone={Save} onClick={() => setModo(modo === 'salvar' ? 'fechado' : 'salvar')}>
          Salvar como template
        </Botao>
        <Botao
          tamanho="sm"
          icone={FolderOpen}
          onClick={() => setModo(modo === 'carregar' ? 'fechado' : 'carregar')}
          disabled={templates.length === 0}
          title={templates.length === 0 ? 'Nenhum template salvo ainda' : undefined}
        >
          Carregar template ({templates.length})
        </Botao>
      </div>

      {modo === 'salvar' && (
        <div className="flex items-center gap-2">
          <input
            aria-label="Nome do template"
            placeholder="Nome do template (usar um nome existente o substitui)"
            className={`${CLASSE_CELULA_EDITAVEL} max-w-sm`}
            value={nome}
            list={`templates-${tipo}`}
            onChange={(e) => setNome(e.target.value)}
          />
          <datalist id={`templates-${tipo}`}>
            {templates.map((template) => (
              <option key={template.id} value={template.nome} />
            ))}
          </datalist>
          <Botao tamanho="sm" variante="primario" onClick={() => void salvar()} disabled={ocupado || !nome.trim()}>
            Salvar
          </Botao>
        </div>
      )}

      {modo === 'carregar' && (
        <div className="flex items-center gap-2">
          <select
            aria-label="Template salvo"
            className={`${CLASSE_CELULA_EDITAVEL} max-w-sm`}
            value={escolhido}
            onChange={(e) => setEscolhido(e.target.value)}
          >
            <option value="">— escolha um template —</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.nome} ({template.itens.length} {template.itens.length === 1 ? 'linha' : 'linhas'})
              </option>
            ))}
          </select>
          <Botao tamanho="sm" variante="primario" onClick={() => void carregar()} disabled={ocupado || !escolhido}>
            Carregar
          </Botao>
          <BotaoIcone
            icone={Trash2}
            rotulo="Excluir template"
            onClick={() => setConfirmandoExclusao(true)}
            disabled={ocupado || !escolhido}
          />
        </div>
      )}

      <DialogoConfirmacao
        aberto={confirmandoExclusao}
        titulo="Excluir template"
        mensagem={`Excluir o template "${templateEscolhido?.nome ?? ''}"?`}
        aoConfirmar={excluir}
        aoFechar={() => setConfirmandoExclusao(false)}
      />

      {mensagem?.texto && (
        <p className={mensagem.erro ? 'text-xs text-perigo' : 'text-xs text-texto-secundario'}>{mensagem.texto}</p>
      )}
    </div>
  );
}
