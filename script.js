let usuarioAtual = "";
let registros = JSON.parse(localStorage.getItem('financas_casal')) || [];
let grafico;

function fazerLogin(nome) {
    usuarioAtual = nome;
    document.getElementById('nome-usuario').innerText = nome;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    atualizarTudo();
}

function logout() {
    location.reload();
}

function adicionarRegistro() {
    const desc = document.getElementById('desc').value;
    const tipo = document.getElementById('tipo').value;
    const cat = document.getElementById('categoria').value;
    const val = parseFloat(document.getElementById('valor').value);

    if (!desc || isNaN(val)) return alert("Preencha os valores!");

    const novo = {
        id: Date.now(),
        autor: usuarioAtual,
        desc,
        tipo,
        cat,
        valor: val
    };

    registros.push(novo);
    salvar();
    document.getElementById('desc').value = '';
    document.getElementById('valor').value = '';
}

function salvar() {
    localStorage.setItem('financas_casal', JSON.stringify(registros));
    atualizarTudo();
}

function excluir(id) {
    registros = registros.filter(r => r.id !== id);
    salvar();
}

function atualizarTudo() {
    const tbody = document.getElementById('lista-transacoes');
    tbody.innerHTML = '';
    
    let totalR = 0;
    let totalD = 0;
    let dadosGrafico = { Moradia: 0, Alimentação: 0, Lazer: 0, Saúde: 0, Investimentos: 0, Outros: 0 };

    registros.forEach(r => {
        if (r.tipo === 'receita') {
            totalR += r.valor;
        } else {
            totalD += r.valor;
            dadosGrafico[r.cat] += r.valor;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${r.autor}</strong></td>
            <td>${r.desc}</td>
            <td style="color: ${r.tipo === 'receita' ? '#27ae60' : '#e74c3c'}">
                ${r.tipo === 'receita' ? '+' : '-'} R$ ${r.valor.toFixed(2)}
            </td>
            <td><button onclick="excluir(${r.id})" class="btn-del">Remover</button></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('total-receitas').innerText = `R$ ${totalR.toFixed(2)}`;
    document.getElementById('total-despesas').innerText = `R$ ${totalD.toFixed(2)}`;
    document.getElementById('saldo-geral').innerText = `R$ ${(totalR - totalD).toFixed(2)}`;

    renderizarGrafico(dadosGrafico);
}

function renderizarGrafico(dados) {
    const ctx = document.getElementById('graficoFinancas').getContext('2d');
    if (grafico) grafico.destroy();

    grafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(dados),
            datasets: [{
                label: 'Gastos por Categoria',
                data: Object.values(dados),
                backgroundColor: '#1a73e8'
            }]
        },
        options: { responsive: true }
    });
}
