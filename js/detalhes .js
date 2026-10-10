/* =====================================================
   DETALHES DO PRODUTO & CONTROLE DE ESTOQUE - VR MODAS
   ===================================================== */

window.trocarFotoPrincipal = function(el) { 
    const imgEl = document.getElementById('detalhe-img');
    if (imgEl && el) {
        imgEl.src = el.src; 
        document.querySelectorAll('.miniatura-foto').forEach(i => i.style.borderColor = 'transparent'); 
        el.style.borderColor = 'var(--dourado, #d4af37)'; 
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const produtoIdNaUrl = urlParams.get('id');
    const paginaDetalhes = document.getElementById('container-detalhes');

    if (paginaDetalhes) {
        paginaDetalhes.style.display = 'block';
    }

    const produtosAtuais = JSON.parse(localStorage.getItem('vr_modas_db')) || [];

    if (produtosAtuais.length === 0) {
        if (paginaDetalhes) {
            paginaDetalhes.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #fff;">
                    <h2>Nenhum produto cadastrado no catálogo.</h2>
                    <p style="color: #aaa; margin: 10px 0 20px 0;">Cadastre um produto no painel de controle do lojista.</p>
                    <a href="admin.html" style="color: var(--dourado, #d4af37); text-decoration: underline;">Ir para o Admin</a>
                </div>
            `;
        }
        return;
    }

    // 1. Busca flexível: encontra pelo ID exato da URL ou puxa o primeiro produto do banco
    let produtoSelecionado = null;
    if (produtoIdNaUrl) {
        produtoSelecionado = produtosAtuais.find(p => String(p.id).trim() === String(produtoIdNaUrl).trim());
    }

    if (!produtoSelecionado) {
        produtoSelecionado = produtosAtuais[0];
    }

    // 2. Preenche Título, Preço e Descrição
    const elNome = document.getElementById('detalhe-nome');
    if (elNome) elNome.innerText = produtoSelecionado.nome || 'Peça Sem Título';

    const elPreco = document.getElementById('detalhe-preco');
    if (elPreco) {
        const precoNormal = Number(produtoSelecionado.preco || 0);
        const precoPromo = Number(produtoSelecionado.precoPromocional || 0);
        const precoFormatado = precoNormal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        if (precoPromo > 0 && precoPromo < precoNormal) {
            const promoFormatado = precoPromo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            elPreco.innerHTML = `
                <span style="text-decoration: line-through; color: #777; font-size: 16px; margin-right: 8px;">${precoFormatado}</span>
                <span style="color: var(--dourado, #d4af37); font-weight: bold;">${promoFormatado}</span>
            `;
        } else {
            elPreco.innerText = precoFormatado;
        }
    }

    const elDesc = document.getElementById('detalhe-descricao');
    if (elDesc) elDesc.innerText = produtoSelecionado.descricao || "Peça exclusiva VR Modas confeccionada com acabamento premium.";

    // 3. Galeria de Fotos
    let listaDeFotos = [];
    if (produtoSelecionado.imagens && Array.isArray(produtoSelecionado.imagens) && produtoSelecionado.imagens.length > 0) {
        listaDeFotos = produtoSelecionado.imagens.filter(f => !!f);
    } else if (produtoSelecionado.imagem) {
        listaDeFotos = [produtoSelecionado.imagem];
    }

    if (listaDeFotos.length === 0) {
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
            htmlGaleria += `<div class="miniaturas" style="display: flex; gap: 8px; margin-top: 10px; overflow-x: auto;">`;
            listaDeFotos.forEach((foto, index) => {
                const borda = index === 0 ? 'var(--dourado, #d4af37)' : 'transparent';
                htmlGaleria += `<img src="${foto}" class="miniatura-foto" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 2px solid ${borda}; cursor: pointer;" onclick="trocarFotoPrincipal(this)" onerror="this.src='img/produto1.jpg'">`;
            });
            htmlGaleria += `</div>`;
        }
        containerGaleria.innerHTML = htmlGaleria;
    }

    // 4. Seleção de Tamanhos
    const containerTamanhos = document.getElementById('detalhe-tamanhos');
    if (containerTamanhos) {
        containerTamanhos.innerHTML = '';
        const listaTamanhos = (produtoSelecionado.tamanhos && Array.isArray(produtoSelecionado.tamanhos) && produtoSelecionado.tamanhos.length > 0)
            ? produtoSelecionado.tamanhos
            : ['P', 'M', 'G'];

        listaTamanhos.forEach((tam, index) => {
            containerTamanhos.insertAdjacentHTML('beforeend', `
                <label style="cursor: pointer; margin-right: 6px;">
                    <input type="radio" name="tamanho" value="${tam}" ${index === 0 ? 'checked' : ''}>
                    <span class="box-tamanho">${tam}</span>
                </label>
            `);
        });
    }

    // 5. Seleção de Cores
    const containerCores = document.getElementById('detalhe-cores');
    if (containerCores) {
        containerCores.innerHTML = '';
        const mapaCores = {
            'preto': '#000000', 'branco': '#ffffff', 'dourado': '#d4af37',
            'azul': '#1e88e5', 'azul marinho': '#0d2340', 'rosa': '#e91e63',
            'vermelho': '#d32f2f', 'verde': '#2e7d32', 'amarelo': '#fbc02d',
            'laranja': '#f57c00', 'roxo': '#7b1fa2', 'vinho': '#580c1f',
            'cinza': '#757575', 'bege': '#d7ccc8'
        };

        let listaCores = [];
        if (typeof produtoSelecionado.cores === 'string' && produtoSelecionado.cores.trim() !== '') {
            listaCores = produtoSelecionado.cores.split(',');
        } else if (Array.isArray(produtoSelecionado.cores) && produtoSelecionado.cores.length > 0) {
            listaCores = produtoSelecionado.cores;
        } else {
            listaCores = ['Padrão'];
        }

        listaCores.forEach((corRaw, index) => {
            const corNome = String(corRaw).trim();
            const corChave = corNome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            let corFundo = mapaCores[corChave] || '#d4af37';
            const estiloBorda = (corChave === 'branco') ? 'border: 1px solid #777;' : '';

            containerCores.insertAdjacentHTML('beforeend', `
                <label style="cursor: pointer; position: relative; margin-right: 6px;">
                    <input type="radio" name="cor" value="${corNome}" ${index === 0 ? 'checked' : ''} style="display: none;">
                    <span class="box-cor" style="display: inline-block; width: 34px; height: 34px; border-radius: 50%; background-color: ${corFundo}; ${estiloBorda} cursor: pointer;" title="${corNome}"></span>
                </label>
            `);
        });
    }

    // 6. Controle Rígido de Estoque (+ e -)
    const estoqueMaximo = parseInt(produtoSelecionado.estoque || 0);
    const btnAdicionarSacola = document.getElementById('btn-adicionar-sacola');
    const inputQtdDetalhes = document.getElementById('qtd-produto');
    const containerQtdDetalhes = document.querySelector('.controle-qtd');

    if (estoqueMaximo <= 0 && btnAdicionarSacola) {
        btnAdicionarSacola.disabled = true;
        btnAdicionarSacola.innerText = "Produto Esgotado";
        btnAdicionarSacola.classList.add('btn-desativado');
        if (inputQtdDetalhes) inputQtdDetalhes.value = 0;
    }

    if (containerQtdDetalhes && inputQtdDetalhes && estoqueMaximo > 0) {
        containerQtdDetalhes.addEventListener('click', (e) => {
            const alvo = e.target;
            const textoBotao = alvo.innerText.trim();

            let atual = parseInt(inputQtdDetalhes.value || '1');
            if (isNaN(atual)) atual = 1;

            if (textoBotao === '+' || alvo.classList.contains('btn-mais')) {
                e.preventDefault();
                if (atual < estoqueMaximo) {
                    atual += 1;
                } else {
                    alert(`Limite atingido! Existem apenas ${estoqueMaximo} unidade(s) disponíveis em estoque.`);
                }
                inputQtdDetalhes.value = atual;

            } else if (textoBotao === '-' || alvo.classList.contains('btn-menos')) {
                e.preventDefault();
                atual = Math.max(1, atual - 1);
                inputQtdDetalhes.value = atual;
            }
        });
    }
});