'use client';

import { Pencil, Plus, Trash2, UserRoundCheck, UserRoundX, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ResponsavelDTO } from '@contratos/responsaveis.contrato';
import { Botao, BotaoIcone } from '@/compartilhado/ui/Botao';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { DialogoConfirmacao } from '@/compartilhado/ui/DialogoConfirmacao';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { useResponsaveisStore } from '../store/use-responsaveis-store';
import { FormularioResponsavel } from './FormularioResponsavel';

export function PaginaResponsaveis({ podeEditar }: { podeEditar: boolean }) {
  const { itens, carregando, erro, carregar, atualizar, excluir, limparErro } =
    useResponsaveisStore();
  const [edicao, setEdicao] = useState<
    { modo: 'criar' } | { modo: 'editar'; responsavel: ResponsavelDTO } | null
  >(null);
  const [paraExcluir, setParaExcluir] = useState<ResponsavelDTO | null>(null);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <CabecalhoPagina
        titulo="Recursos"
        descricao="Pessoas que podem responder pelas tarefas dos cronogramas."
        acoes={
          podeEditar && (
            <Botao variante="primario" icone={Plus} onClick={() => setEdicao({ modo: 'criar' })}>
              Novo responsável
            </Botao>
          )
        }
      />

      {erro && <MensagemErro mensagem={erro} aoFechar={limparErro} />}

      <PainelVidro>
        {itens.length === 0 && !carregando ? (
          <EstadoVazio
            icone={Users}
            titulo="Nenhum responsável cadastrado"
            descricao="Cadastre as pessoas da equipe para atribuí-las às tarefas."
            acao={
              podeEditar && (
                <Botao icone={Plus} onClick={() => setEdicao({ modo: 'criar' })}>
                  Cadastrar responsável
                </Botao>
              )
            }
          />
        ) : (
          <Tabela>
            <thead>
              <tr>
                <CelulaCabecalho className="pl-5">Nome</CelulaCabecalho>
                <CelulaCabecalho>Função</CelulaCabecalho>
                <CelulaCabecalho>E-mail</CelulaCabecalho>
                <CelulaCabecalho>Situação</CelulaCabecalho>
                <CelulaCabecalho className="w-24 pr-5">
                  <span className="sr-only">Ações</span>
                </CelulaCabecalho>
              </tr>
            </thead>
            <tbody>
              {itens.map((responsavel) => (
                <LinhaTabela key={responsavel.id} className="group">
                  <CelulaTabela className="pl-5 font-medium">{responsavel.nome}</CelulaTabela>
                  <CelulaTabela className="text-texto-secundario">
                    {responsavel.funcao ?? '—'}
                  </CelulaTabela>
                  <CelulaTabela className="text-texto-secundario">
                    {responsavel.email ?? '—'}
                  </CelulaTabela>
                  <CelulaTabela>
                    <Etiqueta tom={responsavel.ativo ? 'sucesso' : 'neutro'}>
                      {responsavel.ativo ? 'Ativo' : 'Inativo'}
                    </Etiqueta>
                  </CelulaTabela>
                  <CelulaTabela className="pr-5">
                    {podeEditar && (
                      <div className="flex justify-end opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                        <BotaoIcone
                          icone={Pencil}
                          rotulo={`Editar ${responsavel.nome}`}
                          onClick={() => setEdicao({ modo: 'editar', responsavel })}
                        />
                        <BotaoIcone
                          icone={responsavel.ativo ? UserRoundX : UserRoundCheck}
                          rotulo={
                            responsavel.ativo
                              ? `Desativar ${responsavel.nome}`
                              : `Ativar ${responsavel.nome}`
                          }
                          onClick={() =>
                            void atualizar({ id: responsavel.id, ativo: !responsavel.ativo })
                          }
                        />
                        <BotaoIcone
                          icone={Trash2}
                          rotulo={`Excluir ${responsavel.nome}`}
                          onClick={() => setParaExcluir(responsavel)}
                        />
                      </div>
                    )}
                  </CelulaTabela>
                </LinhaTabela>
              ))}
            </tbody>
          </Tabela>
        )}
      </PainelVidro>

      <FormularioResponsavel
        aberto={edicao !== null}
        responsavel={edicao?.modo === 'editar' ? edicao.responsavel : undefined}
        aoFechar={() => setEdicao(null)}
      />
      <DialogoConfirmacao
        aberto={paraExcluir !== null}
        titulo="Excluir responsável"
        mensagem={`"${paraExcluir?.nome ?? ''}" será removido. As tarefas dele ficam sem responsável.`}
        aoConfirmar={() => excluir(paraExcluir!.id)}
        aoFechar={() => setParaExcluir(null)}
      />
    </div>
  );
}
