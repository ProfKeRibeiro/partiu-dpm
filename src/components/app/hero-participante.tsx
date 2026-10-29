import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { IconeSetaDireita } from "@/components/ui/icons";

export function HeroParticipante({ nome }: { nome: string }) {
  const { props: imagemDesktop } = getImageProps({
    alt: "",
    src: "/marca/fachada-desktop.png",
    width: 2535,
    height: 420,
    quality: 100,
    sizes: "100vw",
  });
  const { props: imagemMobile } = getImageProps({
    alt: "",
    src: "/marca/fachada-mobile.png",
    width: 1200,
    height: 533,
    quality: 100,
    sizes: "100vw",
  });

  return (
    <section className="relative overflow-hidden border-b border-deep/20 bg-deep text-papaya">
      <picture className="pointer-events-none absolute inset-0">
        <source
          media="(min-width: 768px)"
          srcSet={imagemDesktop.srcSet}
          sizes={imagemDesktop.sizes}
        />
        <img
          {...imagemMobile}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-r from-deep/72 via-deep/38 to-deep/5" />
      <div className="pointer-events-none absolute inset-0 bg-grid-fina opacity-10" />

      <div className="pointer-events-none absolute right-0 top-1/2 hidden w-[clamp(7rem,20vw,22rem)] -translate-y-1/2 sm:block sm:right-2 xl:right-8">
        <Image
          src="/marca/aviao-vermelho.png"
          alt=""
          width={376}
          height={190}
          sizes="(min-width: 1760px) 352px, 20vw"
          className="h-auto w-full drop-shadow-[0_18px_30px_rgba(0,0,0,0.28)]"
        />
      </div>

      <div className="relative mx-auto w-full max-w-[1360px] px-5 py-3 sm:px-5 sm:py-4 lg:px-8 lg:py-4">
        <p className="flex items-center gap-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-steel-300">
          <span className="h-0.5 w-7 rounded-full bg-brick" aria-hidden="true" />
          Área do participante
        </p>

        <h1 className="mt-2 max-w-xl text-balance font-display text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-4xl">
          Bem-vindo(a), {nome}!
        </h1>

        <p className="mt-2 max-w-lg text-xs leading-relaxed text-papaya/90 sm:text-sm">
          Explore os eventos, faça sua inscrição e aproveite todas as
          oportunidades da comunidade DPM.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <Link
            href="/conta/eventos"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-brick px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-molten focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-papaya"
          >
            Explorar eventos
            <IconeSetaDireita className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
