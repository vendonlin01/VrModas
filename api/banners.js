import { neon } from '@neondatabase/serverless';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb' // Permite imagens em Base64
        }
    }
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const sql = neon(process.env.DATABASE_URL);

    try {
        // 1. LISTAR BANNERS (Usado pelo Admin e pela Home)
        if (req.method === 'GET') {
            const banners = await sql`
                SELECT * FROM banners ORDER BY ordem ASC, id DESC;
            `;
            return res.status(200).json(banners);
        }

        // 2. CADASTRAR NOVO BANNER NO NEON
        if (req.method === 'POST') {
            const { titulo, subtitulo, link, imagem_desktop, imagem_mobile, ordem, ativo } = req.body;

            const [novo] = await sql`
                INSERT INTO banners (
                    titulo, subtitulo, link, imagem_desktop, imagem_mobile, ordem, ativo
                ) VALUES (
                    ${titulo || ''},
                    ${subtitulo || ''},
                    ${link || ''},
                    ${imagem_desktop || ''},
                    ${imagem_mobile || imagem_desktop || ''},
                    ${parseInt(ordem) || 1},
                    ${ativo !== undefined ? Boolean(ativo) : true}
                )
                RETURNING *;
            `;

            return res.status(201).json({ sucesso: true, banner: novo });
        }

        // 3. EXCLUIR BANNER DO NEON
        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ erro: 'ID obrigatório.' });

            await sql`DELETE FROM banners WHERE id = ${id};`;
            return res.status(200).json({ sucesso: true });
        }

        return res.status(405).json({ erro: 'Método não permitido.' });
    } catch (err) {
        console.error('Erro na API de banners:', err);
        return res.status(500).json({ erro: 'Falha no banco: ' + err.message });
    }
}