/* =====================================================
   CATÁLOGO, VITRINE, FILTROS & AVALIAÇÕES - VR MODAS
   ===================================================== */

let mapaAvaliacoesProdutos = {};

function escaparHtmlCatalogo(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function urlImagemSeguraCatalogo(src) {
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
        return escaparHtmlCatalogo(val);
    }
    return 'img/produto1.jpg';
}

function obterResumoAvaliacaoProduto(produto) {
    const idChave = produto && produto.id !== undefined && produto.id !== null
        ? `id_${String(produto.id).trim()}`
        : null;
    const nomeChave = produto && produto.nome
        ? `nome_${String(produto.nome).toLowerCase().trim()}`
        : null;

    if (idChave && mapaAvaliacoesProdutos[idChave] && mapaAvaliacoesProdutos[idChave].qtd > 0) {
        const dados = mapaAvaliacoesProdutos[idChave];
        return { media: dados.soma / dados.qtd, qtd: dados.qtd };
    }
    if (nomeChave && mapaAvaliacoesProdutos[nomeChave] && mapaAvaliacoesProdutos[nomeChave].qtd > 0) {
        const dados = mapaAvaliacoesProdutos[nomeChave];
        return { media: dados.soma / dados.qtd, qtd: dados.qtd };
    }

    return { media: 0, qtd: 0 };
}

function gerarHtmlEstrelasCard(produto) {
    const { media, qtd } = obterResumoAvaliacaoProduto(produto);

    if (qtd === 0) {
        return `
            <div class="card-avaliacao-badge" style="display: flex; align-items: center; gap: 4px; margin: 3px 0 6px 0; min-height: 16px;">
                <span style="color: #555; font-size: 13px; line-height: 1;">★</span>
                <span style="color: #777; font-size: 11px; font-weight: 600;">0.0</span>
                <span style="color: #555; font-size: 10.5px;">(0)</span>
            </div>
        `;
    }

    return `
        <div class="card-avaliacao-badge" style="display: flex; align-items: center; gap: 4px; margin: 3px 0 6px 0; min-height: 16px;">
            <span style="color: var(--dourado, #d4af37); font-size: 13px; line-height: 1;">★</span>
            <span style="color: #fff; font-size: 11.5px; font-weight: 700;">${media.toFixed(1)}</span>
            <span style="color: #888; font-size: 10.5px;">(${qtd})</span>
        </div>
    `;
}

async function sincronizarAvaliacoesVitrine() {
    let listaAv = [];

    try {
        const resp = await fetch('/api/avaliacoes');
        if (resp.ok) {
            const dados = await resp.json();
            if (Array.isArray(dados.avaliacoes)) {
                listaAv = dados.avaliacoes;
                localStorage.setItem('vr_modas_avaliacoes', JSON.stringify(listaAv));
            }
        }
    } catch (e) {
        console.warn('Usando avaliações em cache na vitrine:', e.message);
    }

    if (listaAv.length === 0) {
        listaAv = JSON.parse(localStorage.getItem('vr_modas_avaliacoes')) || [];
    }

    const agrupado = {};
    listaAv.forEach(av => {
        const nota = Math.min(5, Math.max(1, Number(av.nota) || 5));
        const prodId = av.produto_id !== undefined && av.produto_id !== null ? av.produto_id : av.produtoId;
        const prodNome = av.produto_nome || av.produtoNome;

        const chaveId = prodId ? `id_${String(prodId).trim()}` : null;
        const chaveNome = prodNome ? `nome_${String(prodNome).toLowerCase().trim()}` : null;

        [chaveId, chaveNome].filter(Boolean).forEach(chave => {
            if (!agrupado[chave]) {
                agrupado[chave] = { soma: 0, qtd: 0 };
            }
            agrupado[chave].soma += nota;
            agrupado[chave].qtd += 1;
        });
    });

    mapaAvaliacoesProdutos = agrupado;

    if (typeof window.filtrarEOrdenarCatalogo === 'function') {
        window.filtrarEOrdenarCatalogo();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const vitrineEl = document.getElementById('vitrine-produtos');
    if (!vitrineEl) return;

    const urlParams = new URLSearchParams(window.location.search);
    let categoriaAtual = (urlParams.get('categoria') || 'todos').toLowerCase().trim();
    let termoBuscaAtual = (urlParams.get('busca') || '').trim().toLowerCase();

    const inputBusca = document.getElementById('input-busca');
    const btnBusca = document.getElementById('btn-busca');
    if (inputBusca && termoBuscaAtual) {
        inputBusca.value = termoBuscaAtual;
    }

    // Marca chip ativo inicial no catálogo, se existir
    document.querySelectorAll('.chip-cat').forEach(chip => {
        const catChip = (chip.getAttribute('data-categoria') || '').toLowerCase().trim();
        chip.classList.toggle('ativo', catChip === categoriaAtual);
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip-cat').forEach(c => c.classList.remove('ativo'));
            chip.classList.add('ativo');
            categoriaAtual = catChip || 'todos';
            window.filtrarEOrdenarCatalogo();
        });
    });

    function obterPrecoEfetivo(prod) {
        const normal = Number(prod.preco || 0);
        const promo = Number(prod.precoPromocional || prod.preco_promocional || 0);
        if (promo > 0 && promo < normal) return promo;
        return normal;
    }

    function ehOferta(prod) {
        const normal = Number(prod.preco || 0);
        const promo = Number(prod.precoPromocional || prod.preco_promocional || 0);
        return Boolean(prod.destaque || prod.promocao || (promo > 0 && promo < normal));
    }

    function renderizarProdutos(lista) {
        vitrineEl.innerHTML = '';

        const contadorTopo = document.getElementById('contagem-produtos-topo');
        if (contadorTopo) {
            contadorTopo.innerText = `${lista.length} ${lista.length === 1 ? 'peça' : 'peças'}`;
        }

        if (!Array.isArray(lista) || lista.length === 0) {
            vitrineEl.innerHTML = `
                <div style="text-align: center; padding: 45px 15px; color: #888; grid-column: 1 / -1;">
                    <p style="color: #fff; font-weight: 700; margin-bottom: 6px;">Nenhuma peça encontrada.</p>
                    <small>Tente alterar os filtros ou buscar por outro termo.</small>
                </div>
            `;
            return;
        }

        let favoritosIds = [];
        try {
            const favs = JSON.parse(localStorage.getItem('vr_modas_favoritos')) || [];
            favoritosIds = favs.map(f => String(f.id).trim());
        } catch (e) {
            favoritosIds = [];
        }

        lista.forEach(prod => {
            const idStr = String(prod.id || '').trim();
            const linkDetalhes = `detalhes.html?id=${encodeURIComponent(idStr)}`;
            const nomeSeguro = escaparHtmlCatalogo(prod.nome || 'Peça VR Modas');
            const fotoRaw = (Array.isArray(prod.imagens) && prod.imagens.length > 0)
                ? prod.imagens[0]
                : (prod.imagem || 'img/produto1.jpg');
            const fotoSegura = urlImagemSeguraCatalogo(fotoRaw);

            const precoNormal = Number(prod.preco || 0);
            const precoPromo = Number(prod.precoPromocional || prod.preco_promocional || 0);
            const temPromo = precoPromo > 0 && precoPromo < precoNormal;

            const precoHtml = temPromo
                ? `<span style="text-decoration: line-through; color: #777; font-size: 11.5px; margin-right: 6px;">${precoNormal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><span style="color: var(--dourado, #d4af37); font-weight: 800;">${precoPromo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>`
                : `<span style="color: var(--dourado, #d4af37); font-weight: 800;">${precoNormal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>`;

            const estaFav = favoritosIds.includes(idStr);
            const htmlEstrelas = gerarHtmlEstrelasCard(prod);

            vitrineEl.insertAdjacentHTML('beforeend', `
                <article class="card-produto" data-id="${escaparHtmlCatalogo(idStr)}" style="position: relative; display: flex; flex-direction: column;">
                    <button type="button" class="btn-favoritar-card ${estaFav ? 'ativo' : ''}" data-id="${escaparHtmlCatalogo(idStr)}" title="Favoritar" style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.65); border: none; font-size: 16px; cursor: pointer; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; z-index: 4;">
                        ${estaFav ? '❤️' : '🤍'}
                    </button>
                    <a href="${linkDetalhes}" class="card-link-foto">
                        <img src="${fotoSegura}" class="imagem-produto" alt="${nomeSeguro}" onerror="this.src='img/produto1.jpg'">
                    </a>
                    <div class="card-info">
                        <a href="${linkDetalhes}" style="text-decoration: none; color: inherit;">
                            <h3 style="margin: 0 0 2px 0; font-size: 13px;">${nomeSeguro}</h3>
                        </a>
                        ${htmlEstrelas}
                        <p class="preco" style="margin: 2px 0 10px 0; font-size: 13.5px;">${precoHtml}</p>
                        <a href="${linkDetalhes}" class="btn-comprar" style="margin-top: auto !important;">Ver Detalhes</a>
                    </div>
                </article>
            `);
        });

        vitrineEl.querySelectorAll('.btn-favoritar-card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const idProd = btn.getAttribute('data-id');
                if (typeof window.alternarFavorito === 'function') {
                    window.alternarFavorito(idProd);
                }
            });
        });
    }

    function atualizarBadgeFiltros(qtdFiltros) {
        const badge = document.getElementById('badge-filtros-ativos');
        if (!badge) return;
        if (qtdFiltros > 0) {
            badge.innerText = qtdFiltros;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }

    window.filtrarEOrdenarCatalogo = function () {
        let banco = [];
        try {
            banco = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
        } catch (e) {
            banco = [];
        }

        let filtrados = [...banco];

        if (categoriaAtual && categoriaAtual !== 'todos') {
            if (categoriaAtual === 'ofertas') {
                filtrados = filtrados.filter(p => ehOferta(p));
            } else {
                filtrados = filtrados.filter(p => String(p.categoria || '').toLowerCase().trim() === categoriaAtual);
            }
        }

        if (termoBuscaAtual) {
            filtrados = filtrados.filter(p => {
                const nome = String(p.nome || '').toLowerCase();
                const desc = String(p.descricao || '').toLowerCase();
                const cat = String(p.categoria || '').toLowerCase();
                return nome.includes(termoBuscaAtual) || desc.includes(termoBuscaAtual) || cat.includes(termoBuscaAtual);
            });
        }

        const faixaPreco = document.querySelector('input[name="filtro-preco"]:checked')?.value || 'todos';
        const tamanhosSel = Array.from(document.querySelectorAll('.filtro-tamanho:checked')).map(c => c.value);

        let qtdFiltrosAtivos = 0;
        if (faixaPreco !== 'todos') {
            qtdFiltrosAtivos++;
            filtrados = filtrados.filter(p => {
                const preco = obterPrecoEfetivo(p);
                if (faixaPreco === 'ate-150') return preco <= 150;
                if (faixaPreco === '150-250') return preco > 150 && preco <= 250;
                if (faixaPreco === 'acima-250') return preco > 250;
                return true;
            });
        }

        if (tamanhosSel.length > 0) {
            qtdFiltrosAtivos++;
            filtrados = filtrados.filter(p => {
                let tams = [];
                if (Array.isArray(p.tamanhos)) tams = p.tamanhos;
                else if (typeof p.tamanhos === 'string') {
                    try { tams = JSON.parse(p.tamanhos); } catch (e) { tams = p.tamanhos.split(','); }
                }
                const tamsNorm = tams.map(t => String(typeof t === 'object' ? (t.tamanho || '') : t).trim());
                return tamanhosSel.some(sel => tamsNorm.includes(sel));
            });
        }

        atualizarBadgeFiltros(qtdFiltrosAtivos);

        const ordem = document.getElementById('ordenar-produtos')?.value || 'padrao';
        if (ordem === 'menor-preco') {
            filtrados.sort((a, b) => obterPrecoEfetivo(a) - obterPrecoEfetivo(b));
        } else if (ordem === 'maior-preco') {
            filtrados.sort((a, b) => obterPrecoEfetivo(b) - obterPrecoEfetivo(a));
        } else if (ordem === 'recentes') {
            filtrados.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
        } else if (ordem === 'nome-az') {
            filtrados.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
        }

        // Na vitrine principal da home (quando não há seletor de ordenação), exibe os 20 lançamentos mais recentes
        const ehPaginaCatalogo = Boolean(document.getElementById('ordenar-produtos'));
        if (!ehPaginaCatalogo && categoriaAtual === 'todos' && !termoBuscaAtual) {
            renderizarProdutos(filtrados.slice(0, 20));
        } else {
            renderizarProdutos(filtrados);
        }
    };

    if (inputBusca) {
        inputBusca.addEventListener('input', () => {
            termoBuscaAtual = inputBusca.value.trim().toLowerCase();
            window.filtrarEOrdenarCatalogo();
        });
        inputBusca.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!document.getElementById('ordenar-produtos') && inputBusca.value.trim()) {
                    window.location.href = `produtos.html?busca=${encodeURIComponent(inputBusca.value.trim())}`;
                } else {
                    window.filtrarEOrdenarCatalogo();
                }
            }
        });
    }

    if (btnBusca && inputBusca) {
        btnBusca.addEventListener('click', (e) => {
            e.preventDefault();
            if (!document.getElementById('ordenar-produtos') && inputBusca.value.trim()) {
                window.location.href = `produtos.html?busca=${encodeURIComponent(inputBusca.value.trim())}`;
            } else {
                termoBuscaAtual = inputBusca.value.trim().toLowerCase();
                window.filtrarEOrdenarCatalogo();
            }
        });
    }

    const selectOrdenar = document.getElementById('ordenar-produtos');
    if (selectOrdenar) {
        selectOrdenar.addEventListener('change', () => window.filtrarEOrdenarCatalogo());
    }

    const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
    if (btnLimparFiltros) {
        btnLimparFiltros.addEventListener('click', () => {
            const radioTodos = document.querySelector('input[name="filtro-preco"][value="todos"]');
            if (radioTodos) radioTodos.checked = true;
            document.querySelectorAll('.filtro-tamanho:checked').forEach(cb => { cb.checked = false; });
            window.filtrarEOrdenarCatalogo();
        });
    }

    const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
    if (btnAplicarFiltros) {
        btnAplicarFiltros.addEventListener('click', () => window.filtrarEOrdenarCatalogo());
    }

    // Renderização inicial imediata do cache e sincronização das avaliações
    window.filtrarEOrdenarCatalogo();
    sincronizarAvaliacoesVitrine();
});