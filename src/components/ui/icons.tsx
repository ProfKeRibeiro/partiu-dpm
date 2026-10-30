import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ClipboardList,
  Clock,
  Globe,
  GraduationCap,
  House,
  Info,
  Lock,
  LogOut,
  MapPin,
  Menu,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserRound,
  Users,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/**
 * Ícones da interface.
 *
 * A biblioteca Lucide foi escolhida por ter o traço arredondado e o desenho
 * aberto dos ícones usados na referência visual da área do participante.
 * Os nomes exportados são mantidos para não acoplar os componentes à lib.
 */
function criarIcone(Icone: LucideIcon, nome: string) {
  function IconeBase(props: LucideProps) {
    return <Icone strokeWidth={2} aria-hidden {...props} />;
  }

  IconeBase.displayName = nome;

  return IconeBase;
}

export const IconeSetaDireita = criarIcone(ArrowRight, "IconeSetaDireita");
export const IconeSetaDiagonal = criarIcone(ArrowUpRight, "IconeSetaDiagonal");
export const IconeSetaEsquerda = criarIcone(ArrowLeft, "IconeSetaEsquerda");
export const IconeCalendario = criarIcone(CalendarDays, "IconeCalendario");
export const IconeRelogio = criarIcone(Clock, "IconeRelogio");
export const IconeLocal = criarIcone(MapPin, "IconeLocal");
export const IconeUsuarios = criarIcone(Users, "IconeUsuarios");
export const IconeGlobo = criarIcone(Globe, "IconeGlobo");
export const IconeCheck = criarIcone(Check, "IconeCheck");
export const IconeMenu = criarIcone(Menu, "IconeMenu");
export const IconeFechar = criarIcone(X, "IconeFechar");
export const IconeBilhete = criarIcone(ClipboardList, "IconeBilhete");
export const IconeCertificado = criarIcone(Award, "IconeCertificado");
export const IconeBrilho = criarIcone(Sparkles, "IconeBrilho");
export const IconeInfo = criarIcone(Info, "IconeInfo");
export const IconeAlerta = criarIcone(TriangleAlert, "IconeAlerta");
export const IconeCapelo = criarIcone(GraduationCap, "IconeCapelo");
export const IconeEscudo = criarIcone(ShieldCheck, "IconeEscudo");
export const IconeCasa = criarIcone(House, "IconeCasa");
export const IconePessoa = criarIcone(UserRound, "IconePessoa");
export const IconeSino = criarIcone(Bell, "IconeSino");
export const IconeBusca = criarIcone(Search, "IconeBusca");
export const IconeLapis = criarIcone(Pencil, "IconeLapis");
export const IconeCadeado = criarIcone(Lock, "IconeCadeado");
export const IconeSair = criarIcone(LogOut, "IconeSair");
export const IconeQr = criarIcone(QrCode, "IconeQr");
export const IconeCamera = criarIcone(Camera, "IconeCamera");
export const IconeMais = criarIcone(Plus, "IconeMais");
export const IconeAtualizar = criarIcone(RefreshCw, "IconeAtualizar");
