// ==========================================================================
// VR MODAS - RELATÓRIOS, INTERVALOS & FECHAMENTO DE CAIXA (COMPACTO MOBILE)
// js/admin/relatorios.js
// ==========================================================================

let modoIntervaloAtivo = 'hoje';
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
 * 1. Injeta a estrutura completa com container refinado para mobile
 */
function injetarEstruturaRelatorios() {
    const container = document.getElementById('secao-relatorios');
    if (!container || container.innerHTML.trim() !== '') return;

    container.innerHTML = `
        <div class="admin-card" style="padding: 16px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
                <div>
                    <h2 style="margin: 0; font-size: 17px;">📅 Relatório de Vendas & Caixa</h2>
                    <p class="subtexto-card" style="margin: 3px 0 0 0; font-size: 12px;">Métricas consolidadas por período da VR Modas.</p>
                </div>
                <button type="button" id="btn-imprimir-fechamento-dia" style="background: var(--dourado, #d4af37); color: #000; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 700; font-size: 11.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                    🖨️ Imprimir Fechamento
                </button>
            </div>

            <!-- Filtros de Período -->
            <div style="background: #0e0e0e; border: 1px solid #242424; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                <label style="font-size: 10.5px; text-transform: uppercase; color: var(--dourado, #d4af37); font-weight: 700; display: block; margin-bottom: 8px;">Filtrar Período:</label>
                
                <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                    <button type="button" class="btn-filtro-periodo ativo" data-periodo="hoje" style="background: var(--dourado, #d4af37); color: #000; border: 1px solid var(--dourado, #d4af37); padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">Hoje</button>
                    <button type="button" class="btn-filtro-periodo" data-periodo="ontem" style="background: #181818; color: #fff; border: 1px solid #333; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">Ontem</button>
                    <button type="button" class="btn-filtro-periodo" data-periodo="7dias" style="background: #181818; color: #fff; border: 1px solid #333; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">7 Dias</button>
                    <button type="button" class="btn-filtro-periodo" data-periodo="15dias" style="background: #181818; color: #fff; border: 1px solid #333; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">15 Dias</button>
                    <button type="button" class="btn-filtro-periodo" data-periodo="30dias" style="background: #181818; color: #fff; border: 1px solid #333; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">30 Dias</button>

                    <div style="display: inline-flex; align-items: center; gap: 5px; margin-left: auto;">
                        <input type="date" id="filtro-data-relatorio" style="background: #181818; border: 1px solid #333; color: #fff; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; font-family: 'Montserrat', sans-serif;">
                    </div>
                </div>

                <div id="aviso-periodo-atual" style="margin-top: 6px; font-size: 11px; color: #777;">
                    Período: <strong style="color: var(--dourado, #d4af37);" id="texto-periodo-vigente">Hoje</strong>
                </div>
            </div>

            <!-- Cards de Métricas -->
            <div class="dashboard-cards" style="margin-bottom: 16px; gap: 8px;">
                <div class="dash-card borda-dourada" style="padding: 12px 10px;">
                    <h3 style="font-size: 10px; margin-bottom: 6px;">Faturamento</h3>
                    <p id="relatorio-total-dia" style="font-size: 18px;">R$ 0,00</p>
                </div>
                <div class="dash-card borda-azul" style="padding: 12px 10px;">
                    <h3 style="font-size: 10px; margin-bottom: 6px;">Concluídos</h3>
                    <p id="relatorio-pedidos-dia" style="font-size: 18px;">0</p>
                </div>
                <div class="dash-card borda-verde" style="padding: 12px 10px;">
                    <h3 style="font-size: 10px; margin-bottom: 6px;">Peças Vendidas</h3>
                    <p id="relatorio-pecas-dia" style="font-size: 18px;">0 un</p>
                </div>
                <div class="dash-card borda-vermelha" style="padding: 12px 10px;">
                    <h3 style="font-size: 10px; margin-bottom: 6px;">Ticket Médio</h3>
                    <p id="relatorio-ticket-medio" style="font-size: 18px;">R$ 0,00</p>
                </div>
            </div>

            <!-- Resumo de Formas de Pagamento -->
            <div style="background: #101010; border: 1px solid #222; border-radius: 8px; padding: 12px; margin-bottom: 18px;">
                <h3 style="color: var(--dourado, #d4af37); font-size: 11.5px; margin: 0 0 8px 0; text-transform: uppercase;">💳 Formas de Pagamento</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                    <div style="background: #161616; padding: 8px; border-radius: 6px; border: 1px solid #2a2a2a; text-align: center;">
                        <small style="color: #777; font-size: 10px; display: block;">PIX</small>
                        <strong id="rel-pag-pix" style="font-size: 13.5px; color: #4cd137;">R$ 0,00</strong>
                    </div>
                    <div style="background: #161616; padding: 8px; border-radius: 6px; border: 1px solid #2a2a2a; text-align: center;">
                        <small style="color: #777; font-size: 10px; display: block;">Crédito</small>
                        <strong id="rel-pag-credito" style="font-size: 13.5px; color: #4a90e2;">R$ 0,00</strong>
                    </div>
                    <div style="background: #161616; padding: 8px; border-radius: 6px; border: 1px solid #2a2a2a; text-align: center;">
                        <small style="color: #777; font-size: 10px; display: block;">Débito</small>
                        <strong id="rel-pag-debito" style="font-size: 13.5px; color: #e67e22;">R$ 0,00</strong>
                    </div>
                </div>
            </div>

            <!-- Box Elegante de Extrato de Vendas (Scroll Limpo & Compacto) -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h3 style="font-size: 13px; margin: 0; color: #ddd; text-transform: uppercase; letter-spacing: 0.5px;">📦 Extrato de Pedidos</h3>
                <span id="contagem-pedidos-box" style="font-size: 11px; color: #777;">0 registro(s)</span>
            </div>

            <div id="container-extrato-pedidos" style="background: #0d0d0d; border: 1px solid #222; border-radius: 8px; padding: 6px; max-height: 380px; overflow-y: auto; -webkit-overflow-scrolling: touch; display: flex; flex-direction: column; gap: 6px;">
                <p style="text-align: center; color: #777; font-size: 12px; padding: 20px 0; margin: 0;">A carregar extrato...</p>
            </div>
        </div>
    `;

    configurarEventosFiltros();
}

/**
 * 2. Eventos dos Botões de Período
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
            atualizarTextoPeriodoVigente(`Data: ${formatarDataBr(dataInicioRelatorio)}`);
            carregarRelatorioDataSelecionada();
        };
    }

    if (btnImprimir) {
        btnImprimir.onclick = imprimirFechamentoDoDia;
    }
}

/**
 * 3. Cálculos de Datas
 */
function definirIntervaloDatas(periodo) {
    modoIntervaloAtivo = periodo;
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
 * 4. Carrega Vendas e Renderiza Cards Compactos
 */
async function carregarRelatorioDataSelecionada() {
    injetarEstruturaRelatorios();

    const containerExtrato = document.getElementById('container-extrato-pedidos');
    const elContagem = document.getElementById('contagem-pedidos-box');
    const elTotal = document.getElementById('relatorio-total-dia');
    const elQtdPedidos = document.getElementById('relatorio-pedidos-dia');
    const elPecas = document.getElementById('relatorio-pecas-dia');
    const elTicket = document.getElementById('relatorio-ticket-medio');
    const elPix = document.getElementById('rel-pag-pix');
    const elCredito = document.getElementById('rel-pag-credito');
    const elDebito = document.getElementById('rel-pag-debito');

    if (containerExtrato) {
        containerExtrato.innerHTML = `<p style="text-align: center; color: #777; font-size: 12px; padding: 20px 0; margin: 0;">Buscando vendas no Neon...</p>`;
    }

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (!sql) throw new Error("Conexão SQL não inicializada");

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

        if (elContagem) elContagem.innerText = `${pedidosFiltradosPeriodo.length} registro(s)`;

        if (!containerExtrato) return;

        if (pedidosFiltradosPeriodo.length === 0) {
            containerExtrato.innerHTML = `<p style="text-align: center; color: #777; font-size: 12px; padding: 25px 0; margin: 0;">Nenhum pedido no período selecionado.</p>`;
            return;
        }

        // Renderização dos cards compactos estilo extrato bancário
        containerExtrato.innerHTML = pedidosFiltradosPeriodo.map(p => {
            const dataHora = p.criado_em ? new Date(p.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
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

            const resumoPecas = arrayItens.map(i => `${i.quantidade || 1}x ${i.nome}`).join(', ') || 'Peça';
            const statusNorm = String(p.status || '').toLowerCase().normalize('NFD');
            const isCancelado = statusNorm.includes('cancel');
            const isConcluido = statusNorm.includes('concluid') || statusNorm.includes('pago');

            const corBadge = isCancelado ? '#ff4d4d' : (isConcluido ? '#4cd137' : '#e67e22');
            const bgBadge = isCancelado ? 'rgba(255,77,77,0.1)' : (isConcluido ? 'rgba(76,209,55,0.1)' : 'rgba(230,126,34,0.1)');

            return `
                <div style="background: #141414; border: 1px solid #242424; border-radius: 6px; padding: 9px 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                    <!-- Lado Esquerdo: Info do Pedido & Cliente -->
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                            <strong style="color: var(--dourado, #d4af37); font-size: 12.5px;">#${p.id}</strong>
                            <span style="color: #777; font-size: 11px;">• ${dataHora}</span>
                            <span style="font-size: 10px; padding: 1px 5px; border-radius: 3px; background: #222; color: #aaa; text-transform: uppercase;">${formaPag}</span>
                        </div>
                        <div style="font-size: 12px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${p.cliente_nome || 'Cliente'}
                        </div>
                        <div style="font-size: 11px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${resumoPecas}
                        </div>
                    </div>

                    <!-- Lado Direito: Valor & Status -->
                    <div style="text-align: right; flex-shrink: 0;">
                        <div style="color: var(--dourado, #d4af37); font-weight: 700; font-size: 13.5px; margin-bottom: 3px;">
                            ${totalFmt}
                        </div>
                        <span style="font-size: 10px; font-weight: 700; color: ${corBadge}; background: ${bgBadge}; border: 1px solid ${corBadge}; padding: 2px 6px; border-radius: 4px; display: inline-block;">
                            ${p.status || 'Pendente'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error('Erro ao carregar relatório do período:', e);
        if (containerExtrato) {
            containerExtrato.innerHTML = `<p style="color: #ff5252; text-align: center; padding: 15px; font-size: 12px; margin: 0;">Falha: ${e.message}</p>`;
        }
    }
}
window.carregarRelatorioDataSelecionada = carregarRelatorioDataSelecionada;

/**
 * 5. Impressão de Fechamento de Caixa
 */
function imprimirFechamentoDoDia() {
    if (!pedidosFiltradosPeriodo || pedidosFiltradosPeriodo.length === 0) {
        alert('Não há vendas no período selecionado para emitir fechamento.');
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

        const hora = p.criado_em ? new Date(p.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

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
            <title>Fechamento de Caixa - VR Modas - ${periodoStr}</title>
            <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #111; font-size: 13px; }
                .recibo { max-width: 520px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; border-radius: 6px; }
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

                <h3>Extrato de Vendas do Período</h3>
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

// Inicialização automática: injeta e carrega 'hoje'
document.addEventListener('DOMContentLoaded', () => {
    injetarEstruturaRelatorios();
    definirIntervaloDatas('hoje');
    carregarRelatorioDataSelecionada();
});