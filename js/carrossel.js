/* =====================================================
   CARROSSEL DE BANNERS - VR MODAS
   Deslize Contínuo (Swipe) + 3s Automático + Setas Desktop
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('carrossel-home');
    const trilho = document.getElementById('trilho-banners') || container;
    const btnPrev = document.getElementById('btn-banner-prev');
    const btnNext = document.getElementById('btn-banner-next');
    const containerIndicadores = document.getElementById('carrossel-indicadores');

    if (!container) return;

    let slideAtual = 0;
    let timerAuto = null;
    const TEMPO_ROTATIVO = 3000; // Passa sozinho a cada 3 segundos!

    const banners = JSON.parse(localStorage.getItem('vr_modas_banners')) || [];

    // Se houver banners salvos no admin, desenha no trilho
    if (banners.length > 0) {
        trilho.innerHTML = '';
        banners.forEach(banner => {
            trilho.insertAdjacentHTML('beforeend', `
                <div class="slide" style="background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${banner.imagem}');">
                    <div class="slide-content">
                        <h1>${banner.titulo}</h1>
                        <p>${banner.subtitulo}</p>
                        <a href="${banner.btnLink || 'produtos.html'}" class="btn-dourado">${banner.btnTexto || 'Ver Coleção'}</a>
                    </div>
                </div>
            `);
        });
    }

    let slides = trilho.querySelectorAll('.slide');
    const totalSlides = slides.length;

    if (totalSlides <= 1) {
        if (btnPrev) btnPrev.style.display = 'none';
        if (btnNext) btnNext.style.display = 'none';
        return;
    }

    // Cria as bolinhas indicadoras
    if (containerIndicadores) {
        containerIndicadores.innerHTML = '';
        for (let i = 0; i < totalSlides; i++) {
            const p = document.createElement('div');
            p.className = `ponto-ind ${i === 0 ? 'ativo' : ''}`;
            p.onclick = () => {
                irPara(i);
                iniciarAuto();
            };
            containerIndicadores.appendChild(p);
        }
    }

    function atualizarIndicadores() {
        if (!containerIndicadores) return;
        const pontos = containerIndicadores.querySelectorAll('.ponto-ind');
        pontos.forEach((p, idx) => {
            p.classList.toggle('ativo', idx === slideAtual);
        });
    }

    // Move fisicamente a fita para o lado
    function irPara(indice) {
        slideAtual = (indice + totalSlides) % totalSlides;
        trilho.style.transform = `translateX(-${slideAtual * 100}%)`;
        atualizarIndicadores();
    }

    function proximo() {
        irPara(slideAtual + 1);
    }

    function anterior() {
        irPara(slideAtual - 1);
    }

    // Automático de 3 segundos
    function iniciarAuto() {
        pararAuto();
        timerAuto = setInterval(proximo, TEMPO_ROTATIVO);
    }

    function pararAuto() {
        if (timerAuto) {
            clearInterval(timerAuto);
            timerAuto = null;
        }
    }

    // Setas no Computador
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

    // Pausa no hover para o notebook
    container.addEventListener('mouseenter', pararAuto);
    container.addEventListener('mouseleave', iniciarAuto);

    // ==========================================
    // DESLIZE COM O DEDO NO CELULAR (SWIPE)
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
        pararAuto(); // Se o cliente encostou o dedo para olhar, pausa o timer
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
    }, { passive: true });

    container.addEventListener('touchend', () => {
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;
        const DISTANCIA_MINIMA = 35; // Sensibilidade do arrasto do dedo

        // Só aciona se o movimento foi horizontal (não atrapalha o scroll da página)
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > DISTANCIA_MINIMA) {
            if (diffX > 0) {
                // Passou o dedo para a esquerda -> próximo banner
                proximo();
            } else {
                // Passou o dedo para a direita -> banner anterior
                anterior();
            }
        }

        // Volta a rodar sozinho a cada 3 segundos a partir do banner que o cliente parou
        iniciarAuto();
    }, { passive: true });

    container.addEventListener('touchcancel', iniciarAuto, { passive: true });

    // Inicia na abertura da página
    iniciarAuto();
});