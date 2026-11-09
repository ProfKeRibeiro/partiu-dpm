"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
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
  avatarPath,
}: {
  nome: string;
  avatarUrl: string | null;
  avatarPath: string | null;
}) {
  const router = useRouter();
  const [fotoAtual, setFotoAtual] = useState(avatarUrl);
  const [caminhoAtual, setCaminhoAtual] = useState(avatarPath);
  const [previa, setPrevia] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviarFoto(arquivo: File, extensao: string) {
    setEnviando(true);

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
        cacheControl: "60",
        contentType: arquivo.type,
        upsert: false,
      });

      if (erroUpload) {
        setErro("Não foi possível enviar a foto. Tente novamente.");
        return;
      }

      const { data: assinada } = await bucket.createSignedUrl(caminho, 7200);
      const url = assinada?.signedUrl ?? null;

      const { error: erroAtualizacao } = await supabase.auth.updateUser({
        data: { avatar_path: caminho, avatar_url: null },
      });

      if (erroAtualizacao) {
        await bucket.remove([caminho]);
        setErro("Não foi possível salvar a foto no seu perfil.");
        return;
      }

      const avatarAntigo = caminhoAtual ?? caminhoAvatar(fotoAtual, usuarioId);
      if (avatarAntigo && avatarAntigo !== caminho) {
        await bucket.remove([avatarAntigo]);
      }

      setFotoAtual(url ?? fotoAtual);
      setCaminhoAtual(caminho);
      setMensagem("Foto de perfil atualizada.");
      router.refresh();
    } catch {
      setErro(
        "Não foi possível enviar a foto. Confira sua conexão e tente novamente.",
      );
    } finally {
      setEnviando(false);
    }
  }

  async function selecionarArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0] ?? null;

    // Permite escolher o mesmo arquivo de novo depois de um erro.
    evento.target.value = "";

    setErro(null);
    setMensagem(null);

    if (!arquivo) return;

    const extensao = extensoes[arquivo.type];

    if (!extensao) {
      setErro("Use uma imagem JPG, PNG ou WebP.");
      return;
    }

    if (arquivo.size > MAX_BYTES) {
      setErro("A foto deve ter no máximo 5 MB.");
      return;
    }

    // Mostra a imagem escolhida na hora, antes do envio terminar.
    const urlLocal = URL.createObjectURL(arquivo);
    setPrevia(urlLocal);

    try {
      await enviarFoto(arquivo, extensao);
    } finally {
      URL.revokeObjectURL(urlLocal);
      setPrevia(null);
    }
  }

  const temFoto = Boolean(fotoAtual);

  return (
    <section aria-labelledby="titulo-foto-perfil">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar
          src={previa ?? fotoAtual}
          nome={nome}
          tamanho={56}
          alt={`Foto de perfil de ${nome}`}
          className={`h-14 w-14 ring-2 ring-papaya ${
            enviando ? "opacity-70" : ""
          }`}
        />
        <div className="min-w-0 flex-1">
          <h3
            id="titulo-foto-perfil"
            className="font-display text-base font-semibold text-deep"
          >
            Foto de perfil
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {enviando
              ? "Enviando sua foto…"
              : temFoto
                ? "Escolha outra imagem a qualquer momento. JPG, PNG ou WebP, até 5 MB."
                : "JPG, PNG ou WebP, até 5 MB. A foto é salva assim que você escolhe o arquivo."}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label
          htmlFor="arquivo-foto-perfil"
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-deep/20 bg-white px-4 text-sm font-semibold text-deep transition-colors hover:bg-papaya/60 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brick"
        >
          {enviando ? "Enviando…" : temFoto ? "Trocar foto" : "Escolher foto"}
          <input
            id="arquivo-foto-perfil"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={selecionarArquivo}
            disabled={enviando}
            className="sr-only"
          />
        </label>
        <p className="text-xs text-muted">
          Não precisa clicar em salvar: a troca é automática.
        </p>
      </div>

      {erro ? (
        <p role="alert" className="mt-3 text-sm text-molten">
          {erro}
        </p>
      ) : null}
      <p
        role="status"
        aria-live="polite"
        className={`mt-3 text-sm text-steel-700 ${
          enviando || mensagem ? "" : "sr-only"
        }`}
      >
        {enviando ? "Salvando sua nova foto…" : mensagem}
      </p>
    </section>
  );
}
