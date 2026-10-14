// ==========================================================================
// VR MODAS - GESTÃO DE PRODUTOS, ESTOQUE & VARIAÇÕES (NEON DB)
// js/admin/produtos.js
// ==========================================================================

let listaImagensProdutoBase64 = [];

/**
 * 1. Converte e compacta imagens selecionadas para Base64
 */
function configurarUploadImagensProduto() {
    const inputImagens = document.getElementById('produto-imagens');
    const previewContainer = document.getElementById('preview-imagens-produto');
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
    const container = document.getElementById('preview-imagens-produto');
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
 * 2. Carregar e Renderizar Lista de Produtos no Catálogo & Estoque
 */
async function carregarEAtualizarTabelaProdutos() {
    const tabelaCorpo = document.getElementById('tabela-produtos-corpo');
    if (!tabelaCorpo) return;

    tabelaCorpo.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--cinza-texto, #888); padding: 25px;">A carregar produtos do Neon...</td></tr>`;

    try {
        const sql = await getSql();
        const produtos = await sql`
            SELECT id, nome, categoria, preco, preco_antigo, estoque, destaque, imagens 
            FROM produtos 
            ORDER BY id DESC;
        `;

        if (!produtos || produtos.length === 0) {
            tabelaCorpo.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--cinza-texto, #888); padding: 30px;">Nenhum produto cadastrado até o momento.</td></tr>`;
            return;
        }

        tabelaCorpo.innerHTML = produtos.map(p => {
            const precoFmt = Number(p.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            
            let primeiraImagem = 'img/placeholder.png';
            try {
                const arrImgs = typeof p.imagens === 'string' ? JSON.parse(p.imagens) : p.imagens;
                if (Array.isArray(arrImgs) && arrImgs.length > 0) primeiraImagem = arrImgs[0];
            } catch (e) {}

            return `
                <tr>
                    <td>
                        <img src="${primeiraImagem}" style="width: 44px; height: 52px; object-fit: cover; border-radius: 4px; border: 1px solid #333;">
                    </td>
                    <td>
                        <div style="font-weight: 700; color: #fff;">${p.nome}</div>
                        <small style="color: #888; text-transform: uppercase;">${p.categoria || 'Geral'}</small>
                    </td>
                    <td style="color: var(--dourado, #d4af37); font-weight: 700;">${precoFmt}</td>
                    <td>
                        <input type="number" min="0" value="${p.estoque || 0}" onchange="atualizarEstoqueRapido(${p.id}, this.value)" style="width: 70px; background: #111; border: 1px solid #333; color: #fff; padding: 4px 6px; border-radius: 4px; text-align: center; font-weight: 700;">
                    </td>
                    <td>
                        <button type="button" onclick="alternarDestaqueProduto(${p.id}, ${!p.destaque})" style="background: ${p.destaque ? 'rgba(212,175,55,0.15)' : 'transparent'}; border: 1px solid ${p.destaque ? 'var(--dourado, #d4af37)' : '#444'}; color: ${p.destaque ? 'var(--dourado, #d4af37)' : '#666'}; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 700;">
                            ${p.destaque ? '⭐ Destaque' : '☆ Comum'}
                        </button>
                    </td>
                    <td>
                        <button type="button" onclick="excluirProdutoAdmin(${p.id})" title="Excluir Peça" style="background: transparent; border: 1px solid #ff4444; color: #ff4444; padding: 5px 8px; border-radius: 4px; cursor: pointer;">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.error('Erro ao carregar lista de produtos:', e);
        tabelaCorpo.innerHTML = `<tr><td colspan="7" style="color: #ff6b6b; text-align: center; padding: 20px;">Falha ao obter produtos. Verifique a sua ligação.</td></tr>`;
    }
}

/**
 * 3. Gravar Novo Produto no Neon
 */
async function salvarNovoProduto(e) {
    e.preventDefault();

    const nome = document.getElementById('produto-nome')?.value.trim();
    const categoria = document.getElementById('produto-categoria')?.value;
    const preco = parseFloat(document.getElementById('produto-preco')?.value || '0');
    const precoAntigo = parseFloat(document.getElementById('produto-preco-antigo')?.value || '0') || null;
    const estoque = parseInt(document.getElementById('produto-estoque')?.value || '0', 10);
    const descricao = document.getElementById('produto-descricao')?.value.trim() || '';
    const destaque = document.getElementById('produto-destaque')?.checked || false;

    // Coleta tamanhos selecionados
    const tamanhos = Array.from(document.querySelectorAll('.check-tamanho:checked')).map(el => el.value);

    // Coleta cores informadas (separadas por vírgula)
    const coresInput = document.getElementById('produto-cores')?.value || '';
    const cores = coresInput.split(',').map(c => c.trim()).filter(Boolean);

    if (!nome || !preco || listaImagensProdutoBase64.length === 0) {
        alert('Por favor, preencha o nome, o preço e selecione pelo menos uma imagem para a peça.');
        return;
    }

    const btnSubmit = document.getElementById('btn-salvar-produto');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerText = 'A guardar no Neon...';
    }

    try {
        const sql = await getSql();

        await sql`
            INSERT INTO produtos (
                nome, categoria, preco, preco_antigo, estoque, descricao, 
                destaque, imagens, tamanhos, cores
            ) VALUES (
                ${nome}, ${categoria}, ${preco}, ${precoAntigo}, ${estoque}, ${descricao},
                ${destaque}, ${JSON.stringify(listaImagensProdutoBase64)}, 
                ${JSON.stringify(tamanhos)}, ${JSON.stringify(cores)}
            );
        `;

        alert('✨ Produto cadastrado com sucesso!');
        document.getElementById('form-cadastro-produto')?.reset();
        listaImagensProdutoBase64 = [];
        renderizarPreviewImagens();

        if (typeof alternarAbaAdmin === 'function') {
            alternarAbaAdmin('secao-catalogo');
        }

    } catch (err) {
        console.error('Erro ao registar produto:', err);
        alert('Falha ao registar o produto na base de dados Neon.');
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerText = 'Cadastrar Peça';
        }
    }
}

/**
 * 4. Atualização Rápida de Estoque Direto na Tabela
 */
async function atualizarEstoqueRapido(idProduto, novoEstoque) {
    try {
        const sql = await getSql();
        await sql`
            UPDATE produtos 
            SET estoque = ${parseInt(novoEstoque, 10) || 0} 
            WHERE id = ${idProduto};
        `;
    } catch (e) {
        console.error('Erro ao atualizar estoque:', e);
        alert('Falha ao atualizar a quantidade em estoque.');
    }
}

/**
 * 5. Alternar Destaque de Vitrine
 */
async function alternarDestaqueProduto(idProduto, novoDestaque) {
    try {
        const sql = await getSql();
        await sql`
            UPDATE produtos 
            SET destaque = ${novoDestaque} 
            WHERE id = ${idProduto};
        `;
        carregarEAtualizarTabelaProdutos();
    } catch (e) {
        console.error('Erro ao alterar destaque:', e);
        alert('Falha ao atualizar status de destaque.');
    }
}

/**
 * 6. Excluir Produto
 */
async function excluirProdutoAdmin(idProduto) {
    if (!confirm('Tem certeza de que deseja excluir este produto do catálogo?')) return;

    try {
        const sql = await getSql();
        await sql`DELETE FROM produtos WHERE id = ${idProduto};`;
        carregarEAtualizarTabelaProdutos();
    } catch (e) {
        console.error('Erro ao excluir produto:', e);
        alert('Erro ao excluir peça do banco de dados.');
    }
}

// Inicializa eventos no carregamento do documento
document.addEventListener('DOMContentLoaded', () => {
    configurarUploadImagensProduto();

    const formProduto = document.getElementById('form-cadastro-produto');
    if (formProduto) {
        formProduto.addEventListener('submit', salvarNovoProduto);
    }
});