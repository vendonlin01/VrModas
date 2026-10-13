/* =====================================================
   PAINEL DO LOJISTA (ADMIN) - VR MODAS
   Conectado 100% ao Banco de Dados Neon (PostgreSQL)
   Dashboard, Gestão de Estoque, Pedidos, Banners, Configs & Equipe
   ===================================================== */

const NEON_ADMIN_CONN = 'postgresql://neondb_owner:npg_KUabnTq58ujk@ep-ancient-fog-b61fg1o3-pooler.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require';

let sqlNeon = null;
async function getSql() {
    if (!sqlNeon) {
        const { neon } = await import('https://esm.sh/@neondatabase/serverless');
        sqlNeon = neon(NEON_ADMIN_CONN);
    }
    return sqlNeon;
}

document.addEventListener('DOMContentLoaded', async () => {

    // ==========================================
    // 0. CONTROLO DE PERMISSÕES & NÍVEIS DE ACESSO
    // ==========================================
    const usuarioAtivo = JSON.parse(sessionStorage.getItem('vr_usuario_ativo') || localStorage.getItem('usuarioLogado') || '{}');
    const isOwner = usuarioAtivo.role === 'owner';
    const permissoes = usuarioAtivo.permissoes || {};

    const btnNavDashboard = document.getElementById('btn-nav-dashboard');
    const btnNavCadastro = document.getElementById('btn-nav-cadastro');
    const btnNavCatalogo = document.getElementById('btn-nav-catalogo');
    const btnNavPedidos = document.getElementById('btn-nav-pedidos');
    const btnNavBanners = document.getElementById('btn-nav-banners');
    const btnNavConfig = document.getElementById('btn-nav-config');
    const btnNavEquipe = document.getElementById('btn-nav-equipe');

    // Apenas o dono enxerga a gestão de equipe
    if (btnNavEquipe) {
        btnNavEquipe.style.display = isOwner ? 'inline-flex' : 'none';
    }

    // Se for colaborador admin, oculta as abas desmarcadas
    if (!isOwner) {
        if (btnNavDashboard && permissoes.dashboard === false) btnNavDashboard.style.display = 'none';
        if (btnNavCadastro && permissoes.produtos === false) btnNavCadastro.style.display = 'none';
        if (btnNavCatalogo && permissoes.produtos === false) btnNavCatalogo.style.display = 'none';
        if (btnNavPedidos && permissoes.pedidos === false) btnNavPedidos.style.display = 'none';
        if (btnNavBanners && permissoes.banners === false) btnNavBanners.style.display = 'none';
        if (btnNavConfig && permissoes.configuracoes === false) btnNavConfig.style.display = 'none';
    }

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
        'secao-pedidos': { titulo: 'Pedidos dos Clientes', sub: 'Acompanhe as compras feitas pela sacola, altere status e emita comprovantes.' },
        'secao-banners': { titulo: 'Banners da Vitrine', sub: 'Gerencie os sliders e chamadas promocionais da tela inicial.' },
        'secao-config': { titulo: 'Configurações & Backup', sub: 'Defina canais oficiais de suporte, códigos promocionais e cópias de segurança.' },
        'secao-equipe': { titulo: 'Gestão de Equipe & Permissões', sub: 'Controle os acessos dos administradores da loja.' }
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
        if (idAlvo === 'secao-catalogo') carregarEAtualizarTabelaProdutos();
        if (idAlvo === 'secao-pedidos') carregarEAtualizarTabelaPedidos();
        if (idAlvo === 'secao-banners') carregarEAtualizarListaBanners();
        if (idAlvo === 'secao-config') {
            carregarConfiguracoes();
            carregarEAtualizarListaCupons();
        }
        if (idAlvo === 'secao-equipe') carregarListaEquipe();
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

        const pedidosValidos = pedidos.filter(p => ['Pago', 'Em Separação', 'Enviado', 'Concluído'].includes(p.status));
        const totalFat = pedidosValidos.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
        const itensBaixos = produtos.filter(p => parseInt(p.estoque || 0) < 5).length;
        const concluidosCount = pedidos.filter(p => p.status === 'Concluído').length;

        const elFat = document.getElementById('dash-faturamento');
        const elPed = document.getElementById('dash-total-pedidos');
        const elEst = document.getElementById('dash-estoque-baixo');
        const elTot = document.getElementById('dash-total-produtos');

        if (elFat) elFat.innerText = totalFat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (elPed) elPed.innerText = concluidosCount > 0 ? concluidosCount : pedidos.length;
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
    // 5. CADASTRO E EDIÇÃO DE PRODUTOS (NEON DB)
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
    let listaCoresCadastradas = [];

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
                <span style="font-weight: 700; color: var(--dourado, #d4af37);">${item.cor}</span>
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
        if (btnSubmitProduto) {
            btnSubmitProduto.innerText = "💾 Salvar Peça no Catálogo";
            btnSubmitProduto.disabled = false;
        }
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
        formAdmin.onsubmit = async function(event) {
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
            const fotoCapa = imagensFinais[0];

            btnSubmitProduto.disabled = true;
            btnSubmitProduto.innerText = "Gravando no Neon...";

            try {
                const sql = await getSql();

                if (idEditando) {
                    await sql`
                        UPDATE produtos 
                        SET nome = ${nome},
                            preco = ${preco},
                            preco_promocional = ${precoPromocional},
                            categoria = ${categoria},
                            estoque = ${estoque},
                            descricao = ${descricao},
                            imagem = ${fotoCapa},
                            imagens = ${JSON.stringify(imagensFinais)}::jsonb,
                            tamanhos = ${JSON.stringify(tamanhos)}::jsonb,
                            cores = ${JSON.stringify(listaCoresCadastradas.map(c => c.cor))}::jsonb,
                            destaque = ${isPromocao}
                        WHERE id = ${parseInt(idEditando)};
                    `;
                } else {
                    await sql`
                        INSERT INTO produtos (nome, preco, preco_promocional, categoria, estoque, descricao, imagem, imagens, tamanhos, cores, destaque)
                        VALUES (
                            ${nome},
                            ${preco},
                            ${precoPromocional},
                            ${categoria},
                            ${estoque},
                            ${descricao},
                            ${fotoCapa},
                            ${JSON.stringify(imagensFinais)}::jsonb,
                            ${JSON.stringify(tamanhos)}::jsonb,
                            ${JSON.stringify(listaCoresCadastradas.map(c => c.cor))}::jsonb,
                            ${isPromocao}
                        );
                    `;
                }

                alert(`Produto "${nome}" salvo no Neon com sucesso!`);
            } catch (erroBanco) {
                console.error("Erro ao salvar produto no Neon:", erroBanco);
                alert("Erro ao gravar no banco na nuvem. Verifique o console.");
            }

            if (typeof sincronizarProdutosNeon === 'function') {
                await sincronizarProdutosNeon();
            } else {
                await recarregarProdutosDoNeon();
            }

            resetarModoEdicao();
            atualizarDashboard();
            alternarAbaAdmin('secao-catalogo');
        };
    }

    async function recarregarProdutosDoNeon() {
        try {
            const sql = await getSql();
            const dados = await sql`SELECT * FROM produtos ORDER BY id DESC;`;
            if (Array.isArray(dados)) {
                const produtosFormatados = dados.map(item => ({
                    id: item.id,
                    nome: item.nome,
                    preco: parseFloat(item.preco),
                    precoPromocional: item.preco_promocional ? parseFloat(item.preco_promocional) : null,
                    descricao: item.descricao || '',
                    categoria: item.categoria || 'geral',
                    estoque: item.estoque !== null ? parseInt(item.estoque) : 10,
                    imagem: item.imagem || 'img/produto1.jpg',
                    imagens: Array.isArray(item.imagens) ? item.imagens : (typeof item.imagens === 'string' ? JSON.parse(item.imagens) : [item.imagem || 'img/produto1.jpg']),
                    tamanhos: Array.isArray(item.tamanhos) ? item.tamanhos : (typeof item.tamanhos === 'string' ? JSON.parse(item.tamanhos) : ['P', 'M', 'G']),
                    cores: Array.isArray(item.cores) ? item.cores : (typeof item.cores === 'string' ? JSON.parse(item.cores) : ['Padrão']),
                    promocao: item.destaque || !!item.preco_promocional
                }));
                localStorage.setItem('vr_modas_db', JSON.stringify(produtosFormatados));
            }
        } catch (e) {
            console.warn("Erro ao recarregar produtos:", e);
        }
    }

    // ==========================================
    // 6. CATÁLOGO & ESTOQUE (NEON DB)
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
            renderizarTabelaProdutosUI();
        };
    });

    async function carregarEAtualizarTabelaProdutos() {
        await recarregarProdutosDoNeon();
        renderizarTabelaProdutosUI();
    }

    function renderizarTabelaProdutosUI() {
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
            btn.onclick = async function() {
                const idProd = this.getAttribute('data-id');
                if (confirm("Deseja realmente remover este produto do banco de dados na nuvem?")) {
                    try {
                        const sql = await getSql();
                        await sql`DELETE FROM produtos WHERE id = ${parseInt(idProd)};`;
                        alert("Produto removido com sucesso!");
                    } catch (e) {
                        console.error("Erro ao excluir do Neon:", e);
                    }
                    await carregarEAtualizarTabelaProdutos();
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
        
        listaCoresCadastradas = [];
        if (Array.isArray(produto.cores)) {
            produto.cores.forEach(c => listaCoresCadastradas.push({ cor: c, qtd: 1 }));
        } else if (typeof produto.cores === 'string' && produto.cores) {
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
    // 7. GESTÃO DE PEDIDOS (NEON DB)
    // ==========================================
    const listaPedidosAdmin = document.getElementById('lista-pedidos-admin');

    async function recarregarPedidosDoNeon() {
        try {
            const sql = await getSql();
            const dados = await sql`SELECT * FROM pedidos ORDER BY id DESC;`;
            if (Array.isArray(dados)) {
                const pedidosFormatados = dados.map(p => ({
                    id: p.id,
                    codigo: `#VR-${p.id}`,
                    cliente: {
                        nome: p.cliente_nome,
                        whatsapp: p.cliente_whatsapp,
                        email: p.cliente_email,
                        endereco: p.endereco_entrega
                    },
                    itens: Array.isArray(p.itens) ? p.itens : (typeof p.itens === 'string' ? JSON.parse(p.itens) : []),
                    total: parseFloat(p.total),
                    formaPagamento: p.forma_pagamento || 'PIX',
                    status: p.status || 'Pendente',
                    data: new Date(p.criado_em).toLocaleDateString('pt-BR')
                }));
                localStorage.setItem('vr_modas_pedidos', JSON.stringify(pedidosFormatados));
            }
        } catch (e) {
            console.warn("Erro ao buscar pedidos do Neon:", e);
        }
    }

    async function carregarEAtualizarTabelaPedidos() {
        await recarregarPedidosDoNeon();
        renderizarTabelaPedidosUI();
    }

    function renderizarTabelaPedidosUI() {
        if (!listaPedidosAdmin) return;
        const pedidos = JSON.parse(localStorage.getItem('vr_modas_pedidos')) || [];
        listaPedidosAdmin.innerHTML = '';

        if (pedidos.length === 0) {
            listaPedidosAdmin.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto); padding: 30px;">Nenhum pedido recebido até o momento.</td></tr>`;
            return;
        }

        const coresStatus = {
            'Pendente': '#fbc02d',
            'Pago': '#29b6f6',
            'Em Separação': '#ab47bc',
            'Enviado': '#ffa726',
            'Concluído': '#66bb6a',
            'Cancelado': '#ef5350'
        };

        pedidos.forEach(ped => {
            const totalFormatado = Number(ped.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            let resumoItens = (ped.itens || []).map(it => `• <strong>${it.quantidade}x</strong> ${it.nome} <span style="color: #aaa; font-size: 11px;">(${it.tamanho || 'Padrão'} / ${it.cor || 'Padrão'})</span>`).join('<br>');
            
            const nomeCli = ped.cliente?.nome || "Cliente";
            const whatsCli = ped.cliente?.whatsapp || "Não informado";
            const corAtual = coresStatus[ped.status] || '#d4af37';

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
                        <select class="select-status-pedido" data-id="${ped.id}" style="padding: 6px 8px; background: #141414; color: ${corAtual}; border: 1px solid #444; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">
                            <option value="Pendente" ${ped.status === 'Pendente' ? 'selected' : ''}>⏳ Pendente</option>
                            <option value="Pago" ${ped.status === 'Pago' ? 'selected' : ''}>💳 Pago</option>
                            <option value="Em Separação" ${ped.status === 'Em Separação' ? 'selected' : ''}>📦 Em Separação</option>
                            <option value="Enviado" ${ped.status === 'Enviado' ? 'selected' : ''}>🚚 Enviado</option>
                            <option value="Concluído" ${ped.status === 'Concluído' ? 'selected' : ''}>✅ Concluído</option>
                            <option value="Cancelado" ${ped.status === 'Cancelado' ? 'selected' : ''}>❌ Cancelado</option>
                        </select>
                    </td>
                    <td>
                        <div style="display: flex; gap: 6px;">
                            <button class="btn-imprimir-pedido" data-id="${ped.id}" style="background: var(--dourado); color: #000; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 700;">🖨️ Imprimir Pedido</button>
                            <button class="btn-excluir-pedido" data-id="${ped.id}" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 700;">🗑️</button>
                        </div>
                    </td>
                </tr>
            `);
        });

        document.querySelectorAll('.select-status-pedido').forEach(sel => {
            sel.onchange = async function() {
                const idPed = this.getAttribute('data-id');
                const novoStatus = this.value;
                try {
                    const sql = await getSql();
                    await sql`UPDATE pedidos SET status = ${novoStatus} WHERE id = ${parseInt(idPed)};`;
                    alert(`Status do pedido atualizado para "${novoStatus}" no Neon!`);
                } catch (e) {
                    console.error("Erro ao atualizar status:", e);
                }
                await carregarEAtualizarTabelaPedidos();
                atualizarDashboard();
            };
        });

        document.querySelectorAll('.btn-imprimir-pedido').forEach(btn => {
            btn.onclick = function() { imprimirComprovantePedido(this.getAttribute('data-id')); };
        });

        document.querySelectorAll('.btn-excluir-pedido').forEach(btn => {
            btn.onclick = async function() {
                const idPed = this.getAttribute('data-id');
                if (confirm("Remover este pedido do banco?")) {
                    try {
                        const sql = await getSql();
                        await sql`DELETE FROM pedidos WHERE id = ${parseInt(idPed)};`;
                    } catch (e) {
                        console.error("Erro ao deletar pedido:", e);
                    }
                    await carregarEAtualizarTabelaPedidos();
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
        const linhasItens = (pedido.itens || []).map(it => `
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
                <title>Comprovante do Pedido ${pedido.codigo} | VR Modas</title>
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
                        <p style="margin: 0; font-size: 12px; color: #666;">Comprovante do Pedido</p>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin: 0; color: #b89329; font-size: 18px;">${pedido.codigo}</h2>
                        <span style="font-size: 11px; color: #777;">${pedido.data}</span>
                    </div>
                </div>

                <div class="dados-quadro">
                    <div class="linha-dado"><span class="rotulo">Cliente:</span> <strong>${pedido.cliente?.nome || 'Cliente'}</strong></div>
                    <div class="linha-dado"><span class="rotulo">Contato:</span> ${pedido.cliente?.whatsapp || 'Não informado'}</div>
                    <div class="linha-dado"><span class="rotulo">Forma de Envio:</span> <strong>${endFormatado}</strong></div>
                    <div class="linha-dado"><span class="rotulo">Pagamento:</span> ${pedido.formaPagamento || 'Pix'}</div>
                    <div class="linha-dado"><span class="rotulo">Status Atual:</span> <strong>${pedido.status}</strong></div>
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
                    <span style="font-size: 13px; color: #555;">Total do Pedido:</span><br>
                    <span class="total-destaque">${Number(pedido.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>

                <div style="margin-top: 35px; text-align: center;">
                    <button onclick="window.print()" style="background: #111; color: #fff; border: none; padding: 10px 22px; font-size: 13px; font-weight: bold; cursor: pointer; border-radius: 4px;">🖨️ Imprimir Pedido</button>
                </div>
            </body>
            </html>
        `);
        janela.document.close();
    }

    // ==========================================
    // 8. BANNERS DA HOME (NEON DB)
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

    async function recarregarBannersDoNeon() {
        try {
            const sql = await getSql();
            const dados = await sql`SELECT * FROM banners WHERE ativo = true ORDER BY id DESC;`;
            if (Array.isArray(dados)) {
                const formatados = dados.map(b => ({
                    id: b.id,
                    titulo: b.titulo,
                    subtitulo: b.subtitulo,
                    imagem: b.imagem,
                    btnTexto: b.btn_texto || 'Ver Coleção',
                    btnLink: b.btn_link || 'produtos.html'
                }));
                localStorage.setItem('vr_modas_banners', JSON.stringify(formatados));
            }
        } catch (e) {
            console.warn("Erro ao buscar banners:", e);
        }
    }

    async function carregarEAtualizarListaBanners() {
        await recarregarBannersDoNeon();
        renderizarListaBannersUI();
    }

    function renderizarListaBannersUI() {
        if (!listaBannersAdmin) return;
        listaBannersAdmin.innerHTML = '';
        const banners = JSON.parse(localStorage.getItem('vr_modas_banners')) || [];

        if (banners.length === 0) {
            listaBannersAdmin.innerHTML = '<p style="color: var(--cinza-texto);">Nenhum banner ativo no momento.</p>';
            return;
        }

        banners.forEach(b => {
            listaBannersAdmin.insertAdjacentHTML('beforeend', `
                <div style="display: flex; align-items: center; justify-content: space-between; background: var(--preto, #0a0a0a); padding: 12px 16px; border-radius: 6px; border: 1px solid #333; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <img src="${b.imagem}" style="width: 80px; height: 45px; object-fit: cover; border-radius: 4px;">
                        <div>
                            <strong style="color: var(--branco, #fff); font-size: 14px;">${b.titulo}</strong>
                            <p style="color: var(--cinza-texto, #aaa); font-size: 12px; margin: 0;">${b.subtitulo}</p>
                        </div>
                    </div>
                    <button class="btn-remover-banner" data-id="${b.id}" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Excluir</button>
                </div>
            `);
        });

        document.querySelectorAll('.btn-remover-banner').forEach(btn => {
            btn.onclick = async function() {
                const idExcluir = this.getAttribute('data-id');
                if (confirm("Remover este banner do banco?")) {
                    try {
                        const sql = await getSql();
                        await sql`DELETE FROM banners WHERE id = ${parseInt(idExcluir)};`;
                    } catch (e) {
                        console.error("Erro ao deletar banner:", e);
                    }
                    await carregarEAtualizarListaBanners();
                }
            };
        });
    }

    if (formBanner) {
        formBanner.onsubmit = function(event) {
            event.preventDefault();
            const titulo = document.getElementById('titulo-banner').value.trim();
            const subtitulo = document.getElementById('subtitulo-banner').value.trim();
            const btnTexto = document.getElementById('btn-texto-banner').value.trim();
            const btnLink = document.getElementById('btn-link-banner').value.trim();

            if (inputFotoBanner.files && inputFotoBanner.files[0]) {
                comprimirImagem(inputFotoBanner.files[0], async function(imagemComprimida) {
                    try {
                        const sql = await getSql();
                        await sql`
                            INSERT INTO banners (titulo, subtitulo, imagem, btn_texto, btn_link, ativo)
                            VALUES (${titulo}, ${subtitulo}, ${imagemComprimida}, ${btnTexto}, ${btnLink}, true);
                        `;
                        alert("Novo banner salvo no Neon!");
                    } catch (e) {
                        console.error("Erro ao salvar banner:", e);
                    }
                    formBanner.reset();
                    if (previewBanner) previewBanner.innerHTML = '';
                    await carregarEAtualizarListaBanners();
                });
            }
        };
    }

    // ==========================================
    // 9. CONFIGURAÇÕES & CUPONS (NEON DB)
    // ==========================================
    const formConfig = document.getElementById('form-config-loja');
    const inputWhatsConfig = document.getElementById('config-whatsapp');
    const inputEmailConfig = document.getElementById('config-email');

    async function carregarConfiguracoes() {
        try {
            const sql = await getSql();
            const configs = await sql`SELECT chave, valor FROM configuracoes;`;
            const mapa = {};
            configs.forEach(c => { mapa[c.chave] = c.valor; });
            if (inputWhatsConfig && mapa['whatsapp']) inputWhatsConfig.value = mapa['whatsapp'];
            if (inputEmailConfig && mapa['email']) inputEmailConfig.value = mapa['email'];
        } catch (e) {
            console.warn("Erro ao buscar configs do Neon:", e);
        }
    }

    if (formConfig) {
        formConfig.onsubmit = async function(e) {
            e.preventDefault();
            const whatsappLimpo = inputWhatsConfig.value.replace(/\D/g, '');
            const emailLimpo = inputEmailConfig.value.trim();

            if (!whatsappLimpo) {
                alert("Por favor, informe um número de WhatsApp válido.");
                return;
            }

            try {
                const sql = await getSql();
                await sql`
                    INSERT INTO configuracoes (chave, valor)
                    VALUES ('whatsapp', ${whatsappLimpo})
                    ON CONFLICT (chave) DO UPDATE SET valor = ${whatsappLimpo};
                `;
                await sql`
                    INSERT INTO configuracoes (chave, valor)
                    VALUES ('email', ${emailLimpo})
                    ON CONFLICT (chave) DO UPDATE SET valor = ${emailLimpo};
                `;
                localStorage.setItem('vr_modas_config', JSON.stringify({ whatsapp: whatsappLimpo, email: emailLimpo }));
                alert("Configurações salvas no Neon com sucesso!");
            } catch (err) {
                console.error("Erro ao salvar configs no Neon:", err);
            }
        };
    }

    // Cupons
    const formCupom = document.getElementById('form-cadastro-cupom');
    const listaCuponsAdmin = document.getElementById('lista-cupons-admin');

    async function carregarEAtualizarListaCupons() {
        try {
            const sql = await getSql();
            const dados = await sql`SELECT * FROM cupons WHERE ativo = true ORDER BY id DESC;`;
            if (Array.isArray(dados)) {
                localStorage.setItem('vr_modas_cupons', JSON.stringify(dados));
            }
        } catch (e) {
            console.warn("Erro ao buscar cupons do Neon:", e);
        }
        renderizarListaCuponsUI();
    }

    function renderizarListaCuponsUI() {
        if (!listaCuponsAdmin) return;
        listaCuponsAdmin.innerHTML = '';
        const cupons = JSON.parse(localStorage.getItem('vr_modas_cupons')) || [];

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
            btn.onclick = async function() {
                const id = this.getAttribute('data-id');
                if (confirm("Remover este cupom do banco?")) {
                    try {
                        const sql = await getSql();
                        await sql`DELETE FROM cupons WHERE id = ${parseInt(id)};`;
                    } catch (e) {
                        console.error("Erro ao remover cupom:", e);
                    }
                    await carregarEAtualizarListaCupons();
                }
            };
        });
    }

    if (formCupom) {
        formCupom.onsubmit = async function(e) {
            e.preventDefault();
            const codigo = document.getElementById('cupom-codigo').value.trim().toUpperCase();
            const tipo = document.getElementById('cupom-tipo').value;
            const valor = parseFloat(document.getElementById('cupom-valor').value);

            try {
                const sql = await getSql();
                await sql`
                    INSERT INTO cupons (codigo, tipo, valor, ativo)
                    VALUES (${codigo}, ${tipo}, ${valor}, true);
                `;
                alert(`Cupom ${codigo} cadastrado no Neon com sucesso!`);
            } catch (err) {
                console.error("Erro ao cadastrar cupom no Neon:", err);
                alert("Erro ao cadastrar cupom. Verifique se o código já existe.");
            }

            formCupom.reset();
            await carregarEAtualizarListaCupons();
        };
    }

    // ==========================================
    // 10. GESTÃO DE EQUIPE & ADMINISTRADORES (NEON DB)
    // ==========================================
    const formEquipe = document.getElementById('form-gestao-equipe');
    const inputEmailEquipe = document.getElementById('equipe-email');
    const listaEquipeAdmin = document.getElementById('lista-equipe-admin');

    async function carregarListaEquipe() {
        if (!listaEquipeAdmin) return;
        listaEquipeAdmin.innerHTML = '<p style="color: var(--cinza-texto);">Carregando colaboradores...</p>';

        try {
            const sql = await getSql();
            const membros = await sql`
                SELECT id, nome, email, role, permissoes 
                FROM usuarios 
                WHERE role IN ('admin', 'owner')
                ORDER BY role DESC, id ASC;
            `;

            if (!membros || membros.length === 0) {
                listaEquipeAdmin.innerHTML = '<p style="color: var(--cinza-texto);">Nenhum colaborador encontrado.</p>';
                return;
            }

            listaEquipeAdmin.innerHTML = '';
            membros.forEach(m => {
                const ehDono = m.role === 'owner';
                const perms = (typeof m.permissoes === 'object' && m.permissoes !== null) ? m.permissoes : (m.permissoes ? JSON.parse(m.permissoes) : {});

                const tagsPermissoes = ehDono ? '<span style="color: #4caf50; font-size: 11px;">✓ Acesso Irrestrito</span>' : [
                    perms.dashboard ? '📊 Dashboard' : null,
                    perms.produtos ? '👗 Produtos' : null,
                    perms.pedidos ? '🛍️ Pedidos' : null,
                    perms.banners ? '🎨 Banners' : null,
                    perms.configuracoes ? '⚙️ Configs' : null
                ].filter(Boolean).map(t => `<span style="background: #222; border: 1px solid #444; padding: 2px 6px; border-radius: 4px; font-size: 10px; color: #ddd; margin-right: 4px;">${t}</span>`).join('') || '<span style="color: #888; font-size: 11px;">Nenhum módulo liberado</span>';

                listaEquipeAdmin.insertAdjacentHTML('beforeend', `
                    <div style="display: flex; align-items: center; justify-content: space-between; background: #141414; padding: 14px 18px; border-radius: 6px; border: 1px solid #2a2a2a; margin-bottom: 8px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <strong style="color: #fff; font-size: 14px;">${m.nome || 'Usuário'}</strong>
                                <span style="font-size: 10px; padding: 2px 6px; border-radius: 10px; background: ${ehDono ? '#d4af37' : '#333'}; color: ${ehDono ? '#000' : '#fff'}; font-weight: bold;">
                                    ${ehDono ? '👑 PROPRIETÁRIO' : '🛡️ ADMIN'}
                                </span>
                            </div>
                            <p style="color: var(--cinza-texto); font-size: 12px; margin: 3px 0 6px 0;">${m.email}</p>
                            <div>${tagsPermissoes}</div>
                        </div>

                        ${!ehDono ? `
                            <button class="btn-revogar-equipe" data-id="${m.id}" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">
                                Revogar Acesso
                            </button>
                        ` : ''}
                    </div>
                `);
            });

            document.querySelectorAll('.btn-revogar-equipe').forEach(btn => {
                btn.onclick = async function() {
                    const idMembro = this.getAttribute('data-id');
                    if (confirm("Deseja realmente revogar o acesso deste colaborador?")) {
                        try {
                            const sql = await getSql();
                            await sql`
                                UPDATE usuarios 
                                SET role = 'cliente', permissoes = '{}'::jsonb 
                                WHERE id = ${parseInt(idMembro)} AND role != 'owner';
                            `;
                            alert("Acesso administrativo revogado!");
                            carregarListaEquipe();
                        } catch (err) {
                            console.error("Erro ao revogar:", err);
                            alert("Erro ao revogar acesso.");
                        }
                    }
                };
            });

        } catch (e) {
            console.error("Erro ao listar equipe:", e);
            listaEquipeAdmin.innerHTML = '<p style="color: #ff4444;">Erro ao carregar colaboradores do banco.</p>';
        }
    }

    if (formEquipe) {
        formEquipe.onsubmit = async function(e) {
            e.preventDefault();
            const email = inputEmailEquipe.value.trim().toLowerCase();
            if (!email) return;

            const permissoesObj = {
                dashboard: document.getElementById('perm-dashboard')?.checked || false,
                produtos: document.getElementById('perm-produtos')?.checked || false,
                pedidos: document.getElementById('perm-pedidos')?.checked || false,
                banners: document.getElementById('perm-banners')?.checked || false,
                configuracoes: document.getElementById('perm-config')?.checked || false
            };

            const btnSubmit = document.getElementById('btn-salvar-equipe');
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerText = "Salvando no Neon...";
            }

            try {
                const sql = await getSql();
                const [usuarioExiste] = await sql`SELECT id, role FROM usuarios WHERE email = ${email};`;

                if (!usuarioExiste) {
                    alert("Usuário não encontrado! O colaborador precisa criar uma conta comum na loja antes de ser promovido.");
                } else if (usuarioExiste.role === 'owner') {
                    alert("Este e-mail pertence ao proprietário da loja e não pode ter suas permissões alteradas.");
                } else {
                    await sql`
                        UPDATE usuarios 
                        SET role = 'admin', permissoes = ${JSON.stringify(permissoesObj)}::jsonb
                        WHERE email = ${email};
                    `;
                    alert(`Permissões salvas para ${email}!`);
                    formEquipe.reset();
                    if (document.getElementById('perm-produtos')) document.getElementById('perm-produtos').checked = true;
                    carregarListaEquipe();
                }
            } catch (err) {
                console.error("Erro ao cadastrar membro da equipe:", err);
                alert("Erro ao salvar permissões no banco.");
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = "Salvar Permissões do Colaborador";
                }
            }
        };
    }

    // ==========================================
    // 11. BACKUP & RESTAURAÇÃO (.JSON)
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
                    if (confirm("Isto irá substituir os dados locais pelo ficheiro de backup. Deseja continuar?")) {
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

    // Inicialização da aba padrão e sincronizações iniciais
    await recarregarProdutosDoNeon();
    await recarregarPedidosDoNeon();
    atualizarDashboard();
    renderizarTabelaProdutosUI();
    alternarAbaAdmin('secao-dashboard');
});