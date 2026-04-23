import os
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from functools import wraps
import hashlib

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///portfolio.db'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {
    'image': {'png', 'jpg', 'jpeg', 'gif'},
    'model': {'gltf', 'glb'},
    'font': {'ttf', 'otf', 'woff', 'woff2'}
}

db = SQLAlchemy(app)

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ---------- Database Models ----------
class Work(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(200), nullable=False)
    icon = db.Column(db.String(50), default='fa-palette')
    created_at = db.Column(db.DateTime, default=db.func.now())

class Model3D(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    model_url = db.Column(db.String(200), nullable=False)
    thumbnail_url = db.Column(db.String(200))
    icon = db.Column(db.String(50), default='fa-cube')
    created_at = db.Column(db.DateTime, default=db.func.now())

class Writing(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    excerpt = db.Column(db.String(300))
    icon = db.Column(db.String(50), default='fa-pen-nib')
    created_at = db.Column(db.DateTime, default=db.func.now())

class Font(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    font_url = db.Column(db.String(200))
    icon = db.Column(db.String(50), default='fa-font')
    created_at = db.Column(db.DateTime, default=db.func.now())

with app.app_context():
    db.create_all()

# ---------- Helper functions ----------
def allowed_file(filename, category):
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS.get(category, set())

def save_file(file, category):
    if file and allowed_file(file.filename, category):
        filename = secure_filename(file.filename)
        # add hash to avoid collisions
        name, ext = os.path.splitext(filename)
        hash_name = hashlib.md5(f"{name}{os.urandom(8)}".encode()).hexdigest()[:10]
        new_filename = f"{hash_name}{ext}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], new_filename)
        file.save(filepath)
        return f"/{app.config['UPLOAD_FOLDER']}/{new_filename}"
    return None

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('is_admin'):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

# ---------- Public API endpoints ----------
@app.route('/api/works')
def get_works():
    works = Work.query.order_by(Work.created_at.desc()).all()
    return jsonify([{'id': w.id, 'title': w.title, 'description': w.description,
                     'image_url': w.image_url, 'icon': w.icon} for w in works])

@app.route('/api/models')
def get_models():
    models = Model3D.query.order_by(Model3D.created_at.desc()).all()
    return jsonify([{'id': m.id, 'title': m.title, 'description': m.description,
                     'model_url': m.model_url, 'thumbnail_url': m.thumbnail_url, 'icon': m.icon} for m in models])

@app.route('/api/writings')
def get_writings():
    writings = Writing.query.order_by(Writing.created_at.desc()).all()
    return jsonify([{'id': w.id, 'title': w.title, 'content': w.content,
                     'excerpt': w.excerpt, 'icon': w.icon} for w in writings])

@app.route('/api/fonts')
def get_fonts():
    fonts = Font.query.order_by(Font.created_at.desc()).all()
    return jsonify([{'id': f.id, 'name': f.name, 'description': f.description,
                     'font_url': f.font_url, 'icon': f.icon} for f in fonts])

# ---------- Admin endpoints ----------
@app.route('/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    # Default hardcoded credentials – change in production!
    if data.get('email') == 'admin@portfolio.com' and data.get('password') == 'creative2025':
        session['is_admin'] = True
        return jsonify({'success': True})
    return jsonify({'success': False}), 401

@app.route('/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('is_admin', None)
    return jsonify({'success': True})

@app.route('/admin/works', methods=['POST'])
@admin_required
def add_work():
    title = request.form.get('title')
    description = request.form.get('description')
    icon = request.form.get('icon', 'fa-palette')
    image = request.files.get('image')
    if not title or not description or not image:
        return jsonify({'error': 'Missing fields'}), 400
    image_url = save_file(image, 'image')
    if not image_url:
        return jsonify({'error': 'Invalid image'}), 400
    work = Work(title=title, description=description, image_url=image_url, icon=icon)
    db.session.add(work)
    db.session.commit()
    return jsonify({'success': True, 'id': work.id})

@app.route('/admin/models', methods=['POST'])
@admin_required
def add_model():
    title = request.form.get('title')
    description = request.form.get('description')
    icon = request.form.get('icon', 'fa-cube')
    model_file = request.files.get('model_file')
    if not title or not description or not model_file:
        return jsonify({'error': 'Missing fields'}), 400
    model_url = save_file(model_file, 'model')
    if not model_url:
        return jsonify({'error': 'Invalid model file (must be .gltf or .glb)'}), 400
    model_3d = Model3D(title=title, description=description, model_url=model_url, icon=icon)
    db.session.add(model_3d)
    db.session.commit()
    return jsonify({'success': True, 'id': model_3d.id})

@app.route('/admin/writings', methods=['POST'])
@admin_required
def add_writing():
    data = request.json
    title = data.get('title')
    content = data.get('content')
    excerpt = data.get('excerpt', content[:150])
    icon = data.get('icon', 'fa-pen-nib')
    if not title or not content:
        return jsonify({'error': 'Missing fields'}), 400
    writing = Writing(title=title, content=content, excerpt=excerpt, icon=icon)
    db.session.add(writing)
    db.session.commit()
    return jsonify({'success': True, 'id': writing.id})

@app.route('/admin/fonts', methods=['POST'])
@admin_required
def add_font():
    name = request.form.get('name')
    description = request.form.get('description')
    icon = request.form.get('icon', 'fa-font')
    font_file = request.files.get('font_file')
    if not name or not description:
        return jsonify({'error': 'Missing fields'}), 400
    font_url = save_file(font_file, 'font') if font_file else None
    font = Font(name=name, description=description, font_url=font_url, icon=icon)
    db.session.add(font)
    db.session.commit()
    return jsonify({'success': True, 'id': font.id})

# ---------- Serve frontend ----------
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
