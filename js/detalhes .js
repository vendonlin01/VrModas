/* =====================================================
   DETALHES DO PRODUTO, FAVORITOS & AVALIAÇÕES - VR MODAS
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const produtoId = urlParams.get('id');

    const produtos = JSON.parse(localStorage.getItem('vr_modas_db')) || [];

    // Busca pelo ID ou fallback para a primeira peça
    let produto = null;
    if (produtoId) {
        produto = produtos.find(p => String(p.id) === String(produtoId));
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

    // ==========================================
    // 1. PREENCHIMENTO DOS DADOS PRINCIPAIS
    // ==========================================
    const elNome = document.getElementById('detalhe-nome');
    const elPreco = document.getElementById('detalhe-preco');
    const elDesc = document.getElementById('detalhe-descricao');
    const elImg = document.getElementById('detalhe-img');
    const containerMiniaturas = document.getElementById('galeria-miniaturas');

    if (elNome) elNome.innerText = produto.nome;

    // Formatação de Preço (Normal e Promocional)
    if (elPreco) {
        if (produto.precoPromocional && Number(produto.precoPromocional) < Number(produto.preco)) {
            elPreco.innerHTML = `
                <span style="text-decoration: line-through; color: #888; font-size: 16px; margin-right: 8px;">
                    ${Number(produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span style="color: var(--dourado, #d4af37);">
                    ${Number(produto.precoPromocional).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
            `;
        } else {
            elPreco.innerText = Number(produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
    }

    if (elDesc) elDesc.innerText = produto.descricao || 'Peça confeccionada com acabamento refinado e tecido de alta qualidade.';

    // Imagem e Miniaturas
    const fotos = (produto.imagens && produto.imagens.length > 0) ? produto.imagens : [produto.imagem || 'img/produto1.jpg'];
    if (elImg) elImg.src = fotos[0];

    if (containerMiniaturas) {
        containerMiniaturas.innerHTML = '';
        if (fotos.length > 1) {
            fotos.forEach((foto, idx) => {
                const imgThumb = document.createElement('img');
                imgThumb.src = foto;
                imgThumb.className = `miniatura-foto ${idx === 0 ? 'ativa' : ''}`;
                imgThumb.onclick = () => {
                    elImg.src = foto;
                    document.querySelectorAll('.miniatura-foto').forEach(t => t.classList.remove('ativa'));
                    imgThumb.classList.add('ativa');
                };
                containerMiniaturas.appendChild(imgThumb);
            });
        }
    }

    // ==========================================
    // 2. SELETOR DE TAMANHOS E CORES
    // ==========================================
    const containerTamanhos = document.getElementById('detalhe-tamanhos');
    if (containerTamanhos) {
        containerTamanhos.innerHTML = '';
        const gradeTamanhos = produto.tamanhos || ['P', 'M', 'G'];
        gradeTamanhos.forEach((tam, idx) => {
            containerTamanhos.insertAdjacentHTML('beforeend', `
                <label>
                    <input type="radio" name="tamanho" value="${tam}" ${idx === 0 ? 'checked' : ''}>
                    <span class="box-tamanho">${tam}</span>
                </label>
            `);
        });
    }

    const containerCores = document.getElementById('detalhe-cores');
    if (containerCores) {
        containerCores.innerHTML = '';
        const listaCores = produto.coresDetalhes || (typeof produto.cores === 'string' ? produto.cores.split(',').map(c => ({ nome: c.trim() })) : [{ nome: 'Padrão' }]);

        const mapaCoresHex = {
            'preto': '#111111', 'branco': '#ffffff', 'bege': '#f5f5dc', 'dourado': '#d4af37',
            'vermelho': '#c62828', 'azul': '#1565c0', 'verde': '#2e7d32', 'rosa': '#e91e63',
            'vinho': '#58111a', 'marrom': '#4e342e'
        };

        listaCores.forEach((c, idx) => {
            const nomeCor = c.nome || c.cor || 'Padrão';
            const corHex = mapaCoresHex[nomeCor.toLowerCase()] || '#888888';
            containerCores.insertAdjacentHTML('beforeend', `
                <label title="${nomeCor}">
                    <input type="radio" name="cor" value="${nomeCor}" ${idx === 0 ? 'checked' : ''}>
                    <span class="box-cor" style="background-color: ${corHex};"></span>
                </label>
            `);
        });
    }

    // ==========================================
    // 3. CONTROLE DE QUANTIDADE E ESTOQUE
    // ==========================================
    const inputQtd = document.getElementById('qtd-produto');
    const btnMais = document.getElementById('btn-qtd-mais');
    const btnMenos = document.getElementById('btn-qtd-menos');
    const estoqueMax = parseInt(produto.estoque || 1);

    if (btnMais && inputQtd) {
        btnMais.onclick = () => {
            let val = parseInt(inputQtd.value) || 1;
            if (val < estoqueMax) {
                inputQtd.value = val + 1;
            } else {
                alert(`Quantidade máxima disponível em estoque: ${estoqueMax} un.`);
            }
        };
    }

    if (btnMenos && inputQtd) {
        btnMenos.onclick = () => {
            let val = parseInt(inputQtd.value) || 1;
            if (val > 1) inputQtd.value = val - 1;
        };
    }

    // ==========================================
    // 4. CORAÇÃO DE FAVORITOS (ROBUSTO E IMEDIATO)
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
    }

    function atualizarEstadoVisualBotao() {
        const btn = document.getElementById('btn-favorito-detalhes');
        if (!btn) return;
        const lista = obterFavoritos();
        const jaFavoritado = lista.some(f => String(f.id) === String(prodIdFinal));
        btn.classList.toggle('ativo', jaFavoritado);
    }

    // Define o estado visual logo ao carregar a página
    atualizarEstadoVisualBotao();

    // Registo de clique direto e infalível
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#btn-favorito-detalhes');
        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();

        let lista = obterFavoritos();
        const idx = lista.findIndex(f => String(f.id) === String(prodIdFinal));

        if (idx !== -1) {
            // Se já existia na lista, remove
            lista.splice(idx, 1);
            btn.classList.remove('ativo');
            mostrarToastNotificacao("Peça removida dos seus favoritos!");
        } else {
            // Adiciona a peça aos favoritos
            lista.push({
                id: produto.id,
                nome: produto.nome,
                preco: produto.precoPromocional || produto.preco,
                imagem: (produto.imagens && produto.imagens.length > 0) ? produto.imagens[0] : (produto.imagem || 'img/produto1.jpg')
            });
            btn.classList.add('ativo');
            mostrarToastNotificacao("Peça salva nos seus favoritos! ❤️");
        }

        salvarFavoritos(lista);
    });

    // ==========================================
    // 5. AVALIAÇÕES (LIMPO: "Sem avaliações" SE VAZIO)
    // ==========================================
    const textoAvaliacoes = document.getElementById('detalhe-qtd-avaliacoes');
    const containerGridAv = document.getElementById('grid-avaliacoes');
    const linkRolarAvaliacoes = document.getElementById('link-avaliacoes');

    function carregarAvaliacoes() {
        const todasAv = JSON.parse(localStorage.getItem('vr_modas_avaliacoes')) || [];
        const desteProduto = todasAv.filter(a => String(a.produtoId) === prodIdFinal);

        if (textoAvaliacoes) {
            if (desteProduto.length > 0) {
                textoAvaliacoes.innerText = `(${desteProduto.length} avaliações)`;
                document.querySelectorAll('#detalhe-estrelas span').forEach(s => s.style.color = 'var(--dourado, #d4af37)');
            } else {
                textoAvaliacoes.innerText = "Sem avaliações";
                document.querySelectorAll('#detalhe-estrelas span').forEach(s => s.style.color = '#555');
            }
        }

        if (!containerGridAv) return;
        containerGridAv.innerHTML = '';

        if (desteProduto.length === 0) {
            containerGridAv.innerHTML = `
                <div class="aviso-sem-avaliacoes">
                    <p>Esta peça ainda não possui avaliações.</p>
                    <span>Seja a primeira pessoa a avaliar sua compra!</span>
                </div>
            `;
            return;
        }

        desteProduto.forEach(a => {
            const estrelasStr = '★'.repeat(a.nota) + '☆'.repeat(5 - a.nota);
            containerGridAv.insertAdjacentHTML('beforeend', `
                <div class="card-avaliacao-item">
                    <div class="estrelas-card">${estrelasStr}</div>
                    <p class="comentario-card">"${a.comentario}"</p>
                    <div class="autor-card">
                        <span>${a.autor}</span>
                        <span class="badge-verificado">✓ Compra verificada</span>
                    </div>
                </div>
            `);
        });
    }

    carregarAvaliacoes();

    if (linkRolarAvaliacoes) {
        linkRolarAvaliacoes.onclick = () => {
            const sec = document.getElementById('secao-avaliacoes');
            if (sec) sec.scrollIntoView({ behavior: 'smooth' });
        };
    }

    // Formulário de Nova Avaliação
    const btnAbrirForm = document.getElementById('btn-abrir-form-av');
    const btnCancForm = document.getElementById('btn-cancelar-av');
    const containerFormAv = document.getElementById('form-avaliacao-container');
    const formAv = document.getElementById('form-avaliacao');
    let notaSelecionada = 5;

    if (btnAbrirForm && containerFormAv) btnAbrirForm.onclick = () => containerFormAv.style.display = 'block';
    if (btnCancForm && containerFormAv) btnCancForm.onclick = () => containerFormAv.style.display = 'none';

    document.querySelectorAll('.estrela-opcao').forEach(star => {
        star.onclick = () => {
            notaSelecionada = parseInt(star.getAttribute('data-nota'));
            document.querySelectorAll('.estrela-opcao').forEach(s => {
                s.classList.toggle('ativa', parseInt(s.getAttribute('data-nota')) <= notaSelecionada);
            });
        };
    });

    if (formAv) {
        formAv.onsubmit = (e) => {
            e.preventDefault();
            const autor = document.getElementById('av-nome-autor').value.trim();
            const comentario = document.getElementById('av-comentario').value.trim();

            const todasAv = JSON.parse(localStorage.getItem('vr_modas_avaliacoes')) || [];
            todasAv.unshift({
                id: Date.now(),
                produtoId: prodIdFinal,
                autor: autor,
                comentario: comentario,
                nota: notaSelecionada,
                data: new Date().toLocaleDateString('pt-BR')
            });

            localStorage.setItem('vr_modas_avaliacoes', JSON.stringify(todasAv));
            formAv.reset();
            containerFormAv.style.display = 'none';
            carregarAvaliacoes();
            mostrarToastNotificacao("Avaliação publicada com sucesso! Obrigado.");
        };
    }

    // ==========================================
    // 6. MODAL DO GUIA DE MEDIDAS
    // ==========================================
    const btnAbrirGuia = document.getElementById('btn-abrir-guia-medidas');
    const btnFecharGuia = document.getElementById('btn-fechar-guia');
    const modalGuia = document.getElementById('modal-guia-medidas');

    if (btnAbrirGuia && modalGuia) btnAbrirGuia.onclick = () => modalGuia.style.display = 'flex';
    if (btnFecharGuia && modalGuia) btnFecharGuia.onclick = () => modalGuia.style.display = 'none';

    // ==========================================
    // AUXILIAR: NOTIFICAÇÃO TOAST
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