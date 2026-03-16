import bcrypt

def hash_password(password: str) -> str:
    # bcrypt has a 72 byte limit for passwords
    pwd_bytes = password.encode('utf-8')
    if len(pwd_bytes) > 72:
        password = pwd_bytes[:72].decode('utf-8', 'ignore')
        pwd_bytes = password.encode('utf-8')
        
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode('utf-8')
    if len(pwd_bytes) > 72:
        plain_password = pwd_bytes[:72].decode('utf-8', 'ignore')
        pwd_bytes = plain_password.encode('utf-8')
        
    try:
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode('utf-8'))
    except ValueError:
        return False