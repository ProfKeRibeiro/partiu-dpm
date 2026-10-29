"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterUsuario, usuarioEhAdmin } from "@/lib/auth/sessao";
import { dataLocalParaIso } from "@/lib/data-local";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { temaEventoValido } from "@/lib/tema-evento";

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TIPOS = [
  "palestra",
  "oficina",
  "curso",
  "feira",
  "treinamento",
  "outro",
] as const;

const MODALIDADES = ["presencial", "online", "hibrido"] as const;

const PUBLICOS = [
  "alunos_escola",
  "professores_funcionarios",
  "comunidade_escolar",
  "externo",
  "todos",
] as const;

const STATUS = ["rascunho", "publicado", "cancelado", "encerrado"] as const;

export type EstadoEvento = { erro?: string; mensagem?: string } | null;

type PayloadEvento = {
  titulo: string;
  descricao: string | null;
  tipo: (typeof TIPOS)[number];
  modalidade: (typeof MODALIDADES)[number];
  local_evento: string | null;
  link_evento: string | null;
  data_inicio: string;
  data_fim: string;
  inicio_inscricoes: string | null;
  fim_inscricoes: string | null;
  limite_vagas: number | null;
  publico_alvo: (typeof PUBLICOS)[number];
  cursos_permitidos: string[];
  series_permitidas: string[];
  status: (typeof STATUS)[number];
  imagem_url: string | null;
  cor_tema: string;
};

function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function listaDeTexto(formData: FormData, campo: string) {
  return Array.from(
    new Set(
      formData
        .getAll(campo)
        .flatMap((valor) =>
          typeof valor === "string" ? valor.split(/[;,]/) : [],
        )
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function urlValida(valor: string, permitirCaminhoInterno = false) {
  if (permitirCaminhoInterno && valor.startsWith("/")) return true;

  try {
    const url = new URL(valor);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function revalidarEvento(eventoId?: string) {
  revalidatePath("/");
  revalidatePath("/eventos");
  revalidatePath("/conta");
  revalidatePath("/admin");

  if (eventoId && REGEX_UUID.test(eventoId)) {
    revalidatePath(`/admin/eventos/${eventoId}`);
    revalidatePath(`/admin/eventos/${eventoId}/editar`);
    revalidatePath(`/eventos/${eventoId}`);
  }
}

function montarPayload(
  formData: FormData,
): { erro: string } | { dados: PayloadEvento } {
  const titulo = texto(formData, "titulo");
  const descricao = texto(formData, "descricao");
  const tipo = texto(formData, "tipo");
  const modalidade = texto(formData, "modalidade");
  const local = texto(formData, "local_evento");
  const link = texto(formData, "link_evento");
  const inicioBruto = texto(formData, "data_inicio");
  const fimBruto = texto(formData, "data_fim");
  const inscricoesInicioBruto = texto(formData, "inicio_inscricoes");
  const inscricoesFimBruto = texto(formData, "fim_inscricoes");
  const limiteBruto = texto(formData, "limite_vagas");
  const publico = texto(formData, "publico_alvo");
  const status = texto(formData, "status");
  const imagem = texto(formData, "imagem_url");
  const corTema = texto(formData, "cor_tema");

  if (titulo.length < 3) {
    return { erro: "Informe um título com pelo menos 3 caracteres." };
  }
  if (titulo.length > 160) {
    return { erro: "O título pode ter no máximo 160 caracteres." };
  }
  if (descricao.length > 4000) {
    return { erro: "A descrição pode ter no máximo 4000 caracteres." };
  }
  if (!TIPOS.includes(tipo as (typeof TIPOS)[number])) {
    return { erro: "Selecione um tipo de evento válido." };
  }
  if (!MODALIDADES.includes(modalidade as (typeof MODALIDADES)[number])) {
    return { erro: "Selecione uma modalidade válida." };
  }
  if (!PUBLICOS.includes(publico as (typeof PUBLICOS)[number])) {
    return { erro: "Selecione um público-alvo válido." };
  }
  if (!STATUS.includes(status as (typeof STATUS)[number])) {
    return { erro: "Selecione um status válido." };
  }

  const inicio = dataLocalParaIso(inicioBruto);
  const fim = dataLocalParaIso(fimBruto);

  if (!inicio) {
    return { erro: "Informe a data e o horário de início do evento." };
  }
  if (!fim) {
    return { erro: "Informe a data e o horário de término do evento." };
  }
  if (new Date(fim).getTime() < new Date(inicio).getTime()) {
    return { erro: "O término do evento não pode ser anterior ao início." };
  }

  const inscricoesInicio = inscricoesInicioBruto
    ? dataLocalParaIso(inscricoesInicioBruto)
    : null;
  const inscricoesFim = inscricoesFimBruto
    ? dataLocalParaIso(inscricoesFimBruto)
    : null;

  if (inscricoesInicioBruto && !inscricoesInicio) {
    return { erro: "A abertura das inscrições tem uma data inválida." };
  }
  if (inscricoesFimBruto && !inscricoesFim) {
    return { erro: "O encerramento das inscrições tem uma data inválida." };
  }
  if (
    inscricoesInicio &&
    inscricoesFim &&
    new Date(inscricoesFim).getTime() < new Date(inscricoesInicio).getTime()
  ) {
    return {
      erro: "O fim das inscrições não pode ser anterior à abertura.",
    };
  }

  let limiteVagas: number | null = null;
  if (limiteBruto) {
    const numero = Number(limiteBruto);
    if (!Number.isInteger(numero) || numero <= 0) {
      return { erro: "O limite de vagas deve ser um número inteiro maior que zero." };
    }
    limiteVagas = numero;
  }

  if (local.length > 200) {
    return { erro: "O local pode ter no máximo 200 caracteres." };
  }
  if (modalidade !== "online" && !local) {
    return { erro: "Informe o local do evento presencial ou híbrido." };
  }
  if (link && (link.length > 500 || !urlValida(link))) {
    return { erro: "O link de acesso deve ser uma URL http(s) válida." };
  }
  if (
    status === "publicado" &&
    modalidade !== "presencial" &&
    !link
  ) {
    return {
      erro: "Informe o link de acesso antes de publicar um evento online ou híbrido.",
    };
  }
  if (imagem && imagem.length > 500) {
    return { erro: "A URL da imagem pode ter no máximo 500 caracteres." };
  }
  if (imagem && !urlValida(imagem, true)) {
    return { erro: "A imagem deve ser uma URL http(s) ou um caminho interno." };
  }
  if (!temaEventoValido(corTema)) {
    return { erro: "Selecione uma cor de tema válida." };
  }

  const cursos = listaDeTexto(formData, "cursos_permitidos");
  const series = listaDeTexto(formData, "series_permitidas");

  if (cursos.length > 30 || series.length > 30) {
    return { erro: "Informe no máximo 30 cursos e 30 séries." };
  }
  if ([...cursos, ...series].some((item) => item.length > 80)) {
    return { erro: "Cada curso ou série pode ter no máximo 80 caracteres." };
  }

  return {
    dados: {
      titulo,
      descricao: descricao || null,
      tipo: tipo as PayloadEvento["tipo"],
      modalidade: modalidade as PayloadEvento["modalidade"],
      local_evento: local || null,
      link_evento: link || null,
      data_inicio: inicio,
      data_fim: fim,
      inicio_inscricoes: inscricoesInicio,
      fim_inscricoes: inscricoesFim,
      limite_vagas: limiteVagas,
      publico_alvo: publico as PayloadEvento["publico_alvo"],
      cursos_permitidos: cursos,
      series_permitidas: series,
      status: status as PayloadEvento["status"],
      imagem_url: imagem || null,
      cor_tema: corTema,
    },
  };
}

function traduzirErroBanco(codigo: string | undefined) {
  if (codigo === "42501") {
    return "Sua conta não tem permissão de administrador para salvar eventos.";
  }
  if (codigo === "23514") {
    return "Confira as datas, o limite de vagas e o período de inscrições.";
  }
  if (codigo === "23502") {
    return "Preencha todos os campos obrigatórios do evento.";
  }
  if (codigo === "22P02") {
    return "Algum valor enviado é inválido. Revise o formulário.";
  }

  return "Não foi possível salvar o evento. Tente novamente.";
}

export async function salvarEvento(
  _estado: EstadoEvento,
  formData: FormData,
): Promise<EstadoEvento> {
  const admin = await usuarioEhAdmin();
  if (!admin) redirect("/entrar?next=/admin");

  const id = texto(formData, "evento_id");
  const editando = id.length > 0;

  if (editando && !REGEX_UUID.test(id)) {
    return { erro: "Evento inválido. Volte ao painel e tente novamente." };
  }

  const resultado = montarPayload(formData);
  if ("erro" in resultado) return { erro: resultado.erro };

  const supabase = await createSupabaseServerClient();

  if (editando) {
    const { error } = await supabase
      .from("eventos")
      .update(resultado.dados)
      .eq("id", id);

    if (error) {
      console.error("[partiu-dpm] Falha ao atualizar evento.", error);
      return { erro: traduzirErroBanco(error.code) };
    }

    revalidarEvento(id);
    return { mensagem: "Evento atualizado com sucesso." };
  }

  const usuario = await obterUsuario();
  if (!usuario) redirect("/entrar?next=/admin");

  const { data, error } = await supabase
    .from("eventos")
    .insert({ ...resultado.dados, criado_por: usuario.id })
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("[partiu-dpm] Falha ao criar evento.", error);
    return { erro: traduzirErroBanco(error?.code) };
  }

  revalidarEvento(data.id);
  redirect(`/admin/eventos/${data.id}`);
}

export async function publicarEvento(formData: FormData) {
  const admin = await usuarioEhAdmin();
  if (!admin) redirect("/entrar?next=/admin");

  const id = texto(formData, "evento_id");
  if (!REGEX_UUID.test(id)) {
    redirect("/admin");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_publicar_evento", {
    p_evento_id: id,
  });

  if (error) {
    console.error("[partiu-dpm] Falha ao publicar evento.", error);
    redirect(`/admin/eventos/${id}?erro=publicar`);
  }

  revalidarEvento(id);
  redirect(`/admin/eventos/${id}?publicado=1`);
}

export async function excluirEvento(formData: FormData) {
  const admin = await usuarioEhAdmin();
  if (!admin) redirect("/entrar?next=/admin");

  const id = texto(formData, "evento_id");
  if (!REGEX_UUID.test(id)) redirect("/admin");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("eventos").delete().eq("id", id);

  if (error) {
    console.error("[partiu-dpm] Falha ao excluir evento.", error);
    redirect(`/admin/eventos/${id}?erro=excluir`);
  }

  revalidarEvento(id);
  redirect("/admin");
}
