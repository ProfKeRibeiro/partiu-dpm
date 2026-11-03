import type { SVGProps } from "react";
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
  Trash2,
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
export const IconeLixeira = criarIcone(Trash2, "IconeLixeira");

/*
 * Marcas de compartilhamento.
 *
 * O Lucide não distribui ícones de marcas, então estes três são desenhos
 * próprios no mesmo tamanho de grade (24x24) e herdam a cor do texto.
 */
export function IconeWhatsApp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26C2.16 6.44 6.6 2 12.05 2c2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.89-9.88 9.89m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.15 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42" />
    </svg>
  );
}

IconeWhatsApp.displayName = "IconeWhatsApp";

export function IconeFacebook(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M24 12.07C24 5.44 18.63.07 12 .07S0 5.44 0 12.07c0 5.99 4.39 10.95 10.13 11.86v-8.39H7.08v-3.47h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.96h-1.51c-1.49 0-1.96.92-1.96 1.87v2.25h3.33l-.53 3.47h-2.8v8.39C19.61 23.02 24 18.06 24 12.07" />
    </svg>
  );
}

IconeFacebook.displayName = "IconeFacebook";

export function IconeInstagram(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.02 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.13 1.38C1.35 2.68.94 3.35.63 4.14.33 4.9.13 5.78.07 7.05.02 8.33 0 8.74 0 12s.02 3.67.07 4.95c.06 1.28.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.67 1.34 1.08 2.13 1.38.77.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.28-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.67-.67 1.08-1.34 1.38-2.13.3-.77.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.28-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.38-2.13C21.32 1.35 20.65.94 19.86.63c-.77-.3-1.64-.5-2.91-.56C15.67.02 15.26 0 12 0m0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8m7.85-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0" />
    </svg>
  );
}

IconeInstagram.displayName = "IconeInstagram";
