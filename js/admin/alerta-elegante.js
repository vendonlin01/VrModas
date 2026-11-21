// ==========================================================================
// VR MODAS - SISTEMA DE ALERTAS & NOTIFICAÇÕES ELEGANTES (PAINEL ADMIN)
// js/admin/alerta-elegante.js
// ==========================================================================

(function () {
    function injetarEstilosAlertaVR() {
        if (document.getElementById('vr-alerta-estilos')) return;
        const style = document.createElement('style');
        style.id = 'vr-alerta-estilos';
        style.textContent = `
            #vr-modal-alerta-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.82);
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                padding: 18px;
                animation: vrFadeIn 0.2s ease-out;
            }
            #vr-modal-alerta-box {
                background: linear-gradient(180deg, #181818 0%, #101010 100%);
                border: 1px solid #2e2e2e;
                border-top: 3px solid var(--dourado, #d4af37);
                border-radius: 12px;
                max-width: 400px;
                width: 100%;
                padding: 24px 20px 20px;
                color: #fff;
                text-align: center;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9), 0 0 25px rgba(212, 175, 55, 0.12);
                font-family: 'Montserrat', sans-serif;
                transform: scale(0.95);
                animation: vrPopIn 0.22s ease-out forwards;
            }
            #vr-modal-alerta-icone {
                width: 48px;
                height: 48px;
                margin: 0 auto 12px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                background: rgba(212, 175, 55, 0.12);
                border: 1px solid rgba(212, 175, 55, 0.35);
            }
            #vr-modal-alerta-titulo {
                margin: 0 0 8px 0;
                font-size: 16px;
                font-weight: 800;
                color: var(--dourado, #d4af37);
                letter-spacing: 0.3px;
            }
            #vr-modal-alerta-texto {
                margin: 0 0 20px 0;
                font-size: 13px;
                line-height: 1.5;
                color: #d0d0d0;
                word-break: break-word;
            }
            .vr-alerta-acoes {
                display: flex;
                gap: 10px;
                justify-content: center;
            }
            .vr-btn-alerta-primario {
                flex: 1;
                background: linear-gradient(135deg, var(--dourado, #d4af37) 0%, #b5952f 100%);
                color: #000;
                border: none;
                padding: 11px 16px;
                border-radius: 8px;
                font-family: 'Montserrat', sans-serif;
                font-size: 13px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                cursor: pointer;
                transition: transform 0.15s ease, opacity 0.15s ease;
            }
            .vr-btn-alerta-primario:active {
                transform: scale(0.97);
            }
            .vr-btn-alerta-secundario {
                background: #222;
                color: #ccc;
                border: 1px solid #383838;
                padding: 11px 14px;
                border-radius: 8px;
                font-family: 'Montserrat', sans-serif;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
            }
            @keyframes vrFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes vrPopIn {
                from { transform: scale(0.92); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    function criarModalAlertaVR() {
        injetarEstilosAlertaVR();
        let overlay = document.getElementById('vr-modal-alerta-overlay');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'vr-modal-alerta-overlay';
        overlay.innerHTML = `
            <div id="vr-modal-alerta-box" role="alertdialog" aria-modal="true">
                <div id="vr-modal-alerta-icone">✨</div>
                <h3 id="vr-modal-alerta-titulo">Aviso VR Modas</h3>
                <p id="vr-modal-alerta-texto"></p>
                <div class="vr-alerta-acoes" id="vr-modal-alerta-acoes">
                    <button type="button" class="vr-btn-alerta-primario" id="vr-btn-alerta-ok">Entendi</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    function mostrarAlertaEleganteVR(mensagemBruta) {
        const overlay = criarModalAlertaVR();
        const box = document.getElementById('vr-modal-alerta-box');
        const iconeEl = document.getElementById('vr-modal-alerta-icone');
        const tituloEl = document.getElementById('vr-modal-alerta-titulo');
        const textoEl = document.getElementById('vr-modal-alerta-texto');
        const acoesEl = document.getElementById('vr-modal-alerta-acoes');

        let msg = String(mensagemBruta || '')
            .replace(/^Falha ao salvar produto no Neon:\s*/i, '')
            .replace(/\s*->\s*(assinatura_invalida|expirado|ausente|malformado|token_nao_gestor|sem_secret)\s*$/i, '')
            .trim();

        const ehErroSessao = /sess[aã]o administrativa expirada|assinatura_invalida|fa[çc]a login novamente/i.test(String(mensagemBruta));
        const ehErro = !ehErroSessao && /erro|falha|inv[aá]lid|negad|proibid|insuficiente|não foi possível/i.test(msg);
        const ehSucesso = /sucesso|salvo|publicado|atualizado|conclu[ií]do|✅/i.test(msg);

        msg = msg.replace(/^✅\s*/, '');

        if (ehErroSessao) {
            box.style.borderTopColor = '#ff5252';
            iconeEl.style.background = 'rgba(255, 82, 82, 0.14)';
            iconeEl.style.borderColor = 'rgba(255, 82, 82, 0.4)';
            iconeEl.textContent = '🔒';
            tituloEl.style.color = '#ff6b6b';
            tituloEl.textContent = 'Sessão Expirada';
            textoEl.textContent = 'Sua sessão de administrador precisa ser renovada. Faça login novamente para continuar.';
            acoesEl.innerHTML = `
                <button type="button" class="vr-btn-alerta-secundario" id="vr-btn-alerta-fechar">Fechar</button>
                <button type="button" class="vr-btn-alerta-primario" id="vr-btn-alerta-relogin">Fazer Login</button>
            `;
            document.getElementById('vr-btn-alerta-fechar').onclick = () => { overlay.style.display = 'none'; };
            document.getElementById('vr-btn-alerta-relogin').onclick = () => {
                ['vr_auth_token', 'vr_token', 'vr_usuario_ativo', 'vr_cliente_dados', 'vr_admin_logado', 'usuarioLogado'].forEach(k => {
                    sessionStorage.removeItem(k);
                    localStorage.removeItem(k);
                });
                window.location.href = 'login.html';
            };
        } else if (ehErro) {
            box.style.borderTopColor = '#ff5252';
            iconeEl.style.background = 'rgba(255, 82, 82, 0.14)';
            iconeEl.style.borderColor = 'rgba(255, 82, 82, 0.4)';
            iconeEl.textContent = '⚠️';
            tituloEl.style.color = '#ff6b6b';
            tituloEl.textContent = 'Atenção';
            textoEl.textContent = msg;
            acoesEl.innerHTML = `<button type="button" class="vr-btn-alerta-primario" id="vr-btn-alerta-ok">Entendi</button>`;
            document.getElementById('vr-btn-alerta-ok').onclick = () => { overlay.style.display = 'none'; };
        } else if (ehSucesso) {
            box.style.borderTopColor = '#4caf50';
            iconeEl.style.background = 'rgba(76, 175, 80, 0.14)';
            iconeEl.style.borderColor = 'rgba(76, 175, 80, 0.4)';
            iconeEl.textContent = '✅';
            tituloEl.style.color = '#66bb6a';
            tituloEl.textContent = 'Tudo Certo!';
            textoEl.textContent = msg;
            acoesEl.innerHTML = `<button type="button" class="vr-btn-alerta-primario" id="vr-btn-alerta-ok">Continuar</button>`;
            document.getElementById('vr-btn-alerta-ok').onclick = () => { overlay.style.display = 'none'; };
        } else {
            box.style.borderTopColor = 'var(--dourado, #d4af37)';
            iconeEl.style.background = 'rgba(212, 175, 55, 0.12)';
            iconeEl.style.borderColor = 'rgba(212, 175, 55, 0.35)';
            iconeEl.textContent = '✨';
            tituloEl.style.color = 'var(--dourado, #d4af37)';
            tituloEl.textContent = 'VR Modas';
            textoEl.textContent = msg;
            acoesEl.innerHTML = `<button type="button" class="vr-btn-alerta-primario" id="vr-btn-alerta-ok">OK</button>`;
            document.getElementById('vr-btn-alerta-ok').onclick = () => { overlay.style.display = 'none'; };
        }

        overlay.style.display = 'flex';
    }

    window.mostrarAlertaVR = mostrarAlertaEleganteVR;
    window.alert = mostrarAlertaEleganteVR;
})();