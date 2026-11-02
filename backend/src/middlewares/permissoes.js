'use strict';

const db = require('../db/database');
const { ErroApi } = require('./erros');

/**
 * Middleware para verificar se o usuário tem a permissão necessária.
 * Uso na rota: router.post('/', auth, permissoes('registrar_falta'), controller.criar);
 */
module.exports = (chavePermissao) => {
  return (req, res, next) => {
    try {
      const usuario = req.usuario;

      if (!usuario) {
        throw ErroApi.naoAutenticado('Usuário não autenticado.');
      }

      // Master tem tudo por padrão
      if (usuario.master) {
        return next();
      }

      // Verifica a permissão na tabela perfil_permissoes
      const permissao = db.prepare(`
        SELECT permitido FROM perfil_permissoes 
        WHERE perfil_id = ? AND chave = ?
      `).get(usuario.perfil_id, chavePermissao);

      if (!permissao || permissao.permitido !== 1) {
        throw ErroApi.semPermissao(`Você não tem permissão para: ${chavePermissao}`);
      }

      next();
    } catch (erro) {
      next(erro);
    }
  };
};