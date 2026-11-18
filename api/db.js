// api/db.js - Endpoint Serverless Seguro (Compatível com @neondatabase/serverless v1+)
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        return res.status(500).json({ error: 'Variável DATABASE_URL não configurada na Vercel.' });
    }

    try {
        const { query, params } = req.body;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Consulta SQL inválida.' });
        }

        const sql = neon(databaseUrl);
        // Na v1.0+ do @neondatabase/serverless, queries parametrizadas com ($1, $2) usam sql.query()
        const resultado = await sql.query(query, params || []);

        return res.status(200).json({ rows: resultado });
    } catch (erro) {
        console.error('Erro na execução SQL segura:', erro);
        return res.status(500).json({ 
            error: 'Erro interno ao processar operação no banco.',
            detalhe: erro.message 
        });
    }
}