/* =====================================================
   DETALHES DO PRODUTO, FAVORITOS & AVALIAÇÕES - VR MODAS
   Conectado de forma segura ao Banco de Dados Neon
   ===================================================== */

function escaparHtmlDetalhes(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function urlImagemSeguraDetalhes(src) {
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
        return escaparHtmlDetalhes(val);
    }
    return 'img/produto1.jpg';
}

async function obterSqlDetalhesSeguro() {
    if (typeof window.getSql === 'function') {
        const s = await window.getSql();
        if (s) return s;
    }
    if (window.sql) return window.sql;
    return null;
}

function normalizarListaCores(coresRaw) {
    if (!coresRaw) return ['Padrão'];
    let arr = coresRaw;
    if (typeof coresRaw === 'string') {
        try {
            arr = coresRaw.trim().startsWith('[') ? JSON.parse(coresRaw) : coresRaw.split(',');
        } catch (e) {
            arr = coresRaw.split(',');
        }
    }
    if (!Array.isArray(arr) || arr.length === 0) return ['Padrão'];

    return arr.map(item => {
        if (typeof item === 'object' && item !== null) {
            return String(item.nome || item.cor || 'Padrão').trim();
        }
        return String(item).trim();
    }).filter(Boolean);
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const produtoIdUrl = urlParams.get('id');

    let produtos = JSON.parse(localStorage.getItem('vr_modas_db')) || [];

    // 1. Localiza no cache
    let produto = null;
    if (produtoIdUrl) {
        produto = produtos.find(p => String(p.id).trim() === String(produtoIdUrl).trim());
    }

    // 2. Se não achou no cache ou deu F5 direto, busca no Neon de forma segura
    if (!produto && produtoIdUrl) {
        const idNumUrl = parseInt(produtoIdUrl, 10);
        if (!isNaN(idNumUrl)) {
            try {
                const sql = await obterSqlDetalhesSeguro();
                if (sql) {
                    const res = await sql`SELECT * FROM produtos WHERE id = ${idNumUrl} LIMIT 1;`;
                    if (res.length > 0) {
                        const item = res[0];
                        produto = {
                            id: item.id,
                            nome: item.nome,
                            preco: parseFloat(item.preco),
                            precoPromocional: item.preco_promocional ? parseFloat(item.preco_promocional) : null,
                            descricao: item.descricao || '',
                            categoria: item.categoria || 'geral',
                            estoque: item.estoque !== null ? parseInt(item.estoque, 10) : 10,
                            imagem: item.imagem || 'img/produto1.jpg',
                            imagens: Array.isArray(item.imagens) ? item.imagens : (typeof item.imagens === 'string' ? JSON.parse(item.imagens) : [item.imagem || 'img/produto1.jpg']),
                            tamanhos: Array.isArray(item.tamanhos) ? item.tamanhos : ['P', 'M', 'G'],
                            cores: item.cores || ['Padrão']
                        };
                    }
                }
            } catch (e) {
                console.warn("Aviso ao buscar peça no Neon:", e);
            }
        }
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

    if (elPreco) {
        const precoVal = Number(produto.preco || 0);
        const promoVal = Number(produto.precoPromocional || 0);
        const precoFormatado = precoVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        if (promoVal > 0 && promoVal < precoVal) {
            const promoFormatado = promoVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            elPreco.innerHTML = `
                <span style="text-decoration: line-through; color: #777; font-size: 16px; margin-right: 8px;">${escaparHtmlDetalhes(precoFormatado)}</span>
                <span style="color: var(--dourado, #d4af37); font-weight: bold;">${escaparHtmlDetalhes(promoFormatado)}</span>
            `;
        } else {
            elPreco.innerText = precoFormatado;
        }
    }

    if (elDesc) elDesc.innerText = produto.descricao || 'Peça exclusiva confeccionada com tecido e acabamento de alto padrão.';

    const fotos = (produto.imagens && produto.imagens.length > 0) ? produto.imagens : [produto.imagem || 'img/produto1.jpg'];
    if (elImg) {
        elImg.src = urlImagemSeguraDetalhes(fotos[0]);
        elImg.onerror = () => { elImg.src = 'img/produto1.jpg'; };
    }

    if (galeriaEl && fotos.length > 1) {
        const miniaturasExistentes = galeriaEl.querySelector('.miniaturas');
        if (miniaturasExistentes) miniaturasExistentes.remove();

        const containerMinis = document.createElement('div');
        containerMinis.className = 'miniaturas';
        fotos.forEach((foto, idx) => {
            const fotoSegura = urlImagemSeguraDetalhes(foto);
            const thumb = document.createElement('img');
            thumb.src = fotoSegura;
            thumb.className = `miniatura-foto ${idx === 0 ? 'ativa' : ''}`;
            thumb.onclick = () => {
                if (elImg) elImg.src = fotoSegura;
                containerMinis.querySelectorAll('.miniatura-foto').forEach(t => t.classList.remove('ativa'));
                thumb.classList.add('ativa');
            };
            containerMinis.appendChild(thumb);
        });
        galeriaEl.appendChild(containerMinis);
    }

    // ==========================================
    // 2. SELETOR DE TAMANHOS E CORES (LIMPOS)
    // ==========================================
    const containerTamanhos = document.getElementById('detalhe-tamanhos');
    if (containerTamanhos) {
        containerTamanhos.innerHTML = '';
        let gradeTamanhos = ['P', 'M', 'G'];
        if (Array.isArray(produto.tamanhos) && produto.tamanhos.length > 0) {
            gradeTamanhos = produto.tamanhos;
        } else if (typeof produto.tamanhos === 'string' && produto.tamanhos.trim().startsWith('[')) {
            try { gradeTamanhos = JSON.parse(produto.tamanhos); } catch (e) {}
        }

        gradeTamanhos.forEach((tam, idx) => {
            const tamTexto = escaparHtmlDetalhes(typeof tam === 'object' ? (tam.tamanho || 'Único') : String(tam));
            containerTamanhos.insertAdjacentHTML('beforeend', `
                <label style="cursor: pointer; margin-right: 6px;">
                    <input type="radio" name="tamanho" value="${tamTexto}" ${idx === 0 ? 'checked' : ''}>
                    <span class="box-tamanho">${tamTexto}</span>
                </label>
            `);
        });
    }

    const containerCores = document.getElementById('detalhe-cores');
    if (containerCores) {
        containerCores.innerHTML = '';
        const mapaCoresHex = {
            'preto': '#000000', 'preta': '#000000',
            'branco': '#ffffff', 'branca': '#ffffff',
            'dourado': '#d4af37', 'amarelo': '#fbc02d', 'amarela': '#fbc02d',
            'vermelho': '#d32f2f', 'vermelha': '#d32f2f',
            'azul': '#1e88e5', 'azul marinho': '#0d1b2a', 'azul claro': '#81d4fa',
            'rosa': '#e91e63', 'pink': '#ec407a',
            'verde': '#2e7d32', 'verde militar': '#4b5320',
            'bege': '#f5f5dc', 'nude': '#e3bc9a', 'marrom': '#5d4037',
            'vinho': '#58111a', 'roxo': '#7b1fa2', 'lilás': '#ce93d8',
            'cinza': '#757575', 'laranja': '#f57c00'
        };

        const listaCoresLimpas = normalizarListaCores(produto.cores);
        listaCoresLimpas.forEach((nomeCor, idx) => {
            const corSegura = escaparHtmlDetalhes(nomeCor);
            const corHex = mapaCoresHex[nomeCor.toLowerCase()] || '#d4af37';
            containerCores.insertAdjacentHTML('beforeend', `
                <label title="${corSegura}" style="cursor: pointer; margin-right: 8px; display: inline-flex; align-items: center; gap: 5px;">
                    <input type="radio" name="cor" value="${corSegura}" ${idx === 0 ? 'checked' : ''} style="display:none;">
                    <span class="box-cor" style="background-color: ${corHex}; border: 1px solid #555;"></span>
                    <small style="color: #ccc; font-size: 11px;">${corSegura}</small>
                </label>
            `);
        });
    }

    // ==========================================
    // 3. CONTROLE DE QUANTIDADE E ESTOQUE
    // ==========================================
    const inputQtd = document.getElementById('qtd-produto');
    const controleQtd = document.querySelector('.controle-quantidade') || document.querySelector('.controle-qtd');
    const estoqueMax = parseInt(produto.estoque || 1, 10);
    const btnAddSacola = document.getElementById('btn-adicionar-sacola');

    if (estoqueMax <= 0 && btnAddSacola) {
        btnAddSacola.disabled = true;
        btnAddSacola.innerText = 'Produto Esgotado';
        btnAddSacola.classList.add('btn-desativado');
        if (inputQtd) inputQtd.value = 0;
    }

    if (controleQtd && inputQtd && estoqueMax > 0) {
        controleQtd.onclick = (e) => {
            let val = parseInt(inputQtd.value || '1', 10);
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
    // 4. CORAÇÃO DE FAVORITOS
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
    // 5. AVALIAÇÕES (VIA /api/avaliacoes + CACHE)
    // ==========================================
    const containerListaAv = document.getElementById('lista-avaliacoes-peca') || document.getElementById('grid-avaliacoes');
    const formAv = document.getElementById('form-avaliacao-cliente') || document.getElementById('form-avaliacao');
    const btnAbrirFormAv = document.getElementById('btn-abrir-form-avaliacao') || document.getElementById('btn-abrir-form-av');
    const btnCancelarFormAv = document.getElementById('btn-cancelar-av');
    const btnSubmitAv = document.getElementById('btn-submit-av');
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
            const val = parseInt(this.getAttribute('data-valor') || this.getAttribute('data-nota') || '5', 10);
            notaSelecionada = val;
            if (inputNotaOculto) inputNotaOculto.value = val;
            estrelasClique.forEach((s, idx) => {
                s.classList.toggle('ativa', idx < val);
            });
        };
    });

    async function carregarAvaliacoes() {
        let daPeca = [];

        try {
            const resp = await fetch('/api/avaliacoes');
            if (resp.ok) {
                const dados = await resp.json();
                const todas = Array.isArray(dados.avaliacoes) ? dados.avaliacoes : [];
                localStorage.setItem('vr_modas_avaliacoes', JSON.stringify(todas));

                daPeca = todas.filter(a =>
                    (a.produto_id && String(a.produto_id).trim() === prodIdFinal.trim()) ||
                    (a.produto_nome && String(a.produto_nome).toLowerCase().trim() === prodNomeFinal.toLowerCase().trim())
                );
            }
        } catch (e) {
            console.warn("Buscando avaliações em cache:", e);
        }

        if (daPeca.length === 0) {
            const todasAv = JSON.parse(localStorage.getItem('vr_modas_avaliacoes')) || [];
            daPeca = todasAv.filter(a =>
                String(a.produtoId || a.produto_id || '').trim() === prodIdFinal.trim() ||
                ((a.produtoNome || a.produto_nome || '').toLowerCase().trim() === prodNomeFinal.toLowerCase().trim())
            );
        }

        const txtQtdTopo = document.getElementById('detalhe-qtd-avaliacoes');
        const estrelasSpans = document.querySelectorAll('#detalhe-estrelas span, #detalhe-estrelas .est-item');

        if (daPeca.length > 0) {
            const soma = daPeca.reduce((acc, cur) => acc + (Number(cur.nota) || 5), 0);
            const mediaExata = soma / daPeca.length;
            const estrelasCheias = Math.round(mediaExata);

            if (txtQtdTopo) {
                txtQtdTopo.innerHTML = `<strong>${mediaExata.toFixed(1)}</strong> (${daPeca.length} ${daPeca.length === 1 ? 'avaliação' : 'avaliações'})`;
                txtQtdTopo.style.color = '#ffffff';
            }

            estrelasSpans.forEach((span, i) => {
                span.classList.toggle('cheia', i < estrelasCheias);
                span.style.color = i < estrelasCheias ? 'var(--dourado, #d4af37)' : '#444';
            });
        } else {
            if (txtQtdTopo) {
                txtQtdTopo.innerHTML = `<strong>0.0</strong> (0 avaliações)`;
                txtQtdTopo.style.color = '#777777';
            }
            estrelasSpans.forEach(span => {
                span.classList.remove('cheia');
                span.style.color = '#444';
            });
        }

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
            const textoComentario = escaparHtmlDetalhes(av.texto || av.comentario || '');
            const autorSeguro = escaparHtmlDetalhes(av.autor || 'Cliente');
            const notaVal = Math.min(5, Math.max(1, parseInt(av.nota || 5, 10)));
            const estrelasTxt = '★'.repeat(notaVal) + '☆'.repeat(5 - notaVal);
            containerListaAv.insertAdjacentHTML('beforeend', `
                <div class="card-avaliacao-item">
                    <div class="estrelas-card">${estrelasTxt}</div>
                    <p class="comentario-card">"${textoComentario}"</p>
                    <small class="autor-card">— ${autorSeguro} <span class="badge-verificado">✓ Compra Verificada</span></small>
                </div>
            `);
        });
    }

    await carregarAvaliacoes();

    const linkAv = document.getElementById('link-avaliacoes');
    if (linkAv) {
        linkAv.onclick = () => {
            const sec = document.getElementById('secao-avaliacoes') || containerListaAv;
            if (sec) sec.scrollIntoView({ behavior: 'smooth' });
        };
    }

    if (formAv) {
        formAv.onsubmit = async function (e) {
            e.preventDefault();
            const inputAutor = document.getElementById('autor-avaliacao') || document.getElementById('av-nome-autor');
            const inputTexto = document.getElementById('texto-avaliacao') || document.getElementById('av-comentario');

            const autor = inputAutor ? inputAutor.value.trim() : '';
            const texto = inputTexto ? inputTexto.value.trim() : '';

            if (!autor || !texto) {
                alert("Por favor, preencha o seu nome e o comentário.");
                return;
            }

            if (btnSubmitAv) {
                btnSubmitAv.disabled = true;
                btnSubmitAv.innerText = "Publicando...";
            }

            try {
                const resp = await fetch('/api/avaliacoes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        produto_id: prodIdFinal,
                        produto_nome: prodNomeFinal,
                        autor,
                        texto,
                        nota: notaSelecionada
                    })
                });

                const dados = await resp.json();

                if (!resp.ok || !dados.sucesso) {
                    alert(dados.erro || "Não foi possível publicar a avaliação.");
                    return;
                }

                formAv.reset();
                formAv.style.display = 'none';
                await carregarAvaliacoes();
                mostrarToastNotificacao("Avaliação publicada com sucesso! ✨");
            } catch (erroRede) {
                console.error("Erro ao publicar avaliação:", erroRede);
                alert("Erro de conexão ao salvar avaliação.");
            } finally {
                if (btnSubmitAv) {
                    btnSubmitAv.disabled = false;
                    btnSubmitAv.innerText = "Publicar Avaliação";
                }
            }
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
        toast.innerHTML = `<span>✨</span> ${escaparHtmlDetalhes(msg)}`;
        toastBox.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('mostrar');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }
});