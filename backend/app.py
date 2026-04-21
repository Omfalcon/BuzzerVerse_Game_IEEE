from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from pymongo import MongoClient
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
import bcrypt
import jwt as pyjwt
import random
import threading
import os
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
app.config['SECRET_KEY'] = 'a9f83j29fj39f8j29fj2f9j2f9j2f9j2f9j2f9j'
CORS(app, origins='*', allow_headers=['Content-Type', 'Authorization'], methods=['GET', 'POST', 'OPTIONS'])
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')

MONGO_URI = 'mongodb+srv://Atharva:IEEE-20-26@ieeebuzz.fftlcg5.mongodb.net/?appName=IEEEBUZZ'
mongo_client = MongoClient(MONGO_URI)
db = mongo_client['ieeebuzz']

cred = credentials.Certificate(os.path.join(BASE_DIR, 'firebase_key.json'))
firebase_admin.initialize_app(cred)

ADMIN_HASH = '$2b$12$9iX825JtWSAX0qEkL9.JAuJe74uwB3W2wrn8bR6YtHl1uKG.9SX62'
JWT_SECRET = app.config['SECRET_KEY']
TOKEN_EXPIRE_MINUTES = 120

_lock = threading.Lock()


class GameState:
    def __init__(self):
        self.buzzer_active = False
        self.question_number = 1
        self.round_type = 'frontend'
        self.responses = []       # list of {email, username, rank}
        self.evaluations = {}     # {email: 'correct'|'wrong'}
        self.game_active = True

    def to_dict(self):
        return {
            'buzzer_active': self.buzzer_active,
            'question_number': self.question_number,
            'round_type': self.round_type,
            'responses': self.responses,
            'evaluations': self.evaluations,
            'game_active': self.game_active,
        }

    def reset_round(self):
        self.responses = []
        self.evaluations = {}
        self.buzzer_active = False
        self.question_number += 1


game = GameState()


def verify_admin(token):
    try:
        payload = pyjwt.decode(token or '', JWT_SECRET, algorithms=['HS256'])
        return payload.get('role') == 'admin'
    except Exception:
        return False


def get_leaderboard():
    users = list(db.users.find({}, {'_id': 0, 'email': 0}).sort('points', -1))
    return [{'rank': i + 1, **u} for i, u in enumerate(users)]


def compute_and_apply_scores():
    responses = game.responses[:]
    evaluations = dict(game.evaluations)

    if not responses:
        # No one buzzed — all users lose 0-5 random points
        all_emails = [u['email'] for u in db.users.find({}, {'email': 1})]
        deltas = {email: -random.randint(0, 5) for email in all_emails}
        for email, delta in deltas.items():
            db.users.update_one({'email': email}, {'$inc': {'points': delta}})
        return deltas

    all_emails = {u['email'] for u in db.users.find({}, {'email': 1})}
    buzzed_emails = {r['email'] for r in responses}

    top3_correct = any(
        evaluations.get(r['email']) == 'correct' for r in responses[:3]
    )

    deltas = {}

    for i, resp in enumerate(responses):
        email = resp['email']
        ev = evaluations.get(email, 'wrong')
        rank = i + 1

        if rank <= 3:
            # Top 3: correct = +10 + 2 speed bonus, wrong = -3
            deltas[email] = 12 if ev == 'correct' else -3
        else:
            # 4th+: if any top-3 was correct, everyone else gets -3
            if top3_correct:
                deltas[email] = -3
            else:
                deltas[email] = 10 if ev == 'correct' else -3

    # Non-buzzers lose a random 0-5 points
    for email in all_emails - buzzed_emails:
        deltas[email] = -random.randint(0, 5)

    for email, delta in deltas.items():
        db.users.update_one({'email': email}, {'$inc': {'points': delta}})

    return deltas


# ── HTTP Routes ────────────────────────────────────────────────────────────────

@app.route('/health')
def health():
    return jsonify({'status': 'ok'})


@app.route('/auth/google', methods=['POST'])
def auth_google():
    id_token = (request.json or {}).get('id_token')
    if not id_token:
        return jsonify({'error': 'Missing token'}), 400
    try:
        decoded = firebase_auth.verify_id_token(id_token)
        email = decoded['email']
        user = db.users.find_one({'email': email}, {'_id': 0})
        if user:
            return jsonify({'exists': True, 'username': user['username'], 'points': user['points']})
        return jsonify({'exists': False})
    except Exception as e:
        return jsonify({'error': str(e)}), 401


@app.route('/auth/username', methods=['POST'])
def set_username():
    data = request.json or {}
    id_token = data.get('id_token')
    username = data.get('username', '').strip()

    if not id_token or not username:
        return jsonify({'error': 'Missing fields'}), 400
    if len(username) > 20:
        return jsonify({'error': 'Username too long (max 20)'}), 400

    try:
        decoded = firebase_auth.verify_id_token(id_token)
        email = decoded['email']

        if db.users.find_one({'username': username}):
            return jsonify({'error': 'Username already taken'}), 409
        if db.users.find_one({'email': email}):
            return jsonify({'error': 'Account already registered'}), 409

        db.users.insert_one({'email': email, 'username': username, 'points': 100})
        return jsonify({'success': True, 'username': username, 'points': 100})
    except Exception as e:
        return jsonify({'error': str(e)}), 401


@app.route('/admin/login', methods=['POST'])
def admin_login():
    password = (request.json or {}).get('password', '')
    if bcrypt.checkpw(password.encode(), ADMIN_HASH.encode()):
        token = pyjwt.encode(
            {'role': 'admin', 'exp': datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)},
            JWT_SECRET, algorithm='HS256'
        )
        return jsonify({'token': token})
    return jsonify({'error': 'Invalid password'}), 401


@app.route('/leaderboard')
def leaderboard():
    return jsonify(get_leaderboard())


# ── SocketIO Events ────────────────────────────────────────────────────────────

@socketio.on('connect')
def on_connect():
    emit('game_state', game.to_dict())


@socketio.on('buzz')
def on_buzz(data):
    if not game.buzzer_active:
        emit('error', {'message': 'Buzzer is not active'})
        return

    id_token = (data or {}).get('id_token')
    try:
        decoded = firebase_auth.verify_id_token(id_token)
        email = decoded['email']
    except Exception:
        emit('error', {'message': 'Invalid auth token'})
        return

    with _lock:
        if not game.buzzer_active:
            emit('error', {'message': 'Buzzer closed just now'})
            return
        if any(r['email'] == email for r in game.responses):
            emit('error', {'message': 'Already buzzed this round'})
            return
        user = db.users.find_one({'email': email}, {'_id': 0})
        if not user:
            emit('error', {'message': 'User not registered'})
            return
        rank = len(game.responses) + 1
        game.responses.append({'email': email, 'username': user['username'], 'rank': rank})

    socketio.emit('game_state', game.to_dict())


@socketio.on('admin_enable')
def on_admin_enable(data):
    if not verify_admin((data or {}).get('token')):
        emit('error', {'message': 'Unauthorized'})
        return
    with _lock:
        game.buzzer_active = True
    socketio.emit('game_state', game.to_dict())


@socketio.on('admin_disable')
def on_admin_disable(data):
    if not verify_admin((data or {}).get('token')):
        emit('error', {'message': 'Unauthorized'})
        return
    with _lock:
        game.buzzer_active = False
    socketio.emit('game_state', game.to_dict())


@socketio.on('admin_evaluate')
def on_admin_evaluate(data):
    if not verify_admin((data or {}).get('token')):
        emit('error', {'message': 'Unauthorized'})
        return
    email = (data or {}).get('email')
    result = (data or {}).get('result')
    if email and result in ('correct', 'wrong'):
        with _lock:
            game.evaluations[email] = result
        socketio.emit('game_state', game.to_dict())


@socketio.on('admin_set_round')
def on_admin_set_round(data):
    if not verify_admin((data or {}).get('token')):
        emit('error', {'message': 'Unauthorized'})
        return
    round_type = (data or {}).get('round_type')
    if round_type in ('frontend', 'backend', 'mystery'):
        with _lock:
            game.round_type = round_type
        socketio.emit('game_state', game.to_dict())


@socketio.on('admin_reset')
def on_admin_reset(data):
    if not verify_admin((data or {}).get('token')):
        emit('error', {'message': 'Unauthorized'})
        return
    with _lock:
        deltas = compute_and_apply_scores()
        game.reset_round()

    lb = get_leaderboard()
    socketio.emit('round_reset', {
        'score_deltas': deltas,
        'leaderboard': lb,
        'game_state': game.to_dict(),
    })


@socketio.on('admin_conclude')
def on_admin_conclude(data):
    if not verify_admin((data or {}).get('token')):
        emit('error', {'message': 'Unauthorized'})
        return
    with _lock:
        compute_and_apply_scores()
        game.game_active = False
        game.buzzer_active = False
        game.responses = []
        game.evaluations = {}

    lb = get_leaderboard()
    socketio.emit('game_ended', {'leaderboard': lb})


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
