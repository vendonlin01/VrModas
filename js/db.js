// js/db.js - Cliente Seguro Sem Exposição de Credenciais e com Token JWT
let instanciaSeguraSql = null;

function obterTokenSessao() {
    try {
        const tokenDireto = sessionStorage.getItem('vr_auth_token') ||
            localStorage.getItem('vr_auth_token') ||
            sessionStorage.getItem('vr_token') ||
            localStorage.getItem('vr_token') || '';
        if (tokenDireto) return String(tokenDireto).trim();

        const usuarioRaw = sessionStorage.getItem('vr_usuario_ativo') ||
            localStorage.getItem('vr_usuario_ativo') ||
            localStorage.getItem('usuarioLogado') || '';
        if (usuarioRaw) {
            const parsed = JSON.parse(usuarioRaw);
            if (parsed && (parsed.token || parsed.jwt)) {
                return String(parsed.token || parsed.jwt).trim();
            }
        }
    } catch (e) {
        console.warn('Erro ao recuperar token da sessão:', e.message);
    }
    return '';
}

async function getSql() {
    if (!instanciaSeguraSql) {
        instanciaSeguraSql = async function (strings, ...values) {
            let query = strings[0];
            for (let i = 0; i < values.length; i++) {
                query += `$${i + 1}${strings[i + 1]}`;
            }

            const headers = { 'Content-Type': 'application/json' };
            const token = obterTokenSessao();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const resposta = await fetch('/api/db', {
                method: 'POST',
                headers,
                body: JSON.stringify({ query, params: values })
            });

            if (!resposta.ok) {
                const errData = await resposta.json().catch(() => ({}));
                const mensagemErro = errData.error || errData.message || `Erro HTTP ${resposta.status}`;
                const detalhe = errData.detalhe ? ` -> ${errData.detalhe}` : '';
                throw new Error(`${mensagemErro}${detalhe}`);
            }

            const dados = await resposta.json();
            return dados.rows || [];
        };

        window.sql = instanciaSeguraSql;
    }
    return instanciaSeguraSql;
}

window.getSql = getSql;

function parseListaSeguraDb(raw, fallback) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) return fallback;
        try {
            if (trimmed.startsWith('[')) {
                const parsed = JSON.parse(trimmed);
                return Array.isArray(parsed) ? parsed : fallback;
            }
            return trimmed.split(',').map(s => s.trim()).filter(Boolean);
        } catch (e) {
            return trimmed.split(',').map(s => s.trim()).filter(Boolean);
        }
    }
    return fallback;
}

function limparArrayCoresDb(coresRaw) {
    const arr = parseListaSeguraDb(coresRaw, ['Padrão']);
    if (arr.length === 0) return ['Padrão'];

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
            const produtosFormatados = dadosNeon.map(item => {
                const imagens = parseListaSeguraDb(item.imagens, [item.imagem || 'img/produto1.jpg']);
                const tamanhos = parseListaSeguraDb(item.tamanhos, ['P', 'M', 'G']);
                const estoqueNum = (item.estoque !== null && item.estoque !== undefined && !Number.isNaN(parseInt(item.estoque, 10)))
                    ? parseInt(item.estoque, 10)
                    : 10;

                return {
                    id: item.id,
                    nome: item.nome,
                    preco: parseFloat(item.preco),
                    precoPromocional: item.preco_promocional ? parseFloat(item.preco_promocional) : null,
                    descricao: item.descricao || '',
                    categoria: item.categoria || 'geral',
                    estoque: estoqueNum,
                    imagem: item.imagem || imagens[0] || 'img/produto1.jpg',
                    imagens,
                    tamanhos,
                    cores: limparArrayCoresDb(item.cores)
                };
            });

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