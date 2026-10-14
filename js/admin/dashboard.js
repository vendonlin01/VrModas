// ==========================================================================
// VR MODAS - DASHBOARD, GRÁFICOS & CONTABILIDADE (NEON DB)
// js/admin/dashboard.js
// ==========================================================================

let instanciaGraficoVendas = null;
let instanciaGraficoCategorias = null;

async function atualizarDashboard() {
    const elFaturamento = document.getElementById('dash-faturamento');
    const elPedidos = document.getElementById('dash-total-pedidos');
    const elEstoqueBaixo = document.getElementById('dash-estoque-baixo');
    const elTotalProdutos = document.getElementById('dash-total-produtos');

    try {
        const sql = await getSql();

        // 1. Busca todos os pedidos e produtos do banco
        const pedidos = await sql`SELECT * FROM pedidos;`;
        const produtos = await sql`SELECT * FROM produtos;`;

        // --- CÁLCULO DOS CARDS ---
        let faturamento = 0;
        let pedidosConcluidos = 0;

        pedidos.forEach(p => {
            const status = (p.status || '').toLowerCase();
            const valor = Number(p.total || p.valor_total || 0);

            if (status !== 'cancelado') {
                faturamento += valor;
            }
            if (status === 'concluido' || status === 'pago') {
                pedidosConcluidos++;
            }
        });

        let estoqueBaixo = 0;
        const totalProdutos = produtos.length;
        const contagemCategorias = {};

        produtos.forEach(p => {
            const qtdEstoque = parseInt(p.estoque || 0, 10);
            if (qtdEstoque < 5) {
                estoqueBaixo++;
            }

            const cat = (p.categoria || 'Geral').toLowerCase();
            contagemCategorias[cat] = (contagemCategorias[cat] || 0) + 1;
        });

        // Atualiza os cartões na tela
        if (elFaturamento) elFaturamento.innerText = faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (elPedidos) elPedidos.innerText = pedidosConcluidos;
        if (elEstoqueBaixo) elEstoqueBaixo.innerText = estoqueBaixo;
        if (elTotalProdutos) elTotalProdutos.innerText = totalProdutos;

        // --- RENDERIZAÇÃO DOS GRÁFICOS ---
        renderizarGraficoVendas(pedidos);
        renderizarGraficoCategorias(contagemCategorias);

    } catch (erro) {
        console.error('Erro ao atualizar métricas do Dashboard:', erro);
    }
}

/**
 * Gráfico 1: Faturamento e Histórico de Vendas (Linha)
 */
function renderizarGraficoVendas(pedidos) {
    const canvas = document.getElementById('graficoVendas');
    if (!canvas || typeof Chart === 'undefined') return;

    // Agrupa faturamento dos últimos 6 meses ou pedidos recentes
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const hoje = new Date();
    const rotulos = [];
    const totaisPorMes = [0, 0, 0, 0, 0, 0];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        rotulos.push(meses[d.getMonth()]);
    }

    pedidos.forEach(p => {
        const dataCrua = p.criado_em || p.data_criacao || p.data || p.created_at;
        const data = dataCrua ? new Date(dataCrua) : new Date();
        const diffMeses = (hoje.getFullYear() - data.getFullYear()) * 12 + (hoje.getMonth() - data.getMonth());
        
        if (diffMeses >= 0 && diffMeses < 6 && (p.status || '').toLowerCase() !== 'cancelado') {
            const indice = 5 - diffMeses;
            totaisPorMes[indice] += Number(p.total || p.valor_total || 0);
        }
    });

    if (instanciaGraficoVendas) {
        instanciaGraficoVendas.destroy();
    }

    instanciaGraficoVendas = new Chart(canvas, {
        type: 'line',
        data: {
            labels: rotulos,
            datasets: [{
                label: 'Faturamento (R$)',
                data: totaisPorMes,
                borderColor: '#d4af37',
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                borderWidth: 2,
                tension: 0.35,
                fill: true,
                pointBackgroundColor: '#d4af37',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#888' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { 
                        color: '#888',
                        callback: val => 'R$ ' + val
                    }
                }
            }
        }
    });
}

/**
 * Gráfico 2: Distribuição de Peças por Categoria (Doughnut)
 */
function renderizarGraficoCategorias(contagemCategorias) {
    const canvas = document.getElementById('graficoCategorias');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = Object.keys(contagemCategorias).map(c => c.toUpperCase());
    const data = Object.values(contagemCategorias);

    if (instanciaGraficoCategorias) {
        instanciaGraficoCategorias.destroy();
    }

    instanciaGraficoCategorias = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['Sem produtos'],
            datasets: [{
                data: data.length ? data : [1],
                backgroundColor: [
                    '#d4af37',
                    '#4a90e2',
                    '#50e3c2',
                    '#e67e22',
                    '#9b59b6',
                    '#e74c3c',
                    '#7f8c8d'
                ],
                borderWidth: 1,
                borderColor: '#141414'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#bbb', font: { size: 11 } }
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    atualizarDashboard();
});