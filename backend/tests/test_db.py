from app.db.session import test_connection as check_database_connection

if __name__ == "__main__":
    version = check_database_connection()
    print("Connected to Neon PostgreSQL successfully!")
    print(version)