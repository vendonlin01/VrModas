/* =====================================================
   MÓDULO DE FAVORITOS - VR MODAS
   Compatível com a Gaveta Lateral e com favoritos.html
   ===================================================== */

function obterFavoritos() {
    try {
        return JSON.parse(localStorage.getItem('vr_modas_favoritos')) || [];
    } catch (e) {
        return [];
    }
}

function salvarFavoritos(lista) {
    localStorage.setItem('vr_modas_favoritos', JSON.stringify(lista));
    atualizarContadorFavoritos();
    renderizarListaFavoritos();
    renderizarPaginaFavoritos();
}

// Atualiza os contadores numéricos (ícone do topo com coração)
function atualizarContadorFavoritos() {
    const lista = obterFavoritos();
    document.querySelectorAll('.contador-favoritos').forEach(el => {
        el.innerText = lista.length;
    });
}

// Renderiza os itens dentro da gaveta lateral de favoritos
function renderizarListaFavoritos() {
    const listaFavoritosEl = document.getElementById('lista-favoritos');
    if (!listaFavoritosEl) return;

    const lista = obterFavoritos();
    listaFavoritosEl.innerHTML = '';

    if (lista.length === 0) {
        listaFavoritosEl.innerHTML = '<p style="color: var(--cinza-texto, #aaa); text-align: center; padding: 30px;">Sua lista de favoritos está vazia.</p>';
        return;
    }

    lista.forEach(item => {
        const precoFormatado = Number(item.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const foto = item.imagem || 'img/produto1.jpg';
        const nome = item.nome || 'Produto sem nome';
        const idItem = item.id !== undefined && item.id !== null ? String(item.id) : '';

        listaFavoritosEl.insertAdjacentHTML('beforeend', `
            <div class="item-na-sacola" style="display: flex; gap: 12px; align-items: center; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 10px;">
                <img src="${foto}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #333;" onerror="this.src='img/produto1.jpg'">
                <div style="flex: 1;">
                    <a href="detalhes.html?id=${idItem}" style="color: var(--branco, #fff); text-decoration: none; font-size: 13px; font-weight: 700; display: block;">${nome}</a>
                    <span style="color: var(--dourado, #d4af37); font-size: 13px;">${precoFormatado}</span>
                </div>
                <button type="button" class="btn-remover-favorito" data-id="${idItem}" data-nome="${nome}" style="background: transparent; color: #ff4444; border: none; font-size: 18px; cursor: pointer; padding: 6px;" title="Remover dos favoritos">✕</button>
            </div>
        `);
    });
}

// Renderiza a grade completa na página dedicada favoritos.html
function renderizarPaginaFavoritos() {
    const gradeFav = document.getElementById('vitrine-pagina-favoritos');
    if (!gradeFav) return;

    const lista = obterFavoritos();
    gradeFav.innerHTML = '';

    if (lista.length === 0) {
        gradeFav.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; width: 100%; grid-column: 1 / -1;">
                <p style="color: var(--cinza-texto, #aaa); font-size: 16px; margin-bottom: 18px;">Você ainda não favoritou nenhuma peça.</p>
                <a href="produtos.html" class="btn-dourado" style="display: inline-block; padding: 12px 24px; text-decoration: none;">Explorar Coleção</a>
            </div>
        `;
        return;
    }

    lista.forEach(item => {
        const idFormatado = encodeURIComponent(String(item.id).trim());
        const linkDetalhes = `detalhes.html?id=${idFormatado}`;
        const precoFormatado = Number(item.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const foto = item.imagem || 'img/produto1.jpg';

        gradeFav.insertAdjacentHTML('beforeend', `
            <div class="card-produto" data-id="${item.id}" style="position: relative;">
                <button type="button" class="btn-favoritar-card" data-id="${item.id}" title="Remover dos Favoritos" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); border: none; font-size: 18px; cursor: pointer; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; z-index: 5;">
                    ❤️
                </button>
                <a href="${linkDetalhes}" class="card-link-foto">
                    <img src="${foto}" class="imagem-produto" alt="${item.nome}" onerror="this.src='img/produto1.jpg'">
                </a>
                <div class="card-info">
                    <a href="${linkDetalhes}" style="text-decoration: none; color: inherit;">
                        <h3>${item.nome}</h3>
                    </a>
                    <p class="preco" style="color: var(--dourado, #d4af37); font-weight: 800; margin: 8px 0;">${precoFormatado}</p>
                    <a href="${linkDetalhes}" class="btn-comprar">Ver Detalhes</a>
                </div>
            </div>
        `);
    });

    // Ouvinte nos botões da grade de favoritos
    gradeFav.querySelectorAll('.btn-favoritar-card').forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            alternarFavorito(this.getAttribute('data-id'));
        };
    });
}

// Remove com segurança da gaveta
function removerItemFavorito(id, nome) {
    let lista = obterFavoritos();
    const nomeItem = nome || "Produto";

    const novaLista = lista.filter(item => {
        const idMatch = id && String(item.id).trim() === String(id).trim();
        const nomeMatch = nome && item.nome && item.nome.trim().toLowerCase() === String(nome).trim().toLowerCase();
        return !idMatch && !nomeMatch;
    });

    salvarFavoritos(novaLista);

    if (typeof mostrarToast === 'function') {
        mostrarToast(`"${nomeItem}" removido dos favoritos.`);
    }

    atualizarIconesCoracaoNaPagina(novaLista);
}

// Alterna o estado de favorito vindo de botões na vitrine/detalhes/grade
function alternarFavorito(id) {
    const produtosAtuais = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
    const prod = produtosAtuais.find(p => String(p.id) === String(id));
    let lista = obterFavoritos();

    const index = lista.findIndex(f => String(f.id) === String(id));

    if (index > -1) {
        const removido = lista.splice(index, 1)[0];
        salvarFavoritos(lista);
        if (typeof mostrarToast === 'function') {
            mostrarToast(`"${removido.nome || 'Produto'}" removido dos favoritos.`);
        }
    } else if (prod) {
        let foto = (prod.imagens && prod.imagens.length > 0) ? prod.imagens[0] : (prod.imagem || 'img/produto1.jpg');
        const precoEfetivo = prod.precoPromocional || prod.preco;
        lista.push({
            id: prod.id,
            nome: prod.nome,
            preco: precoEfetivo,
            imagem: foto
        });
        salvarFavoritos(lista);
        if (typeof mostrarToast === 'function') {
            mostrarToast(`"${prod.nome}" salvo nos favoritos! ❤️`);
        }
    }

    atualizarIconesCoracaoNaPagina(lista);
}

// Atualiza o desenho do coração caso esteja na vitrine ou catálogo
function atualizarIconesCoracaoNaPagina(lista) {
    document.querySelectorAll('.card-produto').forEach(card => {
        const btnFav = card.querySelector('.btn-favorito, .card-favorito, .btn-favoritar-card');
        const cardId = card.getAttribute('data-id');
        if (btnFav && cardId) {
            const estaFav = lista.some(f => String(f.id) === String(cardId));
            btnFav.classList.toggle('ativo', estaFav);
            if (btnFav.innerText.includes('🤍') || btnFav.innerText.includes('❤️')) {
                btnFav.innerText = estaFav ? '❤️' : '🤍';
            }
        }
    });

    if (typeof window.filtrarEOrdenarCatalogo === 'function') {
        window.filtrarEOrdenarCatalogo();
    }
}

// Captura de clique no botão "✕" da gaveta
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-remover-favorito');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const id = btn.getAttribute('data-id');
    const nome = btn.getAttribute('data-nome');
    removerItemFavorito(id, nome);
});

// Inicialização geral
document.addEventListener('DOMContentLoaded', () => {
    const abrirFavoritos = document.getElementById('abrir-favoritos');
    const fecharFavoritos = document.getElementById('fechar-favoritos');
    const favoritosLateral = document.getElementById('favoritos-lateral');
    const btnLimparTodos = document.getElementById('btn-limpar-todos-favoritos');

    if (abrirFavoritos && favoritosLateral) {
        abrirFavoritos.onclick = (e) => {
            e.preventDefault();
            renderizarListaFavoritos();
            favoritosLateral.classList.add('aberto');
        };
    }

    if (fecharFavoritos && favoritosLateral) {
        fecharFavoritos.onclick = (e) => {
            e.preventDefault();
            favoritosLateral.classList.remove('aberto');
        };
    }

    // Botão "Limpar Todos" da página favoritos.html
    if (btnLimparTodos) {
        btnLimparTodos.onclick = () => {
            if (confirm('Tem certeza de que deseja limpar todos os favoritos?')) {
                salvarFavoritos([]);
                if (typeof mostrarToast === 'function') {
                    mostrarToast('Lista de favoritos limpa!');
                }
            }
        };
    }

    atualizarContadorFavoritos();
    renderizarPaginaFavoritos();
});