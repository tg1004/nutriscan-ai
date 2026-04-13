import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_register_new_user():
    response = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "testpassword123"
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

def test_login():
    # Register first
    client.post("/api/v1/auth/register", json={
        "email": "logintest@example.com",
        "password": "testpassword123"
    })
    # Then login
    response = client.post("/api/v1/auth/login", json={
        "email": "logintest@example.com",
        "password": "testpassword123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_wrong_password():
    response = client.post("/api/v1/auth/login", json={
        "email": "logintest@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401