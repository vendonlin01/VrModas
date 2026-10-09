// ==========================================
// MÓDULO: CATÁLOGO & CONTROLE DE ESTOQUE
// ==========================================
let categoriaAdminAtiva = 'todos';

function normalizarCategoria(cat) {
    if (!cat) return 'geral';
    let c = cat.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (c.endsWith('s')) c = c.slice(0, -1);
    return c;
}

export function atualizarTabelaProdutos(onModificacao) {
    const listaProdutosAdmin = document.getElementById('lista-produtos-admin');
    if (!listaProdutosAdmin) return;

    let produtos = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
    atualizarContadoresAbas(produtos);

    if (categoriaAdminAtiva === 'ofertas') {
        produtos = produtos.filter(p => !!p.promocao);
    } else if (categoriaAdminAtiva === 'acessorios') {
        produtos = produtos.filter(p => ['acessorio', 'bolsa', 'cinto', 'joia'].includes(normalizarCategoria(p.categoria)));
    } else if (categoriaAdminAtiva !== 'todos') {
        const catAlvo = normalizarCategoria(categoriaAdminAtiva);
        produtos = produtos.filter(p => normalizarCategoria(p.categoria) === catAlvo);
    }

    listaProdutosAdmin.innerHTML = '';

    if (produtos.length === 0) {
        listaProdutosAdmin.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto); padding: 30px;">Nenhum produto cadastrado nesta categoria.</td></tr>`;
        return;
    }

    produtos.forEach(prod => {
        const foto = (prod.imagens && prod.imagens.length > 0) ? prod.imagens[0] : (prod.imagem || 'img/produto1.jpg');
        const precoFormatado = Number(prod.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const estoqueNum = parseInt(prod.estoque || 0);
        const badgeClass = estoqueNum < 5 ? 'badge-baixo' : 'badge-ok';
        const seloPromo = prod.promocao ? `<span style="background: rgba(212,175,55,0.2); color: var(--dourado); padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">🔥 Oferta</span>` : '';

        listaProdutosAdmin.insertAdjacentHTML('beforeend', `
            <tr>
                <td><img src="${foto}" alt="${prod.nome}" class="img-miniatura-tabela" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid #333;"></td>
                <td><strong>${prod.nome}</strong>${seloPromo}</td>
                <td style="text-transform: capitalize; color: var(--dourado);">${prod.categoria || 'Geral'}</td>
                <td style="color: var(--dourado); font-weight: bold;">${precoFormatado}</td>
                <td><span class="badge-estoque ${badgeClass}" style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${estoqueNum} un.</span></td>
                <td>
                    <button class="btn-acao btn-editar-prod" data-id="${prod.id}" style="background: transparent; color: var(--dourado); border: 1px solid var(--dourado); padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 700; margin-right: 4px;">✏️ Editar</button>
                    <button class="btn-acao btn-excluir-prod" data-id="${prod.id}" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 700;">🗑️ Excluir</button>
                </td>
            </tr>
        `);
    });

    document.querySelectorAll('.btn-editar-prod').forEach(btn => {
        btn.onclick = function() {
            const id = this.getAttribute('data-id');
            if (window.abrirAbaCadastroParaEdicao) {
                window.abrirAbaCadastroParaEdicao(id);
            }
        };
    });

    document.querySelectorAll('.btn-excluir-prod').forEach(btn => {
        btn.onclick = function() {
            const idProd = this.getAttribute('data-id');
            if (confirm("Remover este produto do catálogo?")) {
                let lista = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
                lista = lista.filter(p => String(p.id) !== String(idProd));
                localStorage.setItem('vr_modas_db', JSON.stringify(lista));
                if (typeof mostrarToast === 'function') mostrarToast("Produto removido!");
                atualizarTabelaProdutos(onModificacao);
                if (typeof onModificacao === 'function') onModificacao();
            }
        };
    });
}

function atualizarContadoresAbas(produtos) {
    const setCont = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    setCont('cont-cat-todos', produtos.length);
    setCont('cont-cat-vestidos', produtos.filter(p => normalizarCategoria(p.categoria) === 'vestido').length);
    setCont('cont-cat-conjuntos', produtos.filter(p => normalizarCategoria(p.categoria) === 'conjunto').length);
    setCont('cont-cat-calcas', produtos.filter(p => normalizarCategoria(p.categoria) === 'calca').length);
    setCont('cont-cat-camisas', produtos.filter(p => normalizarCategoria(p.categoria) === 'camisa').length);
    setCont('cont-cat-bermudas', produtos.filter(p => normalizarCategoria(p.categoria) === 'bermuda').length);
    setCont('cont-cat-acessorios', produtos.filter(p => ['acessorio', 'bolsa', 'cinto', 'joia'].includes(normalizarCategoria(p.categoria))).length);
    setCont('cont-cat-ofertas', produtos.filter(p => !!p.promocao).length);
}

export function iniciarAbasCategorias(aoTrocarAba) {
    document.querySelectorAll('.btn-aba-cat').forEach(aba => {
        aba.onclick = function() {
            document.querySelectorAll('.btn-aba-cat').forEach(b => b.classList.remove('ativo'));
            this.classList.add('ativo');
            categoriaAdminAtiva = this.getAttribute('data-cat');
            atualizarTabelaProdutos(aoTrocarAba);
        };
    });
}