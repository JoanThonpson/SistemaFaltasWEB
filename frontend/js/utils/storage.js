// js/utils/storage.js
// ============================================
// SISTEMA DE DADOS CENTRALIZADO
// ============================================

console.log('Storage inicializado...');

// ========== VALIDADOR DE CPF ==========
function validarCPF(cpf) {
    console.log('Validando CPF:', cpf);
    
    // Remover caracteres não numéricos
    cpf = cpf.replace(/[^\d]/g, '');
    
    // Verificar se tem 11 dígitos
    if (cpf.length !== 11) {
        console.log('CPF inválido: não tem 11 dígitos');
        return false;
    }
    
    // Verificar se todos os dígitos são iguais (ex: 111.111.111-11)
    if (/^(\d)\1{10}$/.test(cpf)) {
        console.log('CPF inválido: todos dígitos iguais');
        return false;
    }
    
    // Validar primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) {
        console.log('CPF inválido: primeiro dígito verificador incorreto');
        return false;
    }
    
    // Validar segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) {
        console.log('CPF inválido: segundo dígito verificador incorreto');
        return false;
    }
    
    console.log('CPF válido!');
    return true;
}

// ========== FORMATADOR DE CPF ==========
function formatarCPF(cpf) {
    if (!cpf) return '';
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return cpf;
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// ========== GERADOR DE SENHA ALEATÓRIA ==========
function gerarSenhaAleatoria(tamanho = 8) {
    // Garantir pelo menos 8 caracteres
    tamanho = Math.max(8, tamanho);
    
    // Garantir que tenha pelo menos 1 de cada tipo
    const maiusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const minusculas = 'abcdefghijklmnopqrstuvwxyz';
    const numeros = '0123456789';
    const especiais = '@#$%&*!?';
    
    let senha = '';
    
    // Forçar pelo menos 1 de cada tipo
    senha += maiusculas.charAt(Math.floor(Math.random() * maiusculas.length));
    senha += minusculas.charAt(Math.floor(Math.random() * minusculas.length));
    senha += numeros.charAt(Math.floor(Math.random() * numeros.length));
    senha += especiais.charAt(Math.floor(Math.random() * especiais.length));
    
    // Completar o restante com caracteres aleatórios de todos os grupos
    const todos = maiusculas + minusculas + numeros + especiais;
    for (let i = senha.length; i < tamanho; i++) {
        senha += todos.charAt(Math.floor(Math.random() * todos.length));
    }
    
    // Embaralhar a senha para não ficar previsível
    senha = senha.split('').sort(() => Math.random() - 0.5).join('');
    
    return senha;
}

// ========== DADOS DO SISTEMA ==========
const SistemaStorage = {
    // Arrays principais
    disciplinas: [],
    cursos: [],
    justificativas: [],
    docentes: [],
    faltas: [],

    // Dados de usuários e perfis
    usuarios: [],     
    perfis: [],         
    logs: [],           
    
    // Estado da sessão
    usuarioAtual: null,
    
    // ========== INICIALIZAÇÃO ==========
    inicializar: function() {
        console.log('Inicializando sistema de dados...');
    
        // Carregar dados do localStorage
        this.carregarTodos();
    
        console.log('📊 Dados carregados:', {
        usuarios: this.usuarios.length,
        perfis: this.perfis.length,
        disciplinas: this.disciplinas.length
        });
    
        // Se for primeira execução (sem disciplinas), criar dados padrão
        if (this.disciplinas.length === 0) {
        console.log('⚠️ Primeira execução - criando dados padrão');
        this.criarDadosPadrao();
        } else {
        console.log('✅ Dados já existem - apenas garantir Master');
        // APENAS garantir que Master existe, sem recriar nada
        this.garantirMasterExiste();
        }
    },

        // ========== GARANTIR MASTER EXISTE ==========
        garantirMasterExiste: function() {
        console.log('🔍 Verificando se Master existe...');
        console.log('Usuários atuais:', this.usuarios.length);
    
        // Verificar se já existe um usuário Master
        const masterExiste = this.usuarios.some(u => u.master === true);
    
        if (!masterExiste) {
            console.log('⚠️ Master não encontrado! Criando novo Master...');
            this.criarUsuarioMaster();
        } else {
            console.log('✅ Master já existe, mantendo dados existentes');
            // NÃO FAZ NADA - apenas mantém os usuários existentes
        }
    
        // Verificar se os perfis existem
        if (this.perfis.length === 0) {
            console.log('⚠️ Perfis não encontrados! Criando perfis...');
            this.criarPerfisPredefinidos();
        } else {
            console.log('✅ Perfis já existem, mantendo dados existentes');
        }
    },
    
    // ========== CRIAR USUÁRIO MASTER ==========
    criarUsuarioMaster: function() {
        const masterUsuario = {
            id: 1,
            nome: "Master",
            login: "admin",
            cpf: "000.000.000-00",
            email: "master@sistema.com",
            senha_hash: "admin123", // Será criptografada em produção
            perfil_id: 1, // ID do perfil Master
            master: true,
            ativo: true,
            data_cadastro: new Date().toISOString().split('T')[0],
            ultimo_login: null
        };
        
        this.usuarios.push(masterUsuario);
        this.salvar('usuarios', this.usuarios);
        console.log('Usuário Master criado com sucesso!');
    },
    
    // ========== PERFIS DEFINIDOS ==========
    criarPerfisPredefinidos: function() {
    console.log('Criando perfis pré-definidos EXATOS...');
    
    // ========== PERFIL 1: MASTER (NÃO EDITÁVEL) ==========
    const perfilMaster = {
        id: 1,
        nome: "Master",
        descricao: "Acesso total ao sistema - Não editável",
        permissoes: {
            // CONTROLE DE FALTAS
            ver_faltas: true,
            registrar_falta: true,
            editar_falta: true,
            excluir_falta: true,
            
            // DADOS DO DOCENTE
            ver_docentes: true,
            cadastrar_docente: true,
            editar_docente: true,
            excluir_docente: true,
            
            // JUSTIFICATIVAS
            ver_justificativas: true,
            gerenciar_justificativas: true,
            
            // RELATÓRIOS E ESTATÍSTICAS
            ver_relatorios: true,
            gerar_relatorio_pdf: true,
            
            // CONFIGURAÇÕES
            acessar_configuracoes: true,
            gerenciar_disciplinas: true,
            gerenciar_cursos: true,
            gerenciar_justificativas: true,
            gerenciar_usuarios: true,
            editar_usuario: true,
            resetar_senhas: true,
            visualizar_logs: true,
            gerenciar_perfis: true
        },
        editavel: false, // NÃO PODE SER EDITADO
        predefinido: true,
        data_criacao: new Date().toISOString()
    };
    
    // ========== PERFIL 2: GESTOR (EDITÁVEL) ==========
    const perfilGestor = {
        id: 2,
        nome: "Gestor",
        descricao: "Gerenciamento completo (exceto Master)",
        permissoes: {
            // CONTROLE DE FALTAS
            ver_faltas: true,
            registrar_falta: true,
            editar_falta: true,
            excluir_falta: true,
            
            // DADOS DO DOCENTE
            ver_docentes: true,
            cadastrar_docente: true,
            editar_docente: true,
            excluir_docente: true,
            
            // JUSTIFICATIVAS
            ver_justificativas: true,
            gerenciar_justificativas: true,
            
            // RELATÓRIOS E ESTATÍSTICAS
            ver_relatorios: true,
            gerar_relatorio_pdf: true,
            
            // CONFIGURAÇÕES
            acessar_configuracoes: true,
            gerenciar_disciplinas: true,
            gerenciar_cursos: true,
            gerenciar_justificativas: true,
            gerenciar_usuarios: true,
            editar_usuario: true,
            resetar_senhas: true,
            visualizar_logs: true,
            gerenciar_perfis: true
        },
        editavel: true, // PODE SER EDITADO
        predefinido: true,
        data_criacao: new Date().toISOString()
    };
    
    // ========== PERFIL 3: OPERADOR (EDITÁVEL) ==========
    const perfilOperador = {
        id: 3,
        nome: "Operador",
        descricao: "Operações básicas - pode editar docentes, não pode excluir",
        permissoes: {
            // CONTROLE DE FALTAS
            ver_faltas: true,
            registrar_falta: true,
            editar_falta: false,    // ✗
            excluir_falta: false,   // ✗
            
            // DADOS DO DOCENTE
            ver_docentes: true,
            cadastrar_docente: false, // ✗
            editar_docente: true,
            excluir_docente: false,   // ✗
            
            // JUSTIFICATIVAS
            ver_justificativas: true,
            gerenciar_justificativas: false, // ✗
            
            // RELATÓRIOS E ESTATÍSTICAS
            ver_relatorios: true,
            gerar_relatorio_pdf: false, // ✗
            
            // CONFIGURAÇÕES
            acessar_configuracoes: false, // ✗
            gerenciar_disciplinas: false, // ✗
            gerenciar_cursos: false,      // ✗
            gerenciar_justificativas: false, // ✗
            gerenciar_usuarios: false,    // ✗
            editar_usuario: false,        // ✗
            resetar_senhas: false,        // ✗
            visualizar_logs: false,       // ✗
            gerenciar_perfis: false       // ✗
        },
        editavel: true, // PODE SER EDITADO
        predefinido: true,
        data_criacao: new Date().toISOString()
    };
    
    // ========== PERFIL 4: SUPERVISOR (EDITÁVEL) ==========
    const perfilSupervisor = {
        id: 4,
        nome: "Supervisor",
        descricao: "Apenas visualização e relatórios",
        permissoes: {
            // CONTROLE DE FALTAS
            ver_faltas: true,
            registrar_falta: false,   // ✗
            editar_falta: false,      // ✗
            excluir_falta: false,     // ✗
            
            // DADOS DO DOCENTE
            ver_docentes: true,
            cadastrar_docente: false, // ✗
            editar_docente: false,    // ✗
            excluir_docente: false,   // ✗
            
            // JUSTIFICATIVAS
            ver_justificativas: true,
            gerenciar_justificativas: false, // ✗
            
            // RELATÓRIOS E ESTATÍSTICAS
            ver_relatorios: true,
            gerar_relatorio_pdf: true,
            
            // CONFIGURAÇÕES
            acessar_configuracoes: false, // ✗
            gerenciar_disciplinas: false, // ✗
            gerenciar_cursos: false,      // ✗
            gerenciar_justificativas: false, // ✗
            gerenciar_usuarios: false,    // ✗
            editar_usuario: false,        // ✗
            resetar_senhas: false,        // ✗
            visualizar_logs: false,       // ✗
            gerenciar_perfis: false       // ✗
        },
        editavel: true, // PODE SER EDITADO
        predefinido: true,
        data_criacao: new Date().toISOString()
    };
    
    this.perfis.push(perfilMaster, perfilGestor, perfilOperador, perfilSupervisor);
    this.salvar('perfis', this.perfis);
    console.log('4 perfis criados EXATAMENTE como diagrama!');
    },

        // ========== OPERAÇÕES DE USUÁRIOS ==========
    adicionarUsuario: function(dados) {
        console.log('Adicionando usuário:', dados);
        
        // Validar CPF
        if (!validarCPF(dados.cpf)) {
            console.error('CPF inválido:', dados.cpf);
            return false;
        }
        
        // Verificar se CPF já existe
        const cpfExiste = this.usuarios.some(u => 
            u.cpf === dados.cpf || u.cpf === formatarCPF(dados.cpf)
        );
        
        if (cpfExiste) {
            console.error('CPF já cadastrado:', dados.cpf);
            return false;
        }
        
        // Verificar se email já existe
        if (dados.email) {
            const emailExiste = this.usuarios.some(u => 
                u.email.toLowerCase() === dados.email.toLowerCase()
            );
            
            if (emailExiste) {
                console.error('Email já cadastrado:', dados.email);
                return false;
            }
        }
        
        // Gerar ID único
        const novoId = this.gerarProximoId('usuarios');
        
        // Formatar CPF
        const cpfFormatado = formatarCPF(dados.cpf);
        
        // Criar objeto usuário
        const novoUsuario = {
            id: novoId,
            nome: dados.nome.trim(),
            login: cpfFormatado, // Login = CPF formatado
            cpf: cpfFormatado,
            email: dados.email ? dados.email.trim() : '',
            senha_hash: dados.senha_hash || gerarSenhaAleatoria(),
            perfil_id: dados.perfil_id || 3, // Padrão: Operador
            master: false, // Nunca criar outro master
            ativo: dados.ativo !== undefined ? dados.ativo : true,
            data_cadastro: new Date().toISOString().split('T')[0],
            ultimo_login: null,
            criado_por: this.usuarioAtual ? this.usuarioAtual.id : 1
        };
        
        this.usuarios.push(novoUsuario);
        this.salvar('usuarios', this.usuarios);
        
        // Registrar log
        this.registrarLog('CADASTRO_USUARIO', 'Usuários', 
            `Cadastrou usuário: ${novoUsuario.nome} (${novoUsuario.cpf})`);
        
        console.log('Usuário cadastrado com sucesso! ID:', novoId);
        return novoId;
    },
    
    atualizarUsuario: function(id, dadosAtualizados) {
    console.log('Atualizando usuário ID:', id, dadosAtualizados);
    
    const index = this.usuarios.findIndex(u => u.id === id);
    if (index === -1) {
        console.error('Usuário não encontrado ID:', id);
        return false;
    }
    
    const usuario = this.usuarios[index];
    
    // NÃO PERMITIR ALTERAR MASTER
    if (usuario.master) {
        console.error('Não é permitido alterar usuário Master');
        return false;
    }
    
    // Validar CPF se for alterado
    if (dadosAtualizados.cpf && dadosAtualizados.cpf !== usuario.cpf) {
        if (!validarCPF(dadosAtualizados.cpf)) {
            console.error('CPF inválido:', dadosAtualizados.cpf);
            return false;
        }
        
        // Verificar se novo CPF já existe em outro usuário
        const cpfExiste = this.usuarios.some(u => 
            u.id !== id && (u.cpf === dadosAtualizados.cpf || u.cpf === formatarCPF(dadosAtualizados.cpf))
        );
        
        if (cpfExiste) {
            console.error('CPF já cadastrado em outro usuário:', dadosAtualizados.cpf);
            return false;
        }
        
        // Formatar CPF e atualizar login
        dadosAtualizados.cpf = formatarCPF(dadosAtualizados.cpf);
        dadosAtualizados.login = dadosAtualizados.cpf;
    }
    
    // Atualizar usuário
    this.usuarios[index] = { ...usuario, ...dadosAtualizados };
    this.salvar('usuarios', this.usuarios);
    
    // Registrar log
    this.registrarLog('ATUALIZACAO_USUARIO', 'Usuários', 
        `Atualizou usuário: ${usuario.nome} (${usuario.cpf})`);
    
    console.log('✅ Usuário atualizado com sucesso!');
    return true;
    },
    
    removerUsuario: function(id) {
        console.log('Tentando remover usuário ID:', id);
        
        const index = this.usuarios.findIndex(u => u.id === id);
        if (index === -1) {
            console.error('Usuário não encontrado ID:', id);
            return false;
        }
        
        const usuario = this.usuarios[index];
        
        // NÃO PERMITIR REMOVER MASTER
        if (usuario.master) {
            console.error('Não é permitido remover usuário Master');
            return false;
        }
        
        // Verificar se pode ser excluído
        if (!this.usuarioPodeSerExcluido(id)) {
            console.error('Usuário não pode ser excluído - tem registros associados');
            return false;
        }
        
        // Remover usuário
        this.usuarios.splice(index, 1);
        this.salvar('usuarios', this.usuarios);
        
        // Registrar log
        this.registrarLog('EXCLUSAO_USUARIO', 'Usuários', 
            `Excluiu usuário: ${usuario.nome} (${usuario.cpf})`);
        
        console.log('Usuário removido com sucesso!');
        return true;
    },
    
    // ========== VERIFICAR SE USUÁRIO PODE SER EXCLUÍDO ==========
    usuarioPodeSerExcluido: function(usuarioId) {

    const usuario = this.getUsuarioPorId(usuarioId);
    if (!usuario) return false;
    
    // Master nunca pode ser excluído
    if (usuario.master) return false;
    
    // Verificar se tem faltas registradas
    const temFaltas = this.faltas.some(f => 
        f.usuario_id === usuarioId || f.registrado_por === usuarioId
    );
    
    // ✅ CORREÇÃO AQUI
    const acoesQueBloqueiam = [
        'CADASTRAR_DOCENTE',
        'EDITAR_DOCENTE',
        'EXCLUIR_DOCENTE',

        'CADASTRAR_FALTA',
        'EDITAR_FALTA',
        'EXCLUIR_FALTA',

        'CADASTRAR_USUARIO',
        'EDITAR_USUARIO',
        'EXCLUIR_USUARIO',

        'EDITAR_PERFIL',
        'EDITAR_CONFIGURACOES'
    ];

    const temLogs = this.logs.some(l =>
        l.usuario_id === usuarioId &&
        acoesQueBloqueiam.includes(l.acao)
    );
    
    // Verificar se é último gestor ativo
    if (usuario.perfil_id === 2) {
        const gestoresAtivos = this.usuarios.filter(u => 
            u.perfil_id === 2 && u.ativo && u.id !== usuarioId
        ).length;
        
        if (gestoresAtivos === 0) {
            console.log('Não pode excluir - é o último gestor ativo');
            return false;
        }
    }
    
    return !(temFaltas || temLogs);
    },
        // ========== OPERAÇÕES DE PERFIS ==========
    getPerfilPorId: function(id) {
        return this.perfis.find(p => p.id === id) || null;
     },
    
    getPerfilPorNome: function(nome) {
        return this.perfis.find(p => p.nome.toLowerCase() === nome.toLowerCase()) || null;
    },
    
    adicionarPerfil: function(dados) {
        // Gerar ID único
        dados.id = this.gerarProximoId('perfis');
        dados.editavel = true;
        dados.predefinido = false;
        dados.data_criacao = new Date().toISOString();
        
        this.perfis.push(dados);
        this.salvar('perfis', this.perfis);
        
        // Registrar log
        this.registrarLog('CADASTRO_PERFIL', 'Perfis', 
            `Cadastrou perfil: ${dados.nome}`);
        
        return dados.id;
    },
    
    atualizarPerfil: function(id, dadosAtualizados) {
        const index = this.perfis.findIndex(p => p.id === id);
        if (index === -1) return false;
        
        // Não permitir editar perfis predefinidos (exceto talvez Gestor?)
        if (this.perfis[index].predefinido && this.perfis[index].nome !== 'Gestor') {
            console.error('Não é permitido editar perfil predefinido:', this.perfis[index].nome);
            return false;
        }


        // Atualizar apenas os campos permitidos
        const perfilAtualizado = { ...this.perfis[index] };
    
        if (dadosAtualizados.permissoes) {
        perfilAtualizado.permissoes = dadosAtualizados.permissoes;
        }
    
        if (dadosAtualizados.descricao !== undefined) {
        perfilAtualizado.descricao = dadosAtualizados.descricao;
        }
    
        this.perfis[index] = perfilAtualizado;
        this.salvar('perfis', this.perfis);
        
        // Registrar log
        this.registrarLog('ATUALIZACAO_PERFIL', 'Perfis', 
            `Atualizou perfil: ${this.perfis[index].nome}`);
        
        return true;
    },
    
    removerPerfil: function(id) {
        const index = this.perfis.findIndex(p => p.id === id);
        if (index === -1) return false;
        
        const perfil = this.perfis[index];
        
        // Não permitir remover perfis predefinidos
        if (perfil.predefinido) {
            console.error('Não é permitido remover perfil predefinido:', perfil.nome);
            return false;
        }
        
        // Verificar se perfil está em uso
        const emUso = this.usuarios.some(u => u.perfil_id === id);
        if (emUso) {
            console.error('Perfil está em uso por usuários');
            return false;
        }
        
        this.perfis.splice(index, 1);
        this.salvar('perfis', this.perfis);
        
        // Registrar log
        this.registrarLog('EXCLUSAO_PERFIL', 'Perfis', 
            `Excluiu perfil: ${perfil.nome}`);
        
        return true;
    },

    

        // ========== SISTEMA DE LOGS ==========
    registrarLog: function(acao, modulo, detalhes, usuarioId = null) {
        const usuario = usuarioId ? this.getUsuarioPorId(usuarioId) : this.usuarioAtual;
        
        // Obter IP do usuário (simulado para desenvolvimento)
        const ip = this.obterIPUsuario();
        
        const novoLog = {
            id: this.gerarProximoId('logs'),
            usuario_id: usuario ? usuario.id : 0,
            usuario_nome: usuario ? usuario.nome : 'Sistema',
            usuario_cpf: usuario ? usuario.cpf : 'Sistema',
            usuario_perfil: usuario ? this.getNomePerfil(usuario.perfil_id) : 'Sistema',
            usuario_status: usuario ? (usuario.ativo ? 'Ativo' : 'Inativo') : 'Sistema',
            acao: acao,
            modulo: modulo,
            detalhes: detalhes,
            data: new Date().toISOString().replace('T', ' ').substring(0, 19),
            ip: ip
        };
        
        this.logs.unshift(novoLog); // Adiciona no início (mais recente primeiro)
        
        // Manter máximo de 10.000 logs para não sobrecarregar
        if (this.logs.length > 10000) {
            this.logs = this.logs.slice(0, 10000);
        }
        
        this.salvar('logs', this.logs);
        
        console.log(`📝 LOG: ${acao} | ${modulo} | ${usuario ? usuario.nome : 'Sistema'}`);
        return novoLog.id;
    },
    
    obterIPUsuario: function() {
        // Em produção, isso viria do servidor
        // Para desenvolvimento, retornamos um IP simulado
        return '192.168.1.' + Math.floor(Math.random() * 255);
    },
    
    getNomePerfil: function(perfilId) {
        const perfil = this.getPerfilPorId(perfilId);
        return perfil ? perfil.nome : 'Desconhecido';
    },
    
    // ========== FILTROS DE LOGS ==========
    filtrarLogs: function(filtros = {}) {
        let logsFiltrados = [...this.logs];
        
        // Filtrar por período
        if (filtros.dataInicio) {
            const inicio = new Date(filtros.dataInicio);
            logsFiltrados = logsFiltrados.filter(log => new Date(log.data) >= inicio);
        }
        
        if (filtros.dataFim) {
            const fim = new Date(filtros.dataFim + ' 23:59:59');
            logsFiltrados = logsFiltrados.filter(log => new Date(log.data) <= fim);
        }
        
        // Filtrar por usuário
        if (filtros.usuarioId) {
            logsFiltrados = logsFiltrados.filter(log => log.usuario_id == filtros.usuarioId);
        }
        
        // Filtrar por perfil
        if (filtros.perfil) {
            logsFiltrados = logsFiltrados.filter(log => log.usuario_perfil === filtros.perfil);
        }
        
        // Filtrar por status
        if (filtros.status) {
            logsFiltrados = logsFiltrados.filter(log => log.usuario_status === filtros.status);
        }
        
        // Filtrar por módulo
        if (filtros.modulo && filtros.modulo !== 'Todos') {
            logsFiltrados = logsFiltrados.filter(log => log.modulo === filtros.modulo);
        }
        
        // Filtrar por ação
        if (filtros.acao && filtros.acao !== 'Todas') {
            logsFiltrados = logsFiltrados.filter(log => log.acao === filtros.acao);
        }
        
        return logsFiltrados;
    },

        // ========== MÉTODOS AUXILIARES ==========
    getUsuarioPorId: function(id) {
        return this.usuarios.find(u => u.id === id) || null;
    },
    
    getUsuarioPorCPF: function(cpf) {
        const cpfFormatado = formatarCPF(cpf);
        return this.usuarios.find(u => u.cpf === cpfFormatado || u.login === cpfFormatado) || null;
    },
    
    getUsuarioPorEmail: function(email) {
        return this.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    },
    
    getUsuariosPorPerfil: function(perfilId) {
        return this.usuarios.filter(u => u.perfil_id === perfilId);
    },
    
    getUsuariosAtivos: function() {
        return this.usuarios.filter(u => u.ativo);
    },
    
    getUsuariosInativos: function() {
        return this.usuarios.filter(u => !u.ativo);
    },
    
    // ========== AUTENTICAÇÃO ==========
    autenticarUsuario: function(login, senha) {
    console.log('Tentando autenticar:', login);

    // Se for Master (admin)
    if (login === 'admin') {
        const master = this.usuarios.find(u => u.master === true);
        if (master && senha === master.senha_hash) {
            this.registrarLog('LOGIN', 'Autenticação', 'Login realizado como Master', master.id);
            return master;
        }
        return null;
    }

    // Se for CPF (usuário normal)
    const loginLimpo = login.replace(/[^\d]/g, '');
    console.log('Login limpo:', loginLimpo);

    // Procurar usuário por CPF
    const usuario = this.usuarios.find(u => {
        if (u.master) return false;
        // ✅ REMOVEMOS a verificação de 'ativo' daqui
        
        const cpfUsuario = u.cpf.replace(/[^\d]/g, '');
        return cpfUsuario === loginLimpo;
    });

    if (!usuario) {
        console.log('Usuário não encontrado com CPF:', login);
        return null;
    }

    console.log('Usuário encontrado:', usuario.nome);

    // Verificar senha
    if (senha === usuario.senha_hash) {
        // ✅ SÓ ATUALIZAMOS O LOGIN SE ELE ESTIVER ATIVO
        if (usuario.ativo) {
            usuario.ultimo_login = new Date().toISOString();
            this.salvar('usuarios', this.usuarios);
        }
        this.registrarLog('LOGIN', 'Autenticação', `Login realizado: ${usuario.nome}`, usuario.id);
        return usuario; // Retorna o usuário (ativo ou inativo)
     }

        console.log('Senha incorreta para:', usuario.nome);
      return null;
    },
    
    
    // ========== CARREGAR E SALVAR TODOS ==========
    carregarTodos: function() {
        this.disciplinas = this.carregar('disciplinas') || [];
        this.cursos = this.carregar('cursos') || [];
        this.justificativas = this.carregar('justificativas') || [];
        this.docentes = this.carregar('docentes') || [];
        this.faltas = this.carregar('faltas') || [];
        
        // NOVOS: Carregar dados de usuários, perfis e logs
        this.usuarios = this.carregar('usuarios') || [];
        this.perfis = this.carregar('perfis') || [];
        this.logs = this.carregar('logs') || [];
    },
    
    salvarTodos: function() {
        this.salvar('disciplinas', this.disciplinas);
        this.salvar('cursos', this.cursos);
        this.salvar('justificativas', this.justificativas);
        this.salvar('docentes', this.docentes);
        this.salvar('faltas', this.faltas);
        
        // NOVOS: Salvar dados de usuários, perfis e logs
        this.salvar('usuarios', this.usuarios);
        this.salvar('perfis', this.perfis);
        this.salvar('logs', this.logs);
    },

    
    // ========== DADOS PADRÃO ==========
    
    criarDadosPadrao: function() {
        console.log('Criando dados padrão...');
        
        // Disciplinas padrão
        this.disciplinas = [
            "Matemática",
            "Português", 
            "História",
            "Geografia",
            "Ciências",
            "Inglês"
        ];
        
        // Cursos padrão
        this.cursos = [
            "Ensino Fundamental",
            "Ensino Médio",
            "Educação Infantil"
        ];
        
        // Justificativas padrão
        this.justificativas = [
            "Consulta médica",
            "Problemas de saúde",
            "Assuntos particulares",
            "Atestado médico",
            "Licença saúde"
        ];
        
        // Docentes padrão (com dados reais que você tinha)
        this.docentes = [
            { 
                id: 1, 
                nome: "Emerson Israel Mendes", 
                disciplinas: ["Matemática"], 
                cursos: ["Ensino Médio"], 
                aulas: 13.5 
            },
            { 
                id: 2, 
                nome: "Ulrias Fagner Santos Nascimento", 
                disciplinas: ["Português"], 
                cursos: ["Ensino Médio"], 
                aulas: 162 
            },
            { 
                id: 3, 
                nome: "Laura Lucia Da Silva Amorim", 
                disciplinas: ["História"], 
                cursos: ["Ensino Fundamental"], 
                aulas: 90 
            }
        ];
        
        // Faltas padrão
        this.faltas = [
            { 
                id: 1, 
                docenteId: 1, 
                disciplina: "Matemática", 
                curso: "Ensino Médio", 
                quantidadeFaltas: 1,
                justificada: true,
                justificativa: "Consulta médica",
                observacoes: "Apresentou atestado médico",
                data: "2024-01-15", 
                horarioInicio: "08:00", 
                horarioFim: "09:30",
                registrado_por: 1,
                usuario_id: 1
            }
        ];
        
        // Criar perfis pré-definidos
        this.criarPerfisPredefinidos();
        
        // Criar usuário Master
        this.criarUsuarioMaster();
        
        // Salvar tudo
        this.salvarTodos();
    },
    
    
    // Métodos auxiliares de localStorage
    carregar: function(chave) {
        console.log(`📂 [DEBUG] Carregando ${chave} do localStorage...`);
        const dados = localStorage.getItem(`sistema_faltas_${chave}`);
        console.log(`📂 [DEBUG] Dados brutos de ${chave}:`, dados ? dados.substring(0, 100) + '...' : 'null');
    
        if (dados) {
            try {
                const parsed = JSON.parse(dados);
                console.log(`✅ [DEBUG] ${chave} carregado com sucesso:`, parsed.length, 'itens');
                console.log(`📋 [DEBUG] Primeiros itens de ${chave}:`, JSON.stringify(parsed).substring(0, 200));
                return parsed;
            } catch (e) {
                console.error(`❌ [DEBUG] Erro ao parsear ${chave}:`, e);
                return null;
            }
        }
        console.log(`⚠️ [DEBUG] ${chave} não encontrado no localStorage`);
        return null;
    },
    
    salvar: function(chave, dados) {
        console.log(`💾 [DEBUG] Salvando ${chave} no localStorage...`, dados.length, 'itens');
        localStorage.setItem(`sistema_faltas_${chave}`, JSON.stringify(dados));
        console.log(`✅ [DEBUG] ${chave} salvo com sucesso`);
    },
    
    // ========== OPERAÇÕES DE DISCIPLINAS ==========
    adicionarDisciplina: function(nome) {
        if (!nome.trim()) return false;
        
        const nomeNormalizado = nome.trim();
        const existe = this.disciplinas.some(d => 
            d.toLowerCase() === nomeNormalizado.toLowerCase()
        );
        
        if (existe) {
            console.log(`Disciplina "${nome}" já existe`);
            return false;
        }
        
        this.disciplinas.push(nomeNormalizado);
        this.disciplinas.sort();
        this.salvar('disciplinas', this.disciplinas);
        console.log(`Disciplina "${nome}" adicionada`);
        return true;
    },
    
    removerDisciplina: function(nome) {
        const index = this.disciplinas.indexOf(nome);
        if (index === -1) return false;
        
        // Verificar se disciplina está em uso
        const emUsoDocentes = this.docentes.some(d => 
            d.disciplinas.includes(nome)
        );
        const emUsoFaltas = this.faltas.some(f => 
            f.disciplina === nome
        );
        
        if (emUsoDocentes || emUsoFaltas) {
            console.log(`Disciplina "${nome}" está em uso e não pode ser removida`);
            return false;
        }
        
        this.disciplinas.splice(index, 1);
        this.salvar('disciplinas', this.disciplinas);
        console.log(`Disciplina "${nome}" removida`);
        return true;
    },
    
    // ========== OPERAÇÕES DE CURSOS ==========
    adicionarCurso: function(nome) {
        if (!nome.trim()) return false;
        
        const nomeNormalizado = nome.trim();
        const existe = this.cursos.some(c => 
            c.toLowerCase() === nomeNormalizado.toLowerCase()
        );
        
        if (existe) {
            console.log(`Curso "${nome}" já existe`);
            return false;
        }
        
        this.cursos.push(nomeNormalizado);
        this.cursos.sort();
        this.salvar('cursos', this.cursos);
        console.log(`Curso "${nome}" adicionado`);
        return true;
    },
    
    removerCurso: function(nome) {
        const index = this.cursos.indexOf(nome);
        if (index === -1) return false;
        
        // Verificar se curso está em uso
        const emUsoDocentes = this.docentes.some(d => 
            d.cursos.includes(nome)
        );
        const emUsoFaltas = this.faltas.some(f => 
            f.curso === nome
        );
        
        if (emUsoDocentes || emUsoFaltas) {
            console.log(`Curso "${nome}" está em uso e não pode ser removida`);
            return false;
        }
        
        this.cursos.splice(index, 1);
        this.salvar('cursos', this.cursos);
        console.log(`Curso "${nome}" removido`);
        return true;
    },
    
    // ========== OPERAÇÕES DE JUSTIFICATIVAS ==========
    adicionarJustificativa: function(descricao) {
        if (!descricao.trim()) return false;
        
        const descricaoNormalizada = descricao.trim();
        const existe = this.justificativas.some(j => 
            j.toLowerCase() === descricaoNormalizada.toLowerCase()
        );
        
        if (existe) {
            console.log(`Justificativa "${descricao}" já existe`);
            return false;
        }
        
        this.justificativas.push(descricaoNormalizada);
        this.justificativas.sort();
        this.salvar('justificativas', this.justificativas);
        console.log(`Justificativa "${descricao}" adicionada`);
        return true;
    },
    
    removerJustificativa: function(descricao) {
        const index = this.justificativas.indexOf(descricao);
        if (index === -1) return false;
        
        // Verificar se justificativa está em uso
        const emUsoFaltas = this.faltas.some(f => 
            f.justificativa === descricao
        );
        
        if (emUsoFaltas) {
            console.log(`Justificativa "${descricao}" está em uso e não pode ser removida`);
            return false;
        }
        
        this.justificativas.splice(index, 1);
        this.salvar('justificativas', this.justificativas);
        console.log(`Justificativa "${descricao}" removida`);
        return true;
    },
    
    // ========== OPERAÇÕES DE DOCENTES ==========
    adicionarDocente: function(docente) {
        // Gerar ID único
        docente.id = this.gerarProximoId('docentes');
        this.docentes.push(docente);
        this.salvar('docentes', this.docentes);
        console.log(`Docente "${docente.nome}" adicionado`, docente);
        return docente.id;
    },
    
    atualizarDocente: function(id, dadosAtualizados) {
        const index = this.docentes.findIndex(d => d.id === id);
        if (index === -1) return false;
        
        this.docentes[index] = { ...this.docentes[index], ...dadosAtualizados };
        this.salvar('docentes', this.docentes);
        console.log(`Docente ID ${id} atualizado`, this.docentes[index]);
        return true;
    },
    
    removerDocente: function(id) {
        const index = this.docentes.findIndex(d => d.id === id);
        if (index === -1) return false;
        
        // Verificar se docente tem faltas
        if (this.docenteEmUso(id)) {
            console.log(`Docente ID ${id} está em uso (tem faltas registradas)`);
            return false;
        }
        
        const docente = this.docentes[index];
        this.docentes.splice(index, 1);
        this.salvar('docentes', this.docentes);
        console.log(`Docente "${docente.nome}" removido`);
        return true;
    },
    
    getDocentePorId: function(id) {
        return this.docentes.find(d => d.id === id) || null;
    },
    
    // ========== OPERAÇÕES DE FALTAS ==========
    adicionarFalta: function(falta) {
        // Gerar ID único
        falta.id = this.gerarProximoId('faltas');
        this.faltas.push(falta);
        this.salvar('faltas', this.faltas);
        console.log(`Falta adicionada para docente ID ${falta.docenteId}`, falta);
        return falta.id;
    },
    
    atualizarFalta: function(id, dadosAtualizados) {
        const index = this.faltas.findIndex(f => f.id === id);
        if (index === -1) return false;
        
        this.faltas[index] = { ...this.faltas[index], ...dadosAtualizados };
        this.salvar('faltas', this.faltas);
        console.log(`Falta ID ${id} atualizada`, this.faltas[index]);
        return true;
    },
    
    removerFalta: function(id) {
        const index = this.faltas.findIndex(f => f.id === id);
        if (index === -1) return false;
        
        const falta = this.faltas[index];
        this.faltas.splice(index, 1);
        this.salvar('faltas', this.faltas);
        console.log(`Falta ID ${id} removida`);
        return true;
    },
    
    // ========== MÉTODOS AUXILIARES ==========
    gerarProximoId: function(tipo) {
        const lista = this[tipo];
        if (lista.length === 0) return 1;
        return Math.max(...lista.map(item => item.id || 0)) + 1;
    },
    
    // Obter lista ordenada
    getDisciplinasOrdenadas: function() {
        return [...this.disciplinas].sort();
    },
    
    getCursosOrdenados: function() {
        return [...this.cursos].sort();
    },
    
    getJustificativasOrdenadas: function() {
        return [...this.justificativas].sort();
    },

    // MÉTODOS PARA OBTER DADOS ESPECÍFICOS DO DOCENTE
    getDisciplinasPorDocente: function(id) {
    const docente = this.getDocentePorId(id);
    return docente ? docente.disciplinas || [] : [];
    },

    getCursosPorDocente: function(id) {
    const docente = this.getDocentePorId(id);
    return docente ? docente.cursos || [] : [];
    },
    
    // Verificar uso
    disciplinaEmUso: function(nome) {
        return this.docentes.some(d => d.disciplinas.includes(nome)) ||
               this.faltas.some(f => f.disciplina === nome);
    },
    
    cursoEmUso: function(nome) {
        return this.docentes.some(d => d.cursos.includes(nome)) ||
               this.faltas.some(f => f.curso === nome);
    },
    
    justificativaEmUso: function(descricao) {
        return this.faltas.some(f => f.justificativa === descricao);
    },
    
    // Novo método para verificar se docente tem faltas
    docenteEmUso: function(id) {
        return this.faltas.some(f => f.docenteId === id);
    },
    
    // ========== AUTENTICAÇÃO ==========
    setUsuarioAtual: function(usuario) {
        this.usuarioAtual = usuario;
        localStorage.setItem('sistema_faltas_usuario_atual', JSON.stringify(usuario));
    },
    
    getUsuarioAtual: function() {
        if (!this.usuarioAtual) {
            const usuarioSalvo = localStorage.getItem('sistema_faltas_usuario_atual');
            this.usuarioAtual = usuarioSalvo ? JSON.parse(usuarioSalvo) : null;
        }
        return this.usuarioAtual;
    },
    
    logout: function() {
        this.usuarioAtual = null;
        localStorage.removeItem('sistema_faltas_usuario_atual');
    },
    
    // ========== EXPORTAÇÃO ==========
    exportarDados: function() {
        return {
            disciplinas: this.disciplinas,
            cursos: this.cursos,
            justificativas: this.justificativas,
            docentes: this.docentes,
            faltas: this.faltas
        };
    }
};

// Inicializar automaticamente
SistemaStorage.inicializar();

// Exportar para uso global
window.SistemaStorage = SistemaStorage;

// Adicionar este método para verificar se há logs antigos
SistemaStorage.verificarLogsAntigos = function() {
    const agora = new Date();
    const umMesAtras = new Date();
    umMesAtras.setMonth(umMesAtras.getMonth() - 1);
    
    const logsAntigos = this.logs.filter(log => {
        const dataLog = new Date(log.data);
        return dataLog < umMesAtras;
    }).length;
    
    return logsAntigos;
};

console.log('SistemaStorage disponível globalmente');