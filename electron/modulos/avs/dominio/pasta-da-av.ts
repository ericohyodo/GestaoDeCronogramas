import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import { normalizarTextoOpcional } from '../../../nucleo/dominio/texto';

// =====================================================================================================
// Pasta da AV no Windows (entradas do Comercial: e-mails, desenhos, orçamentos)
// =====================================================================================================

/** Onde as pastas das AVs são criadas (administrador define em Configurações). */
export interface ConfigPastaDasAvs {
  pastaRaiz: string | null;
}

export interface RepositorioConfigPastaDasAvs {
  obter(): Promise<ConfigPastaDasAvs>;
  salvar(config: ConfigPastaDasAvs, usuarioId: string, instante: Date): Promise<void>;
}

/** Limite do nome da pasta: deixa folga para os arquivos dentro dela no limite de 260 caracteres do Windows. */
const TAMANHO_MAXIMO_NOME = 120;

/**
 * Nome da pasta da AV: "AV 26-036 - Cliente - Descrição", sem caracteres proibidos no Windows.
 * @param numero número da AV
 * @param cliente cliente (opcional)
 * @param descricao descrição do item
 * @returns nome seguro para pasta
 */
export function nomeDaPastaDaAv(numero: string, cliente: string | null, descricao: string): string {
  const limpar = (texto: string) =>
    texto
      .replace(/[<>:"/\\|?*]/g, ' ')
      .replace(/[\u0000-\u001f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const partes = [numero, cliente ?? '', descricao].map(limpar).filter(Boolean);
  // Windows não aceita nome terminado em ponto ou espaço.
  return partes.join(' - ').slice(0, TAMANHO_MAXIMO_NOME).replace(/[. ]+$/, '');
}

/**
 * Valida a pasta raiz informada: caminho absoluto do Windows (C:\…) ou de rede (\\servidor\compartilhamento).
 * @param texto caminho digitado ou escolhido; vazio desliga a criação automática
 * @returns o caminho sem barra final, ou `null`
 * @throws ErroDeValidacao se não for um caminho absoluto
 */
export function validarPastaRaiz(texto: string | null | undefined): string | null {
  const caminho = normalizarTextoOpcional(texto);
  if (!caminho) return null;
  if (caminho.length > 200) throw new ErroDeValidacao('O caminho da pasta deve ter no máximo 200 caracteres.');
  if (!/^[a-zA-Z]:\\/.test(caminho) && !/^\\\\[^\\]+\\[^\\]+/.test(caminho)) {
    throw new ErroDeValidacao('Informe um caminho completo, como E:\\COMERCIAL - AV\\AVs ou \\\\servidor\\pasta.');
  }
  return caminho.replace(/\\+$/, '');
}

/**
 * Confere que um caminho relativo (vindo da tela) fica dentro da pasta da AV.
 * @param relativo caminho relativo à pasta da AV
 * @throws ErroDeValidacao se tentar sair da pasta (`..`) ou for absoluto
 */
export function validarCaminhoRelativo(relativo: string): string {
  const partes = relativo.split(/[\\/]+/).filter(Boolean);
  if (partes.length === 0 || partes.some((parte) => parte === '..' || parte === '.') || /^[a-zA-Z]:/.test(relativo)) {
    throw new ErroDeValidacao('Arquivo inválido.');
  }
  return partes.join('\\');
}
