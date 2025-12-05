from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, ConfigDict

# USERS
class UserSchema(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserPublic(BaseModel):
    id: int
    name: str
    email: str
    
    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdatePassword(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

# BOOKS
class BookBase(BaseModel):
    title: str
    author: str
    description: Optional[str] = None
    image_url: Optional[str] = None  # Receberá a string Base64 da imagem

class BookCreate(BookBase):
    pass

class BookPublic(BookBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# LOANS
class LoanBase(BaseModel):
    loan_date: date
    expected_return_date: date

class LoanCreate(LoanBase):
    book_id: int
    user_id: int

class LoanReturn(BaseModel):
    real_return_date: date

class LoanPublic(LoanBase):
    id: int
    status: str
    real_return_date: Optional[date] = None
    user_id: int
    book_id: int
    
    book: Optional[BookPublic] = None 
    model_config = ConfigDict(from_attributes=True)

# FAVORITES
class FavoriteCreate(BaseModel):
    book_id: int

class FavoritePublic(BaseModel):
    id: int
    user_id: int
    book_id: int
    
    # Retorna o objeto livro completo para renderizar a lista de favoritos
    book: Optional[BookPublic] = None
    model_config = ConfigDict(from_attributes=True)

# SUPPORT
class TicketBase(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

class TicketCreate(TicketBase):
    pass

class TicketPublic(TicketBase):
    id: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TicketUpdate(BaseModel):
    status: str

# RELATÓRIOS
class ReportOverdue(BaseModel):
    book_title: str
    user_name: str
    loan_date: date
    expected_return_date: date
    days_overdue: int

class ReportTopBook(BaseModel):
    book_title: str
    loan_count: int
