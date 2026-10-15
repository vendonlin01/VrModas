// ==========================================================================
// VR MODAS - GESTÃO DE PRODUTOS, CATÁLOGO, ESTOQUE & EDIÇÃO (NEON DB - COMPACTO)
// js/admin/produtos.js
// ==========================================================================

let listaImagensProdutoBase64 = [];
let coresAdicionadas = []; // Lista de { nome: string, qtd: number }
let categoriaAtivaAdmin = 'todos';
let listaProdutosGeral = [];

// Grade de tamanhos por categoria
const gradeTamanhosPorCategoria = {
    'vestidos': ['PP', 'P', 'M', 'G', 'GG', 'Único'],
    'conjuntos': ['PP', 'P', 'M', 'G', 'GG', 'Único'],
    'calcas': ['34', '36', '38', '40', '42', '44', '46'],
    'camisas': ['1', '2', '3', '4', 'P', 'M', 'G', 'GG'],
    'bermudas': ['36', '38', '40', '42', '44', '46'],
    'bolsas': ['Único'],
    'cintos': ['P', 'M', 'G', 'Único'],
    'joias': ['Ajustável', 'Único'],
    'acessorios': ['Único']
};

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
 * 2. Gerenciador Dinâmico de Cores & Estoque com o Botão (+)
 */
function configurarGerenciadorCores() {
    const btnAddCor = document.getElementById('btn-adicionar-cor');
    const inputNomeCor = document.getElementById('input-nome-cor');
    const inputQtdCor = document.getElementById('input-qtd-cor');

    if (!btnAddCor) return;

    btnAddCor.addEventListener('click', () => {
        const nomeCor = inputNomeCor.value.trim();
        const qtdCor = parseInt(inputQtdCor.value, 10);

        if (!nomeCor) {
            alert('Digite o nome da cor (Ex: Azul Marinho, Bege, etc).');
            inputNomeCor.focus();
            return;
        }

        if (isNaN(qtdCor) || qtdCor <= 0) {
            alert('Digite uma quantidade válida para esta cor.');
            inputQtdCor.focus();
            return;
        }

        coresAdicionadas.push({ nome: nomeCor, qtd: qtdCor });
        inputNomeCor.value = '';
        inputQtdCor.value = '';
        inputNomeCor.focus();

        renderizarCoresAdicionadas();
    });
}

function renderizarCoresAdicionadas() {
    const container = document.getElementById('lista-cores-adicionadas');
    const inputEstoqueGeral = document.getElementById('estoque-produto');
    const inputCoresOculto = document.getElementById('cores-produto');
    const inputEstoqueCorOculto = document.getElementById('estoque-por-cor-produto');

    if (!container) return;

    if (coresAdicionadas.length === 0) {
        container.innerHTML = '<span style="color: #666; font-size: 11.5px; font-style: italic;">Nenhuma cor adicionada ainda. Digite o nome, quantidade e aperte (+).</span>';
        if (inputEstoqueGeral) inputEstoqueGeral.value = 0;
        if (inputCoresOculto) inputCoresOculto.value = '';
        if (inputEstoqueCorOculto) inputEstoqueCorOculto.value = '';
        return;
    }

    let somaEstoque = 0;
    container.innerHTML = coresAdicionadas.map((c, idx) => {
        somaEstoque += c.qtd;
        return `
            <div style="display: inline-flex; align-items: center; gap: 6px; background: #1c1c1c; border: 1px solid var(--dourado, #d4af37); padding: 5px 10px; border-radius: 16px; font-size: 12px; color: #fff;">
                <strong>${c.nome}</strong>: <span style="color: var(--dourado, #d4af37);">${c.qtd} un</span>
                <button type="button" onclick="removerCorAdicionada(${idx})" style="background: transparent; border: none; color: #ff5252; cursor: pointer; font-size: 14px; margin-left: 4px; line-height: 1;">&times;</button>
            </div>
        `;
    }).join('');

    if (inputEstoqueGeral) inputEstoqueGeral.value = somaEstoque;
    if (inputCoresOculto) inputCoresOculto.value = JSON.stringify(coresAdicionadas.map(c => c.nome));
    if (inputEstoqueCorOculto) inputEstoqueCorOculto.value = JSON.stringify(coresAdicionadas);
}

function removerCorAdicionada(idx) {
    coresAdicionadas.splice(idx, 1);
    renderizarCoresAdicionadas();
}
window.removerCorAdicionada = removerCorAdicionada;

/**
 * 3. Gerador Dinâmico de Tamanhos Conforme a Categoria
 */
function configurarTamanhosPorCategoria() {
    const selectCategoria = document.getElementById('categoria-produto');
    const containerTamanhos = document.getElementById('container-tamanhos-dinamicos');
    if (!selectCategoria || !containerTamanhos) return;

    selectCategoria.addEventListener('change', () => {
        const cat = selectCategoria.value;
        const listaTamanhos = gradeTamanhosPorCategoria[cat] || ['P', 'M', 'G', 'GG', 'Único'];

        containerTamanhos.innerHTML = `
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${listaTamanhos.map(tam => `
                    <label style="display: inline-flex; align-items: center; gap: 5px; background: #181818; border: 1px solid #333; padding: 6px 12px; border-radius: 6px; cursor: pointer; color: #fff; font-size: 12px; font-weight: 700;">
                        <input type="checkbox" class="check-tamanho" value="${tam}" style="accent-color: var(--dourado, #d4af37); width: 14px; height: 14px;">
                        ${tam}
                    </label>
                `).join('')}
            </div>
        `;
    });
}

/**
 * 4. Cálculo Dinâmico do Desconto Promocional
 */
function configurarCalculoDesconto() {
    const inputPreco = document.getElementById('preco-produto');
    const inputPromo = document.getElementById('preco-promocional-produto');
    const avisoDesconto = document.getElementById('aviso-desconto');

    function calcular() {
        if (!inputPreco || !inputPromo || !avisoDesconto) return;
        const pNormal = parseFloat(inputPreco.value) || 0;
        const pPromo = parseFloat(inputPromo.value) || 0;

        if (pNormal > 0 && pPromo > 0 && pPromo < pNormal) {
            const perc = Math.round(((pNormal - pPromo) / pNormal) * 100);
            avisoDesconto.innerText = `Economia de ${perc}% para o cliente!`;
            avisoDesconto.style.display = 'block';
        } else {
            avisoDesconto.style.display = 'none';
        }
    }

    if (inputPreco) inputPreco.addEventListener('input', calcular);
    if (inputPromo) inputPromo.addEventListener('input', calcular);
}

/**
 * 5. Carregar e Renderizar Lista de Produtos no Formato Compacto Elegante
 */
async function carregarEAtualizarTabelaProdutos() {
    const tabelaCorpo = document.getElementById('lista-produtos-admin') || document.getElementById('tabela-produtos-corpo');
    if (!tabelaCorpo) return;

    tabelaCorpo.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto, #888); padding: 25px; font-size: 12px;">A carregar produtos do Neon...</td></tr>`;

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (!sql) throw new Error("Instância do Neon SQL não está carregada.");

        const produtos = await sql`SELECT * FROM produtos ORDER BY id DESC;`;

        listaProdutosGeral = produtos || [];
        atualizarContadoresCategorias(produtos);
        filtrarERenderizarTabelaProdutos();

    } catch (e) {
        console.error('Erro ao carregar lista de produtos:', e);
        tabelaCorpo.innerHTML = `<tr><td colspan="6" style="color: #ff6b6b; text-align: center; padding: 20px; font-size: 12px;">Falha ao obter produtos: ${e.message}</td></tr>`;
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
        tabelaCorpo.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--cinza-texto, #888); padding: 25px; font-size: 12px;">Nenhuma peça encontrada nesta categoria.</td></tr>`;
        return;
    }

    tabelaCorpo.innerHTML = filtrados.map(p => {
        const precoFmt = Number(p.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const estoqueTotal = parseInt(p.estoque || 0, 10);
        
        let primeiraImagem = 'img/placeholder.png';
        try {
            const arrImgs = typeof p.imagens === 'string' ? JSON.parse(p.imagens) : p.imagens;
            if (Array.isArray(arrImgs) && arrImgs.length > 0) primeiraImagem = arrImgs[0];
            else if (p.imagem) primeiraImagem = p.imagem;
        } catch (e) {}

        const cat = (p.categoria || 'Geral').toUpperCase();
        const corEstoque = estoqueTotal < 5 ? '#ff5252' : '#4cd137';
        const bgEstoque = estoqueTotal < 5 ? 'rgba(255,82,82,0.1)' : 'rgba(76,209,55,0.1)';

        // Resumo curto de cores
        let resumoCores = '';
        try {
            const coresArr = typeof p.cores === 'string' ? JSON.parse(p.cores) : p.cores;
            if (Array.isArray(coresArr) && coresArr.length > 0) {
                resumoCores = coresArr.map(c => typeof c === 'object' ? `${c.nome} (${c.qtd})` : c).join(', ');
            }
        } catch(e) {}

        return `
            <tr>
                <!-- Bloco Esquerdo: Foto, Categoria, ID, Nome e Estoque -->
                <td style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; text-align: left;">
                    <img src="${primeiraImagem}" style="width: 38px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid #333; flex-shrink: 0;" onerror="this.src='img/placeholder.png'">
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 2px;">
                            <span style="font-size: 9.5px; padding: 1px 5px; border-radius: 3px; background: #222; color: var(--dourado, #d4af37); font-weight: 700;">${cat}</span>
                            <small style="color: #666; font-size: 10px;">#${p.id}</small>
                        </div>
                        <div style="font-size: 12px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${p.nome}
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                            <span style="font-size: 9.5px; color: ${corEstoque}; background: ${bgEstoque}; border: 1px solid ${corEstoque}; padding: 1px 5px; border-radius: 3px; font-weight: 700;">
                                ${estoqueTotal} un
                            </span>
                            ${resumoCores ? `<span style="font-size: 10.5px; color: #777; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${resumoCores}</span>` : ''}
                        </div>
                    </div>
                </td>

                <!-- Bloco Direito: Preço e Botões Rápidos -->
                <td style="text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                    <div style="color: var(--dourado, #d4af37); font-weight: 700; font-size: 13.5px;">
                        ${precoFmt}
                    </div>
                    <div style="display: flex; gap: 4px;">
                        <button type="button" onclick="prepararEdicaoProduto(${p.id})" title="Editar Peça" style="background: #1a1a1a; border: 1px solid var(--dourado, #d4af37); color: var(--dourado, #d4af37); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">✏️</button>
                        <button type="button" onclick="excluirProdutoAdmin(${p.id})" title="Excluir Peça" style="background: #1a1a1a; border: 1px solid #ff4444; color: #ff4444; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">🗑️</button>
                    </div>
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
 * 6. Preparar Edição de Produto
 */
function prepararEdicaoProduto(idProduto) {
    const produto = listaProdutosGeral.find(p => p.id == idProduto);
    if (!produto) {
        alert('Produto não encontrado para edição.');
        return;
    }

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
    if (selectCategoria) {
        selectCategoria.value = (produto.categoria || '').toLowerCase();
        selectCategoria.dispatchEvent(new Event('change'));
    }
    if (textareaDescricao) textareaDescricao.value = produto.descricao || '';
    if (inputPreco) inputPreco.value = produto.preco || '';
    if (inputPrecoPromo) inputPrecoPromo.value = produto.preco_promocional || '';
    if (checkDestaque) checkDestaque.checked = !!produto.destaque;
    if (inputEstoque) inputEstoque.value = produto.estoque || 0;

    setTimeout(() => {
        try {
            const tamanhosArr = typeof produto.tamanhos === 'string' ? JSON.parse(produto.tamanhos) : (produto.tamanhos || []);
            document.querySelectorAll('.check-tamanho').forEach(chk => {
                chk.checked = tamanhosArr.includes(chk.value);
            });
        } catch(e) {}
    }, 100);

    coresAdicionadas = [];
    try {
        const coresRaw = typeof produto.cores === 'string' ? JSON.parse(produto.cores) : (produto.cores || []);
        coresAdicionadas = coresRaw.map(c => {
            if (typeof c === 'object' && c !== null) return { nome: c.nome, qtd: Number(c.qtd) || 1 };
            return { nome: String(c), qtd: 1 };
        });
    } catch(e) {}
    renderizarCoresAdicionadas();

    listaImagensProdutoBase64 = [];
    try {
        const arrImgs = typeof produto.imagens === 'string' ? JSON.parse(produto.imagens) : produto.imagens;
        if (Array.isArray(arrImgs)) listaImagensProdutoBase64 = [...arrImgs];
        else if (produto.imagem) listaImagensProdutoBase64 = [produto.imagem];
    } catch (e) {
        if (produto.imagem) listaImagensProdutoBase64 = [produto.imagem];
    }
    renderizarPreviewImagens();

    const tituloForm = document.getElementById('titulo-form-produto');
    const btnSubmit = document.getElementById('btn-submit-produto');
    const btnCancelar = document.getElementById('btn-cancelar-edicao');

    if (tituloForm) tituloForm.innerText = `✏️ Editar Peça #${produto.id}`;
    if (btnSubmit) btnSubmit.innerText = '💾 Atualizar Peça no Catálogo';
    if (btnCancelar) btnCancelar.style.display = 'inline-block';

    if (typeof alternarAbaAdmin === 'function') {
        alternarAbaAdmin('secao-cadastro');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.prepararEdicaoProduto = prepararEdicaoProduto;

/**
 * 7. Cancelar Edição
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
    coresAdicionadas = [];
    renderizarPreviewImagens();
    renderizarCoresAdicionadas();

    if (tituloForm) tituloForm.innerText = '➕ Cadastrar Nova Peça';
    if (btnSubmit) btnSubmit.innerText = '💾 Salvar Peça no Catálogo';
    if (btnCancelar) btnCancelar.style.display = 'none';

    if (typeof alternarAbaAdmin === 'function') {
        alternarAbaAdmin('secao-catalogo');
    }
}
window.cancelarEdicaoProduto = cancelarEdicaoProduto;

/**
 * 8. Salvar ou Atualizar Produto (INSERT ou UPDATE no Neon)
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

    const tamanhos = Array.from(document.querySelectorAll('.check-tamanho:checked')).map(chk => chk.value);

    if (!nome) {
        alert('Por favor, informe o nome do produto.');
        return;
    }
    if (!categoria) {
        alert('Por favor, selecione a categoria do produto.');
        return;
    }
    if (!preco || preco <= 0) {
        alert('Por favor, informe um preço válido.');
        return;
    }
    if (coresAdicionadas.length === 0 && estoque === 0) {
        alert('Adicione pelo menos uma cor com quantidade usando o botão (+) ou defina o estoque.');
        return;
    }
    if (listaImagensProdutoBase64.length === 0) {
        alert('Por favor, envie pelo menos uma foto para a peça.');
        return;
    }

    const btnSubmit = document.getElementById('btn-submit-produto');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerText = editandoId ? 'Atualizando peça...' : 'Salvando peça no catálogo...';
    }

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (!sql) throw new Error("Instância do Neon SQL não está carregada.");

        if (editandoId) {
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
                    imagem = ${listaImagensProdutoBase64[0] || 'img/produto1.jpg'},
                    tamanhos = ${JSON.stringify(tamanhos)},
                    cores = ${JSON.stringify(coresAdicionadas)}
                WHERE id = ${editandoId};
            `;
            alert('✨ Peça atualizada com sucesso!');
        } else {
            await sql`
                INSERT INTO produtos (
                    nome, categoria, preco, preco_promocional, estoque, descricao, 
                    destaque, imagens, imagem, tamanhos, cores
                ) VALUES (
                    ${nome}, ${categoria}, ${preco}, ${precoPromocional}, ${estoque}, ${descricao},
                    ${destaque}, ${JSON.stringify(listaImagensProdutoBase64)}, ${listaImagensProdutoBase64[0] || 'img/produto1.jpg'},
                    ${JSON.stringify(tamanhos)}, ${JSON.stringify(coresAdicionadas)}
                );
            `;
            alert('✨ Peça cadastrada com sucesso no catálogo!');
        }

        cancelarEdicaoProduto();
        await carregarEAtualizarTabelaProdutos();

    } catch (err) {
        console.error('Erro ao salvar produto:', err);
        alert('Falha ao salvar produto no Neon: ' + err.message);
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
        }
    }
}

/**
 * 9. Atualizar estoque rápido
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
 * 10. Excluir produto
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

// Inicialização completa de eventos
document.addEventListener('DOMContentLoaded', () => {
    configurarUploadImagensProduto();
    configurarGerenciadorCores();
    configurarTamanhosPorCategoria();
    configurarCalculoDesconto();
    carregarEAtualizarTabelaProdutos();

    const formProduto = document.getElementById('form-cadastro-produto');
    if (formProduto) {
        formProduto.addEventListener('submit', salvarProduto);
    }

    const btnCancelar = document.getElementById('btn-cancelar-edicao');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', cancelarEdicaoProduto);
    }

    const botoesCat = document.querySelectorAll('#abas-categorias-admin .btn-aba-cat');
    botoesCat.forEach(btn => {
        btn.addEventListener('click', () => {
            botoesCat.forEach(b => b.classList.remove('ativo'));
            btn.classList.add('ativo');
            categoriaAtivaAdmin = btn.getAttribute('data-cat') || 'todos';
            filtrarERenderizarTabelaProdutos();
        });
    });
});