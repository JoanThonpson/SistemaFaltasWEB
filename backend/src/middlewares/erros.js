'use strict';

/**
 * Tratamento padronizado de erros da API.
 *
 * Nos controllers:   throw ErroApi.conflito('Não é possível excluir: o docente possui faltas lançadas.');
 * Formato da resposta: { erro: { codigo, mensagem, detalhes? } }
 */

const crypto = require('node:crypto');
const { config } = require('../config/env');
const log = require('../utils/logger').criar('erros');

class ErroApi extends Error {
  constructor(status, codigo, mensagem, detalhes) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }

  static requisicaoInvalida(mensagem = 'Dados inválidos.', detalhes) {
    return new ErroApi(400, 'REQUISICAO_INVALIDA', mensagem, detalhes);
  }

  static naoAutenticado(mensagem = 'Sessão expirada ou usuário não autenticado.') {
    return new ErroApi(401, 'NAO_AUTENTICADO', mensagem);
  }

  static semPermissao(mensagem = 'Você não tem permissão para esta ação.') {
    return new ErroApi(403, 'SEM_PERMISSAO', mensagem);
  }

  static naoEncontrado(mensagem = 'Registro não encontrado.') {
    return new ErroApi(404, 'NAO_ENCONTRADO', mensagem);
  }

  /** Regras de negócio (ex.: não excluir registro em uso) e duplicidade. */
  static conflito(mensagem, detalhes) {
    return new ErroApi(409, 'CONFLITO', mensagem, detalhes);
  }

  /** Ex.: backup durante sincronização (e vice-versa). */
  static operacaoEmAndamento(mensagem) {
    return new ErroApi(409, 'OPERACAO_EM_ANDAMENTO', mensagem);
  }
}

// ---------- tradução de erros conhecidos ----------

const MENSAGENS_UNICO = {
  'usuarios.cpf': 'Já existe um usuário com este CPF.',
  'usuarios.login': 'Já existe um usuário com este login.',
  'perfis.nome': 'Já existe um perfil com este nome.',
  'disciplinas.nome_norm': 'Já existe uma disciplina com este nome.',
  'cursos.nome_norm': 'Já existe um curso com este nome.',
  'justificativas.nome_norm': 'Já existe uma justificativa com este nome.',
  'docentes.cod_prof': 'Já existe um docente com este CODPROF.',
};

/** Erros de restrição do SQLite (rede de segurança: os controllers devem checar antes). */
function traduzirErroBanco(erro) {
  const codigo = typeof erro.code === 'string' ? erro.code : '';
  if (!codigo.startsWith('SQLITE_CONSTRAINT')) return null;

  if (codigo === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return ErroApi.conflito(
      'Não é possível concluir: o registro está em uso ou depende de outros dados (ex.: possui lançamentos ou vínculos).'
    );
  }
  if (codigo === 'SQLITE_CONSTRAINT_UNIQUE' || codigo === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
    const achado = /(?:UNIQUE|PRIMARY KEY) constraint failed: ([\w.]+)/i.exec(erro.message || '');
    return ErroApi.conflito(MENSAGENS_UNICO[achado?.[1]] ?? 'Já existe um registro com estes dados.');
  }
  return ErroApi.requisicaoInvalida('Dados inválidos para esta operação.'); // CHECK, NOT NULL...
}

/** Erros do leitor de JSON do Express. */
function traduzirErroHttp(erro) {
  if (erro.type === 'entity.parse.failed') {
    return ErroApi.requisicaoInvalida('O corpo da requisição não é um JSON válido.');
  }
  if (erro.type === 'entity.too.large') {
    return new ErroApi(413, 'CORPO_GRANDE_DEMAIS', 'Os dados enviados são grandes demais.');
  }
  return null;
}

// ---------- middlewares ----------

/** Última rota: nada respondeu. /api/* devolve JSON; o resto, texto simples. */
function rotaNaoEncontrada(req, res, next) {
  if (req.path.startsWith('/api')) return next(ErroApi.naoEncontrado('Rota não encontrada.'));
  return res.status(404).type('text/plain; charset=utf-8').send('Página não encontrada.');
}

/** Middleware de erro do Express (precisa ter 4 parâmetros). */
// eslint-disable-next-line no-unused-vars
function tratarErros(erro, req, res, next) {
  if (res.headersSent) return next(erro);

  const e = erro && typeof erro === 'object' ? erro : new Error(String(erro));
  const tratado = e instanceof ErroApi ? e : (traduzirErroBanco(e) ?? traduzirErroHttp(e));

  if (tratado) {
    log.debug('Requisição recusada', {
      status: tratado.status,
      codigo: tratado.codigo,
      metodo: req.method,
      rota: req.path,
    });
    const corpo = { erro: { codigo: tratado.codigo, mensagem: tratado.message } };
    if (tratado.detalhes !== undefined) corpo.erro.detalhes = tratado.detalhes;
    return res.status(tratado.status).json(corpo);
  }

  // Erro inesperado: registra tudo no log, mas não revela nada ao usuário.
  const referencia = crypto.randomBytes(4).toString('hex');
  log.erro('Erro não tratado', e, {
    referencia,
    metodo: req.method,
    rota: req.path,
    usuarioId: req.usuario?.id,
  });
  const corpo = {
    erro: {
      codigo: 'ERRO_INTERNO',
      mensagem: 'Erro interno do servidor. Se persistir, informe o administrador com a referência.',
      referencia,
    },
  };
  if (!config.producao) corpo.erro.detalhe = e.message;
  return res.status(500).json(corpo);
}

module.exports = { ErroApi, rotaNaoEncontrada, tratarErros };