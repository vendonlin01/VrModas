document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. SISTEMA DE NAVEGAÇÃO ENTRE ABAS
    // ==========================================
    const botoesNav = document.querySelectorAll('#sidebar-nav .nav-btn');
    const secoes = document.querySelectorAll('.secao-admin');
    const tituloSecao = document.getElementById('titulo-secao-atual');
    const subtituloSecao = document.getElementById('subtitulo-secao-atual');

    const mapaTitulos = {
        'secao-dashboard': { titulo: 'Dashboard & Vendas', sub: 'Visão geral do faturamento, pedidos e relatórios de desempenho.' },
        'secao-cadastro': { titulo: 'Cadastrar Nova Peça', sub: 'Adicione novos produtos com cores, tamanhos e fotos compactadas.' },
        'secao-catalogo': { titulo: 'Catálogo & Estoque', sub: 'Gerencie peças cadastradas, preços e monitore estoque baixo.' },
        'secao-pedidos': { titulo: 'Pedidos dos Clientes', sub: 'Acompanhe as compras feitas pela sacola e emita comprovantes.' },
        'secao-banners': { titulo: 'Banners da Vitrine', sub: 'Gerencie os sliders e chamadas promocionais da tela inicial.' },
        'secao-config': { titulo: 'Configurações & Backup', sub: 'Defina canais oficiais de suporte, códigos promocionais e cópias de segurança.' }
    };

    function alternarAbaAdmin(idAlvo) {
        if (!idAlvo) return;

        botoesNav.forEach(btn => {
            btn.classList.toggle('ativo', btn.getAttribute('data-alvo') === idAlvo);
        });

        secoes.forEach(sec => {
            if (sec.id === idAlvo) {
                sec.classList.add('ativa');
                sec.style.display = 'block';
            } else {
                sec.classList.remove('ativa');
                sec.style.display = 'none';
            }
        });

        if (mapaTitulos[idAlvo]) {
            if (tituloSecao) tituloSecao.innerText = mapaTitulos[idAlvo].titulo;
            if (subtituloSecao) subtituloSecao.innerText = mapaTitulos[idAlvo].sub;
        }

        if (idAlvo === 'secao-dashboard') atualizarDashboard();
        if (idAlvo === 'secao-catalogo') atualizarTabelaProdutos();
        if (idAlvo === 'secao-pedidos') atualizarTabelaPedidos();
        if (idAlvo === 'secao-config') {
            carregarConfiguracoes();
            atualizarListaCupons();
        }
    }

    botoesNav.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            alternarAbaAdmin(btn.getAttribute('data-alvo'));
        });
    });

    // ==========================================
    // 2. COMPRESSÃO DE IMAGENS (CANVAS)
    // ==========================================
    function comprimirImagem(file, callback) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const maxWidth = 700;
                const scale = maxWidth / img.width;
                canvas.width = (img.width > maxWidth) ? maxWidth : img.width;
                canvas.height = (img.width > maxWidth) ? img.height * scale : img.height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                callback(canvas.toDataURL('image/jpeg', 0.75));
            };
        };
    }

    // ==========================================
    // 3. TAMANHOS DINÂMICOS POR CATEGORIA
    // ==========================================
    const selectCategoria = document.getElementById('categoria-produto');
    const containerTamanhos = document.getElementById('container-tamanhos-dinamicos');

    const mapaTamanhos = {
        camisas: ['PP', 'P', 'M', 'G', 'GG', 'XGG'],
        calcas: ['36', '38', '40', '42', '44', '46', '48'],
        bermudas: ['36', '38', '40', '42', '44', '46', '48'],
        vestidos: ['PP', 'P', 'M', 'G', 'GG', '38', '40', '42', 'Único'],
        conjuntos: ['PP', 'P', 'M', 'G', 'GG', '38', '40', '42', 'Único'],
        bolsas: ['Único'],
        cintos: ['P', 'M', 'G', 'Único'],
        joias: ['Único'],
        acessorios: ['Único']
    };

    function renderizarTamanhosPorCategoria(cat, tamanhosSelecionados = []) {
        if (!containerTamanhos) return;
        const lista = mapaTamanhos[cat] || ['P', 'M', 'G', 'GG', 'Único'];
        containerTamanhos.innerHTML = '';
        lista.forEach(tam => {
            const checked = tamanhosSelecionados.includes(tam) ? 'checked' : '';
            containerTamanhos.insertAdjacentHTML('beforeend', `
                <label style="margin-right: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; font-size: 12px;">
                    <input type="checkbox" value="${tam}" class="check-tamanho" ${checked}> ${tam}
                </label>
            `);
        });
    }

    if (selectCategoria) {
        selectCategoria.onchange = function() {
            renderizarTamanhosPorCategoria(this.value);
        };
    }

    // ==========================================
    // 4. DASHBOARD & GRÁFICOS (CHART.JS)
    // ==========================================
    let chartVendas = null;
    let chartCategorias = null;

    function atualizarDashboard() {
        const produtos = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
        const pedidos = JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [];

        const totalFat = pedidos.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
        const itensBaixos = produtos.filter(p => parseInt(p.estoque || 0) < 5).length;

        const elFat = document.getElementById('dash-faturamento');
        const elPed = document.getElementById('dash-total-pedidos');
        const elEst = document.getElementById('dash-estoque-baixo');
        const elTot = document.getElementById('dash-total-produtos');

        if (elFat) elFat.innerText = totalFat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (elPed) elPed.innerText = pedidos.length;
        if (elEst) elEst.innerText = itensBaixos;
        if (elTot) elTot.innerText = produtos.length;

        if (window.Chart) {
            const ctxVendas = document.getElementById('graficoVendas');
            if (ctxVendas) {
                if (chartVendas) chartVendas.destroy();
                const labels = pedidos.slice(0, 7).reverse().map((p, i) => p.data ? p.data.split(' ')[0] : `Ped ${i+1}`);
                const dataValores = pedidos.slice(0, 7).reverse().map(p => Number(p.total) || 0);

                chartVendas = new Chart(ctxVendas, {
                    type: 'line',
                    data: {
                        labels: labels.length ? labels : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Hoje'],
                        datasets: [{
                            label: 'Vendas (R$)',
                            data: dataValores.length ? dataValores : [0, 0, 0, 0, 0, 0, 0],
                            borderColor: '#d4af37',
                            backgroundColor: 'rgba(212, 175, 55, 0.1)',
                            fill: true,
                            tension: 0.35,
                            borderWidth: 2,
                            pointBackgroundColor: '#d4af37'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { grid: { color: '#222' }, ticks: { color: '#888' } },
                            y: { grid: { color: '#222' }, ticks: { color: '#888' } }
                        }
                    }
                });
            }

            const ctxCategorias = document.getElementById('graficoCategorias');
            if (ctxCategorias) {
                if (chartCategorias) chartCategorias.destroy();
                const contagens = {};
                produtos.forEach(p => {
                    const c = p.categoria || 'Geral';
                    contagens[c] = (contagens[c] || 0) + 1;
                });

                chartCategorias = new Chart(ctxCategorias, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(contagens).length ? Object.keys(contagens) : ['Sem dados'],
                        datasets: [{
                            data: Object.values(contagens).length ? Object.values(contagens) : [1],
                            backgroundColor: ['#d4af37', '#e91e63', '#1e88e5', '#4caf50', '#ff9800', '#9c27b0'],
                            borderWidth: 1,
                            borderColor: '#141414'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { color: '#aaa', font: { size: 11 } } }
                        }
                    }
                });
            }
        }
    }

    // ==========================================
    // 5. CADASTRO E EDIÇÃO DE PRODUTOS & CORES DINÂMICAS
    // ==========================================
    const formAdmin = document.getElementById('form-cadastro-produto');
    const inputFoto = document.getElementById('foto-produto');
    const previewContainer = document.getElementById('preview-fotos');
    const editandoIdInput = document.getElementById('editando-id');
    const tituloFormProduto = document.getElementById('titulo-form-produto');
    const btnSubmitProduto = document.getElementById('btn-submit-produto');
    const btnCancelarEdicao = document.getElementById('btn-cancelar-edicao');

    const inPreco = document.getElementById('preco-produto');
    const inPromo = document.getElementById('preco-promocional-produto');
    const avisoDesc = document.getElementById('aviso-desconto');

    let fotosAtuais = [];
    let listaCoresCadastradas = []; // Formato: [{ cor: 'Azul', qtd: 5 }, { cor: 'Preto', qtd: 10 }]

    // Elementos do Gerenciador de Cores
    const inputNomeCor = document.getElementById('input-nome-cor');
    const inputQtdCor = document.getElementById('input-qtd-cor');
    const btnAdicionarCor = document.getElementById('btn-adicionar-cor');
    const containerListaCores = document.getElementById('lista-cores-adicionadas');
    const inTotalEstoque = document.getElementById('estoque-produto');
    const inCoresOculto = document.getElementById('cores-produto');
    const inEstoqueCorOculto = document.getElementById('estoque-por-cor-produto');

    function renderizarTagsCores() {
        if (!containerListaCores) return;
        containerListaCores.innerHTML = '';

        if (listaCoresCadastradas.length === 0) {
            containerListaCores.innerHTML = '<span style="color: #666; font-size: 11.5px; font-style: italic;">Nenhuma cor adicionada ainda. Digite o nome, quantidade e aperte (+).</span>';
            if (inTotalEstoque) inTotalEstoque.value = 0;
            if (inCoresOculto) inCoresOculto.value = '';
            if (inEstoqueCorOculto) inEstoqueCorOculto.value = '';
            return;
        }

        let totalSoma = 0;
        const nomesCores = [];
        const resumoEstoque = [];

        listaCoresCadastradas.forEach((item, index) => {
            totalSoma += item.qtd;
            nomesCores.push(item.cor);
            resumoEstoque.push(`${item.cor}: ${item.qtd}`);

            const chip = document.createElement('div');
            chip.style.cssText = "display: inline-flex; align-items: center; gap: 8px; background: #1a1a1a; border: 1px solid #333; padding: 6px 12px; border-radius: 20px; font-size: 12px; color: #fff;";
            chip.innerHTML = `
                <span style="font-weight: 700; color: var(--dourado);">${item.cor}</span>
                <span style="background: #2b2b2b; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">${item.qtd} un</span>
                <button type="button" style="background: none; border: none; color: #ff5252; cursor: pointer; font-size: 13px; font-weight: bold; line-height: 1; padding: 0 2px;" title="Remover cor" onclick="removerCorItem(${index})">✕</button>
            `;
            containerListaCores.appendChild(chip);
        });

        if (inTotalEstoque) inTotalEstoque.value = totalSoma;
        if (inCoresOculto) inCoresOculto.value = nomesCores.join(', ');
        if (inEstoqueCorOculto) inEstoqueCorOculto.value = resumoEstoque.join(', ');
    }

    window.removerCorItem = function(index) {
        listaCoresCadastradas.splice(index, 1);
        renderizarTagsCores();
    };

    if (btnAdicionarCor) {
        btnAdicionarCor.onclick = function() {
            const nome = inputNomeCor.value.trim();
            const qtd = parseInt(inputQtdCor.value);

            if (!nome) {
                alert("Digite o nome da cor!");
                inputNomeCor.focus();
                return;
            }
            if (isNaN(qtd) || qtd <= 0) {
                alert("Informe uma quantidade válida para esta cor!");
                inputQtdCor.focus();
                return;
            }

            const corExistente = listaCoresCadastradas.find(c => c.cor.toLowerCase() === nome.toLowerCase());
            if (corExistente) {
                corExistente.qtd += qtd;
            } else {
                listaCoresCadastradas.push({ cor: nome, qtd: qtd });
            }

            inputNomeCor.value = '';
            inputQtdCor.value = '';
            inputNomeCor.focus();
            renderizarTagsCores();
        };
    }

    // Cálculo automático de desconto
    function atualizarCalculoDesconto() {
        if (!inPreco || !inPromo || !avisoDesc) return;
        const vNormal = parseFloat(inPreco.value) || 0;
        const vPromo = parseFloat(inPromo.value) || 0;

        if (vNormal > 0 && vPromo > 0 && vPromo < vNormal) {
            const perc = Math.round(((vNormal - vPromo) / vNormal) * 100);
            const economia = (vNormal - vPromo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            avisoDesc.style.display = 'block';
            avisoDesc.innerText = `✓ Desconto de ${perc}% aplicado (Economia de ${economia})`;
        } else {
            avisoDesc.style.display = 'none';
        }
    }

    if (inPreco) inPreco.addEventListener('input', atualizarCalculoDesconto);
    if (inPromo) inPromo.addEventListener('input', atualizarCalculoDesconto);

    // Miniaturas com exclusão individual
    function renderizarPreviewFotos() {
        if (!previewContainer) return;
        previewContainer.innerHTML = '';
        fotosAtuais.forEach((foto, index) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${foto}" alt="Foto ${index + 1}">
                <button type="button" class="btn-del-preview" data-index="${index}" title="Remover foto">✕</button>
            `;
            previewContainer.appendChild(div);
        });

        previewContainer.querySelectorAll('.btn-del-preview').forEach(btn => {
            btn.onclick = function() {
                const idx = parseInt(this.getAttribute('data-index'));
                fotosAtuais.splice(idx, 1);
                renderizarPreviewFotos();
            };
        });
    }

    if (inputFoto) {
        inputFoto.onchange = function() {
            if (!this.files || this.files.length === 0) return;
            Array.from(this.files).forEach(file => {
                comprimirImagem(file, (imgComprimida) => {
                    fotosAtuais.push(imgComprimida);
                    renderizarPreviewFotos();
                });
            });
            this.value = '';
        };
    }

    function resetarModoEdicao() {
        if (editandoIdInput) editandoIdInput.value = "";
        if (tituloFormProduto) tituloFormProduto.innerText = "➕ Cadastrar Nova Peça";
        if (btnSubmitProduto) btnSubmitProduto.innerText = "💾 Salvar Peça no Catálogo";
        if (btnCancelarEdicao) btnCancelarEdicao.style.display = "none";
        
        fotosAtuais = [];
        renderizarPreviewFotos();

        listaCoresCadastradas = [];
        renderizarTagsCores();

        const checkPromo = document.getElementById('destaque-promocao');
        if (checkPromo) checkPromo.checked = false;

        if (inPromo) inPromo.value = '';
        if (avisoDesc) avisoDesc.style.display = 'none';

        if (document.getElementById('max-parcelas')) document.getElementById('max-parcelas').value = "3";
        if (document.getElementById('parcelas-sem-juros')) document.getElementById('parcelas-sem-juros').value = "3";
        if (document.getElementById('taxa-juros')) document.getElementById('taxa-juros').value = "2.99";

        if (formAdmin) formAdmin.reset();
        if (containerTamanhos) containerTamanhos.innerHTML = '<span style="color: #777; font-size: 12px;">Selecione primeiro uma categoria acima para carregar a grade.</span>';
    }

    if (btnCancelarEdicao) btnCancelarEdicao.onclick = resetarModoEdicao;

    if (formAdmin) {
        formAdmin.onsubmit = function(event) {
            event.preventDefault();
            const idEditando = editandoIdInput ? editandoIdInput.value : '';
            const nome = document.getElementById('nome-produto').value.trim();
            const preco = parseFloat(document.getElementById('preco-produto').value);
            const precoPromocionalRaw = document.getElementById('preco-promocional-produto').value;
            const precoPromocional = precoPromocionalRaw ? parseFloat(precoPromocionalRaw) : null;
            
            const categoria = document.getElementById('categoria-produto').value;
            const estoque = parseInt(document.getElementById('estoque-produto').value) || 0;
            const isPromocao = document.getElementById('destaque-promocao')?.checked || (precoPromocional !== null);
            
            const cores = inCoresOculto ? inCoresOculto.value.trim() : (document.getElementById('cores-produto')?.value.trim() || '');
            const estoquePorCor = inEstoqueCorOculto ? inEstoqueCorOculto.value.trim() : (document.getElementById('estoque-por-cor-produto')?.value.trim() || '');
            const descricao = document.getElementById('descricao-produto').value.trim();
            
            const tamanhos = [];
            document.querySelectorAll('.check-tamanho:checked').forEach(cb => tamanhos.push(cb.value));

            const maxParcelas = parseInt(document.getElementById('max-parcelas')?.value || '3');
            const parcelasSemJuros = parseInt(document.getElementById('parcelas-sem-juros')?.value || '3');
            const taxaJuros = parseFloat(document.getElementById('taxa-juros')?.value || '0');

            const imagensFinais = (fotosAtuais.length > 0) ? fotosAtuais : ["img/produto1.jpg"];

            const dadosComuns = { 
                nome, 
                preco, 
                precoPromocional,
                estoquePorCor,
                categoria, 
                estoque, 
                promocao: isPromocao, 
                cores, 
                tamanhos, 
                descricao,
                imagens: imagensFinais,
                pagamento: {
                    maxParcelas,
                    parcelasSemJuros,
                    taxaJuros
                }
            };

            salvarOuAtualizarProduto(idEditando, dadosComuns);
        };

        function salvarOuAtualizarProduto(idEditando, dados) {
            let banco = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
            try {
                if (idEditando) {
                    const idx = banco.findIndex(p => String(p.id) === String(idEditando));
                    if (idx !== -1) {
                        banco[idx] = { ...banco[idx], ...dados, id: banco[idx].id };
                    }
                } else {
                    const novoProduto = { id: Date.now(), ...dados };
                    banco.push(novoProduto);
                }

                localStorage.setItem('vr_modas_db', JSON.stringify(banco));
                resetarModoEdicao();
                atualizarDashboard();
                alternarAbaAdmin('secao-catalogo');
                alert(`Produto "${dados.nome}" guardado com sucesso!`);
            } catch (err) {
                alert("Armazenamento local cheio. Tente imagens menores.");
            }
        }
    }

    // ==========================================
    // 6. CATÁLOGO & ESTOQUE
    // ==========================================
    let categoriaAdminAtiva = 'todos';
    const listaProdutosAdmin = document.getElementById('lista-produtos-admin');

    function normalizarCategoria(cat) {
        if (!cat) return 'geral';
        let c = cat.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (c.endsWith('s')) c = c.slice(0, -1);
        return c;
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
        setCont('cont-cat-ofertas', produtos.filter(p => !!p.promocao || p.precoPromocional).length);
    }

    document.querySelectorAll('.btn-aba-cat').forEach(aba => {
        aba.onclick = function() {
            document.querySelectorAll('.btn-aba-cat').forEach(b => b.classList.remove('ativo'));
            this.classList.add('ativo');
            categoriaAdminAtiva = this.getAttribute('data-cat');
            atualizarTabelaProdutos();
        };
    });

    function atualizarTabelaProdutos() {
        if (!listaProdutosAdmin) return;
        let produtos = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
        atualizarContadoresAbas(produtos);

        if (categoriaAdminAtiva === 'ofertas') {
            produtos = produtos.filter(p => !!p.promocao || p.precoPromocional);
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
            let precoHTML = `<strong>${Number(prod.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>`;
            if (prod.precoPromocional) {
                precoHTML = `
                    <span style="text-decoration: line-through; color: #888; font-size: 11px;">${Number(prod.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><br>
                    <strong style="color: var(--dourado);">${Number(prod.precoPromocional).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                `;
            }

            const estoqueNum = parseInt(prod.estoque || 0);
            const badgeClass = estoqueNum < 5 ? 'badge-baixo' : 'badge-ok';
            const detalheCorStock = prod.estoquePorCor ? `<br><small style="color: #999; font-size: 10px;">${prod.estoquePorCor}</small>` : '';

            listaProdutosAdmin.insertAdjacentHTML('beforeend', `
                <tr>
                    <td><img src="${foto}" alt="${prod.nome}" class="img-miniatura-tabela" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid #333;" onerror="this.src='img/produto1.jpg'"></td>
                    <td><strong>${prod.nome}</strong></td>
                    <td style="text-transform: capitalize; color: var(--dourado);">${prod.categoria || 'Geral'}</td>
                    <td>${precoHTML}</td>
                    <td>
                        <span class="badge-estoque ${badgeClass}" style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${estoqueNum} un.</span>
                        ${detalheCorStock}
                    </td>
                    <td>
                        <button class="btn-acao btn-editar-prod" data-id="${prod.id}" style="background: transparent; color: var(--dourado); border: 1px solid var(--dourado); padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 700; margin-right: 4px;">✏️ Editar</button>
                        <button class="btn-acao btn-excluir-prod" data-id="${prod.id}" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 700;">🗑️ Excluir</button>
                    </td>
                </tr>
            `);
        });

        document.querySelectorAll('.btn-editar-prod').forEach(btn => {
            btn.onclick = function() {
                iniciarEdicaoProduto(this.getAttribute('data-id'));
            };
        });

        document.querySelectorAll('.btn-excluir-prod').forEach(btn => {
            btn.onclick = function() {
                const idProd = this.getAttribute('data-id');
                if (confirm("Remover este produto do catálogo?")) {
                    let lista = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
                    lista = lista.filter(p => String(p.id) !== String(idProd));
                    localStorage.setItem('vr_modas_db', JSON.stringify(lista));
                    atualizarTabelaProdutos();
                    atualizarDashboard();
                }
            };
        });
    }

    function iniciarEdicaoProduto(id) {
        const produtos = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
        const produto = produtos.find(p => String(p.id) === String(id));
        if (!produto) return;

        alternarAbaAdmin('secao-cadastro');

        if (editandoIdInput) editandoIdInput.value = produto.id;
        document.getElementById('nome-produto').value = produto.nome;
        document.getElementById('preco-produto').value = produto.preco;
        document.getElementById('preco-promocional-produto').value = produto.precoPromocional || '';
        
        atualizarCalculoDesconto();

        document.getElementById('categoria-produto').value = produto.categoria || '';
        renderizarTamanhosPorCategoria(produto.categoria || '', produto.tamanhos || []);

        document.getElementById('estoque-produto').value = produto.estoque || 0;
        
        // Reconstrói as cores e tags adicionadas
        listaCoresCadastradas = [];
        if (produto.estoquePorCor) {
            produto.estoquePorCor.split(',').forEach(item => {
                const partes = item.split(':');
                if (partes.length === 2) {
                    listaCoresCadastradas.push({ cor: partes[0].trim(), qtd: parseInt(partes[1].trim()) || 1 });
                }
            });
        } else if (produto.cores) {
            produto.cores.split(',').forEach(c => {
                if (c.trim()) listaCoresCadastradas.push({ cor: c.trim(), qtd: 1 });
            });
        }
        renderizarTagsCores();

        const checkPromo = document.getElementById('destaque-promocao');
        if (checkPromo) checkPromo.checked = !!produto.promocao;

        if (produto.pagamento) {
            if (document.getElementById('max-parcelas')) document.getElementById('max-parcelas').value = produto.pagamento.maxParcelas || 3;
            if (document.getElementById('parcelas-sem-juros')) document.getElementById('parcelas-sem-juros').value = produto.pagamento.parcelasSemJuros || 3;
            if (document.getElementById('taxa-juros')) document.getElementById('taxa-juros').value = produto.pagamento.taxaJuros ?? 2.99;
        }

        document.getElementById('descricao-produto').value = produto.descricao || '';

        fotosAtuais = produto.imagens ? [...produto.imagens] : (produto.imagem ? [produto.imagem] : ['img/produto1.jpg']);
        renderizarPreviewFotos();

        if (tituloFormProduto) tituloFormProduto.innerText = `✏️ Editando: ${produto.nome}`;
        if (btnSubmitProduto) btnSubmitProduto.innerText = "Atualizar Peça no Catálogo";
        if (btnCancelarEdicao) btnCancelarEdicao.style.display = "inline-block";
    }

    // ==========================================
    // 7. GESTÃO DE PEDIDOS RECEBIDOS & PDF
    // ==========================================
    const listaPedidosAdmin = document.getElementById('lista-pedidos-admin');

    function atualizarTabelaPedidos() {
        if (!listaPedidosAdmin) return;
        const pedidos = JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [];
        listaPedidosAdmin.innerHTML = '';

        if (pedidos.length === 0) {
            listaPedidosAdmin.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto); padding: 30px;">Nenhum pedido recebido até o momento.</td></tr>`;
            return;
        }

        pedidos.forEach(ped => {
            const totalFormatado = Number(ped.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            let resumoItens = ped.itens.map(it => `• <strong>${it.quantidade}x</strong> ${it.nome} <span style="color: #aaa; font-size: 11px;">(${it.tamanho || 'Padrão'} / ${it.cor || 'Padrão'})</span>`).join('<br>');
            
            const nomeCli = ped.cliente?.nome || "Cliente Visitante";
            const whatsCli = ped.cliente?.whatsapp || "Não informado";
            const endCli = ped.cliente?.endereco || "Retirada na Loja / A combinar";

            listaPedidosAdmin.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>
                        <strong style="color: var(--dourado); font-size: 13px;">${ped.codigo}</strong><br>
                        <small style="color: #fff; font-weight: 600;">${nomeCli}</small><br>
                        <small style="color: #888;">📱 ${whatsCli}</small>
                    </td>
                    <td style="font-size: 12px; color: var(--cinza-texto); white-space: nowrap;">${ped.data}</td>
                    <td style="font-size: 12.5px; line-height: 1.5;">${resumoItens}</td>
                    <td>
                        <strong style="color: var(--branco); font-size: 13.5px;">${totalFormatado}</strong><br>
                        <small style="color: var(--dourado); font-size: 10px;">${ped.formaPagamento || 'Pix'}</small>
                    </td>
                    <td>
                        <select class="select-status-pedido" data-id="${ped.id}" style="padding: 6px 10px; background: #111; color: var(--branco); border: 1px solid #444; border-radius: 4px; font-size: 12px; cursor: pointer;">
                            <option value="Pendente" ${ped.status === 'Pendente' ? 'selected' : ''}>⏳ Pendente</option>
                            <option value="Pago" ${ped.status === 'Pago' ? 'selected' : ''}>✅ Pago</option>
                            <option value="Enviado" ${ped.status === 'Enviado' ? 'selected' : ''}>📦 Enviado</option>
                        </select>
                    </td>
                    <td>
                        <div style="display: flex; gap: 6px;">
                            <button class="btn-imprimir-pedido" data-id="${ped.id}" style="background: var(--dourado); color: #000; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 700;">🖨️ PDF</button>
                            <button class="btn-excluir-pedido" data-id="${ped.id}" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 700;">🗑️</button>
                        </div>
                    </td>
                </tr>
            `);
        });

        document.querySelectorAll('.select-status-pedido').forEach(sel => {
            sel.onchange = function() {
                const idPed = this.getAttribute('data-id');
                const novoStatus = this.value;
                let pedidosAtuais = JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [];
                const idx = pedidosAtuais.findIndex(p => String(p.id) === String(idPed));
                if (idx !== -1) {
                    pedidosAtuais[idx].status = novoStatus;
                    localStorage.setItem('vr_modas_pedidos', JSON.stringify(pedidosAtuais));
                    atualizarDashboard();
                }
            };
        });

        document.querySelectorAll('.btn-imprimir-pedido').forEach(btn => {
            btn.onclick = function() { imprimirComprovantePedido(this.getAttribute('data-id')); };
        });

        document.querySelectorAll('.btn-excluir-pedido').forEach(btn => {
            btn.onclick = function() {
                const idPed = this.getAttribute('data-id');
                if (confirm("Remover este pedido?")) {
                    let pedidosAtuais = JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [];
                    pedidosAtuais = pedidosAtuais.filter(p => String(p.id) !== String(idPed));
                    localStorage.setItem('vr_modas_pedidos', JSON.stringify(pedidosAtuais));
                    atualizarTabelaPedidos();
                    atualizarDashboard();
                }
            };
        });
    }

    function imprimirComprovantePedido(id) {
        const pedidos = JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [];
        const pedido = pedidos.find(p => String(p.id) === String(id));
        if (!pedido) return;

        const janela = window.open('', '_blank');
        const linhasItens = pedido.itens.map(it => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    <strong>${it.nome}</strong><br>
                    <span style="font-size: 11px; color: #666;">Tamanho: ${it.tamanho} | Cor: ${it.cor}</span>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${it.quantidade}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${Number(it.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${(Number(it.preco) * Number(it.quantidade)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            </tr>
        `).join('');

        const endFormatado = pedido.cliente?.endereco || 'Retirada na Loja / A combinar';

        janela.document.write(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Pedido ${pedido.codigo} | VR Modas</title>
                <style>
                    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; margin: 30px; line-height: 1.5; font-size: 13px; }
                    .cabecalho { border-bottom: 2px solid #111; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
                    .titulo-vr { font-size: 24px; font-weight: 900; letter-spacing: 1px; margin: 0; }
                    .dados-quadro { background: #fafafa; border: 1px solid #eaeaea; padding: 14px 18px; border-radius: 6px; margin-bottom: 20px; }
                    .linha-dado { margin-bottom: 6px; }
                    .rotulo { font-weight: 700; color: #444; text-transform: uppercase; font-size: 11px; display: inline-block; width: 140px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    th { background: #f0f0f0; padding: 9px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #333; }
                    .total-box { margin-top: 25px; text-align: right; padding: 14px; background: #fafafa; border-radius: 6px; border: 1px solid #eaeaea; }
                    .total-destaque { font-size: 19px; font-weight: 900; color: #000; }
                    @media print { body { margin: 15px; } button { display: none; } }
                </style>
            </head>
            <body>
                <div class="cabecalho">
                    <div>
                        <h1 class="titulo-vr">VR MODAS</h1>
                        <p style="margin: 0; font-size: 12px; color: #666;">Comprovativo de Pedido & Expedição</p>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin: 0; color: #b89329; font-size: 18px;">${pedido.codigo}</h2>
                        <span style="font-size: 11px; color: #777;">${pedido.data}</span>
                    </div>
                </div>

                <div class="dados-quadro">
                    <div class="linha-dado"><span class="rotulo">Cliente:</span> <strong>${pedido.cliente?.nome || 'Cliente Visitante'}</strong></div>
                    <div class="linha-dado"><span class="rotulo">WhatsApp:</span> ${pedido.cliente?.whatsapp || 'Não informado'}</div>
                    <div class="linha-dado"><span class="rotulo">Endereço de Entrega:</span> <strong>${endFormatado}</strong></div>
                    <div class="linha-dado"><span class="rotulo">Pagamento:</span> ${pedido.formaPagamento || 'Pix à vista'}</div>
                    <div class="linha-dado"><span class="rotulo">Situação / Status:</span> <strong>${pedido.status}</strong></div>
                    ${pedido.cupom ? `<div class="linha-dado"><span class="rotulo">Cupom Aplicado:</span> ${pedido.cupom}</div>` : ''}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Produto / Detalhes</th>
                            <th style="text-align: center;">Qtd</th>
                            <th style="text-align: right;">Valor Unit.</th>
                            <th style="text-align: right;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>${linhasItens}</tbody>
                </table>

                <div class="total-box">
                    <span style="font-size: 13px; color: #555;">Total a Pagar / Recebido:</span><br>
                    <span class="total-destaque">${Number(pedido.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>

                <div style="margin-top: 35px; text-align: center;">
                    <button onclick="window.print()" style="background: #111; color: #fff; border: none; padding: 10px 22px; font-size: 13px; font-weight: bold; cursor: pointer; border-radius: 4px;">🖨️ Imprimir / Guardar como PDF</button>
                </div>
            </body>
            </html>
        `);
        janela.document.close();
    }

    // ==========================================
    // 8. BANNERS DA HOME
    // ==========================================
    const formBanner = document.getElementById('form-cadastro-banner');
    const inputFotoBanner = document.getElementById('foto-banner');
    const previewBanner = document.getElementById('preview-banner');
    const listaBannersAdmin = document.getElementById('lista-banners-admin');

    if (inputFotoBanner && previewBanner) {
        inputFotoBanner.onchange = function() {
            previewBanner.innerHTML = '';
            if (this.files && this.files[0]) {
                comprimirImagem(this.files[0], (bannerComprimido) => {
                    previewBanner.innerHTML += `<img src="${bannerComprimido}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 6px; border: 2px solid #d4af37;">`;
                });
            }
        };
    }

    function atualizarListaBanners() {
        if (!listaBannersAdmin) return;
        listaBannersAdmin.innerHTML = '';
        const banners = JSON.parse(localStorage.getItem('vr_modas_banners')) || [];

        if (banners.length === 0) {
            listaBannersAdmin.innerHTML = '<p style="color: var(--cinza-texto);">Nenhum banner ativo. A Home ficará sem slider.</p>';
            return;
        }

        banners.forEach(b => {
            listaBannersAdmin.insertAdjacentHTML('beforeend', `
                <div style="display: flex; align-items: center; justify-content: space-between; background: var(--preto); padding: 12px 16px; border-radius: 6px; border: 1px solid #333; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <img src="${b.imagem}" style="width: 80px; height: 45px; object-fit: cover; border-radius: 4px;">
                        <div>
                            <strong style="color: var(--branco); font-size: 14px;">${b.titulo}</strong>
                            <p style="color: var(--cinza-texto); font-size: 12px; margin: 0;">${b.subtitulo}</p>
                        </div>
                    </div>
                    <button class="btn-remover-banner" data-id="${b.id}" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Excluir</button>
                </div>
            `);
        });

        document.querySelectorAll('.btn-remover-banner').forEach(btn => {
            btn.onclick = function() {
                const idExcluir = this.getAttribute('data-id');
                let bannersAtuais = JSON.parse(localStorage.getItem('vr_modas_banners')) || [];
                bannersAtuais = bannersAtuais.filter(b => b.id != idExcluir);
                localStorage.setItem('vr_modas_banners', JSON.stringify(bannersAtuais));
                atualizarListaBanners();
            };
        });
    }

    if (formBanner) {
        formBanner.onsubmit = function(event) {
            event.preventDefault();
            const titulo = document.getElementById('titulo-banner').value;
            const subtitulo = document.getElementById('subtitulo-banner').value;
            const btnTexto = document.getElementById('btn-texto-banner').value;
            const btnLink = document.getElementById('btn-link-banner').value;

            if (inputFotoBanner.files && inputFotoBanner.files[0]) {
                comprimirImagem(inputFotoBanner.files[0], function(imagemComprimida) {
                    const novoBanner = { id: Date.now(), titulo, subtitulo, btnTexto, btnLink, imagem: imagemComprimida };
                    let banners = JSON.parse(localStorage.getItem('vr_modas_banners')) || [];
                    banners.push(novoBanner);
                    localStorage.setItem('vr_modas_banners', JSON.stringify(banners));
                    formBanner.reset();
                    if (previewBanner) previewBanner.innerHTML = '';
                    atualizarListaBanners();
                    alert("Novo banner publicado!");
                });
            }
        };
    }

    // ==========================================
    // 9. CONFIGURAÇÕES, SUPORTE E CUPONS
    // ==========================================
    const formConfig = document.getElementById('form-config-loja');
    const inputWhatsConfig = document.getElementById('config-whatsapp');
    const inputEmailConfig = document.getElementById('config-email');

    function carregarConfiguracoes() {
        const configPadrao = { whatsapp: "5589999999999", email: "contato@vrmodas.com" };
        const configSalva = JSON.parse(localStorage.getItem('vr_modas_config')) || configPadrao;

        if (inputWhatsConfig) inputWhatsConfig.value = configSalva.whatsapp || "";
        if (inputEmailConfig) inputEmailConfig.value = configSalva.email || "";
    }

    if (formConfig) {
        carregarConfiguracoes();
        formConfig.onsubmit = function(e) {
            e.preventDefault();
            const whatsappLimpo = inputWhatsConfig.value.replace(/\D/g, '');
            const emailLimpo = inputEmailConfig.value.trim();

            if (!whatsappLimpo) {
                alert("Por favor, informe um número de WhatsApp válido.");
                return;
            }

            const novaConfig = { whatsapp: whatsappLimpo, email: emailLimpo };
            localStorage.setItem('vr_modas_config', JSON.stringify(novaConfig));
            alert("Configurações salvas com sucesso!");
        };
    }

    // Cupons
    const formCupom = document.getElementById('form-cadastro-cupom');
    const listaCuponsAdmin = document.getElementById('lista-cupons-admin');

    function atualizarListaCupons() {
        if (!listaCuponsAdmin) return;
        listaCuponsAdmin.innerHTML = '';
        const cupons = JSON.parse(localStorage.getItem('vr_modas_cupons')) || [
            { id: 1, codigo: 'BEMVINDA10', tipo: 'porcentagem', valor: 10 }
        ];

        if (cupons.length === 0) {
            listaCuponsAdmin.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--cinza-texto); padding: 20px;">Nenhum cupom ativo no momento.</td></tr>';
            return;
        }

        cupons.forEach(cupom => {
            const desc = cupom.tipo === 'porcentagem' ? `${cupom.valor}% OFF` : `R$ ${Number(cupom.valor).toFixed(2)} OFF`;
            listaCuponsAdmin.insertAdjacentHTML('beforeend', `
                <tr>
                    <td><strong style="color: var(--dourado); letter-spacing: 1px;">${cupom.codigo}</strong></td>
                    <td style="text-transform: capitalize;">${cupom.tipo}</td>
                    <td style="font-weight: 700;">${desc}</td>
                    <td>
                        <button class="btn-excluir-cupom" data-id="${cupom.id}" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;">Remover</button>
                    </td>
                </tr>
            `);
        });

        document.querySelectorAll('.btn-excluir-cupom').forEach(btn => {
            btn.onclick = function() {
                const id = this.getAttribute('data-id');
                let cupons = JSON.parse(localStorage.getItem('vr_modas_cupons')) || [];
                cupons = cupons.filter(c => String(c.id) !== String(id));
                localStorage.setItem('vr_modas_cupons', JSON.stringify(cupons));
                atualizarListaCupons();
            };
        });
    }

    if (formCupom) {
        if (!localStorage.getItem('vr_modas_cupons')) {
            localStorage.setItem('vr_modas_cupons', JSON.stringify([
                { id: 1, codigo: 'BEMVINDA10', tipo: 'porcentagem', valor: 10 }
            ]));
        }
        atualizarListaCupons();

        formCupom.onsubmit = function(e) {
            e.preventDefault();
            const codigo = document.getElementById('cupom-codigo').value.trim().toUpperCase();
            const tipo = document.getElementById('cupom-tipo').value;
            const valor = parseFloat(document.getElementById('cupom-valor').value);

            let cupons = JSON.parse(localStorage.getItem('vr_modas_cupons')) || [];
            if (cupons.some(c => c.codigo === codigo)) {
                alert("Já existe um cupom com esse código!");
                return;
            }

            cupons.push({ id: Date.now(), codigo, tipo, valor });
            localStorage.setItem('vr_modas_cupons', JSON.stringify(cupons));
            formCupom.reset();
            atualizarListaCupons();
            alert(`Cupom ${codigo} cadastrado com sucesso!`);
        };
    }

    // ==========================================
    // 10. BACKUP & RESTAURAÇÃO (.JSON)
    // ==========================================
    const btnExportarBackup = document.getElementById('btn-exportar-backup');
    const inputRestaurarBackup = document.getElementById('input-restaurar-backup');

    if (btnExportarBackup) {
        btnExportarBackup.onclick = function() {
            const backupCompleto = {
                dataBackup: new Date().toISOString(),
                vr_modas_db: JSON.parse(localStorage.getItem('vr_modas_db')) || [],
                vr_modas_pedidos: JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [],
                vr_modas_banners: JSON.parse(localStorage.getItem('vr_modas_banners')) || [],
                vr_modas_config: JSON.parse(localStorage.getItem('vr_modas_config')) || {},
                vr_modas_cupons: JSON.parse(localStorage.getItem('vr_modas_cupons')) || [],
                vr_modas_avaliacoes: JSON.parse(localStorage.getItem('vr_modas_avaliacoes')) || []
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupCompleto, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `backup_vrmodas_${new Date().toISOString().slice(0,10)}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        };
    }

    if (inputRestaurarBackup) {
        inputRestaurarBackup.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const dados = JSON.parse(event.target.result);
                    if (confirm("Isto irá substituir o catálogo e pedidos atuais pelo ficheiro de backup. Deseja continuar?")) {
                        if (dados.vr_modas_db) localStorage.setItem('vr_modas_db', JSON.stringify(dados.vr_modas_db));
                        if (dados.vr_modas_pedidos) localStorage.setItem('vr_modas_pedidos', JSON.stringify(dados.vr_modas_pedidos));
                        if (dados.vr_modas_banners) localStorage.setItem('vr_modas_banners', JSON.stringify(dados.vr_modas_banners));
                        if (dados.vr_modas_config) localStorage.setItem('vr_modas_config', JSON.stringify(dados.vr_modas_config));
                        if (dados.vr_modas_cupons) localStorage.setItem('vr_modas_cupons', JSON.stringify(dados.vr_modas_cupons));
                        if (dados.vr_modas_avaliacoes) localStorage.setItem('vr_modas_avaliacoes', JSON.stringify(dados.vr_modas_avaliacoes));

                        alert("Backup restaurado com sucesso! A página será atualizada.");
                        window.location.reload();
                    }
                } catch (err) {
                    alert("Erro ao ler o ficheiro de backup. Certifique-se de que é um ficheiro .JSON válido.");
                }
            };
            reader.readAsText(file);
        };
    }

    // Inicialização
    atualizarDashboard();
    atualizarTabelaProdutos();
    atualizarTabelaPedidos();
    atualizarListaBanners();
    alternarAbaAdmin('secao-dashboard');
});