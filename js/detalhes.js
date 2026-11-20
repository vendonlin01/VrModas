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