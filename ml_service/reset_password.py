from auth import hash_password
from database import users_collection

DEFAULT_PASSWORD = "admin@123"

users = users_collection.find()

for user in users:
    users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "hashed_password": hash_password(DEFAULT_PASSWORD)
            }
        }
    )

print("All user passwords reset successfully")
