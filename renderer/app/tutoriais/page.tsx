import { CartaoDoTourGuiado } from '@/modulos/apresentacao/componentes/ControlesDaApresentacao';
import { PaginaTutoriais } from '@/modulos/tutoriais/componentes/PaginaTutoriais';

export default function Tutoriais() {
  return <PaginaTutoriais destaque={<CartaoDoTourGuiado />} />;
}
