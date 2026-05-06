// CONFIGURAÇÃO SUPABASE
const SB_URL = 'https://ibjsxbjkrdbhlpxxampp.supabase.co'; 
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlianN4YmprcmRiaGxweHhhbXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTA1MTEsImV4cCI6MjA5MzU4NjUxMX0.otIaM4qqyIN7vtvwYWHNvn_Ddueju7rELhzKnmIyBYE';
const supabaseClient = supabase.createClient(SB_URL, SB_KEY);

let usuarioAtual = "";
let registros = [];
let graficoInstancia;

const SENHA_CORRETA = "1234"; // Altere sua senha aqui se desejar

// 1. LOGIN E SEGURANÇA
function verificarSenha() {
    const senhaDigitada = document.getElementById('senha-master').value;
    if (senhaDigitada === SENHA_CORRETA) {
        document.getElementById('step-password').style.display = 'none';
        document.getElementById('step-profiles').style.display = 'block';
    } else {
        alert("Senha incorreta!");
    }
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
    const { data, error } = await supabaseClient.from('transacoes').select('*').order('created_at', { ascending: false });
    if (!error) { 
        registros = data; 
        atualizarInterface(); 
    }
}

async function adicionarRegistro() {
    const desc = document.getElementById('desc').value;
    const tipo = document.getElementById('tipo').value;
    const cat = document.getElementById('categoria').value;
    const val = parseFloat(document.getElementById('valor').value);

    if (!desc || isNaN(val)) return alert("Preencha os campos corretamente!");

    const { error } = await supabaseClient.from('transacoes').insert([{ 
        autor: usuarioAtual, desc, tipo, categoria: cat, valor: val, pago: false 
    }]);

    if (!error) {
        document.getElementById('desc').value = '';
        document.getElementById('valor').value = '';
        carregarDados();
    }
}

async function alternarStatus(id, statusAtual) {
    await supabaseClient.from('transacoes').update({ pago: !statusAtual }).eq('id', id);
    carregarDados();
}

async function excluir(id) {
    if (confirm("Excluir este lançamento?")) {
        await supabaseClient.from('transacoes').delete().eq('id', id);
        carregarDados();
    }
}

// 3. INTERFACE E FILTROS
function atualizarInterface() {
    const tbody = document.getElementById('lista-transacoes');
    tbody.innerHTML = '';
    let totalR = 0; let totalD = 0; let dadosCat = {};

    const filtroAutor = document.getElementById('filtroAutor').value;
    const filtroMes = document.getElementById('filtroMes').value;
    const hoje = new Date();

    const registrosExibidos = registros.filter(r => {
        const dataReg = new Date(r.created_at);
        const bateAutor = (filtroAutor === "Todos") || (r.autor === filtroAutor);
        const bateMes = (filtroMes === "Todos") || 
                        (dataReg.getMonth() === hoje.getMonth() && dataReg.getFullYear() === hoje.getFullYear());
        return bateAutor && bateMes;
    });

    registrosExibidos.forEach(r => {
        if (r.tipo === 'receita') totalR += r.valor;
        else { 
            totalD += r.valor; 
            dadosCat[r.categoria] = (dadosCat[r.categoria] || 0) + r.valor;
        }

        const tr = document.createElement('tr');
        const corStatus = r.pago ? '#10b981' : '#f59e0b';
        const textoStatus = r.pago ? 'Pago' : 'Pendente';
        
        tr.innerHTML = `
            <td><strong>${r.autor}</strong></td>
            <td>
                <button onclick="alternarStatus(${r.id}, ${r.pago})" style="background:${corStatus}; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold; width:75px;">
                    ${textoStatus}
                </button>
            </td>
            <td style="${r.pago ? 'text-decoration:line-through; color:gray;' : 'font-weight:500;'}">${r.desc}</td>
            <td style="color:${r.tipo==='receita'?'#10b981':'#ef4444'}; font-weight:bold;">R$ ${r.valor.toFixed(2)}</td>
            <td><button onclick="excluir(${r.id})" class="btn-del">Excluir</button></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('total-receitas').innerText = `R$ ${totalR.toFixed(2)}`;
    document.getElementById('total-despesas').innerText = `R$ ${totalD.toFixed(2)}`;
    document.getElementById('saldo-geral').innerText = `R$ ${(totalR - totalD).toFixed(2)}`;
    renderizarGrafico(dadosCat);
}

function renderizarGrafico(dados) {
    const ctx = document.getElementById('graficoFinancas').getContext('2d');
    if (graficoInstancia) graficoInstancia.destroy();
    graficoInstancia = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(dados),
            datasets: [{ data: Object.values(dados), backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

// REALTIME
supabaseClient.channel('public:transacoes').on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, () => carregarDados()).subscribe();
