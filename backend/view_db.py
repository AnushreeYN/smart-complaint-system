import sqlite3
import pandas as pd

def view_database(db_path):
    conn = sqlite3.connect(db_path)
    
    # Get all tables
    tables = pd.read_sql_query("SELECT name FROM sqlite_master WHERE type='table';", conn)
    print("--- Database Tables ---")
    print(tables)
    print("\n")
    
    for table_name in tables['name']:
        print(f"--- Table: {table_name} ---")
        try:
            df = pd.read_sql_query(f"SELECT * FROM {table_name}", conn)
            print(df)
        except Exception as e:
            print(f"Error reading table {table_name}: {e}")
        print("\n")
    
    conn.close()

if __name__ == "__main__":
    view_database("test.db")
