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
    user = db.query(UsersTable).filter(UsersTable.email == 'user@example.com').first()

    if user:
        # Update the password just in case
        user.password_hash = hash_pass("user123")
        db.commit()
        print(f"User already exists! Username: {user.email}")
        print(f"Reset user password to 'user123'")
    else:
        demo_email = "user@example.com"
        demo_password = "user123"
        
        # Create user account
        new_user = UsersTable(
            email=demo_email,
            password_hash=hash_pass(demo_password),
            role="member",
            is_verified=True,
            is_active=True
        )
        db.add(new_user)
        db.flush()  # To get the new_user.id
        
        # Create member profile
        new_profile = MemberProfile(
            user_id=new_user.id,
            first_name="Demo",
            last_name="User",
            phone="1234567890",
            address="123 Library Street",
            borrow_limit=3,
            is_active=True
        )
        db.add(new_profile)
        db.commit()
        
        print(f"Created demo member! Username: {demo_email}, Password: {demo_password}")
except Exception as e:
    print(f"Error checking/creating user: {e}")
