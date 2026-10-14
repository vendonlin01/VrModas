// ==========================================================================
// VR MODAS - GESTÃO DE BANNERS DA VITRINE (NEON DB)
// js/admin/banners.js
// ==========================================================================

let bannerImagemBase64 = null;

/**
 * 1. Converte e comprime a foto do banner para Base64
 */
function configurarUploadBanner() {
    const inputBanner = document.getElementById('foto-banner') || document.getElementById('banner-imagem-arquivo');
    const previewContainer = document.getElementById('preview-banner');
    if (!inputBanner) return;

    inputBanner.addEventListener('change', (e) => {
        const ficheiro = e.target.files[0];
        if (!ficheiro || !ficheiro.type.startsWith('image/')) return;

        const leitor = new FileReader();
        leitor.onload = (evento) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Redimensiona para no máximo 1200px para upload rápido e leve no Neon
                const larguraMax = 1200;
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

                bannerImagemBase64 = canvas.toDataURL('image/jpeg', 0.8);

                if (previewContainer) {
                    previewContainer.innerHTML = `
                        <div style="margin-top: 10px; position: relative; border-radius: 6px; overflow: hidden; border: 1px solid #444; max-width: 320px;">
                            <img src="${bannerImagemBase64}" style="width: 100%; height: auto; display: block; object-fit: cover;">
                            <button type="button" onclick="limparPreviewBanner()" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.8); color: #ff4444; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-weight: bold;">&times;</button>
                        </div>
                    `;
                }
            };
            img.src = evento.target.result;
        };
        leitor.readAsDataURL(ficheiro);
    });
}

function limparPreviewBanner() {
    bannerImagemBase64 = null;
    const inputBanner = document.getElementById('foto-banner') || document.getElementById('banner-imagem-arquivo');
    const previewContainer = document.getElementById('preview-banner');
    if (inputBanner) inputBanner.value = '';
    if (previewContainer) previewContainer.innerHTML = '';
}
window.limparPreviewBanner = limparPreviewBanner;

/**
 * 2. Carrega a lista de banners cadastrados no Neon
 */
async function carregarEAtualizarListaBanners() {
    const containerLista = document.getElementById('lista-banners-admin');
    if (!containerLista) return;

    containerLista.innerHTML = '<p style="color: var(--cinza-texto, #888); text-align: center; padding: 20px;">Carregando banners...</p>';

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (!sql) throw new Error("Conexão SQL não inicializada");

        const banners = await sql`SELECT * FROM banners ORDER BY id DESC;`;

        if (!banners || banners.length === 0) {
            containerLista.innerHTML = '<p style="color: var(--cinza-texto, #888); text-align: center; padding: 20px;">Nenhum banner ativo no momento.</p>';
            return;
        }

        containerLista.innerHTML = banners.map(b => {
            const img = b.imagem || b.foto || b.url || 'img/placeholder.png';
            const titulo = b.titulo || 'Sem título';
            const subtitulo = b.subtitulo || b.descricao || '';
            const link = b.btn_link || b.link || '#vitrine';
            const btnTexto = b.btn_texto || b.texto_botao || 'Ver Coleção';

            return `
                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid #2e2e2e; border-radius: 8px; padding: 12px; margin-bottom: 12px; gap: 14px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <img src="${img}" style="width: 100px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #444;">
                        <div>
                            <strong style="color: #fff; font-size: 14px;">${titulo}</strong>
                            <div style="color: #aaa; font-size: 12px;">${subtitulo}</div>
                            <small style="color: var(--dourado, #d4af37); font-size: 11px;">Botão: ${btnTexto} ➔ ${link}</small>
                        </div>
                    </div>
                    <div>
                        <button type="button" onclick="excluirBannerAdmin(${b.id})" title="Excluir Banner" style="background: transparent; border: 1px solid #ff4444; color: #ff4444; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            🗑️ Excluir
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error('Erro ao listar banners:', e);
        containerLista.innerHTML = `<p style="color: #ff6b6b; text-align: center; padding: 15px;">Falha ao carregar banners: ${e.message}</p>`;
    }
}
window.carregarEAtualizarListaBanners = carregarEAtualizarListaBanners;

/**
 * 3. Publicar novo Banner no Neon
 */
async function salvarNovoBanner(e) {
    e.preventDefault();

    const titulo = document.getElementById('titulo-banner')?.value.trim() || '';
    const subtitulo = document.getElementById('subtitulo-banner')?.value.trim() || '';
    const btnTexto = document.getElementById('btn-texto-banner')?.value.trim() || 'Ver Coleção';
    const btnLink = document.getElementById('btn-link-banner')?.value.trim() || '#vitrine';

    if (!bannerImagemBase64) {
        alert('Por favor, selecione uma foto para o banner.');
        return;
    }

    const btnSubmit = document.querySelector('#form-cadastro-banner button[type="submit"]');
    const textoOriginal = btnSubmit ? btnSubmit.innerText : '';
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerText = 'Publicando Banner...';
    }

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        if (!sql) throw new Error("Instância do Neon SQL não está carregada.");

        // Inserção compatível com a estrutura de banners
        await sql`
            INSERT INTO banners (
                titulo, subtitulo, imagem, btn_texto, btn_link, ativo
            ) VALUES (
                ${titulo}, ${subtitulo}, ${bannerImagemBase64}, ${btnTexto}, ${btnLink}, true
            );
        `;

        alert('🎨 Banner publicado com sucesso na Home!');
        document.getElementById('form-cadastro-banner')?.reset();
        limparPreviewBanner();

        await carregarEAtualizarListaBanners();

    } catch (err) {
        console.error('Erro ao cadastrar banner:', err);
        // Tenta inserção fallback caso a tabela não tenha a coluna ativo ou btn_texto
        try {
            const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
            await sql`
                INSERT INTO banners (titulo, subtitulo, imagem, link)
                VALUES (${titulo}, ${subtitulo}, ${bannerImagemBase64}, ${btnLink});
            `;
            alert('🎨 Banner publicado com sucesso!');
            document.getElementById('form-cadastro-banner')?.reset();
            limparPreviewBanner();
            await carregarEAtualizarListaBanners();
        } catch (err2) {
            alert('Falha ao salvar o banner no Neon DB: ' + (err.message || err2.message));
        }
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerText = textoOriginal || 'Publicar Banner na Home';
        }
    }
}

/**
 * 4. Excluir Banner
 */
async function excluirBannerAdmin(idBanner) {
    if (!confirm('Deseja realmente remover este banner da página inicial?')) return;

    try {
        const sql = (typeof getSql === 'function') ? await getSql() : window.sql;
        await sql`DELETE FROM banners WHERE id = ${idBanner};`;
        await carregarEAtualizarListaBanners();
    } catch (e) {
        console.error('Erro ao excluir banner:', e);
        alert('Erro ao excluir banner: ' + e.message);
    }
}
window.excluirBannerAdmin = excluirBannerAdmin;

// Inicializa eventos ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    configurarUploadBanner();
    carregarEAtualizarListaBanners();

    const formBanner = document.getElementById('form-cadastro-banner');
    if (formBanner) {
        formBanner.addEventListener('submit', salvarNovoBanner);
    }
});