from typing import List, Optional
from http import HTTPStatus

from fastapi import FastAPI, HTTPException, Query
from sqlalchemy import create_engine, select, desc
from sqlalchemy.orm import sessionmaker,joinedload

# Importação dos modelos (tabelas)
from models import (
    table_registry, 
    Users, 
    Books, 
    Loans, 
    Favorites, 
    SupportTickets
)

# Importação dos schemas (validação e resposta)
from schemas import (
    UserSchema, UserPublic, UserLogin, UserUpdatePassword,
    BookCreate, BookPublic,
    LoanCreate, LoanPublic, LoanReturn,
    FavoriteCreate, FavoritePublic,
    TicketCreate, TicketPublic, TicketUpdate
)

app = FastAPI()

# =-=-=-=-= Configuração do Banco de Dados =-=-=-=-=
DATABASE_URL = "postgresql://postgres:changeme@postgres:5432/read_hub"

engine = create_engine(DATABASE_URL)
table_registry.metadata.create_all(engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@app.get("/")
async def root():
    return {"message": "ReadHub API is running!"}


# ROTAS DE USUÁRIOS
@app.post("/users", response_model=UserPublic, status_code=HTTPStatus.CREATED)
def create_user(user: UserSchema):
    db = SessionLocal()
    
    # Verifica se email já existe
    existing_user = db.scalar(select(Users).where(Users.email == user.email))
    if existing_user:
        db.close()
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail="Email já cadastrado")

    db_user = Users(
        name=user.name,
        email=user.email,
        password=user.password
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    db.close()

    return db_user

@app.get("/users/{user_id}", response_model=UserPublic)
def get_user(user_id: int):
    db = SessionLocal()
    user = db.get(Users, user_id)
    db.close()

    if not user:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Usuário não encontrado")

    return user 

@app.post("/users/login", response_model=UserPublic)
def login_user(user_login: UserLogin):
    db = SessionLocal()
    user = db.scalar(select(Users).where(Users.email == user_login.email))
    db.close()

    if not user or (user.password != user_login.password):
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail='E-mail ou senha incorretos'
        )

    return user

@app.put("/users/{user_id}/password", status_code=HTTPStatus.NO_CONTENT)
def update_password(user_id: int, user_data: UserUpdatePassword):
    db = SessionLocal()
    user = db.get(Users, user_id)
    
    if not user:
        db.close()
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Usuário não encontrado")
        
    if user.password != user_data.current_password:
        db.close()
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail="Senha atual incorreta")
        
    if user_data.new_password != user_data.confirm_password:
        db.close()
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail="As senhas não conferem")

    user.password = user_data.new_password
    db.commit()
    db.close()
    return


# ROTAS DE LIVROS 
@app.get("/books", response_model=List[BookPublic])
def list_books(search: Optional[str] = None):
    db = SessionLocal()
    query = select(Books)
    
    if search:
        # Filtra por título (case insensitive)
        query = query.where(Books.title.ilike(f"%{search}%"))
    
    books = db.scalars(query).all()
    db.close()
    return books

@app.post("/books", response_model=BookPublic, status_code=HTTPStatus.CREATED)
def create_book(book: BookCreate):
    db = SessionLocal()
    
    new_book = Books(
        title=book.title,
        author=book.author,
        description=book.description,
        image_url=book.image_url
    )
    
    db.add(new_book)
    db.commit()
    db.refresh(new_book)
    db.close()
    return new_book

@app.get("/books/{book_id}", response_model=BookPublic)
def get_book_details(book_id: int):
    db = SessionLocal()
    book = db.get(Books, book_id)
    db.close()
    
    if not book:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Livro não encontrado")
    
    return book

@app.delete("/books/{book_id}", status_code=HTTPStatus.NO_CONTENT)
def delete_book(book_id: int):
    db = SessionLocal()
    book = db.get(Books, book_id)
    
    if not book:
        db.close()
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Livro não encontrado")
        
    db.delete(book)
    db.commit()
    db.close()
    return


@app.post("/loans", response_model=LoanPublic, status_code=HTTPStatus.CREATED)
def create_loan(loan: LoanCreate):
    db = SessionLocal()
    
    user = db.get(Users, loan.user_id)
    book = db.get(Books, loan.book_id)
    
    if not user or not book:
        db.close()
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Usuário ou Livro não encontrado")

    new_loan = Loans(
        user_id=loan.user_id,
        book_id=loan.book_id,
        loan_date=loan.loan_date,
        expected_return_date=loan.expected_return_date,
        status="Emprestado"
    )
    
    db.add(new_loan)
    db.commit()
    db.refresh(new_loan)

    new_loan = db.scalar(
        select(Loans)
        .options(joinedload(Loans.book))
        .where(Loans.id == new_loan.id)
    )
    # ---------------------

    db.close()
    return new_loan

@app.get("/loans", response_model=List[LoanPublic])
def list_loans(user_id: Optional[int] = None):
    db = SessionLocal()
    # Carrega o livro associado ao empréstimo
    query = select(Loans).options(joinedload(Loans.book)).order_by(desc(Loans.loan_date))
    
    if user_id:
        query = query.where(Loans.user_id == user_id)
        
    loans = db.scalars(query).all()
    db.close()
    return loans

@app.put("/loans/{loan_id}/return", response_model=LoanPublic)
def return_book(loan_id: int, return_data: LoanReturn):
    db = SessionLocal()
    loan = db.get(Loans, loan_id)
    
    if not loan:
        db.close()
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Empréstimo não encontrado")
        
    loan.status = "Devolvido"
    loan.real_return_date = return_data.real_return_date
    
    db.commit()
    db.refresh(loan)

    loan = db.scalar(
        select(Loans)
        .options(joinedload(Loans.book))
        .where(Loans.id == loan_id)
    )

    db.close()
    return loan

# ROTAS DE FAVORITOS

@app.post("/favorites", response_model=FavoritePublic, status_code=HTTPStatus.CREATED)
def add_favorite(fav: FavoriteCreate, user_id: int = Query(...)):
    db = SessionLocal()
    
    existing = db.scalar(
        select(Favorites).where(
            Favorites.book_id == fav.book_id, 
            Favorites.user_id == user_id
        )
    )
    if existing:
        db.close()
        return existing # Já favoritado, retorna o existente

    new_fav = Favorites(user_id=user_id, book_id=fav.book_id)
    db.add(new_fav)
    db.commit()
    db.refresh(new_fav)
    db.close()
    return new_fav

@app.get("/favorites", response_model=List[FavoritePublic])
def list_favorites(user_id: int):
    db = SessionLocal()

    favs = db.scalars(
        select(Favorites)
        .where(Favorites.user_id == user_id)
        .options(joinedload(Favorites.book))
    ).all()
    db.close()
    return favs

@app.delete("/favorites/{book_id}", status_code=HTTPStatus.NO_CONTENT)
def remove_favorite(book_id: int, user_id: int = Query(...)):
    db = SessionLocal()
    fav = db.scalar(
        select(Favorites).where(
            Favorites.book_id == book_id, 
            Favorites.user_id == user_id
        )
    )
    
    if fav:
        db.delete(fav)
        db.commit()
    
    db.close()
    return


# ROTAS DE SUPORTE
@app.post("/support", response_model=TicketPublic, status_code=HTTPStatus.CREATED)
def create_ticket(ticket: TicketCreate):
    db = SessionLocal()
    
    new_ticket = SupportTickets(
        name=ticket.name,
        email=ticket.email,
        subject=ticket.subject,
        message=ticket.message,
        status="Aberto"
    )
    
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    db.close()
    return new_ticket

@app.get("/support", response_model=List[TicketPublic])
def list_tickets():
    db = SessionLocal()
    tickets = db.scalars(select(SupportTickets).order_by(desc(SupportTickets.created_at))).all()
    db.close()
    return tickets

@app.patch("/support/{ticket_id}", response_model=TicketPublic)
def update_ticket_status(ticket_id: int, ticket_data: TicketUpdate):
    db = SessionLocal()
    ticket = db.get(SupportTickets, ticket_id)
    
    if not ticket:
        db.close()
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Ticket não encontrado")
        
    ticket.status = ticket_data.status
    db.commit()
    db.refresh(ticket)
    db.close()
    return ticket
