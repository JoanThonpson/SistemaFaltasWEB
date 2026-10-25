// js/app.js -- Arquivo principal do sistema de controle de faltas docentes
console.log('Sistema iniciando...');

// ========== FUNÇÃO PARA MOSTRAR/OCULTAR SENHA ==========
function toggleSenha(inputId, botao) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const icon = botao.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// ========== VARIÁVEIS GLOBAIS PARA CONTROLE ==========
let docenteEditandoId = null; // Para controlar edição de docente
let faltaEditandoId = null;   // Para controlar edição de falta
let usuarioEditandoId = null; // PARA CONTROLE DE EDIÇÃO DE USUÁRIO (ADICIONE ESTA LINHA)
let filtroStatusAtual = 'todos'; // 'todos', 'ativos', 'inativos'
let buscaAtual = ''; // Termo de busca atual

// ========== FUNÇÃO UTILITÁRIA PARA CORREÇÃO DE DATAS ==========

function corrigirData(dataString) {
    if (!dataString) return null;
    
    // Se for string no formato YYYY-MM-DD (vindo do input date)
    if (typeof dataString === 'string' && dataString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Adiciona meio-dia para evitar problema de fuso
        return new Date(dataString + 'T12:00:00');
    }
    
    // Se já for objeto Date, retorna ele
    if (dataString instanceof Date) {
        return dataString;
    }
    
    // Tenta converter outros formatos
    return new Date(dataString);
}

function formatarDataCorreta(dataString) {
    if (!dataString) return '';
    
    const data = corrigirData(dataString);
    if (isNaN(data.getTime())) return dataString;
    
    return data.toLocaleDateString('pt-BR');
}

// ========== FUNÇÕES AUXILIARES PARA FILTRO ==========

// Função para obter datas do filtro atual
function getDatasFiltroAtual() {
    const dataInicio = document.getElementById('dataInicio')?.value || '';
    const dataFim = document.getElementById('dataFim')?.value || '';
    return { dataInicio, dataFim };
}

// Função para verificar se há filtro ativo
function filtroAtivo() {
    const { dataInicio, dataFim } = getDatasFiltroAtual();
    return !!(dataInicio || dataFim); // Retorna true se qualquer data estiver preenchida
}

// ========== FUNÇÃO FILTRAR FALTAS POR PERÍODO ==========

function getFaltasFiltradasPorPeriodo(dataInicio, dataFim) {
    console.log('Filtrando faltas por período:', { dataInicio, dataFim });
    
    // Se não houver datas, retorna todas as faltas
    if (!dataInicio && !dataFim) {
        return SistemaStorage.faltas;
    }
    
    // Converter datas usando a função corrigida
    const inicio = dataInicio ? corrigirData(dataInicio) : null;
    const fim = dataFim ? corrigirData(dataFim) : null;
    
    // Ajustar fim para o final do dia
    if (fim) {
        fim.setHours(23, 59, 59, 999);
    }
    
    const faltasFiltradas = SistemaStorage.faltas.filter(falta => {
        if (!falta.data) return false;
        
        // Converter data da falta usando a função corrigida
        const dataFalta = corrigirData(falta.data);
        
        let passouNoFiltro = true;
        
        // Filtrar por data início
        if (inicio) {
            if (dataFalta < inicio) passouNoFiltro = false;
        }
        
        // Filtrar por data fim
        if (fim && passouNoFiltro) {
            if (dataFalta > fim) passouNoFiltro = false;
        }
        
        return passouNoFiltro;
    });
    
    console.log(`Faltas filtradas: ${faltasFiltradas.length} de ${SistemaStorage.faltas.length}`);
    return faltasFiltradas;
}

// ========== FUNÇÃO FILTRAR JUSTIFICATIVAS NA CONFIGURAÇÃO ==========

function filtrarJustificativasConfig() {
    const busca = document.getElementById('buscaJustificativaConfig')?.value.toLowerCase() || '';
    const itens = document.querySelectorAll('#listaJustificativasConfig .list-group-item');
    
    itens.forEach(item => {
        const texto = item.querySelector('span')?.textContent.toLowerCase() || '';
        item.style.display = texto.includes(busca) ? 'flex' : 'none';
    });
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado');
    
    // 1. Verificar autenticação
    if (!verificarAutenticacao()) {
        return;
    }
    
    // 2. Configurar interface
    configurarInterface();
    
    // 3. Configurar eventos
    configurarEventos();
    
    // 4. Configurar observador de abas
    configurarObservadorAbas();
    
    console.log('Sistema pronto!');
});

// ========== FUNÇÕES PRINCIPAIS ==========

function verificarAutenticacao() {
    console.log('🔐 Verificando autenticação...');
    
    let usuario = null;
    
    // 1. Tentar pegar do SistemaStorage (sistema novo)
    if (window.SistemaStorage && typeof SistemaStorage.getUsuarioAtual === 'function') {
        console.log('Buscando usuário no SistemaStorage...');
        usuario = SistemaStorage.getUsuarioAtual();
    }
    
    // 2. Se não encontrou, tentar localStorage (compatibilidade)
    if (!usuario || !usuario.id) {
        console.log('Buscando no localStorage...');
        const authData = localStorage.getItem('sistema_faltas_auth');
        if (authData) {
            try {
                const dados = JSON.parse(authData);
                
                // Buscar usuário completo no SistemaStorage
                if (window.SistemaStorage && dados.id) {
                    usuario = SistemaStorage.getUsuarioPorId(dados.id);
                    
                    // Se encontrou, atualizar no SistemaStorage
                    if (usuario) {
                        SistemaStorage.setUsuarioAtual(usuario);
                        console.log('Usuário migrado para SistemaStorage:', usuario.nome);
                    }
                }
                
                // Se ainda não tem, usar dados básicos do localStorage
                if (!usuario && dados.name) {
                    usuario = {
                        id: dados.id || 0,
                        nome: dados.name,
                        perfil_id: dados.perfil_id || 1,
                        master: dados.type === 'master'
                    };
                }
                
            } catch (e) {
                console.error('Erro ao parsear authData:', e);
            }
        }
    }
    
    // 3. Se ainda não tem usuário, redirecionar para login
    if (!usuario || !usuario.id) {
        console.log('❌ Usuário não autenticado, redirecionando para login...');
        window.location.href = 'login.html';
        return false;
    }
    
    console.log('✅ Usuário autenticado:', usuario);
    
    // 4. Mostrar informação do usuário na interface
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        // Obter nome do perfil
        let perfilNome = 'Usuário';
        if (usuario.master) {
            perfilNome = 'Master';
        } else if (window.SistemaStorage && usuario.perfil_id) {
            const perfil = SistemaStorage.getPerfilPorId(usuario.perfil_id);
            perfilNome = perfil ? perfil.nome : 'Usuário';
        }
        
        userInfo.innerHTML = `
            <i class="fas fa-user-circle me-1"></i>
            <strong>${usuario.nome}</strong>
            <span class="badge ${usuario.master ? 'bg-warning' : 'bg-primary'} ms-2">
                ${perfilNome}
            </span>
        `;
    }
    
    // 5. Registrar log de acesso (se SistemaStorage disponível)
    if (window.SistemaStorage && typeof SistemaStorage.registrarLog === 'function') {
        setTimeout(() => {
            SistemaStorage.registrarLog('ACESSO_SISTEMA', 'Sistema', 
                `Acessou o sistema`, usuario.id);
        }, 1000);
    }
    
    return true;
}

// ========== SISTEMA DE PERMISSÕES ==========

// ========== FUNÇÕES PARA EDIÇÃO DE PERMISSÕES ==========

window.editarPermissoesPerfil = function(perfilId) {
    console.log('Editando permissões do perfil ID:', perfilId);
    
    if (!temPermissao('gerenciar_perfis')) {
        alert('❌ Você não tem permissão para editar perfis!');
        return;
    }
    
    const perfil = SistemaStorage.getPerfilPorId(perfilId);
    if (!perfil) {
        alert('❌ Perfil não encontrado!');
        return;
    }
    
    // Verificar se é Master (não editável)
    if (perfil.nome === 'Master') {
        alert('❌ O perfil Master não pode ser editado!');
        return;
    }
    
    perfilEditandoId = perfilId;
    
    // Atualizar título do modal
    document.getElementById('perfilNomeTitulo').textContent = perfil.nome;
    
    // Mostrar/ocultar warning do Master
    document.getElementById('masterWarning').style.display = 'none';
    
    // Carregar permissões atuais
    carregarPermissoesNoModal(perfil);
    
    // Abrir modal
    const modalElement = document.getElementById('editarPermissoesModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
};

// Função para carregar as permissões no modal
function carregarPermissoesNoModal(perfil) {
    // Lista de todas as permissões possíveis
    const permissoes = [
        'ver_faltas', 'registrar_falta', 'editar_falta', 'excluir_falta',
        'ver_docentes', 'cadastrar_docente', 'editar_docente', 'excluir_docente',
        'ver_justificativas', 'gerenciar_justificativas',
        'ver_relatorios', 'gerar_relatorio_pdf',
        'acessar_configuracoes', 'gerenciar_disciplinas', 'gerenciar_cursos',
        'gerenciar_usuarios', 'editar_usuario', 'resetar_senhas',
        'visualizar_logs', 'gerenciar_perfis'
    ];
    
    // Para cada permissão, marcar o checkbox se estiver ativa
    permissoes.forEach(permissao => {
        const checkbox = document.getElementById(`perm_${permissao}`);
        if (checkbox) {
            checkbox.checked = perfil.permissoes[permissao] === true;
        }
    });
}

// Função para selecionar todos os checkboxes de um módulo
window.selecionarTodosModulo = function(modulo) {
    let checkboxes = [];
    
    if (modulo === 'todos') {
        // Selecionar TODOS os checkboxes
        checkboxes = document.querySelectorAll('.permissao-checkbox');
    } else {
        // Selecionar apenas os de um módulo específico
        checkboxes = document.querySelectorAll(`.permissao-checkbox[data-modulo="${modulo}"]`);
    }
    
    checkboxes.forEach(cb => cb.checked = true);
};

// Função para limpar todos os checkboxes de um módulo
window.limparTodosModulo = function(modulo) {
    let checkboxes = [];
    
    if (modulo === 'todos') {
        checkboxes = document.querySelectorAll('.permissao-checkbox');
    } else {
        checkboxes = document.querySelectorAll(`.permissao-checkbox[data-modulo="${modulo}"]`);
    }
    
    checkboxes.forEach(cb => cb.checked = false);
};

// Função para salvar as permissões
function salvarPermissoes() {
    if (!perfilEditandoId) {
        alert('❌ Erro: ID do perfil não encontrado!');
        return;
    }
    
    const perfil = SistemaStorage.getPerfilPorId(perfilEditandoId);
    if (!perfil) {
        alert('❌ Perfil não encontrado!');
        return;
    }
    
    // Coletar todas as permissões dos checkboxes
    const novasPermissoes = {};
    const checkboxes = document.querySelectorAll('.permissao-checkbox');
    
    checkboxes.forEach(checkbox => {
        const permissao = checkbox.getAttribute('data-permissao');
        novasPermissoes[permissao] = checkbox.checked;
    });
    
    // Confirmar com o usuário
    if (!confirm(`Deseja salvar as novas permissões para o perfil "${perfil.nome}"?`)) {
        return;
    }
    
    // Atualizar no storage
    if (SistemaStorage.atualizarPerfil(perfilEditandoId, { permissoes: novasPermissoes })) {
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editarPermissoesModal'));
        if (modal) modal.hide();
        
        // Atualizar lista de perfis
        carregarListaPerfis();
        
        // Se o usuário atual tiver este perfil, aplicar novas permissões
        const usuarioAtual = SistemaStorage.getUsuarioAtual();
        if (usuarioAtual && usuarioAtual.perfil_id === perfilEditandoId) {
            aplicarPermissoesInterface();
        }
        
        alert(`✅ Permissões do perfil "${perfil.nome}" atualizadas com sucesso!`);
    } else {
        alert('❌ Erro ao salvar permissões!');
    }
}

// Configurar evento do botão salvar
document.addEventListener('DOMContentLoaded', function() {
    const salvarBtn = document.getElementById('salvarPermissoesBtn');
    if (salvarBtn) {
        salvarBtn.addEventListener('click', salvarPermissoes);
    }
});

// Função auxiliar para criar módulo de permissões
function criarModuloPermissoes(titulo, id, permissoes, show = false) {
    let html = `
        <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button ${show ? '' : 'collapsed'}" type="button" 
                        data-bs-toggle="collapse" data-bs-target="#${id}">
                    📍 ${titulo}
                </button>
            </h2>
            <div id="${id}" class="accordion-collapse collapse ${show ? 'show' : ''}">
                <div class="accordion-body">
                    <div class="row">
    `;
    
    permissoes.forEach((permissao, index) => {
        html += `
            <div class="col-md-6 mb-2">
                <div class="form-check">
                    <input class="form-check-input permissao-checkbox" 
                           type="checkbox" 
                           id="perm_${permissao.id}"
                           ${permissao.checked ? 'checked' : ''}
                           data-permissao="${permissao.id}">
                    <label class="form-check-label" for="perm_${permissao.id}">
                        ${permissao.label}
                    </label>
                </div>
            </div>
        `;
    });
    
    html += `
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return html;
}

// Função para salvar permissões
function salvarPermissoesPerfil(perfilId, modalContainer) {
    const perfil = SistemaStorage.getPerfilPorId(perfilId);
    if (!perfil) return;
    
    // Coletar todas as permissões dos checkboxes
    const checkboxes = modalContainer.querySelectorAll('.permissao-checkbox');
    const novasPermissoes = {};
    
    checkboxes.forEach(checkbox => {
        const permissaoId = checkbox.getAttribute('data-permissao');
        novasPermissoes[permissaoId] = checkbox.checked;
    });
    
    // Atualizar perfil
    perfil.permissoes = novasPermissoes;
    
    if (SistemaStorage.atualizarPerfil(perfilId, { permissoes: novasPermissoes })) {
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editarPermissoesModal'));
        if (modal) modal.hide();
        
        // Atualizar lista de perfis
        carregarListaPerfis();
        
        // Aplicar novas permissões se o usuário atual foi afetado
        const usuarioAtual = SistemaStorage.getUsuarioAtual();
        if (usuarioAtual && usuarioAtual.perfil_id === perfilId) {
            aplicarPermissoesInterface();
        }
        
        alert(`✅ Permissões do perfil "${perfil.nome}" atualizadas com sucesso!`);
    } else {
        alert('❌ Erro ao salvar permissões!');
    }
}

// Função para verificar se usuário tem permissão para uma ação
function temPermissao(acao) {
    const usuario = SistemaStorage.getUsuarioAtual();
    if (!usuario) return false;
    
    // Master tem todas as permissões
    if (usuario.master) return true;
    
    // Obter perfil do usuário
    const perfil = SistemaStorage.getPerfilPorId(usuario.perfil_id);
    if (!perfil) return false;
    
    // Verificar permissão específica
    return perfil.permissoes[acao] === true;
}

// Função para aplicar permissões na interface
function aplicarPermissoesInterface() {
    const usuario = SistemaStorage.getUsuarioAtual();
    if (!usuario) return;
    
    console.log('Aplicando permissões para:', usuario.nome, 'Perfil:', SistemaStorage.getNomePerfil(usuario.perfil_id));
    
    // ========== CONTROLE DE FALTAS ==========
    
    // Botão "Nova Falta"
    const btnNovaFalta = document.querySelector('button[onclick="mostrarModalFalta()"]');
    if (btnNovaFalta) {
        if (!temPermissao('registrar_falta')) {
            btnNovaFalta.disabled = true;
            btnNovaFalta.classList.remove('btn-success');
            btnNovaFalta.classList.add('btn-secondary');
            btnNovaFalta.title = 'Sem permissão para registrar faltas';
        }
    }
    
    // Botões de ação na tabela de faltas (Editar/Excluir)
    setTimeout(() => {
        const botoesEditarFalta = document.querySelectorAll('#faltasTableBody .btn-warning');
        const botoesExcluirFalta = document.querySelectorAll('#faltasTableBody .btn-danger');
        
        if (!temPermissao('editar_falta')) {
            botoesEditarFalta.forEach(btn => {
                btn.disabled = true;
                btn.classList.remove('btn-warning');
                btn.classList.add('btn-secondary');
            });
        }
        
        if (!temPermissao('excluir_falta')) {
            botoesExcluirFalta.forEach(btn => {
                btn.disabled = true;
                btn.classList.remove('btn-danger');
                btn.classList.add('btn-secondary');
            });
        }
    }, 500); // Aguardar tabela carregar
    
    // ========== DADOS DO DOCENTE ==========
    
    // Botão "Novo Docente"
    const btnNovoDocente = document.querySelector('button[onclick="mostrarModalDocente()"]');
    if (btnNovoDocente) {
        if (!temPermissao('cadastrar_docente')) {
            btnNovoDocente.disabled = true;
            btnNovoDocente.classList.remove('btn-success');
            btnNovoDocente.classList.add('btn-secondary');
            btnNovoDocente.title = 'Sem permissão para cadastrar docentes';
        }
    }
    
    // ========== RELATÓRIOS E ESTATÍSTICAS ==========
    
    // Botão "Gerar Relatório PDF"
    const btnGerarRelatorio = document.getElementById('gerarRelatorioPDFBtn');
    if (btnGerarRelatorio && !temPermissao('gerar_relatorio_pdf')) {
        btnGerarRelatorio.disabled = true;
        btnGerarRelatorio.classList.remove('btn-success');
        btnGerarRelatorio.classList.add('btn-secondary');
        btnGerarRelatorio.title = 'Sem permissão para gerar relatórios';
    }
    
    // ========== CONFIGURAÇÕES ==========
    
    // Botão "Configurações" no cabeçalho
    const btnConfig = document.getElementById('configBtn');
    if (btnConfig && !temPermissao('acessar_configuracoes')) {
        btnConfig.disabled = true;
        btnConfig.style.display = 'none'; // Esconder completamente
    }
    
    // ========== ABA DE CONFIGURAÇÕES (se estiver aberta) ==========
    
    // Esconder abas não permitidas no modal de configurações
    const configModal = document.getElementById('configModal');
    if (configModal && configModal.classList.contains('show')) {
        aplicarPermissoesConfiguracoes();
    }
    
    console.log('Permissões aplicadas com sucesso!');
}

// Função para aplicar permissões no modal de configurações
function aplicarPermissoesConfiguracoes() {
    // Aba "Usuários" - apenas Master e Gestor podem ver
    const tabUsuarios = document.querySelector('a[href="#tabUsuarios"]');
    if (tabUsuarios && !temPermissao('gerenciar_usuarios')) {
        tabUsuarios.parentElement.style.display = 'none';
    }
    
    // Aba "Perfis" - apenas Master e Gestor podem ver
    const tabPerfis = document.querySelector('a[href="#tabPerfis"]');
    if (tabPerfis && !temPermissao('gerenciar_perfis')) {
        tabPerfis.parentElement.style.display = 'none';
    }
    
    // Aba "Logs" - apenas Master e Gestor podem ver
    const tabLogs = document.querySelector('a[href="#tabLogs"]');
    if (tabLogs && !temPermissao('visualizar_logs')) {
        tabLogs.parentElement.style.display = 'none';
    }
}

// ========== FUNÇÃO VERIFICAR PERMISSÃO EXECUÇÃO ==========
function verificarPermissaoExecucao(acao, callback, mensagemErro = 'Você não tem permissão para esta ação!') {
    if (temPermissao(acao)) {
        callback();
    } else {
        alert('❌ ' + mensagemErro);
    }
}

// ========== FUNÇÃO TOGGLE CAMPO JUSTIFICATIVA ==========
function toggleCampoJustificativa() {
    console.log('Toggle justificativa chamado');
    
    const faltaJustificada = document.getElementById('faltaJustificada');
    const justificativaContainer = document.getElementById('justificativaContainer');
    const justificativaSelect = document.getElementById('justificativaSelect');
    
    if (!faltaJustificada || !justificativaContainer) {
        console.log('Elementos não encontrados');
        return;
    }
    
    console.log('Valor selecionado:', faltaJustificada.value);
    
    if (faltaJustificada.value === 'sim') {
        console.log('Mostrando campo de justificativa');
        justificativaContainer.classList.remove('hidden');
        
        // Se não houver justificativas cadastradas, mostrar mensagem
        if (justificativaSelect && justificativaSelect.options.length <= 1) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Nenhuma justificativa cadastrada';
            option.disabled = true;
            option.selected = true;
            justificativaSelect.innerHTML = '';
            justificativaSelect.appendChild(option);
        }
    } else {
        console.log('Escondendo campo de justificativa');
        justificativaContainer.classList.add('hidden');
        if (justificativaSelect) justificativaSelect.value = '';
    }
}

// Configurar evento do select de justificativa
document.addEventListener('DOMContentLoaded', function() {
    const faltaJustificada = document.getElementById('faltaJustificada');
    if (faltaJustificada) {
        // Remover listeners antigos para evitar duplicação
        const novoSelect = faltaJustificada.cloneNode(true);
        faltaJustificada.parentNode.replaceChild(novoSelect, faltaJustificada);
        
        // Adicionar novo listener
        novoSelect.addEventListener('change', toggleCampoJustificativa);
        console.log('Evento de justificativa configurado');
    }
});


// ========== MODIFICAÇÕES NAS FUNÇÕES EXISTENTES ==========

// Substituir chamadas diretas por verificações de permissão
window.mostrarModalDocente = function() {
    verificarPermissaoExecucao('cadastrar_docente', function() {
        abrirModalDocenteAvancado();
    }, 'Você não tem permissão para cadastrar docentes!');
};

window.mostrarModalFalta = function() {
    verificarPermissaoExecucao('registrar_falta', function() {
        abrirModalFalta();
    }, 'Você não tem permissão para registrar faltas!');
};

window.editarDocente = function(id) {
    verificarPermissaoExecucao('editar_docente', function() {
        const docente = SistemaStorage.getDocentePorId(id);
        if (docente) {
            abrirModalDocenteAvancado(id);
        } else {
            alert('❌ Docente não encontrado!');
        }
    }, 'Você não tem permissão para editar docentes!');
};

window.excluirDocente = function(id) {
    verificarPermissaoExecucao('excluir_docente', function() {
        const docente = SistemaStorage.getDocentePorId(id);
        if (!docente) return;
        
        // Verificar se docente tem faltas registradas
        if (docenteTemFaltas(id)) {
            alert(`❌ Não é possível excluir o docente "${docente.nome}"!\n\nExistem faltas registradas para este docente. Primeiro exclua as faltas associadas.`);
            return;
        }
        
        if (confirm(`Tem certeza que deseja excluir o docente "${docente.nome}"?`)) {
            if (SistemaStorage.removerDocente(id)) {
                atualizarTabelaDocentes();
                atualizarTabelaFaltas();
                alert('✅ Docente excluído com sucesso!');
            } else {
                alert('❌ Erro ao excluir docente.');
            }
        }
    }, 'Você não tem permissão para excluir docentes!');
};

// ========== FUNÇÃO EDITAR FALTA (CORRIGIDA) ==========
window.editarFalta = function(id) {
    verificarPermissaoExecucao('editar_falta', function() {
        console.log('Editando falta ID:', id);
        
        const falta = SistemaStorage.faltas.find(f => f.id === id);
        if (!falta) {
            alert('❌ Falta não encontrada!');
            return;
        }
        
        faltaEditandoId = id;
        
        // Primeiro, resetar o formulário
        const form = document.getElementById('faltaForm');
        if (form) form.reset();
        
        // Preencher docente primeiro
        const docenteSelect = document.getElementById('docenteSelect');
        if (docenteSelect) {
            docenteSelect.value = falta.docenteId;
        }
        
        // Carregar selects com base no docente
        carregarSelectsModalFalta(falta.docenteId);
        
        // Aguardar selects carregarem para setar os valores
        setTimeout(() => {
            console.log('Preenchendo dados da falta...');
            
            const disciplinaSelect = document.getElementById('disciplinaSelect');
            const cursoSelect = document.getElementById('cursoSelect');
            const quantidadeFaltas = document.getElementById('quantidadeFaltas');
            const faltaJustificada = document.getElementById('faltaJustificada');
            const faltaData = document.getElementById('faltaData');
            const horarioInicio = document.getElementById('faltaHorarioInicio');
            const horarioFim = document.getElementById('faltaHorarioFim');
            const observacoes = document.getElementById('faltaObservacoes');
            
            if (disciplinaSelect) disciplinaSelect.value = falta.disciplina;
            if (cursoSelect) cursoSelect.value = falta.curso;
            if (quantidadeFaltas) quantidadeFaltas.value = falta.quantidadeFaltas;
            if (faltaJustificada) {
                faltaJustificada.value = falta.justificada ? 'sim' : 'nao';
                // Chamar toggle para mostrar/esconder campo de justificativa
                toggleCampoJustificativa();
            }
            if (faltaData) faltaData.value = falta.data;
            if (horarioInicio) horarioInicio.value = falta.horarioInicio;
            if (horarioFim) horarioFim.value = falta.horarioFim;
            if (observacoes) observacoes.value = falta.observacoes || '';
            
            // Se for justificada, preencher a justificativa
            if (falta.justificada && falta.justificativa) {
                const justificativaSelect = document.getElementById('justificativaSelect');
                if (justificativaSelect) {
                    // Aguardar um pouco mais para o select ser populado
                    setTimeout(() => {
                        justificativaSelect.value = falta.justificativa;
                        console.log('Justificativa preenchida:', falta.justificativa);
                    }, 200);
                }
            }
            
        }, 500); // Aumentei o timeout para garantir
        
        // Atualizar título do modal
        const docente = SistemaStorage.getDocentePorId(falta.docenteId);
        const modalTitle = document.getElementById('faltaModalTitle');
        if (modalTitle) {
            modalTitle.textContent = `Editar Falta - ${docente?.nome || 'Docente'}`;
        }
        
        // Mostrar modal
        const modalElement = document.getElementById('addFaltaModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    }, 'Você não tem permissão para editar faltas!');
};

// ========== FUNÇÃO VALIDAR DOCENTE SELECIONADO ==========
function validarDocenteSelecionado(docenteId) {
    if (!docenteId) return true;
    
    const docente = SistemaStorage.getDocentePorId(docenteId);
    if (!docente) return false;
    
    const temDisciplinas = docente.disciplinas && docente.disciplinas.length > 0;
    const temCursos = docente.cursos && docente.cursos.length > 0;
    
    return temDisciplinas && temCursos;
}

window.excluirFalta = function(id) {
    verificarPermissaoExecucao('excluir_falta', function() {
        if (confirm('Tem certeza que deseja excluir este registro de falta?')) {
            if (SistemaStorage.removerFalta(id)) {
                atualizarTabelaFaltas();
                atualizarEstatisticasCompletas();
                atualizarFiltroAnos();
                alert('✅ Falta excluída com sucesso!');
            } else {
                alert('❌ Erro ao excluir falta.');
            }
        }
    }, 'Você não tem permissão para excluir faltas!');
};

// Modificar função salvarDocente para verificar permissões
function salvarDocente() {
    verificarPermissaoExecucao(docenteEditandoId ? 'editar_docente' : 'cadastrar_docente', function() {
        // ... (código original da função salvarDocente)
    }, docenteEditandoId ? 'Você não tem permissão para editar docentes!' : 'Você não tem permissão para cadastrar docentes!');
}

// Modificar função salvarFalta para verificar permissões
function salvarFalta() {
    verificarPermissaoExecucao(faltaEditandoId ? 'editar_falta' : 'registrar_falta', function() {
        // ... (código original da função salvarFalta)
    }, faltaEditandoId ? 'Você não tem permissão para editar faltas!' : 'Você não tem permissão para registrar faltas!');
}

// ========== ATUALIZAR INICIALIZAÇÃO ==========

// Modificar a função configurarInterface() para incluir permissões
function configurarInterface() {
    // ... (código anterior) ...
    
    // Aplicar permissões na interface
    aplicarPermissoesInterface();
    
    // Atualizar periodicamente para quando tabelas forem carregadas
    setInterval(aplicarPermissoesInterface, 1000);
}

// NO app.js, ADICIONE esta função (simplificada):

window.visualizarDetalhesPerfil = function(perfilId) {
    const perfil = SistemaStorage.getPerfilPorId(perfilId);
    if (!perfil) return;
    
    let permissaoCount = 0;
    let permissaoAllowed = 0;
    
    Object.values(perfil.permissoes).forEach(valor => {
        permissaoCount++;
        if (valor) permissaoAllowed++;
    });
    
    const porcentagem = Math.round((permissaoAllowed / permissaoCount) * 100);
    
    alert(`📊 PERFIL: ${perfil.nome}\n\n` +
          `📝 Descrição: ${perfil.descricao}\n` +
          `✅ Permissões ativas: ${permissaoAllowed}/${permissaoCount} (${porcentagem}%)\n` +
          `✏️ Editável: ${perfil.editavel ? 'Sim' : 'Não'}\n` +
          `👥 Usuários: ${SistemaStorage.usuarios.filter(u => u.perfil_id === perfilId).length}\n\n` +
          `Clique em "Editar" para ajustar as permissões.`);
};

// ========== FUNÇÃO ATUALIZAR FILTRO DE ANOS ==========

function atualizarFiltroAnos() {
    const select = document.getElementById('filtroAno');
    if (!select) return;
    
    // Extrair anos únicos das faltas
    const anosUnicos = new Set();
    SistemaStorage.faltas.forEach(falta => {
        if (falta.data) {
            const ano = new Date(falta.data).getFullYear();
            anosUnicos.add(ano);
        }
    });
    
    // Converter para array e ordenar do mais recente
    const anos = Array.from(anosUnicos).sort((a, b) => b - a);
    
    // Salvar seleção atual
    const selecaoAtual = select.value;
    
    // Limpar e reconstruir opções
    select.innerHTML = '<option value="">Todos os anos</option>';
    
    // Adicionar anos dinâmicos
    anos.forEach(ano => {
        const option = document.createElement('option');
        option.value = ano;
        option.textContent = ano;
        select.appendChild(option);
    });
    
    // Adicionar opção "Ano atual"
    const anoAtual = new Date().getFullYear();
    if (!anos.includes(anoAtual)) {
        const optionAtual = document.createElement('option');
        optionAtual.value = anoAtual;
        optionAtual.textContent = `${anoAtual} (atual)`;
        select.appendChild(optionAtual);
    }
    
    // Restaurar seleção se ainda existir
    if (selecaoAtual && Array.from(select.options).some(opt => opt.value === selecaoAtual)) {
        select.value = selecaoAtual;
    }
}

// ========== FUNÇÕES AUXILIARES PARA SELECTS ==========

function atualizarSelectsDisciplinas() {
    // Atualizar select no modal de falta
    const selectFalta = document.getElementById('disciplinaSelect');
    if (selectFalta) {
        const selectedValue = selectFalta.value;
        selectFalta.innerHTML = '<option value="">Selecione uma disciplina</option>';
        
        SistemaStorage.getDisciplinasOrdenadas().forEach(disciplina => {
            const option = document.createElement('option');
            option.value = disciplina;
            option.textContent = disciplina;
            selectFalta.appendChild(option);
        });
        
        // Restaurar seleção se ainda existir
        if (selectedValue && SistemaStorage.disciplinas.includes(selectedValue)) {
            selectFalta.value = selectedValue;
        }
    }
}

function atualizarSelectsCursos() {
    // Atualizar select no modal de falta
    const selectFalta = document.getElementById('cursoSelect');
    if (selectFalta) {
        const selectedValue = selectFalta.value;
        selectFalta.innerHTML = '<option value="">Selecione um curso</option>';
        
        SistemaStorage.getCursosOrdenados().forEach(curso => {
            const option = document.createElement('option');
            option.value = curso;
            option.textContent = curso;
            selectFalta.appendChild(option);
        });
        
        // Restaurar seleção se ainda existir
        if (selectedValue && SistemaStorage.cursos.includes(selectedValue)) {
            selectFalta.value = selectedValue;
        }
    }
}

function atualizarSelectsJustificativas() {
    const selectFalta = document.getElementById('justificativaSelect');
    if (selectFalta) {
        const selectedValue = selectFalta.value;
        selectFalta.innerHTML = '<option value="">Selecione uma justificativa</option>';
        
        SistemaStorage.getJustificativasOrdenadas().forEach(justificativa => {
            const option = document.createElement('option');
            option.value = justificativa;
            option.textContent = justificativa;
            selectFalta.appendChild(option);
        });
        
        if (selectedValue && SistemaStorage.justificativas.includes(selectedValue)) {
            selectFalta.value = selectedValue;
        }
    }
}

function configurarInterface() {
    // Configurar datas
    const hoje = new Date();
    const dataInicio = document.getElementById('dataInicio');
    const dataFim = document.getElementById('dataFim');
    
    if (dataInicio) {
        dataInicio.value = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
            .toISOString().split('T')[0];
    }
    if (dataFim) {
        dataFim.value = hoje.toISOString().split('T')[0];
    }
    
    // Atualizar tabelas
    atualizarTabelaDocentes(); 
    atualizarTabelaFaltas();
    atualizarEstatisticasCompletas();
    carregarResumoFaltasPorDocente(); // Carrega sem filtro inicialmente
    
    // Atualizar filtro de anos dinamicamente
    atualizarFiltroAnos(); // ← ESTA LINHA DEVE ESTAR AQUI
    
    // Definir filtro "Todos" como ativo inicialmente
    setFiltroAtivo('todos');
}

// ========== FUNÇÃO SALVAR USUÁRIO ==========
function salvarUsuario() {
    console.log('📝 [DEBUG] salvarUsuario INICIADO');
    
    const usuarioId = usuarioEditandoId;
    const nome = document.getElementById('usuarioNome')?.value.trim();
    const cpf = document.getElementById('usuarioCPF')?.value;
    const email = document.getElementById('usuarioEmail')?.value.trim();
    const perfilId = parseInt(document.getElementById('usuarioPerfil')?.value);
    const ativo = document.getElementById('usuarioAtivo')?.checked;
    
    // 🔴 USANDO OS IDs CORRETOS
    const senha = document.getElementById('usuarioSenha')?.value;
    const confirmarSenha = document.getElementById('usuarioConfirmarSenha')?.value;
    const senhaGeradaContainer = document.getElementById('senhaGeradaContainer');
    
    console.log('📝 [DEBUG] Dados do formulário:', { 
        usuarioId, nome, cpf, email, perfilId, ativo,
        temSenha: !!senha
    });
    
    // Validações básicas
    if (!nome) {
        alert('❌ Digite o nome do usuário!');
        return;
    }
    
    if (!cpf || cpf.length !== 14) {
        alert('❌ Digite um CPF válido!');
        return;
    }
    
    if (!perfilId) {
        alert('❌ Selecione um perfil!');
        return;
    }
    
    // ===== VALIDAÇÃO DE SENHA =====
    // Verificar se a senha foi preenchida (quando aplicável)
    if (senha) {
        // Verificar tamanho mínimo
        if (senha.length < 6) {
            alert('❌ A senha deve ter pelo menos 6 caracteres!');
            return;
        }
        
        // Verificar se as senhas coincidem
        if (senha !== confirmarSenha) {
            alert('❌ As senhas não coincidem!');
            return;
        }
    } else {
        // Se não tem senha e é novo usuário, pode definir uma padrão?
        if (!usuarioId) {
            alert('❌ Digite uma senha para o novo usuário!');
            return;
        }
        // Se é edição e não preencheu senha, mantém a atual
    }
    
    // Preparar dados do usuário
    const dadosUsuario = {
        nome: nome,
        cpf: cpf,
        email: email || '',
        perfil_id: perfilId,
        ativo: ativo !== false,
        forcarTrocaSenha: document.getElementById('forcarTrocaSenha')?.checked || false
    };
    
    // Adicionar senha se foi fornecida
    if (senha) {
        dadosUsuario.senha_hash = senha;
        console.log('📝 [DEBUG] Senha definida manualmente');
    }
    
    console.log('📝 [DEBUG] Chamando SistemaStorage.adicionarUsuario...');
    
    let resultado = false;
    let mensagem = '';
    
    if (usuarioId) {
        // Editar usuário existente
        resultado = SistemaStorage.atualizarUsuario(usuarioId, dadosUsuario);
        mensagem = resultado ? 
            '✅ Usuário atualizado com sucesso!' : 
            '❌ Erro ao atualizar usuário!';
    } else {
        // Novo usuário
        const id = SistemaStorage.adicionarUsuario(dadosUsuario);
        resultado = !!id;
        mensagem = resultado ? 
            '✅ Usuário cadastrado com sucesso!' : 
            '❌ Erro ao cadastrar usuário!';
    }
    
    if (resultado) {
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addUsuarioModal'));
        if (modal) modal.hide();
        
        // ATUALIZAR LISTA DE USUÁRIOS
        carregarListaUsuarios();
        
        alert(mensagem);
    } else {
        alert(mensagem);
    }
}


// ========== CONFIGURAR EVENTOS ==========

function configurarEventos() {
    console.log('Configurando eventos...');
    
    // Botão Sair
    document.getElementById('logoutBtn')?.addEventListener('click', function() {
        SistemaStorage.logout();
        window.location.href = 'login.html';
    });
    
    // Botão Configurações
    document.getElementById('configBtn')?.addEventListener('click', function() {
    mostrarModalConfiguracoes();
    });
    
    // Botão Limpar Filtros
    document.getElementById('limparFiltrosBtn')?.addEventListener('click', function() {
        document.getElementById('filtroMes').value = '';
        document.getElementById('filtroAno').value = '';
        document.getElementById('filtroDocente').value = '';
        atualizarTabelaFaltas();
        console.log('✅ Filtros limpos!');
    });
    
    // Filtros
    document.getElementById('filtroMes')?.addEventListener('change', atualizarTabelaFaltas);
    document.getElementById('filtroAno')?.addEventListener('change', atualizarTabelaFaltas);
    document.getElementById('filtroDocente')?.addEventListener('change', atualizarTabelaFaltas);
    
    // Botão salvar falta
    document.getElementById('salvarFaltaBtn')?.addEventListener('click', salvarFalta);
    
    // Botão salvar docente
    document.getElementById('salvarDocenteBtn')?.addEventListener('click', salvarDocente);
    
    // Botões de configurações
    document.getElementById('btnNovaDisciplina')?.addEventListener('click', abrirModalAdicionarDisciplina);
    document.getElementById('btnNovoCurso')?.addEventListener('click', abrirModalAdicionarCurso);
    document.getElementById('btnNovaJustificativa')?.addEventListener('click', abrirModalAdicionarJustificativa);
    
    // Botões de salvar nas configurações
    document.getElementById('salvarDisciplinaBtn')?.addEventListener('click', salvarDisciplina);
    document.getElementById('salvarCursoBtn')?.addEventListener('click', salvarCurso);
    document.getElementById('salvarJustificativaBtn')?.addEventListener('click', salvarJustificativa);
    
    // Busca nas configurações
    document.getElementById('buscaDisciplina')?.addEventListener('input', filtrarDisciplinas);
    document.getElementById('buscaCurso')?.addEventListener('input', filtrarCursos);
    document.getElementById('buscaJustificativaConfig')?.addEventListener('input', filtrarJustificativasConfig);

    // Preencher filtro de usuários nos logs
    const filtroLogUsuario = document.getElementById('filtroLogUsuario');
    if (filtroLogUsuario) {
        // Adicionar opção "Todos"
        filtroLogUsuario.innerHTML = '<option value="">Todos os usuários</option>';
        
        // Adicionar usuários
        SistemaStorage.usuarios.forEach(usuario => {
            const option = document.createElement('option');
            option.value = usuario.id;
            option.textContent = usuario.nome;
            filtroLogUsuario.appendChild(option);
        });
    }
    
    // Botão aplicar filtro de logs
    const btnAplicarFiltroLogs = document.getElementById('btnAplicarFiltroLogs');
    if (btnAplicarFiltroLogs) {
        btnAplicarFiltroLogs.addEventListener('click', carregarLogs);
    }
    
    // ========== FILTROS DE DOCENTES ==========
    
    // Botão Limpar Busca
    document.getElementById('limparBuscaBtn')?.addEventListener('click', function() {
        document.getElementById('buscaDocente').value = '';
        buscaAtual = '';
        atualizarTabelaDocentes();
    });
    
    // Busca em tempo real
    document.getElementById('buscaDocente')?.addEventListener('input', function() {
        buscaAtual = this.value.trim();
        atualizarTabelaDocentes();
    });
    
    // Filtro: Todos
    document.getElementById('filtroTodos')?.addEventListener('click', function() {
        setFiltroAtivo('todos');
        filtroStatusAtual = 'todos';
        atualizarTabelaDocentes();
    });
    
    // Filtro: Ativos
    document.getElementById('filtroAtivos')?.addEventListener('click', function() {
        setFiltroAtivo('ativos');
        filtroStatusAtual = 'ativos';
        atualizarTabelaDocentes();
    });
    
    // Filtro: Inativos
    document.getElementById('filtroInativos')?.addEventListener('click', function() {
        setFiltroAtivo('inativos');
        filtroStatusAtual = 'inativos';
        atualizarTabelaDocentes();
    });
    
    // ========== BOTÕES DO Relatórios e Estatísticas ==========
    
    // Botão aplicar filtro de estatísticas
    document.getElementById('aplicarFiltroBtn')?.addEventListener('click', aplicarFiltroEstatisticas);
    
    // Botão gerar relatório PDF
    document.getElementById('gerarRelatorioPDFBtn')?.addEventListener('click', gerarRelatorioDocentes);
    
    // Botão limpar busca de justificativas
    document.getElementById('limparBuscaJustificativa')?.addEventListener('click', function() {
        document.getElementById('buscaJustificativa').value = '';
        carregarJustificativas();
    });
    
    console.log('Eventos configurados com sucesso!');

    // ========== NOVOS EVENTOS PARA GERENCIAMENTO DE USUÁRIOS ==========
    
     // ========== NOVOS EVENTOS ==========
    
    // Botão Novo Usuário (COM VERIFICAÇÃO DE EXISTÊNCIA)
    const btnNovoUsuario = document.getElementById('btnNovoUsuario');
    if (btnNovoUsuario) {
        btnNovoUsuario.addEventListener('click', function() {
            if (!temPermissao('gerenciar_usuarios')) {
                alert('❌ Você não tem permissão para gerenciar usuários!');
                return;
            }
            
            usuarioEditandoId = null;
            abrirModalUsuario();
        });
    }
    
    // Botão salvar usuário
    const salvarUsuarioBtn = document.getElementById('salvarUsuarioBtn');
    if (salvarUsuarioBtn) {
        salvarUsuarioBtn.addEventListener('click', salvarUsuario);
    }
    
    // Busca de usuários
    const buscaUsuario = document.getElementById('buscaUsuario');
    if (buscaUsuario) {
        buscaUsuario.addEventListener('input', filtrarUsuarios);
    }
    
    // ========== ATUALIZAR OBSERVADOR DE ABAS ==========
    configurarObservadorAbas();
}

// ========== FUNÇÕES PARA GERENCIAMENTO DE USUÁRIOS ==========

window.editarUsuario = function(id) {
    if (!temPermissao('editar_usuario')) {
        alert('❌ Você não tem permissão para editar usuários!');
        return;
    }
    
    const usuario = SistemaStorage.getUsuarioPorId(id);
    if (usuario) {
        usuarioEditandoId = id;
        abrirModalUsuario(id);
    } else {
        alert('❌ Usuário não encontrado!');
    }
};

window.excluirUsuario = function(id) {
    if (!temPermissao('gerenciar_usuarios')) {
        alert('❌ Você não tem permissão para excluir usuários!');
        return;
    }
    
    const usuario = SistemaStorage.getUsuarioPorId(id);
    if (!usuario) return;
    
    // Verificar se pode excluir
    if (!SistemaStorage.usuarioPodeSerExcluido(id)) {
        alert(`❌ Não é possível excluir o usuário "${usuario.nome}"!\n\nEste usuário tem registros associados no sistema.`);
        return;
    }
    
    if (confirm(`Tem certeza que deseja excluir o usuário "${usuario.nome}"?\n\nCPF: ${usuario.cpf}\n\nEsta ação não poderá ser desfeita.`)) {
        if (SistemaStorage.removerUsuario(id)) {
            carregarListaUsuarios();
            alert('✅ Usuário excluído com sucesso!');
        } else {
            alert('❌ Erro ao excluir usuário.');
        }
    }
};

/// ========== FUNÇÃO ABRIR MODAL USUÁRIO ==========
function abrirModalUsuario(id = null) {
    usuarioEditandoId = id;
    
    const modalTitle = document.getElementById('usuarioModalTitle');
    const usuarioForm = document.getElementById('usuarioForm');
    
    // 🔴 USANDO OS IDs CORRETOS DO HTML
    const usuarioSenha = document.getElementById('usuarioSenha');
    const usuarioConfirmarSenha = document.getElementById('usuarioConfirmarSenha');
    const usuarioPerfil = document.getElementById('usuarioPerfil');
    const usuarioAtivo = document.getElementById('usuarioAtivo');
    const gerarSenhaBtn = document.getElementById('gerarSenhaBtn');
    const senhaGeradaContainer = document.getElementById('senhaGeradaContainer');
    
    // Log para debug
    console.log('Elementos encontrados:', {
        usuarioSenha: !!usuarioSenha,
        usuarioConfirmarSenha: !!usuarioConfirmarSenha,
        usuarioPerfil: !!usuarioPerfil,
        usuarioAtivo: !!usuarioAtivo,
        gerarSenhaBtn: !!gerarSenhaBtn
    });
    
    // Resetar formulário
    if (usuarioForm) usuarioForm.reset();
    
    // Esconder container de senha gerada
    if (senhaGeradaContainer) senhaGeradaContainer.style.display = 'none';
    
    // Carregar perfis no select
    if (usuarioPerfil) {
        usuarioPerfil.innerHTML = '<option value="">Selecione um perfil</option>';
        
        SistemaStorage.perfis
            .filter(p => p.predefinido && p.nome !== 'Master')
            .forEach(perfil => {
                const option = document.createElement('option');
                option.value = perfil.id;
                option.textContent = perfil.nome;
                usuarioPerfil.appendChild(option);
            });
    }
    
    // Se for edição, carregar dados
    if (id) {
        const usuario = SistemaStorage.getUsuarioPorId(id);
        if (usuario) {
            modalTitle.textContent = 'Editar Usuário';
            
            document.getElementById('usuarioNome').value = usuario.nome;
            document.getElementById('usuarioCPF').value = usuario.cpf;
            document.getElementById('usuarioEmail').value = usuario.email || '';
            if (usuarioPerfil) usuarioPerfil.value = usuario.perfil_id;
            if (usuarioAtivo) usuarioAtivo.checked = usuario.ativo !== false;
            
            // 🔴 MOSTRAR O BOTÃO "GERAR NOVA SENHA" NA EDIÇÃO
             if (gerarSenhaBtn) {
                gerarSenhaBtn.style.display = 'inline-block';
        
                // Configurar o botão para mostrar os campos de senha
                gerarSenhaBtn.onclick = function() {
                     // Mostrar os campos de senha
                    if (usuarioSenha) {
                    usuarioSenha.parentElement.parentElement.style.display = 'block';
                    usuarioSenha.value = '';
                    }
                    if (usuarioConfirmarSenha) {
                    usuarioConfirmarSenha.parentElement.parentElement.style.display = 'block';
                    usuarioConfirmarSenha.value = '';
                    }
            
                    // 🔥 NOVO: Mostrar o checkbox de forçar troca de senha
                    const forcarTrocaContainer = document.getElementById('forcarTrocaContainer');
                    if (forcarTrocaContainer) {
                         forcarTrocaContainer.style.display = 'block';
                    }
            
                    // Esconder o botão após clicar
                    gerarSenhaBtn.style.display = 'none';
                };
            }
            
            // 🔴 ESCONDER OS CAMPOS DE SENHA INICIALMENTE
            if (usuarioSenha) usuarioSenha.parentElement.parentElement.style.display = 'none';
            if (usuarioConfirmarSenha) usuarioConfirmarSenha.parentElement.parentElement.style.display = 'none';
        }

        
    } else {
    modalTitle.textContent = 'Cadastrar Usuário';
    
        // 🔴 PARA NOVO USUÁRIO, MOSTRAR OS CAMPOS DE SENHA
            if (usuarioSenha) {
            usuarioSenha.parentElement.parentElement.style.display = 'block';
            usuarioSenha.value = '';
            }
            if (usuarioConfirmarSenha) {
            usuarioConfirmarSenha.parentElement.parentElement.style.display = 'block';
            usuarioConfirmarSenha.value = '';
            }
    
            // 🔴 ESCONDER O BOTÃO "GERAR NOVA SENHA" NO NOVO USUÁRIO
            if (gerarSenhaBtn) gerarSenhaBtn.style.display = 'none';
            
            // 🔥 NOVO: Esconder o checkbox de forçar troca de senha
            const forcarTrocaContainer = document.getElementById('forcarTrocaContainer');
            if (forcarTrocaContainer) {
            forcarTrocaContainer.style.display = 'none';
        }
    }
    
    // Configurar máscara de CPF
    const cpfInput = document.getElementById('usuarioCPF');
    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length > 3) {
                value = value.replace(/^(\d{3})(\d)/, '$1.$2');
            }
            if (value.length > 6) {
                value = value.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
            }
            if (value.length > 9) {
                value = value.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
            }
            if (value.length > 11) {
                value = value.substring(0, 14);
            }
            
            e.target.value = value;
        });
    }
    
    // Mostrar modal
    const modalElement = document.getElementById('addUsuarioModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

// ========== FUNÇÃO CARREGAR LISTA DE USUÁRIOS ==========
window.carregarListaUsuarios = function() {
    console.log('📝 [DEBUG] carregarListaUsuarios INICIADO');
    
    const lista = document.getElementById('listaUsuarios');
    
    if (!lista) {
        console.log('⚠️ [DEBUG] Elemento #listaUsuarios não encontrado');
        return;
    }

    // ✅ CORREÇÃO PRINCIPAL — LIMPAR A LISTA ANTES DE RENDERIZAR
    lista.innerHTML = '';
    
    // VERIFICAR DIRETAMENTE DO LOCALSTORAGE
    const usuariosStorage = localStorage.getItem('sistema_faltas_usuarios');
    console.log('📝 [DEBUG] Usuários no localStorage:', usuariosStorage ? JSON.parse(usuariosStorage).length : 0);
    
    // USAR TODOS OS USUÁRIOS (FILTRAR APENAS O MASTER SE QUISER)
    console.log('📝 [DEBUG] Usuários no SistemaStorage:', SistemaStorage.usuarios.length);
    
    // Mostrar todos os usuários, exceto o Master
    const usuarios = SistemaStorage.usuarios.filter(u => u.id !== 1);
    
    console.log('📝 [DEBUG] Usuários para exibir:', usuarios.length);
    
    if (usuarios.length === 0) {
        lista.innerHTML = `
            <div class="list-group-item text-center text-muted py-4">
                <i class="fas fa-users fa-2x mb-2"></i>
                <p class="mb-0">Nenhum usuário cadastrado</p>
                <small>Clique em "Novo Usuário" para adicionar</small>
            </div>
        `;
        return;
    }
    
    // Ordenar por nome
    const usuariosOrdenados = [...usuarios].sort((a, b) => 
        a.nome.localeCompare(b.nome)
    );
    
    usuariosOrdenados.forEach(usuario => {
        const perfil = SistemaStorage.getPerfilPorId(usuario.perfil_id);
        const perfilNome = perfil ? perfil.nome : 'Desconhecido';
        
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex justify-content-between align-items-center';
        item.innerHTML = `
            <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${usuario.nome}</h6>
                        <div class="small text-muted">
                            <i class="fas fa-id-card me-1"></i> ${usuario.cpf}
                            ${usuario.email ? `<br><i class="fas fa-envelope me-1"></i> ${usuario.email}` : ''}
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="badge ${usuario.ativo ? 'bg-success' : 'bg-secondary'} mb-1">
                            ${usuario.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                        <br>
                        <small class="text-muted">${perfilNome}</small>
                    </div>
                </div>
                <div class="small text-muted mt-2">
                    <i class="fas fa-calendar me-1"></i> Cadastrado em: ${usuario.data_cadastro}
                    ${usuario.ultimo_login ? `<br><i class="fas fa-sign-in-alt me-1"></i> Último login: ${new Date(usuario.ultimo_login).toLocaleString('pt-BR')}` : ''}
                </div>
            </div>
            <div class="btn-group ms-3" role="group">
                <button class="btn btn-warning btn-sm me-1" onclick="editarUsuario(${usuario.id})"
                        ${!temPermissao('editar_usuario') ? 'disabled' : ''}>
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="excluirUsuario(${usuario.id})"
                        ${!temPermissao('gerenciar_usuarios') ? 'disabled' : ''}>
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        lista.appendChild(item);
    });
};

// ========== FUNÇÃO PARA LIMPAR MODAL DE CONFIGURAÇÕES ==========

function limparModalConfiguracoes() {
    console.log('🧹 Limpando modal de configurações...');
    
    // Limpar busca dos inputs (apenas isso, não limpar as listas inteiras)
    const buscaInputs = [
        'buscaDisciplina', 
        'buscaCurso', 
        'buscaJustificativaConfig',
        'buscaUsuario'
    ];
    
    buscaInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });
    
    // NÃO limpar as listas - elas serão recarregadas quando abrir novamente
    // Isso evita que os dados sumam visualmente
    
    console.log('✅ Modal limpo!');
}

// ========== FUNÇÃO CARREGAR LOGS ==========

function carregarLogs() {
    const tabela = document.getElementById('tabelaLogs');
    const contador = document.getElementById('contadorLogs');
    if (!tabela) return;
    
    tabela.innerHTML = '';
    
    // Obter filtros
    const filtroUsuario = document.getElementById('filtroLogUsuario')?.value || '';
    const filtroPerfil = document.getElementById('filtroLogPerfil')?.value || '';
    const filtroModulo = document.getElementById('filtroLogModulo')?.value || '';
    const filtroPeriodo = document.getElementById('filtroLogPeriodo')?.value || '30dias';
    
    // Aplicar filtros básicos
    let logsFiltrados = [...SistemaStorage.logs];
    
    // Filtrar por período
    if (filtroPeriodo !== 'todos') {
        const hoje = new Date();
        let dataLimite = new Date();
        
        switch(filtroPeriodo) {
            case 'hoje':
                dataLimite.setHours(0, 0, 0, 0);
                break;
            case 'ontem':
                dataLimite.setDate(hoje.getDate() - 1);
                dataLimite.setHours(0, 0, 0, 0);
                break;
            case '30dias':
                dataLimite.setDate(hoje.getDate() - 30);
                break;
        }
        
        logsFiltrados = logsFiltrados.filter(log => {
            const dataLog = new Date(log.data);
            return dataLog >= dataLimite;
        });
    }
    
    // Filtrar por perfil
    if (filtroPerfil) {
        logsFiltrados = logsFiltrados.filter(log => log.usuario_perfil === filtroPerfil);
    }
    
    // Filtrar por módulo
    if (filtroModulo) {
        logsFiltrados = logsFiltrados.filter(log => log.modulo === filtroModulo);
    }
    
    if (logsFiltrados.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="fas fa-search fa-2x mb-2"></i>
                    <p class="mb-0">Nenhum registro encontrado</p>
                </td>
            </tr>
        `;
        if (contador) contador.textContent = '0';
        return;
    }
    
    // Mostrar logs (limitado a 100 para performance)
    const logsLimitados = logsFiltrados.slice(0, 100);
    
    logsLimitados.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${log.data}</td>
            <td>${log.usuario_nome}</td>
            <td><span class="badge bg-info">${log.usuario_perfil}</span></td>
            <td>${log.modulo}</td>
            <td><span class="badge bg-secondary">${log.acao}</span></td>
            <td><small class="text-muted">${log.detalhes}</small></td>
            <td><code>${log.ip}</code></td>
        `;
        tabela.appendChild(tr);
    });
    
    if (contador) {
        contador.textContent = logsLimitados.length;
    }
}

// Configurar observador de abas
function configurarObservadorAbas() {
    const tabs = document.querySelectorAll('a[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(e) {
            const targetTab = e.target.getAttribute('href');
            console.log('Aba aberta:', targetTab);
            
            setTimeout(() => {
                switch(targetTab) {
                    case '#justificativas':
                        console.log('Carregando justificativas...');
                        carregarJustificativas();
                        break;
                        
                    case '#controle':
                        console.log('Carregando estatísticas...');
                        atualizarEstatisticasCompletas();
                        carregarResumoFaltasPorDocente();
                        break;
                        
                    case '#tabUsuarios':
                        console.log('Carregando usuários...');
                        carregarListaUsuarios();
                        break;
                        
                    case '#tabPerfis':
                        console.log('Carregando perfis...');
                        carregarListaPerfis();
                        break;
                        
                    case '#tabLogs':
                        console.log('Carregando logs...');
                        carregarLogs();
                        break;
                }
            }, 100);
        });
    });
}

// ========== FUNÇÕES DE NAVEGAÇÃO ==========

// Modal Configurações

function mostrarModalConfiguracoes() {
    console.log('🔧 Abrindo modal de configurações...');
    
    // Carregar TODAS as listas
    carregarListaDisciplinas();
    carregarListaCursos();
    carregarListaJustificativasConfig();
    carregarListaUsuarios(); 
    carregarListaPerfis();   
    
    // Aplicar permissões
    aplicarPermissoesConfiguracoes();
    
    // Mostrar modal
    const modalElement = document.getElementById('configModal');
    if (modalElement) {
        // --- CORREÇÃO: Remover event listeners antigos de forma segura ---
        
        // Criar uma nova referência do modal (sem clonar o elemento todo)
        const modal = new bootstrap.Modal(modalElement, {
            backdrop: 'static',
            keyboard: true
        });
        
        // Remover listeners antigos (se existirem)
        modalElement.removeEventListener('hidden.bs.modal', limparModalConfiguracoes);
        
        // Adicionar listener NOVO e CORRETO
        modalElement.addEventListener('hidden.bs.modal', function() {
            console.log('Modal fechado, limpando...');
            
            // 1. Remover foco de qualquer elemento ativo
            if (document.activeElement) {
                document.activeElement.blur();
            }
            
            // 2. Remover backdrops que possam ter ficado
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            
            // 3. Restaurar body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            
            // 4. Remover aria-hidden
            modalElement.removeAttribute('aria-hidden');
            
            // 5. Limpar os dados (com delay para garantir)
            setTimeout(() => {
                limparModalConfiguracoes();
            }, 100);
        });
        
        // Mostrar o modal
        modal.show();
        
        // Garantir que a primeira aba visível seja ativada
        setTimeout(() => {
            const primeiraTab = document.querySelector('#configTabs .nav-link:not([style*="display: none"])');
            if (primeiraTab) {
                primeiraTab.click();
            }
        }, 200);
        
    } else {
        console.error('❌ Modal de configurações não encontrado!');
        alert('Erro ao abrir configurações. Recarregue a página.');
    }
}

// Função auxiliar para configurar abas
function configurarTabsConfig() {
    const tabs = document.querySelectorAll('#configTabs .nav-link');
    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href');
            
            // Remover active de todas
            tabs.forEach(t => t.classList.remove('active'));
            
            // Adicionar active na clicada
            this.classList.add('active');
            
            // Esconder todos os painéis
            document.querySelectorAll('#configModal .tab-pane').forEach(pane => {
                pane.classList.remove('show', 'active');
            });
            
            // Mostrar o painel alvo
            const targetPane = document.querySelector(target);
            if (targetPane) {
                targetPane.classList.add('show', 'active');
            }
        });
    });
}

// ========== FUNÇÕES DE TABELA ==========

function atualizarTabelaDocentes() {
    const tbody = document.getElementById('docentesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const docentes = SistemaStorage.docentes;
    
    // Aplicar filtros
    const docentesFiltrados = docentes.filter(docente => {
        // Filtro por status
        if (filtroStatusAtual === 'ativos' && !docente.ativo) return false;
        if (filtroStatusAtual === 'inativos' && docente.ativo) return false;
        
        // Filtro por busca (nome)
        if (buscaAtual) {
            const nomeNormalizado = docente.nome.toLowerCase();
            const buscaNormalizada = buscaAtual.toLowerCase();
            return nomeNormalizado.includes(buscaNormalizada);
        }
        
        return true;
    });
    
    // Atualizar contador
    atualizarContadorDocentes(docentesFiltrados.length, docentes.length);
    
    if (docentesFiltrados.length === 0) {
        let mensagem = '';
        if (buscaAtual) {
            mensagem = `Nenhum docente encontrado para "${buscaAtual}"`;
        } else if (filtroStatusAtual === 'ativos') {
            mensagem = 'Nenhum docente ativo encontrado';
        } else if (filtroStatusAtual === 'inativos') {
            mensagem = 'Nenhum docente inativo encontrado';
        } else {
            mensagem = 'Nenhum docente cadastrado';
        }
        
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="fas fa-user-slash fa-2x mb-2"></i>
                    <p class="mb-0">${mensagem}</p>
                    ${!buscaAtual ? '<small>Clique em "Novo Docente" para adicionar</small>' : ''}
                </td>
            </tr>
        `;
        
        // Atualizar selects de docentes (apenas ativos para faltas)
        atualizarSelectsDocentes();
        return;
    }
    
    // Ordenar por nome
    const docentesOrdenados = [...docentesFiltrados].sort((a, b) => 
        a.nome.localeCompare(b.nome)
    );
    
    docentesOrdenados.forEach(docente => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${docente.id}</td>
            <td>${docente.nome}</td>
            <td>${docente.disciplinas.join(', ')}</td>
            <td>${docente.cursos.join(', ')}</td>
            <td>${docente.aulas}</td>
            <td>
                ${docente.ativo ? 
                    '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i> Ativo</span>' : 
                    '<span class="badge bg-secondary"><i class="fas fa-times-circle me-1"></i> Inativo</span>'}
            </td>
            <td>
                <button class="btn btn-warning btn-sm me-1" onclick="editarDocente(${docente.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="excluirDocente(${docente.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Atualizar selects de docentes
    atualizarSelectsDocentes();
}

// Função para atualizar selects de docentes
function atualizarSelectsDocentes() {
    const select = document.getElementById('docenteSelect');
    const filtro = document.getElementById('filtroDocente');
    
    if (select) {
        select.innerHTML = '<option value="">Selecione um docente</option>';
        SistemaStorage.docentes.forEach(docente => {
            // Apenas docentes ATIVOS para novas faltas
            if (docente.ativo) {
                const option = document.createElement('option');
                option.value = docente.id;
                option.textContent = docente.nome;
                select.appendChild(option);
            }
        });
    }
    
    if (filtro) {
        filtro.innerHTML = '<option value="">Todos os docentes</option>';
        SistemaStorage.docentes.forEach(docente => {
            // Para filtro de faltas, mostrar todos os docentes (ativos e inativos)
            const option = document.createElement('option');
            option.value = docente.id;
            option.textContent = docente.nome;
            filtro.appendChild(option);
        });
    }
}

// Função para atualizar contador
function atualizarContadorDocentes(mostrando, total) {
    const totalMostrado = document.getElementById('totalMostrado');
    const totalGeral = document.getElementById('totalGeral');
    
    if (totalMostrado && totalGeral) {
        totalMostrado.textContent = mostrando;
        totalGeral.textContent = total;
    }
}

// ========== FUNÇÃO ATUALIZAR TABELA DE FALTAS ==========

function atualizarTabelaFaltas() {
    const tbody = document.getElementById('faltasTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const faltas = SistemaStorage.faltas;
    
    if (faltas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center text-muted py-4">
                    <i class="fas fa-clipboard-list fa-2x mb-2"></i>
                    <p class="mb-0">Nenhuma falta registrada</p>
                    <small>Clique em "Nova Falta" para adicionar</small>
                </td>
            </tr>
        `;
        return;
    }
    
    // Ordenar por data (mais recente primeiro) - USANDO DATA CORRIGIDA
    const faltasOrdenadas = [...faltas].sort((a, b) => {
        const dataA = corrigirData(a.data);
        const dataB = corrigirData(b.data);
        return dataB - dataA;
    });
    
    // Aplicar filtros
    const mesFiltro = document.getElementById('filtroMes')?.value;
    const anoFiltro = document.getElementById('filtroAno')?.value;
    const docenteFiltro = document.getElementById('filtroDocente')?.value;
    
    faltasOrdenadas.forEach(falta => {
        // USAR DATA CORRIGIDA PARA FILTROS
        const dataFalta = corrigirData(falta.data);
        
        // Verificar filtros
        if (mesFiltro) {
            const mes = dataFalta.getMonth() + 1;
            if (mes.toString().padStart(2, '0') !== mesFiltro) return;
        }
        
        if (anoFiltro) {
            const ano = dataFalta.getFullYear();
            if (ano.toString() !== anoFiltro) return;
        }
        
        if (docenteFiltro) {
            if (falta.docenteId.toString() !== docenteFiltro) return;
        }
        
        const docente = SistemaStorage.getDocentePorId(falta.docenteId) || 
                       { nome: 'Docente não encontrado' };
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${docente.nome}</td>
            <td>${falta.disciplina}</td>
            <td>${falta.curso}</td>
            <td>${formatarDataCorreta(falta.data)}</td>
            <td>${falta.horarioInicio}</td>
            <td>${falta.horarioFim}</td>
            <td>${falta.quantidadeFaltas}</td>
            <td>${falta.justificada ? (falta.justificativa || 'Sim') : 'Não'}</td>
            <td>${falta.observacoes || 'Sem observações'}</td>
            <td>
                <span class="badge ${falta.justificada ? 'badge-justificada' : 'badge-falta'}">
                    ${falta.justificada ? 'Justificada' : 'Não Justificada'}
                </span>
            </td>
            <td>
                <button class="btn btn-warning btn-sm me-1" onclick="editarFalta(${falta.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="excluirFalta(${falta.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ========== FUNÇÕES AUXILIARES ==========

function formatarData(dataString) {
    return formatarDataCorreta(dataString);
}

// Função para definir botão de filtro ativo
function setFiltroAtivo(filtro) {
    const btnTodos = document.getElementById('filtroTodos');
    const btnAtivos = document.getElementById('filtroAtivos');
    const btnInativos = document.getElementById('filtroInativos');
    
    // Remover classe active de todos
    btnTodos?.classList.remove('active');
    btnAtivos?.classList.remove('active');
    btnInativos?.classList.remove('active');
    
    // Adicionar classe active ao botão correto
    switch(filtro) {
        case 'todos':
            btnTodos?.classList.add('active');
            break;
        case 'ativos':
            btnAtivos?.classList.add('active');
            break;
        case 'inativos':
            btnInativos?.classList.add('active');
            break;
    }
}

// ========== FUNÇÕES DE JUSTIFICATIVAS ==========

function carregarJustificativas() {
    const lista = document.getElementById('listaJustificativas');
    const buscaInput = document.getElementById('buscaJustificativa');
    
    if (!lista) {
        console.error('Elemento #listaJustificativas não encontrado!');
        return;
    }
    
    lista.innerHTML = '';
    
    const justificativas = SistemaStorage.getJustificativasOrdenadas();
    
    if (justificativas.length === 0) {
        lista.innerHTML = `
            <div class="list-group-item text-center text-muted py-4">
                <i class="fas fa-file-alt fa-2x mb-2"></i>
                <p class="mb-0">Nenhuma justificativa cadastrada</p>
                <small>Vá em <strong>Configurações → Justificativas</strong> para adicionar</small>
            </div>
        `;
        return;
    }
    
    // Filtrar por busca se houver termo
    const termoBusca = buscaInput?.value.toLowerCase() || '';
    const justificativasFiltradas = justificativas.filter(j => 
        j.toLowerCase().includes(termoBusca)
    );
    
    if (justificativasFiltradas.length === 0) {
        lista.innerHTML = `
            <div class="list-group-item text-center text-muted py-4">
                <i class="fas fa-search fa-2x mb-2"></i>
                <p class="mb-0">Nenhuma justificativa encontrada para "${termoBusca}"</p>
            </div>
        `;
        return;
    }
    
    justificativasFiltradas.forEach(justificativa => {
        const emUso = SistemaStorage.justificativaEmUso(justificativa);
        const quantidadeUso = SistemaStorage.faltas.filter(f => 
            f.justificativa === justificativa
        ).length;
        
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex justify-content-between align-items-center';
        item.innerHTML = `
            <div>
                <i class="fas fa-file-alt text-primary me-2"></i>
                <span class="fw-bold">${justificativa}</span>
                <div class="small text-muted">
                    ${quantidadeUso} ${quantidadeUso === 1 ? 'falta registrada' : 'faltas registradas'} com esta justificativa
                </div>
            </div>
            <div class="badge bg-${emUso ? 'success' : 'secondary'}">
                ${emUso ? 'Em uso' : 'Não utilizada'}
            </div>
        `;
        lista.appendChild(item);
    });
    
    // Configurar busca em tempo real
    if (buscaInput) {
        buscaInput.addEventListener('input', carregarJustificativas);
    }
}

// ========== FUNÇÕES DE RELATÓRIOS E ESTATÍSTICAS ==========

function atualizarEstatisticasCompletas() {
    const container = document.getElementById('estatisticas');
    if (!container) return;
    
    const totalDocentes = SistemaStorage.docentes.length;
    const docentesAtivos = SistemaStorage.docentes.filter(d => d.ativo !== false).length;
    const totalFaltas = SistemaStorage.faltas.reduce((sum, f) => sum + f.quantidadeFaltas, 0);
    const faltasJustificadas = SistemaStorage.faltas
        .filter(f => f.justificada)
        .reduce((sum, f) => sum + f.quantidadeFaltas, 0);
    
    container.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-body">
                        <h6 class="card-title">📊 Estatísticas Gerais</h6>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Total de Docentes:</span>
                            <strong>${totalDocentes}</strong>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Docentes Ativos:</span>
                            <strong class="text-success">${docentesAtivos}</strong>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Docentes Inativos:</span>
                            <strong class="text-secondary">${totalDocentes - docentesAtivos}</strong>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Total de Faltas:</span>
                            <strong>${totalFaltas}</strong>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Faltas Justificadas:</span>
                            <strong class="text-success">${faltasJustificadas}</strong>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span>Faltas Não Justificadas:</span>
                            <strong class="text-danger">${totalFaltas - faltasJustificadas}</strong>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-body">
                        <h6 class="card-title">📈 Últimas Faltas Registradas</h6>
                        ${SistemaStorage.faltas.length === 0 ? 
                            '<p class="text-muted">Nenhuma falta registrada</p>' : 
                            SistemaStorage.faltas
                                .sort((a, b) => new Date(b.data) - new Date(a.data))
                                .slice(0, 3)
                                .map(falta => {
                                    const docente = SistemaStorage.getDocentePorId(falta.docenteId);
                                    return `
                                        <div class="mb-2 p-2 border rounded">
                                            <small class="d-block">${formatarData(falta.data)}</small>
                                            <strong>${docente?.nome || 'Docente não encontrado'}</strong>
                                            <span class="badge ${falta.justificada ? 'bg-success' : 'bg-danger'} float-end">
                                                ${falta.justificada ? 'Justificada' : 'Não Justificada'}
                                            </span>
                                        </div>
                                    `;
                                }).join('')
                        }
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ========== FUNÇÃO APLICAR FILTRO ESTATÍSTICAS ==========

function aplicarFiltroEstatisticas() {
    console.log('📊 Aplicando filtro de estatísticas...');
    
    const dataInicio = document.getElementById('dataInicio')?.value;
    const dataFim = document.getElementById('dataFim')?.value;
    
    console.log('Datas selecionadas (raw):', { dataInicio, dataFim });
    console.log('Datas corrigidas:', { 
        dataInicio: dataInicio ? formatarDataCorreta(dataInicio) : null,
        dataFim: dataFim ? formatarDataCorreta(dataFim) : null 
    });
    
    // Se não houver datas, usar todos os dados
    if (!dataInicio && !dataFim) {
        atualizarEstatisticasCompletas();
        carregarResumoFaltasPorDocente(false);
        return;
    }
    
    // Validar datas
    if (dataInicio && dataFim) {
        const inicio = corrigirData(dataInicio);
        const fim = corrigirData(dataFim);
        if (inicio > fim) {
            alert('❌ Data de início não pode ser maior que data de fim!');
            return;
        }
    }
    
    // Filtrar faltas por data usando a função corrigida
    const faltasFiltradas = getFaltasFiltradasPorPeriodo(dataInicio, dataFim);
    
    console.log('Total de faltas no período:', faltasFiltradas.length);
    
    // Calcular estatísticas filtradas
    const totalDocentes = SistemaStorage.docentes.length;
    const docentesAtivos = SistemaStorage.docentes.filter(d => d.ativo !== false).length;
    const totalFaltas = faltasFiltradas.reduce((sum, f) => sum + (f.quantidadeFaltas || 0), 0);
    const faltasJustificadas = faltasFiltradas
        .filter(f => f.justificada)
        .reduce((sum, f) => sum + (f.quantidadeFaltas || 0), 0);
    const faltasNaoJustificadas = totalFaltas - faltasJustificadas;
    
    // Formatar período para exibição (USANDO A FUNÇÃO CORRIGIDA)
    let periodoTexto = '';
    if (dataInicio && dataFim) {
        periodoTexto = `${formatarDataCorreta(dataInicio)} a ${formatarDataCorreta(dataFim)}`;
    } else if (dataInicio) {
        periodoTexto = `a partir de ${formatarDataCorreta(dataInicio)}`;
    } else if (dataFim) {
        periodoTexto = `até ${formatarDataCorreta(dataFim)}`;
    }
    
    // Atualizar estatísticas na interface
    const container = document.getElementById('estatisticas');
    if (container) {
        container.innerHTML = `
            <div class="alert alert-info mb-3">
                <i class="fas fa-filter me-2"></i>
                <strong>Período filtrado:</strong> ${periodoTexto}
                <span class="badge bg-primary ms-2">${faltasFiltradas.length} registro(s)</span>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-body">
                            <h6 class="card-title">📊 Estatísticas Gerais</h6>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Total de Docentes:</span>
                                <strong>${totalDocentes}</strong>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Docentes Ativos:</span>
                                <strong class="text-success">${docentesAtivos}</strong>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Docentes Inativos:</span>
                                <strong class="text-secondary">${totalDocentes - docentesAtivos}</strong>
                            </div>
                            <hr>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Total de Faltas (no período):</span>
                                <strong>${totalFaltas}</strong>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Faltas Justificadas:</span>
                                <strong class="text-success">${faltasJustificadas}</strong>
                            </div>
                            <div class="d-flex justify-content-between">
                                <span>Faltas Não Justificadas:</span>
                                <strong class="text-danger">${faltasNaoJustificadas}</strong>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-body">
                            <h6 class="card-title">📈 Percentual de Justificativas</h6>
                            <div class="text-center mb-3">
                                <div style="font-size: 3rem; font-weight: bold; color: ${totalFaltas > 0 ? '#28a745' : '#6c757d'}">
                                    ${totalFaltas > 0 ? Math.round((faltasJustificadas / totalFaltas) * 100) : 0}%
                                </div>
                                <small class="text-muted">das faltas são justificadas</small>
                            </div>
                            <div class="progress" style="height: 30px;">
                                <div class="progress-bar bg-success" role="progressbar" 
                                     style="width: ${totalFaltas > 0 ? (faltasJustificadas / totalFaltas) * 100 : 0}%">
                                    Justificadas
                                </div>
                                <div class="progress-bar bg-danger" role="progressbar" 
                                     style="width: ${totalFaltas > 0 ? (faltasNaoJustificadas / totalFaltas) * 100 : 0}%">
                                    Não Justificadas
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Atualizar resumo de faltas por docente com os dados filtrados
    carregarResumoFaltasPorDocente(true, faltasFiltradas);
}

// ========== FUNÇÕES DE DOCENTE ==========

// Função para abrir modal de docente com múltiplas disciplinas/cursos
function abrirModalDocenteAvancado(id = null) {
    docenteEditandoId = id;
    
    // Se for edição, carregar dados
    if (id) {
        const docente = SistemaStorage.getDocentePorId(id);
        if (docente) {
            // Preencher dados básicos
            document.getElementById('docenteNome').value = docente.nome || '';
            document.getElementById('docenteAulas').value = docente.aulas || 20;
            
            // Preencher checkbox de status
            const docenteAtivoCheckbox = document.getElementById('docenteAtivo');
            if (docenteAtivoCheckbox) {
                docenteAtivoCheckbox.checked = docente.ativo !== false;
            }
            
            // Carregar disciplinas dinamicamente
            carregarDisciplinasDoDocente(docente.disciplinas || []);
            
            // Carregar cursos dinamicamente
            carregarCursosDoDocente(docente.cursos || []);
        }
    } else {
        // Novo docente - limpar tudo
        document.getElementById('docenteNome').value = '';
        document.getElementById('docenteAulas').value = 20;
        
        // Checkbox marcado por padrão para novos docentes
        const docenteAtivoCheckbox = document.getElementById('docenteAtivo');
        if (docenteAtivoCheckbox) {
            docenteAtivoCheckbox.checked = true;
        }
        
        document.getElementById('listaDisciplinasDocente').innerHTML = '';
        document.getElementById('listaCursosDocente').innerHTML = '';
        
        // Adicionar uma disciplina e curso vazios por padrão
        adicionarNovaDisciplinaDocente();
        adicionarNovoCursoDocente();
    }
    
    // Configurar título
    const modalTitle = document.getElementById('docenteModalTitle');
    if (modalTitle) {
        modalTitle.textContent = id ? 'Editar Docente' : 'Cadastrar Docente';
    }
    
        // Mostrar modal
    const modalElement = document.getElementById('addDocenteModal');
    if (modalElement) {
        // Verificar se já existe instância
        let modal = bootstrap.Modal.getInstance(modalElement);
        
        if (!modal) {
            // Criar nova instância
            modal = new bootstrap.Modal(modalElement);
        }
        
        modal.show();
    }
}

// Funções auxiliares para o modal avançado
function carregarDisciplinasDoDocente(disciplinas) {
    const container = document.getElementById('listaDisciplinasDocente');
    if (!container) return;
    
    container.innerHTML = '';
    
    disciplinas.forEach((disciplina, index) => {
        const item = criarItemDisciplinaDocente(disciplina, index);
        container.appendChild(item);
    });
    
    // Se não houver disciplinas, adicionar uma vazia
    if (disciplinas.length === 0) {
        adicionarNovaDisciplinaDocente();
    }
}

function carregarCursosDoDocente(cursos) {
    const container = document.getElementById('listaCursosDocente');
    if (!container) return;
    
    container.innerHTML = '';
    
    cursos.forEach((curso, index) => {
        const item = criarItemCursoDocente(curso, index);
        container.appendChild(item);
    });
    
    // Se não houver cursos, adicionar um vazio
    if (cursos.length === 0) {
        adicionarNovoCursoDocente();
    }
}

function criarItemDisciplinaDocente(disciplina = '', index) {
    const div = document.createElement('div');
    div.className = 'disciplina-item mb-2';
    div.innerHTML = `
        <div class="input-group">
            <select class="form-select disciplina-select" data-index="${index}">
                <option value="">Selecione uma disciplina</option>
                ${SistemaStorage.getDisciplinasOrdenadas().map(d => 
                    `<option value="${d}" ${d === disciplina ? 'selected' : ''}>${d}</option>`
                ).join('')}
                <option value="nova_disciplina">+ Nova Disciplina</option>
            </select>
            <input type="text" class="form-control nova-disciplina-input ${disciplina && !SistemaStorage.disciplinas.includes(disciplina) ? '' : 'hidden'}" 
                   placeholder="Digite nova disciplina" value="${disciplina && !SistemaStorage.disciplinas.includes(disciplina) ? disciplina : ''}">
            <button type="button" class="btn btn-outline-danger" onclick="removerDisciplinaDocente(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    return div;
}

function criarItemCursoDocente(curso = '', index) {
    const div = document.createElement('div');
    div.className = 'curso-item mb-2';
    div.innerHTML = `
        <div class="input-group">
            <select class="form-select curso-select" data-index="${index}">
                <option value="">Selecione um curso</option>
                ${SistemaStorage.getCursosOrdenados().map(c => 
                    `<option value="${c}" ${c === curso ? 'selected' : ''}>${c}</option>`
                ).join('')}
                <option value="novo_curso">+ Novo Curso</option>
            </select>
            <input type="text" class="form-control novo-curso-input ${curso && !SistemaStorage.cursos.includes(curso) ? '' : 'hidden'}" 
                   placeholder="Digite novo curso" value="${curso && !SistemaStorage.cursos.includes(curso) ? curso : ''}">
            <button type="button" class="btn btn-outline-danger" onclick="removerCursoDocente(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    return div;
}

// Funções globais para o modal
window.adicionarNovaDisciplinaDocente = function() {
    const container = document.getElementById('listaDisciplinasDocente');
    if (!container) return;
    
    const index = container.querySelectorAll('.disciplina-item').length;
    const item = criarItemDisciplinaDocente('', index);
    container.appendChild(item);
    
    // Configurar evento de change
    const select = item.querySelector('.disciplina-select');
    if (select) {
        select.addEventListener('change', function() {
            const novaInput = this.nextElementSibling;
            if (this.value === 'nova_disciplina') {
                novaInput.classList.remove('hidden');
                novaInput.focus();
            } else {
                novaInput.classList.add('hidden');
                novaInput.value = '';
            }
        });
    }
};

window.adicionarNovoCursoDocente = function() {
    const container = document.getElementById('listaCursosDocente');
    if (!container) return;
    
    const index = container.querySelectorAll('.curso-item').length;
    const item = criarItemCursoDocente('', index);
    container.appendChild(item);
    
    // Configurar evento de change
    const select = item.querySelector('.curso-select');
    if (select) {
        select.addEventListener('change', function() {
            const novaInput = this.nextElementSibling;
            if (this.value === 'novo_curso') {
                novaInput.classList.remove('hidden');
                novaInput.focus();
            } else {
                novaInput.classList.add('hidden');
                novaInput.value = '';
            }
        });
    }
};

window.removerDisciplinaDocente = function(index) {
    const container = document.getElementById('listaDisciplinasDocente');
    if (!container) return;
    
    const itens = container.querySelectorAll('.disciplina-item');
    if (itens.length <= 1) {
        alert('O docente deve ter pelo menos uma disciplina!');
        return;
    }
    
    if (index >= 0 && index < itens.length) {
        itens[index].remove();
        
        // Reindexar itens restantes
        const novosItens = container.querySelectorAll('.disciplina-item');
        novosItens.forEach((item, newIndex) => {
            const select = item.querySelector('.disciplina-select');
            const btn = item.querySelector('.btn-outline-danger');
            if (select) select.dataset.index = newIndex;
            if (btn) btn.setAttribute('onclick', `removerDisciplinaDocente(${newIndex})`);
        });
    }
};

window.removerCursoDocente = function(index) {
    const container = document.getElementById('listaCursosDocente');
    if (!container) return;
    
    const itens = container.querySelectorAll('.curso-item');
    if (itens.length <= 1) {
        alert('O docente deve ter pelo menos um curso!');
        return;
    }
    
    if (index >= 0 && index < itens.length) {
        itens[index].remove();
        
        // Reindexar itens restantes
        const novosItens = container.querySelectorAll('.curso-item');
        novosItens.forEach((item, newIndex) => {
            const select = item.querySelector('.curso-select');
            const btn = item.querySelector('.btn-outline-danger');
            if (select) select.dataset.index = newIndex;
            if (btn) btn.setAttribute('onclick', `removerCursoDocente(${newIndex})`);
        });
    }
};

// Função para salvar docente
// NO app.js, NA FUNÇÃO salvarDocente, ADICIONE esta correção:

function salvarDocente() {
    console.log('Executando salvarDocente()...', { editando: docenteEditandoId });
    
    const nome = document.getElementById('docenteNome')?.value.trim();
    const aulas = parseInt(document.getElementById('docenteAulas')?.value) || 20;
    const ativo = document.getElementById('docenteAtivo')?.checked;
    
    // VALIDAÇÃO BÁSICA
    if (!nome) {
        alert('❌ Digite o nome do docente!');
        return;
    }
    
    // COLETAR DISCIPLINAS DOS CAMPOS DINÂMICOS
    const disciplinas = [];
    const disciplinaItens = document.querySelectorAll('#listaDisciplinasDocente .disciplina-item');
    disciplinaItens.forEach(item => {
        const select = item.querySelector('.disciplina-select');
        const input = item.querySelector('.nova-disciplina-input');
        
        if (select && select.value === 'nova_disciplina' && input && input.value.trim()) {
            disciplinas.push(input.value.trim());
        } else if (select && select.value && select.value !== 'nova_disciplina') {
            disciplinas.push(select.value);
        }
    });
    
    if (disciplinas.length === 0) {
        alert('❌ O docente deve ter pelo menos uma disciplina!');
        return;
    }
    
    // COLETAR CURSOS DOS CAMPOS DINÂMICOS
    const cursos = [];
    const cursoItens = document.querySelectorAll('#listaCursosDocente .curso-item');
    cursoItens.forEach(item => {
        const select = item.querySelector('.curso-select');
        const input = item.querySelector('.novo-curso-input');
        
        if (select && select.value === 'novo_curso' && input && input.value.trim()) {
            cursos.push(input.value.trim());
        } else if (select && select.value && select.value !== 'novo_curso') {
            cursos.push(select.value);
        }
    });
    
    if (cursos.length === 0) {
        alert('❌ O docente deve ter pelo menos um curso!');
        return;
    }
    
    const dadosDocente = {
        nome: nome,
        disciplinas: disciplinas,
        cursos: cursos,
        aulas: aulas,
        ativo: ativo !== false
    };
    
    console.log('Dados do docente a salvar:', dadosDocente);
    
    let resultado = false;
    
    if (docenteEditandoId) {
        resultado = SistemaStorage.atualizarDocente(docenteEditandoId, dadosDocente);
    } else {
        const id = SistemaStorage.adicionarDocente(dadosDocente);
        resultado = !!id;
        if (resultado) {
            alert(`✅ Docente "${nome}" cadastrado com sucesso!`);
        }
    }
    
    if (resultado) {
        // ANTES DE FECHAR, REMOVER O FOCO DO BOTÃO
        const botaoAtivo = document.activeElement;
        if (botaoAtivo) {
            botaoAtivo.blur(); // Remove o foco do botão
        }
        
        // Fechar modal
        const modalElement = document.getElementById('addDocenteModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
            
            // Limpar o atributo aria-hidden após o modal fechar
            setTimeout(() => {
                modalElement.removeAttribute('aria-hidden');
            }, 300);
        }
        
        // Atualizar interface
        atualizarTabelaDocentes();
        atualizarEstatisticasCompletas();
        
        // Adicionar disciplinas/cursos novos ao sistema global
        disciplinas.forEach(disciplina => {
            if (!SistemaStorage.disciplinas.includes(disciplina)) {
                SistemaStorage.adicionarDisciplina(disciplina);
            }
        });
        
        cursos.forEach(curso => {
            if (!SistemaStorage.cursos.includes(curso)) {
                SistemaStorage.adicionarCurso(curso);
            }
        });
        
    } else {
        alert('❌ Erro ao salvar docente!');
    }
}

// ========== FUNÇÕES DE FALTA ==========

function abrirModalFalta() {
  faltaEditandoId = null;
    
    // Resetar título
    document.getElementById('faltaModalTitle').textContent = 'Registrar Falta';

    // Resetar formulário
    const form = document.getElementById('faltaForm');
    if (form) {
        form.reset();
        // Data padrão = hoje
        const hoje = new Date().toISOString().split('T')[0];
        const dataInput = document.getElementById('faltaData');
        if (dataInput) dataInput.value = hoje;
        
        // Configurar justificativa como "Não"
        const faltaJustificada = document.getElementById('faltaJustificada');
        if (faltaJustificada) faltaJustificada.value = 'nao';
        
        // Esconder campo de justificativa
        const justificativaContainer = document.getElementById('justificativaContainer');
        if (justificativaContainer) justificativaContainer.classList.add('hidden');
    }
    
    // Carregar selects com dados do SistemaStorage
    carregarSelectsModalFalta();

    // Configurar evento para quando mudar o docente
    const docenteSelect = document.getElementById('docenteSelect');
    if (docenteSelect) {
    docenteSelect.addEventListener('change', function() {
        const docenteId = parseInt(this.value) || null;
        
         // Salvar seleções atuais antes de limpar
         const disciplinaAtual = document.getElementById('disciplinaSelect')?.value;
        const cursoAtual = document.getElementById('cursoSelect')?.value;
        
        // Recarregar disciplinas e cursos específicos do docente
        carregarSelectsModalFalta(docenteId);
        
        // Tentar restaurar seleções se forem válidas para o novo docente
        setTimeout(() => {
            const disciplinaSelect = document.getElementById('disciplinaSelect');
            const cursoSelect = document.getElementById('cursoSelect');
            
            if (disciplinaAtual && disciplinaSelect) {
                const opcoesDisciplina = Array.from(disciplinaSelect.options).map(o => o.value);
                if (opcoesDisciplina.includes(disciplinaAtual)) {
                    disciplinaSelect.value = disciplinaAtual;
                }
            }
            
            if (cursoAtual && cursoSelect) {
                const opcoesCurso = Array.from(cursoSelect.options).map(o => o.value);
                if (opcoesCurso.includes(cursoAtual)) {
                    cursoSelect.value = cursoAtual;
                }
            }
        }, 50);
    });
}
    
        // Mostrar modal
    const modalElement = document.getElementById('addFaltaModal');
    if (modalElement) {
        // Verificar se já existe instância
        let modal = bootstrap.Modal.getInstance(modalElement);
        
        if (!modal) {
            // Criar nova instância
            modal = new bootstrap.Modal(modalElement);
        }
        
        modal.show();
    }
}

// ========== FUNÇÃO CARREGAR SELECTS MODAL FALTA ==========
function carregarSelectsModalFalta(docenteId = null) {
    console.log('Carregando selects para falta. Docente ID:', docenteId);
    
    // Carregar disciplinas
    const disciplinaSelect = document.getElementById('disciplinaSelect');
    if (disciplinaSelect) {
        disciplinaSelect.innerHTML = '<option value="">Selecione uma disciplina</option>';
        
        let disciplinas = [];
        if (docenteId) {
            disciplinas = SistemaStorage.getDisciplinasPorDocente(docenteId);
        } else {
            disciplinas = SistemaStorage.getDisciplinasOrdenadas();
        }
        
        disciplinas.forEach(disciplina => {
            const option = document.createElement('option');
            option.value = disciplina;
            option.textContent = disciplina;
            disciplinaSelect.appendChild(option);
        });
        
        console.log('Disciplinas carregadas:', disciplinas.length);
    }
    
    // Carregar cursos
    const cursoSelect = document.getElementById('cursoSelect');
    if (cursoSelect) {
        cursoSelect.innerHTML = '<option value="">Selecione um curso</option>';
        
        let cursos = [];
        if (docenteId) {
            cursos = SistemaStorage.getCursosPorDocente(docenteId);
        } else {
            cursos = SistemaStorage.getCursosOrdenados();
        }
        
        cursos.forEach(curso => {
            const option = document.createElement('option');
            option.value = curso;
            option.textContent = curso;
            cursoSelect.appendChild(option);
        });
        
        console.log('Cursos carregados:', cursos.length);
    }
    
    // Carregar justificativas
    const justificativaSelect = document.getElementById('justificativaSelect');
    if (justificativaSelect) {
        justificativaSelect.innerHTML = '<option value="">Selecione uma justificativa</option>';
        
        const justificativas = SistemaStorage.getJustificativasOrdenadas();
        justificativas.forEach(justificativa => {
            const option = document.createElement('option');
            option.value = justificativa;
            option.textContent = justificativa;
            justificativaSelect.appendChild(option);
        });
        
        console.log('Justificativas carregadas:', justificativas.length);
    }
}


// ========== FUNÇÃO SALVAR FALTA ==========
function salvarFalta() {
    console.log('Executando salvarFalta()...', { editando: faltaEditandoId });
    
    const docenteId = parseInt(document.getElementById('docenteSelect')?.value) || 0;
    const disciplina = document.getElementById('disciplinaSelect')?.value;
    const curso = document.getElementById('cursoSelect')?.value;
    const quantidade = parseInt(document.getElementById('quantidadeFaltas')?.value) || 1;
    const faltaJustificada = document.getElementById('faltaJustificada')?.value === 'sim';
    const justificativa = faltaJustificada ? document.getElementById('justificativaSelect')?.value : '';
    const data = document.getElementById('faltaData')?.value;
    const horarioInicio = document.getElementById('faltaHorarioInicio')?.value;
    const horarioFim = document.getElementById('faltaHorarioFim')?.value;
    const observacoes = document.getElementById('faltaObservacoes')?.value;
    
    // Validação adicional: docente deve ter disciplinas e cursos
    if (!validarDocenteSelecionado(docenteId)) {
        alert('❌ Este docente não tem disciplinas ou cursos cadastrados. Edite o docente primeiro.');
        return;
    }

    console.log('Dados da falta:', {
        docenteId, disciplina, curso, quantidade, faltaJustificada, 
        justificativa, data, horarioInicio, horarioFim, observacoes
    });
    
    // Validações
    if (!docenteId) {
        alert('Selecione um docente!');
        return;
    }
    if (!disciplina) {
        alert('Selecione uma disciplina!');
        return;
    }
    if (!curso) {
        alert('Selecione um curso!');
        return;
    }
    if (quantidade <= 0) {
        alert('A quantidade deve ser maior que zero!');
        return;
    }
    if (!data) {
        alert('Selecione uma data!');
        return;
    }
    if (!horarioInicio || !horarioFim) {
        alert('Preencha os horários!');
        return;
    }
    if (faltaJustificada && !justificativa) {
        alert('Selecione uma justificativa!');
        return;
    }
    
    // Criar objeto falta
    const dadosFalta = {
        docenteId: docenteId,
        disciplina: disciplina,
        curso: curso,
        quantidadeFaltas: quantidade,
        justificada: faltaJustificada,
        justificativa: justificativa || '',
        observacoes: observacoes || '',
        data: data,
        horarioInicio: horarioInicio,
        horarioFim: horarioFim
    };
    
    console.log('Dados a serem salvos:', dadosFalta);
    
    let resultado = false;
    let mensagem = '';
    
    if (faltaEditandoId) {
        // EDITAR FALTA EXISTENTE
        resultado = SistemaStorage.atualizarFalta(faltaEditandoId, dadosFalta);
        mensagem = resultado ? 
            '✅ Falta atualizada com sucesso!' : 
            '❌ Erro ao atualizar falta!';
    } else {
        // NOVA FALTA
        const id = SistemaStorage.adicionarFalta(dadosFalta);
        resultado = !!id;
        mensagem = resultado ? 
            '✅ Falta registrada com sucesso!' : 
            '❌ Erro ao salvar falta!';
    }
    
    if (resultado) {
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addFaltaModal'));
        if (modal) modal.hide();
        
        // Resetar ID de edição
        faltaEditandoId = null;
        
        // Resetar título do modal
        document.getElementById('faltaModalTitle').textContent = 'Registrar Falta';
        
        // Atualizar interface
        atualizarTabelaFaltas();
        atualizarEstatisticasCompletas();
        atualizarFiltroAnos();
        
        alert(mensagem);
    } else {
        alert(mensagem);
    }
}

// ========== FUNÇÕES DE CONFIGURAÇÕES ==========

// Disciplinas
function carregarListaDisciplinas() {
    const lista = document.getElementById('listaDisciplinas');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    const disciplinas = SistemaStorage.getDisciplinasOrdenadas();
    
    if (disciplinas.length === 0) {
        lista.innerHTML = `
            <div class="list-group-item text-center text-muted py-4">
                <i class="fas fa-book fa-2x mb-2"></i>
                <p class="mb-0">Nenhuma disciplina cadastrada</p>
            </div>
        `;
        return;
    }
    
    disciplinas.forEach(disciplina => {
        const emUso = SistemaStorage.disciplinaEmUso(disciplina);
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex justify-content-between align-items-center';
        item.innerHTML = `
            <span>${disciplina}</span>
            <div>
                <button class="btn btn-warning btn-sm me-1" onclick="editarDisciplina('${disciplina}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="excluirDisciplina('${disciplina}')"
                        ${emUso ? 'disabled title="Esta disciplina está em uso"' : ''}>
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        lista.appendChild(item);
    });
}

function abrirModalAdicionarDisciplina() {
    document.getElementById('novaDisciplinaNome').value = '';
    
    const modalElement = document.getElementById('addDisciplinaModal');
    if (modalElement) {
        // Verificar se já existe instância
        let modal = bootstrap.Modal.getInstance(modalElement);
        
        if (!modal) {
            // Criar nova instância
            modal = new bootstrap.Modal(modalElement);
        }
        
        modal.show();
    }
}

function salvarDisciplina() {
    const nome = document.getElementById('novaDisciplinaNome')?.value.trim();
    
    if (!nome) {
        alert('❌ Digite o nome da disciplina!');
        return;
    }
    
    if (SistemaStorage.adicionarDisciplina(nome)) {
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addDisciplinaModal'));
        if (modal) modal.hide();
        
        // Atualizar lista
        carregarListaDisciplinas();
        atualizarSelectsDisciplinas();
        
        alert(`✅ Disciplina "${nome}" adicionada com sucesso!`);
    } else {
        alert(`❌ A disciplina "${nome}" já existe!`);
    }
}

function atualizarSelectsDisciplinas() {
    // Atualizar select no modal de docente
    const selectDocente = document.getElementById('docenteDisciplinaSelect');
    if (selectDocente) {
        const selectedValue = selectDocente.value;
        selectDocente.innerHTML = '<option value="">Selecione uma disciplina</option>';
        
        SistemaStorage.getDisciplinasOrdenadas().forEach(disciplina => {
            const option = document.createElement('option');
            option.value = disciplina;
            option.textContent = disciplina;
            selectDocente.appendChild(option);
        });
        
        // Adicionar opção de nova disciplina
        const novaOption = document.createElement('option');
        novaOption.value = 'nova_disciplina';
        novaOption.textContent = '+ Nova Disciplina';
        selectDocente.appendChild(novaOption);
        
        // Restaurar seleção se ainda existir
        if (selectedValue && SistemaStorage.disciplinas.includes(selectedValue)) {
            selectDocente.value = selectedValue;
        }
    }
    
    // Atualizar select no modal de falta
    const selectFalta = document.getElementById('disciplinaSelect');
    if (selectFalta) {
        const selectedValue = selectFalta.value;
        selectFalta.innerHTML = '<option value="">Selecione uma disciplina</option>';
        
        SistemaStorage.getDisciplinasOrdenadas().forEach(disciplina => {
            const option = document.createElement('option');
            option.value = disciplina;
            option.textContent = disciplina;
            selectFalta.appendChild(option);
        });
        
        // Restaurar seleção se ainda existir
        if (selectedValue && SistemaStorage.disciplinas.includes(selectedValue)) {
            selectFalta.value = selectedValue;
        }
    }
}

window.editarDisciplina = function(nomeAtual) {
    const novoNome = prompt(`Editar disciplina:\n\nNome atual: ${nomeAtual}\n\nDigite o novo nome:`, nomeAtual);
    
    if (!novoNome || novoNome.trim() === nomeAtual) return;
    
    const novoNomeTrim = novoNome.trim();
    
    // Verificar se o novo nome já existe
    const existe = SistemaStorage.disciplinas.some(d => 
        d.toLowerCase() === novoNomeTrim.toLowerCase() && d !== nomeAtual
    );
    
    if (existe) {
        alert(`❌ A disciplina "${novoNomeTrim}" já existe!`);
        return;
    }
    
    // Atualizar em todos os lugares
    const index = SistemaStorage.disciplinas.indexOf(nomeAtual);
    if (index !== -1) {
        SistemaStorage.disciplinas[index] = novoNomeTrim;
        SistemaStorage.salvar('disciplinas', SistemaStorage.disciplinas);
    }
    
    // Atualizar docentes
    SistemaStorage.docentes.forEach(docente => {
        const disciplinaIndex = docente.disciplinas.indexOf(nomeAtual);
        if (disciplinaIndex !== -1) {
            docente.disciplinas[disciplinaIndex] = novoNomeTrim;
        }
    });
    SistemaStorage.salvar('docentes', SistemaStorage.docentes);
    
    // Atualizar faltas
    SistemaStorage.faltas.forEach(falta => {
        if (falta.disciplina === nomeAtual) {
            falta.disciplina = novoNomeTrim;
        }
    });
    SistemaStorage.salvar('faltas', SistemaStorage.faltas);
    
    // Atualizar interface
    carregarListaDisciplinas();
    atualizarSelectsDisciplinas();
    atualizarTabelaDocentes();
    atualizarTabelaFaltas();
    
    alert(`✅ Disciplina atualizada de "${nomeAtual}" para "${novoNomeTrim}"!`);
};

window.excluirDisciplina = function(nome) {
    if (SistemaStorage.disciplinaEmUso(nome)) {
        alert(`❌ Não é possível excluir a disciplina "${nome}"!\n\nEla está sendo utilizada por docentes ou faltas.`);
        return;
    }
    
    if (!confirm(`Tem certeza que deseja excluir a disciplina "${nome}"?`)) {
        return;
    }
    
    if (SistemaStorage.removerDisciplina(nome)) {
        carregarListaDisciplinas();
        atualizarSelectsDisciplinas();
        alert(`✅ Disciplina "${nome}" excluída com sucesso!`);
    } else {
        alert(`❌ Erro ao excluir disciplina "${nome}".`);
    }
};

function filtrarDisciplinas() {
    const busca = document.getElementById('buscaDisciplina')?.value.toLowerCase() || '';
    const itens = document.querySelectorAll('#listaDisciplinas .list-group-item');
    
    itens.forEach(item => {
        const texto = item.querySelector('span')?.textContent.toLowerCase() || '';
        item.style.display = texto.includes(busca) ? 'flex' : 'none';
    });
}

// Cursos
function carregarListaCursos() {
    const lista = document.getElementById('listaCursos');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    const cursos = SistemaStorage.getCursosOrdenados();
    
    if (cursos.length === 0) {
        lista.innerHTML = `
            <div class="list-group-item text-center text-muted py-4">
                <i class="fas fa-graduation-cap fa-2x mb-2"></i>
                <p class="mb-0">Nenhum curso cadastrado</p>
            </div>
        `;
        return;
    }
    
    cursos.forEach(curso => {
        const emUso = SistemaStorage.cursoEmUso(curso);
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex justify-content-between align-items-center';
        item.innerHTML = `
            <span>${curso}</span>
            <div>
                <button class="btn btn-warning btn-sm me-1" onclick="editarCurso('${curso}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="excluirCurso('${curso}')"
                        ${emUso ? 'disabled title="Este curso está em uso"' : ''}>
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        lista.appendChild(item);
    });
}

function abrirModalAdicionarCurso() {
    document.getElementById('novoCursoNome').value = '';
    const modal = new bootstrap.Modal(document.getElementById('addCursoModal'));
    modal.show();
}

function salvarCurso() {
    const nome = document.getElementById('novoCursoNome')?.value.trim();
    
    if (!nome) {
        alert('❌ Digite o nome do curso!');
        return;
    }
    
    if (SistemaStorage.adicionarCurso(nome)) {
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addCursoModal'));
        if (modal) modal.hide();
        
        // Atualizar lista
        carregarListaCursos();
        atualizarSelectsCursos();
        
        alert(`✅ Curso "${nome}" adicionado com sucesso!`);
    } else {
        alert(`❌ O curso "${nome}" já existe!`);
    }
}

// ========== FUNÇÃO CARREGAR RESUMO DE FALTAS POR DOCENTE ==========

function carregarResumoFaltasPorDocente(usarFiltro = false, faltasFiltradas = null) {
    const tbody = document.getElementById('tabelaResumoFaltas');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // OBTER DADOS FILTRADOS OU TODOS
    let faltasParaAnalise = [];
    
    if (usarFiltro && faltasFiltradas) {
        faltasParaAnalise = faltasFiltradas;
    } else if (usarFiltro && filtroAtivo()) {
        const { dataInicio, dataFim } = getDatasFiltroAtual();
        faltasParaAnalise = getFaltasFiltradasPorPeriodo(dataInicio, dataFim);
    } else {
        faltasParaAnalise = SistemaStorage.faltas;
    }
    
    // FILTRAR APENAS DOCENTES ATIVOS
    const docentesAtivos = SistemaStorage.docentes.filter(docente => docente.ativo !== false);
    
    if (docentesAtivos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-3">
                    <i class="fas fa-user-slash me-2"></i>
                    Nenhum docente ativo encontrado
                </td>
            </tr>
        `;
        return;
    }
    
    if (faltasParaAnalise.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-3">
                    <i class="fas fa-search me-2"></i>
                    Nenhuma falta encontrada ${usarFiltro ? 'no período selecionado' : 'no sistema'}
                </td>
            </tr>
        `;
        return;
    }
    
    // Ordenar docentes por nome
    const docentesOrdenados = [...docentesAtivos].sort((a, b) => a.nome.localeCompare(b.nome));
    
    docentesOrdenados.forEach(docente => {
        const faltasDocente = faltasParaAnalise.filter(f => f.docenteId === docente.id);
        const totalFaltas = faltasDocente.reduce((sum, f) => sum + (f.quantidadeFaltas || 0), 0);
        const justificadas = faltasDocente
            .filter(f => f.justificada)
            .reduce((sum, f) => sum + (f.quantidadeFaltas || 0), 0);
        const naoJustificadas = totalFaltas - justificadas;
        const percentual = totalFaltas > 0 ? Math.round((justificadas / totalFaltas) * 100) : 0;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${docente.nome}</td>
            <td><strong>${totalFaltas}</strong></td>
            <td class="text-success">${justificadas}</td>
            <td class="text-danger">${naoJustificadas}</td>
            <td>
                <div class="progress" style="height: 20px;" title="${percentual}% justificadas">
                    <div class="progress-bar bg-success" role="progressbar" 
                         style="width: ${percentual}%" aria-valuenow="${percentual}" 
                         aria-valuemin="0" aria-valuemax="100">
                        ${percentual > 0 ? percentual + '%' : ''}
                    </div>
                    ${percentual < 100 ? `
                    <div class="progress-bar bg-danger" role="progressbar" 
                         style="width: ${100 - percentual}%">
                        ${percentual === 0 ? '0%' : ''}
                    </div>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.excluirCurso = function(nome) {
    if (SistemaStorage.cursoEmUso(nome)) {
        alert(`❌ Não é possível excluir o curso "${nome}"!\n\nEle está sendo utilizado por docentes ou faltas.`);
        return;
    }
    
    if (!confirm(`Tem certeza que deseja excluir o curso "${nome}"?`)) {
        return;
    }
    
    if (SistemaStorage.removerCurso(nome)) {
        carregarListaCursos();
        atualizarSelectsCursos();
        alert(`✅ Curso "${nome}" excluído com sucesso!`);
    } else {
        alert(`❌ Erro ao excluir curso "${nome}".`);
    }
};

function filtrarCursos() {
    const busca = document.getElementById('buscaCurso')?.value.toLowerCase() || '';
    const itens = document.querySelectorAll('#listaCursos .list-group-item');
    
    itens.forEach(item => {
        const texto = item.querySelector('span')?.textContent.toLowerCase() || '';
        item.style.display = texto.includes(busca) ? 'flex' : 'none';
    });
}

// Justificativas (configurações)
function carregarListaJustificativasConfig() {
    const lista = document.getElementById('listaJustificativasConfig');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    const justificativas = SistemaStorage.getJustificativasOrdenadas();
    
    if (justificativas.length === 0) {
        lista.innerHTML = `
            <div class="list-group-item text-center text-muted py-4">
                <i class="fas fa-file-alt fa-2x mb-2"></i>
                <p class="mb-0">Nenhuma justificativa cadastrada</p>
            </div>
        `;
        return;
    }
    
    justificativas.forEach(justificativa => {
        const emUso = SistemaStorage.justificativaEmUso(justificativa);
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex justify-content-between align-items-center';
        item.innerHTML = `
            <span>${justificativa}</span>
            <div>
                <button class="btn btn-warning btn-sm me-1" onclick="editarJustificativaConfig('${justificativa}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="excluirJustificativaConfig('${justificativa}')"
                        ${emUso ? 'disabled title="Esta justificativa está em uso"' : ''}>
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        lista.appendChild(item);
    });
}

function abrirModalAdicionarJustificativa() {
    document.getElementById('novaJustificativaDescricao').value = '';
    const modal = new bootstrap.Modal(document.getElementById('addJustificativaModal'));
    modal.show();
}

function salvarJustificativa() {
    const descricao = document.getElementById('novaJustificativaDescricao')?.value.trim();
    
    if (!descricao) {
        alert('❌ Digite a descrição da justificativa!');
        return;
    }
    
    if (SistemaStorage.adicionarJustificativa(descricao)) {
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addJustificativaModal'));
        if (modal) modal.hide();
        
        // Atualizar lista
        carregarListaJustificativasConfig();
        atualizarSelectsJustificativas();
        
        alert(`✅ Justificativa "${descricao}" adicionada com sucesso!`);
    } else {
        alert(`❌ A justificativa "${descricao}" já existe!`);
    }
}

function atualizarSelectsJustificativas() {
    const selectFalta = document.getElementById('justificativaSelect');
    if (selectFalta) {
        const selectedValue = selectFalta.value;
        selectFalta.innerHTML = '<option value="">Selecione uma justificativa</option>';
        
        SistemaStorage.getJustificativasOrdenadas().forEach(justificativa => {
            const option = document.createElement('option');
            option.value = justificativa;
            option.textContent = justificativa;
            selectFalta.appendChild(option);
        });
        
        if (selectedValue && SistemaStorage.justificativas.includes(selectedValue)) {
            selectFalta.value = selectedValue;
        }
    }
}

function atualizarSelectsCursos() {
    // Atualizar select no modal de docente
    const selectDocente = document.getElementById('docenteCursoSelect');
    if (selectDocente) {
        const selectedValue = selectDocente.value;
        selectDocente.innerHTML = '<option value="">Selecione um curso</option>';
        
        SistemaStorage.getCursosOrdenados().forEach(curso => {
            const option = document.createElement('option');
            option.value = curso;
            option.textContent = curso;
            selectDocente.appendChild(option);
        });
        
        // Adicionar opção de novo curso
        const novaOption = document.createElement('option');
        novaOption.value = 'novo_curso';
        novaOption.textContent = '+ Novo Curso';
        selectDocente.appendChild(novaOption);
        
        // Restaurar seleção se ainda existir
        if (selectedValue && SistemaStorage.cursos.includes(selectedValue)) {
            selectDocente.value = selectedValue;
        }
    }
    
    // Atualizar select no modal de falta
    const selectFalta = document.getElementById('cursoSelect');
    if (selectFalta) {
        const selectedValue = selectFalta.value;
        selectFalta.innerHTML = '<option value="">Selecione um curso</option>';
        
        SistemaStorage.getCursosOrdenados().forEach(curso => {
            const option = document.createElement('option');
            option.value = curso;
            option.textContent = curso;
            selectFalta.appendChild(option);
        });
        
        // Restaurar seleção se ainda existir
        if (selectedValue && SistemaStorage.cursos.includes(selectedValue)) {
            selectFalta.value = selectedValue;
        }
    }
}

// ========== FUNÇÕES PARA CONFIGURAÇÕES ==========
function carregarLogs() {
    const tabela = document.getElementById('tabelaLogs');
    const contador = document.getElementById('contadorLogs');
    if (!tabela) return;
    
    tabela.innerHTML = '';
    
    // Obter filtros
    const filtroUsuario = document.getElementById('filtroLogUsuario')?.value || '';
    const filtroPerfil = document.getElementById('filtroLogPerfil')?.value || '';
    const filtroModulo = document.getElementById('filtroLogModulo')?.value || '';
    const filtroPeriodo = document.getElementById('filtroLogPeriodo')?.value || '30dias';
    
    // Aplicar filtros
    let logsFiltrados = [...SistemaStorage.logs];
    
    // Filtrar por período
    if (filtroPeriodo !== 'todos') {
        const hoje = new Date();
        let dataLimite = new Date();
        
        switch(filtroPeriodo) {
            case 'hoje':
                dataLimite.setHours(0, 0, 0, 0);
                break;
            case 'ontem':
                dataLimite.setDate(hoje.getDate() - 1);
                dataLimite.setHours(0, 0, 0, 0);
                break;
            case '30dias':
                dataLimite.setDate(hoje.getDate() - 30);
                break;
        }
        
        logsFiltrados = logsFiltrados.filter(log => {
            const dataLog = new Date(log.data);
            return dataLog >= dataLimite;
        });
    }
    
    // Filtrar por perfil
    if (filtroPerfil) {
        logsFiltrados = logsFiltrados.filter(log => log.usuario_perfil === filtroPerfil);
    }
    
    // Filtrar por módulo
    if (filtroModulo) {
        logsFiltrados = logsFiltrados.filter(log => log.modulo === filtroModulo);
    }
    
    if (logsFiltrados.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="fas fa-search fa-2x mb-2"></i>
                    <p class="mb-0">Nenhum registro encontrado</p>
                    <small>Ajuste os filtros para ver mais registros</small>
                </td>
            </tr>
        `;
        if (contador) contador.textContent = '0';
        return;
    }
    
    // Mostrar logs (limitado a 100 para performance)
    const logsLimitados = logsFiltrados.slice(0, 100);
    
    logsLimitados.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${log.data}</td>
            <td>${log.usuario_nome}</td>
            <td><span class="badge bg-info">${log.usuario_perfil}</span></td>
            <td>${log.modulo}</td>
            <td><span class="badge bg-secondary">${log.acao}</span></td>
            <td><small class="text-muted">${log.detalhes}</small></td>
            <td><code>${log.ip}</code></td>
        `;
        tabela.appendChild(tr);
    });
    
    if (contador) {
        contador.textContent = logsLimitados.length;
    }
}

// ========== FUNÇÕES PARA ABRIR MODAIS (GLOBAIS) ==========
window.mostrarModalFalta = function() {
    abrirModalFalta();
};

window.mostrarModalDocente = function() {
    abrirModalDocenteAvancado();
};

window.showConfigModal = function() {
    mostrarModalConfiguracoes();
};

// ========== FUNÇÕES PARA GESTÃO DE PERFIS ==========
function abrirModalPerfil(id = null) {
    const modalTitle = document.getElementById('perfilModalTitle');
    const perfilForm = document.getElementById('perfilForm');
    
    // Resetar formulário
    if (perfilForm) perfilForm.reset();
    
    // Se for edição, carregar dados
    if (id) {
        const perfil = SistemaStorage.getPerfilPorId(id);
        if (perfil) {
            modalTitle.textContent = 'Editar Perfil';
            
            document.getElementById('perfilNome').value = perfil.nome;
            document.getElementById('perfilDescricao').value = perfil.descricao || '';
            
            // Preencher checkboxes de permissões
            Object.keys(perfil.permissoes).forEach(permissao => {
                const checkbox = document.getElementById(`permissao${permissao.charAt(0).toUpperCase() + permissao.slice(1)}`);
                if (checkbox) {
                    checkbox.checked = perfil.permissoes[permissao];
                }
            });
        }
    } else {
        modalTitle.textContent = 'Cadastrar Perfil';
    }
    
    // Mostrar modal
    const modalElement = document.getElementById('addPerfilModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

function salvarPerfil() {
    const perfilId = perfilEditandoId;
    const nome = document.getElementById('perfilNome')?.value.trim();
    const descricao = document.getElementById('perfilDescricao')?.value.trim();
    
    // Coletar permissões
    const permissoes = {};
    const checkboxes = document.querySelectorAll('#perfilForm .permissao-check');
    checkboxes.forEach(checkbox => {
        if (checkbox.id.startsWith('permissao')) {
            const permissaoKey = checkbox.id.replace('permissao', '').toLowerCase();
            permissoes[permissaoKey] = checkbox.checked;
        }
    });
    
    // Validações
    if (!nome) {
        alert('❌ Digite o nome do perfil!');
        return;
    }
    
    // Preparar dados
    const dadosPerfil = {
        nome: nome,
        descricao: descricao,
        permissoes: permissoes,
        editavel: true
    };
    
    let resultado = false;
    let mensagem = '';
    
    if (perfilId) {
        // Editar perfil existente
        resultado = SistemaStorage.atualizarPerfil(perfilId, dadosPerfil);
        mensagem = resultado ? 
            '✅ Perfil atualizado com sucesso!' : 
            '❌ Erro ao atualizar perfil!';
    } else {
        // Novo perfil
        const id = SistemaStorage.adicionarPerfil(dadosPerfil);
        resultado = !!id;
        mensagem = resultado ? 
            '✅ Perfil cadastrado com sucesso!' : 
            '❌ Erro ao cadastrar perfil!';
    }
    
    if (resultado) {
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addPerfilModal'));
        if (modal) modal.hide();
        
        // Atualizar lista de perfis
        carregarListaPerfis();
        
        alert(mensagem);
    } else {
        alert(mensagem);
    }
}

// ========== FUNÇÃO CARREGAR LISTA DE PERFIS ==========

function carregarListaPerfis() {
    const lista = document.getElementById('listaPerfis');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    // APENAS OS 4 PERFIS PRÉ-DEFINIDOS
    const perfis = SistemaStorage.perfis.filter(p => p.predefinido);
    
    // Ordenar: Master, Gestor, Operador, Supervisor
    const ordemPerfis = ['Master', 'Gestor', 'Operador', 'Supervisor'];
    const perfisOrdenados = [...perfis].sort((a, b) => 
        ordemPerfis.indexOf(a.nome) - ordemPerfis.indexOf(b.nome)
    );
    
    perfisOrdenados.forEach(perfil => {
        const emUso = SistemaStorage.usuarios.some(u => u.perfil_id === perfil.id);
        const usuariosComPerfil = SistemaStorage.usuarios.filter(u => u.perfil_id === perfil.id).length;
        const podeEditar = perfil.editavel && temPermissao('gerenciar_perfis');
        
        const item = document.createElement('div');
        item.className = 'list-group-item';
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="mb-1">
                        <i class="fas fa-user-shield me-2 ${perfil.nome === 'Master' ? 'text-danger' : 'text-primary'}"></i>
                        <strong>${perfil.nome}</strong>
                        ${perfil.nome === 'Master' ? 
                            '<span class="badge bg-danger ms-2">Não editável</span>' : 
                            '<span class="badge bg-success ms-2">Editável</span>'}
                    </h6>
                    <div class="small text-muted mb-2">
                        ${perfil.descricao || 'Sem descrição'}
                    </div>
                    <div class="small">
                        <span class="badge bg-info">Perfil Pré-definido</span>
                        <span class="badge ${emUso ? 'bg-success' : 'bg-secondary'} ms-2">
                            ${usuariosComPerfil} usuário(s)
                        </span>
                    </div>
                </div>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="visualizarDetalhesPerfil(${perfil.id})"
                            title="Visualizar permissões">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${podeEditar ? `
                    <button class="btn btn-sm btn-outline-warning" onclick="editarPermissoesPerfil(${perfil.id})"
                            title="Editar permissões">
                        <i class="fas fa-edit"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
        lista.appendChild(item);
    });
}

// ========== FUNÇÃO VISUALIZAR DETALHES DO PERFIL ==========

window.visualizarDetalhesPerfil = function(perfilId) {
    const perfil = SistemaStorage.getPerfilPorId(perfilId);
    if (!perfil) return;
    
    // Criar descrição das permissões
    let permissoesHTML = '';
    
    // Contar permissões
    let totalPermissoes = 0;
    let permissoesAtivas = 0;
    
    Object.values(perfil.permissoes).forEach(valor => {
        totalPermissoes++;
        if (valor) permissoesAtivas++;
    });
    
    const porcentagem = Math.round((permissoesAtivas / totalPermissoes) * 100);
    
    permissoesHTML = `
        <div class="alert ${porcentagem > 80 ? 'alert-success' : porcentagem > 50 ? 'alert-info' : 'alert-warning'}">
            <i class="fas fa-chart-pie me-2"></i>
            <strong>Resumo de Permissões:</strong> ${permissoesAtivas}/${totalPermissoes} ativas (${porcentagem}%)
        </div>
    `;
    
    // Usuários com este perfil
    const usuariosComPerfil = SistemaStorage.usuarios.filter(u => u.perfil_id === perfilId);
    let usuariosHTML = '';
    
    if (usuariosComPerfil.length > 0) {
        usuariosHTML = `
            <h6 class="mt-3 mb-2">Usuários com este perfil (${usuariosComPerfil.length}):</h6>
            <div class="list-group">
        `;
        
        usuariosComPerfil.forEach(usuario => {
            usuariosHTML += `
                <div class="list-group-item small">
                    <i class="fas fa-user me-2 ${usuario.ativo ? 'text-success' : 'text-secondary'}"></i>
                    <strong>${usuario.nome}</strong>
                    <span class="badge ${usuario.ativo ? 'bg-success' : 'bg-secondary'} ms-2">
                        ${usuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    <div class="text-muted">${usuario.cpf}</div>
                </div>
            `;
        });
        
        usuariosHTML += '</div>';
    } else {
        usuariosHTML = `
            <div class="alert alert-light mt-3">
                <i class="fas fa-info-circle me-2"></i>
                Nenhum usuário possui este perfil no momento.
            </div>
        `;
    }
    
    // Criar modal
    const modalHTML = `
        <div class="modal fade" id="detalhesPerfilModal">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-user-shield me-2"></i>
                            Detalhes do Perfil: ${perfil.nome}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-8">
                                <h6>Descrição:</h6>
                                <p>${perfil.descricao || 'Sem descrição'}</p>
                                
                                ${permissoesHTML}
                            </div>
                            <div class="col-md-4">
                                <div class="card">
                                    <div class="card-header">
                                        <h6 class="mb-0">Informações</h6>
                                    </div>
                                    <div class="card-body">
                                        <p><strong>ID:</strong> ${perfil.id}</p>
                                        <p><strong>Tipo:</strong> Pré-definido</p>
                                        <p><strong>Editável:</strong> ${perfil.editavel ? 'Sim' : 'Não'}</p>
                                        <p><strong>Criado em:</strong> ${perfil.data_criacao || 'Data não disponível'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        ${usuariosHTML}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        ${perfil.editavel ? `
                        <button type="button" class="btn btn-warning" onclick="editarPermissoesPerfil(${perfil.id})">
                            <i class="fas fa-edit me-1"></i> Editar Permissões
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Inserir modal no DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('detalhesPerfilModal'));
    modal.show();
    
    // Remover modal do DOM quando fechar
    modalContainer.addEventListener('hidden.bs.modal', function() {
        document.body.removeChild(modalContainer);
    });
};

window.visualizarDetalhesPerfil = function(perfilId) {
    const perfil = SistemaStorage.getPerfilPorId(perfilId);
    if (!perfil) return;
    
    // Criar descrição das permissões baseado no nome do perfil
    let permissoesHTML = '';
    
    if (perfil.nome === 'Master') {
        permissoesHTML = `
            <div class="alert alert-success">
                <i class="fas fa-crown me-2"></i>
                <strong>Permissões Completas:</strong> Acesso total a todo o sistema
            </div>
        `;
    } else if (perfil.nome === 'Gestor') {
        permissoesHTML = `
            <div class="alert alert-info">
                <i class="fas fa-user-tie me-2"></i>
                <strong>Permissões de Gestão:</strong> Pode fazer tudo exceto alterar configurações do Master
            </div>
        `;
    } else if (perfil.nome === 'Operador') {
        permissoesHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-user-edit me-2"></i>
                <strong>Permissões Limitadas:</strong> Pode visualizar tudo, editar docentes, mas não excluir
            </div>
        `;
    } else if (perfil.nome === 'Supervisor') {
        permissoesHTML = `
            <div class="alert alert-secondary">
                <i class="fas fa-chart-line me-2"></i>
                <strong>Permissões de Visualização:</strong> Apenas visualização e geração de relatórios
            </div>
        `;
    }
    
    // Usuários com este perfil
    const usuariosComPerfil = SistemaStorage.usuarios.filter(u => u.perfil_id === perfilId);
    let usuariosHTML = '';
    
    if (usuariosComPerfil.length > 0) {
        usuariosHTML = `
            <h6 class="mt-3 mb-2">Usuários com este perfil (${usuariosComPerfil.length}):</h6>
            <div class="list-group">
        `;
        
        usuariosComPerfil.forEach(usuario => {
            usuariosHTML += `
                <div class="list-group-item small">
                    <i class="fas fa-user me-2 ${usuario.ativo ? 'text-success' : 'text-secondary'}"></i>
                    <strong>${usuario.nome}</strong>
                    <span class="badge ${usuario.ativo ? 'bg-success' : 'bg-secondary'} ms-2">
                        ${usuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    <div class="text-muted">${usuario.cpf}</div>
                </div>
            `;
        });
        
        usuariosHTML += '</div>';
    } else {
        usuariosHTML = `
            <div class="alert alert-light mt-3">
                <i class="fas fa-info-circle me-2"></i>
                Nenhum usuário possui este perfil no momento.
            </div>
        `;
    }
    
    // Criar modal
    const modalHTML = `
        <div class="modal fade" id="detalhesPerfilModal">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-user-shield me-2"></i>
                            Detalhes do Perfil: ${perfil.nome}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-8">
                                <h6>Descrição:</h6>
                                <p>${perfil.descricao || 'Sem descrição'}</p>
                                
                                ${permissoesHTML}
                            </div>
                            <div class="col-md-4">
                                <div class="card">
                                    <div class="card-header">
                                        <h6 class="mb-0">Informações</h6>
                                    </div>
                                    <div class="card-body">
                                        <p><strong>ID:</strong> ${perfil.id}</p>
                                        <p><strong>Tipo:</strong> Pré-definido</p>
                                        <p><strong>Editável:</strong> ${perfil.editavel ? 'Sim' : 'Não'}</p>
                                        <p><strong>Criado em:</strong> ${perfil.data_criacao || 'Data não disponível'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        ${usuariosHTML}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Inserir modal no DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('detalhesPerfilModal'));
    modal.show();
    
    // Remover modal do DOM quando fechar
    modalContainer.addEventListener('hidden.bs.modal', function() {
        document.body.removeChild(modalContainer);
    });
};

// ========== FUNÇÕES PARA VISUALIZAR/EDITAR PERMISSÕES ==========

window.visualizarPermissoesPerfil = function(perfilId) {
    const perfil = SistemaStorage.getPerfilPorId(perfilId);
    if (!perfil) return;
    
    // Criar tabela de permissões
    let html = `
        <div class="modal-header">
            <h5 class="modal-title">Permissões do Perfil: ${perfil.nome}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            <p class="text-muted mb-3">${perfil.descricao || 'Sem descrição'}</p>
            
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Módulo</th>
                            <th>Permissão</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    // Organizar permissões por módulo
    const permissoesPorModulo = {
        'CONTROLE DE FALTAS': ['ver_faltas', 'registrar_falta', 'editar_falta', 'excluir_falta'],
        'DADOS DO DOCENTE': ['ver_docentes', 'cadastrar_docente', 'editar_docente', 'excluir_docente'],
        'JUSTIFICATIVAS': ['ver_justificativas', 'gerenciar_justificativas'],
        'RELATÓRIOS E ESTATÍSTICAS': ['ver_relatorios', 'gerar_relatorio_pdf'],
        'CONFIGURAÇÕES': ['acessar_configuracoes', 'gerenciar_disciplinas', 'gerenciar_cursos', 'gerenciar_justificativas', 'gerenciar_usuarios', 'editar_usuario', 'resetar_senhas', 'visualizar_logs', 'gerenciar_perfis']
    };
    
    Object.entries(permissoesPorModulo).forEach(([modulo, permissoes]) => {
        html += `
            <tr>
                <td colspan="3" class="bg-light fw-bold">${modulo}</td>
            </tr>
        `;
        
        permissoes.forEach(permissao => {
            const nomePermissao = permissao.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const temPermissao = perfil.permissoes[permissao] === true;
            
            html += `
                <tr>
                    <td></td>
                    <td>${nomePermissao}</td>
                    <td>
                        <span class="badge ${temPermissao ? 'bg-success' : 'bg-secondary'}">
                            ${temPermissao ? '✓ Permitido' : '✗ Negado'}
                        </span>
                    </td>
                </tr>
            `;
        });
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
        </div>
    `;
    
    // Criar modal dinâmico
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal fade';
    modalDiv.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                ${html}
            </div>
        </div>
    `;
    
    document.body.appendChild(modalDiv);
    const modal = new bootstrap.Modal(modalDiv);
    modal.show();
    
    // Remover modal do DOM quando fechar
    modalDiv.addEventListener('hidden.bs.modal', function() {
        document.body.removeChild(modalDiv);
    });
};

window.editarPermissoesPerfil = function(perfilId) {
    if (!temPermissao('gerenciar_perfis')) {
        alert('❌ Você não tem permissão para editar permissões!');
        return;
    }
    
    const perfil = SistemaStorage.getPerfilPorId(perfilId);
    if (!perfil || perfil.nome === 'Master') {
        alert('❌ Não é possível editar as permissões do perfil Master!');
        return;
    }
    
    // Aqui você pode criar um modal interativo para editar permissões
    // Para simplificar, vou mostrar um alerta com opções
    const opcoes = {
        'Gestor': 'Todas as permissões (exceto Master)',
        'Operador': 'Permissões limitadas (pode ver tudo, editar docentes, mas não excluir)',
        'Supervisor': 'Apenas visualização e relatórios'
    };
    
    let mensagem = `Editar permissões do perfil: ${perfil.nome}\n\n`;
    mensagem += 'Selecione um modelo de permissões:\n\n';
    
    Object.entries(opcoes).forEach(([nome, descricao]) => {
        if (nome !== 'Master') {
            mensagem += `${nome}: ${descricao}\n`;
        }
    });
    
    const modelo = prompt(mensagem + '\nDigite o nome do modelo (Gestor, Operador ou Supervisor):', perfil.nome);
    
    if (modelo) {
        // Atualizar permissões baseado no modelo
        let novasPermissoes = {};
        
        switch(modelo.toUpperCase()) {
            case 'GESTOR':
                // Todas permissões (exceto alterar Master)
                novasPermissoes = {
                    ver_faltas: true,
                    registrar_falta: true,
                    editar_falta: true,
                    excluir_falta: true,
                    ver_docentes: true,
                    cadastrar_docente: true,
                    editar_docente: true,
                    excluir_docente: true,
                    ver_justificativas: true,
                    gerenciar_justificativas: true,
                    ver_relatorios: true,
                    gerar_relatorio_pdf: true,
                    acessar_configuracoes: true,
                    gerenciar_disciplinas: true,
                    gerenciar_cursos: true,
                    gerenciar_usuarios: true,
                    editar_usuario: true,
                    resetar_senhas: true,
                    visualizar_logs: true,
                    gerenciar_perfis: true
                };
                break;
                
            case 'OPERADOR':
                // Permissões limitadas
                novasPermissoes = {
                    ver_faltas: true,
                    registrar_falta: true,
                    editar_falta: false,
                    excluir_falta: false,
                    ver_docentes: true,
                    cadastrar_docente: false,
                    editar_docente: true,
                    excluir_docente: false,
                    ver_justificativas: true,
                    gerenciar_justificativas: false,
                    ver_relatorios: true,
                    gerar_relatorio_pdf: false,
                    acessar_configuracoes: false,
                    gerenciar_disciplinas: false,
                    gerenciar_cursos: false,
                    gerenciar_usuarios: false,
                    editar_usuario: false,
                    resetar_senhas: false,
                    visualizar_logs: false,
                    gerenciar_perfis: false
                };
                break;
                
            case 'SUPERVISOR':
                // Apenas visualização
                novasPermissoes = {
                    ver_faltas: true,
                    registrar_falta: false,
                    editar_falta: false,
                    excluir_falta: false,
                    ver_docentes: true,
                    cadastrar_docente: false,
                    editar_docente: false,
                    excluir_docente: false,
                    ver_justificativas: true,
                    gerenciar_justificativas: false,
                    ver_relatorios: true,
                    gerar_relatorio_pdf: true,
                    acessar_configuracoes: false,
                    gerenciar_disciplinas: false,
                    gerenciar_cursos: false,
                    gerenciar_usuarios: false,
                    editar_usuario: false,
                    resetar_senhas: false,
                    visualizar_logs: false,
                    gerenciar_perfis: false
                };
                break;
                
            default:
                alert('❌ Modelo inválido!');
                return;
        }
        
        if (confirm(`Confirmar alteração das permissões do perfil "${perfil.nome}" para o modelo "${modelo}"?`)) {
            if (SistemaStorage.atualizarPerfil(perfilId, { permissoes: novasPermissoes })) {
                alert(`✅ Permissões do perfil "${perfil.nome}" atualizadas com sucesso!`);
                
                // Atualizar lista de perfis
                carregarListaPerfis();
                
                // Aplicar novas permissões na interface se o usuário atual foi afetado
                const usuarioAtual = SistemaStorage.getUsuarioAtual();
                if (usuarioAtual && usuarioAtual.perfil_id === perfilId) {
                    aplicarPermissoesInterface();
                }
            } else {
                alert('❌ Erro ao atualizar permissões!');
            }
        }
    }
};

// ========== FUNÇÕES PARA O MODAL DE PERMISSÕES ==========

// Função para criar o HTML dos checkboxes de permissões
function criarCheckboxesPermissoes(perfil) {
    console.log('Criando checkboxes para perfil:', perfil.nome);
    
    // Estrutura de permissões organizada por módulos
    const modulos = [
        {
            nome: 'CONTROLE DE FALTAS',
            permissoes: [
                { id: 'ver_faltas', label: 'Visualizar faltas' },
                { id: 'registrar_falta', label: 'Registrar nova falta' },
                { id: 'editar_falta', label: 'Editar falta' },
                { id: 'excluir_falta', label: 'Excluir faltas' }
            ]
        },
        {
            nome: 'DADOS DO DOCENTE',
            permissoes: [
                { id: 'ver_docentes', label: 'Visualizar docentes' },
                { id: 'cadastrar_docente', label: 'Cadastrar novo docente' },
                { id: 'editar_docente', label: 'Editar docente' },
                { id: 'excluir_docente', label: 'Excluir docentes' }
            ]
        },
        {
            nome: 'JUSTIFICATIVAS',
            permissoes: [
                { id: 'ver_justificativas', label: 'Visualizar justificativas' },
                { id: 'gerenciar_justificativas', label: 'Cadastrar/editar justificativas' }
            ]
        },
        {
            nome: 'RELATÓRIOS E ESTATÍSTICAS',
            permissoes: [
                { id: 'ver_relatorios', label: 'Visualizar relatórios' },
                { id: 'gerar_relatorio_pdf', label: 'Gerar relatório PDF' }
            ]
        },
        {
            nome: 'CONFIGURAÇÕES',
            permissoes: [
                { id: 'acessar_configuracoes', label: 'Acessar configurações' },
                { id: 'gerenciar_disciplinas', label: 'Gerenciar disciplinas' },
                { id: 'gerenciar_cursos', label: 'Gerenciar cursos' },
                { id: 'gerenciar_justificativas', label: 'Gerenciar justificativas' },
                { id: 'gerenciar_usuarios', label: 'Gerenciar usuários' },
                { id: 'editar_usuario', label: 'Editar usuário' },
                { id: 'resetar_senhas', label: 'Resetar senhas' },
                { id: 'visualizar_logs', label: 'Visualizar logs' },
                { id: 'gerenciar_perfis', label: 'Gerenciar perfis' }
            ]
        }
    ];
    
    let html = '';
    
    modulos.forEach((modulo, index) => {
        const moduloId = `modulo_${index}`;
        const show = index === 0; // Primeiro módulo aberto
        
        html += `
            <div class="card mb-3">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">
                        <i class="fas fa-${getIconeModulo(modulo.nome)} me-2"></i>
                        ${modulo.nome}
                    </h6>
                    <div>
                        <button type="button" class="btn btn-sm btn-light" onclick="selecionarTodosModulo('${modulo.nome}')">
                            <i class="fas fa-check-double me-1"></i> Todos
                        </button>
                        <button type="button" class="btn btn-sm btn-light ms-1" onclick="limparTodosModulo('${modulo.nome}')">
                            <i class="fas fa-times me-1"></i> Limpar
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
        `;
        
        modulo.permissoes.forEach(permissao => {
            const checked = perfil.permissoes[permissao.id] === true;
            html += `
                <div class="col-md-4 mb-2">
                    <div class="form-check">
                        <input class="form-check-input permissao-checkbox" 
                               type="checkbox" 
                               id="perm_${permissao.id}"
                               data-modulo="${modulo.nome}"
                               data-permissao="${permissao.id}"
                               ${checked ? 'checked' : ''}>
                        <label class="form-check-label" for="perm_${permissao.id}">
                            ${permissao.label}
                        </label>
                    </div>
                </div>
            `;
        });
        
        html += `
                    </div>
                </div>
            </div>
        `;
    });
    
    return html;
}

// Função auxiliar para ícones
function getIconeModulo(modulo) {
    const icones = {
        'CONTROLE DE FALTAS': 'calendar-alt',
        'DADOS DO DOCENTE': 'users',
        'JUSTIFICATIVAS': 'file-alt',
        'RELATÓRIOS E ESTATÍSTICAS': 'chart-bar',
        'CONFIGURAÇÕES': 'cog'
    };
    return icones[modulo] || 'circle';
}

// Função para selecionar todos os checkboxes de um módulo
window.selecionarTodosModulo = function(modulo) {
    console.log('Selecionando todos do módulo:', modulo);
    const checkboxes = document.querySelectorAll(`.permissao-checkbox[data-modulo="${modulo}"]`);
    checkboxes.forEach(cb => cb.checked = true);
};

// Função para limpar todos os checkboxes de um módulo
window.limparTodosModulo = function(modulo) {
    console.log('Limpando todos do módulo:', modulo);
    const checkboxes = document.querySelectorAll(`.permissao-checkbox[data-modulo="${modulo}"]`);
    checkboxes.forEach(cb => cb.checked = false);
};

// Função para salvar as permissões (sobrescrevendo a existente)
function salvarPermissoes() {
    console.log('Salvando permissões...');
    
    if (!perfilEditandoId) {
        alert('❌ Erro: ID do perfil não encontrado!');
        return;
    }
    
    const perfil = SistemaStorage.getPerfilPorId(perfilEditandoId);
    if (!perfil) {
        alert('❌ Perfil não encontrado!');
        return;
    }
    
    // Coletar todas as permissões dos checkboxes
    const novasPermissoes = {};
    const checkboxes = document.querySelectorAll('.permissao-checkbox');
    
    checkboxes.forEach(checkbox => {
        const permissao = checkbox.getAttribute('data-permissao');
        novasPermissoes[permissao] = checkbox.checked;
    });
    
    console.log('Novas permissões:', novasPermissoes);
    
    // Confirmar com o usuário
    if (!confirm(`Deseja salvar as novas permissões para o perfil "${perfil.nome}"?`)) {
        return;
    }
    
    // Atualizar no storage
    if (SistemaStorage.atualizarPerfil(perfilEditandoId, { permissoes: novasPermissoes })) {
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editarPermissoesModal'));
        if (modal) modal.hide();
        
        // Atualizar lista de perfis
        carregarListaPerfis();
        
        // Se o usuário atual tiver este perfil, aplicar novas permissões
        const usuarioAtual = SistemaStorage.getUsuarioAtual();
        if (usuarioAtual && usuarioAtual.perfil_id === perfilEditandoId) {
            aplicarPermissoesInterface();
        }
        
        alert(`✅ Permissões do perfil "${perfil.nome}" atualizadas com sucesso!`);
    } else {
        alert('❌ Erro ao salvar permissões!');
    }
}

// Função para abrir o modal de edição de permissões (sobrescrevendo a existente)
window.editarPermissoesPerfil = function(perfilId) {
    console.log('Editando permissões do perfil ID:', perfilId);
    
    if (!temPermissao('gerenciar_perfis')) {
        alert('❌ Você não tem permissão para editar perfis!');
        return;
    }
    
    const perfil = SistemaStorage.getPerfilPorId(perfilId);
    if (!perfil) {
        alert('❌ Perfil não encontrado!');
        return;
    }
    
    // Verificar se é Master (não editável)
    if (perfil.nome === 'Master') {
        alert('❌ O perfil Master não pode ser editado!');
        return;
    }
    
    perfilEditandoId = perfilId;
    
    // Atualizar título do modal
    const tituloElement = document.getElementById('perfilNomeTitulo');
    if (tituloElement) {
        tituloElement.textContent = perfil.nome;
    }
    
    // Preencher o corpo do modal com os checkboxes
    const modalBody = document.querySelector('#editarPermissoesModal .modal-body');
    if (modalBody) {
        modalBody.innerHTML = `
            <form id="permissoesForm">
                ${criarCheckboxesPermissoes(perfil)}
                <div class="alert alert-info mt-3" id="masterWarning" style="display: none;">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Perfil Master:</strong> Este perfil tem todas as permissões e não pode ser editado.
                </div>
            </form>
        `;
    }
    
    // Abrir modal
    const modalElement = document.getElementById('editarPermissoesModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } else {
        console.error('Modal de permissões não encontrado!');
        alert('❌ Erro ao abrir modal de permissões!');
    }
};

// Garantir que o botão salvar está configurado
document.addEventListener('DOMContentLoaded', function() {
    const salvarBtn = document.getElementById('salvarPermissoesBtn');
    if (salvarBtn) {
        // Remover listeners antigos
        const newSalvarBtn = salvarBtn.cloneNode(true);
        salvarBtn.parentNode.replaceChild(newSalvarBtn, salvarBtn);
        
        // Adicionar novo listener
        newSalvarBtn.addEventListener('click', salvarPermissoes);
    }
});

// ========== FUNÇÕES PARA EDITAR CURSOS ==========
window.editarCurso = function(nomeAtual) {
    const novoNome = prompt(`Editar curso:\n\nNome atual: ${nomeAtual}\n\nDigite o novo nome:`, nomeAtual);
    
    if (!novoNome || novoNome.trim() === nomeAtual) return;
    
    const novoNomeTrim = novoNome.trim();
    
    const existe = SistemaStorage.cursos.some(c => 
        c.toLowerCase() === novoNomeTrim.toLowerCase() && c !== nomeAtual
    );
    
    if (existe) {
        alert(`❌ O curso "${novoNomeTrim}" já existe!`);
        return;
    }
    
    const index = SistemaStorage.cursos.indexOf(nomeAtual);
    if (index !== -1) {
        SistemaStorage.cursos[index] = novoNomeTrim;
        SistemaStorage.salvar('cursos', SistemaStorage.cursos);
    }
    
    // Atualizar docentes que usam este curso
    SistemaStorage.docentes.forEach(docente => {
        const cursoIndex = docente.cursos.indexOf(nomeAtual);
        if (cursoIndex !== -1) {
            docente.cursos[cursoIndex] = novoNomeTrim;
        }
    });
    SistemaStorage.salvar('docentes', SistemaStorage.docentes);
    
    // Atualizar faltas que usam este curso
    SistemaStorage.faltas.forEach(falta => {
        if (falta.curso === nomeAtual) {
            falta.curso = novoNomeTrim;
        }
    });
    SistemaStorage.salvar('faltas', SistemaStorage.faltas);
    
    carregarListaCursos();
    atualizarSelectsCursos();
    atualizarTabelaDocentes();
    atualizarTabelaFaltas();
    
    alert(`✅ Curso atualizado de "${nomeAtual}" para "${novoNomeTrim}"!`);
};

// ========== FUNÇÕES PARA EDITAR JUSTIFICATIVAS ==========
window.editarJustificativaConfig = function(descricaoAtual) {
    const novaDescricao = prompt(`Editar justificativa:\n\nDescrição atual: ${descricaoAtual}\n\nDigite a nova descrição:`, descricaoAtual);
    
    if (!novaDescricao || novaDescricao.trim() === descricaoAtual) return;
    
    const novaDescricaoTrim = novaDescricao.trim();
    
    const existe = SistemaStorage.justificativas.some(j => 
        j.toLowerCase() === novaDescricaoTrim.toLowerCase() && j !== descricaoAtual
    );
    
    if (existe) {
        alert(`❌ A justificativa "${novaDescricaoTrim}" já existe!`);
        return;
    }
    
    const index = SistemaStorage.justificativas.indexOf(descricaoAtual);
    if (index !== -1) {
        SistemaStorage.justificativas[index] = novaDescricaoTrim;
        SistemaStorage.salvar('justificativas', SistemaStorage.justificativas);
    }
    
    // Atualizar faltas que usam esta justificativa
    SistemaStorage.faltas.forEach(falta => {
        if (falta.justificativa === descricaoAtual) {
            falta.justificativa = novaDescricaoTrim;
        }
    });
    SistemaStorage.salvar('faltas', SistemaStorage.faltas);
    
    carregarListaJustificativasConfig();
    carregarJustificativas();
    atualizarSelectsJustificativas();
    atualizarTabelaFaltas();
    
    alert(`✅ Justificativa atualizada de "${descricaoAtual}" para "${novaDescricaoTrim}"!`);
};

// ========== FUNÇÕES GLOBAIS PARA PERFIS ==========
window.editarPerfil = function(id) {
    if (!temPermissao('gerenciar_perfis')) {
        alert('❌ Você não tem permissão para editar perfis!');
        return;
    }
    
    const perfil = SistemaStorage.getPerfilPorId(id);
    if (perfil) {
        perfilEditandoId = id;
        abrirModalPerfil(id);
    } else {
        alert('❌ Perfil não encontrado!');
    }
};

window.excluirPerfil = function(id) {
    if (!temPermissao('gerenciar_perfis')) {
        alert('❌ Você não tem permissão para excluir perfis!');
        return;
    }
    
    const perfil = SistemaStorage.getPerfilPorId(id);
    if (!perfil) return;
    
    if (confirm(`Tem certeza que deseja excluir o perfil "${perfil.nome}"?\n\nEsta ação não poderá ser desfeita.`)) {
        if (SistemaStorage.removerPerfil(id)) {
            carregarListaPerfis();
            alert('✅ Perfil excluído com sucesso!');
        } else {
            alert('❌ Erro ao excluir perfil.');
        }
    }
};

// ========== FUNÇÃO GERAR RELATÓRIO DE DOCENTES ==========

function gerarRelatorioDocentes() {
    console.log('📄 Gerando relatório de docentes...');
    
    const { dataInicio, dataFim } = getDatasFiltroAtual();
    const temFiltro = filtroAtivo();
    
    const faltasParaRelatorio = temFiltro 
        ? getFaltasFiltradasPorPeriodo(dataInicio, dataFim)
        : SistemaStorage.faltas;
    
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const horaAtual = new Date().toLocaleTimeString('pt-BR');
    const totalDocentes = SistemaStorage.docentes.length;
    const docentesAtivos = SistemaStorage.docentes.filter(d => d.ativo !== false).length;
    const docentesInativos = totalDocentes - docentesAtivos;
    
    const totalFaltas = faltasParaRelatorio.reduce((sum, f) => sum + (f.quantidadeFaltas || 0), 0);
    const faltasJustificadas = faltasParaRelatorio
        .filter(f => f.justificada)
        .reduce((sum, f) => sum + (f.quantidadeFaltas || 0), 0);
    const faltasNaoJustificadas = totalFaltas - faltasJustificadas;
    const percentualJustificadas = totalFaltas > 0 ? Math.round((faltasJustificadas / totalFaltas) * 100) : 0;
    
    let relatorio = `═══════════════════════════════════════════════════════════════
              RELATÓRIO DE DOCENTES
         SISTEMA DE CONTROLE DE FALTAS
═══════════════════════════════════════════════════════════════

📅 Data: ${dataAtual} às ${horaAtual}
`;
    
    if (temFiltro) {
        const periodoTexto = dataInicio && dataFim 
            ? `📆 Período: ${formatarDataCorreta(dataInicio)} a ${formatarDataCorreta(dataFim)}`
            : dataInicio 
                ? `📆 A partir de: ${formatarDataCorreta(dataInicio)}`
                : `📆 Até: ${formatarDataCorreta(dataFim)}`;
        
        relatorio += `${periodoTexto}\n`;
    }
    
    relatorio += `
═══════════════════════════════════════════════════════════════

📊 RESUMO GERAL:
───────────────────────────────────────────────────────────────
👥 Total de Docentes: ${totalDocentes}
   ├─ ✅ Ativos: ${docentesAtivos}
   └─ ❌ Inativos: ${docentesInativos}

📋 Total de Faltas: ${totalFaltas} ${temFiltro ? '(no período)' : ''}
   ├─ ✅ Justificadas: ${faltasJustificadas}
   └─ ❌ Não Justificadas: ${faltasNaoJustificadas}

📈 Percentual de Justificativas: ${percentualJustificadas}%

═══════════════════════════════════════════════════════════════

📋 LISTA DE DOCENTES:
───────────────────────────────────────────────────────────────
`;
    
    const docentesOrdenados = SistemaStorage.docentes
        .filter(docente => docente.ativo !== false)
        .sort((a, b) => a.nome.localeCompare(b.nome));
    
    docentesOrdenados.forEach((docente, index) => {
        const faltasDocente = faltasParaRelatorio
            .filter(f => f.docenteId === docente.id)
            .reduce((sum, f) => sum + (f.quantidadeFaltas || 0), 0);
        
        const faltasJustDocente = faltasParaRelatorio
            .filter(f => f.docenteId === docente.id && f.justificada)
            .reduce((sum, f) => sum + (f.quantidadeFaltas || 0), 0);
        
        const percentualDocente = faltasDocente > 0 ? Math.round((faltasJustDocente / faltasDocente) * 100) : 0;
        
        relatorio += `
${index + 1}. ${docente.nome}
   📚 Disciplinas: ${docente.disciplinas.join(', ')}
   🎓 Cursos: ${docente.cursos.join(', ')}
   ⏱️  Aulas/Semana: ${docente.aulas}
   📊 Total de Faltas: ${faltasDocente} ${temFiltro ? '(no período)' : ''}
      ├─ ✅ Justificadas: ${faltasJustDocente}
      └─ ❌ Não Justificadas: ${faltasDocente - faltasJustDocente}
      └─ 📈 Percentual: ${percentualDocente}%
`;
    });
    
    relatorio += `
═══════════════════════════════════════════════════════════════
            Relatório gerado automaticamente
═══════════════════════════════════════════════════════════════`;
    
    const janelaRelatorio = window.open('', '_blank');
    janelaRelatorio.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Relatório de Docentes</title>
            <style>
                body { 
                    font-family: 'Courier New', monospace; 
                    margin: 40px; 
                    background: #fff;
                    line-height: 1.5;
                }
                h1 { 
                    color: #2c3e50; 
                    border-bottom: 2px solid #3498db; 
                    padding-bottom: 10px;
                    font-family: Arial, sans-serif;
                }
                pre { 
                    background-color: #f8f9fa; 
                    padding: 20px; 
                    border-radius: 5px; 
                    border: 1px solid #dee2e6; 
                    white-space: pre-wrap;
                    font-size: 14px;
                }
                .btn-print { 
                    padding: 10px 20px; 
                    background-color: #3498db; 
                    color: white; 
                    border: none; 
                    border-radius: 5px; 
                    cursor: pointer; 
                    margin: 5px;
                    font-family: Arial, sans-serif;
                }
                .btn-print:hover { 
                    background-color: #2980b9; 
                }
                .btn-close {
                    padding: 10px 20px;
                    background-color: #95a5a6;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    margin: 5px;
                    font-family: Arial, sans-serif;
                }
                .btn-close:hover {
                    background-color: #7f8c8d;
                }
                .footer {
                    margin-top: 20px;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <h1>📄 Relatório de Docentes</h1>
            <pre>${relatorio}</pre>
            <div class="footer">
                <button class="btn-print" onclick="window.print()">🖨️ Imprimir Relatório</button>
                <button class="btn-close" onclick="window.close()">✖️ Fechar</button>
            </div>
        </body>
        </html>
    `);
}



// ========== FUNÇÃO PARA FILTRAR USUÁRIOS ==========
function filtrarUsuarios() {
    const busca = document.getElementById('buscaUsuario')?.value.toLowerCase() || '';
    const itens = document.querySelectorAll('#listaUsuarios .list-group-item');
    
    itens.forEach(item => {
        const nome = item.querySelector('h6')?.textContent.toLowerCase() || '';
        const cpf = item.querySelector('.small.text-muted')?.textContent.toLowerCase() || '';
        const email = item.querySelector('.small.text-muted')?.textContent.toLowerCase() || '';
        
        const corresponde = nome.includes(busca) || 
                          cpf.includes(busca) || 
                          email.includes(busca);
        
        item.style.display = corresponde ? 'flex' : 'none';
    });
}

// ========== CONFIGURAR EVENTOS ADICIONAIS ==========
document.addEventListener('DOMContentLoaded', function() {
    // Botão Novo Perfil
    const btnNovoPerfil = document.getElementById('btnNovoPerfil');
    if (btnNovoPerfil) {
        btnNovoPerfil.addEventListener('click', function() {
            if (!temPermissao('gerenciar_perfis')) {
                alert('❌ Você não tem permissão para criar perfis!');
                return;
            }
            
            perfilEditandoId = null;
            abrirModalPerfil();
        });
    }
    
    // Botão salvar perfil
    const salvarPerfilBtn = document.getElementById('salvarPerfilBtn');
    if (salvarPerfilBtn) {
        salvarPerfilBtn.addEventListener('click', salvarPerfil);
    }
    
    // Configurar selects dos filtros de logs
    const filtroLogUsuario = document.getElementById('filtroLogUsuario');
    if (filtroLogUsuario) {
        // Carregar usuários no filtro
        SistemaStorage.usuarios.forEach(usuario => {
            if (!usuario.master) {
                const option = document.createElement('option');
                option.value = usuario.id;
                option.textContent = usuario.nome;
                filtroLogUsuario.appendChild(option);
            }
        });
    }
});

// ========== FUNÇÃO PARA CARREGAR SELECTS DE USUÁRIO NO MODAL ==========
function carregarSelectsUsuario() {
    // Esta função pode ser usada para carregar selects que precisam de dados de usuários
    // Por exemplo, em filtros ou selects relacionados
}

// ========== FINALIZAÇÃO DO SISTEMA ==========
console.log('✅ Sistema completamente inicializado!');
