// api/db.js - Endpoint Serverless Universal Neon
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
        const { query, params } = req.body || {};
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Consulta SQL inválida.' });
        }

        const sql = neon(databaseUrl);
        const valores = Array.isArray(params) ? params : [];

        let resultado;
        if (typeof sql.query === 'function') {
            resultado = await sql.query(query, valores);
        } else {
            resultado = await sql(query, valores);
        }

        // Garante que sempre retorna um array em 'rows' (seja resultado direto ou resultado.rows)
        const linhas = Array.isArray(resultado) ? resultado : (resultado?.rows || []);

        return res.status(200).json({ rows: linhas });
    } catch (erro) {
        console.error('Erro na execução SQL segura:', erro);
        return res.status(500).json({ 
            error: 'Erro interno ao processar operação no banco.',
            detalhe: erro.message || String(erro)
        });
    }
}