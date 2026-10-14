// ==========================================================================
// VR MODAS - GESTÃO DE PRODUTOS, CATÁLOGO, ESTOQUE & EDIÇÃO (NEON DB)
// js/admin/produtos.js
// ==========================================================================

let listaImagensProdutoBase64 = [];
let categoriaAtivaAdmin = 'todos';
let listaProdutosGeral = [];

/**
 * 1. Converte e compacta imagens selecionadas para Base64
 */
function configurarUploadImagensProduto() {
    const inputImagens = document.getElementById('foto-produto') || document.getElementById('produto-imagens');
    const previewContainer = document.getElementById('preview-fotos') || document.getElementById('preview-imagens-produto');
    if (!inputImagens || !previewContainer) return;

    inputImagens.addEventListener('change', async (e) => {
        const ficheiros = Array.from(e.target.files);
        for (const ficheiro of ficheiros) {
            if (!ficheiro.type.startsWith('image/')) continue;

            const base64 = await redimensionarEConverterImagem(ficheiro);
            listaImagensProdutoBase64.push(base64);
        }
        renderizarPreviewImagens();
    });
}

function redimensionarEConverterImagem(ficheiro, larguraMax = 800) {
    return new Promise((resolve) => {
        const leitor = new FileReader();
        leitor.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let largura = img.width;
                let altura = img.height;

                if (largura > larguraMax) {
                    altura = Math.round((altura * larguraMax) / largura);
                    largura = larguraMax;
                }

                canvas.width = largura;
                canvas.height = altura;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, largura, altura);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = e.target.result;
        };
        leitor.readAsDataURL(ficheiro);
    });
}

function renderizarPreviewImagens() {
    const container = document.getElementById('preview-fotos') || document.getElementById('preview-imagens-produto');
    if (!container) return;

    container.innerHTML = listaImagensProdutoBase64.map((img, idx) => `
        <div style="position: relative; width: 70px; height: 70px; border-radius: 6px; overflow: hidden; border: 1px solid #444;">
            <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;">
            <button type="button" onclick="removerImagemUpload(${idx})" style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.7); color: #ff4444; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px;">&times;</button>
        </div>
    `).join('');
}

function removerImagemUpload(index) {
    listaImagensProdutoBase64.splice(index, 1);
    renderizarPreviewImagens();
}

/**
 * 2. Carregar e Renderizar Lista de Produtos no Catálogo
 */
async function carregarEAtualizarTabelaProdutos() {
    const tabelaCorpo = document.getElementById('lista-produtos-admin') || document.getElementById('tabela-produtos-corpo');
    if (!tabelaCorpo) return;

    tabelaCorpo.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto, #888); padding: 25px;">A carregar produtos do Neon...</td></tr>`;

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (!sql) throw new Error("Instância do Neon SQL não está carregada.");

        const produtos = await sql`SELECT * FROM produtos ORDER BY id DESC;`;

        listaProdutosGeral = produtos || [];
        atualizarContadoresCategorias(produtos);
        filtrarERenderizarTabelaProdutos();

    } catch (e) {
        console.error('Erro ao carregar lista de produtos:', e);
        tabelaCorpo.innerHTML = `<tr><td colspan="6" style="color: #ff6b6b; text-align: center; padding: 20px;">Falha ao obter produtos: ${e.message}</td></tr>`;
    }
}
window.carregarEAtualizarTabelaProdutos = carregarEAtualizarTabelaProdutos;

function filtrarERenderizarTabelaProdutos() {
    const tabelaCorpo = document.getElementById('lista-produtos-admin') || document.getElementById('tabela-produtos-corpo');
    if (!tabelaCorpo) return;

    let filtrados = listaProdutosGeral;
    if (categoriaAtivaAdmin === 'ofertas') {
        filtrados = listaProdutosGeral.filter(p => p.destaque === true || (p.preco_promocional && Number(p.preco_promocional) > 0));
    } else if (categoriaAtivaAdmin !== 'todos') {
        filtrados = listaProdutosGeral.filter(p => (p.categoria || '').toLowerCase() === categoriaAtivaAdmin);
    }

    if (filtrados.length === 0) {
        tabelaCorpo.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto, #888); padding: 30px;">Nenhuma peça encontrada nesta categoria.</td></tr>`;
        return;
    }

    tabelaCorpo.innerHTML = filtrados.map(p => {
        const precoFmt = Number(p.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        let primeiraImagem = 'img/placeholder.png';
        try {
            const arrImgs = typeof p.imagens === 'string' ? JSON.parse(p.imagens) : p.imagens;
            if (Array.isArray(arrImgs) && arrImgs.length > 0) primeiraImagem = arrImgs[0];
            else if (p.imagem) primeiraImagem = p.imagem;
        } catch (e) {}

        return `
            <tr>
                <td>
                    <img src="${primeiraImagem}" style="width: 44px; height: 52px; object-fit: cover; border-radius: 4px; border: 1px solid #333;">
                </td>
                <td>
                    <div style="font-weight: 700; color: #fff;">${p.nome}</div>
                    <small style="color: #666;">ID: #${p.id}</small>
                </td>
                <td>
                    <span style="text-transform: uppercase; font-size: 11px; background: rgba(255,255,255,0.06); padding: 3px 6px; border-radius: 4px; color: #aaa;">
                        ${p.categoria || 'Geral'}
                    </span>
                </td>
                <td style="color: var(--dourado, #d4af37); font-weight: 700;">${precoFmt}</td>
                <td>
                    <input type="number" min="0" value="${p.estoque || 0}" onchange="atualizarEstoqueRapido(${p.id}, this.value)" style="width: 65px; background: #111; border: 1px solid #333; color: #fff; padding: 4px 6px; border-radius: 4px; text-align: center; font-weight: 700;">
                </td>
                <td>
                    <!-- BOTÃO DE EDITAR -->
                    <button type="button" onclick="prepararEdicaoProduto(${p.id})" title="Editar Peça" style="background: transparent; border: 1px solid var(--dourado, #d4af37); color: var(--dourado, #d4af37); padding: 5px 8px; border-radius: 4px; cursor: pointer; margin-right: 4px;">✏️</button>
                    <!-- BOTÃO DE EXCLUIR -->
                    <button type="button" onclick="excluirProdutoAdmin(${p.id})" title="Excluir Peça" style="background: transparent; border: 1px solid #ff4444; color: #ff4444; padding: 5px 8px; border-radius: 4px; cursor: pointer;">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function atualizarContadoresCategorias(produtos) {
    const contadores = { todos: produtos.length, vestidos: 0, conjuntos: 0, calcas: 0, camisas: 0, bermudas: 0, acessorios: 0, ofertas: 0 };

    produtos.forEach(p => {
        const cat = (p.categoria || '').toLowerCase();
        if (contadores[cat] !== undefined) contadores[cat]++;
        if (p.destaque === true || (p.preco_promocional && Number(p.preco_promocional) > 0)) {
            contadores.ofertas++;
        }
    });

    for (const [chave, valor] of Object.entries(contadores)) {
        const el = document.getElementById(`cont-cat-${chave}`);
        if (el) el.innerText = valor;
    }
}

/**
 * 3. Preparar Edição de Produto (Carrega os dados de volta para o formulário)
 */
function prepararEdicaoProduto(idProduto) {
    const produto = listaProdutosGeral.find(p => p.id == idProduto);
    if (!produto) {
        alert('Produto não encontrado para edição.');
        return;
    }

    // Preenche os campos do formulário
    const inputEditId = document.getElementById('editando-id');
    const inputNome = document.getElementById('nome-produto');
    const selectCategoria = document.getElementById('categoria-produto');
    const textareaDescricao = document.getElementById('descricao-produto');
    const inputPreco = document.getElementById('preco-produto');
    const inputPrecoPromo = document.getElementById('preco-promocional-produto');
    const checkDestaque = document.getElementById('destaque-promocao');
    const inputEstoque = document.getElementById('estoque-produto');

    if (inputEditId) inputEditId.value = produto.id;
    if (inputNome) inputNome.value = produto.nome || '';
    if (selectCategoria) selectCategoria.value = (produto.categoria || '').toLowerCase();
    if (textareaDescricao) textareaDescricao.value = produto.descricao || '';
    if (inputPreco) inputPreco.value = produto.preco || '';
    if (inputPrecoPromo) inputPrecoPromo.value = produto.preco_promocional || '';
    if (checkDestaque) checkDestaque.checked = !!produto.destaque;
    if (inputEstoque) inputEstoque.value = produto.estoque || 0;

    // Carrega as fotos existentes
    listaImagensProdutoBase64 = [];
    try {
        const arrImgs = typeof produto.imagens === 'string' ? JSON.parse(produto.imagens) : produto.imagens;
        if (Array.isArray(arrImgs)) {
            listaImagensProdutoBase64 = [...arrImgs];
        } else if (produto.imagem) {
            listaImagensProdutoBase64 = [produto.imagem];
        }
    } catch (e) {
        if (produto.imagem) listaImagensProdutoBase64 = [produto.imagem];
    }
    renderizarPreviewImagens();

    // Altera títulos e botões para modo de edição
    const tituloForm = document.getElementById('titulo-form-produto');
    const btnSubmit = document.getElementById('btn-submit-produto');
    const btnCancelar = document.getElementById('btn-cancelar-edicao');

    if (tituloForm) tituloForm.innerText = `✏️ Editar Peça #${produto.id}`;
    if (btnSubmit) btnSubmit.innerText = '💾 Atualizar Peça no Catálogo';
    if (btnCancelar) btnCancelar.style.display = 'inline-block';

    // Alterna para a aba do formulário
    if (typeof alternarAbaAdmin === 'function') {
        alternarAbaAdmin('secao-cadastro');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.prepararEdicaoProduto = prepararEdicaoProduto;

/**
 * 4. Cancelar Edição de Produto (Restaura o formulário para modo de criação)
 */
function cancelarEdicaoProduto() {
    const inputEditId = document.getElementById('editando-id');
    const form = document.getElementById('form-cadastro-produto');
    const tituloForm = document.getElementById('titulo-form-produto');
    const btnSubmit = document.getElementById('btn-submit-produto');
    const btnCancelar = document.getElementById('btn-cancelar-edicao');

    if (inputEditId) inputEditId.value = '';
    if (form) form.reset();

    listaImagensProdutoBase64 = [];
    renderizarPreviewImagens();

    if (tituloForm) tituloForm.innerText = '➕ Cadastrar Nova Peça';
    if (btnSubmit) btnSubmit.innerText = '💾 Salvar Peça no Catálogo';
    if (btnCancelar) btnCancelar.style.display = 'none';

    if (typeof alternarAbaAdmin === 'function') {
        alternarAbaAdmin('secao-catalogo');
    }
}
window.cancelarEdicaoProduto = cancelarEdicaoProduto;

/**
 * 5. Salvar ou Atualizar Produto (Trata criação e atualização no mesmo formulário)
 */
async function salvarProduto(e) {
    e.preventDefault();

    const editandoId = document.getElementById('editando-id')?.value;
    const nome = document.getElementById('nome-produto')?.value.trim();
    const categoria = document.getElementById('categoria-produto')?.value;
    const preco = parseFloat(document.getElementById('preco-produto')?.value || '0');
    const precoPromocional = parseFloat(document.getElementById('preco-promocional-produto')?.value || '0') || null;
    const estoque = parseInt(document.getElementById('estoque-produto')?.value || '0', 10);
    const descricao = document.getElementById('descricao-produto')?.value.trim() || '';
    const destaque = document.getElementById('destaque-promocao')?.checked || false;

    if (!nome || !preco || listaImagensProdutoBase64.length === 0) {
        alert('Por favor, preencha o nome, o preço e adicione pelo menos uma imagem.');
        return;
    }

    const btnSubmit = document.getElementById('btn-submit-produto');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerText = editandoId ? 'A atualizar no Neon...' : 'A guardar no Neon...';
    }

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (!sql) throw new Error("Instância do Neon SQL não está carregada.");

        if (editandoId) {
            // ATUALIZAÇÃO (UPDATE)
            await sql`
                UPDATE produtos 
                SET 
                    nome = ${nome},
                    categoria = ${categoria},
                    preco = ${preco},
                    preco_promocional = ${precoPromocional},
                    estoque = ${estoque},
                    descricao = ${descricao},
                    destaque = ${destaque},
                    imagens = ${JSON.stringify(listaImagensProdutoBase64)},
                    imagem = ${listaImagensProdutoBase64[0] || 'img/produto1.jpg'}
                WHERE id = ${editandoId};
            `;
            alert('✨ Peça atualizada com sucesso!');
        } else {
            // CRIAÇÃO (INSERT)
            await sql`
                INSERT INTO produtos (
                    nome, categoria, preco, preco_promocional, estoque, descricao, 
                    destaque, imagens, imagem
                ) VALUES (
                    ${nome}, ${categoria}, ${preco}, ${precoPromocional}, ${estoque}, ${descricao},
                    ${destaque}, ${JSON.stringify(listaImagensProdutoBase64)}, ${listaImagensProdutoBase64[0] || 'img/produto1.jpg'}
                );
            `;
            alert('✨ Peça registada no catálogo com sucesso!');
        }

        cancelarEdicaoProduto();
        await carregarEAtualizarTabelaProdutos();

    } catch (err) {
        console.error('Erro ao guardar produto:', err);
        alert('Falha ao guardar peça no Neon DB: ' + err.message);
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
        }
    }
}

/**
 * 6. Atualizar estoque rápido
 */
async function atualizarEstoqueRapido(idProduto, novoEstoque) {
    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        await sql`
            UPDATE produtos 
            SET estoque = ${parseInt(novoEstoque, 10) || 0} 
            WHERE id = ${idProduto};
        `;
    } catch (e) {
        console.error('Erro ao atualizar estoque:', e);
        alert('Falha ao atualizar estoque.');
    }
}
window.atualizarEstoqueRapido = atualizarEstoqueRapido;

/**
 * 7. Excluir produto
 */
async function excluirProdutoAdmin(idProduto) {
    if (!confirm('Deseja realmente excluir este produto?')) return;
    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        await sql`DELETE FROM produtos WHERE id = ${idProduto};`;
        await carregarEAtualizarTabelaProdutos();
    } catch (e) {
        console.error('Erro ao excluir produto:', e);
        alert('Erro ao excluir produto.');
    }
}
window.excluirProdutoAdmin = excluirProdutoAdmin;

// Inicializa escutas e eventos no carregamento
document.addEventListener('DOMContentLoaded', () => {
    configurarUploadImagensProduto();
    carregarEAtualizarTabelaProdutos();

    const formProduto = document.getElementById('form-cadastro-produto');
    if (formProduto) {
        formProduto.addEventListener('submit', salvarProduto);
    }

    const btnCancelar = document.getElementById('btn-cancelar-edicao');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', cancelarEdicaoProduto);
    }

    // Filtros de categorias (abas)
    const botoesCat = document.querySelectorAll('.btn-aba-cat');
    botoesCat.forEach(btn => {
        btn.addEventListener('click', () => {
            botoesCat.forEach(b => b.classList.remove('ativo'));
            btn.classList.add('ativo');
            categoriaAtivaAdmin = btn.getAttribute('data-cat') || 'todos';
            filtrarERenderizarTabelaProdutos();
        });
    });
});