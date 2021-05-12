import os
import tempfile
import requests

import pytest

from flask import app

def test_api_store_001():
     response = requests.get("http://localhost:5000/api/store/")
     assert response.status_code == 200

def test_api_store_002():
     response = requests.get("http://localhost:5000/api/store/")
     assert response.headers["Content-Type"] == "application/json"

def test_api_store_003():
     response = requests.get("http://localhost:5000/api/store/")
     response_body = response.json()
     assert response_body["response"] == "success"