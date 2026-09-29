import { AnaliseAvsComIa } from '@/modulos/ia/componentes/AnaliseAvsComIa';
import { PaginaAvs } from '@/modulos/avs/componentes/PaginaAvs';

export default function Avs() {
  return <PaginaAvs acoesExtras={<AnaliseAvsComIa />} />;
}
