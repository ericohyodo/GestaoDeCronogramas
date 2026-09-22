'use client';

import { KeyRound, Pencil, Plus, Trash2, UserCog, UserRoundCheck, UserRoundX } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { UsuarioDTO } from '@contratos/sessao.contrato';
import { formatarData } from '@/compartilhado/formatacao';
import { Botao, BotaoIcone } from '@/compartilhado/ui/Botao';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { DialogoConfirmacao } from '@/compartilhado/ui/DialogoConfirmacao';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { ROTULO_PERFIL, TOM_PERFIL } from '../rotulos';
import { useUsuarioAtual } from '../store/use-sessao-store';
import { useUsuariosStore } from '../store/use-usuarios-store';
import { FormularioSenha, FormularioUsuario } from './FormularioUsuario';

export function PaginaUsuarios() {
  const { itens, carregando, erro, carregar, atualizar, excluir, limparErro } = useUsuariosStore();
  const usuarioAtual = useUsuarioAtual();
  const [edicao, setEdicao] = useState<{ modo: 'criar' } | { modo: 'editar'; usuario: UsuarioDTO } | null>(
    null,
  );
  const [trocandoSenha, setTrocandoSenha] = useState<UsuarioDTO | null>(null);
  const [paraExcluir, setParaExcluir] = useState<UsuarioDTO | null>(null);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <CabecalhoPagina
        titulo="Usuários"
        descricao="Quem acessa o aplicativo neste computador e o que cada perfil pode fazer."
        acoes={
          <Botao variante="primario" icone={Plus} onClick={() => setEdicao({ modo: 'criar' })}>
            Novo usuário
          </Botao>
        }
      />

      {erro && <MensagemErro mensagem={erro} aoFechar={limparErro} />}

      <PainelVidro>
        {itens.length === 0 && !carregando ? (
          <EstadoVazio icone={UserCog} titulo="Nenhum usuário cadastrado" />
        ) : (
          <Tabela>
            <thead>
              <tr>
                <CelulaCabecalho className="pl-5">Nome</CelulaCabecalho>
                <CelulaCabecalho>Usuário</CelulaCabecalho>
                <CelulaCabecalho>Perfil</CelulaCabecalho>
                <CelulaCabecalho>Situação</CelulaCabecalho>
                <CelulaCabecalho>Último acesso</CelulaCabecalho>
                <CelulaCabecalho className="w-32 pr-5">
                  <span className="sr-only">Ações</span>
                </CelulaCabecalho>
              </tr>
            </thead>
            <tbody>
              {itens.map((usuario) => {
                const ehVoce = usuario.id === usuarioAtual?.id;
                return (
                  <LinhaTabela key={usuario.id} className="group">
                    <CelulaTabela className="pl-5 font-medium">
                      {usuario.nome}
                      {ehVoce && <span className="ml-2 text-xs text-texto-sutil">(você)</span>}
                    </CelulaTabela>
                    <CelulaTabela className="text-texto-secundario">{usuario.login}</CelulaTabela>
                    <CelulaTabela>
                      <Etiqueta tom={TOM_PERFIL[usuario.perfil]}>
                        {ROTULO_PERFIL[usuario.perfil]}
                      </Etiqueta>
                    </CelulaTabela>
                    <CelulaTabela>
                      <Etiqueta tom={usuario.ativo ? 'sucesso' : 'neutro'}>
                        {usuario.ativo ? 'Ativo' : 'Desativado'}
                      </Etiqueta>
                    </CelulaTabela>
                    <CelulaTabela className="tabular-nums text-texto-secundario">
                      {usuario.ultimoAcessoEm
                        ? formatarData(usuario.ultimoAcessoEm.slice(0, 10))
                        : '—'}
                    </CelulaTabela>
                    <CelulaTabela className="pr-5">
                      <div className="flex justify-end opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                        <BotaoIcone
                          icone={Pencil}
                          rotulo={`Editar ${usuario.nome}`}
                          onClick={() => setEdicao({ modo: 'editar', usuario })}
                        />
                        <BotaoIcone
                          icone={KeyRound}
                          rotulo={ehVoce ? 'Trocar minha senha' : `Redefinir a senha de ${usuario.nome}`}
                          onClick={() => setTrocandoSenha(usuario)}
                        />
                        <BotaoIcone
                          icone={usuario.ativo ? UserRoundX : UserRoundCheck}
                          rotulo={
                            usuario.ativo ? `Desativar ${usuario.nome}` : `Ativar ${usuario.nome}`
                          }
                          onClick={() =>
                            void atualizar({ id: usuario.id, ativo: !usuario.ativo }).catch(() => {
                              void carregar();
                            })
                          }
                        />
                        <BotaoIcone
                          icone={Trash2}
                          rotulo={`Excluir ${usuario.nome}`}
                          disabled={ehVoce}
                          onClick={() => setParaExcluir(usuario)}
                        />
                      </div>
                    </CelulaTabela>
                  </LinhaTabela>
                );
              })}
            </tbody>
          </Tabela>
        )}
      </PainelVidro>

      <FormularioUsuario
        aberto={edicao !== null}
        usuario={edicao?.modo === 'editar' ? edicao.usuario : undefined}
        aoFechar={() => setEdicao(null)}
      />
      {trocandoSenha && (
        <FormularioSenha
          aberto
          usuario={trocandoSenha}
          propriaSenha={trocandoSenha.id === usuarioAtual?.id}
          aoFechar={() => setTrocandoSenha(null)}
        />
      )}
      <DialogoConfirmacao
        aberto={paraExcluir !== null}
        titulo="Excluir usuário"
        mensagem={`"${paraExcluir?.nome ?? ''}" perderá o acesso ao aplicativo.`}
        aoConfirmar={() => excluir(paraExcluir!.id)}
        aoFechar={() => setParaExcluir(null)}
      />
    </div>
  );
}
