// CONFIGURAÇÃO SUPABASE - Pegue no painel Settings > API
const SB_URL = 'https://ibjsxbjkrdbhlpxxampp.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlianN4YmprcmRiaGxweHhhbXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTA1MTEsImV4cCI6MjA5MzU4NjUxMX0.otIaM4qqyIN7vtvwYWHNvn_Ddueju7rELhzKnmIyBYE';
const supabaseClient = supabase.createClient(SB_URL, SB_KEY);

let usuarioAtual = "";
let registros = [];
let graficoInstancia;

// 1. Função de Login
function fazerLogin(nome) {
    usuarioAtual = nome;
    document.getElementById('nome-usuario').innerText = nome;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    carregarDados();
}

function logout() { location.reload(); }

// 2. Carregar Dados do Supabase
async function carregarDados() {
    const { data, error } = await supabaseClient
        .from('transacoes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Erro ao carregar:", error);
    } else {
        registros = data;
        atualizarInterface();
    }
}

// 3. Adicionar Novo Registro ao Banco
async function adicionarRegistro() {
    const desc = document.getElementById('desc').value;
    const tipo = document.getElementById('tipo').value;
    const cat = document.getElementById('categoria').value;
    const val = parseFloat(document.getElementById('valor').value);

    if (!desc || isNaN(val)) return alert("Preencha todos os campos corretamente.");

    const { error } = await supabaseClient
        .from('transacoes')
        .insert([{ 
            autor: usuarioAtual, 
            desc: desc, 
            tipo: tipo, 
            categoria: cat, 
            valor: val 
        }]);

    if (error) {
        alert("Erro ao salvar no banco!");
    } else {
        // Limpar campos e recarregar (o realtime também ajuda aqui)
        document.getElementById('desc').value = '';
        document.getElementById('valor').value = '';
        carregarDados();
    }
}

// 4. Excluir Registro
async function excluir(id) {
    if (confirm("Deseja apagar este lançamento?")) {
        const { error } = await supabaseClient
            .from('transacoes')
            .delete()
            .eq('id', id);
        
        if (!error) carregarDados();
    }
}

// 5. Atualizar toda a UI (Cards, Tabela e Gráfico)
function atualizarInterface() {
    const tbody = document.getElementById('lista-transacoes');
    tbody.innerHTML = '';
    
    let totalR = 0;
    let totalD = 0;
    let dadosPorCat = {};

    registros.forEach(r => {
        if (r.tipo === 'receita') {
            totalR += r.valor;
        } else {
            totalD += r.valor;
            dadosPorCat[r.categoria] = (dadosPorCat[r.categoria] || 0) + r.valor;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${r.autor}</strong></td>
            <td>${r.desc}</td>
            <td style="color: ${r.tipo === 'receita' ? '#10b981' : '#ef4444'}">
                R$ ${r.valor.toFixed(2)}
            </td>
            <td><button onclick="excluir(${r.id})" class="btn-del">Remover</button></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('total-receitas').innerText = `R$ ${totalR.toFixed(2)}`;
    document.getElementById('total-despesas').innerText = `R$ ${totalD.toFixed(2)}`;
    document.getElementById('saldo-geral').innerText = `R$ ${(totalR - totalD).toFixed(2)}`;

    renderizarGrafico(dadosPorCat);
}

// 6. Gerar Gráfico de Despesas
function renderizarGrafico(dados) {
    const ctx = document.getElementById('graficoFinancas').getContext('2d');
    if (graficoInstancia) graficoInstancia.destroy();

    graficoInstancia = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(dados),
            datasets: [{
                data: Object.values(dados),
                backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b']
            }]
        },
        options: { 
            responsive: true,
            plugins: { title: { display: true, text: 'Distribuição de Despesas' } }
        }
    });
}

// 7. Sincronização Realtime (Opcional, mas incrível)
supabaseClient
  .channel('public:transacoes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, () => {
    carregarDados();
  })
  .subscribe();
