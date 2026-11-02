'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { limparNome, normalizar, mesmoNome } = require('../src/utils/normalizar');

test('limparNome: remove espaços repetidos, nas pontas e caracteres invisíveis', () => {
  assert.equal(limparNome('  BIOLOGIA   CELULAR \u00A0E MOLECULAR '), 'BIOLOGIA CELULAR E MOLECULAR');
  assert.equal(limparNome('A\u200BB'), 'AB');
  assert.equal(limparNome(null), '');
  assert.equal(limparNome(undefined), '');
});

test('normalizar: tira acentos, cedilha e converte para maiúsculas', () => {
  assert.equal(normalizar('Cálculo I'), 'CALCULO I');
  assert.equal(normalizar('Educação Inclusiva'), 'EDUCACAO INCLUSIVA');
  assert.equal(normalizar('INTRODUÇÃO À ESTATÍSTICA'), 'INTRODUCAO A ESTATISTICA');
});

test('normalizar: padroniza travessões, hífens e aspas', () => {
  assert.equal(
    normalizar('PRÁTICA EXTENSIONISTA III – FAMÍLIA, CRIANÇA'),
    'PRATICA EXTENSIONISTA III-FAMILIA, CRIANCA'
  );
  assert.equal(
    normalizar('FUNDAMENTOS SÓCIO -ANTROPOLÓGICOS APLICADOS AO DIREITO'),
    'FUNDAMENTOS SOCIO-ANTROPOLOGICOS APLICADOS AO DIREITO'
  );
  assert.equal(normalizar('Cálculo d\u2019Água'), "CALCULO D'AGUA");
});

test('mesmoNome: reconhece nomes equivalentes', () => {
  assert.equal(mesmoNome('Cálculo I', 'CALCULO   I'), true);
  assert.equal(mesmoNome('DIREITO CIVIL VI – FAMÍLIA', 'DIREITO CIVIL VI - FAMILIA'), true);
  assert.equal(mesmoNome('LIBRAS ', 'libras'), true);
});

test('mesmoNome: não confunde nomes diferentes', () => {
  assert.equal(mesmoNome('DIREITO PENAL I', 'DIREITO PENAL II'), false);
  assert.equal(mesmoNome('DIREITO CIVIL I – PARTE GERAL', 'DIREITO CIVIL II – OBRIGAÇÕES'), false);
  assert.equal(mesmoNome('LEITURA E PRODUÇÃO DE TEXTO', 'LEITURA E PRODUÇÃO DE TEXTO EM LÍNGUA PORTUGUESA'), false);
});

test('normalizar: vazio, números e idempotência', () => {
  assert.equal(normalizar('   '), '');
  assert.equal(normalizar(null), '');
  assert.equal(normalizar(123), '123');
  assert.equal(mesmoNome('', ''), false); // nome vazio nunca é "igual"
  const nome = 'Prática – Família';
  assert.equal(normalizar(normalizar(nome)), normalizar(nome));
});