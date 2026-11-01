PRAGMA foreign_keys = ON;   -- rodar em TODA conexão
PRAGMA journal_mode = WAL;  -- fica gravado no arquivo

-- ===== Cadastros =====
CREATE TABLE IF NOT EXISTS docentes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  cod_prof      INTEGER UNIQUE,                 -- CODPROF do RM; NULL = cadastro manual
  nome          TEXT NOT NULL,
  aulas         INTEGER NOT NULL DEFAULT 0,     -- carga horária: SEMPRE manual
  ativo         INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),  -- a sync nunca altera
  criado_em     TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS disciplinas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nome      TEXT NOT NULL,
  nome_norm TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS disciplina_codigos (   -- vários CODDISC do RM -> 1 disciplina
  cod_disc      TEXT PRIMARY KEY,
  disciplina_id INTEGER NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cursos (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nome      TEXT NOT NULL,
  nome_norm TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS curso_codigos (
  cod_curso TEXT PRIMARY KEY,
  curso_id  INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS docente_disciplinas (
  docente_id    INTEGER NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
  disciplina_id INTEGER NOT NULL REFERENCES disciplinas(id) ON DELETE RESTRICT,
  PRIMARY KEY (docente_id, disciplina_id)
);
CREATE TABLE IF NOT EXISTS docente_cursos (
  docente_id INTEGER NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
  curso_id   INTEGER NOT NULL REFERENCES cursos(id) ON DELETE RESTRICT,
  PRIMARY KEY (docente_id, curso_id)
);

CREATE TABLE IF NOT EXISTS justificativas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nome      TEXT NOT NULL,
  nome_norm TEXT NOT NULL UNIQUE
);

-- ===== Acesso =====
CREATE TABLE IF NOT EXISTS perfis (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT NOT NULL UNIQUE,
  descricao   TEXT,
  editavel    INTEGER NOT NULL DEFAULT 1 CHECK (editavel IN (0,1)),     -- Master = 0
  predefinido INTEGER NOT NULL DEFAULT 0 CHECK (predefinido IN (0,1)),
  oculto      INTEGER NOT NULL DEFAULT 0 CHECK (oculto IN (0,1)),       -- Master = 1
  criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS perfil_permissoes (   -- 23 chaves
  perfil_id INTEGER NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  chave     TEXT NOT NULL,                       -- ex.: 'ver_faltas'
  permitido INTEGER NOT NULL DEFAULT 0 CHECK (permitido IN (0,1)),
  PRIMARY KEY (perfil_id, chave)
);

CREATE TABLE IF NOT EXISTS usuarios (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  nome              TEXT NOT NULL,
  cpf               TEXT UNIQUE CHECK (cpf IS NULL OR length(cpf) = 11),  -- só dígitos
  login             TEXT UNIQUE,                  -- 'admin' (Acesso Técnico)
  senha_hash        TEXT NOT NULL,                -- bcrypt, nunca texto puro
  perfil_id         INTEGER NOT NULL REFERENCES perfis(id) ON DELETE RESTRICT,
  master            INTEGER NOT NULL DEFAULT 0 CHECK (master IN (0,1)),
  ativo             INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),
  deve_trocar_senha INTEGER NOT NULL DEFAULT 1 CHECK (deve_trocar_senha IN (0,1)),
  ultimo_login      TEXT,
  criado_em         TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (cpf IS NOT NULL OR login IS NOT NULL)
);

-- ===== Operação =====
CREATE TABLE IF NOT EXISTS faltas (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  docente_id       INTEGER NOT NULL REFERENCES docentes(id)      ON DELETE RESTRICT,
  disciplina_id    INTEGER NOT NULL REFERENCES disciplinas(id)   ON DELETE RESTRICT,
  curso_id         INTEGER NOT NULL REFERENCES cursos(id)        ON DELETE RESTRICT,
  quantidade       INTEGER NOT NULL CHECK (quantidade > 0),
  justificada      INTEGER NOT NULL DEFAULT 0 CHECK (justificada IN (0,1)),
  justificativa_id INTEGER REFERENCES justificativas(id)         ON DELETE RESTRICT,
  observacoes      TEXT,
  data             TEXT NOT NULL,                 -- 'AAAA-MM-DD'
  horario_inicio   TEXT,                          -- 'HH:MM'
  horario_fim      TEXT,
  registrado_por   INTEGER NOT NULL REFERENCES usuarios(id)      ON DELETE RESTRICT,
  criado_em        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id   INTEGER REFERENCES usuarios(id) ON DELETE RESTRICT,
  usuario_nome TEXT,                              -- cópia do momento da ação
  perfil_nome  TEXT,
  acao         TEXT NOT NULL,
  modulo       TEXT,
  detalhes     TEXT,
  ip           TEXT,
  criado_em    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== Sincronização e backup =====
CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES
  ('sync_coligada', '1'),
  ('sync_ano_inicial', '2026');

CREATE TABLE IF NOT EXISTS sync_execucoes (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  origem               TEXT NOT NULL CHECK (origem IN ('AUTOMATICA','MANUAL')),
  usuario_id           INTEGER REFERENCES usuarios(id) ON DELETE RESTRICT, -- NULL = automática
  iniciado_em          TEXT NOT NULL DEFAULT (datetime('now')),            -- UTC
  finalizado_em        TEXT,
  duracao_ms           INTEGER,
  status               TEXT NOT NULL DEFAULT 'EXECUTANDO'
                       CHECK (status IN ('EXECUTANDO','OK','ERRO')),
  linhas_lidas         INTEGER DEFAULT 0,
  docentes_novos       INTEGER DEFAULT 0,
  docentes_atualizados INTEGER DEFAULT 0,
  disciplinas_novas    INTEGER DEFAULT 0,
  cursos_novos         INTEGER DEFAULT 0,
  vinculos_novos       INTEGER DEFAULT 0,
  erro                 TEXT
);

CREATE TABLE IF NOT EXISTS backup_execucoes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  iniciado_em   TEXT NOT NULL DEFAULT (datetime('now')),
  finalizado_em TEXT,
  status        TEXT NOT NULL DEFAULT 'EXECUTANDO' CHECK (status IN ('EXECUTANDO','OK','ERRO')),
  arquivo       TEXT,
  tamanho_bytes INTEGER,
  erro          TEXT
);

-- ===== Índices =====
CREATE INDEX IF NOT EXISTS idx_faltas_docente ON faltas(docente_id);
CREATE INDEX IF NOT EXISTS idx_faltas_data    ON faltas(data);
CREATE INDEX IF NOT EXISTS idx_logs_criado    ON logs(criado_em);
CREATE INDEX IF NOT EXISTS idx_dd_disciplina  ON docente_disciplinas(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_dc_curso       ON docente_cursos(curso_id);
CREATE INDEX IF NOT EXISTS idx_sync_iniciado  ON sync_execucoes(iniciado_em);