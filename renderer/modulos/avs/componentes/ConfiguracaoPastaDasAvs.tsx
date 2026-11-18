'use client';

import { FolderOpen, FolderTree } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { CampoTexto } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';

/** Seção "Pasta das AVs" da tela de Configurações (só administrador): onde o app cria a pasta de cada AV nova. */
export function ConfiguracaoPastaDasAvs() {
  const [salva, setSalva] = useState<string | null | undefined>(undefined);
  const [caminho, setCaminho] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    clienteDesktop.avs
      .obterPastaConfig()
      .then((config) => {
        setSalva(config.pastaRaiz);
        setCaminho(config.pastaRaiz ?? '');
      })
      .catch((falha: unknown) => setErro(mensagemDeErro(falha)));
  }, []);

  const escolher = async () => {
    setErro(null);
    try {
      const escolhida = await clienteDesktop.avs.selecionarPastaRaiz();
      if (escolhida) setCaminho(escolhida);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  };

  /** Grava a raiz (vazia desliga a criação automática). */
  const salvar = async (evento: FormEvent) => {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    setSucesso(null);
    try {
      const config = await clienteDesktop.avs.salvarPastaConfig({ pastaRaiz: caminho.trim() || null });
      setSalva(config.pastaRaiz);
      setCaminho(config.pastaRaiz ?? '');
      setSucesso(config.pastaRaiz ? 'Pasta salva. As próximas AVs já nascem com a pasta criada.' : 'Criação automática desligada.');
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
          <FolderTree aria-hidden className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Pasta das AVs</h2>
          <p className="mt-0.5 text-sm text-texto-secundario">
            Ao criar uma AV, o app cria dentro desta pasta uma pasta com o nome &quot;AV 26-036 - Cliente - Descrição&quot; para
            as entradas do Comercial (e-mails, desenhos, orçamentos). Use um caminho que todos acessem, como uma pasta de rede.
          </p>
        </div>
      </header>

      {erro && <MensagemErro className="mt-4" mensagem={erro} aoFechar={() => setErro(null)} />}

      {salva !== undefined && (
        <form onSubmit={(evento) => void salvar(evento)} className="mt-4 flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <CampoTexto
              rotulo="Pasta raiz"
              classeContainer="flex-1"
              placeholder="Ex.: E:\COMERCIAL - AV\AVs"
              maxLength={200}
              value={caminho}
              onChange={(e) => setCaminho(e.target.value)}
            />
            <Botao icone={FolderOpen} onClick={() => void escolher()}>
              Escolher…
            </Botao>
          </div>
          <div className="flex items-center justify-end gap-3">
            {sucesso && <p className="text-sm text-texto-secundario">{sucesso}</p>}
            <Botao type="submit" variante="primario" disabled={salvando || caminho.trim() === (salva ?? '')}>
              {salvando ? 'Salvando…' : 'Salvar pasta'}
            </Botao>
          </div>
        </form>
      )}
    </PainelVidro>
  );
}
