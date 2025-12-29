from database import users_collection

print(list(users_collection.find({}, {"_id": 0})))
