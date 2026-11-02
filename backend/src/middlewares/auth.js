'use strict';

const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { config } = require('../config/env');
const { ErroApi } = require('./erros');

module.exports = (req, res, next) => {
  try {
    // Pega o token do cookie
    const token = req.cookies.token;

    if (!token) {
      throw ErroApi.naoAutenticado('Token não fornecido. Faça login novamente.');
    }

    // Decodifica o token
    const decoded = jwt.verify(token, config.jwt.segredo);

    // Busca o usuário no banco para garantir que ele ainda existe e está ativo
    const usuario = db.prepare('SELECT id, nome, perfil_id, master, ativo, deve_trocar_senha FROM usuarios WHERE id = ? AND ativo = 1').get(decoded.id);

    if (!usuario) {
      throw ErroApi.naoAutenticado('Usuário não encontrado ou inativo.');
    }

    // Injeta o usuário na requisição para as próximas rotas usarem
    req.usuario = usuario;
    next();
  } catch (erro) {
    if (erro.name === 'TokenExpiredError') {
      return next(ErroApi.naoAutenticado('Sessão expirada. Faça login novamente.'));
    }
    if (erro.name === 'JsonWebTokenError') {
      return next(ErroApi.naoAutenticado('Token inválido.'));
    }
    next(erro);
  }
};