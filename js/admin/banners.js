// ==========================================================================
// VR MODAS - GESTÃO DE BANNERS DA VITRINE (NEON DB)
// js/admin/banners.js
// ==========================================================================

let bannerImagemBase64 = null;

/**
 * 1. Converte e pré-visualiza a imagem do banner
 */
function configurarUploadBanner() {
    const inputBanner = document.getElementById('banner-imagem-arquivo');
    const previewContainer = document.getElementById('preview-banner-container');
    const previewImg = document.getElementById('preview-banner-img');
    if (!inputBanner) return;

    inputBanner.addEventListener('change', (e) => {
        const ficheiro = e.target.files[0];
        if (!ficheiro || !ficheiro.type.startsWith('image/')) return;

        const leitor = new FileReader();
        leitor.onload = (evento) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const larguraMax = 1600; // Resolução ideal para banners desktop e mobile
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

                bannerImagemBase64 = canvas.toDataURL('image/jpeg', 0.85);

                if (previewImg && previewContainer) {
                    previewImg.src = bannerImagemBase64;
                    previewContainer.style.display = 'block';
                }
            };
            img.src = evento.target.result;
        };
        leitor.readAsDataURL(ficheiro);
    });
}

/**
 * 2. Carrega e exibe a lista de banners cadastrados no Neon
 */
async function carregarEAtualizarListaBanners() {
    const containerLista = document.getElementById('lista-banners-admin');
    if (!containerLista) return;

    containerLista.innerHTML = '<p style="color: var(--cinza-texto, #888); text-align: center; padding: 20px;">A carregar banners...</p>';

    try {
        const sql = await getSql();
        const banners = await sql`
            SELECT id, titulo, subtitulo, imagem, btn_texto, btn_link, ativo 
            FROM banners 
            ORDER BY id DESC;
        `;

        if (!banners || banners.length === 0) {
            containerLista.innerHTML = '<p style="color: var(--cinza-texto, #888); text-align: center; padding: 25px;">Nenhum banner cadastrado no momento.</p>';
            return;
        }

        containerLista.innerHTML = banners.map(b => `
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid #333; border-radius: 8px; padding: 12px; margin-bottom: 12px; gap: 14px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <img src="${b.imagem}" style="width: 120px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #444;">
                    <div>
                        <strong style="color: #fff; font-size: 15px;">${b.titulo || 'Sem Título'}</strong>
                        <div style="color: #aaa; font-size: 12px;">${b.subtitulo || 'Sem subtítulo'}</div>
                        <small style="color: var(--dourado, #d4af37); font-size: 11px;">Botão: ${b.btn_texto || 'Ver'} ➔ ${b.btn_link || 'produtos.html'}</small>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button type="button" onclick="alternarStatusBanner(${b.id}, ${!b.ativo})" style="background: ${b.ativo ? 'rgba(76,209,55,0.15)' : 'rgba(255,68,68,0.15)'}; border: 1px solid ${b.ativo ? '#4cd137' : '#ff4444'}; color: ${b.ativo ? '#4cd137' : '#ff4444'}; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 700;">
                        ${b.ativo ? 'Ativo' : 'Oculto'}
                    </button>
                    <button type="button" onclick="excluirBannerAdmin(${b.id})" style="background: transparent; border: 1px solid #ff4444; color: #ff4444; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');

    } catch (e) {
        console.error('Erro ao listar banners:', e);
        containerLista.innerHTML = '<p style="color: #ff6b6b; text-align: center; padding: 20px;">Falha ao carregar banners do banco.</p>';
    }
}

/**
 * 3. Gravar novo Banner
 */
async function salvarNovoBanner(e) {
    e.preventDefault();

    const titulo = document.getElementById('banner-titulo')?.value.trim() || '';
    const subtitulo = document.getElementById('banner-subtitulo')?.value.trim() || '';
    const btnTexto = document.getElementById('banner-btn-texto')?.value.trim() || 'VER COLEÇÃO';
    const btnLink = document.getElementById('banner-btn-link')?.value.trim() || 'produtos.html';

    if (!bannerImagemBase64) {
        alert('Por favor, selecione uma imagem para o banner.');
        return;
    }

    const btnSubmit = document.getElementById('btn-salvar-banner');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerText = 'A enviar banner...';
    }

    try {
        const sql = await getSql();
        await sql`
            INSERT INTO banners (
                titulo, subtitulo, imagem, btn_texto, btn_link, ativo
            ) VALUES (
                ${titulo}, ${subtitulo}, ${bannerImagemBase64}, ${btnTexto}, ${btnLink}, true
            );
        `;

        alert('🎨 Banner adicionado com sucesso!');
        document.getElementById('form-cadastro-banner')?.reset();
        bannerImagemBase64 = null;
        const previewContainer = document.getElementById('preview-banner-container');
        if (previewContainer) previewContainer.style.display = 'none';

        carregarEAtualizarListaBanners();

    } catch (err) {
        console.error('Erro ao cadastrar banner:', err);
        alert('Falha ao registar banner na base de dados Neon.');
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerText = 'Salvar Banner';
        }
    }
}

/**
 * 4. Ativar / Desativar exibição do Banner
 */
async function alternarStatusBanner(idBanner, novoStatus) {
    try {
        const sql = await getSql();
        await sql`
            UPDATE banners 
            SET ativo = ${novoStatus} 
            WHERE id = ${idBanner};
        `;
        carregarEAtualizarListaBanners();
    } catch (e) {
        console.error('Erro ao atualizar status do banner:', e);
        alert('Falha ao alterar visibilidade do banner.');
    }
}

/**
 * 5. Excluir Banner
 */
async function excluirBannerAdmin(idBanner) {
    if (!confirm('Deseja realmente excluir este banner promocional?')) return;

    try {
        const sql = await getSql();
        await sql`DELETE FROM banners WHERE id = ${idBanner};`;
        carregarEAtualizarListaBanners();
    } catch (e) {
        console.error('Erro ao excluir banner:', e);
        alert('Erro ao excluir o banner.');
    }
}

// Inicialização de escutas
document.addEventListener('DOMContentLoaded', () => {
    configurarUploadBanner();

    const formBanner = document.getElementById('form-cadastro-banner');
    if (formBanner) {
        formBanner.addEventListener('submit', salvarNovoBanner);
    }
});