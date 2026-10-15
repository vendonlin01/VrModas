// ==========================================================================
// VR MODAS - GESTÃO DE PEDIDOS & COMPROVANTES (NEON DB - ROBUSTO & SOFISTICADO)
// js/admin/pedidos.js
// ==========================================================================

let listaPedidosGeral = [];
let filtroStatusPedidoAtivo = 'todos';

/**
 * 1. Formatação de Endereço Limpo
 */
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
    if (typeof enderecoRaw === 'object') {
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

/**
 * Utilitário para limpar nomes de cores e tamanhos mesmo se vierem como objeto
 */
function extrairTextoCor(corRaw) {
    if (!corRaw) return 'Padrão';
    if (typeof corRaw === 'string') return corRaw;
    if (typeof corRaw === 'object') return corRaw.nome || corRaw.cor || 'Padrão';
    return String(corRaw);
}

/**
 * 2. Carrega todos os pedidos do Neon DB
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
 * 3. Atualiza contadores dos botões de abas de status
 */
function atualizarContadoresStatusPedidos(pedidos) {
    const contadores = { todos: pedidos.length, pendente: 0, separacao: 0, enviado: 0, concluido: 0, cancelado: 0 };

    pedidos.forEach(p => {
        const s = normalizarStatus(p.status);
        if (contadores[s] !== undefined) {
            contadores[s]++;
        }
    });

    for (const [chave, valor] of Object.entries(contadores)) {
        const el = document.getElementById(`cont-ped-${chave}`);
        if (el) el.innerText = valor;
    }
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
 * 4. Renderiza a tabela de pedidos mantendo botões de status e ações visíveis
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
                <!-- Bloco Esquerdo: ID, Data, Pagamento, Cliente e Peças -->
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

                <!-- Colunas para Notebook/Desktop (Data e Resumo) -->
                <td>${dataFmt}</td>
                <td>${resumoItens}</td>
                <td style="color: var(--dourado, #d4af37); font-weight: 700;">${totalFmt}</td>

                <!-- Bloco Direito: Valor, Seletor de Status e Ações Rápidas -->
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
 * 5. Modal de Detalhes do Pedido com Ações de Status Diretas
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

    const dataFmt = pedido.criado_em ? new Date(pedido.criado_em).toLocaleString('pt-BR') : 'Data não registrada';
    const whats = pedido.cliente_telefone || pedido.cliente_whatsapp || '';
    const linkWhats = whats ? `https://wa.me/55${whats.replace(/\D/g, '')}` : '';
    const statusAtual = normalizarStatus(pedido.status);
    const enderecoLimpo = tratarEnderecoVisual(dadosExtra.endereco_entrega || pedido.endereco);

    const itensHtml = itens.map(i => {
        const precoItem = Number(i.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const img = i.imagem || 'img/placeholder.png';
        const corLimpa = extrairTextoCor(i.cor);
        const tamLimpo = i.tamanho || 'Padrão';

        return `
            <div style="display: flex; gap: 10px; align-items: center; background: #0c0c0c; border: 1px solid #222; padding: 8px 10px; border-radius: 6px;">
                <img src="${img}" style="width: 44px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #333;" onerror="this.src='img/placeholder.png'">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; color: #fff; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${i.nome}</div>
                    <small style="color: #aaa; font-size: 11px;">Tam: <strong style="color: var(--dourado, #d4af37);">${tamLimpo}</strong> | Cor: <strong style="color: var(--dourado, #d4af37);">${corLimpa}</strong></small>
                </div>
                <div style="text-align: right; flex-shrink: 0;">
                    <div style="font-size: 11px; color: #777;">${i.quantidade}x</div>
                    <div style="font-weight: 700; color: var(--dourado, #d4af37); font-size: 13px;">${precoItem}</div>
                </div>
            </div>
        `;
    }).join('') || '<p style="color: #777; font-size: 12px;">Nenhuma peça descrita.</p>';

    modal.innerHTML = `
        <div style="background: #141414; border: 1px solid #333; border-top: 3px solid var(--dourado, #d4af37); border-radius: 8px; max-width: 520px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 18px; color: #fff; box-sizing: border-box; box-shadow: 0 15px 40px rgba(0,0,0,0.9);">
            <!-- Topo -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #222; padding-bottom: 10px;">
                <div>
                    <h3 style="margin: 0; font-size: 16px; color: var(--dourado, #d4af37);">Pedido #${pedido.id} - ${pedido.cliente_nome || 'Cliente'}</h3>
                    <small style="color: #777; font-size: 11px;">Realizado em: ${dataFmt}</small>
                </div>
                <button type="button" onclick="fecharModalDetalhesPedido()" style="background: none; border: none; color: #ff5252; font-size: 22px; cursor: pointer; font-weight: bold; line-height: 1;">✕</button>
            </div>

            <!-- Dados do Cliente & Entrega -->
            <div style="background: #0d0d0d; border: 1px solid #252525; border-radius: 6px; padding: 12px; margin-bottom: 14px; font-size: 12px; line-height: 1.5;">
                <div><strong>Cliente:</strong> <span style="color: #fff;">${pedido.cliente_nome || 'Não informado'}</span></div>
                <div><strong>WhatsApp:</strong> ${whats ? `<a href="${linkWhats}" target="_blank" style="color: #4cd137; text-decoration: underline; font-weight: bold;">${whats} (Conversar no WhatsApp ↗)</a>` : '<span style="color:#777;">Não informado</span>'}</div>
                <div><strong>Modalidade:</strong> <span style="color: #ddd;">${dadosExtra.tipo_envio === 'retirada' ? '🏬 Retirada na Loja Física' : '🏠 Entrega no Endereço'}</span></div>
                <div><strong>Endereço:</strong> <span style="color: #bbb;">${enderecoLimpo}</span></div>
                <div><strong>Forma de Pagamento:</strong> <span style="color: var(--dourado, #d4af37); font-weight: bold;">${dadosExtra.forma_pagamento || pedido.forma_pagamento || 'PIX'}</span></div>
            </div>

            <!-- Lista de Peças -->
            <h4 style="font-size: 12px; margin: 0 0 8px 0; color: #aaa; text-transform: uppercase;">Peças do Pedido</h4>
            <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px;">
                ${itensHtml}
            </div>

            <!-- Total -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: #0a0a0a; border: 1px solid #282828; padding: 10px 12px; border-radius: 6px; margin-bottom: 14px;">
                <span style="font-size: 12.5px; font-weight: 700;">Total Pago:</span>
                <strong style="font-size: 16px; color: var(--dourado, #d4af37);">${Number(pedido.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
            </div>

            <!-- Ações Rápidas de Status por dentro do Modal -->
            <div style="background: #0a0a0a; border: 1px solid #282828; padding: 10px; border-radius: 6px; margin-bottom: 14px;">
                <label style="font-size: 11px; text-transform: uppercase; color: var(--dourado, #d4af37); font-weight: 700; display: block; margin-bottom: 8px;">Alterar Status do Pedido:</label>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 6px;">
                    <button type="button" onclick="alterarStatusPeloModal(${pedido.id}, 'Pendente')" style="padding: 6px; border-radius: 4px; border: 1px solid #333; background: ${statusAtual === 'pendente' ? 'var(--dourado, #d4af37)' : '#181818'}; color: ${statusAtual === 'pendente' ? '#000' : '#fff'}; font-size: 11px; font-weight: 700; cursor: pointer;">⏳ Pendente</button>
                    <button type="button" onclick="alterarStatusPeloModal(${pedido.id}, 'Em Separação')" style="padding: 6px; border-radius: 4px; border: 1px solid #333; background: ${statusAtual === 'separacao' ? 'var(--dourado, #d4af37)' : '#181818'}; color: ${statusAtual === 'separacao' ? '#000' : '#fff'}; font-size: 11px; font-weight: 700; cursor: pointer;">📦 Separação</button>
                    <button type="button" onclick="alterarStatusPeloModal(${pedido.id}, 'Enviado')" style="padding: 6px; border-radius: 4px; border: 1px solid #333; background: ${statusAtual === 'enviado' ? 'var(--dourado, #d4af37)' : '#181818'}; color: ${statusAtual === 'enviado' ? '#000' : '#fff'}; font-size: 11px; font-weight: 700; cursor: pointer;">🚚 Enviado</button>
                    <button type="button" onclick="alterarStatusPeloModal(${pedido.id}, 'Concluído')" style="padding: 6px; border-radius: 4px; border: 1px solid #333; background: ${statusAtual === 'concluido' ? '#4cd137' : '#181818'}; color: ${statusAtual === 'concluido' ? '#000' : '#fff'}; font-size: 11px; font-weight: 700; cursor: pointer;">✅ Concluído</button>
                    <button type="button" onclick="alterarStatusPeloModal(${pedido.id}, 'Cancelado')" style="padding: 6px; border-radius: 4px; border: 1px solid #333; background: ${statusAtual === 'cancelado' ? '#ff4d4d' : '#181818'}; color: ${statusAtual === 'cancelado' ? '#000' : '#fff'}; font-size: 11px; font-weight: 700; cursor: pointer;">❌ Cancelado</button>
                </div>
            </div>

            <!-- Botões Inferiores -->
            <div style="display: flex; gap: 8px;">
                <button type="button" onclick="imprimirComprovantePedido(${pedido.id})" style="flex: 1; background: #1f1f1f; border: 1px solid #444; color: #fff; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 12px;">🖨️ Imprimir Recibo</button>
                <button type="button" onclick="fecharModalDetalhesPedido()" style="flex: 1; background: var(--dourado, #d4af37); color: #000; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 12px;">Fechar</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
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
 * 6. Atualizar Status do Pedido no Neon DB
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
 * 7. Excluir Pedido
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
 * 8. Impressão de Comprovante de Pedido Completa e Elegante
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
        const tamLimpo = i.tamanho || 'Padrão';

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