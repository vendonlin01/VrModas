// ==========================================================================
// VR MODAS - MÓDULO ISOLADO DE RELATÓRIOS & FECHAMENTO DE CAIXA
// js/admin/relatorios.js
// ==========================================================================

let dataSelecionadaRelatorio = new Date().toISOString().split('T')[0];
let pedidosDoDiaAtual = [];

/**
 * 1. Injeta o HTML completo da seção de relatórios diretamente na tag vazia
 */
function injetarEstruturaRelatorios() {
    const container = document.getElementById('secao-relatorios');
    if (!container || container.innerHTML.trim() !== '') return;

    container.innerHTML = `
        <div class="admin-card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                <div>
                    <h2 style="margin: 0; font-size: 18px;">📅 Relatório Diário & Fechamento de Caixa</h2>
                    <p class="subtexto-card" style="margin: 4px 0 0 0;">Selecione qualquer dia no calendário para auditar as vendas e fechar o caixa.</p>
                </div>
                <button type="button" id="btn-imprimir-fechamento-dia" style="background: var(--dourado, #d4af37); color: #000; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                    🖨️ Imprimir Fechamento do Dia
                </button>
            </div>

            <!-- Seletor Rápido de Data & Calendário -->
            <div style="display: flex; gap: 12px; align-items: center; background: #0e0e0e; border: 1px solid #292929; padding: 14px; border-radius: 8px; margin-bottom: 22px; flex-wrap: wrap;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 11px; text-transform: uppercase; color: var(--dourado, #d4af37); font-weight: 700;">Data do Relatório:</label>
                    <input type="date" id="filtro-data-relatorio" style="background: #181818; border: 1px solid #3a3a3a; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 700; font-family: 'Montserrat', sans-serif;">
                </div>
                <div style="display: flex; gap: 8px; align-self: flex-end;">
                    <button type="button" id="btn-data-hoje" style="background: #222; border: 1px solid #444; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">Hoje</button>
                    <button type="button" id="btn-data-ontem" style="background: #222; border: 1px solid #444; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">Ontem</button>
                </div>
            </div>

            <!-- Cards do Dia Selecionado -->
            <div class="dashboard-cards" style="margin-bottom: 25px;">
                <div class="dash-card borda-dourada">
                    <h3>Faturamento do Dia</h3>
                    <p id="relatorio-total-dia">R$ 0,00</p>
                </div>
                <div class="dash-card borda-azul">
                    <h3>Pedidos Concluídos</h3>
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

            <!-- Resumo de Pagamentos -->
            <div style="background: #111; border: 1px solid #282828; border-radius: 8px; padding: 18px; margin-bottom: 25px;">
                <h3 style="color: var(--dourado, #d4af37); font-size: 14px; margin: 0 0 12px 0; text-transform: uppercase;">💳 Resumo de Pagamentos do Dia</h3>
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

            <!-- Tabela de Pedidos que saíram na data -->
            <h3 style="font-size: 15px; margin: 0 0 12px 0; color: #fff;">📦 Pedidos Realizados nesta Data</h3>
            <div class="tabela-container">
                <table class="tabela-produtos">
                    <thead>
                        <tr>
                            <th>Pedido / Hora</th>
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
 * 2. Liga os eventos do calendário e botões
 */
function configurarEventosFiltros() {
    const inputData = document.getElementById('filtro-data-relatorio');
    const btnHoje = document.getElementById('btn-data-hoje');
    const btnOntem = document.getElementById('btn-data-ontem');
    const btnImprimir = document.getElementById('btn-imprimir-fechamento-dia');

    if (inputData) {
        inputData.value = dataSelecionadaRelatorio;
        inputData.onchange = (e) => {
            dataSelecionadaRelatorio = e.target.value;
            carregarRelatorioDataSelecionada();
        };
    }

    if (btnHoje) {
        btnHoje.onclick = () => {
            dataSelecionadaRelatorio = new Date().toISOString().split('T')[0];
            if (inputData) inputData.value = dataSelecionadaRelatorio;
            carregarRelatorioDataSelecionada();
        };
    }

    if (btnOntem) {
        btnOntem.onclick = () => {
            const ontem = new Date();
            ontem.setDate(ontem.getDate() - 1);
            dataSelecionadaRelatorio = ontem.toISOString().split('T')[0];
            if (inputData) inputData.value = dataSelecionadaRelatorio;
            carregarRelatorioDataSelecionada();
        };
    }

    if (btnImprimir) {
        btnImprimir.onclick = imprimirFechamentoDoDia;
    }
}

/**
 * 3. Busca vendas da data selecionada no Neon e calcula métricas
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
        tabelaCorpo.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto, #888); padding: 25px;">Consultando vendas do dia ${formatarDataBr(dataSelecionadaRelatorio)}...</td></tr>`;
    }

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (!sql) throw new Error("Conexão SQL não inicializada");

        const pedidos = await sql`
            SELECT * FROM pedidos 
            WHERE criado_em::date = ${dataSelecionadaRelatorio}::date
            ORDER BY id DESC;
        `;

        pedidosDoDiaAtual = pedidos || [];

        let totalFaturamento = 0;
        let totalPecas = 0;
        let totalPix = 0;
        let totalCredito = 0;
        let totalDebito = 0;
        let pedidosValidos = 0;

        pedidosDoDiaAtual.forEach(p => {
            const status = (p.status || '').toLowerCase();
            const totalPedido = Number(p.total || 0);

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

            if (status !== 'cancelado') {
                totalFaturamento += totalPedido;
                pedidosValidos++;

                arrayItens.forEach(i => {
                    totalPecas += parseInt(i.quantidade || 1, 10);
                });

                const pagLimpo = formaPag.toUpperCase();
                if (pagLimpo.includes('PIX')) totalPix += totalPedido;
                else if (pagLimpo.includes('CREDITO') || pagLimpo.includes('CRÉDITO')) totalCredito += totalPedido;
                else if (pagLimpo.includes('DEBITO') || pagLimpo.includes('DÉBITO')) totalDebito += totalPedido;
                else totalPix += totalPedido;
            }
        });

        const ticketMedio = pedidosValidos > 0 ? (totalFaturamento / pedidosValidos) : 0;

        if (elTotal) elTotal.innerText = totalFaturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (elQtdPedidos) elQtdPedidos.innerText = pedidosValidos;
        if (elPecas) elPecas.innerText = `${totalPecas} un`;
        if (elTicket) elTicket.innerText = ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        if (elPix) elPix.innerText = totalPix.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (elCredito) elCredito.innerText = totalCredito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (elDebito) elDebito.innerText = totalDebito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        if (!tabelaCorpo) return;

        if (pedidosDoDiaAtual.length === 0) {
            tabelaCorpo.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto, #888); padding: 30px;">Nenhuma venda registrada nesta data (${formatarDataBr(dataSelecionadaRelatorio)}).</td></tr>`;
            return;
        }

        tabelaCorpo.innerHTML = pedidosDoDiaAtual.map(p => {
            const hora = p.criado_em ? new Date(p.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
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

            return `
                <tr>
                    <td>
                        <strong style="color: var(--dourado, #d4af37);">#${p.id}</strong>
                        <small style="color: #777; display: block;">${hora}</small>
                    </td>
                    <td>${p.cliente_nome || 'Cliente'}</td>
                    <td style="color: #bbb; font-size: 12px;">${resumoPecas}</td>
                    <td><span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.06);">${formaPag}</span></td>
                    <td style="color: var(--dourado, #d4af37); font-weight: 700;">${totalFmt}</td>
                    <td><span style="font-size: 11px; color: ${p.status === 'Cancelado' ? '#ff4444' : '#4cd137'};">${p.status || 'Pendente'}</span></td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.error('Erro ao carregar relatório do dia:', e);
        if (tabelaCorpo) {
            tabelaCorpo.innerHTML = `<tr><td colspan="6" style="color: #ff5252; text-align: center; padding: 20px;">Falha ao carregar relatório: ${e.message}</td></tr>`;
        }
    }
}
window.carregarRelatorioDataSelecionada = carregarRelatorioDataSelecionada;

/**
 * 4. Emissão do Fechamento de Caixa para Impressão
 */
function imprimirFechamentoDoDia() {
    if (!pedidosDoDiaAtual || pedidosDoDiaAtual.length === 0) {
        alert('Não há vendas registradas nesta data para emitir fechamento.');
        return;
    }

    let faturamento = 0;
    let pix = 0;
    let credito = 0;
    let debito = 0;
    let totalPecas = 0;

    const linhas = pedidosDoDiaAtual.map(p => {
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

        if ((p.status || '').toLowerCase() !== 'cancelado') {
            faturamento += total;
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
                <td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: right;">${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            </tr>
        `;
    }).join('');

    const win = window.open('', '_blank', 'width=780,height=900');
    win.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Fechamento de Caixa - VR Modas - ${formatarDataBr(dataSelecionadaRelatorio)}</title>
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
                <div class="sub">Data: ${formatarDataBr(dataSelecionadaRelatorio)} | Emissão: ${new Date().toLocaleTimeString('pt-BR')}</div>

                <div class="totais">
                    <div><strong>Total Faturado no Dia:</strong> ${faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    <div><strong>Total de Pedidos:</strong> ${pedidosDoDiaAtual.length} | <strong>Total de Peças:</strong> ${totalPecas} un</div>
                    <hr style="border: 0; border-top: 1px dashed #ccc; margin: 8px 0;">
                    <div>• <strong>PIX:</strong> ${pix.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    <div>• <strong>Cartão de Crédito:</strong> ${credito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    <div>• <strong>Cartão de Débito:</strong> ${debito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                </div>

                <h3>Extrato de Vendas do Dia</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Pedido</th>
                            <th>Cliente</th>
                            <th>Pagamento</th>
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

document.addEventListener('DOMContentLoaded', () => {
    injetarEstruturaRelatorios();
});