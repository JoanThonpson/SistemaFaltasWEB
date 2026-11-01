'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { config } = require('../config/env');

// Pega o caminho correto do objeto de configuração
const caminhoBanco = config.banco.caminho;
const pastaData = path.dirname(caminhoBanco);

// Garante que a pasta 'data' exista para não dar erro ao criar o arquivo
if (!fs.existsSync(pastaData)) {
  fs.mkdirSync(pastaData, { recursive: true });
}

// Abre (ou cria) o banco de dados
const db = new Database(caminhoBanco);

// Regras essenciais que definimos no Trello: chaves estrangeiras e WAL
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

module.exports = db;