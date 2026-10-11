/* =====================================================
   DETALHES DO PRODUTO, FAVORITOS & AVALIAÇÕES - VR MODAS
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const produtoIdUrl = urlParams.get('id');

    const produtos = JSON.parse(localStorage.getItem('vr_modas_db')) || [];

    // Localiza o produto com fallback tolerante
    let produto = null;
    if (produtoIdUrl) {
        produto = produtos.find(p => String(p.id).trim() === String(produtoIdUrl).trim());
    }
    if (!produto && produtos.length > 0) {
        produto = produtos[0];
    }

    if (!produto) {
        const wrap = document.getElementById('container-detalhes');
        if (wrap) wrap.innerHTML = '<p style="color:#aaa; text-align:center; padding:50px;">Peça não encontrada no catálogo.</p>';
        return;
    }

    const prodIdFinal = String(produto.id);
    const prodNomeFinal = produto.nome || 'Peça VR Modas';
    const prodPrecoFinal = Number(produto.precoPromocional || produto.preco || 0);

    // ==========================================
    // 1. PREENCHIMENTO DOS DADOS PRINCIPAIS
    // ==========================================
    const elNome = document.getElementById('detalhe-nome');
    const elPreco = document.getElementById('detalhe-preco');
    const elDesc = document.getElementById('detalhe-descricao');
    const elImg = document.getElementById('detalhe-img');
    const galeriaEl = document.querySelector('.galeria');

    if (elNome) elNome.innerText = prodNomeFinal;

    // Formatação de Preço
    if (elPreco) {
        const precoVal = Number(produto.preco || 0);
        const promoVal = Number(produto.precoPromocional || 0);
        const precoFormatado = precoVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        if (promoVal > 0 && promoVal < precoVal) {
            const promoFormatado = promoVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            elPreco.innerHTML = `
                <span style="text-decoration: line-through; color: #777; font-size: 16px; margin-right: 8px;">${precoFormatado}</span>
                <span style="color: var(--dourado, #d4af37); font-weight: bold;">${promoFormatado}</span>
            `;
        } else {
            elPreco.innerText = precoFormatado;
        }
    }

    if (elDesc) elDesc.innerText = produto.descricao || 'Peça exclusiva confeccionada com tecido e acabamento de alto padrão.';

    // Imagem e Miniaturas
    const fotos = (produto.imagens && produto.imagens.length > 0) ? produto.imagens : [produto.imagem || 'img/produto1.jpg'];
    if (elImg) {
        elImg.src = fotos[0];
        elImg.onerror = () => { elImg.src = 'img/produto1.jpg'; };
    }

    if (galeriaEl && fotos.length > 1) {
        const miniaturasExistentes = galeriaEl.querySelector('.miniaturas');
        if (miniaturasExistentes) miniaturasExistentes.remove();

        const containerMinis = document.createElement('div');
        containerMinis.className = 'miniaturas';
        fotos.forEach((foto, idx) => {
            const thumb = document.createElement('img');
            thumb.src = foto;
            thumb.className = `miniatura-foto ${idx === 0 ? 'ativa' : ''}`;
            thumb.onclick = () => {
                if (elImg) elImg.src = foto;
                containerMinis.querySelectorAll('.miniatura-foto').forEach(t => t.classList.remove('ativa'));
                thumb.classList.add('ativa');
            };
            containerMinis.appendChild(thumb);
        });
        galeriaEl.appendChild(containerMinis);
    }

    // ==========================================
    // 2. SELETOR DE TAMANHOS E CORES
    // ==========================================
    const containerTamanhos = document.getElementById('detalhe-tamanhos');
    if (containerTamanhos) {
        containerTamanhos.innerHTML = '';
        const gradeTamanhos = produto.tamanhos && produto.tamanhos.length > 0 ? produto.tamanhos : ['P', 'M', 'G'];
        gradeTamanhos.forEach((tam, idx) => {
            containerTamanhos.insertAdjacentHTML('beforeend', `
                <label style="cursor: pointer; margin-right: 6px;">
                    <input type="radio" name="tamanho" value="${tam}" ${idx === 0 ? 'checked' : ''}>
                    <span class="box-tamanho">${tam}</span>
                </label>
            `);
        });
    }

    const containerCores = document.getElementById('detalhe-cores');
    if (containerCores) {
        containerCores.innerHTML = '';
        const mapaCoresHex = {
            'preto': '#000000', 'branco': '#ffffff', 'dourado': '#d4af37', 'vermelho': '#d32f2f',
            'azul': '#1e88e5', 'rosa': '#e91e63', 'verde': '#2e7d32', 'bege': '#f5f5dc', 'vinho': '#58111a'
        };

        const listaCores = typeof produto.cores === 'string' ? produto.cores.split(',') : (produto.cores || ['Padrão']);
        listaCores.forEach((c, idx) => {
            const nomeCor = String(c).trim();
            const corHex = mapaCoresHex[nomeCor.toLowerCase()] || '#d4af37';
            containerCores.insertAdjacentHTML('beforeend', `
                <label title="${nomeCor}" style="cursor: pointer; margin-right: 6px;">
                    <input type="radio" name="cor" value="${nomeCor}" ${idx === 0 ? 'checked' : ''} style="display:none;">
                    <span class="box-cor" style="background-color: ${corHex};"></span>
                </label>
            `);
        });
    }

    // ==========================================
    // 3. CONTROLE DE QUANTIDADE E ESTOQUE
    // ==========================================
    const inputQtd = document.getElementById('qtd-produto');
    const controleQtd = document.querySelector('.controle-quantidade') || document.querySelector('.controle-qtd');
    const estoqueMax = parseInt(produto.estoque || 1);
    const btnAddSacola = document.getElementById('btn-adicionar-sacola');

    if (estoqueMax <= 0 && btnAddSacola) {
        btnAddSacola.disabled = true;
        btnAddSacola.innerText = 'Produto Esgotado';
        btnAddSacola.classList.add('btn-desativado');
        if (inputQtd) inputQtd.value = 0;
    }

    if (controleQtd && inputQtd && estoqueMax > 0) {
        controleQtd.onclick = (e) => {
            let val = parseInt(inputQtd.value || '1');
            const target = e.target;
            if (target.classList.contains('btn-mais') || target.innerText === '+') {
                if (val < estoqueMax) {
                    inputQtd.value = val + 1;
                } else {
                    alert(`Estoque máximo atingido: ${estoqueMax} unidade(s).`);
                }
            } else if (target.classList.contains('btn-menos') || target.innerText === '-') {
                if (val > 1) {
                    inputQtd.value = val - 1;
                }
            }
        };
    }

    // ==========================================
    // 4. CORAÇÃO DE FAVORITOS (DIRETO E CONECTADO)
    // ==========================================
    function obterFavoritos() {
        try {
            return JSON.parse(localStorage.getItem('vr_modas_favoritos')) || [];
        } catch (e) {
            return [];
        }
    }

    function salvarFavoritos(lista) {
        localStorage.setItem('vr_modas_favoritos', JSON.stringify(lista));
        document.querySelectorAll('.contador-favoritos').forEach(el => el.innerText = lista.length);
        if (typeof renderizarFavoritos === 'function') renderizarFavoritos();
    }

    function atualizarVisualCoracao() {
        const btnFav = document.getElementById('btn-favorito-detalhes');
        if (!btnFav) return;
        const favs = obterFavoritos();
        const jaFavoritado = favs.some(f => String(f.id) === prodIdFinal || f.nome === prodNomeFinal);
        btnFav.classList.toggle('ativo', jaFavoritado);
    }

    atualizarVisualCoracao();

    document.addEventListener('click', (e) => {
        const btnFav = e.target.closest('#btn-favorito-detalhes');
        if (!btnFav) return;

        e.preventDefault();
        e.stopPropagation();

        let favs = obterFavoritos();
        const idx = favs.findIndex(f => String(f.id) === prodIdFinal || f.nome === prodNomeFinal);

        if (idx !== -1) {
            favs.splice(idx, 1);
            btnFav.classList.remove('ativo');
            mostrarToastNotificacao("Peça removida dos seus favoritos!");
        } else {
            favs.push({
                id: produto.id,
                nome: prodNomeFinal,
                preco: prodPrecoFinal,
                imagem: fotos[0]
            });
            btnFav.classList.add('ativo');
            mostrarToastNotificacao("Peça salva nos seus favoritos! ❤️");
        }

        salvarFavoritos(favs);
    });

    // ==========================================
    // 5. AVALIAÇÕES (SINCRONIZAÇÃO COMPLETA COM O TOPO)
    // ==========================================
    const containerListaAv = document.getElementById('lista-avaliacoes-peca') || document.getElementById('grid-avaliacoes');
    const formAv = document.getElementById('form-avaliacao-cliente') || document.getElementById('form-avaliacao');
    const btnAbrirFormAv = document.getElementById('btn-abrir-form-avaliacao') || document.getElementById('btn-abrir-form-av');
    const btnCancelarFormAv = document.getElementById('btn-cancelar-av');
    const estrelasClique = document.querySelectorAll('.estrela-opcao');
    const inputNotaOculto = document.getElementById('nota-avaliacao-val');

    let notaSelecionada = 5;

    if (btnAbrirFormAv && formAv) {
        btnAbrirFormAv.onclick = (e) => {
            e.preventDefault();
            formAv.style.display = (formAv.style.display === 'none' || formAv.style.display === '') ? 'block' : 'none';
        };
    }

    if (btnCancelarFormAv && formAv) {
        btnCancelarFormAv.onclick = (e) => {
            e.preventDefault();
            formAv.style.display = 'none';
        };
    }

    estrelasClique.forEach(star => {
        star.onclick = function () {
            const val = parseInt(this.getAttribute('data-valor') || this.getAttribute('data-nota') || '5');
            notaSelecionada = val;
            if (inputNotaOculto) inputNotaOculto.value = val;
            estrelasClique.forEach((s, idx) => {
                s.classList.toggle('ativa', idx < val);
            });
        };
    });

    function carregarAvaliacoes() {
        const todasAv = JSON.parse(localStorage.getItem('vr_modas_avaliacoes')) || [];
        // Filtra pelo ID ou pelo Nome exato para não perder avaliações antigas
        const daPeca = todasAv.filter(a => 
            String(a.produtoId).trim() === prodIdFinal || 
            (a.produtoNome && a.produtoNome.toLowerCase() === prodNomeFinal.toLowerCase())
        );

        // Atualiza a barra de estrelas no topo
        const txtQtdTopo = document.getElementById('detalhe-qtd-avaliacoes');
        const estrelasSpans = document.querySelectorAll('#detalhe-estrelas span, #detalhe-estrelas .est-item');

        if (daPeca.length > 0) {
            const soma = daPeca.reduce((acc, cur) => acc + (Number(cur.nota) || 5), 0);
            const media = Math.round(soma / daPeca.length);

            if (txtQtdTopo) {
                txtQtdTopo.innerHTML = `<strong>${media}.0</strong> (${daPeca.length} ${daPeca.length === 1 ? 'avaliação' : 'avaliações'})`;
                txtQtdTopo.style.color = '#ffffff';
            }

            estrelasSpans.forEach((span, i) => {
                span.classList.toggle('cheia', i < media);
                span.style.color = i < media ? 'var(--dourado, #d4af37)' : '#444';
            });
        } else {
            if (txtQtdTopo) {
                txtQtdTopo.innerText = 'Sem avaliações';
                txtQtdTopo.style.color = '#777777';
            }
            estrelasSpans.forEach(span => {
                span.classList.remove('cheia');
                span.style.color = '#444';
            });
        }

        // Renderiza a lista de comentários
        if (!containerListaAv) return;
        containerListaAv.innerHTML = '';

        if (daPeca.length === 0) {
            containerListaAv.innerHTML = `
                <div style="text-align: center; color: #777; padding: 25px 10px; font-size: 13px; grid-column: 1 / -1;">
                    <p style="margin: 0 0 4px 0; color: #eee; font-weight: bold;">Esta peça ainda não possui avaliações.</p>
                    <small>Seja a primeira pessoa a avaliar após sua compra!</small>
                </div>
            `;
            return;
        }

        daPeca.forEach(av => {
            const textoComentario = av.texto || av.comentario || '';
            const estrelasTxt = '★'.repeat(av.nota) + '☆'.repeat(5 - av.nota);
            containerListaAv.insertAdjacentHTML('beforeend', `
                <div class="card-avaliacao-item">
                    <div class="estrelas-card">${estrelasTxt}</div>
                    <p class="comentario-card">"${textoComentario}"</p>
                    <small class="autor-card">— ${av.autor} <span class="badge-verificado">✓ Compra Verificada</span></small>
                </div>
            `);
        });
    }

    carregarAvaliacoes();

    // Rolar até avaliações ao clicar nas estrelas do topo
    const linkAv = document.getElementById('link-avaliacoes');
    if (linkAv) {
        linkAv.onclick = () => {
            const sec = document.getElementById('secao-avaliacoes') || containerListaAv;
            if (sec) sec.scrollIntoView({ behavior: 'smooth' });
        };
    }

    // Formulário de envio de avaliação
    if (formAv) {
        formAv.onsubmit = function (e) {
            e.preventDefault();
            const inputAutor = document.getElementById('autor-avaliacao') || document.getElementById('av-nome-autor');
            const inputTexto = document.getElementById('texto-avaliacao') || document.getElementById('av-comentario');

            const autor = inputAutor ? inputAutor.value.trim() : '';
            const texto = inputTexto ? inputTexto.value.trim() : '';

            if (!autor || !texto) {
                alert("Por favor, preencha o seu nome e o comentário.");
                return;
            }

            const nova = {
                id: Date.now(),
                produtoId: prodIdFinal,
                produtoNome: prodNomeFinal,
                autor: autor,
                texto: texto,
                comentario: texto,
                nota: notaSelecionada,
                data: new Date().toLocaleDateString('pt-BR')
            };

            const todasAv = JSON.parse(localStorage.getItem('vr_modas_avaliacoes')) || [];
            todasAv.unshift(nova);
            localStorage.setItem('vr_modas_avaliacoes', JSON.stringify(todasAv));

            formAv.reset();
            formAv.style.display = 'none';
            carregarAvaliacoes();
            mostrarToastNotificacao("Avaliação publicada com sucesso! ✨");
        };
    }

    // ==========================================
    // 6. GUIA DE MEDIDAS (MODAL)
    // ==========================================
    const modalGuia = document.getElementById('modal-guia-medidas');
    const btnAbrirGuia = document.getElementById('btn-abrir-guia-medidas');
    const btnFecharGuia = document.getElementById('btn-fechar-guia-medidas') || document.getElementById('btn-fechar-guia');

    if (btnAbrirGuia && modalGuia) {
        btnAbrirGuia.onclick = (e) => {
            e.preventDefault();
            modalGuia.style.display = 'flex';
        };
    }
    if (btnFecharGuia && modalGuia) {
        btnFecharGuia.onclick = () => {
            modalGuia.style.display = 'none';
        };
    }
    if (modalGuia) {
        modalGuia.onclick = (e) => {
            if (e.target === modalGuia) modalGuia.style.display = 'none';
        };
    }

    // ==========================================
    // NOTIFICAÇÃO TOAST
    // ==========================================
    function mostrarToastNotificacao(msg) {
        let toastBox = document.getElementById('toast-container');
        if (!toastBox) {
            toastBox = document.createElement('div');
            toastBox.id = 'toast-container';
            document.body.appendChild(toastBox);
        }

        const toast = document.createElement('div');
        toast.className = 'toast mostrar';
        toast.innerHTML = `<span>✨</span> ${msg}`;
        toastBox.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('mostrar');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }
});