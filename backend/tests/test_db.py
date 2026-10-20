from app.db.session import test_connection

if __name__ == "__main__":
    version = test_connection()
    print("Connected to Neon PostgreSQL successfully!")
    print(version)