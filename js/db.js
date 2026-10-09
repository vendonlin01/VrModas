// ==========================================
// BANCO DE DADOS LOCAL COMPARTILHADO (VR MODAS)
// ==========================================

// 1. Inicializa o banco de produtos se estiver vazio
let bancoDeProdutos = JSON.parse(localStorage.getItem('vr_modas_db'));
if (!bancoDeProdutos || bancoDeProdutos.length === 0) {
    bancoDeProdutos = [
        { id: 1001, nome: "Vestido Premium", preco: 149.90, imagens: ["img/produto1.jpg"], categoria: "vestidos", tamanhos: ["P", "M", "G"], cores: "Preto, Dourado", descricao: "Peça exclusiva.", estoque: 10 },
        { id: 1002, nome: "Conjunto Dourado", preco: 199.90, imagens: ["img/produto2.jpg"], categoria: "vestidos", tamanhos: ["P", "M"], cores: "Dourado", descricao: "Conjunto sofisticado.", estoque: 5 },
        { id: 1003, nome: "Blazer Elegance", preco: 259.90, imagens: ["img/produto3.jpg"], categoria: "camisas", tamanhos: ["M", "G"], cores: "Preto", descricao: "Caimento impecável.", estoque: 12 },
        { id: 1004, nome: "Calça Alfaiataria", preco: 199.90, imagens: ["img/produto4.jpg"], categoria: "calcas", tamanhos: ["38", "40"], cores: "Branco", descricao: "Corte reto.", estoque: 8 }
    ];
    localStorage.setItem('vr_modas_db', JSON.stringify(bancoDeProdutos));
}

// 2. Inicializa o banco de banners se estiver vazio
let bancoDeBanners = JSON.parse(localStorage.getItem('vr_modas_banners'));
if (!bancoDeBanners || bancoDeBanners.length === 0) {
    bancoDeBanners = [
        {
            id: 2001,
            titulo: "Nova Coleção",
            subtitulo: "Elegância e estilo em cada detalhe.",
            btnTexto: "Ver Coleção",
            btnLink: "#vitrine",
            imagem: "img/produto1.jpg"
        },
        {
            id: 2002,
            titulo: "Acessórios Premium",
            subtitulo: "O toque de sofisticação que faltava.",
            btnTexto: "Comprar Agora",
            btnLink: "produtos.html",
            imagem: "img/produto2.jpg"
        }
    ];
    localStorage.setItem('vr_modas_banners', JSON.stringify(bancoDeBanners));
}

// 3. Função universal de Toasts (Notificações visuais)
function mostrarToast(mensagem) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✔</span> ${mensagem}`;
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('mostrar'), 10);
    setTimeout(() => {
        toast.classList.remove('mostrar');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}