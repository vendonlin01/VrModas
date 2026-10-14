// ==========================================================================
// VR MODAS - GESTÃO DE PRODUTOS, CATÁLOGO & ESTOQUE (NEON DB)
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
 * 3. Atualizar estoque rápido
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
 * 4. Excluir produto
 */
async function excluirProdutoAdmin(idProduto) {
    if (!confirm('Deseja realmente excluir este produto?')) return;
    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        await sql`DELETE FROM produtos WHERE id = ${idProduto};`;
        carregarEAtualizarTabelaProdutos();
    } catch (e) {
        console.error('Erro ao excluir produto:', e);
        alert('Erro ao excluir produto.');
    }
}
window.excluirProdutoAdmin = excluirProdutoAdmin;

// Inicializa escutas e carrega produtos assim que a tela abre
document.addEventListener('DOMContentLoaded', () => {
    configurarUploadImagensProduto();
    carregarEAtualizarTabelaProdutos();

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