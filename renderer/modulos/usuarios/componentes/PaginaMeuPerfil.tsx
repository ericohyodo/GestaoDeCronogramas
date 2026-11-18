'use client';

import { Camera, KeyRound, Save, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import type { FotoDoUsuarioDTO, MeuPerfilDTO } from '@contratos/usuarios.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { AreaTexto, CampoTexto, Selecao } from '@/compartilhado/ui/Campos';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { prepararFoto } from '../foto';
import { DEPARTAMENTOS, ROTULO_PERFIL, TOM_PERFIL } from '../rotulos';
import { useMeuPerfilStore } from '../store/use-meu-perfil-store';
import { AvatarDoUsuario } from './AvatarDoUsuario';

interface Formulario {
  email: string;
  departamento: string;
  cargo: string;
  ramal: string;
  celular: string;
  sobre: string;
}

const paraFormulario = (perfil: MeuPerfilDTO): Formulario => ({
  email: perfil.email ?? '',
  departamento: perfil.departamento ?? '',
  cargo: perfil.cargo ?? '',
  ramal: perfil.ramal ?? '',
  celular: perfil.celular ?? '',
  sobre: perfil.sobre ?? '',
});

/** "Meu perfil": dados de contato, foto e troca de senha de quem está logado. */
export function PaginaMeuPerfil() {
  const perfil = useMeuPerfilStore((estado) => estado.perfil);
  const carregar = useMeuPerfilStore((estado) => estado.carregar);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregar().catch((falha: unknown) => setErro(mensagemDeErro(falha)));
  }, [carregar]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <CabecalhoPagina titulo="Meu perfil" descricao="Seus dados de contato e sua foto aparecem para quem trabalha com você nas AVs." />
      {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}
      {perfil ? (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[2fr_1fr]">
          <DadosDoPerfil key={perfil.id} perfil={perfil} />
          <TrocaDeSenha usuarioId={perfil.id} />
        </div>
      ) : (
        !erro && <p className="text-sm text-texto-secundario">Carregando…</p>
      )}
    </div>
  );
}

function DadosDoPerfil({ perfil }: { perfil: MeuPerfilDTO }) {
  const salvarPerfil = useMeuPerfilStore((estado) => estado.salvar);
  const [form, setForm] = useState(() => paraFormulario(perfil));
  // `undefined`: foto inalterada; `null`: remover; objeto: foto nova.
  const [fotoNova, setFotoNova] = useState<FotoDoUsuarioDTO | null | undefined>(undefined);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const seletor = useRef<HTMLInputElement>(null);

  const fotoExibida = fotoNova === undefined ? perfil.foto : fotoNova;
  const mudar = (campo: keyof Formulario, valor: string) => setForm((atual) => ({ ...atual, [campo]: valor }));

  const escolherFoto = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setErro(null);
    try {
      setFotoNova(await prepararFoto(arquivo));
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  };

  const salvar = async (evento: FormEvent) => {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    setAviso(null);
    try {
      await salvarPerfil({
        email: form.email || null,
        departamento: form.departamento || null,
        cargo: form.cargo || null,
        ramal: form.ramal || null,
        celular: form.celular || null,
        sobre: form.sobre || null,
        ...(fotoNova !== undefined ? { foto: fotoNova } : {}),
      });
      setFotoNova(undefined);
      setAviso('Perfil salvo.');
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  const opcoesDepartamento = [
    { valor: '', rotulo: '— não informado —' },
    ...(form.departamento && !(DEPARTAMENTOS as readonly string[]).includes(form.departamento)
      ? [{ valor: form.departamento, rotulo: form.departamento }]
      : []),
    ...DEPARTAMENTOS.map((departamento) => ({ valor: departamento, rotulo: departamento })),
  ];

  return (
    <PainelVidro className="p-6">
      <form onSubmit={(evento) => void salvar(evento)} className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-5">
          <AvatarDoUsuario nome={perfil.nome} foto={fotoExibida} tamanho="size-24" />
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-lg font-semibold">{perfil.nome}</p>
              <p className="flex items-center gap-2 text-sm text-texto-secundario">
                {perfil.login}
                <Etiqueta tom={TOM_PERFIL[perfil.perfil]}>{ROTULO_PERFIL[perfil.perfil]}</Etiqueta>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Botao tamanho="sm" icone={Camera} onClick={() => seletor.current?.click()}>
                {fotoExibida ? 'Trocar foto' : 'Incluir foto'}
              </Botao>
              {fotoExibida && (
                <Botao tamanho="sm" variante="fantasma" icone={Trash2} onClick={() => setFotoNova(null)}>
                  Remover foto
                </Botao>
              )}
              <input
                ref={seletor}
                type="file"
                hidden
                accept="image/png,image/jpeg,image/bmp"
                onChange={(e) => {
                  void escolherFoto(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-texto-sutil">Nome, usuário e perfil de acesso são alterados pelo administrador.</p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <CampoTexto rotulo="Cargo" maxLength={80} value={form.cargo} onChange={(e) => mudar('cargo', e.target.value)} />
          <Selecao
            rotulo="Departamento"
            value={form.departamento}
            onChange={(e) => mudar('departamento', e.target.value)}
            opcoes={opcoesDepartamento}
          />
          <CampoTexto rotulo="E-mail" type="email" maxLength={254} value={form.email} onChange={(e) => mudar('email', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto rotulo="Ramal" inputMode="tel" maxLength={20} value={form.ramal} onChange={(e) => mudar('ramal', e.target.value)} />
            <CampoTexto
              rotulo="Celular"
              inputMode="tel"
              maxLength={30}
              value={form.celular}
              onChange={(e) => mudar('celular', e.target.value)}
            />
          </div>
        </div>
        <AreaTexto
          rotulo="Sobre mim"
          dica={`${form.sobre.length}/1000`}
          placeholder="Áreas em que atua, especialidades, como prefere ser contatado…"
          rows={4}
          maxLength={1000}
          value={form.sobre}
          onChange={(e) => mudar('sobre', e.target.value)}
        />

        {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}
        <div className="flex items-center justify-end gap-3">
          {aviso && <p className="text-sm text-texto-secundario">{aviso}</p>}
          <Botao type="submit" variante="primario" icone={Save} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar perfil'}
          </Botao>
        </div>
      </form>
    </PainelVidro>
  );
}

/** Troca da própria senha: exige a senha atual. */
function TrocaDeSenha({ usuarioId }: { usuarioId: string }) {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const confere = nova === confirmacao;
  const valido = atual.length > 0 && nova.length >= 8 && confere;

  const trocar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!valido) return;
    setSalvando(true);
    setErro(null);
    setAviso(null);
    try {
      await clienteDesktop.usuarios.alterarSenha({ id: usuarioId, senhaAtual: atual, novaSenha: nova });
      setAtual('');
      setNova('');
      setConfirmacao('');
      setAviso('Senha alterada. Use a nova senha no próximo login.');
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <PainelVidro className="p-6">
      <form onSubmit={(evento) => void trocar(evento)} className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <KeyRound aria-hidden className="size-4 text-primaria" />
          Redefinir senha
        </h2>
        <CampoTexto rotulo="Senha atual" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} />
        <CampoTexto
          rotulo="Nova senha"
          dica="Mínimo de 8 caracteres."
          type="password"
          autoComplete="new-password"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
        />
        <CampoTexto
          rotulo="Confirme a nova senha"
          type="password"
          autoComplete="new-password"
          erro={confirmacao && !confere ? 'As senhas não conferem.' : undefined}
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
        {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}
        {aviso && <p className="text-sm text-texto-secundario">{aviso}</p>}
        <Botao type="submit" variante="primario" disabled={salvando || !valido} className="self-end">
          {salvando ? 'Alterando…' : 'Alterar senha'}
        </Botao>
      </form>
    </PainelVidro>
  );
}
