// 1. CONFIGURAÇÃO (COLOQUE SEUS DADOS AQUI)
const SB_URL = 'https://ibjsxbjkrdbhlpxxampp.supabase.co'; 
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlianN4YmprcmRiaGxweHhhbXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTA1MTEsImV4cCI6MjA5MzU4NjUxMX0.otIaM4qqyIN7vtvwYWHNvn_Ddueju7rELhzKnmIyBYE'; 
const supabaseClient = supabase.createClient(SB_URL, SB_KEY);

let usuarioAtual = "";
let registros = [];
let metas = [];
let graficoInstancia;
const SENHA_CORRETA = "1234";

// 2. CONTROLE DE ACESSO
function verificarSenha() {
    const senha = document.getElementById('senha-master').value;
    if (senha === SENHA_CORRETA) {
        document.getElementById('step-password').style.display = 'none';
        document.getElementById('step-profiles').style.display = 'block';
    } else {
        alert("Senha incorreta!");
    }
}

function fazerLogin(nome) {
    usuarioAtual = nome;
        // Define a expiração para 1 hora (1 * 60 min * 60 seg * 1000 ms)
    const umaHora = 1 * 60 * 60 * 1000;
    const dadosSessao = {
        nome: nome,
        expiracao: new Date().getTime() + umaHora
    };
    
    localStorage.setItem('sessao_andre_angela', JSON.stringify(dadosSessao));

    document.getElementById('nome-usuario').innerText = nome;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    carregarDados();
}

function logout() {
    localStorage.removeItem('sessao_andre_angela');
    location.reload(); 
}

// 3. CARREGAMENTO DE DADOS
async function carregarDados() {
    const { data: rData, error: rErr } = await supabaseClient.from('transacoes').select('*').order('created_at', { ascending: false });
    const { data: mData, error: mErr } = await supabaseClient.from('metas').select('*');
    
    if (rErr || mErr) console.error("Erro ao carregar:", rErr || mErr);
    
    registros = rData || [];
    metas = mData || [];
    atualizarInterface();
}

// 4. LÓGICA DE LANÇAMENTO E EDIÇÃO
async function adicionarRegistro() {
    const idParaEditar = document.getElementById('edit-id').value;
    const desc = document.getElementById('desc').value;
    const tipo = document.getElementById('tipo').value;
    const cat = document.getElementById('categoria').value;
    const val = parseFloat(document.getElementById('valor').value);

    if (!desc || isNaN(val)) return alert("Preencha a descrição e o valor corretamente!");

    const dados = { autor: usuarioAtual, desc, tipo, categoria: cat, valor: val };

    if (idParaEditar) {
        // MODO EDIÇÃO
        await supabaseClient.from('transacoes').update(dados).eq('id', idParaEditar);
        resetarFormulario();
    } else {
        // MODO NOVO LANÇAMENTO
        await supabaseClient.from('transacoes').insert([{ ...dados, pago: false }]);
    }

    // Limpa campos básicos
    document.getElementById('desc').value = ''; 
    document.getElementById('valor').value = '';
    carregarDados();
}

// 5. PREPARAR EDIÇÃO (PUXA PARA O FORMULÁRIO)
function prepararEdicao(id) {
    const registro = registros.find(r => r.id === id);
    if (!registro) return;

    document.getElementById('edit-id').value = registro.id;
    document.getElementById('desc').value = registro.desc;
    document.getElementById('tipo').value = registro.tipo;
    document.getElementById('categoria').value = registro.categoria;
    document.getElementById('valor').value = registro.valor;

    // Ajusta visual do formulário
    document.getElementById('titulo-form').innerText = "✏️ Editando...";
    const btn = document.querySelector('.form-container .btn-primary');
    btn.innerText = "Salvar Alteração";
    btn.style.background = "#059669"; // Cor de sucesso/edição

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetarFormulario() {
    document.getElementById('edit-id').value = '';
    document.getElementById('titulo-form').innerText = "Novo Lançamento";
    const btn = document.querySelector('.form-container .btn-primary');
    btn.innerText = "Lançar";
    btn.style.background = "#2563eb";
}

// 6. METAS
async function definirMeta() {
    const cat = document.getElementById('meta-categoria').value;
    const val = parseFloat(document.getElementById('meta-valor').value);
    
    if (isNaN(val)) return alert("Digite um valor numérico!");

    await supabaseClient.from('metas').upsert({ categoria: cat, valor_limite: val }, { onConflict: 'categoria' });
    
    document.getElementById('meta-valor').value = '';
    alert("Meta atualizada!");
    carregarDados();
}

async function excluirMeta(categoria) {
    if (confirm(`Remover meta de ${categoria}?`)) {
        await supabaseClient.from('metas').delete().eq('categoria', categoria);
        carregarDados();
    }
}

// 7. ATUALIZAÇÃO DA TELA (UI)
function atualizarInterface() {
    const tbody = document.getElementById('lista-transacoes');
    tbody.innerHTML = '';
    let totalR = 0; let totalD = 0; let dadosCat = {};
    
    const fAutor = document.getElementById('filtroAutor').value;
    const fMes = document.getElementById('filtroMes').value;
    const hoje = new Date();

    const filtrados = registros.filter(r => {
        const dReg = new Date(r.created_at);
        const bA = (fAutor === "Todos") || (r.autor === fAutor);
        const bM = (fMes === "Todos") || (dReg.getMonth() === hoje.getMonth() && dReg.getFullYear() === hoje.getFullYear());
        return bA && bM;
    });

    filtrados.forEach(r => {
        if (r.tipo === 'receita') totalR += r.valor;
        else { 
            totalD += r.valor; 
            dadosCat[r.categoria] = (dadosCat[r.categoria] || 0) + r.valor; 
        }
        
        tbody.innerHTML += `<tr>
            <td><strong>${r.autor}</strong></td>
            <td><button onclick="alternarStatus(${r.id}, ${r.pago})" style="background:${r.pago?'#10b981':'#f59e0b'}; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">${r.pago?'Pago':'Pendente'}</button></td>
            <td style="${r.pago?'text-decoration:line-through; color:gray;':''}">${r.desc}</td>
            <td style="color:${r.tipo==='receita'?'#10b981':'#ef4444'}">R$ ${r.valor.toFixed(2)}</td>
            <td>
                <button onclick="prepararEdicao(${r.id})" style="background:none; border:none; cursor:pointer; margin-right:10px;">✏️</button>
                <button onclick="excluir(${r.id})" style="background:none; border:none; cursor:pointer; color:red;">X</button>
            </td>
        </tr>`;
    });

    document.getElementById('total-receitas').innerText = `R$ ${totalR.toFixed(2)}`;
    document.getElementById('total-despesas').innerText = `R$ ${totalD.toFixed(2)}`;
    document.getElementById('saldo-geral').innerText = `R$ ${(totalR - totalD).toFixed(2)}`;
    
    desenharMetas(dadosCat);
    renderizarGrafico(dadosCat);
}

function desenharMetas(gastosAtuais) {
    const container = document.getElementById('container-metas');
    container.innerHTML = '<h3>Acompanhamento de Metas</h3>';
    
    metas.forEach(m => {
        const gasto = gastosAtuais[m.categoria] || 0;
        const perc = Math.min((gasto / m.valor_limite) * 100, 100);
        container.innerHTML += `
            <div style="margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                    <span><strong>${m.categoria}</strong> <button onclick="excluirMeta('${m.categoria}')" style="background:none; border:none; color:#ccc; cursor:pointer;">✕</button></span>
                    <span>R$ ${gasto.toFixed(2)} / ${m.valor_limite.toFixed(2)}</span>
                </div>
                <div style="background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
                    <div style="background:${perc>90?'#ef4444':'#10b981'}; width:${perc}%; height:100%;"></div>
                </div>
            </div>`;
    });
}

function renderizarGrafico(dados) {
    const ctx = document.getElementById('graficoFinancas').getContext('2d');
    if (graficoInstancia) graficoInstancia.destroy();
    graficoInstancia = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: Object.keys(dados), datasets: [{ data: Object.values(dados), backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'] }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// 8. AUXILIARES E REALTIME
async function alternarStatus(id, status) { await supabaseClient.from('transacoes').update({ pago: !status }).eq('id', id); carregarDados(); }
async function excluir(id) { if (confirm("Excluir este lançamento?")) { await supabaseClient.from('transacoes').delete().eq('id', id); carregarDados(); } }

supabaseClient.channel('public:transacoes').on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, () => carregarDados()).subscribe();

window.onload = function() {
    const sessaoSalva = localStorage.getItem('sessao_andre_angela');
    
    if (sessaoSalva) {
        const dados = JSON.parse(sessaoSalva);
        const agora = new Date().getTime();

        // Verifica se ainda está dentro do prazo de 1 hora
        if (agora < dados.expiracao) {
            usuarioAtual = dados.nome;
            document.getElementById('nome-usuario').innerText = usuarioAtual;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            carregarDados();
        } else {
            // Se passou de 1 hora, limpa e obriga novo login
            localStorage.removeItem('sessao_andre_angela');
            console.log("Sessão expirada. Faça login novamente.");
        }
    }
};
