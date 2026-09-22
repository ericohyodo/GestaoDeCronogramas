'use client';

import { CalendarRange, LogIn, ShieldCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { CampoTexto } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { useSessaoStore } from '../store/use-sessao-store';

export function TelaDeLogin() {
  const sessao = useSessaoStore((estado) => estado.sessao);
  const entrar = useSessaoStore((estado) => estado.entrar);
  const primeiroAcesso = useSessaoStore((estado) => estado.primeiroAcesso);

  const configurando = sessao?.precisaConfigurar ?? false;
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setErro(null);
    if (configurando && senha !== confirmacao) {
      setErro('A confirmação não confere com a senha.');
      return;
    }

    setEnviando(true);
    try {
      if (configurando) await primeiroAcesso({ nome, login, senha });
      else await entrar({ login, senha });
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <PainelVidro className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-linear-to-br from-primaria to-destaque text-sobre-primaria">
            <CalendarRange aria-hidden className="size-6" />
          </div>
          <h1 className="text-lg font-semibold">Gestão de Cronogramas</h1>
          <p className="mt-1 text-sm text-texto-secundario">
            {configurando
              ? 'Primeiro acesso: crie o usuário administrador deste computador.'
              : 'Entre para acessar seus cronogramas.'}
          </p>
        </div>

        <form onSubmit={enviar} className="flex flex-col gap-4">
          {configurando && (
            <CampoTexto
              rotulo="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Erico Hyodo"
              maxLength={120}
              required
            />
          )}
          <CampoTexto
            rotulo="Usuário"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="ex.: erico"
            autoComplete="username"
            required
          />
          <CampoTexto
            rotulo="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete={configurando ? 'new-password' : 'current-password'}
            dica={configurando ? 'Mínimo de 8 caracteres.' : undefined}
            required
          />
          {configurando && (
            <CampoTexto
              rotulo="Confirme a senha"
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              autoComplete="new-password"
              required
            />
          )}

          {erro && <MensagemErro mensagem={erro} />}

          <Botao
            type="submit"
            variante="primario"
            icone={configurando ? ShieldCheck : LogIn}
            disabled={enviando}
            className="mt-1 w-full"
          >
            {enviando ? 'Aguarde…' : configurando ? 'Criar administrador' : 'Entrar'}
          </Botao>
        </form>

        {configurando && (
          <p className="mt-5 text-xs leading-relaxed text-texto-sutil">
            A senha protege o acesso pelo aplicativo. O arquivo de dados em si não é criptografado:
            quem tiver acesso ao arquivo .db consegue lê-lo por fora.
          </p>
        )}
      </PainelVidro>
    </div>
  );
}
