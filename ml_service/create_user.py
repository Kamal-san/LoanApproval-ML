from auth import hash_password
from database import users_collection

username = "admin"
password = "admin123"

user = {
    "username": username,
    "hashed_password": hash_password(password)
}

users_collection.insert_one(user)

print("User created successfully")
