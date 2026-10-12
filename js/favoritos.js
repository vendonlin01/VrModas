/* =====================================================
   MÓDULO DE FAVORITOS - VR MODAS
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

// Remove com segurança da gaveta (mesmo peças que não estejam mais no banco de dados)
function removerItemFavorito(id, nome) {
    let lista = obterFavoritos();
    const nomeItem = nome || "Produto";

    // Filtra removendo por ID ou pelo Nome caso o ID esteja inconsistente
    const novaLista = lista.filter(item => {
        const idMatch = id && String(item.id).trim() === String(id).trim();
        const nomeMatch = nome && item.nome && item.nome.trim().toLowerCase() === String(nome).trim().toLowerCase();
        return !idMatch && !nomeMatch;
    });

    salvarFavoritos(novaLista);

    if (typeof mostrarToast === 'function') {
        mostrarToast(`"${nomeItem}" removido dos favoritos.`);
    }

    // Atualiza o estado dos corações visíveis na página
    atualizarIconesCoracaoNaPagina(novaLista);
}

// Alterna o estado de favorito vindo de botões na vitrine/detalhes
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
        const btnFav = card.querySelector('.btn-favorito, .card-favorito');
        const cardId = card.getAttribute('data-id');
        if (btnFav && cardId) {
            const estaFav = lista.some(f => String(f.id) === String(cardId));
            btnFav.classList.toggle('ativo', estaFav);
        }
    });

    if (typeof filtrarEOrdenarCatalogo === 'function') {
        filtrarEOrdenarCatalogo();
    }
}

// Captura de clique delegada para o botão "✕" da gaveta
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-remover-favorito');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const id = btn.getAttribute('data-id');
    const nome = btn.getAttribute('data-nome');
    removerItemFavorito(id, nome);
});

// Inicialização dos cliques de abrir/fechar a gaveta lateral
document.addEventListener('DOMContentLoaded', () => {
    const abrirFavoritos = document.getElementById('abrir-favoritos');
    const fecharFavoritos = document.getElementById('fechar-favoritos');
    const favoritosLateral = document.getElementById('favoritos-lateral');

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

    atualizarContadorFavoritos();
});