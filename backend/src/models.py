from datetime import datetime, date
from typing import List, Optional

from sqlalchemy import func, ForeignKey, String, TEXT, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column, registry, relationship

table_registry = registry()

@table_registry.mapped_as_dataclass
class Users:
    """
    Modelo para a tabela users.
    """
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(primary_key=True, init=False)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password: Mapped[str] = mapped_column(String(255), repr=False)
    creation_date: Mapped[datetime] = mapped_column(
        init=False, server_default=func.now()
    )

    # Relacionamentos
    loans: Mapped[List['Loans']] = relationship(
        back_populates='user', default_factory=list, init=False, cascade="all, delete-orphan"
    )
    favorites: Mapped[List['Favorites']] = relationship(
        back_populates='user', default_factory=list, init=False, cascade="all, delete-orphan"
    )
    support_tickets: Mapped[List['SupportTickets']] = relationship(
        back_populates='user', default_factory=list, init=False, cascade="all, delete-orphan"
    )


@table_registry.mapped_as_dataclass
class Books:
    """
    Modelo para a tabela books (unifica o Catálogo e 'Meus Livros').
    """
    __tablename__ = 'books'

    id: Mapped[int] = mapped_column(primary_key=True, init=False)
    title: Mapped[str] = mapped_column(String(255))
    author: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        init=False, server_default=func.now()
    )

    # Relacionamentos
    loans: Mapped[List['Loans']] = relationship(
        back_populates='book', default_factory=list, init=False, cascade="all, delete-orphan"
    )
    favorited_by: Mapped[List['Favorites']] = relationship(
        back_populates='book', default_factory=list, init=False, cascade="all, delete-orphan"
    )

    description: Mapped[Optional[str]] = mapped_column(TEXT, nullable=True, default=None)
    image_url: Mapped[Optional[str]] = mapped_column(TEXT, nullable=True, default=None)

@table_registry.mapped_as_dataclass
class Loans:
    """
    Modelo para a tabela loans (Empréstimos).
    """
    __tablename__ = 'loans'

    id: Mapped[int] = mapped_column(primary_key=True, init=False)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    book_id: Mapped[int] = mapped_column(ForeignKey('books.id'))
    
    loan_date: Mapped[date] = mapped_column(Date)
    expected_return_date: Mapped[date] = mapped_column(Date)

    # Relacionamentos
    user: Mapped['Users'] = relationship(back_populates='loans', init=False)
    book: Mapped['Books'] = relationship(back_populates='loans', init=False)
    
    real_return_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, default=None)
    status: Mapped[str] = mapped_column(String(50), default='Emprestado')

@table_registry.mapped_as_dataclass
class Favorites:
    """
    Modelo para a tabela favorites.
    """
    __tablename__ = 'favorites'

    id: Mapped[int] = mapped_column(primary_key=True, init=False)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    book_id: Mapped[int] = mapped_column(ForeignKey('books.id'))

    # Relacionamentos
    user: Mapped['Users'] = relationship(back_populates='favorites', init=False)
    book: Mapped['Books'] = relationship(back_populates='favorited_by', init=False)


@table_registry.mapped_as_dataclass
class SupportTickets:
    """
    Modelo para a tabela support_tickets.
    """
    __tablename__ = 'support_tickets'

    id: Mapped[int] = mapped_column(primary_key=True, init=False)
    
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(TEXT)
    created_at: Mapped[datetime] = mapped_column(
        init=False, server_default=func.now()
    )

    user: Mapped[Optional['Users']] = relationship(back_populates='support_tickets', init=False)
    status: Mapped[str] = mapped_column(String(50), default='Aberto') # 'Aberto', 'Resolvido'
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey('users.id'), nullable=True, default=None)
