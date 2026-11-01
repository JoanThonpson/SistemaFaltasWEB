'use strict';

const fs = require('fs');
const path = require('path');
const db = require('./database');

const caminhoSchema = path.join(__dirname, 'schema.sql');
const sql = fs.readFileSync(caminhoSchema, 'utf8');

try {
  db.exec(sql);
  console.log('✅ Tabelas criadas com sucesso!');
} catch (erro) {
  console.error('❌ Erro ao criar tabelas:', erro.message);
}