'use client';

import { Plus, Trash2 } from 'lucide-react';
import { BotaoIcone } from '@/compartilhado/ui/Botao';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { CLASSE_CELULA_EDITAVEL } from './TabelaDeMateriais';
import { Ajuda } from '@/compartilhado/ui/Ajuda';
import { BotaoLimparCampos, TituloSecao } from './SecaoAv';

export interface LinhaContatoEditavel {
  chave: string;
  nome: string;
  area: string;
  telefone: string;
  email: string;
}

export function novaLinhaContato(chave: string): LinhaContatoEditavel {
  return { chave, nome: '', area: '', telefone: '', email: '' };
}

const AREAS_SUGERIDAS = ['Comercial', 'Técnico', 'Engenharia', 'Qualidade', 'Compras', 'Logística'];

/** Contatos do cliente: uma linha por pessoa, incluída pelo botão + (Nome, Área, Tel, E-mail). */
export function TabelaDeContatos({
  linhas,
  aoMudar,
  aoAdicionar,
  aoRemover,
  aoLimpar,
}: {
  aoLimpar: () => void;
  linhas: LinhaContatoEditavel[];
  aoMudar: (chave: string, campo: keyof LinhaContatoEditavel, valor: string) => void;
  aoAdicionar: () => void;
  aoRemover: (chave: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TituloSecao>Contato</TituloSecao>
          <Ajuda texto="Pessoas do cliente com quem a Ferkoda conversa sobre este item. Inclua uma por linha (botão +): comercial, técnico, qualidade, compras…" />
        </div>
        <div className="flex items-center gap-2">
          <BotaoLimparCampos aoLimpar={aoLimpar} disabled={linhas.length === 0} />
          <BotaoIcone icone={Plus} rotulo="Incluir contato" onClick={aoAdicionar} />
        </div>
      </div>
      {linhas.length === 0 ? (
        <p className="text-xs text-texto-secundario">Nenhum contato ainda. Use o botão + para incluir o primeiro.</p>
      ) : (
        <Tabela>
          <thead>
            <tr>
              <CelulaCabecalho className="pl-3" ajuda="Nome da pessoa de contato no cliente.">
                Nome
              </CelulaCabecalho>
              <CelulaCabecalho className="w-44" ajuda="Área ou papel da pessoa (Comercial, Técnico, Qualidade, Compras…). Ajuda a saber a quem recorrer para cada assunto.">
                Área
              </CelulaCabecalho>
              <CelulaCabecalho className="w-40" ajuda="Telefone com DDD.">
                Tel
              </CelulaCabecalho>
              <CelulaCabecalho className="w-64" ajuda="E-mail para contato.">
                E-mail
              </CelulaCabecalho>
              <CelulaCabecalho className="w-10 pr-3">
                <span className="sr-only">Remover</span>
              </CelulaCabecalho>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, indice) => (
              <LinhaTabela key={linha.chave}>
                <CelulaTabela className="pl-3">
                  <input
                    aria-label={`Nome do contato ${indice + 1}`}
                    className={CLASSE_CELULA_EDITAVEL}
                    maxLength={120}
                    value={linha.nome}
                    onChange={(e) => aoMudar(linha.chave, 'nome', e.target.value)}
                  />
                </CelulaTabela>
                <CelulaTabela>
                  <input
                    list="av-contato-areas"
                    aria-label={`Área do contato ${indice + 1}`}
                    className={CLASSE_CELULA_EDITAVEL}
                    maxLength={60}
                    value={linha.area}
                    onChange={(e) => aoMudar(linha.chave, 'area', e.target.value)}
                  />
                </CelulaTabela>
                <CelulaTabela>
                  <input
                    type="tel"
                    aria-label={`Telefone do contato ${indice + 1}`}
                    className={CLASSE_CELULA_EDITAVEL}
                    maxLength={40}
                    value={linha.telefone}
                    onChange={(e) => aoMudar(linha.chave, 'telefone', e.target.value)}
                  />
                </CelulaTabela>
                <CelulaTabela>
                  <input
                    type="email"
                    aria-label={`E-mail do contato ${indice + 1}`}
                    className={CLASSE_CELULA_EDITAVEL}
                    value={linha.email}
                    onChange={(e) => aoMudar(linha.chave, 'email', e.target.value)}
                  />
                </CelulaTabela>
                <CelulaTabela className="pr-3">
                  <BotaoIcone icone={Trash2} rotulo="Remover contato" onClick={() => aoRemover(linha.chave)} />
                </CelulaTabela>
              </LinhaTabela>
            ))}
          </tbody>
        </Tabela>
      )}
      <datalist id="av-contato-areas">
        {AREAS_SUGERIDAS.map((area) => (
          <option key={area} value={area} />
        ))}
      </datalist>
    </div>
  );
}
