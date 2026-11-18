// js/db.js - Cliente Seguro Sem Exposição de Credenciais
let instanciaSeguraSql = null;

async function getSql() {
    if (!instanciaSeguraSql) {
        instanciaSeguraSql = async function (strings, ...values) {
            let query = strings[0];
            for (let i = 0; i < values.length; i++) {
                query += `$${i + 1}${strings[i + 1]}`;
            }

            const resposta = await fetch('/api/db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, params: values })
            });

            if (!resposta.ok) {
                const errData = await resposta.json().catch(() => ({}));
                throw new Error(errData.error || `Erro HTTP ${resposta.status}`);
            }

            const dados = await resposta.json();
            return dados.rows || [];
        };

        window.sql = instanciaSeguraSql;
    }
    return instanciaSeguraSql;
}

window.getSql = getSql;

function limparArrayCoresDb(coresRaw) {
    if (!coresRaw) return ['Padrão'];
    let arr = coresRaw;
    if (typeof coresRaw === 'string') {
        try {
            arr = coresRaw.trim().startsWith('[') ? JSON.parse(coresRaw) : coresRaw.split(',');
        } catch (e) {
            arr = coresRaw.split(',');
        }
    }
    if (!Array.isArray(arr) || arr.length === 0) return ['Padrão'];

    return arr.map(c => {
        if (typeof c === 'object' && c !== null) {
            return String(c.nome || c.cor || 'Padrão').trim();
        }
        return String(c).trim();
    }).filter(Boolean);
}

async function sincronizarProdutosNeon() {
    try {
        const sql = await getSql();
        const dadosNeon = await sql`SELECT * FROM produtos ORDER BY id DESC;`;

        if (Array.isArray(dadosNeon) && dadosNeon.length > 0) {
            const produtosFormatados = dadosNeon.map(item => ({
                id: item.id,
                nome: item.nome,
                preco: parseFloat(item.preco),
                precoPromocional: item.preco_promocional ? parseFloat(item.preco_promocional) : null,
                descricao: item.descricao || '',
                categoria: item.categoria || 'geral',
                estoque: item.estoque !== null && item.estoque !== undefined ? parseInt(item.estoque) : 10,
                imagem: item.imagem || 'img/produto1.jpg',
                imagens: Array.isArray(item.imagens)
                    ? item.imagens
                    : (typeof item.imagens === 'string' ? JSON.parse(item.imagens) : [item.imagem || 'img/produto1.jpg']),
                tamanhos: Array.isArray(item.tamanhos)
                    ? item.tamanhos
                    : (typeof item.tamanhos === 'string' ? JSON.parse(item.tamanhos) : ['P', 'M', 'G']),
                cores: limparArrayCoresDb(item.cores)
            }));

            localStorage.setItem('vr_modas_db', JSON.stringify(produtosFormatados));

            if (typeof window.filtrarEOrdenarCatalogo === 'function') {
                window.filtrarEOrdenarCatalogo();
            }
        }
    } catch (erro) {
        console.warn('⚠️ Operando com cache local:', erro.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    sincronizarProdutosNeon();
});