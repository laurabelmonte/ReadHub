let shell;
try {
  ({ shell } = require('electron'));
} catch (e) {
  shell = null;
}

// Configuração da API
const API_URL = "http://localhost:8080";

// Estado da Sessão (Persistência básica de login)
function getUsuarioLogado() {
  const userStr = localStorage.getItem("usuarioLogado");
  return userStr ? JSON.parse(userStr) : null;
}

function setUsuarioLogado(user) {
  localStorage.setItem("usuarioLogado", JSON.stringify(user));
}

function logout() {
  localStorage.removeItem("usuarioLogado");
  window.location.href = "index.html";
}

/* ---------------- Navegação ---------------- */
function abrir(pagina) {
  window.location.href = pagina;
}

/* ---------------- Autenticação ---------------- */
async function entrar() {
  const email = document.getElementById("email-login")?.value;
  const senha = document.getElementById("senha-login")?.value;

  if (!email || !senha) {
    alert("Preencha todos os campos!");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: senha })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Erro ao entrar");
    }

    const data = await response.json();
    setUsuarioLogado(data);
    alert(`Bem-vindo(a), ${data.name}!`);
    abrir("dashboard.html");

  } catch (error) {
    alert(error.message);
  }
}

async function cadastrar() {
  const nome = document.getElementById("nome")?.value?.trim();
  const email = document.getElementById("email")?.value?.trim();
  const senha = document.getElementById("senha")?.value;
  const confirmar = document.getElementById("confirmar")?.value;

  if (!nome || !email || !senha || !confirmar) {
    alert("Preencha todos os campos!");
    return;
  }

  if (senha !== confirmar) {
    alert("As senhas não coincidem!");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nome, email, password: senha })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Erro ao cadastrar");
    }

    alert("Cadastro realizado com sucesso! Faça login.");
    abrir("index.html");

  } catch (error) {
    alert(error.message);
  }
}

function sair() {
  if (confirm("Deseja realmente sair?")) {
    logout();
  }
}

/* ---------------- Catálogo e Busca ---------------- */
async function carregarCatalogo() {
  const container = document.getElementById("catalogo");
  if (!container) return;

  try {
    const response = await fetch(`${API_URL}/books`);
    const livros = await response.json();

    const user = getUsuarioLogado();
    let favoritosIds = [];
    if (user) {
        const favRes = await fetch(`${API_URL}/favorites?user_id=${user.id}`);
        const favData = await favRes.json();
        favoritosIds = favData.map(f => f.book_id);
    }

    if (livros.length === 0) {
        container.innerHTML = "<p>Nenhum livro no catálogo.</p>";
        return;
    }

    container.innerHTML = livros.map(livro => {
      const isFav = favoritosIds.includes(livro.id);
      return `
      <div class="livro">
        <img src="${livro.image_url || 'assets/books.png'}" alt="${livro.title}" 
             onclick="abrirDetalhes(${livro.id})" 
             style="cursor:pointer; object-fit:cover;">
        <p>${livro.title}</p>
        <button class="btn-fav" style="margin-top:5px; font-size:12px;" onclick="alternarFavorito(${livro.id})">
          ${isFav ? "★ Remover" : "☆ Favoritar"}
        </button>
      </div>
    `;
    }).join("");

  } catch (error) {
    console.error("Erro ao carregar catálogo:", error);
    container.innerHTML = "<p>Erro ao carregar livros.</p>";
  }
}

async function buscarLivro() {
  const termo = document.getElementById("busca")?.value;
  const container = document.getElementById("catalogo");
  if (!container) return;

  try {
    const url = termo ? `${API_URL}/books?search=${encodeURIComponent(termo)}` : `${API_URL}/books`;
    const response = await fetch(url);
    const livros = await response.json();

    if (livros.length === 0) {
        container.innerHTML = "<p>Nenhum livro encontrado.</p>";
        return;
    }

    container.innerHTML = livros.map(livro => `
      <div class="livro" onclick="abrirDetalhes(${livro.id})">
        <img src="${livro.image_url || 'assets/books.png'}" alt="${livro.title}">
        <p>${livro.title}</p>
      </div>
    `).join("");

  } catch (error) {
    console.error(error);
  }
}

/* ---------------- Detalhes e Reserva ---------------- */
function abrirDetalhes(bookId) {
  localStorage.setItem("livroSelecionadoId", bookId);
  abrir("detalhes.html");
}

async function carregarDetalhes() {
  const bookId = localStorage.getItem("livroSelecionadoId");
  if (!bookId) return;

  try {
    const response = await fetch(`${API_URL}/books/${bookId}`);
    if (!response.ok) throw new Error("Livro não encontrado");
    
    const livro = await response.json();

    const tituloEl = document.getElementById("livro-titulo");
    const imgEl = document.getElementById("livro-imagem");
    const descEl = document.getElementById("livro-descricao");
    const autorEl = document.getElementById("livro-autor");

    if (tituloEl) tituloEl.innerText = livro.title;
    if (imgEl) imgEl.src = livro.image_url || "assets/books.png";
    if (autorEl) autorEl.innerText = livro.author;
    if (descEl) descEl.innerText = livro.description || "Sem descrição.";

  } catch (error) {
    alert(error.message);
  }
}

async function carregarReserva() {
    const bookId = localStorage.getItem("livroSelecionadoId");
    if (!bookId) return;

    try {
        const response = await fetch(`${API_URL}/books/${bookId}`);
        const livro = await response.json();
        
        const tEl = document.getElementById("reserva-titulo");
        const imgEl = document.getElementById("reserva-img");
        if (tEl) tEl.innerText = livro.title;
        if (imgEl) imgEl.src = livro.image_url || "assets/books.png";
    } catch (e) { console.error(e); }
}

async function confirmarReserva() {
  const user = getUsuarioLogado();
  const bookId = localStorage.getItem("livroSelecionadoId");
  
  if (!user) { alert("Você precisa estar logado."); return; }
  
  const dataEmprestimo = document.getElementById("data-emprestimo")?.value;
  const dataDevolucao  = document.getElementById("data-devolucao")?.value;

  if (!dataEmprestimo || !dataDevolucao) {
    alert("Selecione as datas.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/loans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: user.id,
            book_id: parseInt(bookId),
            loan_date: dataEmprestimo,
            expected_return_date: dataDevolucao
        })
    });

    if (!response.ok) throw new Error("Erro ao reservar.");

    alert("Reserva confirmada!");
    abrir("prateleira.html");

  } catch (error) {
    alert(error.message);
  }
}

/* ---------------- Prateleira e Empréstimos ---------------- */
function formatDate(isoStr) {
    if (!isoStr) return "-";
    const [year, month, day] = isoStr.split("-");
    return `${day}/${month}/${year}`;
}

async function carregarPrateleira() {
  const container = document.getElementById("lista-prateleira");
  if (!container) return;
  
  const user = getUsuarioLogado();
  if (!user) return;

  try {
    const response = await fetch(`${API_URL}/loans?user_id=${user.id}`);
    const loans = await response.json();

    const ativos = loans.filter(l => l.status !== "Devolvido");

    if (ativos.length === 0) {
        container.innerHTML = "<p>Nenhum livro em sua prateleira (ativos).</p>";
        return;
    }

    container.innerHTML = ativos.map(loan => {
        const livro = loan.book;
        return `
        <div class="livro-item">
            <img src="${livro ? (livro.image_url || 'assets/books.png') : 'assets/books.png'}" alt="Capa">
            <p><strong>${livro ? livro.title : 'Livro #' + loan.book_id}</strong></p>
            <p style="font-size:12px;margin:4px 0;">Emp: ${formatDate(loan.loan_date)}</p>
            <p style="font-size:12px;margin:0;">Dev: ${formatDate(loan.expected_return_date)}</p>
            <button class="btn-devolver" onclick="devolverLivro(${loan.id})">Devolver</button>
        </div>
        `;
    }).join("");

  } catch (error) {
      console.error(error);
  }
}

async function devolverLivro(loanId) {
    const hoje = new Date().toISOString().split('T')[0];

    if(!confirm("Confirmar devolução?")) return;

    try {
        const response = await fetch(`${API_URL}/loans/${loanId}/return`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ real_return_date: hoje })
        });
        
        if(!response.ok) throw new Error("Erro ao devolver");

        alert("Livro devolvido com sucesso!");
        carregarPrateleira();

    } catch (error) {
        alert(error.message);
    }
}

async function carregarEmprestimos() {
    const container = document.getElementById('lista-emprestimos');
    if (!container) return;

    const user = getUsuarioLogado();
    if (!user) return;

    try {
        const response = await fetch(`${API_URL}/loans?user_id=${user.id}`);
        const loans = await response.json();

        if (loans.length === 0) {
            container.innerHTML = "<p>Nenhum histórico encontrado.</p>";
            return;
        }

        container.innerHTML = loans.map(loan => {
            const livro = loan.book;
            const devolucaoReal = loan.real_return_date 
                ? `<br><small>Devolução real: ${formatDate(loan.real_return_date)}</small>` 
                : '';
            
            return `
            <div class="emprestimo-item">
                <img src="${livro ? (livro.image_url || 'assets/books.png') : 'assets/books.png'}" alt="Capa">
                <div class="emprestimo-info">
                <h3>${livro ? livro.title : 'Livro indisponível'}</h3>
                <p>Status: <strong>${loan.status}</strong></p>
                <p>Empréstimo: ${formatDate(loan.loan_date)} • Previsto: ${formatDate(loan.expected_return_date)}${devolucaoReal}</p>
                </div>
            </div>
            `;
        }).join("");

    } catch (error) {
        console.error(error);
    }
}

/* ---------------- Favoritos ---------------- */
async function alternarFavorito(bookId) {
    const user = getUsuarioLogado();
    if (!user) { alert("Faça login para favoritar."); return; }

    try {
        const resList = await fetch(`${API_URL}/favorites?user_id=${user.id}`);
        const favorites = await resList.json();
        
        const jaFavorito = favorites.find(f => f.book_id === bookId);

        if (jaFavorito) {
            await fetch(`${API_URL}/favorites/${bookId}?user_id=${user.id}`, { method: 'DELETE' });
            alert("Removido dos favoritos.");
        } else {
            await fetch(`${API_URL}/favorites?user_id=${user.id}`, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ book_id: bookId })
            });
            alert("Adicionado aos favoritos!");
        }
        
        if (document.getElementById("lista-favoritos")) carregarFavoritos();
        if (document.getElementById("catalogo")) carregarCatalogo();

    } catch (error) {
        console.error(error);
        alert("Erro ao atualizar favorito.");
    }
}

async function carregarFavoritos() {
    const container = document.getElementById("lista-favoritos");
    if (!container) return;

    const user = getUsuarioLogado();
    if (!user) return;

    try {
        const response = await fetch(`${API_URL}/favorites?user_id=${user.id}`);
        const favorites = await response.json();

        if (favorites.length === 0) {
            container.innerHTML = "<p>Você ainda não favoritou nenhum livro.</p>";
            return;
        }

        container.innerHTML = favorites.map(item => {
            const livro = item.book; // O schema FavoritePublic deve incluir 'book'
            if (!livro) return ''; 
            return `
            <div class="livro-item">
                <img src="${livro.image_url || 'assets/books.png'}" alt="Capa">
                <p>${livro.title}</p>
                <button class="btn-devolver" onclick="alternarFavorito(${livro.id})">Remover</button>
            </div>
            `;
        }).join("");

    } catch (error) {
        console.error(error);
    }
}

/* ---------------- Meus Livros (Cadastro) ---------------- */
async function adicionarLivro() {
  const titulo = document.getElementById("titulo-livro").value.trim();
  const autor  = document.getElementById("autor-livro").value.trim();
  const descricao = document.getElementById("descricao-livro").value.trim();
  const fileInput = document.getElementById("file-imagem");

  if (!titulo) {
    alert("Preencha o título!");
    return;
  }

  let imgData = "";
  if (fileInput && fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    imgData = await readFileAsDataURL(file); 
  }

  try {
      const response = await fetch(`${API_URL}/books`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              title: titulo,
              author: autor,
              description: descricao,
              image_url: imgData
          })
      });
      console.log(response)
      if (!response.ok) throw new Error("Erro ao adicionar livro.");

      alert("Livro adicionado!");
      // Limpa form
      document.getElementById("titulo-livro").value = "";
      document.getElementById("autor-livro").value = "";
      document.getElementById("descricao-livro").value = "";
      if (fileInput) fileInput.value = "";

      carregarMeusLivros();

  } catch (error) {
      alert(error.message);
  }
}

async function carregarMeusLivros() {
    const container = document.getElementById("lista-livros");
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/books`);
        const livros = await response.json();

        container.innerHTML = livros.map(l => `
            <div class="livro-item">
                <img src="${l.image_url || 'assets/books.png'}" alt="${l.title}">
                <p>${l.title}</p>
                <button onclick="removerLivro(${l.id})">Remover</button>
            </div>
        `).join("");
    } catch(e) { console.error(e); }
}

async function removerLivro(bookId) {
    if(!confirm("Remover este livro do sistema?")) return;

    try {
        const response = await fetch(`${API_URL}/books/${bookId}`, { method: 'DELETE' });
        if(!response.ok) throw new Error("Erro ao remover");
        
        carregarMeusLivros();
    } catch(e) { alert(e.message); }
}

// Utilitário Base64
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

/* ---------------- Perfil ---------------- */
async function carregarPerfil() {
    const user = getUsuarioLogado();
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    const nomeEl = document.getElementById("perfil-nome");
    const emailEl = document.getElementById("perfil-email");

    try {
        const res = await fetch(`${API_URL}/users/${user.id}`);
        if (res.ok) {
            const freshUser = await res.json();
            if (nomeEl) nomeEl.innerText = freshUser.name;
            if (emailEl) emailEl.innerText = freshUser.email;
            setUsuarioLogado(freshUser);
            return;
        }
    } catch(e) {}

    // Fallback para localStorage
    if (nomeEl) nomeEl.innerText = user.name;
    if (emailEl) emailEl.innerText = user.email;
}

function abrirAlterarSenha() {
    document.querySelector(".perfil-card").style.display = "none";
    document.getElementById("alterar-senha").style.display = "block";
}

function cancelarAlteracao() {
    document.getElementById("alterar-senha").style.display = "none";
    document.querySelector(".perfil-card").style.display = "block";
}

async function confirmarAlteracao() {
    const atual = document.getElementById("senha-atual")?.value;
    const nova = document.getElementById("nova-senha")?.value;
    const confirma = document.getElementById("confirma-senha")?.value;
    const user = getUsuarioLogado();

    if (!nova || !confirma || !atual) {
        alert("Preencha todos os campos.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/users/${user.id}/password`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                current_password: atual,
                new_password: nova,
                confirm_password: confirma
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Erro ao alterar senha");
        }

        alert("Senha alterada com sucesso!");
        cancelarAlteracao();
    } catch (e) {
        alert(e.message);
    }
}

/* ---------------- Suporte ---------------- */
async function enviarSuporte() {
  const nome = document.getElementById("suporte-nome")?.value;
  const email = document.getElementById("suporte-email")?.value;
  const assunto = document.getElementById("suporte-assunto")?.value;
  const mensagem = document.getElementById("suporte-mensagem")?.value;

  if (!nome || !email || !assunto || !mensagem) {
    alert("Preencha todos!"); return;
  }

  try {
      await fetch(`${API_URL}/support`, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({ name: nome, email, subject: assunto, message: mensagem })
      });
      alert("Enviado!");
      limparFormularioSuporte();
      carregarSuporte();
  } catch(e) { alert("Erro ao enviar ticket"); }
}

function limparFormularioSuporte() {
    document.getElementById("suporte-mensagem").value = "";
    document.getElementById("suporte-assunto").value = "";
}

async function carregarSuporte() {
    const container = document.getElementById("lista-suporte");
    if(!container) return;

    try {
        const res = await fetch(`${API_URL}/support`);
        const tickets = await res.json();
        
        container.innerHTML = tickets.map(t => `
            <div class="ticket-card" style="background:white;border-radius:8px;padding:12px;margin-bottom:12px;box-shadow:0 2px 6px rgba(0,0,0,0.08);">
                <div style="display:flex;justify-content:space-between;">
                    <strong>${t.subject}</strong>
                    <small>${t.status}</small>
                </div>
                <p>${t.message}</p>
                ${t.status === 'Aberto' ? `<button onclick="fecharTicket(${t.id})">Resolver</button>` : ''}
            </div>
        `).join("");
    } catch(e) { console.error(e); }
}

async function fecharTicket(id) {
    try {
        await fetch(`${API_URL}/support/${id}`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ status: "Resolvido" })
        });
        carregarSuporte();
    } catch(e) { alert("Erro ao fechar ticket"); }
}

/* ---------------- Recomendações (Simplificado) ---------------- */
async function carregarRecomendacoes() {
    const container = document.getElementById("recomendacoes-container");
    if(!container) return;

    try {
        // Pega 3 primeiros livros do catálogo como recomendação
        const res = await fetch(`${API_URL}/books`);
        const livros = await res.json();
        const recs = livros.slice(0, 3);

        container.innerHTML = recs.map(livro => `
            <div class="recomendacao-card">
              <img src="${livro.image_url || 'assets/books.png'}">
              <p>${livro.title}</p>
              <button onclick="abrirDetalhes(${livro.id})">Ver</button>
            </div>
        `).join("");
    } catch(e) { }
}

/* ---------------- Relatórios (Front-end processing) ---------------- */
async function gerarRelatorioAtrasos() {
    const tabela = document.getElementById('tabela-atrasos');
    if(!tabela) return;

    try {
        const res = await fetch(`${API_URL}/loans`);
        const loans = await res.json();

        const hoje = new Date();
        const atrasos = loans.filter(l => {
            if (l.status === 'Devolvido') return false;
            const prev = new Date(l.expected_return_date);
            return prev < hoje;
        });

        // Renderiza (similar ao original)
        const tbody = tabela.querySelector('tbody');
        tbody.innerHTML = atrasos.map(l => `
            <tr>
                <td>${l.book ? l.book.title : l.book_id}</td>
                <td>User ID: ${l.user_id}</td>
                <td>${l.loan_date}</td>
                <td>${l.expected_return_date}</td>
                <td>ATRASADO</td>
            </tr>
        `).join("");
        
        tabela.style.display = '';
        window.__relatorio_atrasos = atrasos; // Para download

    } catch(e) { alert("Erro ao gerar relatório"); }
}

/* ---------------- Inicialização ---------------- */
window.addEventListener("load", () => {
  const path = window.location.pathname;

  if (path.includes("index.html")) {}
  if (path.includes("catalogo.html")) carregarCatalogo();
  if (path.includes("detalhes.html")) carregarDetalhes();
  if (path.includes("reservar.html")) carregarReserva();
  if (path.includes("prateleira.html")) carregarPrateleira();
  if (path.includes("perfil.html")) carregarPerfil();
  if (path.includes("favoritos.html")) carregarFavoritos();
  if (path.includes("meuslivros.html")) carregarMeusLivros();
  if (path.includes("suporte.html")) carregarSuporte();
  if (path.includes("recomendacoes.html")) carregarRecomendacoes();
  if (path.includes("emprestimos.html")) carregarEmprestimos();
});
