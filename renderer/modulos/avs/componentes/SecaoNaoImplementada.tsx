import { HardHat } from 'lucide-react';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';

export function SecaoNaoImplementada({ titulo }: { titulo: string }) {
  return (
    <PainelVidro>
      <EstadoVazio
        icone={HardHat}
        titulo={`${titulo} ainda não foi implementada`}
        descricao="Esta seção chega numa próxima fase — por enquanto dá pra avançar a AV por ela normalmente, só não tem o que preencher aqui ainda."
      />
    </PainelVidro>
  );
}
