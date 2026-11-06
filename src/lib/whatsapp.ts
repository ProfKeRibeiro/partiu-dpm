/**
 * Máscara e validação de WhatsApp no padrão brasileiro: (DD) 9XXXX-XXXX.
 *
 * Usado no formulário de subinscrição de escola e no aviso de consentimento
 * do menor para preparar o envio do link de aceite por WhatsApp (Meta Cloud API).
 */

/** Formata dígitos no padrão (DD) 9XXXX-XXXX. */
export function mascararWhatsApp(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);

  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 7) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6, 11)}`;
}

/** Valida WhatsApp no padrão BR: (DD) 9XXXX-XXXX. */
export function whatsappValido(valor: string): boolean {
  const digitos = valor.replace(/\D/g, "");
  return /^[0-9]{2}9[0-9]{8}$/.test(digitos);
}
