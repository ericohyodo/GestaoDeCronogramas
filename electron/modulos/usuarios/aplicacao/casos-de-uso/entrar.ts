import type { EntrarEntrada, SessaoDTO } from '@contratos/sessao.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio } from '../../../../nucleo/dominio/erro-de-dominio';
import {
  ErroCredenciaisInvalidas,
  ErroUsuarioInativo,
  normalizarLogin,
} from '../../dominio/credenciais';
import type { RepositorioUsuarios } from '../../dominio/repositorio-usuarios';
import { paraSessaoDTO } from '../mapeador-dto';
import type { HashDeSenha } from '../portas/hash-de-senha';
import type { Sessao } from '../sessao';

const TENTATIVAS_ATE_BLOQUEIO = 5;
const BLOQUEIO_EM_MS = 30_000;

export class Entrar implements CasoDeUso<EntrarEntrada, SessaoDTO> {
  /** Tentativas falhas por login, apenas em memória. */
  private readonly tentativas = new Map<string, { falhas: number; bloqueadoAte: number }>();

  constructor(
    private readonly repositorio: RepositorioUsuarios,
    private readonly hashDeSenha: HashDeSenha,
    private readonly sessao: Sessao,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: EntrarEntrada): Promise<SessaoDTO> {
    const login = normalizarLogin(entrada.login);
    this.verificarBloqueio(login);

    const usuario = await this.repositorio.obterPorLogin(login);
    // Confere o hash mesmo sem usuário, para o tempo de resposta não denunciar logins existentes.
    const hashReferencia = usuario?.senhaHash ?? (await this.hashDeSenha.gerar('senha-inexistente'));
    const senhaConfere = await this.hashDeSenha.conferir(entrada.senha, hashReferencia);

    if (!usuario || !senhaConfere) {
      this.registrarFalha(login);
      throw new ErroCredenciaisInvalidas();
    }
    if (!usuario.ativo) throw new ErroUsuarioInativo();

    this.tentativas.delete(login);
    usuario.registrarAcesso(this.relogio.agora());
    await this.repositorio.salvar(usuario);
    this.sessao.abrir(usuario);

    return paraSessaoDTO(this.sessao, false);
  }

  private verificarBloqueio(login: string): void {
    const registro = this.tentativas.get(login);
    if (!registro) return;
    const restante = registro.bloqueadoAte - this.relogio.agora().getTime();
    if (restante > 0) {
      throw new ErroDeDominio(
        'MUITAS_TENTATIVAS',
        `Muitas tentativas seguidas. Aguarde ${Math.ceil(restante / 1000)} segundos e tente de novo.`,
      );
    }
  }

  private registrarFalha(login: string): void {
    const registro = this.tentativas.get(login) ?? { falhas: 0, bloqueadoAte: 0 };
    registro.falhas += 1;
    if (registro.falhas >= TENTATIVAS_ATE_BLOQUEIO) {
      registro.falhas = 0;
      registro.bloqueadoAte = this.relogio.agora().getTime() + BLOQUEIO_EM_MS;
    }
    this.tentativas.set(login, registro);
  }
}
