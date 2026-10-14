// ==========================================================================
// VR MODAS - MÓDULO DE PEDIDOS & NOTIFICAÇÕES NATIVAS
// js/admin/pedidos.js
// ==========================================================================

let listaPedidosGlobal = [];
let ultimoIdPedidoConhecido = null;
let intervaloMonitoramentoPedidos = null;

// Áudio suave embutido em Base64 para alerta sonoro imediato (sem depender de ficheiro externo)
const somAlertaPedido = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + Array(200).join('A8/A8/'));

/**
 * 1. Inicialização do sistema de notificações na barra do sistema
 */
async function inicializarNotificacoesPedidos() {
    if (!('Notification' in window)) {
        console.warn('Este navegador não suporta notificações nativas.');
        return;
    }

    if (Notification.permission === 'default') {
        try {
            await Notification.requestPermission();
        } catch (e) {
            console.error('Erro ao pedir permissão de notificações:', e);
        }
    }
}

/**
 * 2. Dispara a notificação diretamente na barra do celular / computador
 */
function dispararNotificacaoNativa(pedido) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
        const totalFmt = Number(pedido.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const titulo = '🛍️ Novo Pedido Recebido!';
        const opcoes = {
            body: `Pedido #${pedido.id} - ${pedido.cliente_nome || 'Cliente'}\nValor: ${totalFmt}`,
            icon: 'img/logo.png', // Adapte para o caminho do seu logo se necessário
            badge: 'img/logo.png',
            tag: `pedido-${pedido.id}`, // Evita duplicar o mesmo alerta
            vibrate: [200, 100, 200]
        };

        const notificacao = new Notification(titulo, opcoes);

        // Toca o alerta sonoro se estiver com interação ativa
        somAlertaPedido.play().catch(() => {});

        notificacao.onclick = function() {
            window.focus();
            if (typeof alternarAbaAdmin === 'function') {
                alternarAbaAdmin('secao-pedidos');
            }
            notificacao.close();
        };
    } catch (e) {
        console.error('Erro ao disparar notificação nativa:', e);
    }
}

/**
 * 3. Carregar e Renderizar a Tabela de Pedidos
 */
async function carregarEAtualizarTabelaPedidos() {
    const containerTabela = document.getElementById('lista-pedidos-admin') || document.getElementById('tabela-pedidos-corpo');
    if (!containerTabela) return;

    try {
        const sql = await getSql();
        const pedidos = await sql`
            SELECT id, cliente_nome, cliente_email, cliente_whatsapp, itens, total, status, endereco, criado_em 
            FROM pedidos 
            ORDER BY criado_em DESC;
        `;

        listaPedidosGlobal = pedidos || [];
        renderizarListaPedidos(pedidos, containerTabela);

        // Atualiza a referência do ID mais recente sem disparar notificação na carga inicial
        if (pedidos.length > 0 && ultimoIdPedidoConhecido === null) {
            ultimoIdPedidoConhecido = Number(pedidos[0].id);
        }

    } catch (erro) {
        console.error('Erro ao carregar pedidos do Neon:', erro);
        containerTabela.innerHTML = `<tr><td colspan="7" style="color: #ff6b6b; text-align: center; padding: 20px;">Falha ao carregar pedidos. Verifique a conexão com o banco.</td></tr>`;
    }
}

/**
 * 4. Renderiza as linhas na tabela
 */
function renderizarListaPedidos(pedidos, container) {
    if (!pedidos || pedidos.length === 0) {
        container.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--cinza-texto, #888); padding: 30px;">Nenhum pedido registrado até o momento.</td></tr>`;
        return;
    }

    container.innerHTML = pedidos.map(p => {
        const total = Number(p.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const dataFormatada = p.criado_em ? new Date(p.criado_em).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '---';

        // Trata a listagem dos itens
        let itensResumo = 'Ver itens';
        try {
            const itensObj = typeof p.itens === 'string' ? JSON.parse(p.itens) : p.itens;
            if (Array.isArray(itensObj)) {
                itensResumo = itensObj.map(i => `${i.quantidade || 1}x ${i.nome || i.titulo || 'Item'}`).join(', ');
            }
        } catch (e) {}

        return `
            <tr data-pedido-id="${p.id}">
                <td><strong>#${p.id}</strong></td>
                <td>
                    <div style="font-weight: 700; color: #fff;">${p.cliente_nome || 'Cliente'}</div>
                    <small style="color: #888;">${p.cliente_whatsapp || p.cliente_email || ''}</small>
                </td>
                <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${itensResumo}">
                    ${itensResumo}
                </td>
                <td style="color: var(--dourado, #d4af37); font-weight: 700;">${total}</td>
                <td><small style="color: #aaa;">${dataFormatada}</small></td>
                <td>
                    <select class="select-status-pedido" onchange="alterarStatusPedido(${p.id}, this.value)" style="background: #111; color: #fff; border: 1px solid #333; padding: 6px 8px; border-radius: 4px; font-weight: 600;">
                        <option value="pendente" ${p.status === 'pendente' ? 'selected' : ''}>⏳ Pendente</option>
                        <option value="pago" ${p.status === 'pago' ? 'selected' : ''}>💳 Pago</option>
                        <option value="separacao" ${p.status === 'separacao' ? 'selected' : ''}>📦 Em Separação</option>
                        <option value="enviado" ${p.status === 'enviado' ? 'selected' : ''}>🚚 Enviado</option>
                        <option value="concluido" ${p.status === 'concluido' ? 'selected' : ''}>✅ Concluído</option>
                        <option value="cancelado" ${p.status === 'cancelado' ? 'selected' : ''}>❌ Cancelado</option>
                    </select>
                </td>
                <td>
                    <button type="button" onclick="imprimirComprovantePedido(${p.id})" title="Imprimir Comprovante" style="background: transparent; border: 1px solid #444; color: #fff; padding: 5px 8px; border-radius: 4px; cursor: pointer;">🖨️</button>
                    <button type="button" onclick="excluirPedidoAdmin(${p.id})" title="Excluir" style="background: transparent; border: 1px solid #ff4444; color: #ff4444; padding: 5px 8px; border-radius: 4px; cursor: pointer; margin-left: 4px;">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * 5. Alterar Status do Pedido no Neon
 */
async function alterarStatusPedido(idPedido, novoStatus) {
    try {
        const sql = await getSql();
        await sql`
            UPDATE pedidos 
            SET status = ${novoStatus} 
            WHERE id = ${idPedido};
        `;
        console.log(`Status do pedido #${idPedido} atualizado para ${novoStatus}`);
    } catch (e) {
        console.error('Erro ao atualizar status:', e);
        alert('Erro ao salvar alteração de status no banco.');
    }
}

/**
 * 6. Excluir Pedido
 */
async function excluirPedidoAdmin(idPedido) {
    if (!confirm(`Deseja realmente excluir o pedido #${idPedido}? Esta ação é irreversível.`)) return;

    try {
        const sql = await getSql();
        await sql`DELETE FROM pedidos WHERE id = ${idPedido};`;
        carregarEAtualizarTabelaPedidos();
    } catch (e) {
        console.error('Erro ao excluir pedido:', e);
        alert('Falha ao excluir pedido.');
    }
}

/**
 * 7. Monitoramento em Tempo Real (Verifica se entraram novos pedidos no Neon a cada 20s)
 */
function iniciarMonitoramentoTempoReal() {
    if (intervaloMonitoramentoPedidos) clearInterval(intervaloMonitoramentoPedidos);

    intervaloMonitoramentoPedidos = setInterval(async () => {
        try {
            const sql = await getSql();
            const maisRecentes = await sql`
                SELECT id, cliente_nome, total, status 
                FROM pedidos 
                ORDER BY id DESC 
                LIMIT 1;
            `;

            if (maisRecentes && maisRecentes.length > 0) {
                const maisRecente = maisRecentes[0];
                const idMaisRecente = Number(maisRecente.id);

                if (ultimoIdPedidoConhecido !== null && idMaisRecente > ultimoIdPedidoConhecido) {
                    ultimoIdPedidoConhecido = idMaisRecente;
                    
                    // Dispara notificação nativa na barra do sistema
                    dispararNotificacaoNativa(maisRecente);

                    // Atualiza a tabela se a aba de pedidos estiver visível
                    carregarEAtualizarTabelaPedidos();
                } else if (ultimoIdPedidoConhecido === null) {
                    ultimoIdPedidoConhecido = idMaisRecente;
                }
            }
        } catch (e) {
            // Silencioso para não poluir console em oscilação de rede
        }
    }, 20000); // 20 segundos
}

// Inicia escutas quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    inicializarNotificacoesPedidos();
    iniciarMonitoramentoTempoReal();
});
/**
 * 8. Imprimir Comprovante do Pedido
 */
function imprimirComprovantePedido(idPedido) {
    const pedido = listaPedidosGlobal.find(p => p.id == idPedido);
    if (!pedido) {
        alert('Pedido não encontrado para impressão.');
        return;
    }

    let itensHtml = '';
    try {
        const itensArr = typeof pedido.itens === 'string' ? JSON.parse(pedido.itens) : pedido.itens;
        itensHtml = itensArr.map(i => `
            <tr>
                <td style="padding: 6px; border-bottom: 1px solid #ddd;">${i.nome || i.titulo}</td>
                <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: center;">${i.quantidade || 1}</td>
                <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: right;">R$ ${Number(i.preco || 0).toFixed(2)}</td>
            </tr>
        `).join('');
    } catch(e) {}

    const janelaPrint = window.open('', '_blank');
    janelaPrint.document.write(`
        <html>
        <head>
            <title>Comprovante - Pedido #${pedido.id}</title>
            <style>
                body { font-family: monospace; padding: 20px; color: #000; font-size: 13px; }
                h2 { text-align: center; margin-bottom: 4px; }
                p { margin: 4px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th { border-bottom: 2px solid #000; text-align: left; padding: 6px; }
            </style>
        </head>
        <body>
            <h2>VR MODAS</h2>
            <p style="text-align: center;">Comprovante do Pedido #${pedido.id}</p>
            <hr>
            <p><strong>Cliente:</strong> ${pedido.cliente_nome || 'Consumidor'}</p>
            <p><strong>Contato:</strong> ${pedido.cliente_whatsapp || pedido.cliente_email || 'Não informado'}</p>
            <p><strong>Status:</strong> ${pedido.status ? pedido.status.toUpperCase() : 'PENDENTE'}</p>
            <table>
                <thead>
                    <tr><th>Item</th><th style="text-align: center;">Qtd</th><th style="text-align: right;">Preço</th></tr>
                </thead>
                <tbody>
                    ${itensHtml}
                </tbody>
            </table>
            <hr style="margin-top: 15px;">
            <h3 style="text-align: right;">Total: R$ ${Number(pedido.total || 0).toFixed(2)}</h3>
        </body>
        </html>
    `);
    janelaPrint.document.close();
    janelaPrint.focus();
    janelaPrint.print();
}