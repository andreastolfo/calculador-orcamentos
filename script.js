// CONFIGURAÇÃO SUPABASE - Pegue no painel Settings > API
const SB_URL = 'https://ibjsxbjkrdbhlpxxampp.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlianN4YmprcmRiaGxweHhhbXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTA1MTEsImV4cCI6MjA5MzU4NjUxMX0.otIaM4qqyIN7vtvwYWHNvn_Ddueju7rELhzKnmIyBYE';
const supabaseClient = supabase.createClient(SB_URL, SB_KEY);

let usuarioAtual = "";
let registros = [];
let graficoInstancia;

// ==========================================
// 1. AUTENTICAÇÃO SIMPLES E NAVEGAÇÃO
// ==========================================
function fazerLogin(nome) {
    usuarioAtual = nome;
    document.getElementById('nome-usuario').innerText = nome;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    carregarDados();
}

function logout() { 
    location.reload(); 
}

// ==========================================
// 2. COMUNICAÇÃO COM O BANCO DE DADOS (SUPABASE)
// ==========================================

// A. Buscar Dados (Ler)
async function carregarDados() {
    const { data, error } = await supabaseClient
        .from('transacoes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Erro ao carregar do banco:", error);
        alert("Erro ao carregar dados: " + error.message);
    } else {
        registros = data;
        atualizarInterface();
    }
}

// B. Lançar Novo Registro (Criar)
async function adicionarRegistro() {
    const desc = document.getElementById('desc').value;
    const tipo = document.getElementById('tipo').value;
    const cat = document.getElementById('categoria').value;
    const val = parseFloat(document.getElementById('valor').value);

    if (!desc || isNaN(val)) {
        alert("Por favor, preencha a Descrição e o Valor corretamente.");
        return;
    }

    const { error } = await supabaseClient
        .from('transacoes')
        .insert([{ 
            autor: usuarioAtual, 
            desc: desc, 
            tipo: tipo, 
            categoria: cat, 
            valor: val,
            pago: false // Todo novo lançamento nasce como pendente
        }]);

    if (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar no banco: " + error.message);
    } else {
        // Limpa os campos da tela após o sucesso
        document.getElementById('desc').value = '';
        document.getElementById('valor').value = '';
        carregarDados();
    }
}

// C. Excluir Registro (Deletar)
async function excluir(id) {
    if (confirm("Tem certeza que deseja apagar este lançamento?")) {
        const { error } = await supabaseClient
            .from('transacoes')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert("Erro ao excluir: " + error.message);
        } else {
            carregarDados();
        }
    }
}

// D. Atualizar Status Pago/Pendente (Atualizar)
async function alternarStatus(id, statusAtual) {
    const novoStatus = !statusAtual; // Se for true vira false, se for false vira true

    const { error } = await supabaseClient
        .from('transacoes')
        .update({ pago: novoStatus })
        .eq('id', id);

    if (error) {
        alert("Erro ao mudar o status: " + error.message);
    } else {
        carregarDados();
    }
}

// ==========================================
// 3. ATUALIZAÇÃO DA INTERFACE (TELA E GRÁFICO)
// ==========================================

function atualizarInterface() {
    const tbody = document.getElementById('lista-transacoes');
    tbody.innerHTML = '';
    
    let totalReceitas = 0;
    let totalDespesas = 0;
    let dadosPorCategoria = {};

    registros.forEach(r => {
        // 1. Acumuladores Financeiros
        if (r.tipo === 'receita') {
            totalReceitas += r.valor;
        } else {
            totalDespesas += r.valor;
            // Soma gastos por categoria para o gráfico
            dadosPorCategoria[r.categoria] = (dadosPorCategoria[r.categoria] || 0) + r.valor;
        }

        // 2. Construção da Tabela
        const tr = document.createElement('tr');
        
        // Define as cores e textos baseados no status (Pago/Pendente)
        const corStatus = r.pago ? '#10b981' : '#f59e0b'; // Verde ou Laranja
        const textoStatus = r.pago ? 'Pago' : 'Pendente';
        const estiloDescricao = r.pago ? 'text-decoration: line-through; color: #94a3b8;' : 'font-weight: 500;';
        
        tr.innerHTML = `
            <td><strong>${r.autor}</strong></td>
            <td>
                <button onclick="alternarStatus(${r.id}, ${r.pago})" 
                        style="background: ${corStatus}; color: white; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold; width: 75px;">
                    ${textoStatus}
                </button>
            </td>
            <td style="${estiloDescricao}">${r.desc}</td>
            <td style="color: ${r.tipo === 'receita' ? '#10b981' : '#ef4444'}; font-weight: bold;">
                R$ ${r.valor.toFixed(2)}
            </td>
            <td>
                <button onclick="excluir(${r.id})" style="color: #ef4444; background: transparent; border: 1px solid #ef4444; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                    Excluir
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // 3. Atualizar os Cards de Resumo no topo
    document.getElementById('total-receitas').innerText = `R$ ${totalReceitas.toFixed(2)}`;
    document.getElementById('total-despesas').innerText = `R$ ${totalDespesas.toFixed(2)}`;
    document.getElementById('saldo-geral').innerText = `R$ ${(totalReceitas - totalDespesas).toFixed(2)}`;

    // 4. Desenhar o Gráfico
    renderizarGrafico(dadosPorCategoria);
}

function renderizarGrafico(dados) {
    const ctx = document.getElementById('graficoFinancas').getContext('2d');
    
    // Destrói o gráfico antigo antes de criar um novo para não bugar a tela
    if (graficoInstancia) {
        graficoInstancia.destroy();
    }

    graficoInstancia = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(dados),
            datasets: [{
                data: Object.values(dados),
                backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: { 
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                title: { display: true, text: 'Onde o dinheiro está indo (Despesas)', font: { size: 14 } },
                legend: { position: 'bottom' }
            }
        }
    });
}

// ==========================================
// 4. ATUALIZAÇÃO EM TEMPO REAL (REALTIME)
// ==========================================
// Se sua esposa lançar algo no celular, a sua tela atualiza na hora
supabaseClient
  .channel('public:transacoes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, () => {
    carregarDados();
  })
  .subscribe();
