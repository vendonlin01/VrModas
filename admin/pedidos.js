// ==========================================
// MÓDULO: PEDIDOS & COMPROVANTES PDF
// ==========================================
export function atualizarTabelaPedidos(onModificacao) {
    const listaPedidosAdmin = document.getElementById('lista-pedidos-admin');
    if (!listaPedidosAdmin) return;

    const pedidos = JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [];
    listaPedidosAdmin.innerHTML = '';

    if (pedidos.length === 0) {
        listaPedidosAdmin.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto); padding: 30px;">Nenhum pedido recebido até o momento.</td></tr>`;
        return;
    }

    pedidos.forEach(ped => {
        const totalFormatado = Number(ped.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        let resumoItens = ped.itens.map(it => `${it.quantidade}x ${it.nome} (${it.tamanho || 'Padrão'}/${it.cor || 'Padrão'})`).join('<br>');
        const nomeCli = ped.cliente?.nome || "Cliente";

        listaPedidosAdmin.insertAdjacentHTML('beforeend', `
            <tr>
                <td>
                    <strong style="color: var(--dourado);">${ped.codigo}</strong><br>
                    <small style="color: #aaa;">${nomeCli}</small>
                </td>
                <td style="font-size: 13px; color: var(--cinza-texto);">${ped.data}</td>
                <td style="font-size: 13px; line-height: 1.4;">${resumoItens}</td>
                <td style="font-weight: 700; color: var(--branco);">${totalFormatado}</td>
                <td>
                    <select class="select-status-pedido" data-id="${ped.id}" style="padding: 6px 10px; background: var(--preto); color: var(--branco); border: 1px solid #444; border-radius: 4px; font-size: 12px; cursor: pointer;">
                        <option value="Pendente" ${ped.status === 'Pendente' ? 'selected' : ''}>⏳ Pendente</option>
                        <option value="Pago" ${ped.status === 'Pago' ? 'selected' : ''}>✅ Pago</option>
                        <option value="Enviado" ${ped.status === 'Enviado' ? 'selected' : ''}>📦 Enviado</option>
                    </select>
                </td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn-imprimir-pedido" data-id="${ped.id}" style="background: var(--dourado); color: var(--preto); border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 700;" title="Gerar PDF">🖨️ PDF</button>
                        <button class="btn-excluir-pedido" data-id="${ped.id}" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 700;">🗑️</button>
                    </div>
                </td>
            </tr>
        `);
    });

    document.querySelectorAll('.select-status-pedido').forEach(sel => {
        sel.onchange = function() {
            const idPed = this.getAttribute('data-id');
            const novoStatus = this.value;
            let pedidosAtuais = JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [];
            const idx = pedidosAtuais.findIndex(p => String(p.id) === String(idPed));
            if (idx !== -1) {
                pedidosAtuais[idx].status = novoStatus;
                localStorage.setItem('vr_modas_pedidos', JSON.stringify(pedidosAtuais));
                if (typeof mostrarToast === 'function') mostrarToast(`Status: ${novoStatus}`);
                if (typeof onModificacao === 'function') onModificacao();
            }
        };
    });

    document.querySelectorAll('.btn-imprimir-pedido').forEach(btn => {
        btn.onclick = function() { imprimirComprovantePedido(this.getAttribute('data-id')); };
    });

    document.querySelectorAll('.btn-excluir-pedido').forEach(btn => {
        btn.onclick = function() {
            const idPed = this.getAttribute('data-id');
            if (confirm("Remover este pedido?")) {
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

function imprimirComprovantePedido(id) {
    const pedidos = JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [];
    const pedido = pedidos.find(p => String(p.id) === String(id));
    if (!pedido) return;

    const janela = window.open('', '_blank');
    const linhasItens = pedido.itens.map(it => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${it.nome} (Tam: ${it.tamanho} | Cor: ${it.cor})</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${it.quantidade}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">R$ ${it.preco.toFixed(2)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">R$ ${(it.preco * it.quantidade).toFixed(2)}</td>
        </tr>
    `).join('');

    janela.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Pedido ${pedido.codigo} - VR Modas</title>
            <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; margin: 30px; line-height: 1.5; }
                .topo { border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
                .titulo-vr { font-size: 26px; font-weight: 900; margin: 0; }
                .dados-pedido { margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 6px; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th { background: #eee; padding: 8px; text-align: left; font-size: 13px; }
                .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
                @media print { body { margin: 0; } button { display: none; } }
            </style>
        </head>
        <body>
            <div class="topo">
                <div>
                    <h1 class="titulo-vr">VR MODAS</h1>
                    <p style="margin: 0; font-size: 13px; color: #555;">Comprovativo de Pedido / Expedição</p>
                </div>
                <div style="text-align: right;">
                    <h2 style="margin: 0; color: #d4af37;">${pedido.codigo}</h2>
                    <span style="font-size: 12px; color: #777;">${pedido.data}</span>
                </div>
            </div>
            <div class="dados-pedido">
                <strong>Dados do Cliente:</strong><br>
                <span>Nome: ${pedido.cliente?.nome || 'Cliente'}</span><br>
                <span>Contato: ${pedido.cliente?.whatsapp || 'Não informado'}</span><br>
                <span>Entrega: ${pedido.cliente?.endereco || 'A combinar'}</span><br>
                <span>Status: <strong>${pedido.status}</strong></span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th style="text-align: center;">Qtd</th>
                        <th style="text-align: right;">Preço Unit.</th>
                        <th style="text-align: right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>${linhasItens}</tbody>
            </table>
            <div class="total">
                TOTAL: ${Number(pedido.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div style="margin-top: 40px; text-align: center;">
                <button onclick="window.print()" style="background: #111; color: #fff; border: none; padding: 10px 20px; font-size: 14px; font-weight: bold; cursor: pointer; border-radius: 4px;">🖨️ Imprimir / Guardar como PDF</button>
            </div>
            <script>window.onload = function() { setTimeout(() => window.print(), 500); };<\/script>
        </body>
        </html>
    `);
    janela.document.close();
}