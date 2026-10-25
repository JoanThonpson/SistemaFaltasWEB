Sistema em desenvolvimento para controle de faltas de docentes, com arquitetura separada entre frontend e backend.

Possui autenticação, controle de permissões por perfil de usuário (Master, Gestor, Operador e Supervisor) e organização de dados com SQLite.

A aplicação segue uma estrutura baseada em rotas, controllers, models e middlewares, simulando um ambiente real de sistemas corporativos.

Tecnologias: Node.js, Express, SQLite, JavaScript

------------------------------------ESTRUTURA---------------------------------------------

ControleDocenteFaltosos/ # Raiz (seu repositório GitHub)
│
├── index.html # FICA AQUI (GitHub Pages)
├── frontend/ # PASTA ATUAL (GitHub Pages)
│ ├── login.html
│ ├── sistema.html
│ ├── css/
│ │ ├── styles.css
│ │ ├── login.css
│ │ └── modais.css
│ ├── js/
│ │ ├── app.js
│ │ ├── login.js
│ │ └── utils/
│ │ └── storage.js
│ └── assets/
│
├── backend/ # NOVA PASTA (Node.js + Docker)
│ ├── Dockerfile # Configuração do container
│ ├── package.json # Dependências Node
│ ├── package-lock.json
│ ├── .env # Variáveis de ambiente
│ ├── src/
│ │ ├── server.js # Servidor Express (principal)
│ │ ├── routes/
│ │ │ ├── auth.js # Login/autenticação
│ │ │ ├── docentes.js # CRUD docentes
│ │ │ ├── faltas.js # CRUD faltas
│ │ │ ├── configuracoes.js # Disciplinas, cursos, etc
│ │ │ ├── usuarios.js # CRUD usuários
│ │ │ └── relatorios.js # Estatísticas
│ │ ├── controllers/
│ │ │ ├── authController.js
│ │ │ ├── docenteController.js
│ │ │ └── ... (separação da lógica)
│ │ ├── models/
│ │ │ ├── Database.js # Conexão SQLite
│ │ │ ├── Docente.js
│ │ │ ├── Falta.js
│ │ │ ├── Usuario.js
│ │ │ └── Perfil.js
│ │ ├── middlewares/
│ │ │ ├── auth.js # Verificação JWT
│ │ │ └── permissoes.js # Verificação de permissões
│ │ └── utils/
│ │ ├── validadores.js # CPF, etc
│ │ └── logger.js # Sistema de logs
│ └── data/
│ └── sistema.db # ARQUIVO SQLITE (criado automaticamente)
│
├── docker-compose.yml # Orquestração Docker
└── README.md # Documentação

---

🔐 Sistema de Permissões: (WORK PIO 3.2)

******\*\*\*\*******MASTER (não editável)- deve fazer tudo do sistema******\*\*\*\*******
📍 CONTROLE DE FALTAS
[✓] Visualizar faltas
[✓] Registrar nova falta
[✓] Editar falta
[✓] Excluir faltas

📍 DADOS DO DOCENTE  
[✓] Visualizar docentes
[✓] Cadastrar novo docente
[✓] Editar docente
[✓] Excluir docentes

📍 JUSTIFICATIVAS
[✓] Visualizar justificativas
[✓] Cadastrar/editar justificativas

📍 RELATÓRIOS E ESTATÍSTICAS
[✓] Visualizar relatórios
[✓] Gerar relatório PDF

📍 CONFIGURAÇÕES
[✓] Acessar configurações
├── [✓] Gerenciar disciplinas
├── [✓] Gerenciar cursos
├── [✓] Gerenciar justificativas
├── [✓] Gerenciar usuários
| ├── [✓] Editar usuário
| ├── [✓] Resetar senhas
| └── [✓] Visualizar logs de atividade
├── [✓] Gerenciar perfis
└── [✓] Visualizar logs

****\*\*\*****Gestor**********\***********
📍 CONTROLE DE FALTAS
[✓] Visualizar faltas
[✓] Registrar nova falta
[✓] Editar falta
[✓] Excluir faltas

📍 DADOS DO DOCENTE  
[✓] Visualizar docentes
[✓] Cadastrar novo docente
[✓] Editar docente
[✓] Excluir docentes

📍 JUSTIFICATIVAS
[✓] Visualizar justificativas
[✓] Cadastrar/editar justificativas

📍 RELATÓRIOS E ESTATÍSTICAS
[✓] Visualizar relatórios
[✓] Gerar relatório PDF

📍 CONFIGURAÇÕES
[✓] Acessar configurações
├── [✓] Gerenciar disciplinas
├── [✓] Gerenciar cursos
├── [✓] Gerenciar justificativas
├── [✓] Gerenciar usuários
| ├── [✓] Editar usuário
| ├── [✓] Resetar senhas
| └── [✓] Visualizar logs de atividade
├── [✓] Gerenciar perfis
└── [✓] Visualizar logs

**\*\*\*\***OPERADOR****\*****
📍 CONTROLE DE FALTAS
[✓] Visualizar faltas
[✓] Registrar nova falta
[✗] Editar falta
[✗] Excluir faltas

📍 DADOS DO DOCENTE  
[✓] Visualizar docentes
[✗] Cadastrar novo docente
[✓] Editar docente
[✗] Excluir docentes

📍 JUSTIFICATIVAS
[✓] Visualizar justificativas

📍 RELATÓRIOS E ESTATÍSTICAS
[✓] Visualizar relatórios
[✗] Gerar relatório PDF

📍 CONFIGURAÇÕES
[✗] Acessar configurações
├── [✗] Gerenciar disciplinas
├── [✗] Gerenciar cursos
├── [✗] Gerenciar justificativas
├── [✗] Gerenciar usuários
| ├── [✗] Editar usuário
| ├── [✗] Resetar senhas
| └── [✗] Visualizar logs de atividade
├── [✗] Gerenciar perfis
└── [✗] Visualizar logs

**\*\*\*\***SUPERVISOR****\*****
📍 CONTROLE DE FALTAS
[✓] Visualizar faltas
[✗] Registrar nova falta
[✗] Editar qualquer falta
[✗] Editar apenas próprias faltas
[✗] Excluir faltas

📍 DADOS DO DOCENTE  
[✓] Visualizar docentes
[✗] Cadastrar novo docente
[✗] Editar docente
[✗] Excluir docentes

📍 JUSTIFICATIVAS
[✓] Visualizar justificativas

📍 RELATÓRIOS E ESTATÍSTICAS
[✓] Visualizar relatórios
[✓] Gerar relatório PDF

📍 CONFIGURAÇÕES
[✗] Acessar configurações
├── [✗] Gerenciar disciplinas
├── [✗] Gerenciar cursos
├── [✗] Gerenciar justificativas
├── [✗] Gerenciar usuários
| ├── [✗] Editar usuário
| ├── [✗] Resetar senhas
| └── [✗] Visualizar logs de atividade
├── [✗] Gerenciar perfis
└── [✗] Visualizar logs

---

📊 Melhorias Adicionais Sugeridas

Backup automático: Salvar dados em JSON periodicamente

Recuperação de senha: Via e-mail ou token

---

JoanThonpson/github-readme-stats

// frontend/js/utils/storage.js
// ✅ Este arquivo CONTINUA FUNCIONANDO
// Mas vamos ADICIONAR uma versão backend

// Opção 1: Mantém como está (funciona localmente)
// Opção 2: Depois criamos storage-api.js que chama o backend
// Você escolhe quando migrar!
