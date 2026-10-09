document.addEventListener('DOMContentLoaded', () => {

    let listaFavoritos = JSON.parse(localStorage.getItem('vr_modas_favoritos')) || [];

    // ==========================================
    // 1. CARROSSEL DINÂMICO (HOME)
    // ==========================================
    const carrosselContainer = document.getElementById('carrossel-home');
    const banners = JSON.parse(localStorage.getItem('vr_modas_banners')) || [];
    if (carrosselContainer && banners.length > 0) {
        carrosselContainer.innerHTML = '';
        banners.forEach((banner, index) => {
            const ativoClass = index === 0 ? 'ativo' : '';
            carrosselContainer.insertAdjacentHTML('beforeend', `
                <div class="slide ${ativoClass}" style="background-image: linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('${banner.imagem}');">
                    <div class="slide-content">
                        <h1>${banner.titulo}</h1>
                        <p>${banner.subtitulo}</p>
                        <a href="${banner.btnLink}" class="btn-dourado">${banner.btnTexto}</a>
                    </div>
                </div>
            `);
        });

        const slides = document.querySelectorAll('.slide');
        if (slides.length > 1) {
            let slideAtual = 0;
            setInterval(() => {
                slides[slideAtual].classList.remove('ativo');
                slideAtual = (slideAtual + 1) % slides.length;
                slides[slideAtual].classList.add('ativo');
            }, 5000);
        }
    }

    // ==========================================
    // 2. RENDERIZAR VITRINE E FAVORITOS
    // ==========================================
    const vitrineProdutos = document.getElementById('vitrine-produtos');
    function renderizarVitrine(lista) {
        if (!vitrineProdutos) return;
        vitrineProdutos.innerHTML = ''; 
        if (lista.length === 0) {
            vitrineProdutos.innerHTML = '<p style="color: white; width: 100%; text-align: center; padding: 40px; grid-column: 1 / -1;">Nenhum produto encontrado com os filtros selecionados.</p>';
            return;
        }

        lista.forEach(produto => {
            const precoFormatado = Number(produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const linkDetalhes = `detalhes.html?id=${produto.id}`;
            
            // Suporte a Preço Promocional Riscado
            let precoHTML = `<p class="preco">${precoFormatado}</p>`;
            if (produto.precoPromocional && Number(produto.precoPromocional) < Number(produto.preco)) {
                const promoFormatado = Number(produto.precoPromocional).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                precoHTML = `
                    <p class="preco" style="display: flex; flex-direction: column; gap: 2px;">
                        <span style="text-decoration: line-through; color: #777; font-size: 11px; font-weight: normal;">${precoFormatado}</span>
                        <span style="color: var(--dourado); font-weight: 800;">${promoFormatado}</span>
                    </p>
                `;
            }

            // Foto com garantia e fallback se falhar
            let fotoPrincipal = 'img/produto1.jpg';
            if (produto.imagens && produto.imagens.length > 0 && produto.imagens[0]) {
                fotoPrincipal = produto.imagens[0];
            } else if (produto.imagem) {
                fotoPrincipal = produto.imagem;
            }

            const isFav = listaFavoritos.some(fav => String(fav.id) === String(produto.id));
            const coracaoIcone = isFav ? '❤️' : '🤍';

            vitrineProdutos.insertAdjacentHTML('beforeend', `
                <div class="card-produto">
                    <button type="button" class="btn-favoritar-card" data-id="${produto.id}" title="Favoritar">
                        ${coracaoIcone}
                    </button>
                    <a href="${linkDetalhes}">
                        <img src="${fotoPrincipal}" class="imagem-produto" alt="${produto.nome}" onerror="this.src='img/produto1.jpg'">
                    </a>
                    <div class="card-info">
                        <a href="${linkDetalhes}">
                            <h3>${produto.nome}</h3>
                        </a>
                        ${precoHTML}
                        <a href="${linkDetalhes}" class="btn-comprar">
                            Ver Detalhes
                        </a>
                    </div>
                </div>
            `);
        });

        document.querySelectorAll('.btn-favoritar-card').forEach(btn => {
            btn.onclick = function(e) {
                e.preventDefault();
                alternarFavorito(this.getAttribute('data-id'));
            };
        });
    }

    const produtosBase = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
    renderizarVitrine(produtosBase);

    // ==========================================
    // 2.1 GESTÃO DA GAVETA DE FAVORITOS
    // ==========================================
    const abrirFavoritos = document.getElementById('abrir-favoritos');
    const fecharFavoritos = document.getElementById('fechar-favoritos');
    const favoritosLateral = document.getElementById('favoritos-lateral');
    const listaFavoritosEl = document.getElementById('lista-favoritos');

    function atualizarContadorFavoritos() {
        document.querySelectorAll('.contador-favoritos').forEach(el => el.innerText = listaFavoritos.length);
    }
    atualizarContadorFavoritos();

    function renderizarListaFavoritos() {
        if (!listaFavoritosEl) return;
        listaFavoritosEl.innerHTML = '';
        if (listaFavoritos.length === 0) {
            listaFavoritosEl.innerHTML = '<p style="color: var(--cinza-texto); text-align: center; padding: 30px;">Sua lista de favoritos está vazia.</p>';
            return;
        }

        listaFavoritos.forEach(item => {
            const precoFormatado = Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            listaFavoritosEl.insertAdjacentHTML('beforeend', `
                <div class="item-na-sacola" style="display: flex; gap: 12px; align-items: center; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 10px;">
                    <img src="${item.imagem}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #333;" onerror="this.src='img/produto1.jpg'">
                    <div style="flex: 1;">
                        <a href="detalhes.html?id=${item.id}" style="color: var(--branco); text-decoration: none; font-size: 13px; font-weight: 700; display: block;">${item.nome}</a>
                        <span style="color: var(--dourado); font-size: 13px;">${precoFormatado}</span>
                    </div>
                    <button class="btn-remover-favorito" data-id="${item.id}" style="background: transparent; color: #ff4444; border: none; font-size: 16px; cursor: pointer;">✕</button>
                </div>
            `);
        });

        document.querySelectorAll('.btn-remover-favorito').forEach(btn => {
            btn.onclick = function() {
                alternarFavorito(this.getAttribute('data-id'));
            };
        });
    }

    function alternarFavorito(id) {
        const produtosAtuais = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
        const prod = produtosAtuais.find(p => String(p.id) === String(id));
        if (!prod) return;

        const index = listaFavoritos.findIndex(f => String(f.id) === String(id));
        if (index > -1) {
            listaFavoritos.splice(index, 1);
            if (typeof mostrarToast === 'function') mostrarToast(`"${prod.nome}" removido dos favoritos.`);
        } else {
            let foto = (prod.imagens && prod.imagens.length > 0) ? prod.imagens[0] : (prod.imagem || 'img/produto1.jpg');
            const precoEfetivo = prod.precoPromocional || prod.preco;
            listaFavoritos.push({ id: prod.id, nome: prod.nome, preco: precoEfetivo, imagem: foto });
            if (typeof mostrarToast === 'function') mostrarToast(`"${prod.nome}" salvo nos favoritos! ❤️`);
        }

        localStorage.setItem('vr_modas_favoritos', JSON.stringify(listaFavoritos));
        atualizarContadorFavoritos();
        renderizarListaFavoritos();
        filtrarEOrdenarCatalogo();
    }

    if (abrirFavoritos && favoritosLateral) {
        abrirFavoritos.onclick = () => {
            renderizarListaFavoritos();
            favoritosLateral.classList.add('aberto');
        };
    }
    if (fecharFavoritos && favoritosLateral) {
        fecharFavoritos.onclick = () => favoritosLateral.classList.remove('aberto');
    }

    // ==========================================
    // 3. PESQUISA E FILTROS DO CATÁLOGO
    // ==========================================
    const inputBusca = document.getElementById('input-busca');
    const btnBusca = document.getElementById('btn-busca');
    const selectOrdenacao = document.getElementById('ordenar-produtos');
    const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
    const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
    const contagemTopo = document.getElementById('contagem-produtos-topo');

    const urlParamsConsulta = new URLSearchParams(window.location.search);
    let categoriaAtivaFiltro = urlParamsConsulta.get('categoria') || 'todos';

    function normalizarTexto(txt) {
        if (!txt) return '';
        return txt.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function filtrarEOrdenarCatalogo() {
        if (!vitrineProdutos) return;
        let resultado = JSON.parse(localStorage.getItem('vr_modas_db')) || [];

        if (categoriaAtivaFiltro === 'ofertas') {
            resultado = resultado.filter(p => !!p.promocao || !!p.precoPromocional);
        } else if (categoriaAtivaFiltro === 'acessorios') {
            resultado = resultado.filter(p => {
                const c = normalizarTexto(p.categoria);
                return ['acessorio', 'acessorios', 'bolsa', 'bolsas', 'cinto', 'cintos', 'joia', 'joias'].some(term => c.includes(term));
            });
        } else if (categoriaAtivaFiltro !== 'todos') {
            const alvo = normalizarTexto(categoriaAtivaFiltro);
            resultado = resultado.filter(p => normalizarTexto(p.categoria).includes(alvo));
        }

        if (inputBusca && inputBusca.value.trim() !== '') {
            const termo = normalizarTexto(inputBusca.value);
            resultado = resultado.filter(p => normalizarTexto(p.nome).includes(termo) || normalizarTexto(p.categoria).includes(termo));
        }

        const radioPreco = document.querySelector('.filtro-preco:checked');
        if (radioPreco) {
            const valorFaixa = radioPreco.value;
            resultado = resultado.filter(p => {
                const precoComp = Number(p.precoPromocional || p.preco);
                if (valorFaixa === 'ate-150') return precoComp <= 150;
                if (valorFaixa === '150-250') return precoComp > 150 && precoComp <= 250;
                if (valorFaixa === 'acima-250') return precoComp > 250;
                return true;
            });
        }

        const tamanhosSelecionados = Array.from(document.querySelectorAll('.filtro-tamanho:checked')).map(cb => cb.value);
        if (tamanhosSelecionados.length > 0) {
            resultado = resultado.filter(p => p.tamanhos && p.tamanhos.some(t => tamanhosSelecionados.includes(t)));
        }

        if (selectOrdenacao) {
            const criterio = selectOrdenacao.value;
            if (criterio === 'menor-preco') resultado.sort((a, b) => Number(a.precoPromocional || a.preco) - Number(b.precoPromocional || b.preco));
            else if (criterio === 'maior-preco') resultado.sort((a, b) => Number(b.precoPromocional || b.preco) - Number(a.precoPromocional || a.preco));
            else if (criterio === 'nome-az') resultado.sort((a, b) => a.nome.localeCompare(b.nome));
            else if (criterio === 'recentes') resultado.sort((a, b) => (b.id || 0) - (a.id || 0));
        }

        if (contagemTopo) {
            contagemTopo.innerText = `${resultado.length} peça(s) encontrada(s)`;
        }

        renderizarVitrine(resultado);
    }

    const botoesChips = document.querySelectorAll('.chip-cat');
    if (botoesChips.length > 0) {
        botoesChips.forEach(chip => {
            chip.onclick = function(e) {
                e.preventDefault();
                botoesChips.forEach(c => c.classList.remove('ativo'));
                this.classList.add('ativo');
                categoriaAtivaFiltro = this.getAttribute('data-categoria');
                filtrarEOrdenarCatalogo();
            };
        });

        if (categoriaAtivaFiltro !== 'todos') {
            botoesChips.forEach(c => {
                if (c.getAttribute('data-categoria') === categoriaAtivaFiltro) {
                    botoesChips.forEach(b => b.classList.remove('ativo'));
                    c.classList.add('ativo');
                }
            });
        }
    }

    if (inputBusca) {
        inputBusca.addEventListener('input', filtrarEOrdenarCatalogo);
        inputBusca.addEventListener('keyup', (e) => { 
            if (e.key === 'Enter') filtrarEOrdenarCatalogo(); 
        });
    }
    if (btnBusca) {
        btnBusca.addEventListener('click', (e) => {
            e.preventDefault();
            filtrarEOrdenarCatalogo();
        });
    }
    if (btnAplicarFiltros) btnAplicarFiltros.onclick = filtrarEOrdenarCatalogo;
    if (selectOrdenacao) selectOrdenacao.onchange = filtrarEOrdenarCatalogo;

    if (btnLimparFiltros) {
        btnLimparFiltros.onclick = () => {
            document.querySelectorAll('.filtro-tamanho').forEach(cb => cb.checked = false);
            const radioPadrao = document.querySelector('.filtro-preco[value="todos"]');
            if (radioPadrao) radioPadrao.checked = true;
            if (selectOrdenacao) selectOrdenacao.value = 'padrao';
            if (inputBusca) inputBusca.value = '';
            categoriaAtivaFiltro = 'todos';
            
            botoesChips.forEach(c => c.classList.remove('ativo'));
            const chipTodos = document.querySelector('.chip-cat[data-categoria="todos"]');
            if (chipTodos) chipTodos.classList.add('ativo');

            filtrarEOrdenarCatalogo();
            if (typeof mostrarToast === 'function') mostrarToast("Filtros limpos!");
        };
    }

    filtrarEOrdenarCatalogo();

    // ==========================================
    // 4. PÁGINA DE DETALHES (CORREÇÃO DE FOTOS E CORES)
    // ==========================================
    const urlParams = new URLSearchParams(window.location.search);
    const produtoIdNaUrl = urlParams.get('id');
    const paginaDetalhes = document.getElementById('container-detalhes');
    if (paginaDetalhes && produtoIdNaUrl) {
        const produtosAtuais = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
        const produtoSelecionado = produtosAtuais.find(p => String(p.id) === String(produtoIdNaUrl));
        if (produtoSelecionado) {
            paginaDetalhes.style.display = 'block';
            document.getElementById('detalhe-nome').innerText = produtoSelecionado.nome;
            
            // Exibição do Preço na Página de Detalhes
            const elPrecoDetalhe = document.getElementById('detalhe-preco');
            if (elPrecoDetalhe) {
                const precoFormatado = Number(produtoSelecionado.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                if (produtoSelecionado.precoPromocional && Number(produtoSelecionado.precoPromocional) < Number(produtoSelecionado.preco)) {
                    const promoFormatado = Number(produtoSelecionado.precoPromocional).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    elPrecoDetalhe.innerHTML = `
                        <span style="text-decoration: line-through; color: #777; font-size: 16px; margin-right: 8px;">${precoFormatado}</span>
                        <span>${promoFormatado}</span>
                    `;
                } else {
                    elPrecoDetalhe.innerText = precoFormatado;
                }
            }

            document.getElementById('detalhe-descricao').innerText = produtoSelecionado.descricao || "Sem descrição no momento.";

            // Proteção garantida para carregar fotos
            let listaDeFotos = [];
            if (produtoSelecionado.imagens && produtoSelecionado.imagens.length > 0) {
                listaDeFotos = produtoSelecionado.imagens;
            } else if (produtoSelecionado.imagem) {
                listaDeFotos = [produtoSelecionado.imagem];
            } else {
                listaDeFotos = ['img/produto1.jpg'];
            }

            const imgPrincipalEl = document.getElementById('detalhe-img');
            if (imgPrincipalEl) {
                imgPrincipalEl.src = listaDeFotos[0];
                imgPrincipalEl.onerror = () => { imgPrincipalEl.src = 'img/produto1.jpg'; };
            }

            const containerGaleria = document.querySelector('.galeria');
            if (containerGaleria) {
                let htmlGaleria = `<img src="${listaDeFotos[0]}" class="img-principal" id="detalhe-img" alt="${produtoSelecionado.nome}" onerror="this.src='img/produto1.jpg'">`;
                if (listaDeFotos.length > 1) {
                    htmlGaleria += `<div class="miniaturas">`;
                    listaDeFotos.forEach((foto, index) => {
                        const borda = index === 0 ? 'var(--dourado)' : 'transparent';
                        htmlGaleria += `<img src="${foto}" class="miniatura-foto" style="border-color: ${borda};" onclick="trocarFotoPrincipal(this)" onerror="this.src='img/produto1.jpg'">`;
                    });
                    htmlGaleria += `</div>`;
                }
                containerGaleria.innerHTML = htmlGaleria;
            }

            // Renderiza tamanhos
            const containerTamanhos = document.getElementById('detalhe-tamanhos');
            if (containerTamanhos) {
                containerTamanhos.innerHTML = '';
                if (produtoSelecionado.tamanhos && produtoSelecionado.tamanhos.length > 0) {
                    produtoSelecionado.tamanhos.forEach((tam, index) => {
                        containerTamanhos.innerHTML += `<label><input type="radio" name="tamanho" value="${tam}" ${index === 0 ? 'checked' : ''}><span class="box-tamanho">${tam}</span></label>`;
                    });
                }
            }

            // Renderiza cores
            const containerCores = document.getElementById('detalhe-cores');
            if (containerCores) {
                containerCores.innerHTML = '';
                if (produtoSelecionado.cores) {
                    const mapaCores = {
                        'preto': '#000000', 'preta': '#000000',
                        'branco': '#ffffff', 'branca': '#ffffff',
                        'dourado': '#d4af37', 'dourada': '#d4af37',
                        'azul': '#1e88e5', 'azul marinho': '#0d2340', 'azul claro': '#64b5f6',
                        'rosa': '#e91e63', 'rosa claro': '#f48fb1', 'pink': '#ff007f',
                        'vermelho': '#d32f2f', 'vermelha': '#d32f2f',
                        'verde': '#2e7d32', 'verde militar': '#4b5320', 'verde agua': '#20b2aa',
                        'amarelo': '#fbc02d', 'amarela': '#fbc02d',
                        'laranja': '#f57c00', 'roxo': '#7b1fa2', 'roxa': '#7b1fa2',
                        'lilas': '#ba68c8', 'lilás': '#ba68c8', 'marrom': '#5d4037',
                        'bege': '#d7ccc8', 'cinza': '#757575', 'vinho': '#580c1f',
                        'bordo': '#580c1f', 'bordô': '#580c1f', 'nude': '#e0ac69'
                    };

                    const listaCores = produtoSelecionado.cores.split(',');
                    listaCores.forEach((corRaw, index) => {
                        const corNome = corRaw.trim();
                        const corChave = corNome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        let corFundo = mapaCores[corChave] || corNome;
                        const estiloBorda = (corChave === 'branco' || corChave === 'branca') ? 'border: 1px solid #777;' : '';

                        containerCores.insertAdjacentHTML('beforeend', `
                            <label style="cursor: pointer; position: relative;">
                                <input type="radio" name="cor" value="${corNome}" ${index === 0 ? 'checked' : ''} style="display: none;">
                                <span class="box-cor" 
                                      style="display: inline-block; width: 34px; height: 34px; border-radius: 50%; background-color: ${corFundo}; ${estiloBorda} cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" 
                                      title="${corNome}">
                                </span>
                            </label>
                        `);
                    });
                }
            }
        }
    }

    const inputQtdDetalhes = document.getElementById('qtd-produto');
    const containerQtdDetalhes = document.querySelector('.controle-qtd') || (inputQtdDetalhes ? inputQtdDetalhes.parentElement : null);

    if (containerQtdDetalhes) {
        containerQtdDetalhes.addEventListener('click', (e) => {
            const alvo = e.target;
            const textoBotao = alvo.innerText.trim();

            if (textoBotao === '+' || alvo.classList.contains('btn-mais')) {
                e.preventDefault();
                let atual = parseInt(inputQtdDetalhes.value || inputQtdDetalhes.innerText || '1');
                atual = isNaN(atual) ? 1 : atual + 1;
                if (inputQtdDetalhes.tagName === 'INPUT') inputQtdDetalhes.value = atual;
                else inputQtdDetalhes.innerText = atual;
            } else if (textoBotao === '-' || alvo.classList.contains('btn-menos')) {
                e.preventDefault();
                let atual = parseInt(inputQtdDetalhes.value || inputQtdDetalhes.innerText || '1');
                atual = isNaN(atual) ? 1 : atual - 1;
                if (atual < 1) atual = 1;
                if (inputQtdDetalhes.tagName === 'INPUT') inputQtdDetalhes.value = atual;
                else inputQtdDetalhes.innerText = atual;
            }
        });
    }

    const btnVoltar = document.getElementById('btn-voltar');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', (e) => {
            e.preventDefault();
            if (document.referrer && document.referrer.includes(window.location.host)) {
                window.history.back();
            } else {
                window.location.href = 'produtos.html';
            }
        });
    }

    // ==========================================
    // 5. SACOLA COM CUPOM DE DESCONTO E PARCELAMENTO
    // ==========================================
    const carrinhoLateral = document.getElementById('carrinho-lateral');
    const btnAbrirCarrinho = document.getElementById('abrir-carrinho');
    const btnFecharCarrinho = document.getElementById('fechar-carrinho');
    if (btnAbrirCarrinho) btnAbrirCarrinho.onclick = () => carrinhoLateral.classList.add('aberto');
    if (btnFecharCarrinho) btnFecharCarrinho.onclick = () => carrinhoLateral.classList.remove('aberto');

    const listaItens = document.getElementById('lista-itens');
    let totalCarrinho = 0; 
    let qtdItensCarrinho = 0;
    let itensNoCarrinhoData = [];

    let metodoPagamentoSelecionado = 'pix';
    let parcelaSelecionada = 1;
    let cupomAtivo = null;

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
        if (!containerTotal) return;

        let maxParcelasGeral = 12;
        let parcelasSemJurosGeral = 12;
        let taxaJurosGeral = 2.99;

        itensNoCarrinhoData.forEach(item => {
            if (item.regrasPagamento) {
                if (item.regrasPagamento.maxParcelas < maxParcelasGeral) maxParcelasGeral = item.regrasPagamento.maxParcelas;
                if (item.regrasPagamento.parcelasSemJuros < parcelasSemJurosGeral) parcelasSemJurosGeral = item.regrasPagamento.parcelasSemJuros;
                if (item.regrasPagamento.taxaJuros) taxaJurosGeral = item.regrasPagamento.taxaJuros;
            }
        });

        if (maxParcelasGeral < 1) maxParcelasGeral = 1;

        const blocoExistente = document.getElementById('bloco-pagamento-sacola');
        if (blocoExistente) blocoExistente.remove();

        if (itensNoCarrinhoData.length === 0) return;

        let valorDesconto = 0;
        if (cupomAtivo) {
            if (cupomAtivo.tipo === 'porcentagem') {
                valorDesconto = (totalCarrinho * cupomAtivo.valor) / 100;
            } else {
                valorDesconto = cupomAtivo.valor;
            }
        }
        const totalFinalCalculado = Math.max(0, totalCarrinho - valorDesconto);

        let opcoesParcelasHTML = '';
        for (let i = 1; i <= maxParcelasGeral; i++) {
            if (i <= parcelasSemJurosGeral) {
                const valorParcela = totalFinalCalculado / i;
                opcoesParcelasHTML += `<option value="${i}">${i}x de ${valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sem juros</option>`;
            } else {
                const taxa = taxaJurosGeral / 100;
                const valorComJuros = totalFinalCalculado * Math.pow(1 + taxa, i);
                const valorParcela = valorComJuros / i;
                opcoesParcelasHTML += `<option value="${i}">${i}x de ${valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (com juros)</option>`;
            }
        }

        const htmlPagamento = `
            <div id="bloco-pagamento-sacola" style="background: #111; padding: 12px; border-radius: 6px; border: 1px solid #2a2a2a; margin-bottom: 12px;">
                <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                    <input type="text" id="input-cupom-sacola" placeholder="Cupom de desconto" value="${cupomAtivo ? cupomAtivo.codigo : ''}" style="flex: 1; background: #0a0a0a; border: 1px solid #333; color: #fff; padding: 7px 10px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">
                    <button type="button" id="btn-aplicar-cupom-sacola" style="background: var(--dourado); color: #000; border: none; padding: 7px 12px; border-radius: 4px; font-weight: 700; font-size: 11px; cursor: pointer;">Aplicar</button>
                </div>
                ${cupomAtivo ? `<div style="color: #4caf50; font-size: 11px; margin-bottom: 8px; font-weight: 700;">✓ Cupom ${cupomAtivo.codigo} aplicado (-R$ ${valorDesconto.toFixed(2)})</div>` : ''}

                <label style="font-size: 11px; text-transform: uppercase; color: var(--dourado); font-weight: 700; display: block; margin-bottom: 8px;">Forma de Pagamento</label>
                
                <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                    <button type="button" class="btn-metodo-pag ${metodoPagamentoSelecionado === 'pix' ? 'ativo' : ''}" data-metodo="pix" style="flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 4px; border: 1px solid #333; background: ${metodoPagamentoSelecionado === 'pix' ? 'var(--dourado)' : '#1a1a1a'}; color: ${metodoPagamentoSelecionado === 'pix' ? '#000' : '#fff'}; cursor: pointer;">💠 Pix</button>
                    <button type="button" class="btn-metodo-pag ${metodoPagamentoSelecionado === 'credito' ? 'ativo' : ''}" data-metodo="credito" style="flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 4px; border: 1px solid #333; background: ${metodoPagamentoSelecionado === 'credito' ? 'var(--dourado)' : '#1a1a1a'}; color: ${metodoPagamentoSelecionado === 'credito' ? '#000' : '#fff'}; cursor: pointer;">💳 Crédito</button>
                    <button type="button" class="btn-metodo-pag ${metodoPagamentoSelecionado === 'debito' ? 'ativo' : ''}" data-metodo="debito" style="flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 700; border-radius: 4px; border: 1px solid #333; background: ${metodoPagamentoSelecionado === 'debito' ? 'var(--dourado)' : '#1a1a1a'}; color: ${metodoPagamentoSelecionado === 'debito' ? '#000' : '#fff'}; cursor: pointer;">💳 Débito</button>
                </div>

                <div id="seletor-parcelas-container" style="display: ${metodoPagamentoSelecionado === 'credito' ? 'block' : 'none'};">
                    <label style="font-size: 11px; color: #888; display: block; margin-bottom: 4px;">Opções de Parcelamento:</label>
                    <select id="select-parcelamento" style="width: 100%; background: #0a0a0a; border: 1px solid #333; color: var(--branco); padding: 8px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                        ${opcoesParcelasHTML}
                    </select>
                </div>
            </div>
        `;

        const totalElement = containerTotal.querySelector('.carrinho-total');
        if (totalElement) {
            totalElement.insertAdjacentHTML('beforebegin', htmlPagamento);
        }

        const valorEl = document.getElementById('valor-total');
        if (valorEl) {
            valorEl.innerText = totalFinalCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        const btnCupom = document.getElementById('btn-aplicar-cupom-sacola');
        if (btnCupom) {
            btnCupom.onclick = function() {
                const codDigitado = document.getElementById('input-cupom-sacola').value.trim().toUpperCase();
                const cuponsDisponiveis = JSON.parse(localStorage.getItem('vr_modas_cupons')) || [
                    { id: 1, codigo: 'BEMVINDA10', tipo: 'porcentagem', valor: 10 }
                ];

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

        const selectParcelas = document.getElementById('select-parcelamento');
        if (selectParcelas) {
            selectParcelas.value = parcelaSelecionada;
            selectParcelas.onchange = function() {
                parcelaSelecionada = parseInt(this.value);
            };
        }
    }

    function atualizarContadores(qtd, total) {
        document.querySelectorAll('.contador-carrinho').forEach(el => el.innerText = qtd);
        const valorEl = document.getElementById('valor-total');
        if (valorEl) valorEl.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    const btnAdicionarSacola = document.getElementById('btn-adicionar-sacola');
    if (btnAdicionarSacola) {
        btnAdicionarSacola.onclick = () => {
            const nomeStr = document.getElementById('detalhe-nome').innerText;
            const tamSelecionado = document.querySelector('input[name="tamanho"]:checked')?.value || 'Padrão';
            const corSelecionada = document.querySelector('input[name="cor"]:checked')?.value || 'Padrão';

            const produtosAtuais = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
            const prodRef = produtosAtuais.find(p => String(p.id) === String(produtoIdNaUrl));
            
            // Cobra o preço promocional caso exista e seja menor
            let precoCobrado = prodRef?.preco || 0;
            if (prodRef?.precoPromocional && Number(prodRef.precoPromocional) < Number(prodRef.preco)) {
                precoCobrado = Number(prodRef.precoPromocional);
            }

            const imgEl = document.getElementById('detalhe-img');
            const fotoAtual = imgEl ? imgEl.src : 'img/produto1.jpg';

            let qtd = 1;
            if (inputQtdDetalhes) {
                qtd = parseInt(inputQtdDetalhes.value || inputQtdDetalhes.innerText || '1');
            }
            if (isNaN(qtd) || qtd < 1) qtd = 1;

            const regrasPagamento = prodRef?.pagamento || { maxParcelas: 3, parcelasSemJuros: 3, taxaJuros: 2.99 };

            const itemExistente = itensNoCarrinhoData.find(it => it.nome === nomeStr && it.tamanho === tamSelecionado && it.cor === corSelecionada);

            if (itemExistente) {
                itemExistente.quantidade += qtd;
            } else {
                itensNoCarrinhoData.push({
                    idRef: Date.now(),
                    nome: nomeStr,
                    preco: precoCobrado,
                    quantidade: qtd,
                    tamanho: tamSelecionado,
                    cor: corSelecionada,
                    imagem: fotoAtual,
                    regrasPagamento: regrasPagamento
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
                item.quantidade += 1;
                renderizarSacola();
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

            const clienteSessao = JSON.parse(sessionStorage.getItem('vr_cliente_dados')) || null;
            const clienteNome = clienteSessao ? clienteSessao.nome : "Cliente Visitante";
            const clienteWhats = clienteSessao ? clienteSessao.whatsapp : "Não informado";
            
            // Montagem sem quebra de sintaxe
            const clienteEndereco = (clienteSessao && clienteSessao.endereco) ? 
                `${clienteSessao.endereco.rua || ''}, Nº ${clienteSessao.endereco.numero || 'S/N'} - ${clienteSessao.endereco.bairro || ''}, ${clienteSessao.endereco.cidade || ''} (CEP: ${clienteSessao.endereco.cep || ''})` : 
                "Retirada na Loja / A combinar";

            const numeroPedido = `#VR-${Math.floor(1000 + Math.random() * 9000)}`;
            const agora = new Date();
            const dataHora = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

            let detalhePagamento = "Pix à vista";
            if (metodoPagamentoSelecionado === 'debito') {
                detalhePagamento = "Cartão de Débito à vista";
            } else if (metodoPagamentoSelecionado === 'credito') {
                detalhePagamento = `Cartão de Crédito em ${parcelaSelecionada}x`;
            }

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
                formaPagamento: detalhePagamento,
                cupom: cupomAtivo ? cupomAtivo.codigo : null,
                total: totalComDesconto,
                status: "Pendente"
            };

            let pedidosAtuais = JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [];
            pedidosAtuais.unshift(novoPedido);
            localStorage.setItem('vr_modas_pedidos', JSON.stringify(pedidosAtuais));

            itensNoCarrinhoData = [];
            cupomAtivo = null;
            renderizarSacola();
            if (carrinhoLateral) carrinhoLateral.classList.remove('aberto');

            alert(`🎉 Pedido ${numeroPedido} realizado com sucesso!\nForma de Pagamento: ${detalhePagamento}\nO administrador da VR Modas já recebeu o seu pedido.`);
            if (typeof mostrarToast === 'function') mostrarToast(`Pedido ${numeroPedido} registrado!`);
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

window.trocarFotoPrincipal = function(el) { 
    const imgEl = document.getElementById('detalhe-img');
    if (imgEl) imgEl.src = el.src; 
    document.querySelectorAll('.miniatura-foto').forEach(i => i.style.borderColor = 'transparent'); 
    el.style.borderColor = 'var(--dourado)'; 
};