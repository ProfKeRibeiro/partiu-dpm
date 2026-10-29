import { isSupabaseConfigured } from "@/lib/env";
import { IconeInfo } from "@/components/ui/icons";

/**
 * Aviso exibido apenas quando o Supabase ainda não está configurado.
 * Evita que os dados de demonstração sejam confundidos com a agenda real.
 */
export function AvisoPrevia({ className = "" }: { className?: string }) {
  if (isSupabaseConfigured) return null;

  return (
    <div
      role="note"
      className={`flex items-start gap-3 rounded-xl border border-brick/30 bg-papaya px-4 py-3 text-sm leading-relaxed text-molten ${className}`}
    >
      <IconeInfo className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        <strong className="font-semibold">Prévia do portal.</strong> Os eventos
        exibidos são exemplos e as inscrições ainda não estão abertas.
      </p>
    </div>
  );
}
