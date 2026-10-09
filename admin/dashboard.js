// ==========================================
// MÓDULO: DASHBOARD & GRÁFICOS
// ==========================================
let chartVendasInstancia = null;
let chartCategoriasInstancia = null;

export function atualizarDashboard() {
    const produtos = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
    const pedidos = JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [];

    const totalFat = pedidos.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
    const itensBaixos = produtos.filter(p => parseInt(p.estoque || 0) < 5).length;

    const elFat = document.getElementById('dash-faturamento');
    const elPed = document.getElementById('dash-total-pedidos');
    const elEst = document.getElementById('dash-estoque-baixo');
    const elTot = document.getElementById('dash-total-produtos');

    if (elFat) elFat.innerText = totalFat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (elPed) elPed.innerText = pedidos.length;
    if (elEst) elEst.innerText = itensBaixos;
    if (elTot) elTot.innerText = produtos.length;

    renderizarGraficos(pedidos, produtos);
}

function renderizarGraficos(pedidos, produtos) {
    // 1. Gráfico de Histórico de Vendas
    const ctxVendas = document.getElementById('graficoVendas');
    if (ctxVendas && window.Chart) {
        if (chartVendasInstancia) chartVendasInstancia.destroy();

        const labels = pedidos.slice(0, 7).reverse().map((p, i) => p.data ? p.data.split(' ')[0] : `Ped ${i+1}`);
        const dataValores = pedidos.slice(0, 7).reverse().map(p => Number(p.total) || 0);

        const labelsFinais = labels.length > 0 ? labels : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Hoje'];
        const valoresFinais = dataValores.length > 0 ? dataValores : [0, 0, 0, 0, 0, 0, 0];

        chartVendasInstancia = new Chart(ctxVendas, {
            type: 'line',
            data: {
                labels: labelsFinais,
                datasets: [{
                    label: 'Vendas (R$)',
                    data: valoresFinais,
                    borderColor: '#d4af37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2,
                    pointBackgroundColor: '#d4af37'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: '#222' }, ticks: { color: '#888' } },
                    y: { grid: { color: '#222' }, ticks: { color: '#888' } }
                }
            }
        });
    }

    // 2. Gráfico de Categorias em Estoque
    const ctxCategorias = document.getElementById('graficoCategorias');
    if (ctxCategorias && window.Chart) {
        if (chartCategoriasInstancia) chartCategoriasInstancia.destroy();

        const contagens = {};
        produtos.forEach(p => {
            const c = p.categoria || 'Geral';
            contagens[c] = (contagens[c] || 0) + 1;
        });

        const labelsCat = Object.keys(contagens).length > 0 ? Object.keys(contagens) : ['Sem dados'];
        const valoresCat = Object.values(contagens).length > 0 ? Object.values(contagens) : [1];

        chartCategoriasInstancia = new Chart(ctxCategorias, {
            type: 'doughnut',
            data: {
                labels: labelsCat,
                datasets: [{
                    data: valoresCat,
                    backgroundColor: ['#d4af37', '#e91e63', '#1e88e5', '#4caf50', '#ff9800', '#9c27b0'],
                    borderWidth: 1,
                    borderColor: '#141414'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#aaa', font: { size: 11 } } }
                }
            }
        });
    }
}