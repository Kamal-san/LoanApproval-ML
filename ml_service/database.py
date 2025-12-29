from dotenv import load_dotenv
load_dotenv()

import os
from pymongo import MongoClient

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise Exception("MONGODB_URI not set in .env")

client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=5000
)

db = client["LoanDB"]

users_collection = db["users"]
predictions_collection = db["predictions"]

# Test connection
client.admin.command("ping")
print("MongoDB connected successfully")
