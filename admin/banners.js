// ==========================================
// MÓDULO: GESTOR DE BANNERS DA VITRINE
// ==========================================
import { comprimirImagem } from './produtos.js';

export function iniciarModuloBanners() {
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
                if (typeof mostrarToast === 'function') mostrarToast("Banner removido!");
                atualizarListaBanners();
            };
        });
    }

    atualizarListaBanners();

    if (formBanner) {
        formBanner.onsubmit = function(event) {
            event.preventDefault();
            const titulo = document.getElementById('titulo-banner').value;
            const subtitulo = document.getElementById('subtitulo-banner').value;
            const btnTexto = document.getElementById('btn-texto-banner').value;
            const btnLink = document.getElementById('btn-link-banner').value;

            if (inputFotoBanner.files && inputFotoBanner.files[0]) {
                comprimirImagem(inputFotoBanner.files[0], function(imagemComprimida) {
                    const novoBanner = {
                        id: Date.now(),
                        titulo, subtitulo, btnTexto, btnLink,
                        imagem: imagemComprimida
                    };

                    let banners = JSON.parse(localStorage.getItem('vr_modas_banners')) || [];
                    banners.push(novoBanner);
                    localStorage.setItem('vr_modas_banners', JSON.stringify(banners));

                    if (typeof mostrarToast === 'function') mostrarToast("Novo banner publicado!");
                    formBanner.reset();
                    if (previewBanner) previewBanner.innerHTML = '';
                    atualizarListaBanners();
                });
            }
        };
    }
}