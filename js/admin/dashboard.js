// ==========================================================================
// VR MODAS - DASHBOARD, GRÁFICOS & CONTABILIDADE (NEON DB)
// js/admin/dashboard.js
// ==========================================================================

let instanciaGraficoVendas = null;
let instanciaGraficoCategorias = null;

/**
 * Função utilitária que remove acentos e verifica se o pedido foi pago/concluído
 */
function ehStatusConcluidoOuPago(statusRaw) {
    if (!statusRaw) return false;
    const s = String(statusRaw)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    return s.includes('concluid') || s.includes('pago') || s.includes('finaliz');
}

async function atualizarDashboard() {
    const elFaturamento = document.getElementById('dash-faturamento');
    const elPedidos = document.getElementById('dash-total-pedidos');
    const elEstoqueBaixo = document.getElementById('dash-estoque-baixo');
    const elTotalProdutos = document.getElementById('dash-total-produtos');

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (!sql) throw new Error("Conexão SQL não inicializada");

        // 1. Busca todos os pedidos e produtos do Neon
        const pedidos = await sql`SELECT * FROM pedidos;`;
        const produtos = await sql`SELECT * FROM produtos;`;

        // --- CÁLCULO DOS CARDS ---
        let faturamentoConcluido = 0;
        let qtdPedidosConcluidos = 0;

        pedidos.forEach(p => {
            const status = p.status || '';
            const valor = Number(p.total || p.valor_total || 0);

            // Regra: Somente pedidos concluídos/pagos entram no faturamento e no contador
            if (ehStatusConcluidoOuPago(status)) {
                faturamentoConcluido += valor;
                qtdPedidosConcluidos++;
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
        if (elFaturamento) {
            elFaturamento.innerText = faturamentoConcluido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        if (elPedidos) {
            elPedidos.innerText = qtdPedidosConcluidos;
        }
        if (elEstoqueBaixo) {
            elEstoqueBaixo.innerText = estoqueBaixo;
        }
        if (elTotalProdutos) {
            elTotalProdutos.innerText = totalProdutos;
        }

        // --- RENDERIZAÇÃO DOS GRÁFICOS ---
        renderizarGraficoVendas(pedidos);
        renderizarGraficoCategorias(contagemCategorias);

    } catch (erro) {
        console.error('Erro ao atualizar métricas do Dashboard:', erro);
    }
}
window.atualizarDashboard = atualizarDashboard;

/**
 * Gráfico 1: Faturamento e Histórico de Vendas (Linha) - Apenas Vendas Concluídas
 */
function renderizarGraficoVendas(pedidos) {
    const canvas = document.getElementById('graficoVendas');
    if (!canvas || typeof Chart === 'undefined') return;

    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const hoje = new Date();
    const rotulos = [];
    const totaisPorMes = [0, 0, 0, 0, 0, 0];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        rotulos.push(meses[d.getMonth()]);
    }

    pedidos.forEach(p => {
        // Apenas pedidos concluídos/pagos entram no histórico do gráfico
        if (!ehStatusConcluidoOuPago(p.status)) return;

        const dataCrua = p.criado_em || p.data_criacao || p.data || p.created_at;
        const data = dataCrua ? new Date(dataCrua) : new Date();
        const diffMeses = (hoje.getFullYear() - data.getFullYear()) * 12 + (hoje.getMonth() - data.getMonth());
        
        if (diffMeses >= 0 && diffMeses < 6) {
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
                label: 'Faturamento Pago (R$)',
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