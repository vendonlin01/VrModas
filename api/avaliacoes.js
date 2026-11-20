// api/avaliacoes.js - Endpoint Dedicado para Avaliações (Leitura e Publicação Segura)
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    if (!process.env.DATABASE_URL) {
        return res.status(500).json({ erro: 'Banco de dados não configurado no servidor.' });
    }

    const sql = neon(process.env.DATABASE_URL);

    try {
        // Garante que a tabela e todas as colunas existam no Neon
        await sql`
            CREATE TABLE IF NOT EXISTS avaliacoes (
                id SERIAL PRIMARY KEY,
                produto_id TEXT,
                produto_nome TEXT,
                autor TEXT,
                texto TEXT,
                nota INTEGER DEFAULT 5,
                criado_em TIMESTAMP DEFAULT NOW()
            );
        `;
        await sql`ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS produto_id TEXT;`;
        await sql`ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS produto_nome TEXT;`;
        await sql`ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS autor TEXT;`;
        await sql`ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS texto TEXT;`;
        await sql`ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS nota INTEGER DEFAULT 5;`;

        // ==========================================
        // 1. LISTAR AVALIAÇÕES (GET)
        // ==========================================
        if (req.method === 'GET') {
            const rows = await sql`
                SELECT id, produto_id, produto_nome, autor,
                       COALESCE(NULLIF(texto, ''), '') AS texto,
                       COALESCE(nota, 5) AS nota,
                       criado_em
                FROM avaliacoes
                ORDER BY id DESC;
            `;
            return res.status(200).json({ sucesso: true, avaliacoes: rows });
        }

        // ==========================================
        // 2. PUBLICAR NOVA AVALIAÇÃO (POST)
        // ==========================================
        if (req.method === 'POST') {
            const { produto_id, produto_nome, autor, texto, nota } = req.body || {};

            const prodIdLimpo = String(produto_id || '').trim().slice(0, 80);
            const prodNomeLimpo = String(produto_nome || '').trim().slice(0, 180);
            const autorLimpo = String(autor || '').trim().slice(0, 100);
            const textoLimpo = String(texto || '').trim().slice(0, 1000);
            const notaNum = Math.min(5, Math.max(1, parseInt(nota, 10) || 5));

            if (!autorLimpo || !textoLimpo) {
                return res.status(400).json({ erro: 'Informe seu nome e o comentário da avaliação.' });
            }
            if (!prodIdLimpo && !prodNomeLimpo) {
                return res.status(400).json({ erro: 'Produto não identificado para avaliação.' });
            }

            const [inserida] = await sql`
                INSERT INTO avaliacoes (produto_id, produto_nome, autor, texto, nota)
                VALUES (${prodIdLimpo}, ${prodNomeLimpo}, ${autorLimpo}, ${textoLimpo}, ${notaNum})
                RETURNING id, produto_id, produto_nome, autor, texto, nota;
            `;

            return res.status(201).json({ sucesso: true, avaliacao: inserida });
        }

        return res.status(405).json({ erro: 'Método não permitido.' });
    } catch (erro) {
        console.error('Erro na API de avaliações:', erro);
        return res.status(500).json({ erro: 'Erro interno ao processar avaliação: ' + (erro.message || '') });
    }
}