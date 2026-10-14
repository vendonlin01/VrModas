// ==========================================================================
// VR MODAS - GESTÃO DE PEDIDOS & COMPROVANTES (NEON DB)
// js/admin/pedidos.js
// ==========================================================================

let listaPedidosGeral = [];
let filtroStatusPedidoAtivo = 'todos';

/**
 * Funções utilitárias para formatar endereço limpo
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
 * 1. Carrega todos os pedidos do Neon DB
 */
async function carregarEAtualizarTabelaPedidos() {
    const tabelaCorpo = document.getElementById('lista-pedidos-admin');
    if (!tabelaCorpo) return;

    tabelaCorpo.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto, #888); padding: 25px;">A carregar pedidos do Neon...</td></tr>`;

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
        tabelaCorpo.innerHTML = `<tr><td colspan="6" style="color: #ff6b6b; text-align: center; padding: 20px;">Falha ao obter pedidos: ${e.message}</td></tr>`;
    }
}
window.carregarEAtualizarTabelaPedidos = carregarEAtualizarTabelaPedidos;

/**
 * 2. Atualiza contadores dos botões de abas de status
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
    const s = (statusRaw || 'pendente').toLowerCase().trim();
    if (s.includes('separ')) return 'separacao';
    if (s.includes('envi')) return 'enviado';
    if (s.includes('pago') || s.includes('conclu')) return 'concluido';
    if (s.includes('cancel')) return 'cancelado';
    return 'pendente';
}

/**
 * 3. Renderiza a tabela aplicando o filtro da aba selecionada
 */
function filtrarERenderizarTabelaPedidos() {
    const tabelaCorpo = document.getElementById('lista-pedidos-admin');
    if (!tabelaCorpo) return;

    let filtrados = listaPedidosGeral;
    if (filtroStatusPedidoAtivo !== 'todos') {
        filtrados = listaPedidosGeral.filter(p => normalizarStatus(p.status) === filtroStatusPedidoAtivo);
    }

    if (filtrados.length === 0) {
        tabelaCorpo.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto, #888); padding: 30px;">Nenhum pedido encontrado neste status.</td></tr>`;
        return;
    }

    tabelaCorpo.innerHTML = filtrados.map(p => {
        const idPed = p.id;
        const totalFmt = Number(p.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const dataFmt = p.criado_em ? new Date(p.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Recente';
        const clienteNome = p.cliente_nome || 'Cliente';
        const whats = p.cliente_telefone || p.cliente_whatsapp || '';

        let arrayItens = [];
        try {
            const rawItens = typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || {});
            arrayItens = Array.isArray(rawItens) ? rawItens : (rawItens.itens || []);
        } catch (e) {
            arrayItens = [];
        }

        const resumoItens = arrayItens.length > 0 
            ? arrayItens.map(i => `${i.quantidade || 1}x ${i.nome}`).join(', ') 
            : 'Ver peças';

        const statusAtual = normalizarStatus(p.status);

        return `
            <tr>
                <td>
                    <button type="button" onclick="abrirModalDetalhesPedido(${idPed})" style="background: none; border: none; padding: 0; text-align: left; cursor: pointer; color: inherit;">
                        <strong style="color: var(--dourado, #d4af37); font-size: 13.5px; text-decoration: underline;">#${idPed} - ${clienteNome}</strong>
                    </button>
                    <br><small style="color: #777;">Tel/Whats: ${whats || 'Não informado'}</small>
                </td>
                <td style="color: #bbb; font-size: 12px;">${dataFmt}</td>
                <td>
                    <button type="button" onclick="abrirModalDetalhesPedido(${idPed})" style="background: rgba(255,255,255,0.05); border: 1px solid #333; color: #ddd; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11.5px; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">
                        🔍 ${resumoItens}
                    </button>
                </td>
                <td style="color: var(--dourado, #d4af37); font-weight: 700;">${totalFmt}</td>
                <td>
                    <select onchange="atualizarStatusPedidoAdmin(${idPed}, this.value)" class="select-status-pedido" style="background: #111; color: #fff; border: 1px solid #333; padding: 6px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; cursor: pointer;">
                        <option value="Pendente" ${statusAtual === 'pendente' ? 'selected' : ''}>⏳ Pendente</option>
                        <option value="Em Separação" ${statusAtual === 'separacao' ? 'selected' : ''}>📦 Em Separação</option>
                        <option value="Enviado" ${statusAtual === 'enviado' ? 'selected' : ''}>🚚 Enviado</option>
                        <option value="Concluído" ${statusAtual === 'concluido' ? 'selected' : ''}>✅ Concluído</option>
                        <option value="Cancelado" ${statusAtual === 'cancelado' ? 'selected' : ''}>❌ Cancelado</option>
                    </select>
                </td>
                <td>
                    <button type="button" onclick="imprimirComprovantePedido(${idPed})" title="Imprimir Recibo" style="background: transparent; border: 1px solid #666; color: #fff; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-right: 4px; font-size: 12px;">🖨️</button>
                    <button type="button" onclick="excluirPedidoAdmin(${idPed})" title="Excluir Pedido" style="background: transparent; border: 1px solid #ff4444; color: #ff4444; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * 4. Modal de Detalhes do Pedido
 */
function abrirModalDetalhesPedido(idPedido) {
    const pedido = listaPedidosGeral.find(p => p.id == idPedido);
    if (!pedido) return;

    const modal = document.getElementById('modal-detalhes-pedido');
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

    document.getElementById('modal-pedido-titulo').innerText = `Pedido #${pedido.id} - ${pedido.cliente_nome || 'Cliente'}`;
    document.getElementById('modal-pedido-data').innerText = `Realizado em: ${dataFmt}`;
    document.getElementById('modal-pedido-cliente').innerText = pedido.cliente_nome || 'Não informado';
    
    const elWhats = document.getElementById('modal-pedido-whats');
    if (whats) {
        elWhats.innerHTML = `<a href="${linkWhats}" target="_blank" style="color: #4cd137; text-decoration: underline; font-weight: bold;">${whats} (Conversar no WhatsApp ↗)</a>`;
    } else {
        elWhats.innerText = 'Não informado';
    }

    const enderecoLimpo = tratarEnderecoVisual(dadosExtra.endereco_entrega || pedido.endereco);

    document.getElementById('modal-pedido-tipo-envio').innerText = dadosExtra.tipo_envio === 'retirada' ? '🏬 Retirada na Loja Física' : '🏠 Entrega no Endereço';
    document.getElementById('modal-pedido-endereco').innerText = enderecoLimpo;
    document.getElementById('modal-pedido-pagamento').innerText = dadosExtra.forma_pagamento || pedido.forma_pagamento || 'PIX';
    document.getElementById('modal-pedido-total').innerText = Number(pedido.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const containerItens = document.getElementById('modal-pedido-itens');
    containerItens.innerHTML = itens.map(i => {
        const precoItem = Number(i.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const img = i.imagem || 'img/placeholder.png';
        return `
            <div style="display: flex; gap: 10px; align-items: center; background: #0c0c0c; border: 1px solid #222; padding: 8px; border-radius: 6px;">
                <img src="${img}" style="width: 44px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #333;">
                <div style="flex: 1;">
                    <div style="font-weight: 700; color: #fff; font-size: 13px;">${i.nome}</div>
                    <small style="color: #888;">Tam: ${i.tamanho || 'Padrão'} | Cor: ${i.cor || 'Padrão'}</small>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12px; color: #aaa;">${i.quantidade}x</div>
                    <div style="font-weight: 700; color: var(--dourado, #d4af37); font-size: 13px;">${precoItem}</div>
                </div>
            </div>
        `;
    }).join('') || '<p style="color: #777;">Nenhuma peça descrita.</p>';

    const btnImp = document.getElementById('btn-modal-imprimir');
    if (btnImp) {
        btnImp.onclick = () => imprimirComprovantePedido(pedido.id);
    }

    modal.style.display = 'flex';
}
window.abrirModalDetalhesPedido = abrirModalDetalhesPedido;

function fecharModalDetalhesPedido() {
    const modal = document.getElementById('modal-detalhes-pedido');
    if (modal) modal.style.display = 'none';
}
window.fecharModalDetalhesPedido = fecharModalDetalhesPedido;

/**
 * 5. Atualizar Status do Pedido no Neon DB
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
        return `
            <tr>
                <td style="padding: 8px 4px; border-bottom: 1px solid #ddd;">
                    <strong>${i.nome}</strong><br>
                    <small style="color: #555;">Tam: ${i.tamanho || 'Padrão'} | Cor: ${i.cor || 'Padrão'}</small>
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