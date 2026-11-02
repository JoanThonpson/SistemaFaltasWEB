'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { config } = require('../config/env');
const { ErroApi } = require('../middlewares/erros');
const log = require('../utils/logger').criar('auth');

exports.login = async (req, res, next) => {
  try {
    const { cpf, senha, login } = req.body;

    if ((!cpf && !login) || !senha) {
      throw ErroApi.requisicaoInvalida('Informe o CPF/login e a senha.');
    }

    let usuario;

    // Busca por login (admin) ou CPF (limpando formatação)
    if (login) {
      usuario = db.prepare('SELECT * FROM usuarios WHERE login = ? AND ativo = 1').get(login);
    } else {
      const cpfLimpo = cpf.replace(/\D/g, '');
      usuario = db.prepare('SELECT * FROM usuarios WHERE cpf = ? AND ativo = 1').get(cpfLimpo);
    }

    if (!usuario) {
      throw ErroApi.naoAutenticado('Credenciais inválidas.');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      throw ErroApi.naoAutenticado('Credenciais inválidas.');
    }

    // Gera o token JWT
    const token = jwt.sign(
      { id: usuario.id, perfil_id: usuario.perfil_id, master: usuario.master },
      config.jwt.segredo,
      { expiresIn: config.jwt.expiraEm }
    );

    // Define o cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: config.cookieSeguro,
      sameSite: 'Strict',
      maxAge: config.jwt.expiraMs
    });

    // Registra o log de login
    db.prepare(`
      INSERT INTO logs (usuario_id, usuario_nome, perfil_nome, acao, modulo)
      VALUES (?, ?, ?, 'LOGIN', 'Autenticação')
    `).run(
      usuario.id, 
      usuario.nome, 
      usuario.master ? 'Master' : 'Usuário'
    );

    res.json({
      mensagem: 'Login realizado com sucesso.',
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        master: usuario.master,
        deve_trocar_senha: usuario.deve_trocar_senha
      }
    });

  } catch (erro) {
    next(erro);
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ mensagem: 'Logout realizado com sucesso.' });
};