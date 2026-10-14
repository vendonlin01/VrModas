// ==========================================================================
// VR MODAS - RELATÓRIOS, INTERVALOS & FECHAMENTO DE CAIXA (NEON DB)
// js/admin/relatorios.js
// ==========================================================================

// Padrão: data local atual garantida
let modoIntervaloAtivo = 'hoje'; // 'hoje' | 'ontem' | '7dias' | '15dias' | '30dias' | 'custom'
let dataInicioRelatorio = obterDataLocalHoje();
let dataFimRelatorio = obterDataLocalHoje();
let pedidosFiltradosPeriodo = [];

function obterDataLocalHoje() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

/**
 * 1. Injeta a estrutura completa com botões de períodos rápidos
 */
function injetarEstruturaRelatorios() {
    const container = document.getElementById('secao-relatorios');
    if (!container || container.innerHTML.trim() !== '') return;

    container.innerHTML = `
        <div class="admin-card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                <div>
                    <h2 style="margin: 0; font-size: 18px;">📅 Relatório de Vendas & Fechamento de Caixa</h2>
                    <p class="subtexto-card" style="margin: 4px 0 0 0;">Consulte métricas consolidadas por período ou feche o caixa diário da VR Modas.</p>
                </div>
                <button type="button" id="btn-imprimir-fechamento-dia" style="background: var(--dourado, #d4af37); color: #000; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(212, 175, 55, 0.3);">
                    🖨️ Imprimir Fechamento
                </button>
            </div>

            <!-- Filtros de Período (Hoje, 7D, 15D, 30D + Calendário) -->
            <div style="background: #0e0e0e; border: 1px solid #292929; padding: 14px; border-radius: 8px; margin-bottom: 22px;">
                <label style="font-size: 11px; text-transform: uppercase; color: var(--dourado, #d4af37); font-weight: 700; display: block; margin-bottom: 10px;">Filtrar Período:</label>
                
                <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                    <button type="button" class="btn-filtro-periodo ativo" data-periodo="hoje" style="background: var(--dourado, #d4af37); color: #000; border: 1px solid var(--dourado, #d4af37); padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">Hoje</button>
                    <button type="button" class="btn-filtro-periodo" data-periodo="ontem" style="background: #181818; color: #fff; border: 1px solid #333; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">Ontem</button>
                    <button type="button" class="btn-filtro-periodo" data-periodo="7dias" style="background: #181818; color: #fff; border: 1px solid #333; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">7 Dias</button>
                    <button type="button" class="btn-filtro-periodo" data-periodo="15dias" style="background: #181818; color: #fff; border: 1px solid #333; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">15 Dias</button>
                    <button type="button" class="btn-filtro-periodo" data-periodo="30dias" style="background: #181818; color: #fff; border: 1px solid #333; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">30 Dias</button>

                    <div style="display: inline-flex; align-items: center; gap: 6px; margin-left: auto;">
                        <small style="color: #888; font-size: 11px;">Dia específico:</small>
                        <input type="date" id="filtro-data-relatorio" style="background: #181818; border: 1px solid #3a3a3a; color: #fff; padding: 7px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; font-family: 'Montserrat', sans-serif;">
                    </div>
                </div>

                <div id="aviso-periodo-atual" style="margin-top: 8px; font-size: 11.5px; color: #888;">
                    Período selecionado: <strong style="color: var(--dourado, #d4af37);" id="texto-periodo-vigente">Hoje</strong>
                </div>
            </div>

            <!-- Cards de Métricas Consolidadas -->
            <div class="dashboard-cards" style="margin-bottom: 25px;">
                <div class="dash-card borda-dourada">
                    <h3>Faturamento do Período</h3>
                    <p id="relatorio-total-dia">R$ 0,00</p>
                </div>
                <div class="dash-card borda-azul">
                    <h3>Vendas Concluídas</h3>
                    <p id="relatorio-pedidos-dia">0</p>
                </div>
                <div class="dash-card borda-verde">
                    <h3>Peças Vendidas</h3>
                    <p id="relatorio-pecas-dia">0 un</p>
                </div>
                <div class="dash-card borda-vermelha">
                    <h3>Ticket Médio</h3>
                    <p id="relatorio-ticket-medio">R$ 0,00</p>
                </div>
            </div>

            <!-- Resumo de Formas de Pagamento -->
            <div style="background: #111; border: 1px solid #282828; border-radius: 8px; padding: 18px; margin-bottom: 25px;">
                <h3 style="color: var(--dourado, #d4af37); font-size: 14px; margin: 0 0 12px 0; text-transform: uppercase;">💳 Formas de Pagamento Recebidas</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
                    <div style="background: #181818; padding: 12px; border-radius: 6px; border: 1px solid #333;">
                        <small style="color: #888; font-size: 11px;">PIX</small>
                        <strong id="rel-pag-pix" style="display: block; font-size: 16px; color: #4cd137; margin-top: 4px;">R$ 0,00</strong>
                    </div>
                    <div style="background: #181818; padding: 12px; border-radius: 6px; border: 1px solid #333;">
                        <small style="color: #888; font-size: 11px;">Crédito</small>
                        <strong id="rel-pag-credito" style="display: block; font-size: 16px; color: #4a90e2; margin-top: 4px;">R$ 0,00</strong>
                    </div>
                    <div style="background: #181818; padding: 12px; border-radius: 6px; border: 1px solid #333;">
                        <small style="color: #888; font-size: 11px;">Débito</small>
                        <strong id="rel-pag-debito" style="display: block; font-size: 16px; color: #e67e22; margin-top: 4px;">R$ 0,00</strong>
                    </div>
                </div>
            </div>

            <!-- Tabela dos Pedidos do Período -->
            <h3 style="font-size: 15px; margin: 0 0 12px 0; color: #fff;">📦 Histórico de Pedidos no Período</h3>
            <div class="tabela-container">
                <table class="tabela-produtos">
                    <thead>
                        <tr>
                            <th>Pedido / Data</th>
                            <th>Cliente</th>
                            <th>Itens / Peças</th>
                            <th>Pagamento</th>
                            <th>Total</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="lista-pedidos-relatorio-dia"></tbody>
                </table>
            </div>
        </div>
    `;

    configurarEventosFiltros();
}

/**
 * 2. Configura cliques nos botões de 7D, 15D, 30D e calendário
 */
function configurarEventosFiltros() {
    const botoesPeriodo = document.querySelectorAll('.btn-filtro-periodo');
    const inputData = document.getElementById('filtro-data-relatorio');
    const btnImprimir = document.getElementById('btn-imprimir-fechamento-dia');

    botoesPeriodo.forEach(btn => {
        btn.onclick = () => {
            botoesPeriodo.forEach(b => {
                b.classList.remove('ativo');
                b.style.background = '#181818';
                b.style.color = '#fff';
                b.style.borderColor = '#333';
            });

            btn.classList.add('ativo');
            btn.style.background = 'var(--dourado, #d4af37)';
            btn.style.color = '#000';
            btn.style.borderColor = 'var(--dourado, #d4af37)';

            const periodo = btn.getAttribute('data-periodo');
            definirIntervaloDatas(periodo);
            carregarRelatorioDataSelecionada();
        };
    });

    if (inputData) {
        inputData.value = dataInicioRelatorio;
        inputData.onchange = (e) => {
            botoesPeriodo.forEach(b => {
                b.classList.remove('ativo');
                b.style.background = '#181818';
                b.style.color = '#fff';
                b.style.borderColor = '#333';
            });
            modoIntervaloAtivo = 'custom';
            dataInicioRelatorio = e.target.value;
            dataFimRelatorio = e.target.value;
            atualizarTextoPeriodoVigente(`Data selecionada: ${formatarDataBr(dataInicioRelatorio)}`);
            carregarRelatorioDataSelecionada();
        };
    }

    if (btnImprimir) {
        btnImprimir.onclick = imprimirFechamentoDoDia;
    }
}

/**
 * 3. Calcula datas inicial e final para os botões rápidos
 */
function definirIntervaloDatas(periodo) {
    modoIntervaloAtivo = periodo;
    const hoje = new Date();
    dataFimRelatorio = obterDataLocalHoje();

    if (periodo === 'hoje') {
        dataInicioRelatorio = dataFimRelatorio;
        atualizarTextoPeriodoVigente(`Hoje (${formatarDataBr(dataInicioRelatorio)})`);
    } else if (periodo === 'ontem') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        dataInicioRelatorio = formatarDataParaIso(d);
        dataFimRelatorio = dataInicioRelatorio;
        atualizarTextoPeriodoVigente(`Ontem (${formatarDataBr(dataInicioRelatorio)})`);
    } else if (periodo === '7dias') {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        dataInicioRelatorio = formatarDataParaIso(d);
        atualizarTextoPeriodoVigente(`Últimos 7 dias (${formatarDataBr(dataInicioRelatorio)} até ${formatarDataBr(dataFimRelatorio)})`);
    } else if (periodo === '15dias') {
        const d = new Date();
        d.setDate(d.getDate() - 14);
        dataInicioRelatorio = formatarDataParaIso(d);
        atualizarTextoPeriodoVigente(`Últimos 15 dias (${formatarDataBr(dataInicioRelatorio)} até ${formatarDataBr(dataFimRelatorio)})`);
    } else if (periodo === '30dias') {
        const d = new Date();
        d.setDate(d.getDate() - 29);
        dataInicioRelatorio = formatarDataParaIso(d);
        atualizarTextoPeriodoVigente(`Últimos 30 dias (${formatarDataBr(dataInicioRelatorio)} até ${formatarDataBr(dataFimRelatorio)})`);
    }

    const inputData = document.getElementById('filtro-data-relatorio');
    if (inputData && periodo === 'hoje') inputData.value = dataInicioRelatorio;
}

function atualizarTextoPeriodoVigente(texto) {
    const el = document.getElementById('texto-periodo-vigente');
    if (el) el.innerText = texto;
}

function formatarDataParaIso(d) {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

/**
 * 4. Consulta os pedidos no Neon dentro da faixa de datas selecionada
 */
async function carregarRelatorioDataSelecionada() {
    injetarEstruturaRelatorios();

    const tabelaCorpo = document.getElementById('lista-pedidos-relatorio-dia');
    const elTotal = document.getElementById('relatorio-total-dia');
    const elQtdPedidos = document.getElementById('relatorio-pedidos-dia');
    const elPecas = document.getElementById('relatorio-pecas-dia');
    const elTicket = document.getElementById('relatorio-ticket-medio');
    const elPix = document.getElementById('rel-pag-pix');
    const elCredito = document.getElementById('rel-pag-credito');
    const elDebito = document.getElementById('rel-pag-debito');

    if (tabelaCorpo) {
        tabelaCorpo.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto, #888); padding: 25px;">Consultando vendas no Neon...</td></tr>`;
    }

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (!sql) throw new Error("Conexão SQL não inicializada");

        // Busca pedidos dentro da faixa [dataInicioRelatorio, dataFimRelatorio]
        const pedidos = await sql`
            SELECT * FROM pedidos 
            WHERE criado_em::date >= ${dataInicioRelatorio}::date 
              AND criado_em::date <= ${dataFimRelatorio}::date
            ORDER BY id DESC;
        `;

        pedidosFiltradosPeriodo = pedidos || [];

        let totalFaturamento = 0;
        let totalPecas = 0;
        let totalPix = 0;
        let totalCredito = 0;
        let totalDebito = 0;
        let pedidosConcluidosCount = 0;

        pedidosFiltradosPeriodo.forEach(p => {
            const statusNorm = String(p.status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            const valor = Number(p.total || p.valor_total || 0);

            let arrayItens = [];
            let formaPag = 'PIX';
            try {
                const raw = typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || {});
                if (Array.isArray(raw)) {
                    arrayItens = raw;
                } else {
                    arrayItens = raw.itens || [];
                    formaPag = raw.forma_pagamento || p.forma_pagamento || 'PIX';
                }
            } catch (e) {
                arrayItens = [];
            }

            // Somente pedidos concluídos/pagos somam no faturamento real
            if (statusNorm.includes('concluid') || statusNorm.includes('pago')) {
                totalFaturamento += valor;
                pedidosConcluidosCount++;

                arrayItens.forEach(i => {
                    totalPecas += parseInt(i.quantidade || 1, 10);
                });

                const pagLimpo = String(formaPag).toUpperCase();
                if (pagLimpo.includes('PIX')) totalPix += valor;
                else if (pagLimpo.includes('CREDITO') || pagLimpo.includes('CRÉDITO')) totalCredito += valor;
                else if (pagLimpo.includes('DEBITO') || pagLimpo.includes('DÉBITO')) totalDebito += valor;
                else totalPix += valor;
            }
        });

        const ticketMedio = pedidosConcluidosCount > 0 ? (totalFaturamento / pedidosConcluidosCount) : 0;

        if (elTotal) elTotal.innerText = totalFaturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (elQtdPedidos) elQtdPedidos.innerText = pedidosConcluidosCount;
        if (elPecas) elPecas.innerText = `${totalPecas} un`;
        if (elTicket) elTicket.innerText = ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        if (elPix) elPix.innerText = totalPix.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (elCredito) elCredito.innerText = totalCredito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (elDebito) elDebito.innerText = totalDebito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        if (!tabelaCorpo) return;

        if (pedidosFiltradosPeriodo.length === 0) {
            tabelaCorpo.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto, #888); padding: 30px;">Nenhum pedido registrado no período selecionado.</td></tr>`;
            return;
        }

        tabelaCorpo.innerHTML = pedidosFiltradosPeriodo.map(p => {
            const dataHora = p.criado_em ? new Date(p.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '--:--';
            const totalFmt = Number(p.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            let arrayItens = [];
            let formaPag = 'PIX';
            try {
                const raw = typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || {});
                if (Array.isArray(raw)) {
                    arrayItens = raw;
                } else {
                    arrayItens = raw.itens || [];
                    formaPag = raw.forma_pagamento || p.forma_pagamento || 'PIX';
                }
            } catch (e) {
                arrayItens = [];
            }

            const resumoPecas = arrayItens.map(i => `${i.quantidade || 1}x ${i.nome}`).join(', ') || 'Peças diversas';
            const isCancelado = String(p.status || '').toLowerCase().includes('cancel');
            const isConcluido = String(p.status || '').toLowerCase().normalize('NFD').includes('concluid');

            return `
                <tr>
                    <td>
                        <strong style="color: var(--dourado, #d4af37);">#${p.id}</strong>
                        <small style="color: #777; display: block;">${dataHora}</small>
                    </td>
                    <td>${p.cliente_nome || 'Cliente'}</td>
                    <td style="color: #bbb; font-size: 12px;">${resumoPecas}</td>
                    <td><span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.06);">${formaPag}</span></td>
                    <td style="color: var(--dourado, #d4af37); font-weight: 700;">${totalFmt}</td>
                    <td>
                        <span style="font-size: 11px; font-weight: 700; color: ${isCancelado ? '#ff4444' : isConcluido ? '#4cd137' : '#e67e22'};">
                            ${p.status || 'Pendente'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.error('Erro ao carregar relatório do período:', e);
        if (tabelaCorpo) {
            tabelaCorpo.innerHTML = `<tr><td colspan="6" style="color: #ff5252; text-align: center; padding: 20px;">Falha ao carregar relatório: ${e.message}</td></tr>`;
        }
    }
}
window.carregarRelatorioDataSelecionada = carregarRelatorioDataSelecionada;

/**
 * 5. Impressão do Fechamento de Caixa do Período
 */
function imprimirFechamentoDoDia() {
    if (!pedidosFiltradosPeriodo || pedidosFiltradosPeriodo.length === 0) {
        alert('Não há vendas registradas no período selecionado para emitir fechamento.');
        return;
    }

    let faturamento = 0;
    let pix = 0;
    let credito = 0;
    let debito = 0;
    let totalPecas = 0;
    let concluidos = 0;

    const linhas = pedidosFiltradosPeriodo.map(p => {
        const total = Number(p.total || 0);
        let formaPag = 'PIX';
        let arrayItens = [];
        try {
            const raw = typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || {});
            if (Array.isArray(raw)) arrayItens = raw;
            else {
                arrayItens = raw.itens || [];
                formaPag = raw.forma_pagamento || 'PIX';
            }
        } catch(e) {}

        const statusNorm = String(p.status || '').toLowerCase().normalize('NFD');
        if (statusNorm.includes('concluid') || statusNorm.includes('pago')) {
            faturamento += total;
            concluidos++;
            arrayItens.forEach(i => totalPecas += parseInt(i.quantidade || 1, 10));

            const pag = formaPag.toUpperCase();
            if (pag.includes('PIX')) pix += total;
            else if (pag.includes('CREDITO') || pag.includes('CRÉDITO')) credito += total;
            else if (pag.includes('DEBITO') || pag.includes('DÉBITO')) debito += total;
            else pix += total;
        }

        const hora = p.criado_em ? new Date(p.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';

        return `
            <tr>
                <td style="padding: 6px; border-bottom: 1px solid #ddd;">#${p.id} (${hora})</td>
                <td style="padding: 6px; border-bottom: 1px solid #ddd;">${p.cliente_nome || 'Cliente'}</td>
                <td style="padding: 6px; border-bottom: 1px solid #ddd;">${formaPag}</td>
                <td style="padding: 6px; border-bottom: 1px solid #ddd;">${p.status || 'Pendente'}</td>
                <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: right;">${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            </tr>
        `;
    }).join('');

    const periodoStr = dataInicioRelatorio === dataFimRelatorio 
        ? formatarDataBr(dataInicioRelatorio) 
        : `${formatarDataBr(dataInicioRelatorio)} até ${formatarDataBr(dataFimRelatorio)}`;

    const win = window.open('', '_blank', 'width=780,height=900');
    win.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Fechamento de Vendas - VR Modas - ${periodoStr}</title>
            <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #111; font-size: 13px; }
                .recibo { max-width: 540px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; border-radius: 6px; }
                h1 { margin: 0; font-size: 20px; text-align: center; }
                .sub { text-align: center; color: #666; font-size: 12px; margin-top: 4px; margin-bottom: 16px; }
                .totais { background: #f8f8f8; padding: 12px; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 16px; line-height: 1.6; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                th { text-align: left; background: #eee; padding: 6px; border-bottom: 2px solid #ccc; }
                @media print { body { padding: 0; } .recibo { border: none; } }
            </style>
        </head>
        <body>
            <div class="recibo">
                <h1>VR MODAS - FECHAMENTO DE CAIXA</h1>
                <div class="sub">Período: ${periodoStr} | Emissão: ${new Date().toLocaleTimeString('pt-BR')}</div>

                <div class="totais">
                    <div><strong>Faturamento Total Concluído:</strong> ${faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    <div><strong>Vendas Concluídas:</strong> ${concluidos} | <strong>Total de Peças:</strong> ${totalPecas} un</div>
                    <hr style="border: 0; border-top: 1px dashed #ccc; margin: 8px 0;">
                    <div>• <strong>PIX:</strong> ${pix.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    <div>• <strong>Cartão de Crédito:</strong> ${credito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    <div>• <strong>Cartão de Débito:</strong> ${debito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                </div>

                <h3>Extrato de Pedidos do Período</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Pedido</th>
                            <th>Cliente</th>
                            <th>Pagamento</th>
                            <th>Status</th>
                            <th style="text-align: right;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>${linhas}</tbody>
                </table>
            </div>
            <script>window.onload = () => window.print();</script>
        </body>
        </html>
    `);
    win.document.close();
}

function formatarDataBr(dataIso) {
    if (!dataIso) return '';
    const partes = dataIso.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataIso;
}

// Inicialização automática: injeta e carrega o dia de hoje sem necessidade de clique
document.addEventListener('DOMContentLoaded', () => {
    injetarEstruturaRelatorios();
    definirIntervaloDatas('hoje');
    carregarRelatorioDataSelecionada();
});