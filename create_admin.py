from app.database import SessionLocal
from app.models.user import UsersTable
from app.models.member_profile import MemberProfile
from app.models.book import Book
from app.models.author import Author
from app.models.issue import Issue
from app.models.otp_token import OtpToken
import bcrypt

def hash_pass(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

db = SessionLocal()

try:
    admin = db.query(UsersTable).filter(UsersTable.role == 'admin').first()

    if admin:
        # Update the password just in case
        admin.password_hash = hash_pass("admin123")
        db.commit()
        print(f"Admin already exists! Username: {admin.email}")
        print(f"Reset admin password to 'admin123'")
    else:
        demo_email = "admin@example.com"
        demo_password = "admin123"
        
        new_admin = UsersTable(
            email=demo_email,
            password_hash=hash_pass(demo_password),
            role="admin",
            is_verified=True,
            is_active=True
        )
        db.add(new_admin)
        db.commit()
        print(f"Created demo admin! Username: {demo_email}, Password: {demo_password}")
except Exception as e:
    print(f"Error checking/creating admin: {e}")
