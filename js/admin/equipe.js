// ==========================================================================
// VR MODAS - GESTÃO DE EQUIPE & ADMINISTRADORES (NEON DB)
// js/admin/equipe.js
// ==========================================================================

let listaMembrosEquipe = [];

/**
 * 1. Carrega e renderiza a lista de colaboradores com botão de Editar e Revogar
 */
async function carregarListaEquipe() {
    const listaEquipeAdmin = document.getElementById('lista-equipe-admin');
    if (!listaEquipeAdmin) return;

    listaEquipeAdmin.innerHTML = '<p style="color: var(--cinza-texto, #888); text-align: center; padding: 20px;">Carregando equipe...</p>';

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (!sql) throw new Error("Conexão SQL não inicializada");

        const membros = await sql`
            SELECT id, nome, email, role, permissoes 
            FROM usuarios 
            WHERE role IN ('admin', 'owner')
            ORDER BY role DESC, id ASC;
        `;

        listaMembrosEquipe = membros || [];

        if (!membros || membros.length === 0) {
            listaEquipeAdmin.innerHTML = '<p style="color: var(--cinza-texto, #888); text-align: center; padding: 20px;">Nenhum membro administrativo cadastrado.</p>';
            return;
        }

        listaEquipeAdmin.innerHTML = '';
        membros.forEach(m => {
            const ehDono = m.role === 'owner';
            
            // Trata as permissões com segurança
            let perms = {};
            try {
                perms = typeof m.permissoes === 'string' ? JSON.parse(m.permissoes) : (m.permissoes || {});
            } catch (e) {
                perms = {};
            }

            const tagsPermissoes = ehDono ? '<span style="color: #4cd137; font-weight: 700; font-size: 11px;">👑 Acesso Total Irrestrito</span>' : [
                perms.dashboard ? '📊 Dashboard' : null,
                perms.produtos ? '👗 Produtos' : null,
                perms.pedidos ? '🛍️ Pedidos' : null,
                perms.banners ? '🎨 Banners' : null,
                (perms.configuracoes || perms.config) ? '⚙️ Configurações' : null
            ].filter(Boolean).map(t => `<span style="background: rgba(255,255,255,0.08); border: 1px solid #444; padding: 3px 7px; border-radius: 4px; font-size: 11px; margin-right: 4px; display: inline-block; margin-top: 3px;">${t}</span>`).join('') || '<span style="color: #ff6b6b; font-size: 11px;">Sem áreas liberadas</span>';

            listaEquipeAdmin.insertAdjacentHTML('beforeend', `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px; background: rgba(255,255,255,0.02); border: 1px solid #282828; border-radius: 6px; margin-bottom: 8px; gap: 12px; flex-wrap: wrap;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <strong style="color: #fff; font-size: 14px;">${m.nome || 'Usuário'}</strong>
                            <span style="font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: 700; background: ${ehDono ? 'rgba(212,175,55,0.15)' : 'rgba(74,144,226,0.15)'}; color: ${ehDono ? '#d4af37' : '#4a90e2'}; border: 1px solid ${ehDono ? 'rgba(212,175,55,0.4)' : 'rgba(74,144,226,0.4)'};">
                                ${ehDono ? 'PROPRIETÁRIO' : 'ADMINISTRADOR'}
                            </span>
                        </div>
                        <small style="color: var(--cinza-texto, #888); font-size: 12px;">${m.email}</small>
                        <div style="margin-top: 6px;">${tagsPermissoes}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        ${ehDono ? '' : `
                            <!-- BOTÃO DE EDITAR -->
                            <button type="button" onclick="editarPermissoesMembro(${m.id})" title="Editar Permissões" style="background: rgba(212,175,55,0.1); border: 1px solid var(--dourado, #d4af37); color: var(--dourado, #d4af37); padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                                ✏️ Editar
                            </button>
                            <!-- BOTÃO DE REVOGAR -->
                            <button type="button" onclick="revogarAcessoAdmin(${m.id})" title="Revogar Acesso" style="background: rgba(255,68,68,0.1); border: 1px solid #ff4444; color: #ff4444; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
                                🗑️ Revogar
                            </button>
                        `}
                    </div>
                </div>
            `);
        });

    } catch (e) {
        console.error('Erro ao carregar lista de membros:', e);
        listaEquipeAdmin.innerHTML = `<p style="color: #ff4444; text-align: center; padding: 20px;">Falha ao obter equipe: ${e.message}</p>`;
    }
}
window.carregarListaEquipe = carregarListaEquipe;

/**
 * 2. Carrega as permissões do colaborador para o formulário de edição
 */
function editarPermissoesMembro(idMembro) {
    const membro = listaMembrosEquipe.find(m => m.id == idMembro);
    if (!membro) {
        alert('Membro não encontrado.');
        return;
    }

    const inputEmail = document.getElementById('equipe-email');
    if (inputEmail) {
        inputEmail.value = membro.email;
        inputEmail.readOnly = true; // Impede trocar o e-mail acidentalmente durante edição
        inputEmail.style.borderColor = 'var(--dourado, #d4af37)';
    }

    let perms = {};
    try {
        perms = typeof membro.permissoes === 'string' ? JSON.parse(membro.permissoes) : (membro.permissoes || {});
    } catch (e) {
        perms = {};
    }

    // Marca ou desmarca os checkboxes com base no banco
    const checkDashboard = document.getElementById('perm-dashboard');
    const checkProdutos = document.getElementById('perm-produtos');
    const checkPedidos = document.getElementById('perm-pedidos');
    const checkBanners = document.getElementById('perm-banners');
    const checkConfig = document.getElementById('perm-config') || document.getElementById('perm-configs');

    if (checkDashboard) checkDashboard.checked = !!perms.dashboard;
    if (checkProdutos) checkProdutos.checked = !!perms.produtos;
    if (checkPedidos) checkPedidos.checked = !!perms.pedidos;
    if (checkBanners) checkBanners.checked = !!perms.banners;
    if (checkConfig) checkConfig.checked = !!(perms.configuracoes || perms.config);

    // Altera o texto do botão principal
    const btnSubmit = document.getElementById('btn-salvar-equipe');
    if (btnSubmit) {
        btnSubmit.innerText = `💾 Atualizar Permissões de ${membro.nome || 'Colaborador'}`;
    }

    // Cria/exibe o botão de Cancelar Edição se ainda não existir
    let btnCancelar = document.getElementById('btn-cancelar-edicao-equipe');
    if (!btnCancelar && btnSubmit && btnSubmit.parentNode) {
        btnCancelar = document.createElement('button');
        btnCancelar.type = 'button';
        btnCancelar.id = 'btn-cancelar-edicao-equipe';
        btnCancelar.innerText = '✕ Cancelar';
        btnCancelar.style.cssText = 'width: 100%; margin-top: 8px; background: transparent; border: 1px solid #666; color: #aaa; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 700;';
        btnCancelar.onclick = cancelarEdicaoEquipe;
        btnSubmit.parentNode.appendChild(btnCancelar);
    } else if (btnCancelar) {
        btnCancelar.style.display = 'block';
    }

    // Rola a tela até o formulário de equipe suavemente
    inputEmail.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
window.editarPermissoesMembro = editarPermissoesMembro;

/**
 * 3. Cancela a edição e limpa o formulário
 */
function cancelarEdicaoEquipe() {
    const inputEmail = document.getElementById('equipe-email');
    if (inputEmail) {
        inputEmail.value = '';
        inputEmail.readOnly = false;
        inputEmail.style.borderColor = '#333';
    }

    ['perm-dashboard', 'perm-produtos', 'perm-pedidos', 'perm-banners', 'perm-config', 'perm-configs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
    });

    const btnSubmit = document.getElementById('btn-salvar-equipe');
    if (btnSubmit) {
        btnSubmit.innerText = 'Salvar Permissões do Colaborador';
    }

    const btnCancelar = document.getElementById('btn-cancelar-edicao-equipe');
    if (btnCancelar) {
        btnCancelar.style.display = 'none';
    }
}
window.cancelarEdicaoEquipe = cancelarEdicaoEquipe;

/**
 * 4. Salva ou atualiza as permissões no Neon DB
 */
async function salvarMembroEquipe(e) {
    e.preventDefault();

    const inputEmail = document.getElementById('equipe-email');
    const email = inputEmail ? inputEmail.value.trim().toLowerCase() : '';
    if (!email) {
        alert('Digite o e-mail do colaborador.');
        return;
    }

    const checkConfig = document.getElementById('perm-config') || document.getElementById('perm-configs');

    const permissoes = {
        dashboard: document.getElementById('perm-dashboard')?.checked || false,
        produtos: document.getElementById('perm-produtos')?.checked || false,
        pedidos: document.getElementById('perm-pedidos')?.checked || false,
        banners: document.getElementById('perm-banners')?.checked || false,
        configuracoes: checkConfig?.checked || false,
        config: checkConfig?.checked || false
    };

    const btnSubmit = document.getElementById('btn-salvar-equipe');
    const textoOriginal = btnSubmit ? btnSubmit.innerText : '';
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerText = 'Salvando permissões...';
    }

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (!sql) throw new Error("Conexão SQL não inicializada");

        // 1. Localiza o usuário pelo e-mail
        const usuarios = await sql`
            SELECT id, role FROM usuarios WHERE LOWER(email) = ${email} LIMIT 1;
        `;

        if (!usuarios || usuarios.length === 0) {
            alert('⚠️ Usuário não encontrado! O colaborador precisa primeiro criar uma conta de cliente na loja com esse e-mail.');
            return;
        }

        const user = usuarios[0];

        if (user.role === 'owner') {
            alert('A conta do proprietário já possui acesso irrestrito e não pode ser limitada.');
            return;
        }

        // 2. Atualiza as permissões JSONB
        await sql`
            UPDATE usuarios 
            SET role = 'admin', permissoes = ${JSON.stringify(permissoes)}
            WHERE id = ${user.id};
        `;

        alert('✅ Permissões atualizadas com sucesso!');
        cancelarEdicaoEquipe();
        await carregarListaEquipe();

    } catch (err) {
        console.error('Erro ao salvar permissões do membro:', err);
        alert('Falha ao salvar permissões no Neon: ' + err.message);
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
        }
    }
}

/**
 * 5. Revoga o acesso administrativo do colaborador
 */
async function revogarAcessoAdmin(idUsuario) {
    if (!confirm('Deseja realmente revogar o acesso administrativo deste colaborador?')) return;

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        await sql`
            UPDATE usuarios 
            SET role = 'cliente', permissoes = '{}'::jsonb 
            WHERE id = ${idUsuario};
        `;

        alert('Acesso revogado com sucesso.');
        cancelarEdicaoEquipe();
        await carregarListaEquipe();

    } catch (err) {
        console.error('Erro ao revogar acesso:', err);
        alert('Falha ao revogar permissões: ' + err.message);
    }
}
window.revogarAcessoAdmin = revogarAcessoAdmin;

// Inicializa escutas e carrega lista automaticamente
document.addEventListener('DOMContentLoaded', () => {
    carregarListaEquipe();

    const formEquipe = document.getElementById('form-gestao-equipe');
    if (formEquipe) {
        formEquipe.addEventListener('submit', salvarMembroEquipe);
    }
});