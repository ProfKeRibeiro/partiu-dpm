#!/usr/bin/env node
/**
 * Smoke HTTP do partiu-dpm.
 *
 * Uso:
 *   node scripts/qa-smoke.mjs
 *   node scripts/qa-smoke.mjs --base-url http://localhost:3100
 *   node scripts/qa-smoke.mjs --certificado <codigo_validacao>
 *
 * Verifica apenas leitura: status das rotas públicas, redirecionamento das
 * rotas protegidas sem sessão e o 401 do cron sem token. Sai com código 1 se
 * qualquer verificação falhar.
 */

const argumentos = process.argv.slice(2);

function argumento(nome, padrao) {
  const indice = argumentos.indexOf(`--${nome}`);
  return indice >= 0 && argumentos[indice + 1] ? argumentos[indice + 1] : padrao;
}

const baseUrl = argumento("base-url", "https://partiu-dpm.vercel.app").replace(
  /\/$/,
  "",
);
const certificado = argumento("certificado", "");

const publicas = ["/", "/eventos", "/certificados", "/entrar"];
const protegidas = ["/conta", "/conta/inscricoes", "/admin"];

const falhas = [];

async function requisitar(caminho, opcoes = {}) {
  const resposta = await fetch(`${baseUrl}${caminho}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
    ...opcoes,
  });

  const corpo = await resposta.text();
  return { status: resposta.status, local: resposta.headers.get("location"), corpo };
}

function registrar(ok, descricao, detalhe) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${descricao}${detalhe ? ` — ${detalhe}` : ""}`);
  if (!ok) falhas.push(descricao);
}

for (const rota of publicas) {
  try {
    const { status } = await requisitar(rota);
    registrar(status === 200, `GET ${rota} = 200`, `status ${status}`);
  } catch (erro) {
    registrar(false, `GET ${rota}`, erro.message);
  }
}

for (const rota of protegidas) {
  try {
    const { status, local } = await requisitar(rota);
    const esperado = status === 307 && (local ?? "").includes("/entrar?next=");
    registrar(
      esperado,
      `GET ${rota} sem sessão = 307 para /entrar`,
      `status ${status}, location ${local ?? "—"}`,
    );
  } catch (erro) {
    registrar(false, `GET ${rota}`, erro.message);
  }
}

try {
  const { status } = await requisitar("/api/cron/convites");
  registrar(status === 401, "GET /api/cron/convites sem token = 401", `status ${status}`);
} catch (erro) {
  registrar(false, "GET /api/cron/convites", erro.message);
}

if (certificado) {
  try {
    const { status, corpo } = await requisitar(`/certificados/${certificado}`);
    const valido =
      status === 200 &&
      !corpo.includes("Certificado não encontrado") &&
      !corpo.includes("Certificado n");
    registrar(valido, `GET /certificados/<codigo> válido`, `status ${status}`);
  } catch (erro) {
    registrar(false, "GET /certificados/<codigo>", erro.message);
  }
}

console.log(
  `\n${falhas.length === 0 ? "Smoke OK" : `${falhas.length} falha(s)`} em ${baseUrl}`,
);

process.exit(falhas.length === 0 ? 0 : 1);
