/* =====================================================
   CARROSSEL DE BANNERS - VR MODAS
   Deslize Contínuo (Swipe) + 3s Automático + Setas + Neon DB
   ===================================================== */

const NEON_CARROSSEL_CONN = 'postgresql://neondb_owner:npg_KUabnTq58ujk@ep-ancient-fog-b61fg1o3-pooler.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function sincronizarBannersNeon() {
    try {
        const { neon } = await import('https://esm.sh/@neondatabase/serverless');
        const sql = neon(NEON_CARROSSEL_CONN);
        const dadosBanners = await sql`SELECT * FROM banners WHERE ativo = true ORDER BY ordem ASC, id ASC;`;

        if (Array.isArray(dadosBanners) && dadosBanners.length > 0) {
            const formatados = dadosBanners.map(b => ({
                id: b.id,
                titulo: b.titulo || '',
                subtitulo: b.subtitulo || '',
                imagem: b.imagem,
                btnLink: b.btn_link || 'produtos.html',
                btnTexto: b.btn_texto || 'Ver Coleção'
            }));
            localStorage.setItem('vr_modas_banners', JSON.stringify(formatados));
            if (typeof window.inicializarCarrosselUI === 'function') {
                window.inicializarCarrosselUI();
            }
        }
    } catch (erro) {
        console.warn('⚠️ Usando banners locais temporários:', erro.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('carrossel-home');
    const trilho = document.getElementById('trilho-banners') || container;
    const btnPrev = document.getElementById('btn-banner-prev');
    const btnNext = document.getElementById('btn-banner-next');
    const containerIndicadores = document.getElementById('carrossel-indicadores');

    if (!container) return;

    let slideAtual = 0;
    let timerAuto = null;
    const TEMPO_ROTATIVO = 3000;

    window.inicializarCarrosselUI = function() {
        const banners = JSON.parse(localStorage.getItem('vr_modas_banners')) || [];

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

        const slides = trilho.querySelectorAll('.slide');
        const totalSlides = slides.length;

        if (totalSlides <= 1) {
            if (btnPrev) btnPrev.style.display = 'none';
            if (btnNext) btnNext.style.display = 'none';
            if (containerIndicadores) containerIndicadores.innerHTML = '';
            return;
        } else {
            if (btnPrev) btnPrev.style.display = '';
            if (btnNext) btnNext.style.display = '';
        }

        // Bolinhas indicadoras
        if (containerIndicadores) {
            containerIndicadores.innerHTML = '';
            for (let i = 0; i < totalSlides; i++) {
                const p = document.createElement('div');
                p.className = `ponto-ind ${i === slideAtual ? 'ativo' : ''}`;
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

        // Ações das setas
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

        container.onmouseenter = pararAuto;
        container.onmouseleave = iniciarAuto;

        // Arrasto / Touch no Celular
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        container.ontouchstart = (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
            touchEndX = touchStartX;
            touchEndY = touchStartY;
            pararAuto();
        };

        container.ontouchmove = (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
        };

        container.ontouchend = () => {
            const diffX = touchStartX - touchEndX;
            const diffY = touchStartY - touchEndY;
            const DISTANCIA_MINIMA = 35;

            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > DISTANCIA_MINIMA) {
                if (diffX > 0) proximo();
                else anterior();
            }
            iniciarAuto();
        };

        container.ontouchcancel = iniciarAuto;

        irPara(0);
        iniciarAuto();
    };

    // Renderiza o cache local primeiro
    window.inicializarCarrosselUI();

    // Sincroniza do Neon em seguida
    sincronizarBannersNeon();
});