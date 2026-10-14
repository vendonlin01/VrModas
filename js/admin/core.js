// ==========================================================================
// VR MODAS - NÚCLEO ADMINISTRATIVO & CONTROLO DE ACESSO (RBAC)
// js/admin/core.js
// ==========================================================================

let usuarioAdminLogado = null;

const mapaTitulos = {
    'secao-dashboard': { titulo: '📊 Dashboard de Vendas', sub: 'Métricas gerais e faturamento da VR Modas' },
    'secao-cadastro': { titulo: '➕ Cadastrar Nova Peça', sub: 'Adicione novidades e variações ao catálogo' },
    'secao-catalogo': { titulo: '📦 Catálogo & Estoque', sub: 'Gerencie peças ativas, preços e quantidades' },
    'secao-pedidos': { titulo: '🛍️ Gestão de Pedidos', sub: 'Acompanhe envios, pagamentos e notificações' },
    'secao-banners': { titulo: '🎨 Banners da Vitrine', sub: 'Personalize os destaques da página inicial' },
    'secao-config': { titulo: '⚙️ Configurações da Loja', sub: 'Dados de contacto, cupons e regras' },
    'secao-equipe': { titulo: '👥 Gestão de Equipe', sub: 'Controle de acessos e permissões administrativas' }
};

/**
 * 1. Verificação de Segurança e Sessão
 */
function verificarAutenticacaoAdmin() {
    try {
        usuarioAdminLogado = JSON.parse(sessionStorage.getItem('vr_usuario_ativo')) ||
                             JSON.parse(localStorage.getItem('vr_usuario_ativo')) ||
                             JSON.parse(localStorage.getItem('usuarioLogado'));
    } catch (e) {
        usuarioAdminLogado = null;
    }

    const estaAutenticado = (usuarioAdminLogado && (usuarioAdminLogado.role === 'admin' || usuarioAdminLogado.role === 'owner')) ||
                            sessionStorage.getItem('vr_admin_logado') === 'true' ||
                            localStorage.getItem('vr_admin_logado') === 'true';

    if (!estaAutenticado) {
        alert('⛔ Acesso Restrito: Inicie sessão com uma conta administrativa para aceder ao painel.');
        window.location.href = 'login.html';
        return false;
    }

    aplicarPermissoesInterface();
    return true;
}

/**
 * 2. Oculta ou exibe abas conforme as permissões do colaborador
 */
function aplicarPermissoesInterface() {
    if (!usuarioAdminLogado) return;

    // Se a role for owner, admin ou não estiver explicitamente restrita, concede acesso total às abas operacionais
    const ehDono = usuarioAdminLogado.role === 'owner' || !usuarioAdminLogado.role;
    const ehAdmin = usuarioAdminLogado.role === 'admin';
    const permissoes = usuarioAdminLogado.permissoes || {};

    const regrasBotoes = [
        { id: 'btn-nav-dashboard', perm: 'dashboard' },
        { id: 'btn-nav-cadastro', perm: 'produtos' },
        { id: 'btn-nav-catalogo', perm: 'produtos' },
        { id: 'btn-nav-pedidos', perm: 'pedidos' },
        { id: 'btn-nav-banners', perm: 'banners' },
        { id: 'btn-nav-config', perm: 'configuracoes' }
    ];

    regrasBotoes.forEach(item => {
        const btn = document.getElementById(item.id);
        if (btn) {
            // Se for proprietário ou administrador com permissão (ou sem restrições explícitas), mostra o botão
            const temAcesso = ehDono || permissoes[item.perm] === true || (ehAdmin && Object.keys(permissoes).length === 0);
            btn.style.setProperty('display', temAcesso ? 'inline-flex' : 'none', 'important');
        }
    });

    // Apenas o proprietário tem acesso à gestão de equipa
    const btnEquipe = document.getElementById('btn-nav-equipe');
    if (btnEquipe) {
        const podeVerEquipe = ehDono || usuarioAdminLogado.role === 'owner';
        btnEquipe.style.setProperty('display', podeVerEquipe ? 'inline-flex' : 'none', 'important');
    }
}

/**
 * 3. Alternador de Abas do Painel com Isolamento Estrito
 */
function alternarAbaAdmin(idAlvo) {
    if (!idAlvo) return;

    const ehDono = usuarioAdminLogado && usuarioAdminLogado.role === 'owner';

    // Trava de segurança para a aba de equipa
    if (idAlvo === 'secao-equipe' && !ehDono) {
        alert('⛔ Acesso Restrito: Apenas o proprietário da VR Modas pode gerir a equipa.');
        return;
    }

    // Atualiza os botões do menu superior
    const botoesNav = document.querySelectorAll('.admin-nav .nav-btn');
    botoesNav.forEach(btn => {
        btn.classList.toggle('ativo', btn.getAttribute('data-alvo') === idAlvo);
    });

    // Oculta forçadamente todas as secções e exibe unicamente a selecionada
    const secoes = document.querySelectorAll('.secao-admin, .secao-conteudo');
    secoes.forEach(sec => {
        if (sec.id === idAlvo) {
            sec.classList.add('ativa');
            sec.style.setProperty('display', 'block', 'important');
        } else {
            sec.classList.remove('ativa');
            sec.style.setProperty('display', 'none', 'important');
        }
    });

    // Atualiza cabeçalho de título da página
    const tituloSecao = document.getElementById('titulo-secao-atual');
    const subtituloSecao = document.getElementById('subtitulo-secao-atual');
    if (mapaTitulos[idAlvo]) {
        if (tituloSecao) tituloSecao.innerText = mapaTitulos[idAlvo].titulo;
        if (subtituloSecao) subtituloSecao.innerText = mapaTitulos[idAlvo].sub;
    }

    // Carregamento de dados sob demanda
    if (idAlvo === 'secao-dashboard' && typeof atualizarDashboard === 'function') atualizarDashboard();
    if (idAlvo === 'secao-catalogo' && typeof carregarEAtualizarTabelaProdutos === 'function') carregarEAtualizarTabelaProdutos();
    if (idAlvo === 'secao-pedidos' && typeof carregarEAtualizarTabelaPedidos === 'function') carregarEAtualizarTabelaPedidos();
    if (idAlvo === 'secao-banners' && typeof carregarEAtualizarListaBanners === 'function') carregarEAtualizarListaBanners();
    if (idAlvo === 'secao-equipe' && typeof carregarListaEquipe === 'function') carregarListaEquipe();
}
window.alternarAbaAdmin = alternarAbaAdmin;

/**
 * 4. Inicialização de Eventos
 */
document.addEventListener('DOMContentLoaded', () => {
    if (!verificarAutenticacaoAdmin()) return;

    // Escuta de cliques nos botões do menu
    const botoesNav = document.querySelectorAll('.admin-nav .nav-btn');
    botoesNav.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const alvo = btn.getAttribute('data-alvo');
            alternarAbaAdmin(alvo);
        });
    });

    // Garante que logo na abertura apenas a aba inicial (Dashboard) fique visível
    alternarAbaAdmin('secao-dashboard');

    // Botão de desconectar
    const btnLogout = document.getElementById('btn-admin-logout') || document.getElementById('btn-logout-admin');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.clear();
            localStorage.removeItem('vr_usuario_ativo');
            localStorage.removeItem('vr_cliente_dados');
            localStorage.removeItem('vr_cliente_logado');
            localStorage.removeItem('vr_admin_logado');
            localStorage.removeItem('usuarioLogado');
            window.location.href = 'home.html';
        });
    }
});