const SB_URL = 'https://ibjsxbjkrdbhlpxxampp.supabase.co'; 
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlianN4YmprcmRiaGxweHhhbXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTA1MTEsImV4cCI6MjA5MzU4NjUxMX0.otIaM4qqyIN7vtvwYWHNvn_Ddueju7rELhzKnmIyBYE';
const supabaseClient = supabase.createClient(SB_URL, SB_KEY);

let usuarioAtual = "";
let registros = [];
let metas = [];
let graficoInstancia;
const SENHA_CORRETA = "1234";

// 1. ACESSO
function verificarSenha() {
    if (document.getElementById('senha-master').value === SENHA_CORRETA) {
        document.getElementById('step-password').style.display = 'none';
        document.getElementById('step-profiles').style.display = 'block';
    } else alert("Senha incorreta!");
}

function fazerLogin(nome) {
    usuarioAtual = nome;
    document.getElementById('nome-usuario').innerText = nome;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    carregarDados();
}

function logout() { location.reload(); }

// 2. BANCO DE DADOS
async function carregarDados() {
    const { data: rData } = await supabaseClient.from('transacoes').select('*').order('created_at', { ascending: false });
    const { data: mData } = await supabaseClient.from('metas').select('*');
    registros = rData || [];
    metas = mData || [];
    atualizarInterface();
}

async function adicionarRegistro() {
    const desc = document.getElementById('desc').value;
    const tipo = document.getElementById('tipo').value;
    const cat = document.getElementById('categoria').value;
    const val = parseFloat(document.getElementById('valor').value);
    
    if (!desc || isNaN(val)) return alert("Preencha descrição e valor!");
    
    await supabaseClient.from('transacoes').insert([{ autor: usuarioAtual, desc, tipo, categoria: cat, valor: val, pago: false }]);
    document.getElementById('desc').value = ''; 
    document.getElementById('valor').value = '';
    carregarDados();
}

async function definirMeta() {
    const cat = document.getElementById('meta-categoria').value;
    const val = parseFloat(document.getElementById('meta-valor').value);
    
    if (isNaN(val)) return alert("Digite um valor válido!");
    
    // O upsert já funciona como "Editar" se a categoria for a mesma
    await supabaseClient.from('metas').upsert({ categoria: cat, valor_limite: val }, { onConflict: 'categoria' });
    
    document.getElementById('meta-valor').value = '';
    alert("Meta salva/atualizada!");
    carregarDados();
}

// NOVA FUNÇÃO PARA REMOVER META
async function excluirMeta(categoria) {
    if (confirm(`Deseja remover a meta de ${categoria}?`)) {
        const { error } = await supabaseClient
            .from('metas')
            .delete()
            .eq('categoria', categoria);
            
        if (!error) carregarDados();
    }
}

// 3. INTERFACE
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
        else { totalD += r.valor; dadosCat[r.categoria] = (dadosCat[r.categoria] || 0) + r.valor; }
        
        tbody.innerHTML += `<tr>
            <td><strong>${r.autor}</strong></td>
            <td><button onclick="alternarStatus(${r.id}, ${r.pago})" style="background:${r.pago?'#10b981':'#f59e0b'}; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">${r.pago?'Pago':'Pendente'}</button></td>
            <td style="${r.pago?'text-decoration:line-through; color:gray;':''}">${r.desc}</td>
            <td style="color:${r.tipo==='receita'?'#10b981':'#ef4444'}">R$ ${r.valor.toFixed(2)}</td>
            <td><button onclick="excluir(${r.id})" class="btn-del" style="color:red; background:none; border:none; cursor:pointer;">Excluir</button></td>
        </tr>`;
    });

    document.getElementById('total-receitas').innerText = `R$ ${totalR.toFixed(2)}`;
    document.getElementById('total-despesas').innerText = `R$ ${totalD.toFixed(2)}`;
    document.getElementById('saldo-geral').innerText = `R$ ${(totalR - totalD).toFixed(2)}`;
    
    desenharMetas(dadosCat);
    renderizarGrafico(dadosCat);
}

function desenharMetas(gastos) {
    const container = document.getElementById('container-metas');
    container.innerHTML = '<h3>Acompanhamento de Metas</h3>';
    
    // Ordena metas para ficarem sempre na mesma ordem
    metas.sort((a, b) => a.categoria.localeCompare(b.categoria));

    metas.forEach(m => {
        const gasto = gastos[m.categoria] || 0;
        const perc = Math.min((gasto / m.valor_limite) * 100, 100);
        
        container.innerHTML += `
            <div style="margin-bottom:15px;">
                <div class="meta-header">
                    <span style="font-size: 13px; font-weight: 600;">
                        ${m.categoria} 
                        <button onclick="excluirMeta('${m.categoria}')" class="btn-del-meta" title="Remover Meta">✕</button>
                    </span>
                    <span style="font-size: 12px; color: #64748b;">R$ ${gasto.toFixed(2)} / ${m.valor_limite.toFixed(2)}</span>
                </div>
                <div style="background:#e2e8f0; height:10px; border-radius:5px; overflow:hidden;">
                    <div style="background:${perc > 90 ? '#ef4444' : '#10b981'}; width:${perc}%; height:100%; transition: width 0.5s;"></div>
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

async function alternarStatus(id, status) { await supabaseClient.from('transacoes').update({ pago: !status }).eq('id', id); carregarDados(); }
async function excluir(id) { if (confirm("Excluir?")) { await supabaseClient.from('transacoes').delete().eq('id', id); carregarDados(); } }

supabaseClient.channel('public:transacoes').on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, () => carregarDados()).subscribe();
