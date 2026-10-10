/* =====================================================
   MÓDULO DE FAVORITOS - VR MODAS
   ===================================================== */

let listaFavoritos = JSON.parse(localStorage.getItem('vr_modas_favoritos')) || [];

// Atualiza os contadores numéricos (ex: ícone do topo com coração)
function atualizarContadorFavoritos() {
    document.querySelectorAll('.contador-favoritos').forEach(el => {
        el.innerText = listaFavoritos.length;
    });
}

// Renderiza os itens dentro da gaveta lateral de favoritos
function renderizarListaFavoritos() {
    const listaFavoritosEl = document.getElementById('lista-favoritos');
    if (!listaFavoritosEl) return;

    listaFavoritosEl.innerHTML = '';
    if (listaFavoritos.length === 0) {
        listaFavoritosEl.innerHTML = '<p style="color: var(--cinza-texto, #aaa); text-align: center; padding: 30px;">Sua lista de favoritos está vazia.</p>';
        return;
    }

    listaFavoritos.forEach(item => {
        const precoFormatado = Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        listaFavoritosEl.insertAdjacentHTML('beforeend', `
            <div class="item-na-sacola" style="display: flex; gap: 12px; align-items: center; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 10px;">
                <img src="${item.imagem}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #333;" onerror="this.src='img/produto1.jpg'">
                <div style="flex: 1;">
                    <a href="detalhes.html?id=${item.id}" style="color: var(--branco, #fff); text-decoration: none; font-size: 13px; font-weight: 700; display: block;">${item.nome}</a>
                    <span style="color: var(--dourado, #d4af37); font-size: 13px;">${precoFormatado}</span>
                </div>
                <button class="btn-remover-favorito" data-id="${item.id}" style="background: transparent; color: #ff4444; border: none; font-size: 16px; cursor: pointer;" title="Remover dos favoritos">✕</button>
            </div>
        `);
    });

    // Eventos dos botões de remover item da gaveta
    document.querySelectorAll('.btn-remover-favorito').forEach(btn => {
        btn.onclick = function() {
            alternarFavorito(this.getAttribute('data-id'));
        };
    });
}

// Alterna o estado de favorito (adiciona ou remove)
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
        listaFavoritos.push({
            id: prod.id,
            nome: prod.nome,
            preco: precoEfetivo,
            imagem: foto
        });
        if (typeof mostrarToast === 'function') mostrarToast(`"${prod.nome}" salvo nos favoritos! ❤️`);
    }

    localStorage.setItem('vr_modas_favoritos', JSON.stringify(listaFavoritos));
    atualizarContadorFavoritos();
    renderizarListaFavoritos();

    // Se estiver em páginas com catálogo ou vitrine, atualiza os corações dos cards
    if (typeof filtrarEOrdenarCatalogo === 'function') {
        filtrarEOrdenarCatalogo();
    }
}

// Inicialização dos cliques de abrir/fechar a gaveta lateral
document.addEventListener('DOMContentLoaded', () => {
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
        fecharFavoritos.onclick = () => {
            favoritosLateral.classList.remove('aberto');
        };
    }

    atualizarContadorFavoritos();
});