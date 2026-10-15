// ==========================================================================
// VR MODAS - GESTÃO DE PEDIDOS & BOTTOM SHEET PREMIUM (NEON DB)
// js/admin/pedidos.js
// ==========================================================================

let listaPedidosGeral = [];
let filtroStatusPedidoAtivo = 'todos';

/**
 * Utilitários para formatação e limpeza de dados
 */
function extrairTextoCor(corRaw) {
    if (!corRaw) return 'Padrão';
    if (typeof corRaw === 'string') {
        try {
            if (corRaw.trim().startsWith('{')) {
                const parsed = JSON.parse(corRaw);
                return parsed.nome || parsed.cor || 'Padrão';
            }
            return corRaw;
        } catch (e) {
            return corRaw;
        }
    }
    if (typeof corRaw === 'object' && corRaw !== null) {
        return corRaw.nome || corRaw.cor || 'Padrão';
    }
    return String(corRaw);
}

function extrairTextoTamanho(tamRaw) {
    if (!tamRaw) return 'Padrão';
    if (typeof tamRaw === 'object' && tamRaw !== null) {
        return tamRaw.tamanho || tamRaw.tam || 'Padrão';
    }
    return String(tamRaw);
}

function tratarEnderecoVisual(enderecoRaw) {
    if (!enderecoRaw) return 'Retirada na Loja / A combinar';
    if (typeof enderecoRaw === 'string') {
        try {
            if (enderecoRaw.trim().startsWith('{')) {
                const parsed = JSON.parse(enderecoRaw);
                return formatarObjetoEndereco(parsed);
            }
            return enderecoRaw;
        } catch (e) {
            return enderecoRaw;
        }
    }
    if (typeof enderecoRaw === 'object' && enderecoRaw !== null) {
        return formatarObjetoEndereco(enderecoRaw);
    }
    return String(enderecoRaw);
}

function formatarObjetoEndereco(end) {
    if (!end) return 'Retirada na Loja / A combinar';
    if (end.enderecoFormatado) return end.enderecoFormatado;
    const rua = end.rua || end.logradouro || '';
    const num = end.numero || 'S/N';
    const bairro = end.bairro || '';
    const cidade = end.cidade || '';
    const cep = end.cep ? `(CEP: ${end.cep})` : '';
    const partes = [rua ? `${rua}, Nº ${num}` : '', bairro, cidade, cep].filter(p => p.trim() !== '');
    return partes.length > 0 ? partes.join(' - ') : 'Retirada na Loja / A combinar';
}

function normalizarStatus(statusRaw) {
    const s = String(statusRaw || 'pendente').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (s.includes('separ')) return 'separacao';
    if (s.includes('envi')) return 'enviado';
    if (s.includes('pago') || s.includes('conclu')) return 'concluido';
    if (s.includes('cancel')) return 'cancelado';
    return 'pendente';
}

/**
 * 1. Carrega todos os pedidos do Neon DB
 */
async function carregarEAtualizarTabelaPedidos() {
    const tabelaCorpo = document.getElementById('lista-pedidos-admin');
    if (!tabelaCorpo) return;

    tabelaCorpo.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto, #888); padding: 25px; font-size: 12px;">A carregar pedidos do Neon...</td></tr>`;

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (!sql) throw new Error("Conexão SQL não inicializada");

        const pedidos = await sql`
            SELECT * FROM pedidos 
            ORDER BY id DESC;
        `;

        listaPedidosGeral = pedidos || [];
        atualizarContadoresStatusPedidos(pedidos);
        filtrarERenderizarTabelaPedidos();

    } catch (e) {
        console.error('Erro ao carregar lista de pedidos:', e);
        tabelaCorpo.innerHTML = `<tr><td colspan="6" style="color: #ff6b6b; text-align: center; padding: 20px; font-size: 12px;">Falha ao obter pedidos: ${e.message}</td></tr>`;
    }
}
window.carregarEAtualizarTabelaPedidos = carregarEAtualizarTabelaPedidos;

/**
 * 2. Atualiza contadores dos botões de abas
 */
function atualizarContadoresStatusPedidos(pedidos) {
    const contadores = { todos: pedidos.length, pendente: 0, separacao: 0, enviado: 0, concluido: 0, cancelado: 0 };

    pedidos.forEach(p => {
        const s = normalizarStatus(p.status);
        if (contadores[s] !== undefined) contadores[s]++;
    });

    for (const [chave, valor] of Object.entries(contadores)) {
        const el = document.getElementById(`cont-ped-${chave}`);
        if (el) el.innerText = valor;
    }
}

/**
 * 3. Renderiza a lista de pedidos no painel
 */
function filtrarERenderizarTabelaPedidos() {
    const tabelaCorpo = document.getElementById('lista-pedidos-admin');
    if (!tabelaCorpo) return;

    let filtrados = listaPedidosGeral;
    if (filtroStatusPedidoAtivo !== 'todos') {
        filtrados = listaPedidosGeral.filter(p => normalizarStatus(p.status) === filtroStatusPedidoAtivo);
    }

    if (filtrados.length === 0) {
        tabelaCorpo.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto, #888); padding: 25px; font-size: 12px;">Nenhum pedido encontrado neste status.</td></tr>`;
        return;
    }

    tabelaCorpo.innerHTML = filtrados.map(p => {
        const idPed = p.id;
        const totalFmt = Number(p.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const dataFmt = p.criado_em ? new Date(p.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
        const clienteNome = p.cliente_nome || 'Cliente';

        let arrayItens = [];
        let formaPag = 'PIX';
        try {
            const rawItens = typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || {});
            if (Array.isArray(rawItens)) {
                arrayItens = rawItens;
            } else {
                arrayItens = rawItens.itens || [];
                formaPag = rawItens.forma_pagamento || p.forma_pagamento || 'PIX';
            }
        } catch (e) {
            arrayItens = [];
        }

        const resumoItens = arrayItens.map(i => `${i.quantidade || 1}x ${i.nome}`).join(', ') || 'Ver peças';
        const statusAtual = normalizarStatus(p.status);

        return `
            <tr>
                <td style="flex: 1; min-width: 0; text-align: left;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                        <button type="button" onclick="abrirModalDetalhesPedido(${idPed})" style="background: none; border: none; padding: 0; cursor: pointer; color: var(--dourado, #d4af37); font-weight: 700; font-size: 12.5px; text-decoration: underline;">
                            #${idPed}
                        </button>
                        <span style="color: #777; font-size: 11px;">• ${dataFmt}</span>
                        <span style="font-size: 10px; padding: 1px 5px; border-radius: 3px; background: #222; color: #aaa; text-transform: uppercase;">${formaPag}</span>
                    </div>
                    <div onclick="abrirModalDetalhesPedido(${idPed})" style="cursor: pointer; font-size: 12px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${clienteNome}
                    </div>
                    <div onclick="abrirModalDetalhesPedido(${idPed})" style="cursor: pointer; font-size: 11px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${resumoItens}
                    </div>
                </td>

                <td>${dataFmt}</td>
                <td>${resumoItens}</td>
                <td style="color: var(--dourado, #d4af37); font-weight: 700;">${totalFmt}</td>

                <td style="text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                    <div style="color: var(--dourado, #d4af37); font-weight: 700; font-size: 13.5px;">
                        ${totalFmt}
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <select onchange="atualizarStatusPedidoAdmin(${idPed}, this.value)" style="background: #111; color: #fff; border: 1px solid #333; padding: 3px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; height: 28px;">
                            <option value="Pendente" ${statusAtual === 'pendente' ? 'selected' : ''}>⏳ Pendente</option>
                            <option value="Em Separação" ${statusAtual === 'separacao' ? 'selected' : ''}>📦 Separação</option>
                            <option value="Enviado" ${statusAtual === 'enviado' ? 'selected' : ''}>🚚 Enviado</option>
                            <option value="Concluído" ${statusAtual === 'concluido' ? 'selected' : ''}>✅ Concluído</option>
                            <option value="Cancelado" ${statusAtual === 'cancelado' ? 'selected' : ''}>❌ Cancelado</option>
                        </select>
                        <button type="button" onclick="imprimirComprovantePedido(${idPed})" title="Imprimir Recibo" style="background: #1a1a1a; border: 1px solid #444; color: #fff; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; height: 28px;">🖨️</button>
                        <button type="button" onclick="excluirPedidoAdmin(${idPed})" title="Excluir Pedido" style="background: #1a1a1a; border: 1px solid #ff4444; color: #ff4444; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; height: 28px;">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * 4. Bottom Sheet Sofisticada de Pedidos (Estilo App Nativo)
 */
function abrirModalDetalhesPedido(idPedido) {
    const pedido = listaPedidosGeral.find(p => p.id == idPedido);
    if (!pedido) return;

    let modal = document.getElementById('modal-detalhes-pedido');
    if (!modal) return;

    let dadosExtra = {};
    let itens = [];
    try {
        const raw = typeof pedido.itens === 'string' ? JSON.parse(pedido.itens) : (pedido.itens || {});
        if (Array.isArray(raw)) {
            itens = raw;
        } else {
            itens = raw.itens || [];
            dadosExtra = raw;
        }
    } catch(e) {
        itens = [];
    }

    const dataFmt = pedido.criado_em ? new Date(pedido.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Data recente';
    const whats = pedido.cliente_telefone || pedido.cliente_whatsapp || '';
    const linkWhats = whats ? `https://wa.me/55${whats.replace(/\D/g, '')}` : '';
    const statusAtual = normalizarStatus(pedido.status);
    const enderecoLimpo = tratarEnderecoVisual(dadosExtra.endereco_entrega || pedido.endereco);
    const formaPag = dadosExtra.forma_pagamento || pedido.forma_pagamento || 'PIX';
    const ehRetirada = dadosExtra.tipo_envio === 'retirada' || String(enderecoLimpo).toLowerCase().includes('retirada');

    const itensHtml = itens.map(i => {
        const precoItem = Number(i.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const subtotal = (Number(i.preco || 0) * (i.quantidade || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const img = i.imagem || 'img/placeholder.png';
        const corLimpa = extrairTextoCor(i.cor);
        const tamLimpo = extrairTextoTamanho(i.tamanho);

        return `
            <div style="display: flex; gap: 12px; align-items: center; background: #161616; border: 1px solid #282828; padding: 10px 12px; border-radius: 8px;">
                <img src="${img}" style="width: 46px; height: 54px; object-fit: cover; border-radius: 6px; border: 1px solid #333; flex-shrink: 0;" onerror="this.src='img/placeholder.png'">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; color: #fff; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px;">
                        ${i.nome}
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <span style="background: #202020; border: 1px solid #333; color: #bbb; padding: 1px 6px; border-radius: 4px; font-size: 10.5px; font-weight: 700;">Tam: ${tamLimpo}</span>
                        <span style="background: #202020; border: 1px solid #333; color: #bbb; padding: 1px 6px; border-radius: 4px; font-size: 10.5px; font-weight: 700;">Cor: ${corLimpa}</span>
                    </div>
                </div>
                <div style="text-align: right; flex-shrink: 0;">
                    <small style="color: #777; font-size: 11px; display: block;">${i.quantidade}x ${precoItem}</small>
                    <strong style="color: var(--dourado, #d4af37); font-size: 13.5px;">${subtotal}</strong>
                </div>
            </div>
        `;
    }).join('') || '<p style="color: #777; font-size: 12px; text-align: center; margin: 10px 0;">Nenhuma peça descrita.</p>';

    // Estilo adaptável: Bottom Sheet no mobile, Modal flutuante elegante no desktop
    modal.style.cssText = `
        display: flex;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.82);
        z-index: 10000;
        align-items: flex-end;
        justify-content: center;
        backdrop-filter: blur(6px);
        animation: fadeInOverlay 0.2s ease;
    `;

    modal.innerHTML = `
        <div id="card-bottom-sheet" style="background: #111111; border: 1px solid #2a2a2a; border-radius: 20px 20px 0 0; width: 100%; max-width: 560px; max-height: 88vh; display: flex; flex-direction: column; color: #fff; box-shadow: 0 -10px 40px rgba(0,0,0,0.9); animation: slideUpSheet 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
            
            <!-- Barra de Puxador Tátil Mobile -->
            <div style="width: 100%; padding: 10px 0 4px 0; display: flex; justify-content: center; cursor: pointer;" onclick="fecharModalDetalhesPedido()">
                <div style="width: 44px; height: 5px; background: #333; border-radius: 10px;"></div>
            </div>

            <!-- Cabeçalho -->
            <div style="padding: 10px 18px 14px 18px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #fff;">Pedido #${pedido.id}</h3>
                        <span style="font-size: 10.5px; padding: 2px 7px; border-radius: 12px; background: rgba(212, 175, 55, 0.15); color: var(--dourado, #d4af37); border: 1px solid var(--dourado, #d4af37); font-weight: 700; text-transform: uppercase;">${formaPag}</span>
                    </div>
                    <small style="color: #777; font-size: 11px;">Realizado em: ${dataFmt}</small>
                </div>
                <button type="button" onclick="fecharModalDetalhesPedido()" style="background: #1e1e1e; border: 1px solid #333; color: #aaa; width: 32px; height: 32px; border-radius: 50%; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
            </div>

            <!-- Corpo Rolável -->
            <div style="padding: 16px 18px; overflow-y: auto; -webkit-overflow-scrolling: touch; display: flex; flex-direction: column; gap: 14px;">
                
                <!-- Card do Cliente & Entrega -->
                <div style="background: #171717; border: 1px solid #282828; border-radius: 10px; padding: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div>
                            <span style="font-size: 10px; text-transform: uppercase; color: #777; font-weight: 700; letter-spacing: 0.5px;">Destinatário</span>
                            <div style="font-size: 14px; font-weight: 700; color: #fff; margin-top: 2px;">${pedido.cliente_nome || 'Cliente'}</div>
                        </div>
                        ${whats ? `
                            <a href="${linkWhats}" target="_blank" style="background: #1e3820; border: 1px solid #2d6632; color: #4cd137; padding: 6px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;">
                                💬 WhatsApp
                            </a>
                        ` : ''}
                    </div>

                    <div style="border-top: 1px solid #242424; padding-top: 10px; display: flex; gap: 8px; align-items: flex-start;">
                        <span style="font-size: 15px; line-height: 1.2;">${ehRetirada ? '🏬' : '📍'}</span>
                        <div style="flex: 1;">
                            <strong style="color: #ddd; font-size: 11.5px; display: block;">${ehRetirada ? 'Retirada no Ponto Físico' : 'Entrega em Domicílio'}</strong>
                            <p style="margin: 2px 0 0 0; color: #888; font-size: 11px; line-height: 1.4;">${enderecoLimpo}</p>
                        </div>
                    </div>
                </div>

                <!-- Peças Selecionadas -->
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 11px; text-transform: uppercase; color: #888; font-weight: 700; letter-spacing: 0.5px;">Peças Selecionadas</span>
                        <span style="font-size: 11px; color: #666;">${itens.length} produto(s)</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${itensHtml}
                    </div>
                </div>

                <!-- Pipeline de Mudança Rápida de Status (Pílula Horizontal) -->
                <div>
                    <span style="font-size: 11px; text-transform: uppercase; color: var(--dourado, #d4af37); font-weight: 700; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">Atualizar Etapa do Pedido</span>
                    <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;">
                        <button type="button" onclick="alterarStatusPeloModal(${pedido.id}, 'Pendente')" style="flex: 1; white-space: nowrap; padding: 8px 10px; border-radius: 6px; border: 1px solid ${statusAtual === 'pendente' ? 'var(--dourado, #d4af37)' : '#262626'}; background: ${statusAtual === 'pendente' ? 'var(--dourado, #d4af37)' : '#181818'}; color: ${statusAtual === 'pendente' ? '#000' : '#aaa'}; font-size: 11px; font-weight: 700; cursor: pointer;">⏳ Pendente</button>
                        <button type="button" onclick="alterarStatusPeloModal(${pedido.id}, 'Em Separação')" style="flex: 1; white-space: nowrap; padding: 8px 10px; border-radius: 6px; border: 1px solid ${statusAtual === 'separacao' ? 'var(--dourado, #d4af37)' : '#262626'}; background: ${statusAtual === 'separacao' ? 'var(--dourado, #d4af37)' : '#181818'}; color: ${statusAtual === 'separacao' ? '#000' : '#aaa'}; font-size: 11px; font-weight: 700; cursor: pointer;">📦 Separação</button>
                        <button type="button" onclick="alterarStatusPeloModal(${pedido.id}, 'Enviado')" style="flex: 1; white-space: nowrap; padding: 8px 10px; border-radius: 6px; border: 1px solid ${statusAtual === 'enviado' ? 'var(--dourado, #d4af37)' : '#262626'}; background: ${statusAtual === 'enviado' ? 'var(--dourado, #d4af37)' : '#181818'}; color: ${statusAtual === 'enviado' ? '#000' : '#aaa'}; font-size: 11px; font-weight: 700; cursor: pointer;">🚚 Enviado</button>
                        <button type="button" onclick="alterarStatusPeloModal(${pedido.id}, 'Concluído')" style="flex: 1; white-space: nowrap; padding: 8px 10px; border-radius: 6px; border: 1px solid ${statusAtual === 'concluido' ? '#4cd137' : '#262626'}; background: ${statusAtual === 'concluido' ? '#4cd137' : '#181818'}; color: ${statusAtual === 'concluido' ? '#000' : '#aaa'}; font-size: 11px; font-weight: 700; cursor: pointer;">✅ Concluído</button>
                        <button type="button" onclick="alterarStatusPeloModal(${pedido.id}, 'Cancelado')" style="flex: 1; white-space: nowrap; padding: 8px 10px; border-radius: 6px; border: 1px solid ${statusAtual === 'cancelado' ? '#ff4d4d' : '#262626'}; background: ${statusAtual === 'cancelado' ? '#ff4d4d' : '#181818'}; color: ${statusAtual === 'cancelado' ? '#000' : '#aaa'}; font-size: 11px; font-weight: 700; cursor: pointer;">❌ Cancelado</button>
                    </div>
                </div>
            </div>

            <!-- Rodapé Fixo com Total e Impressão -->
            <div style="padding: 12px 18px 16px 18px; border-top: 1px solid #222; background: #0d0d0d; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <div>
                    <small style="color: #777; font-size: 10.5px; display: block; text-transform: uppercase;">Valor do Pedido</small>
                    <strong style="color: var(--dourado, #d4af37); font-size: 18px; font-weight: 900;">${Number(pedido.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                </div>

                <div style="display: flex; gap: 8px;">
                    <button type="button" onclick="imprimirComprovantePedido(${pedido.id})" style="background: #1c1c1c; border: 1px solid #3a3a3a; color: #fff; padding: 10px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                        🖨️ Recibo
                    </button>
                    <button type="button" onclick="fecharModalDetalhesPedido()" style="background: var(--dourado, #d4af37); border: none; color: #000; padding: 10px 18px; border-radius: 8px; font-size: 12px; font-weight: 900; cursor: pointer; text-transform: uppercase;">
                        Concluir
                    </button>
                </div>
            </div>
        </div>
    `;

    // Fecha ao clicar fora do cartão
    modal.onclick = (e) => {
        if (e.target === modal) fecharModalDetalhesPedido();
    };
}
window.abrirModalDetalhesPedido = abrirModalDetalhesPedido;

async function alterarStatusPeloModal(idPedido, novoStatus) {
    await atualizarStatusPedidoAdmin(idPedido, novoStatus);
    abrirModalDetalhesPedido(idPedido);
}
window.alterarStatusPeloModal = alterarStatusPeloModal;

function fecharModalDetalhesPedido() {
    const modal = document.getElementById('modal-detalhes-pedido');
    if (modal) modal.style.display = 'none';
}
window.fecharModalDetalhesPedido = fecharModalDetalhesPedido;

/**
 * 5. Atualizar Status no Neon DB
 */
async function atualizarStatusPedidoAdmin(idPedido, novoStatus) {
    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        await sql`
            UPDATE pedidos 
            SET status = ${novoStatus} 
            WHERE id = ${idPedido};
        `;

        const ped = listaPedidosGeral.find(p => p.id == idPedido);
        if (ped) ped.status = novoStatus;
        atualizarContadoresStatusPedidos(listaPedidosGeral);
        filtrarERenderizarTabelaPedidos();

        if (typeof atualizarDashboard === 'function') {
            atualizarDashboard();
        }

    } catch (e) {
        console.error('Erro ao atualizar status do pedido:', e);
        alert('Falha ao atualizar status do pedido.');
    }
}
window.atualizarStatusPedidoAdmin = atualizarStatusPedidoAdmin;

/**
 * 6. Excluir Pedido
 */
async function excluirPedidoAdmin(idPedido) {
    if (!confirm(`Deseja realmente excluir o pedido #${idPedido}?`)) return;

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        await sql`DELETE FROM pedidos WHERE id = ${idPedido};`;
        await carregarEAtualizarTabelaPedidos();
    } catch (e) {
        console.error('Erro ao excluir pedido:', e);
        alert('Falha ao excluir pedido.');
    }
}
window.excluirPedidoAdmin = excluirPedidoAdmin;

/**
 * 7. Impressão de Comprovante de Pedido Completa e Elegante
 */
function imprimirComprovantePedido(idPedido) {
    const pedido = listaPedidosGeral.find(p => p.id == idPedido);
    if (!pedido) return;

    let dadosExtra = {};
    let itens = [];
    try {
        const raw = typeof pedido.itens === 'string' ? JSON.parse(pedido.itens) : (pedido.itens || {});
        if (Array.isArray(raw)) {
            itens = raw;
        } else {
            itens = raw.itens || [];
            dadosExtra = raw;
        }
    } catch(e) {
        itens = [];
    }

    const dataFmt = pedido.criado_em ? new Date(pedido.criado_em).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
    const totalFmt = Number(pedido.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const endereco = tratarEnderecoVisual(dadosExtra.endereco_entrega || pedido.endereco);
    const pagamento = dadosExtra.forma_pagamento || pedido.forma_pagamento || 'PIX';
    const whats = pedido.cliente_telefone || pedido.cliente_whatsapp || 'Não informado';

    const janelaImp = window.open('', '_blank', 'width=800,height=900');
    if (!janelaImp) {
        alert('Permita pop-ups no navegador para imprimir o comprovante.');
        return;
    }

    const itensHtml = itens.map(i => {
        const sub = (Number(i.preco || 0) * (i.quantidade || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const corLimpa = extrairTextoCor(i.cor);
        const tamLimpo = extrairTextoTamanho(i.tamanho);

        return `
            <tr>
                <td style="padding: 8px 4px; border-bottom: 1px solid #ddd;">
                    <strong>${i.nome}</strong><br>
                    <small style="color: #555;">Tam: ${tamLimpo} | Cor: ${corLimpa}</small>
                </td>
                <td style="padding: 8px 4px; border-bottom: 1px solid #ddd; text-align: center;">${i.quantidade || 1}</td>
                <td style="padding: 8px 4px; border-bottom: 1px solid #ddd; text-align: right;">${sub}</td>
            </tr>
        `;
    }).join('');

    janelaImp.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Comprovante Pedido #${pedido.id} - VR Modas</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 25px; color: #111; font-size: 13px; }
                .recibo-container { max-width: 480px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; border-radius: 6px; }
                .topo { text-align: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 15px; }
                .topo h1 { margin: 0; font-size: 22px; letter-spacing: 1px; }
                .topo p { margin: 4px 0 0 0; font-size: 12px; color: #555; }
                .dados-bloco { margin-bottom: 15px; font-size: 12.5px; line-height: 1.5; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                th { text-align: left; border-bottom: 2px solid #333; padding: 6px 4px; font-size: 12px; text-transform: uppercase; }
                .total-bloco { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; border-top: 2px solid #111; padding-top: 10px; margin-bottom: 20px; }
                .rodape { text-align: center; font-size: 11px; color: #666; border-top: 1px dashed #bbb; padding-top: 10px; }
                @media print {
                    body { padding: 0; }
                    .recibo-container { border: none; padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="recibo-container">
                <div class="topo">
                    <h1>VR MODAS</h1>
                    <p>Comprovante de Compra - Pedido #${pedido.id}</p>
                    <small style="color: #777;">Emissão: ${dataFmt}</small>
                </div>

                <div class="dados-bloco">
                    <div><strong>Cliente:</strong> ${pedido.cliente_nome || 'Cliente'}</div>
                    <div><strong>Contato / Whats:</strong> ${whats}</div>
                    <div><strong>Modalidade:</strong> ${dadosExtra.tipo_envio === 'retirada' ? 'Retirada na Loja' : 'Entrega em Domicílio'}</div>
                    <div><strong>Endereço:</strong> ${endereco}</div>
                    <div><strong>Pagamento:</strong> ${pagamento} | <strong>Status:</strong> ${pedido.status || 'Pendente'}</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Item / Variação</th>
                            <th style="text-align: center;">Qtd</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itensHtml}
                    </tbody>
                </table>

                <div class="total-bloco">
                    <span>Total do Pedido:</span>
                    <span>${totalFmt}</span>
                </div>

                <div class="rodape">
                    <p>Obrigada por escolher a VR Modas!</p>
                </div>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `);
    janelaImp.document.close();
}
window.imprimirComprovantePedido = imprimirComprovantePedido;

// Inicializa escuta das abas de filtro por status
document.addEventListener('DOMContentLoaded', () => {
    carregarEAtualizarTabelaPedidos();

    const botoesStatus = document.querySelectorAll('#abas-status-pedidos .btn-aba-cat');
    botoesStatus.forEach(btn => {
        btn.addEventListener('click', () => {
            botoesStatus.forEach(b => b.classList.remove('ativo'));
            btn.classList.add('ativo');
            filtroStatusPedidoAtivo = btn.getAttribute('data-status') || 'todos';
            filtrarERenderizarTabelaPedidos();
        });
    });
});