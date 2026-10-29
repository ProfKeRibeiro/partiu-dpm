"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconeCertificado } from "@/components/ui/icons";

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ConsultaCertificado() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const valor = codigo.trim().toLowerCase();

    if (!REGEX_UUID.test(valor)) {
      setErro("Informe o código completo, no formato UUID.");
      return;
    }

    setErro(null);
    router.push(`/certificados/${valor}`);
  }

  return (
    <form onSubmit={aoEnviar} className="mt-6 space-y-3">
      <label
        htmlFor="codigo"
        className="block text-xs font-semibold uppercase tracking-[0.14em] text-deep"
      >
        Código de validação
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="codigo"
          name="codigo"
          value={codigo}
          onChange={(evento) => setCodigo(evento.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
          className="w-full rounded-xl border border-deep/15 bg-white px-4 py-3 font-mono text-sm text-deep shadow-sm outline-none placeholder:text-muted/60 focus:border-brick focus:ring-4 focus:ring-brick/10"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-deep px-5 text-sm font-semibold text-papaya transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          <IconeCertificado className="h-4 w-4" />
          Validar
        </button>
      </div>
      {erro ? (
        <p role="alert" className="text-xs font-medium text-brick">
          {erro}
        </p>
      ) : (
        <p className="text-xs text-muted">
          O código aparece no rodapé do certificado emitido.
        </p>
      )}
    </form>
  );
}
