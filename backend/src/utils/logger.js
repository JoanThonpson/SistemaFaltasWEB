'use strict';

/**
 * Logger simples, sem dependências.
 * Uso:  const log = require('../utils/logger').criar('sync');
 *       log.info('Sincronização iniciada', { origem: 'AUTOMATICA' });
 *       log.erro('Falha ao ler o RM', err, { tentativa: 2 });
 *
 * - Horários em UTC (ISO), como o banco.
 * - Segredos e CPF nunca vão para o log (veja sanear()).
 */

const { config } = require('../config/env');

const NIVEIS = { debug: 10, info: 20, aviso: 30, erro: 40 };
const NIVEL_MINIMO = config.producao ? NIVEIS.info : NIVEIS.debug;

const CHAVES_SECRETAS = /senha|password|secret|segredo|token|cookie|authorization|hash/i;
const PROFUNDIDADE_MAX = 4;
const LINHAS_DE_PILHA = 8;

function mascararCpf(valor) {
  const digitos = String(valor).replace(/\D/g, '');
  return digitos.length === 11 ? `*********${digitos.slice(-2)}` : '***';
}

/** Copia o valor removendo segredos, mascarando CPF e limitando tamanho/profundidade. */
function sanear(valor, chave = '', profundidade = 0, vistos = new WeakSet()) {
  if (CHAVES_SECRETAS.test(chave)) return '[oculto]';
  if (/^cpf$/i.test(chave) && (typeof valor === 'string' || typeof valor === 'number')) {
    return mascararCpf(valor);
  }
  if (valor === null || valor === undefined) return valor;
  if (valor instanceof Error) {
    return { nome: valor.name, mensagem: valor.message, codigo: valor.code };
  }
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? 'data inválida' : valor.toISOString();
  }
  if (typeof valor === 'bigint') return valor.toString();
  if (typeof valor === 'function' || typeof valor === 'symbol') return `[${typeof valor}]`;
  if (typeof valor !== 'object') {
    return typeof valor === 'string' && valor.length > 500 ? `${valor.slice(0, 500)}…` : valor;
  }
  if (ArrayBuffer.isView(valor)) return `[binário ${valor.byteLength} bytes]`;
  if (vistos.has(valor)) return '[circular]';
  if (profundidade >= PROFUNDIDADE_MAX) return '[...]';

  vistos.add(valor);
  if (Array.isArray(valor)) {
    return valor.slice(0, 20).map((item) => sanear(item, chave, profundidade + 1, vistos));
  }
  const saida = {};
  for (const [k, v] of Object.entries(valor)) {
    saida[k] = sanear(v, k, profundidade + 1, vistos);
  }
  return saida;
}

function escrever(nivel, modulo, mensagem, contexto, erro) {
  if (NIVEIS[nivel] < NIVEL_MINIMO) return;

  const saida = nivel === 'erro' ? console.error : nivel === 'aviso' ? console.warn : console.log;
  let linha = `${new Date().toISOString()} ${nivel.toUpperCase().padEnd(5)} [${modulo}] ${mensagem}`;

  if (contexto !== undefined) {
    try {
      linha += ` ${JSON.stringify(sanear(contexto))}`;
    } catch {
      linha += ' [contexto não serializável]';
    }
  }
  saida(linha);

  if (erro && erro.stack) {
    const pilha = String(erro.stack).split('\n').slice(0, LINHAS_DE_PILHA).join('\n');
    saida(pilha);
  }
}

function criar(modulo) {
  return {
    debug: (mensagem, contexto) => escrever('debug', modulo, mensagem, contexto),
    info: (mensagem, contexto) => escrever('info', modulo, mensagem, contexto),
    aviso: (mensagem, contexto) => escrever('aviso', modulo, mensagem, contexto),
    /** erro(mensagem, err?, contexto?)  ou  erro(mensagem, contexto) */
    erro: (mensagem, erroOuContexto, contexto) => {
      if (erroOuContexto instanceof Error) {
        escrever('erro', modulo, mensagem, { erro: erroOuContexto, ...contexto }, erroOuContexto);
      } else {
        escrever('erro', modulo, mensagem, erroOuContexto);
      }
    },
  };
}

module.exports = { criar, sanear };