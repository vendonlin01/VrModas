// ==========================================================================
// VR MODAS - MÓDULO DE PEDIDOS & NOTIFICAÇÕES NATIVAS
// js/admin/pedidos.js
// ==========================================================================

let listaPedidosGlobal = [];
let ultimoIdPedidoConhecido = null;
let intervaloMonitoramentoPedidos = null;

// Áudio embutido em Base64 para alerta sonoro imediato
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
        const totalNum = Number(pedido.total || pedido.valor_total || 0);
        const totalFmt = totalNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const nomeCliente = pedido.cliente_nome || pedido.nome_cliente || pedido.cliente || 'Cliente';
        const titulo = '🛍️ Novo Pedido Recebido!';
        const opcoes = {
            body: `Pedido #${pedido.id} - ${nomeCliente}\nValor: ${totalFmt}`,
            icon: 'img/logo.png',
            badge: 'img/logo.png',
            tag: `pedido-${pedido.id}`,
            vibrate: [200, 100, 200]
        };

        const notificacao = new Notification(titulo, opcoes);

        // Alerta sonoro
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
 * 3. Carregar e Renderizar a Tabela de Pedidos (Universal)
 */
async function carregarEAtualizarTabelaPedidos() {
    const containerTabela = document.getElementById('lista-pedidos-admin') || document.getElementById('tabela-pedidos-corpo');
    if (!containerTabela) return;

    try {
        const sql = await getSql();
        // SELECT * com ordenação por id DESC previne erros com nomes divergentes de colunas
        const pedidos = await sql`
            SELECT * FROM pedidos 
            ORDER BY id DESC;
        `;

        listaPedidosGlobal = pedidos || [];
        renderizarListaPedidos(pedidos, containerTabela);

        if (pedidos.length > 0 && ultimoIdPedidoConhecido === null) {
            ultimoIdPedidoConhecido = Number(pedidos[0].id);
        }

    } catch (erro) {
        console.error('Erro ao carregar pedidos do Neon:', erro);
        containerTabela.innerHTML = `<tr><td colspan="6" style="color: #ff6b6b; text-align: center; padding: 20px;">Falha ao carregar pedidos: ${erro.message || 'Verifique o console'}</td></tr>`;
    }
}

/**
 * 4. Renderiza as linhas na tabela com tratamento flexível de campos
 */
function renderizarListaPedidos(pedidos, container) {
    if (!pedidos || pedidos.length === 0) {
        container.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto, #888); padding: 30px;">Nenhum pedido registrado até o momento.</td></tr>`;
        return;
    }

    container.innerHTML = pedidos.map(p => {
        const totalNum = Number(p.total || p.valor_total || 0);
        const totalFormatado = totalNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        // Data flexível
        const dataCrua = p.criado_em || p.data_criacao || p.data || p.created_at;
        const dataFormatada = dataCrua ? new Date(dataCrua).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Recente';

        // Cliente e contato flexíveis
        const nomeCliente = p.cliente_nome || p.nome_cliente || p.cliente || (p.usuario && p.usuario.nome) || 'Cliente';
        const contatoCliente = p.cliente_whatsapp || p.whatsapp || p.telefone || p.cliente_email || p.email || '';

        // Formatação dos itens
        let itensResumo = 'Ver itens';
        try {
            const itensObj = typeof p.itens === 'string' ? JSON.parse(p.itens) : p.itens;
            if (Array.isArray(itensObj)) {
                itensResumo = itensObj.map(i => `${i.quantidade || i.qtd || 1}x ${i.nome || i.titulo || 'Peça'}`).join(', ');
            }
        } catch (e) {}

        const statusAtual = (p.status || 'pendente').toLowerCase();

        return `
            <tr data-pedido-id="${p.id}">
                <td>
                    <div style="font-weight: 700; color: #fff;">#${p.id} - ${nomeCliente}</div>
                    <small style="color: #888;">${contatoCliente}</small>
                </td>
                <td><small style="color: #aaa;">${dataFormatada}</small></td>
                <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${itensResumo}">
                    ${itensResumo}
                </td>
                <td style="color: var(--dourado, #d4af37); font-weight: 700;">${totalFormatado}</td>
                <td>
                    <select class="select-status-pedido" onchange="alterarStatusPedido(${p.id}, this.value)" style="background: #111; color: #fff; border: 1px solid #333; padding: 6px 8px; border-radius: 4px; font-weight: 600;">
                        <option value="pendente" ${statusAtual === 'pendente' ? 'selected' : ''}>⏳ Pendente</option>
                        <option value="pago" ${statusAtual === 'pago' ? 'selected' : ''}>💳 Pago</option>
                        <option value="separacao" ${statusAtual === 'separacao' ? 'selected' : ''}>📦 Em Separação</option>
                        <option value="enviado" ${statusAtual === 'enviado' ? 'selected' : ''}>🚚 Enviado</option>
                        <option value="concluido" ${statusAtual === 'concluido' ? 'selected' : ''}>✅ Concluído</option>
                        <option value="cancelado" ${statusAtual === 'cancelado' ? 'selected' : ''}>❌ Cancelado</option>
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
 * 7. Monitoramento em Tempo Real (Consulta a cada 20 segundos)
 */
function iniciarMonitoramentoTempoReal() {
    if (intervaloMonitoramentoPedidos) clearInterval(intervaloMonitoramentoPedidos);

    intervaloMonitoramentoPedidos = setInterval(async () => {
        try {
            const sql = await getSql();
            const maisRecentes = await sql`
                SELECT * FROM pedidos 
                ORDER BY id DESC 
                LIMIT 1;
            `;

            if (maisRecentes && maisRecentes.length > 0) {
                const maisRecente = maisRecentes[0];
                const idMaisRecente = Number(maisRecente.id);

                if (ultimoIdPedidoConhecido !== null && idMaisRecente > ultimoIdPedidoConhecido) {
                    ultimoIdPedidoConhecido = idMaisRecente;
                    
                    // Dispara alerta visual na barra do dispositivo e som
                    dispararNotificacaoNativa(maisRecente);

                    // Atualiza a tabela se a aba de pedidos estiver aberta
                    carregarEAtualizarTabelaPedidos();
                } else if (ultimoIdPedidoConhecido === null) {
                    ultimoIdPedidoConhecido = idMaisRecente;
                }
            }
        } catch (e) {
            // Silencioso em variações momentâneas de conexão
        }
    }, 20000);
}

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
                <td style="padding: 6px; border-bottom: 1px solid #ddd;">${i.nome || i.titulo || 'Item'}</td>
                <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: center;">${i.quantidade || i.qtd || 1}</td>
                <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: right;">R$ ${Number(i.preco || 0).toFixed(2)}</td>
            </tr>
        `).join('');
    } catch(e) {}

    const totalNum = Number(pedido.total || pedido.valor_total || 0);
    const nomeCliente = pedido.cliente_nome || pedido.nome_cliente || pedido.cliente || 'Consumidor';
    const contatoCliente = pedido.cliente_whatsapp || pedido.whatsapp || pedido.telefone || pedido.cliente_email || pedido.email || 'Não informado';

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
            <p><strong>Cliente:</strong> ${nomeCliente}</p>
            <p><strong>Contato:</strong> ${contatoCliente}</p>
            <p><strong>Status:</strong> ${(pedido.status || 'PENDENTE').toUpperCase()}</p>
            <table>
                <thead>
                    <tr><th>Item</th><th style="text-align: center;">Qtd</th><th style="text-align: right;">Preço</th></tr>
                </thead>
                <tbody>
                    ${itensHtml}
                </tbody>
            </table>
            <hr style="margin-top: 15px;">
            <h3 style="text-align: right;">Total: R$ ${totalNum.toFixed(2)}</h3>
        </body>
        </html>
    `);
    janelaPrint.document.close();
    janelaPrint.focus();
    janelaPrint.print();
}

// Inicia escutas e rotinas ao carregar
document.addEventListener('DOMContentLoaded', () => {
    inicializarNotificacoesPedidos();
    iniciarMonitoramentoTempoReal();
});