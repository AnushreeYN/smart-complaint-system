import requests
import time

BASE_URL = "http://localhost:8000/api/v1"

def test_flow():
    print("--- Starting Test Flow ---")
    
    # 1. Register
    reg_data = {
        "email": "test@example.com",
        "password": "password123",
        "full_name": "Test User",
        "role": "user"
    }
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=reg_data)
        print(f"Register: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Register failed: {e}")
        return

    # 2. Login
    login_data = {
        "username": "test@example.com",
        "password": "password123"
    }
    response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    if response.status_code != 200:
        print(f"Login failed: {response.json()}")
        return
    
    token = response.json()["access_token"]
    print(f"Login: Success! Token acquired.")
    
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create Complaint
    complaint_data = {
        "title": "Broken AC",
        "description": "The AC in room 302 is leaking water.",
        "priority": "high"
    }
    response = requests.post(f"{BASE_URL}/complaints/", json=complaint_data, headers=headers)
    print(f"Create Complaint: {response.status_code} - {response.json()}")

    # 4. List Complaints
    response = requests.get(f"{BASE_URL}/complaints/", headers=headers)
    print(f"List Complaints: {response.status_code} - {len(response.json())} items found.")

if __name__ == "__main__":
    # Wait a bit for server to start if run concurrently
    time.sleep(2)
    test_flow()
