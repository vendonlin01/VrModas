// ==========================================================================
// VR MODAS - CONFIGURAÇÕES GERAIS, PAGAMENTOS, ENTREGA, CUPONS & BACKUP
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

function preencherFormularioConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') return;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined && val !== null) el.value = val;
    };
    const setCheck = (id, val, padrao = true) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (val === undefined || val === null || val === '') {
            el.checked = padrao;
        } else {
            el.checked = val === true || String(val).toLowerCase() === 'true' || String(val) === '1';
        }
    };

    setVal('config-whatsapp', cfg.whatsapp || '');
    setVal('config-email', cfg.email || '');
    setVal('config-endereco-loja', cfg.enderecoLoja || cfg.endereco_loja || '');
    setVal('config-pix-chave', cfg.pixChave || cfg.pix_chave || '');
    setVal('config-pix-titular', cfg.pixTitular || cfg.pix_titular || '');
    setVal('config-pix-banco', cfg.pixBanco || cfg.pix_banco || '');
    setVal('config-link-cartao', cfg.linkCartao || cfg.link_cartao || '');
    setVal('config-instrucoes-pagamento', cfg.instrucoesPagamento || cfg.instrucoes_pagamento || '');

    setCheck('config-permitir-entrega', cfg.permitirEntrega ?? cfg.permitir_entrega, true);
    setCheck('config-permitir-retirada', cfg.permitirRetirada ?? cfg.permitir_retirada, true);
    setCheck('config-pag-pix', cfg.pagPix ?? cfg.pag_pix, true);
    setCheck('config-pag-credito', cfg.pagCredito ?? cfg.pag_credito, true);
    setCheck('config-pag-debito', cfg.pagDebito ?? cfg.pag_debito, true);
}

// ==========================================
// 1. CONFIGURAÇÕES DE ATENDIMENTO, ENTREGA & PAGAMENTOS
// ==========================================
async function carregarConfiguracoesAdmin() {
    const configLocal = JSON.parse(localStorage.getItem('vr_modas_config') || '{}');
    preencherFormularioConfig(configLocal);

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (!sql) return;

        const configs = await sql`SELECT chave, valor FROM configuracoes;`;
        if (Array.isArray(configs)) {
            const mapa = {};
            configs.forEach(c => { mapa[c.chave] = c.valor; });

            const configConsolidada = {
                whatsapp: mapa['whatsapp'] || configLocal.whatsapp || '',
                email: mapa['email'] || configLocal.email || '',
                permitirEntrega: mapa['permitir_entrega'] !== undefined ? mapa['permitir_entrega'] === 'true' : true,
                permitirRetirada: mapa['permitir_retirada'] !== undefined ? mapa['permitir_retirada'] === 'true' : true,
                enderecoLoja: mapa['endereco_loja'] || '',
                pagPix: mapa['pag_pix'] !== undefined ? mapa['pag_pix'] === 'true' : true,
                pagCredito: mapa['pag_credito'] !== undefined ? mapa['pag_credito'] === 'true' : true,
                pagDebito: mapa['pag_debito'] !== undefined ? mapa['pag_debito'] === 'true' : true,
                pixChave: mapa['pix_chave'] || '',
                pixTitular: mapa['pix_titular'] || '',
                pixBanco: mapa['pix_banco'] || '',
                linkCartao: mapa['link_cartao'] || '',
                instrucoesPagamento: mapa['instrucoes_pagamento'] || ''
            };

            preencherFormularioConfig(configConsolidada);
            localStorage.setItem('vr_modas_config', JSON.stringify(configConsolidada));
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

    const formConfig = document.getElementById('form-config-loja');
    if (formConfig) {
        formConfig.onsubmit = async function (e) {
            e.preventDefault();

            const whatsappLimpo = document.getElementById('config-whatsapp').value.replace(/\D/g, '');
            const emailLimpo = document.getElementById('config-email').value.trim();

            const permitirEntrega = !!document.getElementById('config-permitir-entrega')?.checked;
            const permitirRetirada = !!document.getElementById('config-permitir-retirada')?.checked;
            const enderecoLoja = (document.getElementById('config-endereco-loja')?.value || '').trim();

            const pagPix = !!document.getElementById('config-pag-pix')?.checked;
            const pagCredito = !!document.getElementById('config-pag-credito')?.checked;
            const pagDebito = !!document.getElementById('config-pag-debito')?.checked;

            const pixChave = (document.getElementById('config-pix-chave')?.value || '').trim();
            const pixTitular = (document.getElementById('config-pix-titular')?.value || '').trim();
            const pixBanco = (document.getElementById('config-pix-banco')?.value || '').trim();
            const linkCartao = (document.getElementById('config-link-cartao')?.value || '').trim();
            const instrucoesPagamento = (document.getElementById('config-instrucoes-pagamento')?.value || '').trim();

            if (!whatsappLimpo) {
                alert('Informe um número de WhatsApp válido.');
                return;
            }
            if (!permitirEntrega && !permitirRetirada) {
                alert('Ative pelo menos uma opção de recebimento (Receber em Casa ou Retirar na Loja).');
                return;
            }
            if (!pagPix && !pagCredito && !pagDebito) {
                alert('Ative pelo menos uma forma de pagamento (Pix, Crédito ou Débito).');
                return;
            }

            const btnSalvar = document.getElementById('btn-salvar-config-loja');
            if (btnSalvar) {
                btnSalvar.disabled = true;
                btnSalvar.innerText = 'Salvando...';
            }

            const pares = [
                ['whatsapp', whatsappLimpo],
                ['email', emailLimpo],
                ['permitir_entrega', String(permitirEntrega)],
                ['permitir_retirada', String(permitirRetirada)],
                ['endereco_loja', enderecoLoja],
                ['pag_pix', String(pagPix)],
                ['pag_credito', String(pagCredito)],
                ['pag_debito', String(pagDebito)],
                ['pix_chave', pixChave],
                ['pix_titular', pixTitular],
                ['pix_banco', pixBanco],
                ['link_cartao', linkCartao],
                ['instrucoes_pagamento', instrucoesPagamento]
            ];

            try {
                const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
                for (const [chave, valor] of pares) {
                    await sql`
                        INSERT INTO configuracoes (chave, valor)
                        VALUES (${chave}, ${valor})
                        ON CONFLICT (chave) DO UPDATE SET valor = ${valor};
                    `;
                }

                const configConsolidada = {
                    whatsapp: whatsappLimpo,
                    email: emailLimpo,
                    permitirEntrega,
                    permitirRetirada,
                    enderecoLoja,
                    pagPix,
                    pagCredito,
                    pagDebito,
                    pixChave,
                    pixTitular,
                    pixBanco,
                    linkCartao,
                    instrucoesPagamento
                };
                localStorage.setItem('vr_modas_config', JSON.stringify(configConsolidada));
                alert('✅ Configurações de entrega, pagamento e conta recebedora salvas com sucesso!');
            } catch (err) {
                console.error('Erro ao salvar configurações:', err);
                alert('Erro ao salvar configurações: ' + err.message);
            } finally {
                if (btnSalvar) {
                    btnSalvar.disabled = false;
                    btnSalvar.innerText = '💾 Salvar Todas as Configurações';
                }
            }
        };
    }

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

    carregarConfiguracoesAdmin();
    carregarEAtualizarListaCupons();
});