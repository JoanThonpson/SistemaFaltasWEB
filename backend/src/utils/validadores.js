'use strict';

/**
 * Validadores reutilizáveis (CPF e senha).
 * O CPF deve ser sempre GRAVADO só com dígitos (usuarios.cpf tem 11 dígitos).
 */

function somenteDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

/** Valida CPF pelos dois dígitos verificadores. Aceita com ou sem máscara. */
function cpfValido(valor) {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false; // 111.111.111-11 etc.

  const digitoVerificador = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i += 1) {
      soma += Number(base[i]) * (base.length + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return (
    digitoVerificador(cpf.slice(0, 9)) === Number(cpf[9]) &&
    digitoVerificador(cpf.slice(0, 10)) === Number(cpf[10])
  );
}

/** 52998224725 -> 529.982.247-25 (se não tiver 11 dígitos, devolve como veio). */
function formatarCpf(valor) {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11) return String(valor ?? '');
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

const REGRAS_SENHA = [
  { ok: (s) => s.length >= 8, mensagem: 'A senha deve conter no mínimo 8 caracteres.' },
  { ok: (s) => /\p{Ll}/u.test(s), mensagem: 'A senha deve conter pelo menos uma letra minúscula.' },
  { ok: (s) => /\d/.test(s), mensagem: 'A senha deve conter pelo menos um número.' },
  { ok: (s) => /[^\p{L}\p{N}\s]/u.test(s), mensagem: 'A senha deve conter pelo menos um caractere especial.' },
  { ok: (s) => Buffer.byteLength(s, 'utf8') <= 72, mensagem: 'A senha deve ter no máximo 72 caracteres.' },
];

/** Devolve a lista de problemas da senha (vazia = senha válida). */
function validarSenha(senha) {
  if (typeof senha !== 'string' || senha === '') return ['A senha é obrigatória.'];
  return REGRAS_SENHA.filter((regra) => !regra.ok(senha)).map((regra) => regra.mensagem);
}

module.exports = { somenteDigitos, cpfValido, formatarCpf, validarSenha };