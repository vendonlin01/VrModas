/* =====================================================
   SACOLA, ENVIO (CASA/LOJA) & CHECKOUT ANTIFRAUDE - VR MODAS
   ===================================================== */

function escaparHtmlSacola(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', () => {
    const carrinhoLateral = document.getElementById('carrinho-lateral');
    const btnAbrirCarrinho = document.getElementById('abrir-carrinho');
    const btnFecharCarrinho = document.getElementById('fechar-carrinho');

    if (btnAbrirCarrinho) {
        btnAbrirCarrinho.onclick = () => {
            renderizarSacola();
            if (carrinhoLateral) carrinhoLateral.classList.add('aberto');
        };
    }
    if (btnFecharCarrinho && carrinhoLateral) {
        btnFecharCarrinho.onclick = () => carrinhoLateral.classList.remove('aberto');
    }

    const listaItens = document.getElementById('lista-itens');
    let totalCarrinho = 0;
    let qtdItensCarrinho = 0;
    let itensNoCarrinhoData = [];

    let metodoPagamentoSelecionado = 'pix';
    let cupomAtivo = null;
    let tipoEnvioSelecionado = 'entrega';

    async function obterSqlSacolaSeguro() {
        if (typeof window.getSql === 'function') {
            const s = await window.getSql();
            if (s) return s;
        }
        if (window.sql) return window.sql;
        return null;
    }

    function obterClienteAtual() {
        return JSON.parse(sessionStorage.getItem('vr_usuario_ativo')) ||
               JSON.parse(localStorage.getItem('vr_usuario_ativo')) ||
               JSON.parse(sessionStorage.getItem('vr_cliente_dados')) ||
               JSON.parse(localStorage.getItem('vr_cliente_dados')) ||
               null;
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
                } catch (e) {
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
                } catch (e) {
                    return trimmed;
                }
            } else {
                return trimmed;
            }
        }

        if (typeof obj === 'object' && obj !== null) {
            if (obj.enderecoFormatado) return obj.enderecoFormatado;
            const rua = obj.rua || obj.logradouro || '';
            const num = obj.numero || 'S/N';
            const bairro = obj.bairro || '';
            const cidade = obj.cidade || '';
            const cep = obj.cep ? `(CEP: ${obj.cep})` : '';
            const partes = [rua ? `${rua}, Nº ${num}` : '', bairro, cidade, cep].filter(p => p.trim() !== '');
            return partes.length > 0 ? partes.join(' - ') : '';
        }

        return '';
    }

    let clienteAtual = obterClienteAtual();
    let enderecoEntregaCustom = clienteAtual && clienteAtual.endereco ? formatarEnderecoParaTexto(clienteAtual.endereco) : '';

    function renderizarSacola() {
        if (!listaItens) return;
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
            const subtotal = item.preco * item.quantidade;
            totalCarrinho += subtotal;
            qtdItensCarrinho += item.quantidade;

            const nomeSeguro = escaparHtmlSacola(item.nome);
            const tamSeguro = escaparHtmlSacola(item.tamanho);
            const corSegura = escaparHtmlSacola(item.cor);

            listaItens.insertAdjacentHTML('beforeend', `
                <div class="item-na-sacola" data-idref="${item.idRef}" style="display: flex; gap: 12px; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #222;">
                    <img src="${item.imagem}" alt="${nomeSeguro}" style="width: 55px; height: 55px; object-fit: cover; border-radius: 6px; border: 1px solid #333; flex-shrink: 0;" onerror="this.src='img/produto1.jpg'">

                    <div class="item-info" style="flex: 1; min-width: 0;">
                        <h4 style="font-size: 13px; margin: 0 0 3px 0; color: var(--branco, #fff); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${nomeSeguro}</h4>
                        <small style="color: var(--cinza-texto, #aaa); display: block; margin-bottom: 4px; font-size: 11px;">Tam: ${tamSeguro} | Cor: ${corSegura}</small>
                        <p style="color: var(--dourado, #d4af37); font-weight: bold; margin: 0; font-size: 13px;">${subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>

                    <div style="display: flex; align-items: center; gap: 6px; background: #141414; padding: 3px 6px; border-radius: 4px; border: 1px solid #333; flex-shrink: 0;">
                        <button type="button" class="btn-sacola-qtd btn-sacola-menos" data-idref="${item.idRef}" style="background: none; border: none; color: #fff; font-size: 13px; cursor: pointer; padding: 0 3px; font-weight: bold;">-</button>
                        <span style="font-size: 12px; font-weight: bold; min-width: 12px; text-align: center;">${item.quantidade}</span>
                        <button type="button" class="btn-sacola-qtd btn-sacola-mais" data-idref="${item.idRef}" style="background: none; border: none; color: #fff; font-size: 13px; cursor: pointer; padding: 0 3px; font-weight: bold;">+</button>
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

        const enderecoExibicao = escaparHtmlSacola(enderecoEntregaCustom || 'Nenhum endereço cadastrado');
        const nomeClienteExibicao = escaparHtmlSacola(clienteAtual ? clienteAtual.nome : 'Visitante');
        const cupomCodigoSeguro = cupomAtivo ? escaparHtmlSacola(cupomAtivo.codigo) : '';

        const htmlPagamento = `
            <div id="bloco-pagamento-sacola" style="background: #111; padding: 12px; border-radius: 8px; border: 1px solid #2a2a2a; margin-bottom: 12px;">
                
                <label style="font-size: 11px; text-transform: uppercase; color: var(--dourado, #d4af37); font-weight: 700; display: block; margin-bottom: 8px;">Como deseja receber seu pedido?</label>
                <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                    <button type="button" id="btn-opcao-entrega" style="flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 4px; border: 1px solid #333; background: ${tipoEnvioSelecionado === 'entrega' ? 'var(--dourado, #d4af37)' : '#1a1a1a'}; color: ${tipoEnvioSelecionado === 'entrega' ? '#000' : '#fff'}; cursor: pointer;">🏠 Receber em Casa</button>
                    <button type="button" id="btn-opcao-retirada" style="flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 4px; border: 1px solid #333; background: ${tipoEnvioSelecionado === 'retirada' ? 'var(--dourado, #d4af37)' : '#1a1a1a'}; color: ${tipoEnvioSelecionado === 'retirada' ? '#000' : '#fff'}; cursor: pointer;">🏬 Retirar na Loja</button>
                </div>

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

                <div id="painel-aviso-retirada" style="display: ${tipoEnvioSelecionado === 'retirada' ? 'block' : 'none'}; background: #161616; padding: 10px; border-radius: 6px; border: 1px solid #292929; margin-bottom: 10px;">
                    <span style="font-size: 11px; font-weight: 700; color: var(--dourado, #d4af37);">🏬 Retirada Gratuita no Ponto Físico</span>
                    <p style="font-size: 11px; color: #aaa; margin: 4px 0 0 0;">Você pode retirar as suas peças diretamente na loja física assim que o pedido for separado.</p>
                </div>

                <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                    <input type="text" id="input-cupom-sacola" placeholder="Cupom de desconto" value="${cupomCodigoSeguro}" style="flex: 1; background: #0a0a0a; border: 1px solid #333; color: #fff; padding: 7px 10px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">
                    <button type="button" id="btn-aplicar-cupom-sacola" style="background: var(--dourado, #d4af37); color: #000; border: none; padding: 7px 12px; border-radius: 4px; font-weight: 700; font-size: 11px; cursor: pointer;">Aplicar</button>
                </div>
                ${cupomAtivo ? `<div style="color: #4caf50; font-size: 11px; margin-bottom: 8px; font-weight: 700;">✓ Cupom ${cupomCodigoSeguro} aplicado (-R$ ${valorDesconto.toFixed(2)})</div>` : ''}

                <label style="font-size: 11px; text-transform: uppercase; color: var(--dourado, #d4af37); font-weight: 700; display: block; margin-bottom: 8px;">Forma de Pagamento</label>
                <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                    <button type="button" class="btn-metodo-pag ${metodoPagamentoSelecionado === 'pix' ? 'ativo' : ''}" data-metodo="pix" style="flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 4px; border: 1px solid #333; background: ${metodoPagamentoSelecionado === 'pix' ? 'var(--dourado, #d4af37)' : '#1a1a1a'}; color: ${metodoPagamentoSelecionado === 'pix' ? '#000' : '#fff'}; cursor: pointer;">💠 Pix</button>
                    <button type="button" class="btn-metodo-pag ${metodoPagamentoSelecionado === 'credito' ? 'ativo' : ''}" data-metodo="credito" style="flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 4px; border: 1px solid #333; background: ${metodoPagamentoSelecionado === 'credito' ? 'var(--dourado, #d4af37)' : '#1a1a1a'}; color: ${metodoPagamentoSelecionado === 'credito' ? '#000' : '#fff'}; cursor: pointer;">💳 Crédito</button>
                    <button type="button" class="btn-metodo-pag ${metodoPagamentoSelecionado === 'debito' ? 'ativo' : ''}" data-metodo="debito" style="flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 4px; border: 1px solid #333; background: ${metodoPagamentoSelecionado === 'debito' ? 'var(--dourado, #d4af37)' : '#1a1a1a'}; color: ${metodoPagamentoSelecionado === 'debito' ? '#000' : '#fff'}; cursor: pointer;">💳 Débito</button>
                </div>
            </div>
        `;

        const totalElement = containerTotal.querySelector('.carrinho-total');
        if (totalElement) totalElement.insertAdjacentHTML('beforebegin', htmlPagamento);

        const valorEl = document.getElementById('valor-total');
        if (valorEl) valorEl.innerText = totalFinalCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const btnOptEntrega = document.getElementById('btn-opcao-entrega');
        const btnOptRetirada = document.getElementById('btn-opcao-retirada');
        if (btnOptEntrega && btnOptRetirada) {
            btnOptEntrega.onclick = () => { tipoEnvioSelecionado = 'entrega'; renderizarOpcoesPagamento(); };
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
                enderecoEntregaCustom = inputNovoEnd.value.trim() || 'Retirada na Loja / A combinar';
                formAltEnd.style.display = 'none';
                const txtEnd = document.getElementById('texto-endereco-sacola');
                if (txtEnd) txtEnd.innerText = enderecoEntregaCustom;
                if (typeof mostrarToast === 'function') mostrarToast("Endereço atualizado!");
            };
        }

        const btnCupom = document.getElementById('btn-aplicar-cupom-sacola');
        if (btnCupom) {
            btnCupom.onclick = async function () {
                const codDigitado = document.getElementById('input-cupom-sacola').value.trim().toUpperCase();
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
            const produtosAtuais = JSON.parse(localStorage.getItem('vr_modas_db')) || [];

            let prodRef = null;
            if (produtoIdNaUrl) {
                prodRef = produtosAtuais.find(p => String(p.id).trim() === String(produtoIdNaUrl).trim());
            }
            if (!prodRef && produtosAtuais.length > 0) {
                prodRef = produtosAtuais[0];
            }

            const estoqueMax = parseInt(prodRef?.estoque || 10);
            if (estoqueMax <= 0) {
                alert("Este produto está esgotado no momento.");
                return;
            }

            const nomeStr = document.getElementById('detalhe-nome')?.innerText || prodRef?.nome || 'Peça VR Modas';
            const tamSelecionado = document.querySelector('input[name="tamanho"]:checked')?.value || 'Padrão';
            const corBruta = document.querySelector('input[name="cor"]:checked')?.value || 'Padrão';
            const corSelecionada = limparTextoCor(corBruta);

            let precoCobrado = Number(prodRef?.preco || 0);
            if (prodRef?.precoPromocional && Number(prodRef.precoPromocional) < Number(prodRef.preco)) {
                precoCobrado = Number(prodRef.precoPromocional);
            }

            const imgEl = document.getElementById('detalhe-img');
            const fotoAtual = imgEl ? imgEl.src : (prodRef?.imagem || 'img/produto1.jpg');

            const inputQtd = document.getElementById('qtd-produto');
            let qtd = parseInt(inputQtd?.value || inputQtd?.innerText || '1');
            if (isNaN(qtd) || qtd < 1) qtd = 1;
            if (qtd > estoqueMax) qtd = estoqueMax;

            const itemExistente = itensNoCarrinhoData.find(it => it.nome === nomeStr && it.tamanho === tamSelecionado && it.cor === corSelecionada);
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
                    idProduto: prodRef?.id,
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

        const itensHtml = pedido.itens.map(i => `
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; color:#ccc;">
                <span>${i.quantidade}x ${escaparHtmlSacola(i.nome)} (${escaparHtmlSacola(i.tamanho)} / ${escaparHtmlSacola(limparTextoCor(i.cor))})</span>
                <span style="color:var(--dourado, #d4af37); font-weight:bold;">${(i.preco * i.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
        `).join('');

        modal.innerHTML = `
            <div style="background:#141414; border:1px solid #333; border-top:3px solid var(--dourado, #d4af37); border-radius:8px; max-width:440px; width:100%; padding:22px; color:#fff; text-align:center; box-shadow:0 15px 35px rgba(0,0,0,0.9);">
                <div style="font-size:36px; margin-bottom:8px;">🛍️</div>
                <h2 style="margin:0 0 6px 0; color:var(--dourado, #d4af37); font-size:18px;">Pedido Registrado com Sucesso!</h2>
                <p style="font-size:12px; color:#aaa; margin:0 0 14px 0;">Obrigada por comprar na VR Modas! O seu pedido já foi enviado ao painel do lojista.</p>
                
                <div style="background:#0a0a0a; border:1px solid #222; border-radius:6px; padding:12px; text-align:left; margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #1f1f1f; padding-bottom:6px;">
                        <span style="font-size:12px; color:#777;">Código do Pedido:</span>
                        <strong style="font-size:13px; color:var(--dourado, #d4af37);">${escaparHtmlSacola(pedido.codigo)}</strong>
                    </div>
                    <div style="margin-bottom:8px;">${itensHtml}</div>
                    <div style="display:flex; justify-content:space-between; border-top:1px solid #1f1f1f; padding-top:6px;">
                        <strong style="font-size:13px;">Total:</strong>
                        <strong style="font-size:15px; color:var(--dourado, #d4af37);">${pedido.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                    </div>
                </div>

                <div style="background:#1a1a1a; padding:10px; border-radius:6px; font-size:11px; color:#aaa; margin-bottom:15px; text-align:left;">
                    <span style="color:var(--dourado, #d4af37); font-weight:bold;">📦 Forma de Recebimento:</span><br>
                    ${escaparHtmlSacola(pedido.cliente.endereco)}<br><br>
                    <span style="color:var(--dourado, #d4af37); font-weight:bold;">💳 Forma de Pagamento:</span> ${escaparHtmlSacola(pedido.formaPagamento)}
                </div>

                <button id="btn-fechar-modal-pedido" style="width:100%; background:var(--dourado, #d4af37); color:#000; border:none; padding:11px; border-radius:4px; font-weight:bold; font-size:13px; cursor:pointer;">Continuar Comprando</button>
            </div>
        `;

        modal.style.display = 'flex';
        document.getElementById('btn-fechar-modal-pedido').onclick = () => {
            modal.style.display = 'none';
        };
    }

    // ==========================================
    // FINALIZAR PEDIDO (CHECKOUT ANTIFRAUDE NO SERVIDOR)
    // ==========================================
    const btnFinalizarCompra = document.getElementById('btn-finalizar-compra') || document.querySelector('.btn-finalizar');
    if (btnFinalizarCompra) {
        btnFinalizarCompra.onclick = async () => {
            if (itensNoCarrinhoData.length === 0) {
                if (typeof mostrarToast === 'function') mostrarToast("Adicione produtos na sacola antes de finalizar.");
                return;
            }

            btnFinalizarCompra.disabled = true;
            btnFinalizarCompra.innerText = "Validando Pedido...";

            const clienteSessao = obterClienteAtual();
            const clienteNome = clienteSessao ? clienteSessao.nome : "Cliente Visitante";
            const clienteEmail = clienteSessao ? (clienteSessao.email || "") : "";
            const clienteWhats = (clienteSessao && (clienteSessao.whatsapp || clienteSessao.telefone)) ? (clienteSessao.whatsapp || clienteSessao.telefone) : "Não informado";

            const clienteEndereco = (tipoEnvioSelecionado === 'retirada')
                ? "Retirada na Loja Física"
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
                    alert(dadosServidor.erro || "Não foi possível finalizar o pedido.");
                    btnFinalizarCompra.disabled = false;
                    btnFinalizarCompra.innerText = "Finalizar Compra";
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

    const btnMenu = document.getElementById('btn-menu');
    const navbar = document.getElementById('navbar');
    const btnFecharMenu = document.getElementById('fechar-menu');
    if (btnMenu && navbar) {
        btnMenu.onclick = () => navbar.classList.add('aberto');
        if (btnFecharMenu) btnFecharMenu.onclick = () => navbar.classList.remove('aberto');
    }
});