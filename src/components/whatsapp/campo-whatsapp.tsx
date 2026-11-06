"use client";

import { useState } from "react";
import { mascararWhatsApp } from "@/lib/whatsapp";

const ESTILO_CAMPOS =
  "mt-1.5 w-full rounded-xl border border-deep/15 bg-white px-3 py-2.5 text-sm text-deep outline-none transition focus:border-brick focus:ring-4 focus:ring-brick/10";

/**
 * Campo opcional de WhatsApp do responsável: máscara BR (DD) 9XXXX-XXXX.
 *
 * O e-mail do responsável continua obrigatório no formulário de subinscrição;
 * o WhatsApp é opcional e só é usado para enviar o link de aceite quando
 * informado.
 */
export function CampoWhatsApp({
  id = "telefone_responsavel",
  nome = "telefone_responsavel",
  className = ESTILO_CAMPOS,
}: {
  id?: string;
  nome?: string;
  className?: string;
}) {
  const [valor, setValor] = useState("");

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-deep">
        WhatsApp do responsável
      </label>
      <input
        id={id}
        name={nome}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={valor}
        onChange={(evento) => setValor(mascararWhatsApp(evento.target.value))}
        placeholder="(11) 91234-5678"
        className={className}
      />
      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        Se informado, o link de aceite também será enviado por WhatsApp.
      </p>
    </div>
  );
}
