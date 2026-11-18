// ==========================================================================
// VR MODAS - CONFIGURAÇÕES GERAIS, CUPONS DE DESCONTO & BACKUP
// js/admin/configuracoes.js
// ==========================================================================

function escaparTextoConfig(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ==========================================
// 1. CONFIGURAÇÕES DE ATENDIMENTO (WHATSAPP / E-MAIL)
// ==========================================
async function carregarConfiguracoesAdmin() {
    const inputWhats = document.getElementById('config-whatsapp');
    const inputEmail = document.getElementById('config-email');

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (!sql) return;

        const configs = await sql`SELECT chave, valor FROM configuracoes;`;
        if (Array.isArray(configs)) {
            const mapa = {};
            configs.forEach(c => { mapa[c.chave] = c.valor; });
            if (inputWhats && mapa['whatsapp']) inputWhats.value = mapa['whatsapp'];
            if (inputEmail && mapa['email']) inputEmail.value = mapa['email'];
            localStorage.setItem('vr_modas_config', JSON.stringify({
                whatsapp: mapa['whatsapp'] || '',
                email: mapa['email'] || ''
            }));
        }
    } catch (e) {
        console.warn('Aviso ao carregar configurações:', e.message);
    }
}
window.carregarConfiguracoesAdmin = carregarConfiguracoesAdmin;

// ==========================================
// 2. GESTÃO DE CUPONS DE DESCONTO
// ==========================================
async function carregarEAtualizarListaCupons() {
    const listaCuponsAdmin = document.getElementById('lista-cupons-admin');
    if (!listaCuponsAdmin) return;

    listaCuponsAdmin.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888; padding: 16px;">Carregando cupons...</td></tr>';

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (!sql) throw new Error('Conexão SQL indisponível.');

        // Garante que a tabela exista no Neon caso ainda não tenha sido criada
        await sql`
            CREATE TABLE IF NOT EXISTS cupons (
                id SERIAL PRIMARY KEY,
                codigo VARCHAR(50) UNIQUE NOT NULL,
                tipo VARCHAR(20) NOT NULL DEFAULT 'porcentagem',
                valor NUMERIC(10, 2) NOT NULL,
                ativo BOOLEAN DEFAULT true,
                criado_em TIMESTAMP DEFAULT NOW()
            );
        `;

        const dados = await sql`SELECT * FROM cupons WHERE ativo = true ORDER BY id DESC;`;
        if (Array.isArray(dados)) {
            localStorage.setItem('vr_modas_cupons', JSON.stringify(dados));
            renderizarTabelaCupons(dados);
        }
    } catch (e) {
        console.error('Erro ao buscar cupons:', e);
        const locais = JSON.parse(localStorage.getItem('vr_modas_cupons')) || [];
        renderizarTabelaCupons(locais);
    }
}
window.carregarEAtualizarListaCupons = carregarEAtualizarListaCupons;

function renderizarTabelaCupons(cupons) {
    const listaCuponsAdmin = document.getElementById('lista-cupons-admin');
    if (!listaCuponsAdmin) return;

    listaCuponsAdmin.innerHTML = '';

    if (!cupons || cupons.length === 0) {
        listaCuponsAdmin.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--cinza-texto, #888); padding: 20px;">Nenhum cupom ativo no momento.</td></tr>';
        return;
    }

    cupons.forEach(cupom => {
        const codigoSeguro = escaparTextoConfig(cupom.codigo);
        const tipoSeguro = escaparTextoConfig(cupom.tipo);
        const valorNum = Number(cupom.valor || 0);
        const desc = cupom.tipo === 'porcentagem'
            ? `${valorNum}% OFF`
            : valorNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + ' OFF';

        listaCuponsAdmin.insertAdjacentHTML('beforeend', `
            <tr>
                <td><strong style="color: var(--dourado, #d4af37); letter-spacing: 1px;">${codigoSeguro}</strong></td>
                <td style="text-transform: capitalize;">${tipoSeguro}</td>
                <td style="font-weight: 700; color: #4cd137;">${desc}</td>
                <td>
                    <button type="button" class="btn-excluir-cupom" data-id="${cupom.id}" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 700;">🗑️ Remover</button>
                </td>
            </tr>
        `);
    });

    document.querySelectorAll('.btn-excluir-cupom').forEach(btn => {
        btn.onclick = async function () {
            const id = this.getAttribute('data-id');
            if (!confirm('Deseja realmente remover este cupom?')) return;

            try {
                const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
                await sql`DELETE FROM cupons WHERE id = ${parseInt(id, 10)};`;
                await carregarEAtualizarListaCupons();
            } catch (err) {
                console.error('Erro ao excluir cupom:', err);
                alert('Erro ao remover cupom: ' + err.message);
            }
        };
    });
}

// ==========================================
// 3. INICIALIZAÇÃO DOS FORMULÁRIOS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Formulário de Cadastro de Cupom
    const formCupom = document.getElementById('form-cadastro-cupom');
    if (formCupom) {
        formCupom.onsubmit = async function (e) {
            e.preventDefault();

            const inputCodigo = document.getElementById('cupom-codigo');
            const selectTipo = document.getElementById('cupom-tipo');
            const inputValor = document.getElementById('cupom-valor');
            const btnSubmit = formCupom.querySelector('button[type="submit"]');

            const codigo = inputCodigo.value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
            const tipo = selectTipo.value;
            const valor = parseFloat(inputValor.value);

            if (!codigo) {
                alert('Digite um código válido para o cupom (apenas letras e números).');
                inputCodigo.focus();
                return;
            }
            if (isNaN(valor) || valor <= 0) {
                alert('Informe um valor de desconto maior que zero.');
                inputValor.focus();
                return;
            }
            if (tipo === 'porcentagem' && valor > 100) {
                alert('O desconto em porcentagem não pode ser maior que 100%.');
                inputValor.focus();
                return;
            }

            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerText = 'Publicando...';
            }

            try {
                const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
                if (!sql) throw new Error('Conexão com o banco não inicializada.');

                await sql`
                    INSERT INTO cupons (codigo, tipo, valor, ativo)
                    VALUES (${codigo}, ${tipo}, ${valor}, true)
                    ON CONFLICT (codigo) DO UPDATE 
                    SET tipo = ${tipo}, valor = ${valor}, ativo = true;
                `;

                alert(`✅ Cupom "${codigo}" publicado com sucesso!`);
                formCupom.reset();
                await carregarEAtualizarListaCupons();
            } catch (err) {
                console.error('Erro ao publicar cupom:', err);
                alert('Não foi possível publicar o cupom: ' + err.message);
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = 'Cadastrar Cupom';
                }
            }
        };
    }

    // Formulário de Configurações de Atendimento
    const formConfig = document.getElementById('form-config-loja');
    if (formConfig) {
        formConfig.onsubmit = async function (e) {
            e.preventDefault();
            const whatsappLimpo = document.getElementById('config-whatsapp').value.replace(/\D/g, '');
            const emailLimpo = document.getElementById('config-email').value.trim();

            if (!whatsappLimpo) {
                alert('Informe um número de WhatsApp válido.');
                return;
            }

            try {
                const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
                await sql`
                    INSERT INTO configuracoes (chave, valor)
                    VALUES ('whatsapp', ${whatsappLimpo})
                    ON CONFLICT (chave) DO UPDATE SET valor = ${whatsappLimpo};
                `;
                await sql`
                    INSERT INTO configuracoes (chave, valor)
                    VALUES ('email', ${emailLimpo})
                    ON CONFLICT (chave) DO UPDATE SET valor = ${emailLimpo};
                `;
                localStorage.setItem('vr_modas_config', JSON.stringify({ whatsapp: whatsappLimpo, email: emailLimpo }));
                alert('✅ Configurações salvas com sucesso!');
            } catch (err) {
                console.error('Erro ao salvar configurações:', err);
                alert('Erro ao salvar configurações: ' + err.message);
            }
        };
    }

    // Exportação e Restauração de Backup
    const btnExportarBackup = document.getElementById('btn-exportar-backup');
    if (btnExportarBackup) {
        btnExportarBackup.onclick = function () {
            const backup = {
                dataBackup: new Date().toISOString(),
                vr_modas_db: JSON.parse(localStorage.getItem('vr_modas_db')) || [],
                vr_modas_pedidos: JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [],
                vr_modas_banners: JSON.parse(localStorage.getItem('vr_modas_banners')) || [],
                vr_modas_config: JSON.parse(localStorage.getItem('vr_modas_config')) || {},
                vr_modas_cupons: JSON.parse(localStorage.getItem('vr_modas_cupons')) || []
            };
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
            const a = document.createElement('a');
            a.setAttribute('href', dataStr);
            a.setAttribute('download', `backup_vrmodas_${new Date().toISOString().slice(0, 10)}.json`);
            document.body.appendChild(a);
            a.click();
            a.remove();
        };
    }

    // Carrega dados iniciais
    carregarConfiguracoesAdmin();
    carregarEAtualizarListaCupons();
});