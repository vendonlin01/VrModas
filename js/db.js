// js/db.js - Conexão e sincronização Neon (PostgreSQL)
const NEON_CONNECTION_STRING = 'postgresql://neondb_owner:npg_KUabnTq58ujk@ep-ancient-fog-b61fg1o3-pooler.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function sincronizarProdutosNeon() {
    try {
        const { neon } = await import('https://esm.sh/@neondatabase/serverless');
        const sql = neon(NEON_CONNECTION_STRING);

        // Consulta direta na tabela de produtos
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
                cores: Array.isArray(item.cores) 
                    ? item.cores 
                    : (typeof item.cores === 'string' ? JSON.parse(item.cores) : ['Padrão'])
            }));

            // Atualiza o cache local
            localStorage.setItem('vr_modas_db', JSON.stringify(produtosFormatados));

            // Atualiza a vitrine e catálogo na tela na hora
            if (typeof window.filtrarEOrdenarCatalogo === 'function') {
                window.filtrarEOrdenarCatalogo();
            }

            console.log('✅ Base de dados Neon sincronizada com sucesso!', produtosFormatados);
        }
    } catch (erro) {
        console.warn('⚠️ A usar base de dados local temporária:', erro.message);
    }
}

// Dispara a sincronização automaticamente ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    sincronizarProdutosNeon();
});