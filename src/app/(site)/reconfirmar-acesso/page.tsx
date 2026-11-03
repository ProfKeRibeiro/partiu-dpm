import { redirect } from "next/navigation";

/** Compatibilidade: links antigos usavam /reconfirmar-acesso. */
export default function ReconfirmarAcessoPage() {
  redirect("/reconfirmar-email");
}
