'use client';

import { type FormEvent, useState } from 'react';
import type { PerfilDTO, UsuarioDTO } from '@contratos/sessao.contrato';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { CampoTexto, Selecao } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';
import { OPCOES_PERFIL } from '../rotulos';
import { useUsuariosStore } from '../store/use-usuarios-store';

interface PropsFormularioUsuario {
  aberto: boolean;
  /** Ausente: novo usuário. Presente: edição de nome e perfil. */
  usuario?: UsuarioDTO;
  aoFechar: () => void;
}

export function FormularioUsuario(props: PropsFormularioUsuario) {
  return (
    <Modal
      aberto={props.aberto}
      aoFechar={props.aoFechar}
      titulo={props.usuario ? 'Editar usuário' : 'Novo usuário'}
    >
      <ConteudoFormulario {...props} />
    </Modal>
  );
}

function ConteudoFormulario({ usuario, aoFechar }: PropsFormularioUsuario) {
  const criar = useUsuariosStore((estado) => estado.criar);
  const atualizar = useUsuariosStore((estado) => estado.atualizar);

  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [login, setLogin] = useState(usuario?.login ?? '');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState<PerfilDTO>(usuario?.perfil ?? 'usuario');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      if (usuario) await atualizar({ id: usuario.id, nome, perfil });
      else await criar({ nome, login, senha, perfil });
      aoFechar();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <CampoTexto
        rotulo="Nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        maxLength={120}
        required
      />
      {!usuario && (
        <>
          <CampoTexto
            rotulo="Usuário"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            dica="Letras, números, ponto, hífen ou sublinhado."
            required
          />
          <CampoTexto
            rotulo="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            dica="Mínimo de 8 caracteres."
            autoComplete="new-password"
            required
          />
        </>
      )}
      <Selecao
        rotulo="Perfil"
        value={perfil}
        onChange={(e) => setPerfil(e.target.value as PerfilDTO)}
        opcoes={OPCOES_PERFIL}
      />

      {erro && <MensagemErro mensagem={erro} />}
      <RodapeModal>
        <Botao variante="fantasma" onClick={aoFechar} disabled={salvando}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="primario" disabled={salvando}>
          {salvando ? 'Salvando…' : usuario ? 'Salvar alterações' : 'Criar usuário'}
        </Botao>
      </RodapeModal>
    </form>
  );
}

interface PropsFormularioSenha {
  aberto: boolean;
  usuario: UsuarioDTO;
  /** true quando a pessoa está trocando a própria senha: aí a senha atual é exigida. */
  propriaSenha: boolean;
  aoFechar: () => void;
}

export function FormularioSenha({ aberto, usuario, propriaSenha, aoFechar }: PropsFormularioSenha) {
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={propriaSenha ? 'Trocar minha senha' : `Redefinir a senha de ${usuario.nome}`}
      largura="sm"
    >
      <ConteudoSenha usuario={usuario} propriaSenha={propriaSenha} aoFechar={aoFechar} />
    </Modal>
  );
}

function ConteudoSenha({
  usuario,
  propriaSenha,
  aoFechar,
}: Omit<PropsFormularioSenha, 'aberto'>) {
  const alterarSenha = useUsuariosStore((estado) => estado.alterarSenha);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await alterarSenha({
        id: usuario.id,
        novaSenha,
        ...(propriaSenha ? { senhaAtual } : {}),
      });
      aoFechar();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      {propriaSenha && (
        <CampoTexto
          rotulo="Senha atual"
          type="password"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          autoComplete="current-password"
          required
        />
      )}
      <CampoTexto
        rotulo="Nova senha"
        type="password"
        value={novaSenha}
        onChange={(e) => setNovaSenha(e.target.value)}
        dica="Mínimo de 8 caracteres."
        autoComplete="new-password"
        required
      />
      {erro && <MensagemErro mensagem={erro} />}
      <RodapeModal>
        <Botao variante="fantasma" onClick={aoFechar} disabled={salvando}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="primario" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar senha'}
        </Botao>
      </RodapeModal>
    </form>
  );
}
