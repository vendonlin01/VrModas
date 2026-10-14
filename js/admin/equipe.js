// ==========================================================================
// VR MODAS - GESTÃO DE EQUIPA & ADMINISTRADORES (NEON DB)
// js/admin/equipe.js
// ==========================================================================

/**
 * 1. Carrega e renderiza a lista de colaboradores com os seus crachás de permissões
 */
async function carregarListaEquipe() {
    const listaEquipeAdmin = document.getElementById('lista-equipe-admin');
    if (!listaEquipeAdmin) return;

    listaEquipeAdmin.innerHTML = '<p style="color: var(--cinza-texto, #888); text-align: center; padding: 20px;">A carregar equipa...</p>';

    try {
        const sql = await getSql();
        const membros = await sql`
            SELECT id, nome, email, role, permissoes 
            FROM usuarios 
            WHERE role IN ('admin', 'owner')
            ORDER BY role DESC, id ASC;
        `;

        if (!membros || membros.length === 0) {
            listaEquipeAdmin.innerHTML = '<p style="color: var(--cinza-texto, #888); text-align: center; padding: 20px;">Nenhum membro administrativo registado.</p>';
            return;
        }

        listaEquipeAdmin.innerHTML = '';
        membros.forEach(m => {
            const ehDono = m.role === 'owner';
            const perms = (typeof m.permissoes === 'object' && m.permissoes !== null) ? m.permissoes : {};

            const tagsPermissoes = ehDono ? '<span style="color: #4cd137; font-weight: 700; font-size: 11px;">Acesso Total Irrestrito</span>' : [
                perms.dashboard ? '📊 Dashboard' : null,
                perms.produtos ? '👗 Produtos' : null,
                perms.pedidos ? '🛍️ Pedidos' : null,
                perms.banners ? '🎨 Banners' : null,
                perms.configuracoes ? '⚙️ Configs' : null
            ].filter(Boolean).map(t => `<span style="background: rgba(255,255,255,0.08); border: 1px solid #444; padding: 3px 6px; border-radius: 4px; font-size: 11px; margin-right: 4px;">${t}</span>`).join('') || '<span style="color: #ff6b6b; font-size: 11px;">Sem áreas atribuídas</span>';

            listaEquipeAdmin.insertAdjacentHTML('beforeend', `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px; border-bottom: 1px solid rgba(255,255,255,0.06); gap: 12px; flex-wrap: wrap;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <strong style="color: #fff; font-size: 14px;">${m.nome || 'Utilizador'}</strong>
                            <span style="font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: 700; background: ${ehDono ? 'rgba(212,175,55,0.15)' : 'rgba(74,144,226,0.15)'}; color: ${ehDono ? '#d4af37' : '#4a90e2'}; border: 1px solid ${ehDono ? 'rgba(212,175,55,0.4)' : 'rgba(74,144,226,0.4)'};">
                                ${ehDono ? '👑 PROPRIETÁRIO' : '🛡️ ADMINISTRADOR'}
                            </span>
                        </div>
                        <small style="color: var(--cinza-texto, #888);">${m.email}</small>
                        <div style="margin-top: 6px;">${tagsPermissoes}</div>
                    </div>
                    <div>
                        ${ehDono ? '' : `
                            <button type="button" onclick="revogarAcessoAdmin(${m.id})" style="background: rgba(255,68,68,0.1); border: 1px solid #ff4444; color: #ff4444; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;">
                                Revogar Acesso
                            </button>
                        `}
                    </div>
                </div>
            `);
        });

    } catch (e) {
        console.error('Erro ao carregar lista de membros:', e);
        listaEquipeAdmin.innerHTML = '<p style="color: #ff4444; text-align: center; padding: 20px;">Falha ao ligar à base de dados para listar a equipa.</p>';
    }
}

/**
 * 2. Guarda ou atualiza as permissões de um novo colaborador
 */
async function salvarMembroEquipe(e) {
    e.preventDefault();

    const inputEmail = document.getElementById('equipe-email');
    const email = inputEmail ? inputEmail.value.trim().toLowerCase() : '';
    if (!email) {
        alert('Insira um e-mail válido.');
        return;
    }

    const permissoes = {
        dashboard: document.getElementById('perm-dashboard')?.checked || false,
        produtos: document.getElementById('perm-produtos')?.checked || false,
        pedidos: document.getElementById('perm-pedidos')?.checked || false,
        banners: document.getElementById('perm-banners')?.checked || false,
        configuracoes: document.getElementById('perm-configs')?.checked || false
    };

    try {
        const sql = await getSql();

        // 1. Procura se o utilizador já se encontra registado
        const utilizadores = await sql`
            SELECT id, role FROM usuarios WHERE LOWER(email) = ${email} LIMIT 1;
        `;

        if (!utilizadores || utilizadores.length === 0) {
            alert('⚠️ Utilizador não encontrado! Peça ao colaborador para criar primeiro uma conta de cliente com este e-mail na loja.');
            return;
        }

        const user = utilizadores[0];

        if (user.role === 'owner') {
            alert('Não é possível modificar permissões da conta do proprietário.');
            return;
        }

        // 2. Promove a 'admin' e guarda as permissões JSONB
        await sql`
            UPDATE usuarios 
            SET role = 'admin', permissoes = ${JSON.stringify(permissoes)}
            WHERE id = ${user.id};
        `;

        alert('✅ Colaborador configurado com sucesso!');
        if (inputEmail) inputEmail.value = '';
        
        // Desmarca as caixas de seleção
        ['perm-dashboard', 'perm-produtos', 'perm-pedidos', 'perm-banners', 'perm-configs'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.checked = false;
        });

        carregarListaEquipe();

    } catch (err) {
        console.error('Erro ao atualizar permissões do membro:', err);
        alert('Erro ao guardar alterações no Neon DB.');
    }
}

/**
 * 3. Revoga o acesso administrativo (volta ao perfil 'cliente')
 */
async function revogarAcessoAdmin(idUsuario) {
    if (!confirm('Deseja realmente revogar o acesso administrativo deste utilizador?')) return;

    try {
        const sql = await getSql();
        await sql`
            UPDATE usuarios 
            SET role = 'cliente', permissoes = '{}'::jsonb 
            WHERE id = ${idUsuario};
        `;

        alert('Acesso revogado com sucesso.');
        carregarListaEquipe();

    } catch (err) {
        console.error('Erro ao revogar acesso:', err);
        alert('Falha ao remover privilégios.');
    }
}

// Configuração do formulário de submissão
document.addEventListener('DOMContentLoaded', () => {
    const formEquipe = document.getElementById('form-gestao-equipe');
    if (formEquipe) {
        formEquipe.addEventListener('submit', salvarMembroEquipe);
    }
});