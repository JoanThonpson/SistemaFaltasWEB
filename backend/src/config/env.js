'use strict';

/**
 * Configuração central do backend.
 * Lê o .env UMA vez, valida tudo e expõe um objeto imutável.
 * Se algo essencial estiver errado, o servidor nem sobe (e diz o motivo).
 */

const path = require('node:path');
const cron = require('node-cron');

const PASTA_BACKEND = path.join(__dirname, '..', '..');

// Variáveis já definidas no ambiente (ex.: Docker) têm prioridade sobre o .env.
require('dotenv').config({ path: path.join(PASTA_BACKEND, '.env'), quiet: true });

// ---------- auxiliares de leitura ----------

function texto(nome, padrao = '') {
  const valor = process.env[nome];
  return valor === undefined || valor.trim() === '' ? padrao : valor.trim();
}

function inteiro(nome, padrao, { min = -Infinity, max = Infinity } = {}) {
  const bruto = texto(nome, String(padrao));
  const numero = Number(bruto);
  if (!Number.isInteger(numero) || numero < min || numero > max) {
    throw new Error(`Variável ${nome} inválida: "${bruto}" (esperado inteiro entre ${min} e ${max}).`);
  }
  return numero;
}

function booleano(nome, padrao) {
  return ['true', '1', 'sim', 'yes'].includes(texto(nome, String(padrao)).toLowerCase());
}

/** Converte "8h", "30m", "7d", "45s" ou "3600" (segundos) em milissegundos. */
function duracaoEmMs(nome, valor) {
  const m = /^(\d+)\s*([smhd]?)$/i.exec(valor);
  if (!m) {
    throw new Error(`Variável ${nome} inválida: "${valor}" (exemplos: 30m, 8h, 7d).`);
  }
  const unidades = { '': 1000, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(m[1]) * unidades[m[2].toLowerCase()];
}

// ---------- leitura e validação ----------

const nodeEnv = texto('NODE_ENV', 'development');

const SEGREDO_EXEMPLO = 'troque-por-um-segredo-longo-e-aleatorio';
const jwtSecret = texto('JWT_SECRET');
if (jwtSecret.length < 32 || jwtSecret === SEGREDO_EXEMPLO) {
  throw new Error(
    'JWT_SECRET ausente, com menos de 32 caracteres ou ainda com o valor de exemplo.\n' +
      'Gere um com: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  );
}

const jwtExpiresIn = texto('JWT_EXPIRES_IN', '8h');
const jwtExpiraMs = duracaoEmMs('JWT_EXPIRES_IN', jwtExpiresIn);

const syncCron = texto('SYNC_CRON', '0 */2 * * *');
if (!cron.validate(syncCron)) {
  throw new Error(`SYNC_CRON inválido: "${syncCron}" (exemplo: 0 */2 * * *).`);
}

const anoInicial = texto('SYNC_ANO_INICIAL', '2026');
if (!/^\d{4}$/.test(anoInicial)) {
  throw new Error(`SYNC_ANO_INICIAL inválido: "${anoInicial}" (esperado 4 dígitos, ex.: 2026).`);
}

const caminhoBanco = path.resolve(PASTA_BACKEND, texto('DB_PATH', './data/sistema.db'));

const rm = {
  host: texto('RM_HOST'),
  port: inteiro('RM_PORT', 1433, { min: 1, max: 65535 }),
  database: texto('RM_DATABASE'),
  user: texto('RM_USER'),
  password: texto('RM_PASSWORD'),
  timeoutMs: inteiro('RM_TIMEOUT_MS', 15000, { min: 1000 }),
  encrypt: booleano('RM_ENCRYPT', false),
  trustServerCertificate: booleano('RM_TRUST_CERT', true),
};
// O RM só é exigido na hora de sincronizar; sem credenciais o sistema funciona normalmente.
rm.configurado = Boolean(rm.host && rm.database && rm.user && rm.password);

const config = {
  ambiente: nodeEnv,
  producao: nodeEnv === 'production',
  porta: inteiro('PORT', 3000, { min: 1, max: 65535 }),
  fusoHorario: texto('TZ', 'America/Maceio'), // usado no agendamento e na exibição; o banco guarda UTC

  pastaBackend: PASTA_BACKEND,

  jwt: { segredo: jwtSecret, expiraEm: jwtExpiresIn, expiraMs: jwtExpiraMs },
  cookieSeguro: booleano('COOKIE_SECURE', false), // true exige HTTPS

  banco: {
    caminho: caminhoBanco,
    pastaBackups: path.join(path.dirname(caminhoBanco), 'backups'),
    retencaoBackups: inteiro('BACKUP_RETENCAO', 10, { min: 1 }),
  },

  rm,

  sync: {
    cron: syncCron,
    coligada: inteiro('SYNC_COLIGADA', 1, { min: 1 }),
    anoInicial,
  },
};

Object.freeze(config.jwt);
Object.freeze(config.banco);
Object.freeze(config.rm);
Object.freeze(config.sync);
Object.freeze(config);

/** Resumo SEM segredos, seguro para aparecer em logs. */
function resumo() {
  return {
    ambiente: config.ambiente,
    porta: config.porta,
    fusoHorario: config.fusoHorario,
    cookieSeguro: config.cookieSeguro,
    jwtExpiraEm: config.jwt.expiraEm,
    banco: config.banco.caminho,
    retencaoBackups: config.banco.retencaoBackups,
    rm: config.rm.configurado
      ? `${config.rm.host}:${config.rm.port}/${config.rm.database} (usuário ${config.rm.user})`
      : 'não configurado',
    sync: { ...config.sync },
  };
}

module.exports = { config, resumo };