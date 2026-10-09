// ==========================================
// MÓDULO: CADASTRO E EDIÇÃO DE PRODUTOS
// ==========================================
export function comprimirImagem(file, callback) {
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

export function iniciarModuloProdutos(aoSalvarSucesso) {
    const formAdmin = document.getElementById('form-cadastro-produto');
    const inputFoto = document.getElementById('foto-produto');
    const previewContainer = document.getElementById('preview-fotos');
    const editandoIdInput = document.getElementById('editando-id');
    const tituloFormProduto = document.getElementById('titulo-form-produto');
    const btnSubmitProduto = document.getElementById('btn-submit-produto');
    const btnCancelarEdicao = document.getElementById('btn-cancelar-edicao');
    let fotosEmEdicao = [];

    if (inputFoto && previewContainer) {
        inputFoto.onchange = function() {
            previewContainer.innerHTML = '';
            fotosEmEdicao = [];
            Array.from(this.files).forEach(file => {
                comprimirImagem(file, (imgComprimida) => {
                    previewContainer.innerHTML += `<img src="${imgComprimida}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 2px solid #d4af37;">`;
                });
            });
        };
    }

    window.iniciarEdicaoProdutoGlobal = function(id) {
        const produtos = JSON.parse(localStorage.getItem('vr_modas_db')) || [];
        const produto = produtos.find(p => String(p.id) === String(id));
        if (!produto) return;

        if (editandoIdInput) editandoIdInput.value = produto.id;
        document.getElementById('nome-produto').value = produto.nome;
        document.getElementById('preco-produto').value = produto.preco;
        document.getElementById('categoria-produto').value = produto.categoria || '';
        document.getElementById('estoque-produto').value = produto.estoque || 0;
        
        const checkPromo = document.getElementById('destaque-promocao');
        if (checkPromo) checkPromo.checked = !!produto.promocao;

        document.getElementById('cores-produto').value = produto.cores || '';
        document.getElementById('descricao-produto').value = produto.descricao || '';

        const tamanhosProduto = produto.tamanhos || [];
        document.querySelectorAll('.check-tamanho').forEach(cb => {
            cb.checked = tamanhosProduto.includes(cb.value);
        });

        fotosEmEdicao = produto.imagens || (produto.imagem ? [produto.imagem] : ['img/produto1.jpg']);
        if (previewContainer) {
            previewContainer.innerHTML = '';
            fotosEmEdicao.forEach(f => {
                previewContainer.innerHTML += `<img src="${f}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 6px; border: 2px solid #d4af37;">`;
            });
        }

        if (tituloFormProduto) tituloFormProduto.innerText = `✏️ Editando: ${produto.nome}`;
        if (btnSubmitProduto) btnSubmitProduto.innerText = "Atualizar Peça no Catálogo";
        if (btnCancelarEdicao) btnCancelarEdicao.style.display = "inline-block";
    };

    function resetarModoEdicao() {
        if (editandoIdInput) editandoIdInput.value = "";
        if (tituloFormProduto) tituloFormProduto.innerText = "➕ Cadastrar Nova Peça";
        if (btnSubmitProduto) btnSubmitProduto.innerText = "Salvar Peça no Catálogo";
        if (btnCancelarEdicao) btnCancelarEdicao.style.display = "none";
        if (previewContainer) previewContainer.innerHTML = '';
        const checkPromo = document.getElementById('destaque-promocao');
        if (checkPromo) checkPromo.checked = false;
        fotosEmEdicao = [];
        if (formAdmin) formAdmin.reset();
    }

    if (btnCancelarEdicao) btnCancelarEdicao.onclick = resetarModoEdicao;

    if (formAdmin) {
        formAdmin.onsubmit = function(event) {
            event.preventDefault();
            const idEditando = editandoIdInput ? editandoIdInput.value : '';
            const nome = document.getElementById('nome-produto').value.trim();
            const preco = parseFloat(document.getElementById('preco-produto').value);
            const categoria = document.getElementById('categoria-produto').value;
            const estoque = parseInt(document.getElementById('estoque-produto').value);
            const isPromocao = document.getElementById('destaque-promocao')?.checked || false;
            const cores = document.getElementById('cores-produto').value.trim();
            const descricao = document.getElementById('descricao-produto').value.trim();
            const tamanhos = [];
            document.querySelectorAll('.check-tamanho:checked').forEach(cb => tamanhos.push(cb.value));

            const dadosComuns = {
                nome, preco, categoria, estoque, promocao: isPromocao, cores, tamanhos, descricao
            };

            if (inputFoto.files && inputFoto.files.length > 0) {
                Promise.all(Array.from(inputFoto.files).map(file => new Promise(res => {
                    comprimirImagem(file, res);
                }))).then(imagensComprimidas => {
                    salvarOuAtualizarProduto(idEditando, { ...dadosComuns, imagens: imagensComprimidas });
                });
            } else {
                const imagensFinais = (fotosEmEdicao.length > 0) ? fotosEmEdicao : ["img/produto1.jpg"];
                salvarOuAtualizarProduto(idEditando, { ...dadosComuns, imagens: imagensFinais });
            }
        };

        function salvarOuAtualizarProduto(idEditando, dados) {
            let banco = JSON.parse(localStorage.getItem('vr_modas_db')) || [];

            try {
                if (idEditando) {
                    const idx = banco.findIndex(p => String(p.id) === String(idEditando));
                    if (idx !== -1) {
                        banco[idx] = { ...banco[idx], ...dados, id: banco[idx].id };
                        if (typeof mostrarToast === 'function') mostrarToast(`Peça "${dados.nome}" atualizada!`);
                    }
                } else {
                    const novoProduto = { id: Date.now(), ...dados };
                    banco.push(novoProduto);
                    if (typeof mostrarToast === 'function') mostrarToast(`Peça "${dados.nome}" cadastrada com sucesso!`);
                }

                localStorage.setItem('vr_modas_db', JSON.stringify(banco));
                resetarModoEdicao();
                if (typeof aoSalvarSucesso === 'function') aoSalvarSucesso();
            } catch (err) {
                alert("Armazenamento local cheio. Tente imagens menores.");
            }
        }
    }
}