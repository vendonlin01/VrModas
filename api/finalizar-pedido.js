// api/finalizar-pedido.js - Checkout Antifraude (Cálculo, Regras da Loja e Estoque 100% no Servidor)
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

        // 0. Carrega regras da loja com fallback seguro caso a tabela configuracoes ainda não exista
        const cfgMapa = {};
        try {
            const configsRows = await sql`SELECT chave, valor FROM configuracoes;`;
            if (Array.isArray(configsRows)) {
                configsRows.forEach(r => { cfgMapa[r.chave] = r.valor; });
            }
        } catch (errCfg) {
            console.warn('Tabela configuracoes indisponível no checkout, aplicando padrão:', errCfg.message);
        }

        const permitirEntrega = cfgMapa['permitir_entrega'] !== undefined ? cfgMapa['permitir_entrega'] === 'true' : true;
        const permitirRetirada = cfgMapa['permitir_retirada'] !== undefined ? cfgMapa['permitir_retirada'] === 'true' : true;
        const pagPix = cfgMapa['pag_pix'] !== undefined ? cfgMapa['pag_pix'] === 'true' : true;
        const pagCredito = cfgMapa['pag_credito'] !== undefined ? cfgMapa['pag_credito'] === 'true' : true;
        const pagDebito = cfgMapa['pag_debito'] !== undefined ? cfgMapa['pag_debito'] === 'true' : true;
        const enderecoLoja = String(cfgMapa['endereco_loja'] || '').trim();

        const envioSolicitado = tipoEnvio === 'retirada' ? 'retirada' : 'entrega';
        if (envioSolicitado === 'entrega' && !permitirEntrega) {
            return res.status(400).json({ erro: 'A entrega em domicílio está desativada no momento. Selecione Retirar na Loja.' });
        }
        if (envioSolicitado === 'retirada' && !permitirRetirada) {
            return res.status(400).json({ erro: 'A retirada na loja está desativada no momento. Selecione Receber em Casa.' });
        }

        const metodoSolicitado = String(formaPagamento || '').trim().toUpperCase();
        if (!['PIX', 'CREDITO', 'DEBITO'].includes(metodoSolicitado)) {
            return res.status(400).json({ erro: 'Forma de pagamento inválida.' });
        }
        if (metodoSolicitado === 'PIX' && !pagPix) {
            return res.status(400).json({ erro: 'O pagamento via Pix está desativado no momento.' });
        }
        if (metodoSolicitado === 'CREDITO' && !pagCredito) {
            return res.status(400).json({ erro: 'O pagamento via Cartão de Crédito está desativado no momento.' });
        }
        if (metodoSolicitado === 'DEBITO' && !pagDebito) {
            return res.status(400).json({ erro: 'O pagamento via Cartão de Débito está desativado no momento.' });
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
                try {
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
                } catch (errCupom) {
                    console.warn('Erro ao consultar cupom no checkout:', errCupom.message);
                }
            }
        }

        const totalFinalReal = Math.max(0, Number((subtotalReal - descontoReal).toFixed(2)));
        const enderecoFinal = envioSolicitado === 'retirada'
            ? (enderecoLoja ? `Retirada na Loja: ${enderecoLoja}` : 'Retirada na Loja Física')
            : String(clienteEndereco || 'A combinar na entrega').slice(0, 300);

        const dadosItensCompletos = {
            itens: itensValidados,
            endereco_entrega: enderecoFinal.slice(0, 300),
            forma_pagamento: metodoSolicitado,
            tipo_envio: envioSolicitado,
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
        return res.status(500).json({
            erro: 'Erro interno ao processar o pedido.',
            detalhe: erro.message || String(erro)
        });
    }
}