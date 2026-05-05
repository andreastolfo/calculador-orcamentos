let itens = JSON.parse(localStorage.getItem('orcamento_dados')) || [];
let meuGrafico;

// Inicializa o dashboard ao carregar
window.onload = function() {
    atualizarInterface();
};

function adicionarItem() {
    const desc = document.getElementById('item').value;
    const cat = document.getElementById('categoria').value;
    const qtd = parseFloat(document.getElementById('quantidade').value);
    const val = parseFloat(document.getElementById('valor').value);

    if (!desc || isNaN(qtd) || isNaN(val)) return alert("Preencha todos os campos!");

    const novoItem = {
        id: Date.now(),
        desc,
        cat,
        total: qtd * val
    };

    itens.push(novoItem);
    salvarEAtualizar();
    
    // Limpar campos
    document.getElementById('item').value = '';
    document.getElementById('quantidade').value = '';
    document.getElementById('valor').value = '';
}

function salvarEAtualizar() {
    localStorage.setItem('orcamento_dados', JSON.stringify(itens));
    atualizarInterface();
}

function deletarItem(id) {
    itens = itens.filter(i => i.id !== id);
    salvarEAtualizar();
}

function atualizarInterface() {
    const tbody = document.querySelector('#tabela-itens tbody');
    tbody.innerHTML = '';
    
    let totalGeral = 0;
    let resumoCategorias = { Materiais: 0, Serviços: 0, Logística: 0, Outros: 0 };
    let maiorGasto = { desc: '-', valor: 0 };

    itens.forEach(item => {
        totalGeral += item.total;
        resumoCategorias[item.cat] += item.total;
        
        if(item.total > maiorGasto.valor) {
            maiorGasto = { desc: item.desc, valor: item.total };
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.desc}</td>
            <td>${item.cat}</td>
            <td>R$ ${item.total.toFixed(2)}</td>
            <td><button onclick="deletarItem(${item.id})" class="btn-del">X</button></td>
        `;
        tbody.appendChild(tr);
    });

    // Atualizar Cards
    document.getElementById('total-geral').innerText = `R$ ${totalGeral.toFixed(2)}`;
    document.getElementById('qtd-itens').innerText = itens.length;
    document.getElementById('maior-gasto').innerText = maiorGasto.desc;

    renderizarGrafico(resumoCategorias);
}

function renderizarGrafico(dados) {
    const ctx = document.getElementById('meuGrafico').getContext('2d');
    
    if (meuGrafico) meuGrafico.destroy();

    meuGrafico = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(dados),
            datasets: [{
                data: Object.values(dados),
                backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c']
            }]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Distribuição por Categoria' } }
        }
    });
}

function limparDados() {
    if(confirm("Deseja apagar todos os dados?")) {
        itens = [];
        salvarEAtualizar();
    }
}
