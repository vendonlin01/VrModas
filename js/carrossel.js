/* =====================================================
   CARROSSEL DE BANNERS - VR MODAS
   Fade Suave + Setas (Desktop) + Swipe (Mobile) + Auto
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('carrossel-home');
    const trilho = document.getElementById('trilho-banners') || container;
    const btnPrev = document.getElementById('btn-banner-prev');
    const btnNext = document.getElementById('btn-banner-next');

    if (!container) return;

    const banners = JSON.parse(localStorage.getItem('vr_modas_banners')) || [];

    // Se houver banners salvos no admin, renderiza dinamicamente
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

    // Setas Desktop
    if (btnNext) {
        btnNext.onclick = (e) => {
            e.stopPropagation();
            proximo();
            iniciarAuto();
        };
    }

    if (btnPrev) {
        btnPrev.onclick = (e) => {
            e.stopPropagation();
            anterior();
            iniciarAuto();
        };
    }

    // Pausa no Hover (Desktop)
    container.addEventListener('mouseenter', pararAuto);
    container.addEventListener('mouseleave', iniciarAuto);

    // Gesto de Dedo / Swipe (Mobile)
    let touchStartX = 0;
    let touchEndX = 0;

    container.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchEndX = touchStartX;
        pararAuto();
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        touchEndX = e.touches[0].clientX;
    }, { passive: true });

    container.addEventListener('touchend', () => {
        const diff = touchStartX - touchEndX;
        if (diff > 45) {
            proximo();
        } else if (diff < -45) {
            anterior();
        }
        iniciarAuto();
    });

    iniciarAuto();
});