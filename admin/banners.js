// ==========================================
// MÓDULO: GESTOR DE BANNERS DA VITRINE (INTEGRADO AO NEON)
// ==========================================

// Função própria de compressão para garantir que fotos do celular não ultrapassem o limite da Vercel
function comprimirFotoBanner(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            // Banners para web ficam perfeitos com 1280px de largura
            const MAX_WIDTH = 1280;
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Exporta como JPEG com qualidade 0.75 (leve e nítido)
            const base64Leve = canvas.toDataURL('image/jpeg', 0.75);
            callback(base64Leve);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

export function iniciarModuloBanners() {
    const formBanner = document.getElementById('form-cadastro-banner');
    const inputFotoBanner = document.getElementById('foto-banner');
    const previewBanner = document.getElementById('preview-banner');
    const listaBannersAdmin = document.getElementById('lista-banners-admin');

    if (inputFotoBanner && previewBanner) {
        inputFotoBanner.onchange = function() {
            previewBanner.innerHTML = '';
            if (this.files && this.files[0]) {
                comprimirFotoBanner(this.files[0], (bannerComprimido) => {
                    previewBanner.innerHTML = `<img src="${bannerComprimido}" style="width: 100%; max-height: 160px; object-fit: cover; border-radius: 6px; border: 2px solid #d4af37; margin-top: 10px;">`;
                });
            }
        };
    }

    // Carrega a lista buscando direto do Neon
    async function atualizarListaBanners() {
        if (!listaBannersAdmin) return;
        listaBannersAdmin.innerHTML = '<p style="color: var(--cinza-texto);">Carregando banners...</p>';

        try {
            const resposta = await fetch('/api/banners');
            const banners = await resposta.json();

            if (!Array.isArray(banners) || banners.length === 0) {
                listaBannersAdmin.innerHTML = '<p style="color: var(--cinza-texto);">Nenhum banner ativo no momento.</p>';
                return;
            }

            listaBannersAdmin.innerHTML = '';
            banners.forEach(b => {
                listaBannersAdmin.insertAdjacentHTML('beforeend', `
                    <div style="display: flex; align-items: center; justify-content: space-between; background: var(--preto); padding: 12px 16px; border-radius: 6px; border: 1px solid #333; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <img src="${b.imagem_desktop || b.imagem_mobile}" style="width: 80px; height: 45px; object-fit: cover; border-radius: 4px;">
                            <div>
                                <strong style="color: var(--branco); font-size: 14px;">${b.titulo || 'Sem título'}</strong>
                                <p style="color: var(--cinza-texto); font-size: 12px; margin: 0;">${b.subtitulo || ''}</p>
                            </div>
                        </div>
                        <button class="btn-remover-banner" data-id="${b.id}" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Excluir</button>
                    </div>
                `);
            });

            // Configurar botões de exclusão
            document.querySelectorAll('.btn-remover-banner').forEach(btn => {
                btn.onclick = async function() {
                    const idExcluir = this.getAttribute('data-id');
                    if (!confirm('Deseja realmente remover este banner?')) return;

                    try {
                        const delRes = await fetch(`/api/banners?id=${idExcluir}`, { method: 'DELETE' });
                        if (delRes.ok) {
                            if (typeof mostrarToast === 'function') mostrarToast("Banner removido do banco!");
                            atualizarListaBanners();
                        } else {
                            alert("Erro ao excluir banner.");
                        }
                    } catch (e) {
                        alert("Falha de conexão ao excluir.");
                    }
                };
            });
        } catch (err) {
            console.error('Erro ao carregar banners:', err);
            listaBannersAdmin.innerHTML = '<p style="color: #ff4444;">Erro ao carregar banners do banco.</p>';
        }
    }

    atualizarListaBanners();

    // Salva o banner enviando para a API do Neon
    if (formBanner) {
        formBanner.onsubmit = function(event) {
            event.preventDefault();
            const titulo = document.getElementById('titulo-banner')?.value || '';
            const subtitulo = document.getElementById('subtitulo-banner')?.value || '';
            const btnLink = document.getElementById('btn-link-banner')?.value || '';
            const btnSubmit = formBanner.querySelector('button[type="submit"]');

            if (!inputFotoBanner.files || !inputFotoBanner.files[0]) {
                alert("Selecione uma imagem para o banner.");
                return;
            }

            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerText = "Publicando no banco...";
            }

            comprimirFotoBanner(inputFotoBanner.files[0], async function(imagemComprimida) {
                const payload = {
                    titulo,
                    subtitulo,
                    link: btnLink,
                    imagem_desktop: imagemComprimida,
                    imagem_mobile: imagemComprimida,
                    ordem: 1,
                    ativo: true
                };

                try {
                    const resposta = await fetch('/api/banners', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const resultado = await resposta.json();

                    if (resposta.ok) {
                        alert("Banner salvo com sucesso no banco!");
                        formBanner.reset();
                        if (previewBanner) previewBanner.innerHTML = '';
                        atualizarListaBanners();
                    } else {
                        alert("Erro ao salvar banner: " + (resultado.erro || "Falha desconhecida"));
                    }
                } catch (err) {
                    alert("Falha de conexão com a API.");
                } finally {
                    if (btnSubmit) {
                        btnSubmit.disabled = false;
                        btnSubmit.innerText = "PUBLICAR BANNER NA HOME";
                    }
                }
            });
        };
    }
}