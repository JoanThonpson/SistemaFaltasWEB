'use strict';

/**
 * Log de ATIVIDADES dos usuários (tabela "logs"). Não confundir com o logger de console.
 *
 *   Log.registrar({ usuario: req.usuario, acao: 'LOGIN', modulo: 'Autenticação',
 *                   detalhes: { ... }, ip: Log.ipDe(req) });
 */

const db = require('../db/database');
const { criar, sanear } = require('../utils/logger');

const logger = criar('atividades');

/** IP do cliente sem o prefixo IPv6 "::ffff:" que o Node coloca em conexões IPv4. */
function ipDe(req) {
  return String(req.ip ?? '').replace(/^::ffff:/, '') || null;
}

/**
 * Nunca derruba a requisição: se a gravação falhar, só avisa no log do servidor.
 * "usuario" precisa ter id, nome e perfil_nome (pode ser null em falhas de login).
 * "detalhes" objeto vira JSON sem segredos (senhas ocultas, CPF mascarado).
 */
function registrar({ usuario = null, acao, modulo = null, detalhes = null, ip = null }) {
  try {
    let texto = null;
    if (detalhes !== null && detalhes !== undefined) {
      texto = typeof detalhes === 'string' ? detalhes : JSON.stringify(sanear(detalhes));
    }
    db.prepare(
      `INSERT INTO logs (usuario_id, usuario_nome, perfil_nome, acao, modulo, detalhes, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(usuario?.id ?? null, usuario?.nome ?? null, usuario?.perfil_nome ?? null, acao, modulo, texto, ip);
  } catch (erro) {
    logger.erro('Falha ao gravar log de atividade', erro, { acao });
  }
}

module.exports = { registrar, ipDe };