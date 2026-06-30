import os
import pymysql
from dotenv import load_dotenv

def run_migration():
    # Load environment variables
    load_dotenv()

    db_host = os.getenv("DB_HOST")
    db_user = os.getenv("DB_USER")
    db_password = os.getenv("DB_PASSWORD")
    db_port = int(os.getenv("DB_PORT", 3306))
    db_name = os.getenv("DB_NAME")

    print(f"Connecting to database {db_name} at {db_host}:{db_port}...")

    # Establish connection
    connection = pymysql.connect(
        host=db_host,
        user=db_user,
        password=db_password,
        port=db_port,
        database=db_name
    )

    try:
        with connection.cursor() as cursor:
            # Check if column exists
            cursor.execute("SHOW COLUMNS FROM shops LIKE 'show_live_activity'")
            result = cursor.fetchone()
            if not result:
                print("Adding 'show_live_activity' column to 'shops' table...")
                cursor.execute("ALTER TABLE shops ADD COLUMN show_live_activity TINYINT(1) NOT NULL DEFAULT 0")
                connection.commit()
                print("Column 'show_live_activity' added successfully!")
            else:
                print("Column 'show_live_activity' already exists.")
    except Exception as e:
        print(f"Migration failed: {e}")
        raise e
    finally:
        connection.close()

if __name__ == '__main__':
    run_migration()
