/* =====================================================
   CATÁLOGO, VITRINE & AVALIAÇÕES NOS CARDS - VR MODAS
   Conectado de forma segura ao Banco de Dados Neon
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

/**
 * Busca todas as avaliações no Neon e agrupa média e total por produto
 */
async function sincronizarAvaliacoesVitrine() {
    let listaAv = [];

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (sql) {
            const res = await sql`SELECT produto_id, produto_nome, nota FROM avaliacoes;`;
            if (Array.isArray(res)) {
                listaAv = res;
                localStorage.setItem('vr_modas_avaliacoes', JSON.stringify(res));
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
        const chaveId = av.produto_id ? `id_${String(av.produto_id).trim()}` : null;
        const chaveNome = av.produto_nome ? `nome_${String(av.produto_nome).toLowerCase().trim()}` : null;

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

function obterResumoAvaliacaoProduto(produto) {
    const porId = mapaAvaliacoesProdutos[`id_${String(produto.id).trim()}`];
    const porNome = produto.nome ? mapaAvaliacoesProdutos[`nome_${String(produto.nome).toLowerCase().trim()}`] : null;
    const dados = porId || porNome;

    if (!dados || dados.qtd === 0) {
        return { media: 0, qtd: 0 };
    }
    return {
        media: dados.soma / dados.qtd,
        qtd: dados.qtd
    };
}

function gerarHtmlEstrelasCard(produto) {
    const { media, qtd } = obterResumoAvaliacaoProduto(produto);

    if (qtd === 0) {
        return `
            <div class="card-avaliacao-badge" style="display: flex; align-items: center; gap: 4px; margin: 2px 0 6px 0; min-height: 16px;">
                <span style="color: #444; font-size: 12px; letter-spacing: 1px;">★★★★★</span>
                <span style="color: #666; font-size: 10.5px;">Novo</span>
            </div>
        `;
    }

    const estrelasCheias = Math.round(media);
    let estrelasHtml = '';
    for (let i = 1; i <= 5; i++) {
        estrelasHtml += `<span style="color: ${i <= estrelasCheias ? 'var(--dourado, #d4af37)' : '#444'};">★</span>`;
    }

    return `
        <div class="card-avaliacao-badge" style="display: flex; align-items: center; gap: 5px; margin: 2px 0 6px 0; min-height: 16px;">
            <span style="font-size: 12px; letter-spacing: 0.5px; line-height: 1;">${estrelasHtml}</span>
            <span style="color: #ddd; font-size: 11px; font-weight: 700;">${media.toFixed(1)}</span>
            <span style="color: #777; font-size: 10.5px;">(${qtd})</span>
        </div>
    `;
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

    function normalizarTexto(txt) {
        if (!txt) return '';
        return txt.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    window.renderizarVitrine = function (lista) {
        if (!vitrineProdutos) return;
        vitrineProdutos.innerHTML = '';

        if (!lista || lista.length === 0) {
            vitrineProdutos.innerHTML = '<p style="color: white; width: 100%; text-align: center; padding: 40px; grid-column: 1 / -1;">Nenhum produto cadastrado ou encontrado com os filtros selecionados.</p>';
            return;
        }

        const favs = JSON.parse(localStorage.getItem('vr_modas_favoritos')) || [];

        lista.forEach(produto => {
            const estoqueDisponivel = parseInt(produto.estoque || 0);
            const estaEsgotado = estoqueDisponivel <= 0;

            const idFormatado = encodeURIComponent(String(produto.id).trim());
            const linkDetalhes = `detalhes.html?id=${idFormatado}`;
            const nomeSeguro = escaparHtmlCatalogo(produto.nome);

            const precoFormatado = Number(produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            let precoHTML = `<p class="preco">${precoFormatado}</p>`;
            if (produto.precoPromocional && Number(produto.precoPromocional) < Number(produto.preco)) {
                const promoFormatado = Number(produto.precoPromocional).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                precoHTML = `
                    <p class="preco" style="display: flex; flex-direction: column; gap: 2px;">
                        <span style="text-decoration: line-through; color: #777; font-size: 11px; font-weight: normal;">${precoFormatado}</span>
                        <span style="color: var(--dourado, #d4af37); font-weight: 800;">${promoFormatado}</span>
                    </p>
                `;
            }

            const estrelasCardHTML = gerarHtmlEstrelasCard(produto);
            let fotoPrincipal = (produto.imagens && produto.imagens.length > 0) ? produto.imagens[0] : (produto.imagem || 'img/produto1.jpg');
            const isFav = favs.some(fav => String(fav.id) === String(produto.id));
            const coracaoIcone = isFav ? '❤️' : '🤍';

            const badgeEsgotadoHTML = estaEsgotado ? `<span class="badge-esgotado-foto">Esgotado</span>` : '';

            const btnAcaoHTML = estaEsgotado
                ? `<button type="button" class="btn-comprar btn-desativado" disabled>Esgotado</button>`
                : `<a href="${linkDetalhes}" class="btn-comprar btn-link-detalhes" data-url="${linkDetalhes}">Ver Detalhes</a>`;

            vitrineProdutos.insertAdjacentHTML('beforeend', `
                <div class="card-produto ${estaEsgotado ? 'esgotado' : ''}" style="position: relative;">
                    ${badgeEsgotadoHTML}
                    <button type="button" class="btn-favoritar-card" data-id="${produto.id}" title="Favoritar">
                        ${coracaoIcone}
                    </button>
                    <a href="${estaEsgotado ? '#' : linkDetalhes}" class="card-link-foto">
                        <img src="${fotoPrincipal}" class="imagem-produto" alt="${nomeSeguro}" onerror="this.src='img/produto1.jpg'">
                    </a>
                    <div class="card-info">
                        <a href="${estaEsgotado ? '#' : linkDetalhes}">
                            <h3 style="margin-bottom: 2px;">${nomeSeguro}</h3>
                        </a>
                        ${estrelasCardHTML}
                        ${precoHTML}
                        ${btnAcaoHTML}
                    </div>
                </div>
            `);
        });

        vitrineProdutos.querySelectorAll('.btn-favoritar-card').forEach(btn => {
            btn.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof alternarFavorito === 'function') {
                    alternarFavorito(this.getAttribute('data-id'));
                }
            };
        });

        vitrineProdutos.querySelectorAll('.btn-link-detalhes').forEach(btn => {
            btn.onclick = function () {
                const destino = this.getAttribute('data-url');
                if (destino) {
                    window.location.href = destino;
                }
            };
        });
    };

    window.filtrarEOrdenarCatalogo = function () {
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
            else if (criterio === 'melhores-avaliados') {
                resultado.sort((a, b) => obterResumoAvaliacaoProduto(b).media - obterResumoAvaliacaoProduto(a).media);
            }
        }

        if (contagemTopo) {
            contagemTopo.innerText = `${resultado.length} peça(s) encontrada(s)`;
        }

        window.renderizarVitrine(resultado);
    };

    const botoesChips = document.querySelectorAll('.chip-cat');
    if (botoesChips.length > 0) {
        botoesChips.forEach(chip => {
            chip.onclick = function (e) {
                e.preventDefault();
                botoesChips.forEach(c => c.classList.remove('ativo'));
                this.classList.add('ativo');
                categoriaAtivaFiltro = this.getAttribute('data-categoria');
                window.filtrarEOrdenarCatalogo();
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
        inputBusca.addEventListener('input', window.filtrarEOrdenarCatalogo);
        inputBusca.addEventListener('keyup', (e) => { if (e.key === 'Enter') window.filtrarEOrdenarCatalogo(); });
    }
    if (btnBusca) btnBusca.onclick = (e) => { e.preventDefault(); window.filtrarEOrdenarCatalogo(); };
    if (btnAplicarFiltros) btnAplicarFiltros.onclick = (e) => { e.preventDefault(); window.filtrarEOrdenarCatalogo(); };
    if (selectOrdenacao) selectOrdenacao.onchange = window.filtrarEOrdenarCatalogo;

    document.addEventListener('click', (e) => {
        const btnResultados = e.target.closest('#btn-ver-resultados, .btn-ver-resultados');
        if (btnResultados) {
            e.preventDefault();
            window.filtrarEOrdenarCatalogo();

            const gavetaFiltros = document.getElementById('filtros-gaveta') || document.querySelector('.gaveta-filtros');
            if (gavetaFiltros) {
                gavetaFiltros.classList.remove('aberto', 'ativo');
                gavetaFiltros.style.display = 'none';
            }

            const vitrina = document.getElementById('vitrine-produtos') || document.getElementById('vitrine');
            if (vitrina) vitrina.scrollIntoView({ behavior: 'smooth' });
        }
    });

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

            window.filtrarEOrdenarCatalogo();
            if (typeof mostrarToast === 'function') mostrarToast("Filtros limpos!");
        };
    }

    window.filtrarEOrdenarCatalogo();
    sincronizarAvaliacoesVitrine();
});