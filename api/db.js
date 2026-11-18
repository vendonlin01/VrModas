// api/db.js - Endpoint Serverless Protegido com Firewall SQL & Verificação JWT
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

function verificarTokenJwt(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    const partes = token.split('.');
    if (partes.length !== 3) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const [header, corpo, assinatura] = partes;
    const assinaturaEsperada = crypto.createHmac('sha256', secret).update(`${header}.${corpo}`).digest('base64url');
    if (assinatura !== assinaturaEsperada) return null;

    try {
        const payload = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8'));
        const agora = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < agora) return null;
        return payload;
    } catch {
        return null;
    }
}

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

        const sqlNorm = query.trim().replace(/\s+/g, ' ');
        const sqlUpper = sqlNorm.toUpperCase();

        // 1. Bloqueia comandos destrutivos de estrutura e injeção de múltiplas instruções
        if (/\b(DROP|TRUNCATE|GRANT|REVOKE|COPY|EXECUTE)\b/.test(sqlUpper)) {
            return res.status(403).json({ error: 'Operação SQL proibida.' });
        }
        const semPontoVirgulaFinal = sqlNorm.replace(/;\s*$/, '');
        if (semPontoVirgulaFinal.includes(';')) {
            return res.status(403).json({ error: 'Múltiplas instruções SQL não são permitidas.' });
        }

        const usuarioToken = verificarTokenJwt(req.headers.authorization);
        const ehGestor = usuarioToken && (usuarioToken.role === 'admin' || usuarioToken.role === 'owner');
        const ehOwner = usuarioToken && usuarioToken.role === 'owner';

        // 2. Protege a tabela de usuários (proíbe leitura pública e exige owner para alterar cargos)
        if (/\bUSUARIOS\b/.test(sqlUpper)) {
            if (/^(UPDATE|DELETE|INSERT)/.test(sqlUpper) && !ehOwner) {
                return res.status(403).json({ error: 'Apenas o proprietário pode gerenciar usuários e permissões.' });
            }
            if (/^SELECT/.test(sqlUpper) && !ehGestor) {
                return res.status(403).json({ error: 'Acesso não autorizado aos dados de usuários.' });
            }
        }

        // 3. Protege escrita em tabelas administrativas (produtos, banners, cupons, configuracoes)
        const envolveTabelaAdmin = /\b(PRODUTOS|BANNERS|CUPONS|CONFIGURACOES)\b/.test(sqlUpper);
        const ehEscrita = /^(INSERT|UPDATE|DELETE|CREATE|ALTER)/.test(sqlUpper);
        if (envolveTabelaAdmin && ehEscrita && !ehGestor) {
            return res.status(403).json({ error: 'Sessão administrativa expirada ou inválida. Faça login novamente.' });
        }

        // 4. Protege alteração ou exclusão de pedidos (apenas gestores podem alterar status ou excluir)
        if (/\bPEDIDOS\b/.test(sqlUpper) && /^(UPDATE|DELETE)/.test(sqlUpper) && !ehGestor) {
            return res.status(403).json({ error: 'Apenas administradores podem alterar ou remover pedidos.' });
        }

        const sql = neon(databaseUrl);
        const valores = Array.isArray(params) ? params : [];
        const resultado = typeof sql.query === 'function'
            ? await sql.query(query, valores)
            : await sql(query, valores);

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