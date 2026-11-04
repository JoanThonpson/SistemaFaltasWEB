'use strict';

/**
 * Servidor principal: API + arquivos do frontend.
 *   npm start      -> produção/Docker
 *   npm run dev    -> reinicia sozinho ao salvar
 */

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const { config, resumo } = require('./config/env');
const log = require('./utils/logger').criar('server');
const db = require('./db/database');
const seed = require('./db/seed');
const { rotaNaoEncontrada, tratarErros } = require('./middlewares/erros');

const PASTA_FRONTEND = path.resolve(config.pastaBackend, '..', 'frontend');
const CDNS = ['https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'];

const app = express();

// ---------- segurança ----------
// TEMPORÁRIO (até a Sprint 4): o frontend atual usa CDNs e scripts/estilos dentro do HTML.
// Quando as bibliotecas forem servidas localmente e os onclick forem removidos,
// tirar os CDNs e o 'unsafe-inline' daqui.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false, // sem upgrade-insecure-requests (a intranet roda em HTTP)
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", ...CDNS],
        'script-src-attr': ["'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'", ...CDNS],
        'font-src': ["'self'", 'https://cdnjs.cloudflare.com', 'data:'],
        'img-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
      },
    },
    strictTransportSecurity: config.cookieSeguro, // HSTS só quando houver HTTPS
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Respostas da API nunca ficam em cache do navegador.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// ---------- rotas ----------
app.get('/api/saude', (req, res) => {
  const banco = db.prepare('SELECT 1 AS ok').get().ok === 1;
  res.json({ status: 'ok', banco: banco ? 'ok' : 'falha', horario: new Date().toISOString() });
});

// As rotas do sistema entram aqui (autenticação na Sprint 2, CRUDs na Sprint 3):
app.use('/api/auth', require('./routes/auth'));

//--------------------  teste protegido (apenas para demonstração) --------------------
//app.get('/api/teste-protegido', require('./middlewares/auth'), (req, res) => {
//  res.json({ mensagem: 'Acesso liberado!', usuario: req.usuario.nome });
//});

// ---------- frontend ----------
if (fs.existsSync(PASTA_FRONTEND)) {
  app.get('/', (req, res) => res.redirect('/login.html'));
  app.use(express.static(PASTA_FRONTEND));
} else {
  log.aviso('Pasta do frontend não encontrada; só a API será servida.', { pasta: PASTA_FRONTEND });
}

// ---------- erros (sempre por último) ----------
app.use(rotaNaoEncontrada);
app.use(tratarErros);

// ---------- inicialização ----------
/** Cria as tabelas e os dados iniciais se faltarem. Os dois passos são repetíveis. */
function prepararBanco() {
  db.exec(fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8'));
  const { senhaTemporaria } = seed.executar();
  if (senhaTemporaria) {
    console.log('\n=============================================================');
    console.log(' Acesso Técnico criado');
    console.log('   Login: admin');
    console.log(`   Senha temporária: ${senhaTemporaria}`);
    console.log(' Anote agora: ela NÃO será mostrada de novo.');
    console.log('=============================================================\n');
  }
}

function iniciar() {
  prepararBanco();

  const servidor = app.listen(config.porta, () => {
    log.info('Servidor iniciado', { ...resumo(), endereco: `http://localhost:${config.porta}` });
  });

  servidor.on('error', (erro) => {
    if (erro.code === 'EADDRINUSE') {
      log.erro(`A porta ${config.porta} já está em uso. Feche o outro processo ou mude PORT no .env.`);
    } else {
      log.erro('Falha ao iniciar o servidor', erro);
    }
    process.exit(1);
  });

  const encerrar = (sinal) => {
    log.info(`Recebido ${sinal}, encerrando...`);
    servidor.close(() => {
      db.close(); // fecha o SQLite limpando o arquivo WAL
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref(); // não fica preso se algo não terminar
  };
  process.on('SIGINT', () => encerrar('SIGINT'));
  process.on('SIGTERM', () => encerrar('SIGTERM')); // sinal do Docker
}

process.on('uncaughtException', (erro) => {
  log.erro('Exceção não capturada', erro);
  process.exit(1);
});
process.on('unhandledRejection', (motivo) => {
  log.erro('Promessa rejeitada sem tratamento', motivo instanceof Error ? motivo : { motivo: String(motivo) });
  process.exit(1);
});

if (require.main === module) iniciar();

module.exports = { app };