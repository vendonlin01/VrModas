// ==========================================================================
// VR MODAS - NÚCLEO ADMINISTRATIVO & CONTROLO DE ACESSO (RBAC)
// js/admin/core.js
// ==========================================================================

let usuarioAdminLogado = null;

const mapaTitulos = {
    'secao-dashboard': { titulo: '📊 Dashboard de Vendas', sub: 'Métricas gerais e faturamento da VR Modas' },
    'secao-relatorios': { titulo: '📅 Relatórios & Caixa', sub: 'Extrato diário, formas de pagamento e fechamento' },
    'secao-cadastro': { titulo: '➕ Cadastrar Nova Peça', sub: 'Adicione novidades e variações ao catálogo' },
    'secao-catalogo': { titulo: '📦 Catálogo & Estoque', sub: 'Gerencie peças ativas, preços e quantidades' },
    'secao-pedidos': { titulo: '🛍️ Gestão de Pedidos', sub: 'Acompanhe envios, pagamentos e notificações' },
    'secao-banners': { titulo: '🎨 Banners da Vitrine', sub: 'Personalize os destaques da página inicial' },
    'secao-config': { titulo: '⚙️ Configurações da Loja', sub: 'Dados de contacto, cupons e regras' },
    'secao-equipe': { titulo: '👥 Gestão de Equipe', sub: 'Controle de acessos e permissões administrativas' }
};

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

function aplicarPermissoesInterface() {
    if (!usuarioAdminLogado) return;

    const ehDono = usuarioAdminLogado.role === 'owner' || !usuarioAdminLogado.role;
    const ehAdmin = usuarioAdminLogado.role === 'admin';
    const permissoes = usuarioAdminLogado.permissoes || {};

    const regrasBotoes = [
        { id: 'btn-nav-dashboard', perm: 'dashboard' },
        { id: 'btn-nav-relatorios', perm: 'dashboard' },
        { id: 'btn-nav-cadastro', perm: 'produtos' },
        { id: 'btn-nav-catalogo', perm: 'produtos' },
        { id: 'btn-nav-pedidos', perm: 'pedidos' },
        { id: 'btn-nav-banners', perm: 'banners' },
        { id: 'btn-nav-config', perm: 'configuracoes' }
    ];

    regrasBotoes.forEach(item => {
        const btn = document.getElementById(item.id);
        if (btn) {
            const temAcesso = ehDono || permissoes[item.perm] === true || (ehAdmin && Object.keys(permissoes).length === 0);
            btn.style.setProperty('display', temAcesso ? 'inline-flex' : 'none', 'important');
        }
    });

    const btnEquipe = document.getElementById('btn-nav-equipe');
    if (btnEquipe) {
        const podeVerEquipe = ehDono || usuarioAdminLogado.role === 'owner';
        btnEquipe.style.setProperty('display', podeVerEquipe ? 'inline-flex' : 'none', 'important');
    }
}

function alternarAbaAdmin(idAlvo) {
    if (!idAlvo) return;

    const ehDono = usuarioAdminLogado && usuarioAdminLogado.role === 'owner';

    if (idAlvo === 'secao-equipe' && !ehDono) {
        alert('⛔ Acesso Restrito: Apenas o proprietário da VR Modas pode gerir a equipa.');
        return;
    }

    const botoesNav = document.querySelectorAll('.admin-nav .nav-btn');
    botoesNav.forEach(btn => {
        btn.classList.toggle('ativo', btn.getAttribute('data-alvo') === idAlvo);
    });

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

    const tituloSecao = document.getElementById('titulo-secao-atual');
    const subtituloSecao = document.getElementById('subtitulo-secao-atual');
    if (mapaTitulos[idAlvo]) {
        if (tituloSecao) tituloSecao.innerText = mapaTitulos[idAlvo].titulo;
        if (subtituloSecao) subtituloSecao.innerText = mapaTitulos[idAlvo].sub;
    }

    if (idAlvo === 'secao-dashboard' && typeof atualizarDashboard === 'function') atualizarDashboard();
    if (idAlvo === 'secao-relatorios' && typeof carregarRelatorioDataSelecionada === 'function') carregarRelatorioDataSelecionada();
    if (idAlvo === 'secao-catalogo' && typeof carregarEAtualizarTabelaProdutos === 'function') carregarEAtualizarTabelaProdutos();
    if (idAlvo === 'secao-pedidos' && typeof carregarEAtualizarTabelaPedidos === 'function') carregarEAtualizarTabelaPedidos();
    if (idAlvo === 'secao-banners' && typeof carregarEAtualizarListaBanners === 'function') carregarEAtualizarListaBanners();
    if (idAlvo === 'secao-equipe' && typeof carregarListaEquipe === 'function') carregarListaEquipe();
}
window.alternarAbaAdmin = alternarAbaAdmin;

document.addEventListener('DOMContentLoaded', () => {
    if (!verificarAutenticacaoAdmin()) return;

    const botoesNav = document.querySelectorAll('.admin-nav .nav-btn');
    botoesNav.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const alvo = btn.getAttribute('data-alvo');
            alternarAbaAdmin(alvo);
        });
    });

    alternarAbaAdmin('secao-dashboard');

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