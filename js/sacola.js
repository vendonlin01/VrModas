document.addEventListener('DOMContentLoaded', () => {
    const carrinhoLateral = document.getElementById('carrinho-lateral');
    const btnAbrirCarrinho = document.getElementById('abrir-carrinho');
    const btnFecharCarrinho = document.getElementById('fechar-carrinho');
    if (btnAbrirCarrinho) btnAbrirCarrinho.onclick = () => { renderizarSacola(); carrinhoLateral.classList.add('aberto'); };
    if (btnFecharCarrinho) btnFecharCarrinho.onclick = () => carrinhoLateral.classList.remove('aberto');

    const listaItens = document.getElementById('lista-itens');
    let totalCarrinho = 0; 
    let qtdItensCarrinho = 0;
    let itensNoCarrinhoData = [];

    let metodoPagamentoSelecionado = 'pix';
    let parcelaSelecionada = 1;
    let cupomAtivo = null;
    let tipoEnvioSelecionado = 'entrega';

    function obterClienteAtual() {
        return JSON.parse(localStorage.getItem('vr_modas_usuario_logado')) ||
               JSON.parse(sessionStorage.getItem('vr_cliente_dados')) ||
               JSON.parse(localStorage.getItem('vr_cliente_dados')) ||
               null;
    }

    function formatarEnderecoParaTexto(end) {
        if (!end) return 'Retirada na Loja / A combinar';
        if (typeof end === 'string') return end;
        const partes = [
            end.rua ? `${end.rua}, Nº ${end.numero || 'S/N'}` : '',
            end.bairro,
            end.cidade,
            end.cep ? `(CEP: ${end.cep})` : ''
        ].filter(Boolean);
        return partes.length > 0 ? partes.join(' - ') : 'Retirada na Loja / A combinar';
    }

    let clienteAtual = obterClienteAtual();
    let enderecoEntregaCustom = clienteAtual && clienteAtual.endereco ? formatarEnderecoParaTexto(clienteAtual.endereco) : '';

    function renderizarSacola() {
        if (!listaItens) return;
        listaItens.innerHTML = '';
        totalCarrinho = 0;
        qtdItensCarrinho = 0;

        if (itensNoCarrinhoData.length === 0) {
            listaItens.innerHTML = '<p style="color: var(--cinza-texto); text-align: center; padding: 40px 10px;">Sua sacola está vazia.</p>';
            const blocoExistente = document.getElementById('bloco-pagamento-sacola');
            if (blocoExistente) blocoExistente.remove();
            cupomAtivo = null;
            atualizarContadores(0, 0);
            return;
        }

        itensNoCarrinhoData.forEach(item => {
            const subtotal = item.preco * item.quantidade;
            totalCarrinho += subtotal;
            qtdItensCarrinho += item.quantidade;

            listaItens.insertAdjacentHTML('beforeend', `
                <div class="item-na-sacola" data-idref="${item.idRef}" style="display: flex; gap: 12px; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #222;">
                    <img src="${item.imagem}" alt="${item.nome}" style="width: 55px; height: 55px; object-fit: cover; border-radius: 6px; border: 1px solid #333; flex-shrink: 0;" onerror="this.src='img/produto1.jpg'">

                    <div class="item-info" style="flex: 1; min-width: 0;">
                        <h4 style="font-size: 13px; margin: 0 0 3px 0; color: var(--branco); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.nome}</h4>
                        <small style="color: var(--cinza-texto); display: block; margin-bottom: 4px; font-size: 11px;">Tam: ${item.tamanho} | Cor: ${item.cor}</small>
                        <p style="color: var(--dourado); font-weight: bold; margin: 0; font-size: 13px;">${subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>

                    <div style="display: flex; align-items: center; gap: 6px; background: #141414; padding: 3px 6px; border-radius: 4px; border: 1px solid #333; flex-shrink: 0;">
                        <button type="button" class="btn-sacola-qtd btn-sacola-menos" data-idref="${item.idRef}" style="background: none; border: none; color: var(--branco); font-size: 13px; cursor: pointer; padding: 0 3px; font-weight: bold;">-</button>
                        <span style="font-size: 12px; font-weight: bold; min-width: 12px; text-align: center;">${item.quantidade}</span>
                        <button type="button" class="btn-sacola-qtd btn-sacola-mais" data-idref="${item.idRef}" style="background: none; border: none; color: var(--branco); font-size: 13px; cursor: pointer; padding: 0 3px; font-weight: bold;">+</button>
                    </div>

                    <button class="btn-remover" data-idref="${item.idRef}" style="background: none; color: #ff4444; border: none; cursor: pointer; font-size: 15px; padding: 4px; flex-shrink: 0;" title="Remover item">✕</button>
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

        let valorDesconto = 0;
        if (cupomAtivo) {
            valorDesconto = (cupomAtivo.tipo === 'porcentagem') ? (totalCarrinho * cupomAtivo.valor) / 100 : cupomAtivo.valor;
        }
        const totalFinalCalculado = Math.max(0, totalCarrinho - valorDesconto);

        clienteAtual = obterClienteAtual();
        if (!enderecoEntregaCustom && clienteAtual && clienteAtual.endereco) {
            enderecoEntregaCustom = formatarEnderecoParaTexto(clienteAtual.endereco);
        }

        const enderecoExibicao = enderecoEntregaCustom || 'Nenhum endereço cadastrado';
        const nomeClienteExibicao = clienteAtual ? clienteAtual.nome : 'Visitante';

        const htmlPagamento = `
            <div id="bloco-pagamento-sacola" style="background: #111; padding: 12px; border-radius: 8px; border: 1px solid #2a2a2a; margin-bottom: 12px;">
                <label style="font-size: 11px; text-transform: uppercase; color: var(--dourado); font-weight: 700; display: block; margin-bottom: 8px;">Como deseja receber seu pedido?</label>
                <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                    <button type="button" id="btn-opcao-entrega" style="flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 4px; border: 1px solid #333; background: ${tipoEnvioSelecionado === 'entrega' ? 'var(--dourado)' : '#1a1a1a'}; color: ${tipoEnvioSelecionado === 'entrega' ? '#000' : '#fff'}; cursor: pointer;">🏠 Receber em Casa</button>
                    <button type="button" id="btn-opcao-retirada" style="flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 4px; border: 1px solid #333; background: ${tipoEnvioSelecionado === 'retirada' ? 'var(--dourado)' : '#1a1a1a'}; color: ${tipoEnvioSelecionado === 'retirada' ? '#000' : '#fff'}; cursor: pointer;">🏬 Retirar na Loja</button>
                </div>

                <div id="painel-endereco-casa" style="display: ${tipoEnvioSelecionado === 'entrega' ? 'block' : 'none'}; background: #161616; padding: 10px; border-radius: 6px; border: 1px solid #292929; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-size: 11px; font-weight: 700; color: var(--dourado); text-transform: uppercase;">📍 Endereço de Entrega</span>
                        <button type="button" id="btn-editar-endereco-sacola" style="background: none; border: none; color: #4fc3f7; font-size: 11px; cursor: pointer; text-decoration: underline;">Alterar</button>
                    </div>
                    <p id="texto-endereco-sacola" style="font-size: 11px; color: #ccc; margin: 0; line-height: 1.4;">${enderecoExibicao}</p>
                    <small style="font-size: 10px; color: #777;">Destinatário: ${nomeClienteExibicao}</small>

                    <div id="form-alterar-endereco" style="display: none; margin-top: 8px; border-top: 1px dashed #333; padding-top: 8px;">
                        <input type="text" id="input-novo-endereco" placeholder="Rua, Nº, Bairro, Cidade (CEP)" value="${enderecoEntregaCustom}" style="width: 100%; box-sizing: border-box; background: #0a0a0a; border: 1px solid #333; color: #fff; padding: 7px; border-radius: 4px; font-size: 11px; margin-bottom: 6px;">
                        <div style="display: flex; gap: 6px;">
                            <button type="button" id="btn-salvar-novo-endereco" style="flex: 1; background: var(--dourado); color: #000; border: none; padding: 6px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer;">Salvar</button>
                            <button type="button" id="btn-cancelar-novo-endereco" style="background: #333; color: #fff; border: none; padding: 6px 10px; border-radius: 4px; font-size: 11px; cursor: pointer;">Cancelar</button>
                        </div>
                    </div>
                </div>

                <div id="painel-aviso-retirada" style="display: ${tipoEnvioSelecionado === 'retirada' ? 'block' : 'none'}; background: #161616; padding: 10px; border-radius: 6px; border: 1px solid #292929; margin-bottom: 10px;">
                    <span style="font-size: 11px; font-weight: 700; color: var(--dourado);">🏬 Retirada Gratuita</span>
                    <p style="font-size: 11px; color: #aaa; margin: 4px 0 0 0;">Retire seu pedido na loja da VR Modas após confirmação via WhatsApp.</p>
                </div>

                <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                    <input type="text" id="input-cupom-sacola" placeholder="Cupom" value="${cupomAtivo ? cupomAtivo.codigo : ''}" style="flex: 1; background: #0a0a0a; border: 1px solid #333; color: #fff; padding: 7px 10px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">
                    <button type="button" id="btn-aplicar-cupom-sacola" style="background: var(--dourado); color: #000; border: none; padding: 7px 12px; border-radius: 4px; font-weight: 700; font-size: 11px; cursor: pointer;">Aplicar</button>
                </div>
                ${cupomAtivo ? `<div style="color: #4caf50; font-size: 11px; margin-bottom: 8px; font-weight: 700;">✓ Cupom ${cupomAtivo.codigo} aplicado (-R$ ${valorDesconto.toFixed(2)})</div>` : ''}

                <label style="font-size: 11px; text-transform: uppercase; color: var(--dourado); font-weight: 700; display: block; margin-bottom: 8px;">Forma de Pagamento</label>
                <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                    <button type="button" class="btn-metodo-pag ${metodoPagamentoSelecionado === 'pix' ? 'ativo' : ''}" data-metodo="pix" style="flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 4px; border: 1px solid #333; background: ${metodoPagamentoSelecionado === 'pix' ? 'var(--dourado)' : '#1a1a1a'}; color: ${metodoPagamentoSelecionado === 'pix' ? '#000' : '#fff'}; cursor: pointer;">💠 Pix</button>
                    <button type="button" class="btn-metodo-pag ${metodoPagamentoSelecionado === 'credito' ? 'ativo' : ''}" data-metodo="credito" style="flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 4px; border: 1px solid #333; background: ${metodoPagamentoSelecionado === 'credito' ? 'var(--dourado)' : '#1a1a1a'}; color: ${metodoPagamentoSelecionado === 'credito' ? '#000' : '#fff'}; cursor: pointer;">💳 Crédito</button>
                    <button type="button" class="btn-metodo-pag ${metodoPagamentoSelecionado === 'debito' ? 'ativo' : ''}" data-metodo="debito" style="flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 4px; border: 1px solid #333; background: ${metodoPagamentoSelecionado === 'debito' ? 'var(--dourado)' : '#1a1a1a'}; color: ${metodoPagamentoSelecionado === 'debito' ? '#000' : '#fff'}; cursor: pointer;">💳 Débito</button>
                </div>
            </div>
        `;

        const totalElement = containerTotal.querySelector('.carrinho-total');
        if (totalElement) totalElement.insertAdjacentHTML('beforebegin', htmlPagamento);

        const valorEl = document.getElementById('valor-total');
        if (valorEl) valorEl.innerText = totalFinalCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        document.getElementById('btn-opcao-entrega').onclick = () => { tipoEnvioSelecionado = 'entrega'; renderizarOpcoesPagamento(); };
        document.getElementById('btn-opcao-retirada').onclick = () => { tipoEnvioSelecionado = 'retirada'; renderizarOpcoesPagamento(); };

        const btnEditarEnd = document.getElementById('btn-editar-endereco-sacola');
        const formAltEnd = document.getElementById('form-alterar-endereco');
        const inputNovoEnd = document.getElementById('input-novo-endereco');
        if (btnEditarEnd && formAltEnd) btnEditarEnd.onclick = () => { formAltEnd.style.display = 'block'; inputNovoEnd?.focus(); };
        if (document.getElementById('btn-cancelar-novo-endereco')) document.getElementById('btn-cancelar-novo-endereco').onclick = () => { formAltEnd.style.display = 'none'; };
        if (document.getElementById('btn-salvar-novo-endereco')) {
            document.getElementById('btn-salvar-novo-endereco').onclick = () => {
                enderecoEntregaCustom = inputNovoEnd.value.trim() || 'Retirada na Loja / A combinar';
                formAltEnd.style.display = 'none';
                document.getElementById('texto-endereco-sacola').innerText = enderecoEntregaCustom;
                if (typeof mostrarToast === 'function') mostrarToast("Endereço de entrega atualizado!");
            };
        }

        const btnCupom = document.getElementById('btn-aplicar-cupom-sacola');
        if (btnCupom) {
            btnCupom.onclick = function() {
                const codDigitado = document.getElementById('input-cupom-sacola').value.trim().toUpperCase();
                const cuponsDisponiveis = JSON.parse(localStorage.getItem('vr_modas_cupons')) || [{ id: 1, codigo: 'BEMVINDA10', tipo: 'porcentagem', valor: 10 }];
                const cupomAchado = cuponsDisponiveis.find(c => c.codigo === codDigitado);
                if (cupomAchado) {
                    cupomAtivo = cupomAchado;
                    if (typeof mostrarToast === 'function') mostrarToast(`Cupom ${cupomAchado.codigo} aplicado!`);
                    renderizarOpcoesPagamento();
                } else {
                    alert("Cupom inválido ou expirado.");
                }
            };
        }

        document.querySelectorAll('.btn-metodo-pag').forEach(btn => {
            btn.onclick = function() {
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
            const produtosAtuais = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
            const prodRef = produtosAtuais.find(p => String(p.id) === String(produtoIdNaUrl));

            const nomeStr = document.getElementById('detalhe-nome')?.innerText || prodRef?.nome;
            const tamSelecionado = document.querySelector('input[name="tamanho"]:checked')?.value || 'Padrão';
            const corSelecionada = document.querySelector('input[name="cor"]:checked')?.value || 'Padrão';

            let precoCobrado = prodRef?.preco || 0;
            if (prodRef?.precoPromocional && Number(prodRef.precoPromocional) < Number(prodRef.preco)) {
                precoCobrado = Number(prodRef.precoPromocional);
            }

            const imgEl = document.getElementById('detalhe-img');
            const fotoAtual = imgEl ? imgEl.src : (prodRef?.imagem || 'img/produto1.jpg');

            const inputQtd = document.getElementById('qtd-produto');
            let qtd = parseInt(inputQtd?.value || inputQtd?.innerText || '1');
            if (isNaN(qtd) || qtd < 1) qtd = 1;

            const itemExistente = itensNoCarrinhoData.find(it => it.nome === nomeStr && it.tamanho === tamSelecionado && it.cor === corSelecionada);
            if (itemExistente) {
                itemExistente.quantidade += qtd;
            } else {
                itensNoCarrinhoData.push({
                    idRef: Date.now(),
                    idProduto: prodRef?.id,
                    nome: nomeStr,
                    preco: precoCobrado,
                    quantidade: qtd,
                    estoqueMax: parseInt(prodRef?.estoque || 99),
                    tamanho: tamSelecionado,
                    cor: corSelecionada,
                    imagem: fotoAtual
                });
            }

            renderizarSacola();
            carrinhoLateral.classList.add('aberto');
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

    const btnFinalizarCompra = document.getElementById('btn-finalizar-compra') || document.querySelector('.btn-finalizar');
    if (btnFinalizarCompra) {
        btnFinalizarCompra.onclick = () => {
            if (itensNoCarrinhoData.length === 0) {
                if (typeof mostrarToast === 'function') mostrarToast("Adicione produtos na sacola antes de finalizar.");
                return;
            }

            const clienteSessao = obterClienteAtual();
            const clienteNome = clienteSessao ? clienteSessao.nome : "Cliente Visitante";
            const clienteWhats = (clienteSessao && (clienteSessao.whatsapp || clienteSessao.telefone)) ? (clienteSessao.whatsapp || clienteSessao.telefone) : "Não informado";
            
            let clienteEndereco = (tipoEnvioSelecionado === 'retirada')
                ? "🏬 Retirada na Loja Física (Sem frete)"
                : (enderecoEntregaCustom || "A combinar na entrega");

            const numeroPedido = `#VR-${Math.floor(1000 + Math.random() * 9000)}`;
            const agora = new Date();
            const dataHora = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

            let descFinal = 0;
            if (cupomAtivo) {
                descFinal = cupomAtivo.tipo === 'porcentagem' ? (totalCarrinho * cupomAtivo.valor) / 100 : cupomAtivo.valor;
            }
            const totalComDesconto = Math.max(0, totalCarrinho - descFinal);

            const novoPedido = {
                id: Date.now(),
                codigo: numeroPedido,
                data: dataHora,
                cliente: { nome: clienteNome, whatsapp: clienteWhats, endereco: clienteEndereco },
                itens: [...itensNoCarrinhoData],
                formaPagamento: metodoPagamentoSelecionado.toUpperCase(),
                cupom: cupomAtivo ? cupomAtivo.codigo : null,
                total: totalComDesconto,
                status: "Pendente"
            };

            let pedidosAtuais = JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [];
            pedidosAtuais.unshift(novoPedido);
            localStorage.setItem('vr_modas_pedidos', JSON.stringify(pedidosAtuais));

            const configLoja = JSON.parse(localStorage.getItem('vr_modas_config')) || { whatsapp: '5589999999999' };
            const whatsLoja = (configLoja.whatsapp || '5589999999999').replace(/\D/g, '');

            let textoItensWhats = novoPedido.itens.map(it => `• ${it.quantidade}x ${it.nome} (Tam: ${it.tamanho} | Cor: ${it.cor}) - ${(it.preco * it.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`).join('\n');

            let msgWhats = `*NOVO PEDIDO VR MODAS* 🛍️\n\n*Pedido:* ${numeroPedido}\n*Data:* ${dataHora}\n*Cliente:* ${clienteNome}\n*Contato:* ${clienteWhats}\n*Forma de Recebimento:* ${clienteEndereco}\n\n*Itens do Pedido:*\n${textoItensWhats}\n\n`;
            if (novoPedido.cupom) msgWhats += `*Cupom:* ${novoPedido.cupom}\n`;
            msgWhats += `*Forma de Pagamento:* ${metodoPagamentoSelecionado.toUpperCase()}\n*VALOR TOTAL:* ${totalComDesconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n\nOlá! Gostaria de confirmar meu pedido.`;

            itensNoCarrinhoData = [];
            cupomAtivo = null;
            renderizarSacola();
            if (carrinhoLateral) carrinhoLateral.classList.remove('aberto');

            if (typeof mostrarToast === 'function') mostrarToast(`Pedido ${numeroPedido} registrado!`);
            window.open(`https://api.whatsapp.com/send?phone=${whatsLoja}&text=${encodeURIComponent(msgWhats)}`, '_blank');
        };
    }

    const btnMenu = document.getElementById('btn-menu');
    const navbar = document.getElementById('navbar');
    const btnFecharMenu = document.getElementById('fechar-menu');
    if (btnMenu && navbar) {
        btnMenu.onclick = () => navbar.classList.add('aberto');
        if (btnFecharMenu) btnFecharMenu.onclick = () => navbar.classList.remove('aberto');
    }
});