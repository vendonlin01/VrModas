/* =====================================================
   SACOLA, PERSISTÊNCIA, ALERTA DE PAGAMENTO & CHECKOUT - VR MODAS
   ===================================================== */

const CHAVE_SACOLA_STORAGE = 'vr_modas_sacola_itens';

function escaparHtmlSacola(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function urlImagemSeguraSacola(src) {
    const val = String(src || '').trim();
    if (!val) return 'img/produto1.jpg';
    if (
        val.startsWith('data:image/png;base64,') ||
        val.startsWith('data:image/jpeg;base64,') ||
        val.startsWith('data:image/webp;base64,')
    ) {
        return val;
    }
    if (/^(https?:\/\/|\/|\.\/|img\/)/i.test(val)) {
        return escaparHtmlSacola(val);
    }
    return 'img/produto1.jpg';
}

function carregarItensSacolaStorage() {
    try {
        const raw = localStorage.getItem(CHAVE_SACOLA_STORAGE);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

function salvarItensSacolaStorage(itens) {
    try {
        localStorage.setItem(CHAVE_SACOLA_STORAGE, JSON.stringify(itens || []));
    } catch (e) {
        console.warn('Não foi possível salvar sacola localmente:', e.message);
    }
}

function obterConfigCheckoutLoja() {
    let salvo = {};
    try {
        salvo = JSON.parse(localStorage.getItem('vr_modas_config') || '{}');
    } catch {
        salvo = {};
    }

    const permitirEntrega = salvo.permitirEntrega !== undefined ? Boolean(salvo.permitirEntrega) : true;
    const permitirRetirada = salvo.permitirRetirada !== undefined ? Boolean(salvo.permitirRetirada) : true;

    const pagPix = salvo.pagPix !== undefined ? Boolean(salvo.pagPix) : true;
    const pagCredito = salvo.pagCredito !== undefined ? Boolean(salvo.pagCredito) : true;
    const pagDebito = salvo.pagDebito !== undefined ? Boolean(salvo.pagDebito) : true;

    return {
        whatsapp: String(salvo.whatsapp || '').replace(/\D/g, ''),
        email: String(salvo.email || ''),
        permitirEntrega: (!permitirEntrega && !permitirRetirada) ? true : permitirEntrega,
        permitirRetirada,
        enderecoLoja: String(salvo.enderecoLoja || '').trim(),
        pagPix: (!pagPix && !pagCredito && !pagDebito) ? true : pagPix,
        pagCredito,
        pagDebito,
        pixChave: String(salvo.pixChave || '').trim(),
        pixTitular: String(salvo.pixTitular || '').trim(),
        pixBanco: String(salvo.pixBanco || '').trim(),
        linkCartao: String(salvo.linkCartao || '').trim(),
        instrucoesPagamento: String(salvo.instrucoesPagamento || '').trim()
    };
}

async function sincronizarConfigCheckoutNeon() {
    try {
        const sql = (typeof window.getSql === 'function') ? await window.getSql() : window.sql;
        if (!sql) return;

        const configs = await sql`SELECT chave, valor FROM configuracoes;`;
        if (Array.isArray(configs) && configs.length > 0) {
            const mapa = {};
            configs.forEach(c => { mapa[c.chave] = c.valor; });

            const anterior = JSON.parse(localStorage.getItem('vr_modas_config') || '{}');
            const atualizada = {
                whatsapp: (mapa['whatsapp'] || anterior.whatsapp || '').replace(/\D/g, ''),
                email: mapa['email'] || anterior.email || '',
                permitirEntrega: mapa['permitir_entrega'] !== undefined ? mapa['permitir_entrega'] === 'true' : (anterior.permitirEntrega ?? true),
                permitirRetirada: mapa['permitir_retirada'] !== undefined ? mapa['permitir_retirada'] === 'true' : (anterior.permitirRetirada ?? true),
                enderecoLoja: mapa['endereco_loja'] ?? anterior.enderecoLoja ?? '',
                pagPix: mapa['pag_pix'] !== undefined ? mapa['pag_pix'] === 'true' : (anterior.pagPix ?? true),
                pagCredito: mapa['pag_credito'] !== undefined ? mapa['pag_credito'] === 'true' : (anterior.pagCredito ?? true),
                pagDebito: mapa['pag_debito'] !== undefined ? mapa['pag_debito'] === 'true' : (anterior.pagDebito ?? true),
                pixChave: mapa['pix_chave'] ?? anterior.pixChave ?? '',
                pixTitular: mapa['pix_titular'] ?? anterior.pixTitular ?? '',
                pixBanco: mapa['pix_banco'] ?? anterior.pixBanco ?? '',
                linkCartao: mapa['link_cartao'] ?? anterior.linkCartao ?? '',
                instrucoesPagamento: mapa['instrucoes_pagamento'] ?? anterior.instrucoesPagamento ?? ''
            };
            localStorage.setItem('vr_modas_config', JSON.stringify(atualizada));
        }
    } catch (e) {
        console.warn('Usando configurações locais de checkout:', e.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const carrinhoLateral = document.getElementById('carrinho-lateral');
    const btnAbrirCarrinho = document.getElementById('abrir-carrinho');
    const btnFecharCarrinho = document.getElementById('fechar-carrinho');
    const listaItens = document.getElementById('lista-itens');

    let totalCarrinho = 0;
    let qtdItensCarrinho = 0;
    let itensNoCarrinhoData = carregarItensSacolaStorage();

    let metodoPagamentoSelecionado = 'pix';
    let cupomAtivo = null;
    let tipoEnvioSelecionado = 'entrega';

    if (btnAbrirCarrinho) {
        btnAbrirCarrinho.onclick = async () => {
            itensNoCarrinhoData = carregarItensSacolaStorage();
            renderizarSacola();
            if (carrinhoLateral) carrinhoLateral.classList.add('aberto');
            await sincronizarConfigCheckoutNeon();
            renderizarSacola();
        };
    }
    if (btnFecharCarrinho && carrinhoLateral) {
        btnFecharCarrinho.onclick = () => carrinhoLateral.classList.remove('aberto');
    }

    sincronizarConfigCheckoutNeon();

    async function obterSqlSacolaSeguro() {
        if (typeof window.getSql === 'function') {
            const s = await window.getSql();
            if (s) return s;
        }
        if (window.sql) return window.sql;
        return null;
    }

    function obterClienteAtual() {
        try {
            return JSON.parse(sessionStorage.getItem('vr_usuario_ativo')) ||
                JSON.parse(localStorage.getItem('vr_usuario_ativo')) ||
                JSON.parse(sessionStorage.getItem('vr_cliente_dados')) ||
                JSON.parse(localStorage.getItem('vr_cliente_dados')) ||
                null;
        } catch {
            return null;
        }
    }

    function limparTextoCor(corRaw) {
        if (!corRaw) return 'Padrão';
        if (typeof corRaw === 'object' && corRaw !== null) {
            return String(corRaw.nome || corRaw.cor || 'Padrão').trim();
        }
        if (typeof corRaw === 'string') {
            const trimmed = corRaw.trim();
            if (trimmed === '[object Object]') return 'Padrão';
            if (trimmed.startsWith('{')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    return String(parsed.nome || parsed.cor || 'Padrão').trim();
                } catch {
                    return 'Padrão';
                }
            }
            return trimmed;
        }
        return String(corRaw);
    }

    function formatarEnderecoParaTexto(end) {
        if (!end) return '';
        let obj = end;

        if (typeof end === 'string') {
            const trimmed = end.trim();
            if (trimmed.startsWith('{')) {
                try {
                    obj = JSON.parse(trimmed);
                } catch {
                    return trimmed;
                }
            } else {
                return trimmed;
            }
        }

        if (typeof obj === 'object' && obj !== null) {
            if (obj.enderecoFormatado) return String(obj.enderecoFormatado);
            const rua = obj.rua || obj.logradouro || '';
            const num = obj.numero || 'S/N';
            const bairro = obj.bairro || '';
            const cidade = obj.cidade || '';
            const cep = obj.cep ? `(CEP: ${obj.cep})` : '';
            const partes = [rua ? `${rua}, Nº ${num}` : '', bairro, cidade, cep].filter(p => String(p).trim() !== '');
            return partes.length > 0 ? partes.join(' - ') : '';
        }

        return '';
    }

    let clienteAtual = obterClienteAtual();
    let enderecoEntregaCustom = clienteAtual && clienteAtual.endereco ? formatarEnderecoParaTexto(clienteAtual.endereco) : '';

    function renderizarSacola() {
        salvarItensSacolaStorage(itensNoCarrinhoData);

        if (!listaItens) {
            const qtdTotal = itensNoCarrinhoData.reduce((acc, it) => acc + (parseInt(it.quantidade, 10) || 1), 0);
            const valTotal = itensNoCarrinhoData.reduce((acc, it) => acc + ((Number(it.preco) || 0) * (parseInt(it.quantidade, 10) || 1)), 0);
            atualizarContadores(qtdTotal, valTotal);
            return;
        }

        listaItens.innerHTML = '';
        totalCarrinho = 0;
        qtdItensCarrinho = 0;

        if (itensNoCarrinhoData.length === 0) {
            listaItens.innerHTML = '<p style="color: var(--cinza-texto, #aaa); text-align: center; padding: 40px 10px;">Sua sacola está vazia.</p>';
            const blocoExistente = document.getElementById('bloco-pagamento-sacola');
            if (blocoExistente) blocoExistente.remove();
            cupomAtivo = null;
            atualizarContadores(0, 0);
            return;
        }

        itensNoCarrinhoData.forEach(item => {
            item.cor = limparTextoCor(item.cor);
            const qtdNum = Math.max(1, parseInt(item.quantidade, 10) || 1);
            const precoNum = Math.max(0, Number(item.preco) || 0);
            const subtotal = precoNum * qtdNum;
            totalCarrinho += subtotal;
            qtdItensCarrinho += qtdNum;

            const idRefSeguro = escaparHtmlSacola(item.idRef);
            const nomeSeguro = escaparHtmlSacola(item.nome);
            const tamSeguro = escaparHtmlSacola(item.tamanho);
            const corSegura = escaparHtmlSacola(item.cor);
            const imgSegura = urlImagemSeguraSacola(item.imagem);

            listaItens.insertAdjacentHTML('beforeend', `
                <div class="item-na-sacola" data-idref="${idRefSeguro}" style="display: flex; gap: 12px; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #222;">
                    <img src="${imgSegura}" alt="${nomeSeguro}" style="width: 55px; height: 55px; object-fit: cover; border-radius: 6px; border: 1px solid #333; flex-shrink: 0;" onerror="this.src='img/produto1.jpg'">

                    <div class="item-info" style="flex: 1; min-width: 0;">
                        <h4 style="font-size: 13px; margin: 0 0 3px 0; color: var(--branco, #fff); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${nomeSeguro}</h4>
                        <small style="color: var(--cinza-texto, #aaa); display: block; margin-bottom: 4px; font-size: 11px;">Tam: ${tamSeguro} | Cor: ${corSegura}</small>
                        <p style="color: var(--dourado, #d4af37); font-weight: bold; margin: 0; font-size: 13px;">${subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>

                    <div style="display: flex; align-items: center; gap: 6px; background: #141414; padding: 3px 6px; border-radius: 4px; border: 1px solid #333; flex-shrink: 0;">
                        <button type="button" class="btn-sacola-qtd btn-sacola-menos" data-idref="${idRefSeguro}" style="background: none; border: none; color: #fff; font-size: 13px; cursor: pointer; padding: 0 3px; font-weight: bold;">-</button>
                        <span style="font-size: 12px; font-weight: bold; min-width: 12px; text-align: center;">${qtdNum}</span>
                        <button type="button" class="btn-sacola-qtd btn-sacola-mais" data-idref="${idRefSeguro}" style="background: none; border: none; color: #fff; font-size: 13px; cursor: pointer; padding: 0 3px; font-weight: bold;">+</button>
                    </div>

                    <button type="button" class="btn-remover" data-idref="${idRefSeguro}" style="background: none; color: #ff4444; border: none; cursor: pointer; font-size: 15px; padding: 4px; flex-shrink: 0;" title="Remover item">✕</button>
                </div>
            `);
        });

        atualizarContadores(qtdItensCarrinho, totalCarrinho);
        renderizarOpcoesPagamento();
    }

    function renderizarOpcoesPagamento() {
        const containerTotal = document.querySelector('.carrinho-footer');
        if (!containerTotal || itensNoCarrinhoData.length === 0) return;

        const blocoExistente = document.getElementById('bloco-pagamento-sacola');
        if (blocoExistente) blocoExistente.remove();

        const cfg = obterConfigCheckoutLoja();

        if (tipoEnvioSelecionado === 'entrega' && !cfg.permitirEntrega && cfg.permitirRetirada) {
            tipoEnvioSelecionado = 'retirada';
        } else if (tipoEnvioSelecionado === 'retirada' && !cfg.permitirRetirada && cfg.permitirEntrega) {
            tipoEnvioSelecionado = 'entrega';
        }

        const metodosPermitidos = [];
        if (cfg.pagPix) metodosPermitidos.push({ id: 'pix', label: '💠 Pix' });
        if (cfg.pagCredito) metodosPermitidos.push({ id: 'credito', label: '💳 Crédito' });
        if (cfg.pagDebito) metodosPermitidos.push({ id: 'debito', label: '💳 Débito' });

        if (!metodosPermitidos.some(m => m.id === metodoPagamentoSelecionado)) {
            metodoPagamentoSelecionado = metodosPermitidos[0].id;
        }

        let valorDesconto = 0;
        if (cupomAtivo) {
            const valCupom = Number(cupomAtivo.valor) || 0;
            valorDesconto = (cupomAtivo.tipo === 'porcentagem') ? (totalCarrinho * valCupom) / 100 : valCupom;
        }
        const totalFinalCalculado = Math.max(0, totalCarrinho - valorDesconto);

        clienteAtual = obterClienteAtual();
        if (!enderecoEntregaCustom && clienteAtual && clienteAtual.endereco) {
            enderecoEntregaCustom = formatarEnderecoParaTexto(clienteAtual.endereco);
        }

        const enderecoExibicao = escaparHtmlSacola(enderecoEntregaCustom || 'Nenhum endereço cadastrado');
        const nomeClienteExibicao = escaparHtmlSacola(clienteAtual ? clienteAtual.nome : 'Visitante');
        const cupomCodigoSeguro = cupomAtivo ? escaparHtmlSacola(cupomAtivo.codigo) : '';
        const enderecoLojaSeguro = escaparHtmlSacola(cfg.enderecoLoja || 'Retirada diretamente no ponto físico da VR Modas.');

        const botoesEnvioHtml = [
            cfg.permitirEntrega
                ? `<button type="button" id="btn-opcao-entrega" style="flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 4px; border: 1px solid #333; background: ${tipoEnvioSelecionado === 'entrega' ? 'var(--dourado, #d4af37)' : '#1a1a1a'}; color: ${tipoEnvioSelecionado === 'entrega' ? '#000' : '#fff'}; cursor: pointer;">🏠 Receber em Casa</button>`
                : '',
            cfg.permitirRetirada
                ? `<button type="button" id="btn-opcao-retirada" style="flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 4px; border: 1px solid #333; background: ${tipoEnvioSelecionado === 'retirada' ? 'var(--dourado, #d4af37)' : '#1a1a1a'}; color: ${tipoEnvioSelecionado === 'retirada' ? '#000' : '#fff'}; cursor: pointer;">🏬 Retirar na Loja</button>`
                : ''
        ].filter(Boolean).join('');

        const botoesPagamentoHtml = metodosPermitidos.map(m => `
            <button type="button" class="btn-metodo-pag ${metodoPagamentoSelecionado === m.id ? 'ativo' : ''}" data-metodo="${m.id}" style="flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 4px; border: 1px solid #333; background: ${metodoPagamentoSelecionado === m.id ? 'var(--dourado, #d4af37)' : '#1a1a1a'}; color: ${metodoPagamentoSelecionado === m.id ? '#000' : '#fff'}; cursor: pointer;">${m.label}</button>
        `).join('');

        // ALERTA DE PAGAMENTO DINÂMICO NA SACOLA
        let resumoContaHtml = '';
        if (metodoPagamentoSelecionado === 'pix') {
            resumoContaHtml = `
                <div style="background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.35); border-radius: 6px; padding: 8px 10px; margin-top: 6px; font-size: 11px; color: #ddd; line-height: 1.4;">
                    <div style="color: var(--dourado, #d4af37); font-weight: 700; margin-bottom: 2px;">💠 Pagamento via Pix</div>
                    ${cfg.pixChave
                        ? `<div><strong>Chave Pix:</strong> <span style="color: #fff;">${escaparHtmlSacola(cfg.pixChave)}</span></div>
                           ${cfg.pixTitular ? `<div><strong>Titular:</strong> ${escaparHtmlSacola(cfg.pixTitular)}${cfg.pixBanco ? ` • ${escaparHtmlSacola(cfg.pixBanco)}` : ''}</div>` : ''}`
                        : `<div>A chave Pix da loja será exibida assim que você finalizar o pedido.</div>`
                    }
                    ${cfg.instrucoesPagamento ? `<div style="color: #aaa; margin-top: 3px;">${escaparHtmlSacola(cfg.instrucoesPagamento)}</div>` : ''}
                </div>
            `;
        } else if (metodoPagamentoSelecionado === 'credito') {
            resumoContaHtml = `
                <div style="background: rgba(79,195,247,0.08); border: 1px solid rgba(79,195,247,0.35); border-radius: 6px; padding: 8px 10px; margin-top: 6px; font-size: 11px; color: #ddd; line-height: 1.4;">
                    <div style="color: #4fc3f7; font-weight: 700; margin-bottom: 2px;">💳 Cartão de Crédito</div>
                    <div>${cfg.linkCartao ? 'Após concluir o pedido, você receberá o link seguro para pagar no cartão.' : (tipoEnvioSelecionado === 'retirada' ? 'Pagamento na maquininha no momento da retirada na loja.' : 'Pagamento na maquininha no momento da entrega.')}</div>
                    ${cfg.instrucoesPagamento ? `<div style="color: #aaa; margin-top: 3px;">${escaparHtmlSacola(cfg.instrucoesPagamento)}</div>` : ''}
                </div>
            `;
        } else if (metodoPagamentoSelecionado === 'debito') {
            resumoContaHtml = `
                <div style="background: rgba(76,175,80,0.08); border: 1px solid rgba(76,175,80,0.35); border-radius: 6px; padding: 8px 10px; margin-top: 6px; font-size: 11px; color: #ddd; line-height: 1.4;">
                    <div style="color: #66bb6a; font-weight: 700; margin-bottom: 2px;">💳 Cartão de Débito</div>
                    <div>${tipoEnvioSelecionado === 'retirada' ? 'Pagamento no débito na maquininha ao retirar na loja.' : 'Pagamento no débito na maquininha no ato da entrega.'}</div>
                    ${cfg.instrucoesPagamento ? `<div style="color: #aaa; margin-top: 3px;">${escaparHtmlSacola(cfg.instrucoesPagamento)}</div>` : ''}
                </div>
            `;
        }

        const htmlPagamento = `
            <div id="bloco-pagamento-sacola" style="background: #111; padding: 12px; border-radius: 8px; border: 1px solid #2a2a2a; margin-bottom: 12px;">
                
                <label style="font-size: 11px; text-transform: uppercase; color: var(--dourado, #d4af37); font-weight: 700; display: block; margin-bottom: 8px;">Como deseja receber seu pedido?</label>
                <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                    ${botoesEnvioHtml}
                </div>

                ${cfg.permitirEntrega ? `
                <div id="painel-endereco-casa" style="display: ${tipoEnvioSelecionado === 'entrega' ? 'block' : 'none'}; background: #161616; padding: 10px; border-radius: 6px; border: 1px solid #292929; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-size: 11px; font-weight: 700; color: var(--dourado, #d4af37); text-transform: uppercase;">📍 Endereço de Entrega</span>
                        <button type="button" id="btn-editar-endereco-sacola" style="background: none; border: none; color: #4fc3f7; font-size: 11px; cursor: pointer; text-decoration: underline;">Alterar</button>
                    </div>
                    <p id="texto-endereco-sacola" style="font-size: 11px; color: #ccc; margin: 0; line-height: 1.4;">${enderecoExibicao}</p>
                    <small style="font-size: 10px; color: #777;">Destinatário: ${nomeClienteExibicao}</small>

                    <div id="form-alterar-endereco" style="display: none; margin-top: 8px; border-top: 1px dashed #333; padding-top: 8px;">
                        <input type="text" id="input-novo-endereco" placeholder="Rua, Nº, Bairro, Cidade (CEP)" value="${escaparHtmlSacola(enderecoEntregaCustom)}" style="width: 100%; box-sizing: border-box; background: #0a0a0a; border: 1px solid #333; color: #fff; padding: 7px; border-radius: 4px; font-size: 11px; margin-bottom: 6px;">
                        <div style="display: flex; gap: 6px;">
                            <button type="button" id="btn-salvar-novo-endereco" style="flex: 1; background: var(--dourado, #d4af37); color: #000; border: none; padding: 6px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer;">Salvar</button>
                            <button type="button" id="btn-cancelar-novo-endereco" style="background: #333; color: #fff; border: none; padding: 6px 10px; border-radius: 4px; font-size: 11px; cursor: pointer;">Cancelar</button>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${cfg.permitirRetirada ? `
                <div id="painel-aviso-retirada" style="display: ${tipoEnvioSelecionado === 'retirada' ? 'block' : 'none'}; background: #161616; padding: 10px; border-radius: 6px; border: 1px solid #292929; margin-bottom: 10px;">
                    <span style="font-size: 11px; font-weight: 700; color: var(--dourado, #d4af37);">🏬 Retirada Gratuita na Loja</span>
                    <p style="font-size: 11px; color: #bbb; margin: 4px 0 0 0; line-height: 1.4;">${enderecoLojaSeguro}</p>
                </div>
                ` : ''}

                <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                    <input type="text" id="input-cupom-sacola" placeholder="Cupom de desconto" value="${cupomCodigoSeguro}" style="flex: 1; background: #0a0a0a; border: 1px solid #333; color: #fff; padding: 7px 10px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">
                    <button type="button" id="btn-aplicar-cupom-sacola" style="background: var(--dourado, #d4af37); color: #000; border: none; padding: 7px 12px; border-radius: 4px; font-weight: 700; font-size: 11px; cursor: pointer;">Aplicar</button>
                </div>
                ${cupomAtivo ? `<div style="color: #4caf50; font-size: 11px; margin-bottom: 8px; font-weight: 700;">✓ Cupom ${cupomCodigoSeguro} aplicado (-R$ ${valorDesconto.toFixed(2)})</div>` : ''}

                <label style="font-size: 11px; text-transform: uppercase; color: var(--dourado, #d4af37); font-weight: 700; display: block; margin-bottom: 8px;">Forma de Pagamento</label>
                <div style="display: flex; gap: 6px;">
                    ${botoesPagamentoHtml}
                </div>
                ${resumoContaHtml}
            </div>
        `;

        const totalElement = containerTotal.querySelector('.carrinho-total');
        if (totalElement) totalElement.insertAdjacentHTML('beforebegin', htmlPagamento);

        const valorEl = document.getElementById('valor-total');
        if (valorEl) valorEl.innerText = totalFinalCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const btnOptEntrega = document.getElementById('btn-opcao-entrega');
        const btnOptRetirada = document.getElementById('btn-opcao-retirada');
        if (btnOptEntrega) {
            btnOptEntrega.onclick = () => { tipoEnvioSelecionado = 'entrega'; renderizarOpcoesPagamento(); };
        }
        if (btnOptRetirada) {
            btnOptRetirada.onclick = () => { tipoEnvioSelecionado = 'retirada'; renderizarOpcoesPagamento(); };
        }

        const btnEditarEnd = document.getElementById('btn-editar-endereco-sacola');
        const formAltEnd = document.getElementById('form-alterar-endereco');
        const inputNovoEnd = document.getElementById('input-novo-endereco');
        if (btnEditarEnd && formAltEnd) {
            btnEditarEnd.onclick = () => { formAltEnd.style.display = 'block'; inputNovoEnd?.focus(); };
        }
        if (document.getElementById('btn-cancelar-novo-endereco')) {
            document.getElementById('btn-cancelar-novo-endereco').onclick = () => { formAltEnd.style.display = 'none'; };
        }
        if (document.getElementById('btn-salvar-novo-endereco')) {
            document.getElementById('btn-salvar-novo-endereco').onclick = () => {
                enderecoEntregaCustom = inputNovoEnd.value.trim().slice(0, 300) || 'A combinar na entrega';
                formAltEnd.style.display = 'none';
                const txtEnd = document.getElementById('texto-endereco-sacola');
                if (txtEnd) txtEnd.innerText = enderecoEntregaCustom;
                if (typeof mostrarToast === 'function') mostrarToast("Endereço atualizado!");
            };
        }

        const btnCupom = document.getElementById('btn-aplicar-cupom-sacola');
        if (btnCupom) {
            btnCupom.onclick = async function () {
                const codDigitado = document.getElementById('input-cupom-sacola').value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
                if (!codDigitado) {
                    alert("Digite o código do cupom.");
                    return;
                }

                btnCupom.disabled = true;
                btnCupom.innerText = "...";

                try {
                    const sql = await obterSqlSacolaSeguro();
                    let cupomAchado = null;

                    if (sql) {
                        const resCupom = await sql`
                            SELECT * FROM cupons 
                            WHERE UPPER(codigo) = ${codDigitado} AND ativo = true 
                            LIMIT 1;
                        `;
                        if (Array.isArray(resCupom) && resCupom.length > 0) {
                            cupomAchado = {
                                id: resCupom[0].id,
                                codigo: resCupom[0].codigo,
                                tipo: resCupom[0].tipo,
                                valor: parseFloat(resCupom[0].valor)
                            };
                        }
                    }

                    if (!cupomAchado) {
                        const cuponsLocais = JSON.parse(localStorage.getItem('vr_modas_cupons')) || [];
                        cupomAchado = cuponsLocais.find(c => String(c.codigo).toUpperCase() === codDigitado);
                    }

                    if (cupomAchado) {
                        cupomAtivo = cupomAchado;
                        if (typeof mostrarToast === 'function') mostrarToast(`Cupom ${cupomAchado.codigo} aplicado!`);
                        renderizarOpcoesPagamento();
                    } else {
                        alert("Cupom inválido ou expirado.");
                    }
                } catch (err) {
                    console.error("Erro ao validar cupom:", err);
                    alert("Erro ao verificar cupom. Tente novamente.");
                } finally {
                    if (btnCupom) {
                        btnCupom.disabled = false;
                        btnCupom.innerText = "Aplicar";
                    }
                }
            };
        }

        document.querySelectorAll('.btn-metodo-pag').forEach(btn => {
            btn.onclick = function () {
                metodoPagamentoSelecionado = this.getAttribute('data-metodo');
                renderizarOpcoesPagamento();
            };
        });
    }

    function atualizarContadores(qtd, total) {
        document.querySelectorAll('.contador-carrinho').forEach(el => el.innerText = qtd);
        const valorEl = document.getElementById('valor-total');
        if (valorEl) valorEl.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    const btnAdicionarSacola = document.getElementById('btn-adicionar-sacola');
    if (btnAdicionarSacola) {
        btnAdicionarSacola.onclick = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const produtoIdNaUrl = urlParams.get('id');
            let produtosAtuais = [];
            try {
                produtosAtuais = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
            } catch {
                produtosAtuais = [];
            }

            let prodRef = null;
            if (produtoIdNaUrl) {
                prodRef = produtosAtuais.find(p => String(p.id).trim() === String(produtoIdNaUrl).trim());
            }
            if (!prodRef && produtosAtuais.length > 0) {
                prodRef = produtosAtuais[0];
            }

            if (!prodRef || !prodRef.id) {
                alert("Não foi possível identificar o produto. Atualize a página e tente novamente.");
                return;
            }

            const estoqueMax = Math.max(0, parseInt(prodRef.estoque || 10, 10));
            if (estoqueMax <= 0) {
                alert("Este produto está esgotado no momento.");
                return;
            }

            const nomeStr = document.getElementById('detalhe-nome')?.innerText || prodRef.nome || 'Peça VR Modas';
            const tamSelecionado = document.querySelector('input[name="tamanho"]:checked')?.value || 'Padrão';
            const corBruta = document.querySelector('input[name="cor"]:checked')?.value || 'Padrão';
            const corSelecionada = limparTextoCor(corBruta);

            let precoCobrado = Number(prodRef.preco || 0);
            if (prodRef.precoPromocional && Number(prodRef.precoPromocional) < Number(prodRef.preco)) {
                precoCobrado = Number(prodRef.precoPromocional);
            }

            const imgEl = document.getElementById('detalhe-img');
            const fotoAtual = imgEl ? imgEl.src : (prodRef.imagem || 'img/produto1.jpg');

            const inputQtd = document.getElementById('qtd-produto');
            let qtd = parseInt(inputQtd?.value || inputQtd?.innerText || '1', 10);
            if (isNaN(qtd) || qtd < 1) qtd = 1;
            if (qtd > estoqueMax) qtd = estoqueMax;

            const itemExistente = itensNoCarrinhoData.find(it =>
                String(it.idProduto) === String(prodRef.id) &&
                it.tamanho === tamSelecionado &&
                it.cor === corSelecionada
            );

            if (itemExistente) {
                if (itemExistente.quantidade + qtd <= estoqueMax) {
                    itemExistente.quantidade += qtd;
                } else {
                    itemExistente.quantidade = estoqueMax;
                    alert(`Quantidade ajustada para o estoque máximo disponível (${estoqueMax} un).`);
                }
            } else {
                itensNoCarrinhoData.push({
                    idRef: Date.now(),
                    idProduto: prodRef.id,
                    nome: nomeStr,
                    preco: precoCobrado,
                    quantidade: qtd,
                    estoqueMax: estoqueMax,
                    tamanho: tamSelecionado,
                    cor: corSelecionada,
                    imagem: fotoAtual
                });
            }

            renderizarSacola();
            if (carrinhoLateral) carrinhoLateral.classList.add('aberto');
            if (typeof mostrarToast === 'function') mostrarToast("Peça adicionada à sua sacola!");
        };
    }

    if (listaItens) {
        listaItens.onclick = (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const idRef = btn.getAttribute('data-idref');
            const item = itensNoCarrinhoData.find(it => String(it.idRef) === String(idRef));
            if (!item) return;

            if (btn.classList.contains('btn-sacola-mais')) {
                if (item.quantidade < item.estoqueMax) {
                    item.quantidade += 1;
                    renderizarSacola();
                } else {
                    alert(`Não é possível adicionar mais unidades. Estoque disponível: ${item.estoqueMax}.`);
                }
            } else if (btn.classList.contains('btn-sacola-menos')) {
                if (item.quantidade > 1) {
                    item.quantidade -= 1;
                } else {
                    itensNoCarrinhoData = itensNoCarrinhoData.filter(it => String(it.idRef) !== String(idRef));
                }
                renderizarSacola();
            } else if (btn.classList.contains('btn-remover')) {
                itensNoCarrinhoData = itensNoCarrinhoData.filter(it => String(it.idRef) !== String(idRef));
                renderizarSacola();
            }
        };
    }

    function exibirConfirmacaoNoSite(pedido) {
        const cfg = obterConfigCheckoutLoja();
        let modal = document.getElementById('modal-pedido-sucesso');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-pedido-sucesso';
            modal.style.cssText = `
                position: fixed; inset: 0; background: rgba(0,0,0,0.85);
                display: flex; align-items: center; justify-content: center;
                z-index: 10000; padding: 15px; backdrop-filter: blur(4px);
            `;
            document.body.appendChild(modal);
        }

        const itensHtml = (pedido.itens || []).map(i => {
            const qtdNum = Math.max(1, parseInt(i.quantidade, 10) || 1);
            const precoNum = Math.max(0, Number(i.preco) || 0);
            return `
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; color:#ccc;">
                    <span>${qtdNum}x ${escaparHtmlSacola(i.nome)} (${escaparHtmlSacola(i.tamanho)} / ${escaparHtmlSacola(limparTextoCor(i.cor))})</span>
                    <span style="color:var(--dourado, #d4af37); font-weight:bold;">${(precoNum * qtdNum).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
            `;
        }).join('');

        const formaPagUpper = String(pedido.formaPagamento || '').toUpperCase();
        let blocoDadosContaHtml = '';

        if (formaPagUpper === 'PIX' && cfg.pixChave) {
            blocoDadosContaHtml = `
                <div style="background:#101810; border:1px solid rgba(76,175,80,0.45); padding:10px; border-radius:6px; font-size:11.5px; color:#ddd; margin-bottom:14px; text-align:left;">
                    <div style="color:#4caf50; font-weight:700; margin-bottom:4px;">💠 Dados para Transferência Pix</div>
                    <div><strong>Chave Pix:</strong> <span id="valor-chave-pix-modal" style="color:#fff;">${escaparHtmlSacola(cfg.pixChave)}</span></div>
                    ${cfg.pixTitular ? `<div><strong>Favorecido:</strong> ${escaparHtmlSacola(cfg.pixTitular)}</div>` : ''}
                    ${cfg.pixBanco ? `<div><strong>Banco:</strong> ${escaparHtmlSacola(cfg.pixBanco)}</div>` : ''}
                    <button type="button" id="btn-copiar-chave-pix" style="margin-top:8px; width:100%; background:#1f2e1f; border:1px solid #4caf50; color:#4caf50; padding:7px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer;">📋 Copiar Chave Pix</button>
                </div>
            `;
        } else if ((formaPagUpper === 'CREDITO' || formaPagUpper === 'DEBITO') && cfg.linkCartao && /^https?:\/\//i.test(cfg.linkCartao)) {
            blocoDadosContaHtml = `
                <div style="background:#12161f; border:1px solid rgba(79,195,247,0.45); padding:10px; border-radius:6px; font-size:11.5px; color:#ddd; margin-bottom:14px; text-align:left;">
                    <div style="color:#4fc3f7; font-weight:700; margin-bottom:6px;">💳 Finalizar Pagamento no Cartão</div>
                    <a href="${escaparHtmlSacola(cfg.linkCartao)}" target="_blank" rel="noopener noreferrer" style="display:block; text-align:center; background:#4fc3f7; color:#000; padding:8px; border-radius:4px; font-weight:800; font-size:12px; text-decoration:none;">Abrir Link de Pagamento Seguro</a>
                </div>
            `;
        }

        modal.innerHTML = `
            <div style="background:#141414; border:1px solid #333; border-top:3px solid var(--dourado, #d4af37); border-radius:8px; max-width:440px; width:100%; padding:22px; color:#fff; text-align:center; box-shadow:0 15px 35px rgba(0,0,0,0.9); max-height:92vh; overflow-y:auto;">
                <div style="font-size:36px; margin-bottom:8px;">🛍️</div>
                <h2 style="margin:0 0 6px 0; color:var(--dourado, #d4af37); font-size:18px;">Pedido Registrado com Sucesso!</h2>
                <p style="font-size:12px; color:#aaa; margin:0 0 14px 0;">Obrigada por comprar na VR Modas! O seu pedido já foi enviado ao painel do lojista.</p>
                
                <div style="background:#0a0a0a; border:1px solid #222; border-radius:6px; padding:12px; text-align:left; margin-bottom:14px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #1f1f1f; padding-bottom:6px;">
                        <span style="font-size:12px; color:#777;">Código do Pedido:</span>
                        <strong style="font-size:13px; color:var(--dourado, #d4af37);">${escaparHtmlSacola(pedido.codigo)}</strong>
                    </div>
                    <div style="margin-bottom:8px;">${itensHtml}</div>
                    <div style="display:flex; justify-content:space-between; border-top:1px solid #1f1f1f; padding-top:6px;">
                        <strong style="font-size:13px;">Total:</strong>
                        <strong style="font-size:15px; color:var(--dourado, #d4af37);">${Number(pedido.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                    </div>
                </div>

                ${blocoDadosContaHtml}

                <div style="background:#1a1a1a; padding:10px; border-radius:6px; font-size:11px; color:#aaa; margin-bottom:15px; text-align:left;">
                    <span style="color:var(--dourado, #d4af37); font-weight:bold;">📦 Forma de Recebimento:</span><br>
                    ${escaparHtmlSacola(pedido.cliente?.endereco || '')}<br><br>
                    <span style="color:var(--dourado, #d4af37); font-weight:bold;">💳 Forma de Pagamento:</span> ${escaparHtmlSacola(formaPagUpper)}
                    ${cfg.instrucoesPagamento ? `<br><span style="color:#888;">${escaparHtmlSacola(cfg.instrucoesPagamento)}</span>` : ''}
                </div>

                <button type="button" id="btn-fechar-modal-pedido" style="width:100%; background:var(--dourado, #d4af37); color:#000; border:none; padding:11px; border-radius:4px; font-weight:bold; font-size:13px; cursor:pointer;">Continuar Comprando</button>
            </div>
        `;

        modal.style.display = 'flex';

        const btnCopiarPix = document.getElementById('btn-copiar-chave-pix');
        if (btnCopiarPix && cfg.pixChave) {
            btnCopiarPix.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(cfg.pixChave);
                    btnCopiarPix.innerText = '✓ Chave Pix Copiada!';
                } catch {
                    alert('Chave Pix: ' + cfg.pixChave);
                }
            };
        }

        document.getElementById('btn-fechar-modal-pedido').onclick = () => {
            modal.style.display = 'none';
        };
    }

    const btnFinalizarCompra = document.getElementById('btn-finalizar-compra') || document.querySelector('.btn-finalizar');
    if (btnFinalizarCompra) {
        btnFinalizarCompra.onclick = async () => {
            if (itensNoCarrinhoData.length === 0) {
                if (typeof mostrarToast === 'function') mostrarToast("Adicione produtos na sacola antes de finalizar.");
                return;
            }

            const cfg = obterConfigCheckoutLoja();
            btnFinalizarCompra.disabled = true;
            btnFinalizarCompra.innerText = "Validando Pedido...";

            const clienteSessao = obterClienteAtual();
            const clienteNome = clienteSessao ? clienteSessao.nome : "Cliente Visitante";
            const clienteEmail = clienteSessao ? (clienteSessao.email || "") : "";
            const clienteWhats = (clienteSessao && (clienteSessao.whatsapp || clienteSessao.telefone)) ? (clienteSessao.whatsapp || clienteSessao.telefone) : "Não informado";

            const clienteEndereco = (tipoEnvioSelecionado === 'retirada')
                ? (cfg.enderecoLoja ? `Retirada na Loja: ${cfg.enderecoLoja}` : "Retirada na Loja Física")
                : (enderecoEntregaCustom || "A combinar na entrega");

            const itensEnvio = itensNoCarrinhoData.map(it => ({
                idProduto: it.idProduto,
                quantidade: it.quantidade,
                tamanho: it.tamanho,
                cor: limparTextoCor(it.cor)
            }));

            try {
                const resposta = await fetch('/api/finalizar-pedido', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        itens: itensEnvio,
                        cupomCodigo: cupomAtivo ? cupomAtivo.codigo : null,
                        clienteNome,
                        clienteEmail,
                        clienteWhats,
                        clienteEndereco,
                        formaPagamento: metodoPagamentoSelecionado,
                        tipoEnvio: tipoEnvioSelecionado
                    })
                });

                const dadosServidor = await resposta.json();

                if (!resposta.ok || !dadosServidor.sucesso) {
                    const msgErro = dadosServidor.detalhe
                        ? `${dadosServidor.erro}\n(${dadosServidor.detalhe})`
                        : (dadosServidor.erro || "Não foi possível finalizar o pedido.");
                    alert(msgErro);
                    return;
                }

                const agora = new Date();
                const dataHora = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                const numeroPedido = `#VR-${dadosServidor.idPedido}`;

                const novoPedido = {
                    id: dadosServidor.idPedido,
                    codigo: numeroPedido,
                    data: dataHora,
                    cliente: { nome: clienteNome, whatsapp: clienteWhats, endereco: clienteEndereco },
                    itens: dadosServidor.itensValidados,
                    formaPagamento: metodoPagamentoSelecionado.toUpperCase(),
                    cupom: dadosServidor.cupomConfirmado,
                    total: dadosServidor.totalReal,
                    status: "Pendente"
                };

                const pedidosAtuais = JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [];
                pedidosAtuais.unshift(novoPedido);
                localStorage.setItem('vr_modas_pedidos', JSON.stringify(pedidosAtuais));

                if (typeof sincronizarProdutosNeon === 'function') {
                    await sincronizarProdutosNeon();
                }

                itensNoCarrinhoData = [];
                cupomAtivo = null;
                salvarItensSacolaStorage([]);
                renderizarSacola();
                if (carrinhoLateral) carrinhoLateral.classList.remove('aberto');

                exibirConfirmacaoNoSite(novoPedido);
            } catch (erroRede) {
                console.error("Erro ao comunicar com checkout seguro:", erroRede);
                alert("Falha de conexão ao finalizar o pedido. Verifique sua internet e tente novamente.");
            } finally {
                btnFinalizarCompra.disabled = false;
                btnFinalizarCompra.innerText = "Finalizar Compra";
            }
        };
    }

    // Renderiza a sacola salva ao carregar qualquer página
    renderizarSacola();
});