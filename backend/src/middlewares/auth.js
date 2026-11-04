'use strict';

const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { config } = require('../config/env');
const { ErroApi } = require('./erros');

/**
 * Autentica pelo cookie "token" e coloca o usuário em req.usuario.
 * A cada requisição o usuário e o perfil são lidos do banco: desativar alguém ou
 * mudar o perfil vale na hora, sem esperar o token expirar.
 */
function criar({ exigirSenhaAtualizada }) {
  return function autenticar(req, res, next) {
    const token = req.cookies?.token;
    if (!token) return next(ErroApi.naoAutenticado('Faça login para continuar.'));

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.segredo, { algorithms: ['HS256'] });
    } catch (erro) {
      const expirou = erro.name === 'TokenExpiredError';
      return next(ErroApi.naoAutenticado(expirou ? 'Sessão expirada. Faça login novamente.' : 'Sessão inválida. Faça login novamente.'));
    }
    if (!Number.isInteger(payload.id)) return next(ErroApi.naoAutenticado('Sessão inválida. Faça login novamente.'));

    const usuario = db
      .prepare(
        `SELECT u.id, u.nome, u.perfil_id, u.master, u.ativo, u.deve_trocar_senha, p.nome AS perfil_nome
         FROM usuarios u JOIN perfis p ON p.id = u.perfil_id
         WHERE u.id = ?`
      )
      .get(payload.id);
    if (!usuario || !usuario.ativo) return next(ErroApi.naoAutenticado('Usuário não encontrado ou inativo.'));

    if (exigirSenhaAtualizada && usuario.deve_trocar_senha === 1) {
      return next(new ErroApi(403, 'TROCA_SENHA_OBRIGATORIA', 'É necessário definir uma nova senha antes de continuar.'));
    }

    req.usuario = usuario;
    return next();
  };
}

const autenticar = criar({ exigirSenhaAtualizada: true }); // rotas normais
const autenticarPermitindoTroca = criar({ exigirSenhaAtualizada: false }); // /me e /trocar-senha

module.exports = autenticar; // require('./auth') continua funcionando como middleware
module.exports.autenticar = autenticar;
module.exports.autenticarPermitindoTroca = autenticarPermitindoTroca;