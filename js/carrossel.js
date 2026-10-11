/* =====================================================
   CARROSSEL DE BANNERS RESPONSIVO - VR MODAS
   Automático + Setas (Desktop) + Deslize por Toque (Mobile)
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('carrossel-home');
    const trilho = document.getElementById('trilho-banners') || container;
    const btnPrev = document.getElementById('btn-banner-prev');
    const btnNext = document.getElementById('btn-banner-next');

    if (!container) return;

    const banners = JSON.parse(localStorage.getItem('vr_modas_banners')) || [];

    // Renderiza se houver banners guardados no painel
    if (banners.length > 0) {
        trilho.innerHTML = '';
        banners.forEach((banner, index) => {
            const ativoClass = index === 0 ? 'ativo' : '';
            trilho.insertAdjacentHTML('beforeend', `
                <div class="slide ${ativoClass}" style="background-image: linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('${banner.imagem}');">
                    <div class="slide-content">
                        <h1>${banner.titulo}</h1>
                        <p>${banner.subtitulo}</p>
                        <a href="${banner.btnLink || 'produtos.html'}" class="btn-dourado">${banner.btnTexto || 'Ver Coleção'}</a>
                    </div>
                </div>
            `);
        });
    }

    const slides = trilho.querySelectorAll('.slide');
    if (slides.length <= 1) {
        if (btnPrev) btnPrev.style.display = 'none';
        if (btnNext) btnNext.style.display = 'none';
        return;
    }

    let slideAtual = 0;
    let timer = null;
    const TEMPO_ROTATIVO = 5000;

    function mostrarSlide(novoIndice) {
        slides[slideAtual].classList.remove('ativo');
        slideAtual = (novoIndice + slides.length) % slides.length;
        slides[slideAtual].classList.add('ativo');
    }

    function proximo() {
        mostrarSlide(slideAtual + 1);
    }

    function anterior() {
        mostrarSlide(slideAtual - 1);
    }

    function iniciarAuto() {
        pararAuto();
        timer = setInterval(proximo, TEMPO_ROTATIVO);
    }

    function pararAuto() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }

    // Navegação por Setas no Computador
    if (btnNext) {
        btnNext.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            proximo();
            iniciarAuto();
        };
    }

    if (btnPrev) {
        btnPrev.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            anterior();
            iniciarAuto();
        };
    }

    // Pausa no hover para computador
    container.addEventListener('mouseenter', pararAuto);
    container.addEventListener('mouseleave', iniciarAuto);

    // ==========================================
    // SISTEMA DE TOQUE / SWIPE (TELEMÓVEL)
    // ==========================================
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    container.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        touchEndX = touchStartX;
        touchEndY = touchStartY;
        pararAuto();
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
    }, { passive: true });

    function verificarGesto() {
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;
        const LIMIAR_MINIMO = 35; // Distância mínima do dedo em píxeis

        // Confirma que o movimento foi horizontal e não vertical
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > LIMIAR_MINIMO) {
            if (diffX > 0) {
                // Deslizou para a esquerda -> Avança para o próximo
                proximo();
            } else {
                // Deslizou para a direita -> Volta para o anterior
                anterior();
            }
        }
        iniciarAuto();
    }

    container.addEventListener('touchend', verificarGesto, { passive: true });
    container.addEventListener('touchcancel', iniciarAuto, { passive: true });

    // Inicia a rotação automática
    iniciarAuto();
});