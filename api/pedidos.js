// ==========================================
// MÓDULO: PEDIDOS & COMPROVANTES PDF (INTEGRADO À API)
// ==========================================

export async function carregarPedidosApi() {
    try {
        const resposta = await fetch('/api/pedidos');
        if (resposta.ok) {
            const pedidos = await resposta.json();
            localStorage.setItem('vr_modas_pedidos', JSON.stringify(pedidos));
            return pedidos;
        }
    } catch (e) {
        console.warn('Usando pedidos em cache local:', e);
    }
    return JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [];
}

export async function atualizarTabelaPedidos(onModificacao) {
    const listaPedidosAdmin = document.getElementById('lista-pedidos-admin');
    if (!listaPedidosAdmin) return;

    const pedidos = await carregarPedidosApi();
    listaPedidosAdmin.innerHTML = '';

    if (pedidos.length === 0) {
        listaPedidosAdmin.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto); padding: 30px;">Nenhum pedido recebido até o momento.</td></tr>`;
        return;
    }

    const coresStatus = {
        'Pendente': '#ffa726',
        'Pago': '#29b6f6',
        'Em Separação': '#ab47bc',
        'Enviado': '#ffb74d',
        'Concluído': '#66bb6a',
        'Cancelado': '#ef5350'
    };

    pedidos.forEach(ped => {
        const totalFormatado = Number(ped.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const itensArr = Array.isArray(ped.itens) ? ped.itens : [];
        const resumoItens = itensArr.map(it => `<strong>${it.quantidade}x</strong> ${it.nome} <small style="color:#888;">(${it.tamanho || 'Padrão'}/${it.cor || 'Padrão'})</small>`).join('<br>');
        const nomeCli = ped.cliente?.nome || ped.cliente_nome || "Cliente Visitante";
        const whatsCli = ped.cliente?.whatsapp || ped.cliente_whatsapp || "Não informado";
        const codigoFormatado = ped.codigo || `#VR-${ped.id}`;
        const dataFormatada = ped.data || (ped.criado_em ? new Date(ped.criado_em).toLocaleDateString('pt-BR') : 'Hoje');

        listaPedidosAdmin.insertAdjacentHTML('beforeend', `
            <tr>
                <td>
                    <strong style="color: var(--dourado);">${codigoFormatado}</strong><br>
                    <small style="color: #fff; font-weight: 600;">${nomeCli}</small><br>
                    <small style="color: #777;">📱 ${whatsCli}</small>
                </td>
                <td style="font-size: 12px; color: var(--cinza-texto); white-space: nowrap;">${dataFormatada}</td>
                <td style="font-size: 12.5px; line-height: 1.5;">${resumoItens}</td>
                <td style="font-weight: 700; color: var(--branco); font-size: 13.5px;">${totalFormatado}</td>
                <td>
                    <select class="select-status-pedido" data-id="${ped.id}" style="padding: 6px 8px; background: #141414; color: ${coresStatus[ped.status] || '#fff'}; border: 1px solid #444; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">
                        <option value="Pendente" ${ped.status === 'Pendente' ? 'selected' : ''}>⏳ Pendente</option>
                        <option value="Pago" ${ped.status === 'Pago' ? 'selected' : ''}>💳 Pago</option>
                        <option value="Em Separação" ${ped.status === 'Em Separação' ? 'selected' : ''}>📦 Em Separação</option>
                        <option value="Enviado" ${ped.status === 'Enviado' ? 'selected' : ''}>🚚 Enviado</option>
                        <option value="Concluído" ${ped.status === 'Concluído' ? 'selected' : ''}>✅ Concluído</option>
                        <option value="Cancelado" ${ped.status === 'Cancelado' ? 'selected' : ''}>❌ Cancelado</option>
                    </select>
                </td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button type="button" class="btn-imprimir-pedido" data-id="${ped.id}" style="background: var(--dourado); color: var(--preto); border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 700;" title="Gerar PDF">🖨️ PDF</button>
                        <button type="button" class="btn-excluir-pedido" data-id="${ped.id}" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 700;">🗑️</button>
                    </div>
                </td>
            </tr>
        `);
    });

    // 1. Atualização do status (Envia para API + Atualiza cache)
    listaPedidosAdmin.querySelectorAll('.select-status-pedido').forEach(sel => {
        sel.onchange = async function() {
            const idPed = this.getAttribute('data-id');
            const novoStatus = this.value;

            try {
                await fetch('/api/pedidos', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: idPed, status: novoStatus })
                });
            } catch (err) {
                console.warn('Erro ao atualizar status na API:', err);
            }

            let pedidosAtuais = JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [];
            const idx = pedidosAtuais.findIndex(p => String(p.id) === String(idPed));
            if (idx !== -1) {
                pedidosAtuais[idx].status = novoStatus;
                localStorage.setItem('vr_modas_pedidos', JSON.stringify(pedidosAtuais));
            }

            if (typeof mostrarToast === 'function') mostrarToast(`Status atualizado para: ${novoStatus}`);
            if (typeof onModificacao === 'function') onModificacao();
        };
    });

    // 2. Clique para PDF
    listaPedidosAdmin.querySelectorAll('.btn-imprimir-pedido').forEach(btn => {
        btn.onclick = function() { imprimirComprovantePedido(this.getAttribute('data-id')); };
    });

    // 3. Exclusão de Pedido (API + Cache)
    listaPedidosAdmin.querySelectorAll('.btn-excluir-pedido').forEach(btn => {
        btn.onclick = async function() {
            const idPed = this.getAttribute('data-id');
            if (confirm("Remover este pedido definitivamente?")) {
                try {
                    await fetch('/api/pedidos', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: idPed })
                    });
                } catch (err) {
                    console.warn('Erro ao excluir na API:', err);
                }

                let pedidosAtuais = JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [];
                pedidosAtuais = pedidosAtuais.filter(p => String(p.id) !== String(idPed));
                localStorage.setItem('vr_modas_pedidos', JSON.stringify(pedidosAtuais));

                if (typeof mostrarToast === 'function') mostrarToast("Pedido removido!");
                atualizarTabelaPedidos(onModificacao);
                if (typeof onModificacao === 'function') onModificacao();
            }
        };
    });
}

export function imprimirComprovantePedido(id) {
    const pedidos = JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [];
    const pedido = pedidos.find(p => String(p.id) === String(id));
    if (!pedido) return;

    const itensArr = Array.isArray(pedido.itens) ? pedido.itens : [];
    const linhasItens = itensArr.map(it => {
        const precoNum = Number(it.preco) || 0;
        const qtdNum = Number(it.quantidade) || 1;
        const subtotal = precoNum * qtdNum;

        return `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    <strong>${it.nome}</strong><br>
                    <small style="color: #666;">Tam: ${it.tamanho || 'Padrão'} | Cor: ${it.cor || 'Padrão'}</small>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${qtdNum}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${precoNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            </tr>
        `;
    }).join('');

    const nomeCli = pedido.cliente?.nome || pedido.cliente_nome || 'Cliente';
    const whatsCli = pedido.cliente?.whatsapp || pedido.cliente_whatsapp || 'Não informado';
    const endCli = pedido.cliente?.endereco || pedido.endereco_entrega || 'Retirada na Loja / A combinar';
    const codigoFormatado = pedido.codigo || `#VR-${pedido.id}`;
    const dataFormatada = pedido.data || (pedido.criado_em ? new Date(pedido.criado_em).toLocaleDateString('pt-BR') : 'Data não informada');
    const totalFormatado = Number(pedido.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const janela = window.open('', '_blank');
    janela.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Comprovante ${codigoFormatado} | VR Modas</title>
            <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; margin: 30px; line-height: 1.5; font-size: 13px; }
                .topo { border-bottom: 2px solid #000; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
                .titulo-vr { font-size: 24px; font-weight: 900; letter-spacing: 1px; margin: 0; }
                .dados-pedido { background: #fafafa; border: 1px solid #eaeaea; padding: 14px 18px; border-radius: 6px; margin-bottom: 20px; }
                .linha-dado { margin-bottom: 6px; }
                .rotulo { font-weight: 700; color: #444; font-size: 11px; text-transform: uppercase; display: inline-block; width: 140px; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th { background: #f0f0f0; padding: 9px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #333; }
                .total-box { margin-top: 25px; text-align: right; padding: 14px; background: #fafafa; border-radius: 6px; border: 1px solid #eaeaea; }
                .total-destaque { font-size: 19px; font-weight: 900; color: #000; }
                @media print { body { margin: 15px; } button { display: none; } }
            </style>
        </head>
        <body>
            <div class="topo">
                <div>
                    <h1 class="titulo-vr">VR MODAS</h1>
                    <p style="margin: 0; font-size: 12px; color: #666;">Comprovante do Pedido / Expedição</p>
                </div>
                <div style="text-align: right;">
                    <h2 style="margin: 0; color: #d4af37; font-size: 18px;">${codigoFormatado}</h2>
                    <span style="font-size: 11px; color: #777;">${dataFormatada}</span>
                </div>
            </div>

            <div class="dados-pedido">
                <div class="linha-dado"><span class="rotulo">Cliente:</span> <strong>${nomeCli}</strong></div>
                <div class="linha-dado"><span class="rotulo">Contato:</span> ${whatsCli}</div>
                <div class="linha-dado"><span class="rotulo">Forma de Envio:</span> <strong>${endCli}</strong></div>
                <div class="linha-dado"><span class="rotulo">Pagamento:</span> ${pedido.formaPagamento || pedido.forma_pagamento || 'Pix'}</div>
                <div class="linha-dado"><span class="rotulo">Status:</span> <strong>${pedido.status}</strong></div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Produto / Variação</th>
                        <th style="text-align: center;">Qtd</th>
                        <th style="text-align: right;">Valor Unit.</th>
                        <th style="text-align: right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>${linhasItens}</tbody>
            </table>

            <div class="total-box">
                <span style="font-size: 12px; color: #666;">Total Geral:</span><br>
                <span class="total-destaque">${totalFormatado}</span>
            </div>

            <div style="margin-top: 35px; text-align: center;">
                <button onclick="window.print()" style="background: #111; color: #fff; border: none; padding: 10px 22px; font-size: 13px; font-weight: bold; cursor: pointer; border-radius: 4px;">🖨️ Imprimir / Guardar como PDF</button>
            </div>
        </body>
        </html>
    `);
    janela.document.close();
}