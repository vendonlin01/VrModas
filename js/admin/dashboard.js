// ==========================================================================
// VR MODAS - DASHBOARD, FILTROS DE PERÍODO & GRÁFICOS (NEON DB)
// js/admin/dashboard.js
// ==========================================================================

let instanciaGraficoVendas = null;
let instanciaGraficoCategorias = null;
let periodoDashboardAtivo = 'todos';
let cachePedidosDashboard = [];
let cacheProdutosDashboard = [];

function ehStatusConcluidoOuPago(statusRaw) {
    if (!statusRaw) return false;
    const s = String(statusRaw)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    return s.includes('concluid') || s.includes('pago') || s.includes('finaliz');
}

function extrairDataPedido(p) {
    const dataCrua = p.criado_em || p.data_criacao || p.data || p.created_at;
    if (!dataCrua) return null;
    const d = new Date(dataCrua);
    return Number.isNaN(d.getTime()) ? null : d;
}

function obterIntervaloPeriodo(periodo) {
    const agora = new Date();
    const fimHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999);
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0, 0);

    if (periodo === 'hoje') {
        return { inicio: inicioHoje, fim: fimHoje, label: 'Hoje' };
    }
    if (periodo === 'ontem') {
        const inicioOntem = new Date(inicioHoje);
        inicioOntem.setDate(inicioOntem.getDate() - 1);
        const fimOntem = new Date(fimHoje);
        fimOntem.setDate(fimOntem.getDate() - 1);
        return { inicio: inicioOntem, fim: fimOntem, label: 'Ontem' };
    }

    const mapaDias = { '5d': 5, '7d': 7, '15d': 15, '30d': 30 };
    if (mapaDias[periodo]) {
        const dias = mapaDias[periodo];
        const inicio = new Date(inicioHoje);
        inicio.setDate(inicio.getDate() - (dias - 1));
        return { inicio, fim: fimHoje, dias, label: `Últimos ${dias} dias` };
    }

    return { inicio: null, fim: null, label: 'Todo o período' };
}

function garantirBarraFiltrosDashboard() {
    const secaoDash = document.getElementById('secao-dashboard');
    if (!secaoDash || document.getElementById('barra-filtros-dashboard')) return;

    const opcoes = [
        { id: 'hoje', texto: 'Hoje' },
        { id: 'ontem', texto: 'Ontem' },
        { id: '5d', texto: '5 Dias' },
        { id: '7d', texto: '7 Dias' },
        { id: '15d', texto: '15 Dias' },
        { id: '30d', texto: '30 Dias' },
        { id: 'todos', texto: 'Todo Período' }
    ];

    const barra = document.createElement('div');
    barra.id = 'barra-filtros-dashboard';
    barra.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        background: #141414;
        border: 1px solid #282828;
        border-radius: 10px;
        padding: 12px 14px;
        margin-bottom: 18px;
    `;

    barra.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #bbb; font-weight: 700;">
            <span style="color: var(--dourado, #d4af37);">📅 Período:</span>
            <span id="label-periodo-dashboard" style="color: #fff;">Todo o período</span>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${opcoes.map(op => `
                <button type="button" class="btn-filtro-dash" data-periodo="${op.id}" style="
                    padding: 6px 11px;
                    border-radius: 6px;
                    border: 1px solid ${op.id === periodoDashboardAtivo ? 'var(--dourado, #d4af37)' : '#333'};
                    background: ${op.id === periodoDashboardAtivo ? 'var(--dourado, #d4af37)' : '#1c1c1c'};
                    color: ${op.id === periodoDashboardAtivo ? '#000' : '#ddd'};
                    font-size: 11.5px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.15s ease;
                ">${op.texto}</button>
            `).join('')}
        </div>
    `;

    secaoDash.insertBefore(barra, secaoDash.firstChild);

    barra.querySelectorAll('.btn-filtro-dash').forEach(btn => {
        btn.addEventListener('click', () => {
            periodoDashboardAtivo = btn.getAttribute('data-periodo') || 'todos';
            atualizarVisualBotoesPeriodo();
            aplicarFiltroDashboard();
        });
    });
}

function atualizarVisualBotoesPeriodo() {
    const barra = document.getElementById('barra-filtros-dashboard');
    if (!barra) return;
    const { label } = obterIntervaloPeriodo(periodoDashboardAtivo);
    const labelEl = document.getElementById('label-periodo-dashboard');
    if (labelEl) labelEl.innerText = label;

    barra.querySelectorAll('.btn-filtro-dash').forEach(btn => {
        const ativo = btn.getAttribute('data-periodo') === periodoDashboardAtivo;
        btn.style.borderColor = ativo ? 'var(--dourado, #d4af37)' : '#333';
        btn.style.background = ativo ? 'var(--dourado, #d4af37)' : '#1c1c1c';
        btn.style.color = ativo ? '#000' : '#ddd';
    });
}

function filtrarPedidosPorPeriodo(pedidos, periodo) {
    const { inicio, fim } = obterIntervaloPeriodo(periodo);
    if (!inicio || !fim) return pedidos;

    return pedidos.filter(p => {
        const d = extrairDataPedido(p);
        if (!d) return false;
        return d >= inicio && d <= fim;
    });
}

function aplicarFiltroDashboard() {
    const elFaturamento = document.getElementById('dash-faturamento');
    const elPedidos = document.getElementById('dash-total-pedidos');
    const elEstoqueBaixo = document.getElementById('dash-estoque-baixo');
    const elTotalProdutos = document.getElementById('dash-total-produtos');

    const pedidosFiltrados = filtrarPedidosPorPeriodo(cachePedidosDashboard, periodoDashboardAtivo);

    let faturamentoConcluido = 0;
    let qtdPedidosConcluidos = 0;

    pedidosFiltrados.forEach(p => {
        const valor = Number(p.total || p.valor_total || 0);
        if (ehStatusConcluidoOuPago(p.status)) {
            faturamentoConcluido += valor;
            qtdPedidosConcluidos++;
        }
    });

    let estoqueBaixo = 0;
    const totalProdutos = cacheProdutosDashboard.length;
    const contagemCategorias = {};

    cacheProdutosDashboard.forEach(p => {
        const qtdEstoque = parseInt(p.estoque || 0, 10);
        if (qtdEstoque < 5) estoqueBaixo++;

        const cat = (p.categoria || 'Geral').toLowerCase();
        contagemCategorias[cat] = (contagemCategorias[cat] || 0) + 1;
    });

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

    renderizarGraficoVendas(pedidosFiltrados, periodoDashboardAtivo);
    renderizarGraficoCategorias(contagemCategorias);
}

async function atualizarDashboard() {
    garantirBarraFiltrosDashboard();
    atualizarVisualBotoesPeriodo();

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (!sql) throw new Error("Conexão SQL não inicializada");

        const pedidos = await sql`SELECT * FROM pedidos;`;
        const produtos = await sql`SELECT * FROM produtos;`;

        cachePedidosDashboard = Array.isArray(pedidos) ? pedidos : [];
        cacheProdutosDashboard = Array.isArray(produtos) ? produtos : [];

        aplicarFiltroDashboard();
    } catch (erro) {
        console.error('Erro ao atualizar métricas do Dashboard:', erro);
    }
}
window.atualizarDashboard = atualizarDashboard;

function renderizarGraficoVendas(pedidos, periodo = 'todos') {
    const canvas = document.getElementById('graficoVendas');
    if (!canvas || typeof Chart === 'undefined') return;

    const rotulos = [];
    const valores = [];
    const hoje = new Date();

    if (periodo === 'hoje' || periodo === 'ontem') {
        const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        if (periodo === 'ontem') base.setDate(base.getDate() - 1);

        const blocos = ['00h-04h', '04h-08h', '08h-12h', '12h-16h', '16h-20h', '20h-24h'];
        rotulos.push(...blocos);
        valores.push(0, 0, 0, 0, 0, 0);

        pedidos.forEach(p => {
            if (!ehStatusConcluidoOuPago(p.status)) return;
            const d = extrairDataPedido(p);
            if (!d) return;
            const idx = Math.min(5, Math.floor(d.getHours() / 4));
            valores[idx] += Number(p.total || p.valor_total || 0);
        });
    } else if (['5d', '7d', '15d', '30d'].includes(periodo)) {
        const dias = parseInt(periodo.replace('d', ''), 10);
        const mapaDias = {};

        for (let i = dias - 1; i >= 0; i--) {
            const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i);
            const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const labelDia = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            rotulos.push(labelDia);
            mapaDias[chave] = 0;
        }

        pedidos.forEach(p => {
            if (!ehStatusConcluidoOuPago(p.status)) return;
            const d = extrairDataPedido(p);
            if (!d) return;
            const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (mapaDias[chave] !== undefined) {
                mapaDias[chave] += Number(p.total || p.valor_total || 0);
            }
        });

        valores.push(...Object.values(mapaDias));
    } else {
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const totaisPorMes = [0, 0, 0, 0, 0, 0];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
            rotulos.push(meses[d.getMonth()]);
        }

        pedidos.forEach(p => {
            if (!ehStatusConcluidoOuPago(p.status)) return;
            const data = extrairDataPedido(p) || new Date();
            const diffMeses = (hoje.getFullYear() - data.getFullYear()) * 12 + (hoje.getMonth() - data.getMonth());
            if (diffMeses >= 0 && diffMeses < 6) {
                const indice = 5 - diffMeses;
                totaisPorMes[indice] += Number(p.total || p.valor_total || 0);
            }
        });

        valores.push(...totaisPorMes);
    }

    if (instanciaGraficoVendas) {
        instanciaGraficoVendas.destroy();
    }

    instanciaGraficoVendas = new Chart(canvas, {
        type: 'line',
        data: {
            labels: rotulos,
            datasets: [{
                label: 'Faturamento Pago (R$)',
                data: valores,
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
                    ticks: { color: '#888', maxRotation: 45 }
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