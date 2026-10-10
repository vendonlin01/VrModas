document.addEventListener('DOMContentLoaded', () => {
    const carrosselContainer = document.getElementById('carrossel-home');
    const banners = JSON.parse(localStorage.getItem('vr_modas_banners')) || [];
    
    if (carrosselContainer && banners.length > 0) {
        carrosselContainer.innerHTML = '';
        banners.forEach((banner, index) => {
            const ativoClass = index === 0 ? 'ativo' : '';
            carrosselContainer.insertAdjacentHTML('beforeend', `
                <div class="slide ${ativoClass}" style="background-image: linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('${banner.imagem}');">
                    <div class="slide-content">
                        <h1>${banner.titulo}</h1>
                        <p>${banner.subtitulo}</p>
                        <a href="${banner.btnLink}" class="btn-dourado">${banner.btnTexto}</a>
                    </div>
                </div>
            `);
        });

        const slides = document.querySelectorAll('.slide');
        if (slides.length > 1) {
            let slideAtual = 0;
            setInterval(() => {
                slides[slideAtual].classList.remove('ativo');
                slideAtual = (slideAtual + 1) % slides.length;
                slides[slideAtual].classList.add('ativo');
            }, 5000);
        }
    }
});