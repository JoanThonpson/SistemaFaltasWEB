'use strict';

/**
 * Seed inicial (idempotente): perfis, permissões e usuário Master.
 * Pode rodar quantas vezes quiser: só cria o que não existe e NÃO sobrescreve
 * permissões que um administrador já alterou na tela.
 *
 *   node src/db/seed.js                  -> cria o que faltar
 *   node src/db/seed.js --resetar-master -> gera nova senha temporária do usuário "admin"
 */

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const db = require('./database');
const log = require('../utils/logger').criar('seed');

// sigla: usada na matriz abaixo
const PERFIS = [
  { sigla: 'M', nome: 'Master',        descricao: 'Acesso total (oculto e não editável)',        editavel: 0, oculto: 1 },
  { sigla: 'A', nome: 'Administrador', descricao: 'Acesso total',                                editavel: 1, oculto: 0 },
  { sigla: 'G', nome: 'Gestor',        descricao: 'Gestão de faltas, docentes e configurações',  editavel: 1, oculto: 0 },
  { sigla: 'O', nome: 'Operador',      descricao: 'Registra faltas e consulta dados',            editavel: 1, oculto: 0 },
  { sigla: 'S', nome: 'Supervisor',    descricao: 'Consulta e relatórios',                       editavel: 1, oculto: 0 },
];

// Matriz de permissões (23). As letras indicam quais perfis TÊM a permissão:
// M=Master A=Administrador G=Gestor O=Operador S=Supervisor
const MATRIZ = [
  // Controle de faltas
  ['ver_faltas',               'MAGOS'],
  ['registrar_falta',          'MAGO'],
  ['editar_falta',             'MAG'],
  ['excluir_falta',            'MAG'],
  // Dados do docente
  ['ver_docentes',             'MAGOS'],
  ['cadastrar_docente',        'MAG'],
  ['editar_docente',           'MAGO'],
  ['excluir_docente',          'MAG'],
  ['cadastrar_aula',           'MA'],
  // Justificativas
  ['ver_justificativas',       'MAGOS'],
  ['editar_justificativas',    'MAG'],
  // Relatórios e estatísticas
  ['ver_relatorios',           'MAGOS'],
  ['gerar_relatorio_pdf',      'MAGS'],
  // Configurações
  ['acessar_configuracoes',    'MAG'],
  ['gerenciar_disciplinas',    'MAG'],
  ['gerenciar_cursos',         'MAG'],
  ['gerenciar_justificativas', 'MAG'],
  ['gerenciar_usuarios',       'MAG'],
  ['editar_usuario',           'MAG'],
  ['resetar_senhas',           'MAG'],
  ['visualizar_logs',          'MAG'],
  ['gerenciar_perfis',         'MAG'],
  ['gerenciar_dados',          'MAG'],
];

function gerarSenhaTemporaria() {
  // Sem caracteres ambíguos (0/O, 1/l/I). Atende à regra: minúscula, número e especial, 16 caracteres.
  const grupos = ['abcdefghijkmnopqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', '!@#$%*?'];
  const todos = grupos.join('');
  const chars = grupos.map((g) => g[crypto.randomInt(g.length)]);
  while (chars.length < 16) chars.push(todos[crypto.randomInt(todos.length)]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function executar({ resetarMaster = false } = {}) {
  const tabela = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'perfis'")
    .get();
  if (!tabela) {
    throw new Error('Tabelas não encontradas. Rode antes: node src/db/run_schema.js');
  }

  const inserirPerfil = db.prepare(
    'INSERT OR IGNORE INTO perfis (nome, descricao, editavel, predefinido, oculto) VALUES (?, ?, ?, 1, ?)'
  );
  const buscarPerfil = db.prepare('SELECT id FROM perfis WHERE nome = ?');
  const travarMaster = db.prepare("UPDATE perfis SET editavel = 0, oculto = 1 WHERE nome = 'Master'");
  const inserirPermissao = db.prepare(
    'INSERT OR IGNORE INTO perfil_permissoes (perfil_id, chave, permitido) VALUES (?, ?, ?)'
  );
  const liberarTudoMaster = db.prepare('UPDATE perfil_permissoes SET permitido = 1 WHERE perfil_id = ?');
  const buscarAdmin = db.prepare("SELECT id FROM usuarios WHERE login = 'admin'");
  const inserirAdmin = db.prepare(
    `INSERT INTO usuarios (nome, login, senha_hash, perfil_id, master, ativo, deve_trocar_senha)
     VALUES ('Master', 'admin', ?, ?, 1, 1, 1)`
  );
  const redefinirSenha = db.prepare(
    'UPDATE usuarios SET senha_hash = ?, deve_trocar_senha = 1, ativo = 1 WHERE id = ?'
  );

  const resultado = { perfisNovos: 0, permissoesNovas: 0, senhaTemporaria: null };

  const aplicar = db.transaction(() => {
    for (const p of PERFIS) {
      resultado.perfisNovos += inserirPerfil.run(p.nome, p.descricao, p.editavel, p.oculto).changes;
    }
    travarMaster.run();

    const idPorSigla = {};
    for (const p of PERFIS) idPorSigla[p.sigla] = buscarPerfil.get(p.nome).id;

    // INSERT OR IGNORE: só cria o que falta; não desfaz ajustes feitos na tela.
    for (const [chave, siglas] of MATRIZ) {
      for (const p of PERFIS) {
        const permitido = siglas.includes(p.sigla) ? 1 : 0;
        resultado.permissoesNovas += inserirPermissao.run(idPorSigla[p.sigla], chave, permitido).changes;
      }
    }
    liberarTudoMaster.run(idPorSigla.M); // o Master sempre tem tudo

    const existente = buscarAdmin.get();
    if (!existente) {
      resultado.senhaTemporaria = gerarSenhaTemporaria();
      inserirAdmin.run(bcrypt.hashSync(resultado.senhaTemporaria, 12), idPorSigla.M);
    } else if (resetarMaster) {
      resultado.senhaTemporaria = gerarSenhaTemporaria();
      redefinirSenha.run(bcrypt.hashSync(resultado.senhaTemporaria, 12), existente.id);
    }
  });

  aplicar();
  return resultado;
}

if (require.main === module) {
  try {
    const resultado = executar({ resetarMaster: process.argv.includes('--resetar-master') });
    log.info('Seed concluído', {
      perfisNovos: resultado.perfisNovos,
      permissoesNovas: resultado.permissoesNovas,
    });
    if (resultado.senhaTemporaria) {
      console.log('\n=============================================================');
      console.log(' Acesso Técnico criado/redefinido');
      console.log('   Login: admin');
      console.log(`   Senha temporária: ${resultado.senhaTemporaria}`);
      console.log(' Anote agora: ela NÃO será mostrada de novo.');
      console.log(' A troca de senha será exigida no primeiro acesso.');
      console.log('=============================================================\n');
    }
  } catch (erro) {
    log.erro('Falha no seed', erro);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

module.exports = { executar };