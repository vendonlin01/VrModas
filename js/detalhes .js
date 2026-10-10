window.trocarFotoPrincipal = function(el) { 
    const imgEl = document.getElementById('detalhe-img');
    if (imgEl) imgEl.src = el.src; 
    document.querySelectorAll('.miniatura-foto').forEach(i => i.style.borderColor = 'transparent'); 
    el.style.borderColor = 'var(--dourado)'; 
};

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const produtoIdNaUrl = urlParams.get('id');
    const paginaDetalhes = document.getElementById('container-detalhes');
    if (!paginaDetalhes || !produtoIdNaUrl) return;

    const produtosAtuais = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
    const produtoSelecionado = produtosAtuais.find(p => String(p.id) === String(produtoIdNaUrl));
    if (!produtoSelecionado) return;

    paginaDetalhes.style.display = 'block';
    document.getElementById('detalhe-nome').innerText = produtoSelecionado.nome;
    
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

    let listaDeFotos = (produtoSelecionado.imagens && produtoSelecionado.imagens.length > 0)
        ? produtoSelecionado.imagens
        : [produtoSelecionado.imagem || 'img/produto1.jpg'];

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

    const containerTamanhos = document.getElementById('detalhe-tamanhos');
    if (containerTamanhos) {
        containerTamanhos.innerHTML = '';
        if (produtoSelecionado.tamanhos && produtoSelecionado.tamanhos.length > 0) {
            produtoSelecionado.tamanhos.forEach((tam, index) => {
                containerTamanhos.innerHTML += `<label><input type="radio" name="tamanho" value="${tam}" ${index === 0 ? 'checked' : ''}><span class="box-tamanho">${tam}</span></label>`;
            });
        }
    }

    const containerCores = document.getElementById('detalhe-cores');
    if (containerCores && produtoSelecionado.cores) {
        containerCores.innerHTML = '';
        const mapaCores = {
            'preto': '#000000', 'branco': '#ffffff', 'dourado': '#d4af37',
            'azul': '#1e88e5', 'rosa': '#e91e63', 'vermelho': '#d32f2f',
            'verde': '#2e7d32', 'amarelo': '#fbc02d', 'roxo': '#7b1fa2'
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
                    <span class="box-cor" style="display: inline-block; width: 34px; height: 34px; border-radius: 50%; background-color: ${corFundo}; ${estiloBorda} cursor: pointer;" title="${corNome}"></span>
                </label>
            `);
        });
    }

    // Bloqueio de Stock
    const estoqueMaximo = parseInt(produtoSelecionado.estoque || 0);
    const btnAdicionarSacola = document.getElementById('btn-adicionar-sacola');
    const inputQtdDetalhes = document.getElementById('qtd-produto');
    const containerQtdDetalhes = document.querySelector('.controle-qtd') || (inputQtdDetalhes ? inputQtdDetalhes.parentElement : null);

    if (estoqueMaximo <= 0 && btnAdicionarSacola) {
        btnAdicionarSacola.disabled = true;
        btnAdicionarSacola.innerText = "Produto Esgotado";
        btnAdicionarSacola.classList.add('btn-desativado');
    }

    if (containerQtdDetalhes && inputQtdDetalhes) {
        containerQtdDetalhes.addEventListener('click', (e) => {
            const alvo = e.target;
            const textoBotao = alvo.innerText.trim();

            let atual = parseInt(inputQtdDetalhes.value || inputQtdDetalhes.innerText || '1');
            if (isNaN(atual)) atual = 1;

            if (textoBotao === '+' || alvo.classList.contains('btn-mais')) {
                e.preventDefault();
                if (atual < estoqueMaximo) {
                    atual += 1;
                } else {
                    alert(`Limite atingido! Apenas ${estoqueMaximo} unidade(s) em estoque.`);
                }
                if (inputQtdDetalhes.tagName === 'INPUT') inputQtdDetalhes.value = atual;
                else inputQtdDetalhes.innerText = atual;
            } else if (textoBotao === '-' || alvo.classList.contains('btn-menos')) {
                e.preventDefault();
                atual = Math.max(1, atual - 1);
                if (inputQtdDetalhes.tagName === 'INPUT') inputQtdDetalhes.value = atual;
                else inputQtdDetalhes.innerText = atual;
            }
        });
    }

    const btnVoltar = document.getElementById('btn-voltar');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', (e) => {
            e.preventDefault();
            if (document.referrer && document.referrer.includes(window.location.host)) window.history.back();
            else window.location.href = 'produtos.html';
        });
    }
});