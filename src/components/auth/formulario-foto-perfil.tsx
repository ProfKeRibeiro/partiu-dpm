"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { IconePessoa } from "@/components/ui/icons";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const extensoes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function caminhoAvatar(url: string | null, usuarioId: string) {
  const marcador = "/storage/v1/object/public/avatars/";
  const indice = url?.indexOf(marcador) ?? -1;

  if (!url || indice < 0) return null;

  const caminho = decodeURIComponent(
    url.slice(indice + marcador.length).split("?")[0],
  );

  return caminho.startsWith(`${usuarioId}/`) ? caminho : null;
}

export function FormularioFotoPerfil({
  nome,
  avatarUrl,
}: {
  nome: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const [fotoAtual, setFotoAtual] = useState(avatarUrl);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [pendente, setPendente] = useState(false);

  function selecionarArquivo(evento: ChangeEvent<HTMLInputElement>) {
    setArquivo(evento.target.files?.[0] ?? null);
    setErro(null);
    setMensagem(null);
  }

  async function enviarFoto(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setMensagem(null);

    if (!arquivo) {
      setErro("Escolha uma foto antes de enviar.");
      return;
    }

    const extensao = extensoes[arquivo.type];
    if (!extensao) {
      setErro("Use uma imagem JPG, PNG ou WebP.");
      return;
    }

    if (arquivo.size > MAX_BYTES) {
      setErro("A foto deve ter no máximo 5 MB.");
      return;
    }

    setPendente(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: usuarioData, error: erroUsuario } =
        await supabase.auth.getUser();

      if (erroUsuario || !usuarioData.user) {
        setErro("Sua sessão expirou. Entre novamente.");
        return;
      }

      const usuarioId = usuarioData.user.id;
      const caminho = `${usuarioId}/${crypto.randomUUID()}.${extensao}`;
      const bucket = supabase.storage.from("avatars");
      const { error: erroUpload } = await bucket.upload(caminho, arquivo, {
        cacheControl: "3600",
        contentType: arquivo.type,
        upsert: false,
      });

      if (erroUpload) {
        setErro("Não foi possível enviar a foto. Tente novamente.");
        return;
      }

      const url = bucket.getPublicUrl(caminho).data.publicUrl;
      const { error: erroAtualizacao } = await supabase.auth.updateUser({
        data: { avatar_url: url },
      });

      if (erroAtualizacao) {
        await bucket.remove([caminho]);
        setErro("Não foi possível salvar a foto no seu perfil.");
        return;
      }

      const avatarAntigo = caminhoAvatar(fotoAtual, usuarioId);
      if (avatarAntigo && avatarAntigo !== caminho) {
        await bucket.remove([avatarAntigo]);
      }

      setFotoAtual(url);
      setArquivo(null);
      setMensagem("Foto de perfil atualizada.");
      router.refresh();
    } catch {
      setErro("Não foi possível enviar a foto. Confira sua conexão e tente novamente.");
    } finally {
      setPendente(false);
    }
  }

  return (
    <section aria-labelledby="titulo-foto-perfil">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-deep text-papaya ring-2 ring-papaya">
          {fotoAtual ? (
            <Image
              src={fotoAtual}
              alt={`Foto de perfil de ${nome}`}
              width={56}
              height={56}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            <IconePessoa className="h-6 w-6" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3
            id="titulo-foto-perfil"
            className="font-display text-base font-semibold text-deep"
          >
            Foto de perfil
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            JPG, PNG ou WebP, até 5 MB.
          </p>
        </div>
      </div>

      <form onSubmit={enviarFoto} className="mt-4 flex flex-wrap items-center gap-3">
        <label
          htmlFor="arquivo-foto-perfil"
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-deep/20 bg-white px-4 text-sm font-semibold text-deep transition-colors hover:bg-papaya/60 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brick"
        >
          Escolher foto
          <input
            id="arquivo-foto-perfil"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={selecionarArquivo}
            className="sr-only"
          />
        </label>
        {arquivo ? (
          <span className="max-w-full truncate text-xs text-muted">
            {arquivo.name}
          </span>
        ) : null}
        <button
          type="submit"
          disabled={pendente || !arquivo}
          className="inline-flex h-10 items-center justify-center rounded-full bg-brick px-4 text-sm font-semibold text-white transition-colors hover:bg-molten focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendente ? "Enviando…" : "Atualizar foto"}
        </button>
      </form>

      {erro ? (
        <p role="alert" className="mt-3 text-sm text-molten">
          {erro}
        </p>
      ) : null}
      {mensagem ? (
        <p role="status" className="mt-3 text-sm text-steel-700">
          {mensagem}
        </p>
      ) : null}
    </section>
  );
}