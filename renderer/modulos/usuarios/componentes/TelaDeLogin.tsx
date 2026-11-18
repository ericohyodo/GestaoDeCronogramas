'use client';

import { CalendarRange, KeyRound, LogIn, ShieldCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { ErroDaApi, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { CampoTexto } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { useSessaoStore } from '../store/use-sessao-store';

export function TelaDeLogin() {
  const sessao = useSessaoStore((estado) => estado.sessao);
  const entrar = useSessaoStore((estado) => estado.entrar);
  const primeiroAcesso = useSessaoStore((estado) => estado.primeiroAcesso);
  const concluirPrimeiroAcesso = useSessaoStore((estado) => estado.concluirPrimeiroAcesso);

  const configurando = sessao?.precisaConfigurar ?? false;
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  // Espelha LOGIN_DE_ACESSO_RAPIDO do processo principal; quem decide de fato é lá.
  const semSenha = !configurando && login.trim().toLowerCase() === 'erico';
  const [confirmacao, setConfirmacao] = useState('');
  // Primeiro acesso de usuário criado sem senha: mensagem de boas-vindas vinda do servidor.
  const [boasVindas, setBoasVindas] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const definindoSenha = boasVindas !== null;
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setErro(null);
    if ((configurando || definindoSenha) && senha !== confirmacao) {
      setErro('A confirmação não confere com a senha.');
      return;
    }

    setEnviando(true);
    try {
      if (configurando) await primeiroAcesso({ nome, login, senha });
      else if (definindoSenha) await concluirPrimeiroAcesso({ login, email, senha });
      else await entrar({ login, senha });
    } catch (falha) {
      if (falha instanceof ErroDaApi && falha.codigo === 'PRIMEIRO_ACESSO') {
        setBoasVindas(falha.message);
        setSenha('');
        return;
      }
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
          <h1 className="text-lg font-semibold">Gestão de Novos Desenvolvimentos</h1>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-titulo-secao">AV · SD · PRO</p>
          <p className="mt-1 text-sm text-texto-secundario">
            {configurando
              ? 'Primeiro acesso: crie o usuário administrador deste computador.'
              : (boasVindas ?? 'Entre com o seu usuário. No primeiro acesso, informe só o usuário.')}
          </p>
        </div>

        <form onSubmit={enviar} className="flex flex-col gap-4">
          {configurando && (
            <CampoTexto
              rotulo="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Maria Silva"
              maxLength={120}
              required
            />
          )}
          <CampoTexto
            rotulo="Usuário"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="ex.: maria.silva"
            autoComplete="username"
            readOnly={definindoSenha}
            required
          />
          {definindoSenha && (
            <CampoTexto
              rotulo="Seu e-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@ferkoda.com.br"
              autoComplete="email"
              maxLength={254}
              required
            />
          )}
          <CampoTexto
            rotulo={definindoSenha ? 'Crie uma senha' : 'Senha'}
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete={configurando || definindoSenha ? 'new-password' : 'current-password'}
            dica={
              configurando || definindoSenha
                ? 'Mínimo de 8 caracteres.'
                : semSenha
                  ? 'Este usuário tem acesso rápido: a senha é opcional.'
                  : undefined
            }
            required={!semSenha && (configurando || definindoSenha)}
          />
          {(configurando || definindoSenha) && (
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
            icone={configurando ? ShieldCheck : definindoSenha ? KeyRound : LogIn}
            disabled={enviando}
            className="mt-1 w-full"
          >
            {enviando
              ? 'Aguarde…'
              : configurando
                ? 'Criar administrador'
                : definindoSenha
                  ? 'Salvar e entrar'
                  : 'Entrar'}
          </Botao>
          {definindoSenha && (
            <button
              type="button"
              onClick={() => {
                setBoasVindas(null);
                setConfirmacao('');
                setSenha('');
              }}
              className="text-xs text-texto-secundario hover:text-texto"
            >
              Não é você? Voltar
            </button>
          )}
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
