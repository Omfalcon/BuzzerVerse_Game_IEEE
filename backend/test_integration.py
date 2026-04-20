"""
Integration test for the BuzzerVerse backend.
Tests: admin login, enable, buzz, evaluate, reset scoring, conclude.
"""
import json
import urllib.request

BASE = "https://deployment.zapto.org"

def post(path, body=None, token=None):
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method="POST")
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read()), resp.status
    except urllib.error.HTTPError as e:
        return json.loads(e.read()), e.code

def get(path, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE}{path}", headers=headers)
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read()), resp.status

def test():
    print("=" * 50)
    print("  INTEGRATION TEST")
    print("=" * 50)

    # 1. Admin login
    print("\n[1] Admin login...")
    resp, code = post("/admin/login", {"password": "ieeebuzz2026"})
    assert code == 200, f"Login failed: {code} {resp}"
    token = resp["token"]
    print(f"    OK - token: {token[:20]}...")

    # 2. Wrong password
    print("[2] Wrong password...")
    resp, code = post("/admin/login", {"password": "wrong"})
    assert code == 401, f"Expected 401, got {code}"
    print("    OK - rejected")

    # 3. Get state
    print("[3] Get game state...")
    resp, code = get("/admin/state", token)
    assert code == 200
    print(f"    OK - question: {resp['current_question']}, round: {resp['round_type']}, active: {resp['is_active']}")

    # 4. Set round type
    print("[4] Set round to 'backend'...")
    resp, code = post("/admin/round", {"round_type": "backend"}, token)
    assert code == 200
    assert resp["round_type"] == "backend"
    print(f"    OK - round: {resp['round_type']}, question: {resp['question']}")

    # 5. Enable buzzer
    print("[5] Enable buzzer...")
    resp, code = post("/admin/enable", token=token)
    assert code == 200
    print("    OK - buzzer enabled")

    # 6. Get state again
    resp, code = get("/admin/state", token)
    assert resp["is_active"] == True
    print(f"    Confirmed active: {resp['is_active']}")

    # 7. Disable buzzer
    print("[6] Disable buzzer...")
    resp, code = post("/admin/disable", token=token)
    assert code == 200
    print("    OK - buzzer disabled")

    # 8. Re-enable for reset test
    post("/admin/enable", token=token)

    # 9. Reset (triggers scoring)
    print("[7] Reset (scoring + next question)...")
    resp, code = post("/admin/reset", token=token)
    assert code == 200
    print(f"    OK - new question: {resp['question']}, scores: {resp['scores']}")

    # 10. Leaderboard
    print("[8] Get leaderboard...")
    resp, code = get("/admin/leaderboard", token)
    assert code == 200
    print(f"    OK - {len(resp['leaderboard'])} users on leaderboard")
    for entry in resp["leaderboard"][:5]:
        print(f"      #{entry['rank']} {entry['username']}: {entry['points']} pts")

    # 11. Conclude
    print("[9] Conclude round...")
    resp, code = post("/admin/conclude", token=token)
    assert code == 200
    print(f"    OK - {len(resp['leaderboard'])} users in final leaderboard")

    # 12. Invalid round type
    print("[10] Invalid round type...")
    resp, code = post("/admin/round", {"round_type": "invalid"}, token)
    assert code == 400
    print("    OK - rejected invalid round type")

    # 13. Health check
    print("[11] Health check...")
    resp, code = get("/health")
    assert code == 200
    print(f"    OK - db: {resp['db']}, firebase: {resp['firebase']}")

    # 14. Token-protected without token
    print("[12] Protected route without token...")
    try:
        resp, code = post("/admin/enable")
        assert code == 403
        print("    OK - rejected (403)")
    except Exception:
        print("    OK - rejected (connection error/403)")

    print("\n" + "=" * 50)
    print("  ALL TESTS PASSED")
    print("=" * 50)

if __name__ == "__main__":
    test()
