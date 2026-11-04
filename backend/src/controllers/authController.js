'use strict';

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { config } = require('../config/env');
const { ErroApi } = require('../middlewares/erros');
const { cpfValido, somenteDigitos, validarSenha } = require('../utils/validadores');
const Log = require('../models/Log');

const CUSTO_BCRYPT = 12;
const MAX_BYTES_SENHA = 72; // limite do bcrypt

// Hash "falso", usado quando o usuário não existe: o tempo de resposta fica igual
// ao de uma senha errada e não dá para descobrir quais CPFs existem.
const HASH_FALSO = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), CUSTO_BCRYPT);

const OPCOES_COOKIE = { httpOnly: true, secure: config.cookieSeguro, sameSite: 'strict', path: '/' };

function corpoDe(req) {
  return req.body && typeof req.body === 'object' ? req.body : {};
}

function resumoUsuario(u) {
  return {
    id: u.id,
    nome: u.nome,
    perfil: u.perfil_nome,
    master: u.master === 1,
    deve_trocar_senha: u.deve_trocar_senha === 1,
  };
}

function buscarParaLogin({ login, cpf }) {
  const base = `SELECT u.id, u.nome, u.senha_hash, u.perfil_id, u.master, u.ativo, u.deve_trocar_senha,
                       p.nome AS perfil_nome
                FROM usuarios u JOIN perfis p ON p.id = u.perfil_id`;
  if (login) return db.prepare(`${base} WHERE u.login = ? COLLATE NOCASE`).get(login);
  return db.prepare(`${base} WHERE u.cpf = ?`).get(cpf);
}

/** O Master só precisa cumprir tamanho mínimo e máximo (regra herdada da demo). */
/** Mensagens da senha NOVA ("A senha deve..." vira "A nova senha deve..."). O Master só precisa cumprir tamanho mínimo e máximo. */
function problemasDaSenha(senha, master) {
  const todos = validarSenha(senha);
  const aplicaveis = master ? todos.filter((m) => /mínimo|máximo/.test(m)) : todos;
  return aplicaveis.map((m) => m.replace(/^A senha/, 'A nova senha'));
}

// POST /api/auth/login   { cpf } ou { login }  +  { senha }
async function login(req, res) {
  const { cpf, login: loginInformado, senha } = corpoDe(req);
  const MSG_FALTA_DADO = 'Informe o CPF (ou login) e a senha.';

  if (typeof senha !== 'string' || senha === '') throw ErroApi.requisicaoInvalida(MSG_FALTA_DADO);

  let usuario;
  let identificacao; // vai para o log (o CPF sai mascarado)
  if (typeof loginInformado === 'string' && loginInformado.trim() !== '') {
    identificacao = { tipo: 'login', login: loginInformado.trim() };
    usuario = buscarParaLogin({ login: identificacao.login });
  } else if (typeof cpf === 'string' || typeof cpf === 'number') {
    const digitos = somenteDigitos(cpf);
    if (!cpfValido(digitos)) throw ErroApi.requisicaoInvalida('Informe um CPF válido.');
    identificacao = { tipo: 'cpf', cpf: digitos };
    usuario = buscarParaLogin({ cpf: digitos });
  } else {
    throw ErroApi.requisicaoInvalida(MSG_FALTA_DADO);
  }

  const tamanhoOk = Buffer.byteLength(senha, 'utf8') <= MAX_BYTES_SENHA;
  const confere = tamanhoOk && (await bcrypt.compare(senha, usuario ? usuario.senha_hash : HASH_FALSO));

  if (!usuario || !usuario.ativo || !confere) {
    let motivo = 'senha incorreta';
    if (!usuario) motivo = 'usuário não encontrado';
    else if (!usuario.ativo) motivo = 'usuário inativo';
    Log.registrar({
      usuario,
      acao: 'LOGIN_FALHA',
      modulo: 'Autenticação',
      detalhes: { ...identificacao, motivo },
      ip: Log.ipDe(req),
    });
    throw new ErroApi(401, 'CREDENCIAIS_INVALIDAS', 'CPF/login ou senha inválidos.');
  }

  db.prepare("UPDATE usuarios SET ultimo_login = datetime('now') WHERE id = ?").run(usuario.id);

  const token = jwt.sign({ id: usuario.id }, config.jwt.segredo, {
    expiresIn: Math.floor(config.jwt.expiraMs / 1000), // em segundos
  });
  res.cookie('token', token, { ...OPCOES_COOKIE, maxAge: config.jwt.expiraMs });

  Log.registrar({ usuario, acao: 'LOGIN', modulo: 'Autenticação', ip: Log.ipDe(req) });
  res.json({ usuario: resumoUsuario(usuario) });
}

// POST /api/auth/logout
function logout(req, res) {
  res.clearCookie('token', OPCOES_COOKIE);
  res.json({ mensagem: 'Sessão encerrada.' });
}

// GET /api/auth/me  (o frontend usa para saber quem está logado e o que pode fazer)
function eu(req, res) {
  const u = req.usuario;
  const linhas = db.prepare('SELECT chave, permitido FROM perfil_permissoes WHERE perfil_id = ?').all(u.perfil_id);
  const permissoes = Object.fromEntries(linhas.map((l) => [l.chave, u.master === 1 ? true : l.permitido === 1]));
  res.json({ usuario: { ...resumoUsuario(u), permissoes } });
}

// POST /api/auth/trocar-senha   { senhaAtual, novaSenha }
async function trocarSenha(req, res) {
  const { senhaAtual, novaSenha } = corpoDe(req);

  if (typeof senhaAtual !== 'string' || senhaAtual === '') {
    throw ErroApi.requisicaoInvalida('Informe a senha atual.');
  }
  if (typeof novaSenha !== 'string' || novaSenha === '') {
    throw ErroApi.requisicaoInvalida('Informe a nova senha.');
  }
  const problemas = problemasDaSenha(novaSenha, req.usuario.master === 1);
  if (problemas.length > 0) throw ErroApi.requisicaoInvalida(problemas[0], problemas);

  const atual = db.prepare('SELECT senha_hash FROM usuarios WHERE id = ?').get(req.usuario.id);
  const atualConfere =
    Buffer.byteLength(senhaAtual, 'utf8') <= MAX_BYTES_SENHA && (await bcrypt.compare(senhaAtual, atual.senha_hash));
  if (!atualConfere) {
    Log.registrar({
      usuario: req.usuario,
      acao: 'TROCA_SENHA_FALHA',
      modulo: 'Autenticação',
      detalhes: 'senha atual incorreta',
      ip: Log.ipDe(req),
    });
    throw ErroApi.requisicaoInvalida('A senha atual está incorreta.');
  }
  if (await bcrypt.compare(novaSenha, atual.senha_hash)) {
    throw ErroApi.requisicaoInvalida('A nova senha deve ser diferente da atual.');
  }

  const novoHash = await bcrypt.hash(novaSenha, CUSTO_BCRYPT);
  db.prepare('UPDATE usuarios SET senha_hash = ?, deve_trocar_senha = 0 WHERE id = ?').run(novoHash, req.usuario.id);

  Log.registrar({ usuario: req.usuario, acao: 'TROCA_SENHA', modulo: 'Autenticação', ip: Log.ipDe(req) });
  res.json({ mensagem: 'Senha alterada com sucesso.' });
}

module.exports = { login, logout, eu, trocarSenha };