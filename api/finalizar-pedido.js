// api/finalizar-pedido.js - Checkout Antifraude (Cálculo e Estoque 100% no Servidor)
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ erro: 'Método não permitido.' });
    }

    if (!process.env.DATABASE_URL) {
        return res.status(500).json({ erro: 'Banco de dados não configurado no servidor.' });
    }

    const sql = neon(process.env.DATABASE_URL);

    try {
        const {
            itens,
            cupomCodigo,
            clienteNome,
            clienteEmail,
            clienteWhats,
            clienteEndereco,
            formaPagamento,
            tipoEnvio
        } = req.body || {};

        if (!Array.isArray(itens) || itens.length === 0) {
            return res.status(400).json({ erro: 'A sacola está vazia.' });
        }

        let subtotalReal = 0;
        const itensValidados = [];

        // 1. Consulta cada produto no Neon para obter o preço e estoque reais
        for (const item of itens) {
            const idProd = parseInt(item.idProduto, 10);
            const qtd = parseInt(item.quantidade, 10);

            if (isNaN(idProd) || isNaN(qtd) || qtd <= 0 || qtd > 50) {
                return res.status(400).json({ erro: 'Item ou quantidade inválida na sacola.' });
            }

            const [prodDb] = await sql`
                SELECT id, nome, preco, preco_promocional, estoque, imagem
                FROM produtos
                WHERE id = ${idProd}
                LIMIT 1;
            `;

            if (!prodDb) {
                return res.status(404).json({ erro: `Produto #${idProd} não encontrado no catálogo.` });
            }

            const estoqueAtual = parseInt(prodDb.estoque || 0, 10);
            if (estoqueAtual < qtd) {
                return res.status(400).json({
                    erro: `Estoque insuficiente para "${prodDb.nome}". Disponível: ${estoqueAtual} un.`
                });
            }

            const precoNormal = parseFloat(prodDb.preco);
            const precoPromo = prodDb.preco_promocional ? parseFloat(prodDb.preco_promocional) : null;
            const precoUnitarioReal = (precoPromo !== null && precoPromo > 0 && precoPromo < precoNormal)
                ? precoPromo
                : precoNormal;

            subtotalReal += precoUnitarioReal * qtd;

            itensValidados.push({
                idProduto: prodDb.id,
                nome: prodDb.nome,
                preco: precoUnitarioReal,
                quantidade: qtd,
                tamanho: String(item.tamanho || 'Padrão').slice(0, 30),
                cor: String(item.cor || 'Padrão').slice(0, 40),
                imagem: prodDb.imagem || 'img/produto1.jpg'
            });
        }

        // 2. Valida o cupom de desconto diretamente no banco (se informado)
        let descontoReal = 0;
        let cupomConfirmado = null;

        if (cupomCodigo && typeof cupomCodigo === 'string') {
            const codNorm = cupomCodigo.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
            if (codNorm) {
                const [cupomDb] = await sql`
                    SELECT codigo, tipo, valor
                    FROM cupons
                    WHERE UPPER(codigo) = ${codNorm} AND ativo = true
                    LIMIT 1;
                `;

                if (cupomDb) {
                    const valCupom = parseFloat(cupomDb.valor);
                    descontoReal = cupomDb.tipo === 'porcentagem'
                        ? (subtotalReal * valCupom) / 100
                        : valCupom;
                    cupomConfirmado = cupomDb.codigo;
                }
            }
        }

        const totalFinalReal = Math.max(0, Number((subtotalReal - descontoReal).toFixed(2)));
        const metodoLimpo = ['PIX', 'CREDITO', 'DEBITO'].includes(String(formaPagamento || '').toUpperCase())
            ? String(formaPagamento).toUpperCase()
            : 'PIX';

        const dadosItensCompletos = {
            itens: itensValidados,
            endereco_entrega: String(clienteEndereco || 'A combinar').slice(0, 300),
            forma_pagamento: metodoLimpo,
            tipo_envio: tipoEnvio === 'retirada' ? 'retirada' : 'entrega',
            cupom: cupomConfirmado,
            desconto_aplicado: Number(descontoReal.toFixed(2))
        };

        // 3. Registra o pedido no Neon com os valores blindados
        const [pedidoCriado] = await sql`
            INSERT INTO pedidos (
                cliente_nome,
                cliente_email,
                cliente_telefone,
                total,
                itens,
                status
            ) VALUES (
                ${String(clienteNome || 'Cliente Visitante').slice(0, 150)},
                ${String(clienteEmail || '').slice(0, 150)},
                ${String(clienteWhats || 'Não informado').slice(0, 50)},
                ${totalFinalReal},
                ${JSON.stringify(dadosItensCompletos)}::jsonb,
                'Pendente'
            )
            RETURNING id;
        `;

        // 4. Abate o estoque real de forma segura
        for (const item of itensValidados) {
            await sql`
                UPDATE produtos
                SET estoque = GREATEST(0, COALESCE(estoque, 0) - ${item.quantidade})
                WHERE id = ${item.idProduto};
            `;
        }

        return res.status(201).json({
            sucesso: true,
            idPedido: pedidoCriado.id,
            totalReal: totalFinalReal,
            itensValidados,
            cupomConfirmado
        });
    } catch (erro) {
        console.error('Erro no checkout antifraude:', erro);
        return res.status(500).json({ erro: 'Erro interno ao processar o pedido.' });
    }
}