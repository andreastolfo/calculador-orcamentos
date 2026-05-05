let totalGeral = 0;

function adicionarItem() {
    const nome = document.getElementById('item').value;
    const qtd = parseFloat(document.getElementById('quantidade').value);
    const valor = parseFloat(document.getElementById('valor').value);

    if (!nome || isNaN(qtd) || isNaN(valor)) {
        alert("Preencha todos os campos!");
        return;
    }

    const totalItem = qtd * valor;
    totalGeral += totalItem;

    const tabela = document.getElementById('tabelaOrçamento').getElementsByTagName('tbody')[0];
    const novaLinha = tabela.insertRow();

    novaLinha.innerHTML = `
        <td>${nome}</td>
        <td>${qtd}</td>
        <td>R$ ${valor.toFixed(2)}</td>
        <td>R$ ${totalItem.toFixed(2)}</td>
    `;

    document.getElementById('totalGeral').innerText = totalGeral.toFixed(2);

    document.getElementById('item').value = '';
    document.getElementById('quantidade').value = '';
    document.getElementById('valor').value = '';
}
