let listaFavoritos = JSON.parse(localStorage.getItem('vr_modas_favoritos')) || [];

function normalizarTexto(txt) {
    if (!txt) return '';
    return txt.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
    if (typeof filtrarEOrdenarCatalogo === 'function') filtrarEOrdenarCatalogo();
}

function atualizarContadorFavoritos() {
    document.querySelectorAll('.contador-favoritos').forEach(el => el.innerText = listaFavoritos.length);
}

function renderizarListaFavoritos() {
    const listaFavoritosEl = document.getElementById('lista-favoritos');
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

document.addEventListener('DOMContentLoaded', () => {
    const vitrineProdutos = document.getElementById('vitrine-produtos');
    const inputBusca = document.getElementById('input-busca');
    const btnBusca = document.getElementById('btn-busca');
    const selectOrdenacao = document.getElementById('ordenar-produtos');
    const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
    const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
    const contagemTopo = document.getElementById('contagem-produtos-topo');

    const urlParamsConsulta = new URLSearchParams(window.location.search);
    let categoriaAtivaFiltro = urlParamsConsulta.get('categoria') || 'todos';

    function renderizarVitrine(lista) {
        if (!vitrineProdutos) return;
        vitrineProdutos.innerHTML = ''; 
        if (lista.length === 0) {
            vitrineProdutos.innerHTML = '<p style="color: white; width: 100%; text-align: center; padding: 40px; grid-column: 1 / -1;">Nenhum produto encontrado com os filtros selecionados.</p>';
            return;
        }

        lista.forEach(produto => {
            const estoqueDisponivel = parseInt(produto.estoque || 0);
            const estaEsgotado = estoqueDisponivel <= 0;

            const precoFormatado = Number(produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const linkDetalhes = `detalhes.html?id=${produto.id}`;
            
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

            let fotoPrincipal = (produto.imagens && produto.imagens.length > 0) ? produto.imagens[0] : (produto.imagem || 'img/produto1.jpg');
            const isFav = listaFavoritos.some(fav => String(fav.id) === String(produto.id));
            const coracaoIcone = isFav ? '❤️' : '🤍';

            const badgeEsgotadoHTML = estaEsgotado ? `<span class="badge-esgotado-foto">Esgotado</span>` : '';
            const btnAcaoHTML = estaEsgotado 
                ? `<button type="button" class="btn-comprar btn-desativado" disabled>Esgotado</button>`
                : `<a href="${linkDetalhes}" class="btn-comprar">Ver Detalhes</a>`;

            vitrineProdutos.insertAdjacentHTML('beforeend', `
                <div class="card-produto ${estaEsgotado ? 'esgotado' : ''}" style="position: relative;">
                    ${badgeEsgotadoHTML}
                    <button type="button" class="btn-favoritar-card" data-id="${produto.id}" title="Favoritar">
                        ${coracaoIcone}
                    </button>
                    <a href="${estaEsgotado ? '#' : linkDetalhes}">
                        <img src="${fotoPrincipal}" class="imagem-produto" alt="${produto.nome}" onerror="this.src='img/produto1.jpg'">
                    </a>
                    <div class="card-info">
                        <a href="${estaEsgotado ? '#' : linkDetalhes}">
                            <h3>${produto.nome}</h3>
                        </a>
                        ${precoHTML}
                        ${btnAcaoHTML}
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

    window.filtrarEOrdenarCatalogo = function() {
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
    };

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
        inputBusca.addEventListener('keyup', (e) => { if (e.key === 'Enter') filtrarEOrdenarCatalogo(); });
    }
    if (btnBusca) btnBusca.onclick = (e) => { e.preventDefault(); filtrarEOrdenarCatalogo(); };
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

    const abrirFavoritos = document.getElementById('abrir-favoritos');
    const fecharFavoritos = document.getElementById('fechar-favoritos');
    const favoritosLateral = document.getElementById('favoritos-lateral');

    if (abrirFavoritos && favoritosLateral) {
        abrirFavoritos.onclick = () => {
            renderizarListaFavoritos();
            favoritosLateral.classList.add('aberto');
        };
    }
    if (fecharFavoritos && favoritosLateral) {
        fecharFavoritos.onclick = () => favoritosLateral.classList.remove('aberto');
    }

    atualizarContadorFavoritos();
    filtrarEOrdenarCatalogo();
});