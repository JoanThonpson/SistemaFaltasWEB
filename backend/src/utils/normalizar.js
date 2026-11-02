'use strict';

/**
 * Normalização de nomes (disciplinas, cursos, justificativas).
 *
 *  limparNome(): o que é GRAVADO como nome (só arruma os espaços).
 *  normalizar(): a chave de comparação gravada em nome_norm (UNIQUE).
 *
 * Use SEMPRE estas funções, tanto na sincronização com o RM quanto no
 * cadastro manual feito pela tela. Assim o mesmo nome nunca entra duas vezes.
 *
 * Exemplos:
 *   'PRÁTICA EXTENSIONISTA III – FAMÍLIA'   -> 'PRATICA EXTENSIONISTA III-FAMILIA'
 *   'FUNDAMENTOS SÓCIO -ANTROPOLÓGICOS'     -> 'FUNDAMENTOS SOCIO-ANTROPOLOGICOS'
 *   'BIOLOGIA CELULAR E MOLECULAR '         -> 'BIOLOGIA CELULAR E MOLECULAR'
 */

const INVISIVEIS = /[\u200B-\u200D\u2060\uFEFF]/g;      // largura zero, BOM
const TRACOS = /[\u2010-\u2015\u2212]/g;                // ‐ ‑ ‒ – — ― −
const ASPAS_SIMPLES = /[\u2018\u2019\u201B\u2032]/g;
const ASPAS_DUPLAS = /[\u201C\u201D\u201F\u2033]/g;

/** Remove caracteres invisíveis e espaços repetidos/nas pontas. Mantém acento e maiúsculas. */
function limparNome(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(INVISIVEIS, '')
    .replace(/\s+/g, ' ') // inclui espaço não separável (NBSP)
    .trim();
}

/** Chave de comparação: sem acento, maiúscula, traços e aspas padronizados. */
function normalizar(valor) {
  return limparNome(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos (Ç vira C)
    .replace(TRACOS, '-')
    .replace(ASPAS_SIMPLES, "'")
    .replace(ASPAS_DUPLAS, '"')
    .replace(/\s*-\s*/g, '-') // "A - B", "A -B" e "A-B" ficam iguais
    .toUpperCase();
}

/** true se os dois nomes são o mesmo para o sistema (e não estão vazios). */
function mesmoNome(a, b) {
  const chave = normalizar(a);
  return chave !== '' && chave === normalizar(b);
}

module.exports = { limparNome, normalizar, mesmoNome };