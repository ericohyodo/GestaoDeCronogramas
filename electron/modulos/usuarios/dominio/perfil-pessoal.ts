import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import { normalizarTextoOpcional } from '../../../nucleo/dominio/texto';

// =====================================================================================================
// Dados que o próprio usuário mantém sobre si (página "Meu perfil")
// =====================================================================================================

export type TipoDeFoto = 'image/jpeg' | 'image/png';

export interface FotoDoUsuario {
  base64: string;
  mime: TipoDeFoto;
}

export interface PerfilPessoal {
  usuarioId: string;
  cargo: string | null;
  ramal: string | null;
  celular: string | null;
  sobre: string | null;
  foto: FotoDoUsuario | null;
  atualizadoEm: Date;
}

export interface RepositorioPerfilPessoal {
  obter(usuarioId: string): Promise<PerfilPessoal | null>;
  salvar(perfil: PerfilPessoal): Promise<void>;
}

/** Foto até ~300 KB (a tela já envia reduzida para 256 px). */
export const LIMITE_FOTO_BASE64 = 400_000;

/**
 * Texto opcional com tamanho máximo.
 * @throws ErroDeValidacao acima do limite
 */
function opcional(valor: string | null | undefined, campo: string, maximo: number): string | null {
  const texto = normalizarTextoOpcional(valor);
  if (texto && texto.length > maximo) throw new ErroDeValidacao(`${campo} deve ter no máximo ${maximo} caracteres.`);
  return texto;
}

/**
 * Valida os campos do perfil pessoal.
 * @param dados cargo, ramal, celular e "sobre mim"
 * @returns campos normalizados
 */
export function validarDadosPessoais(dados: {
  cargo?: string | null;
  ramal?: string | null;
  celular?: string | null;
  sobre?: string | null;
}): Pick<PerfilPessoal, 'cargo' | 'ramal' | 'celular' | 'sobre'> {
  const ramal = opcional(dados.ramal, 'O ramal', 20);
  if (ramal && !/^[\d\s()+\-/.]+$/.test(ramal)) throw new ErroDeValidacao('O ramal aceita só números e separadores.');
  const celular = opcional(dados.celular, 'O celular', 30);
  if (celular && !/^[\d\s()+\-.]+$/.test(celular)) throw new ErroDeValidacao('O celular aceita só números e separadores.');
  return {
    cargo: opcional(dados.cargo, 'O cargo', 80),
    ramal,
    celular,
    sobre: opcional(dados.sobre, 'O "sobre mim"', 1000),
  };
}

/**
 * Valida a foto enviada (tipo e tamanho; a assinatura binária é conferida na entrada do IPC).
 * @param foto base64 sem prefixo e tipo
 * @returns a foto, pronta para gravar
 */
export function validarFoto(foto: FotoDoUsuario): FotoDoUsuario {
  if (foto.mime !== 'image/jpeg' && foto.mime !== 'image/png') throw new ErroDeValidacao('A foto deve ser JPG ou PNG.');
  if (!foto.base64 || foto.base64.length > LIMITE_FOTO_BASE64) {
    throw new ErroDeValidacao('A foto está grande demais. Escolha outra imagem.');
  }
  return foto;
}
