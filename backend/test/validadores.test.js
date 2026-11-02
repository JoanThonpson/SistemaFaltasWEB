'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { somenteDigitos, cpfValido, formatarCpf, validarSenha } = require('../src/utils/validadores');

const MSG = {
  obrigatoria: 'A senha é obrigatória.',
  minimo: 'A senha deve conter no mínimo 8 caracteres.',
  minuscula: 'A senha deve conter pelo menos uma letra minúscula.',
  numero: 'A senha deve conter pelo menos um número.',
  especial: 'A senha deve conter pelo menos um caractere especial.',
  maximo: 'A senha deve ter no máximo 72 caracteres.',
};

test('somenteDigitos: mantém só os números', () => {
  assert.equal(somenteDigitos('529.982.247-25'), '52998224725');
  assert.equal(somenteDigitos('a1b2'), '12');
  assert.equal(somenteDigitos(123), '123');
  assert.equal(somenteDigitos(null), '');
});

test('cpfValido: aceita CPFs válidos, com ou sem máscara', () => {
  assert.equal(cpfValido('529.982.247-25'), true);
  assert.equal(cpfValido('52998224725'), true);
  assert.equal(cpfValido(' 529.982.247-25 '), true);
  assert.equal(cpfValido('123.456.789-09'), true); // dígito verificador 0
  assert.equal(cpfValido(12345678909), true);
});

test('cpfValido: rejeita dígito errado, repetidos, tamanho errado e vazios', () => {
  assert.equal(cpfValido('52998224726'), false);
  assert.equal(cpfValido('529.982.247-35'), false);
  assert.equal(cpfValido('111.111.111-11'), false);
  assert.equal(cpfValido('00000000000'), false);
  assert.equal(cpfValido('1234567890'), false); // 10 dígitos
  assert.equal(cpfValido('529982247250'), false); // 12 dígitos
  assert.equal(cpfValido('abc'), false);
  assert.equal(cpfValido(''), false);
  assert.equal(cpfValido(null), false);
  assert.equal(cpfValido(undefined), false);
});

test('formatarCpf: aplica a máscara só quando há 11 dígitos', () => {
  assert.equal(formatarCpf('52998224725'), '529.982.247-25');
  assert.equal(formatarCpf('529.982.247-25'), '529.982.247-25');
  assert.equal(formatarCpf(12345678909), '123.456.789-09');
  assert.equal(formatarCpf('123'), '123');
  assert.equal(formatarCpf(null), '');
});

test('validarSenha: aceita senhas que cumprem todas as regras', () => {
  assert.deepEqual(validarSenha('Senha@2026'), []);
  assert.deepEqual(validarSenha('abc#1234'), []); // exatamente 8
  assert.deepEqual(validarSenha('ação#2026'), []);
});

test('validarSenha: aponta exatamente a regra que falta', () => {
  assert.deepEqual(validarSenha('abc'), [MSG.minimo, MSG.numero, MSG.especial]);
  assert.deepEqual(validarSenha('ABCDEFG#1'), [MSG.minuscula]);
  assert.deepEqual(validarSenha('abcdefgh1'), [MSG.especial]);
  assert.deepEqual(validarSenha('abcdefg#'), [MSG.numero]);
  assert.deepEqual(validarSenha('Abc 1234'), [MSG.especial]); // espaço não é especial
});

test('validarSenha: vazio ou não texto é obrigatório', () => {
  assert.deepEqual(validarSenha(''), [MSG.obrigatoria]);
  assert.deepEqual(validarSenha(null), [MSG.obrigatoria]);
  assert.deepEqual(validarSenha(123), [MSG.obrigatoria]);
});

test('validarSenha: limite de 72 bytes (bcrypt)', () => {
  assert.deepEqual(validarSenha(`a1#${'x'.repeat(69)}`), []); // 72 bytes
  assert.deepEqual(validarSenha(`a1#${'x'.repeat(70)}`), [MSG.maximo]); // 73 bytes
  assert.deepEqual(validarSenha(`a1#${'ç'.repeat(35)}`), [MSG.maximo]); // 38 caracteres, 73 bytes
});