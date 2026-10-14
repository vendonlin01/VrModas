// ==========================================================================
// VR MODAS - DASHBOARD, FATURAMENTO & MÉTRICAS (NEON DB)
// js/admin/dashboard.js
// ==========================================================================

/**
 * 1. Calcula e atualiza todos os cartões de métricas do painel
 */
async function atualizarDashboard() {
    const elFaturamento = document.getElementById('dash-faturamento-total');
    const elPedidosTotal = document.getElementById('dash-pedidos-total');
    const elTicketMedio = document.getElementById('dash-ticket-medio');
    const elEstoqueTotal = document.getElementById('dash-pecas-estoque');
    const elPedidosPendentes = document.getElementById('dash-pedidos-pendentes');

    try {
        const sql = await getSql();

        // 1. Métricas de Pedidos e Vendas
        const metricasPedidos = await sql`
            SELECT 
                COUNT(*) as total_pedidos,
                COALESCE(SUM(CASE WHEN status != 'cancelado' THEN total ELSE 0 END), 0) as faturamento_total,
                COALESCE(AVG(CASE WHEN status != 'cancelado' THEN total ELSE NULL END), 0) as ticket_medio,
                COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pedidos_pendentes
            FROM pedidos;
        `;

        // 2. Métricas de Inventário
        const metricasEstoque = await sql`
            SELECT COALESCE(SUM(estoque), 0) as total_pecas 
            FROM produtos;
        `;

        const dadosVendas = metricasPedidos[0] || {};
        const dadosEstoque = metricasEstoque[0] || {};

        const faturamento = Number(dadosVendas.faturamento_total || 0);
        const ticket = Number(dadosVendas.ticket_medio || 0);
        const totalPedidos = parseInt(dadosVendas.total_pedidos || 0, 10);
        const pendentes = parseInt(dadosVendas.pedidos_pendentes || 0, 10);
        const totalPecas = parseInt(dadosEstoque.total_pecas || 0, 10);

        // Atualização visual dos elementos no DOM
        if (elFaturamento) {
            elFaturamento.innerText = faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        if (elPedidosTotal) {
            elPedidosTotal.innerText = totalPedidos;
        }

        if (elTicketMedio) {
            elTicketMedio.innerText = ticket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        if (elEstoqueTotal) {
            elEstoqueTotal.innerText = totalPecas;
        }

        if (elPedidosPendentes) {
            elPedidosPendentes.innerText = pendentes;
        }

    } catch (erro) {
        console.error('Erro ao calcular métricas do Dashboard no Neon:', erro);
    }
}

// Inicializa atualização quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    atualizarDashboard();
});