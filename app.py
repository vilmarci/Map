from flask import Flask, render_template, jsonify, send_from_directory, session
import json
import os
import random

app = Flask(__name__, static_folder='static')
app.secret_key = 'supersecretkey'

def get_quiz_list():
    quizzes = []
    for filename in os.listdir('questions'):
        if filename.endswith('.json'):
            with open(os.path.join('questions', filename)) as f:
                data = json.load(f)
                quizzes.append({
                    'name': data['metadata']['name'],
                    'file': filename
                })
    return quizzes

def load_quiz(filename):
    with open(os.path.join('questions', filename),encoding="utf-8") as f:
        data = json.load(f)
    return data

@app.route('/')
def index():
    with open(os.path.join('static', 'sources.json'),encoding="utf-8") as f:
        sources_data = json.load(f)
    sources = sources_data.get('sources', [])
    quizzes = get_quiz_list()
    return render_template('index.html', quizzes=quizzes, sources=sources)

@app.route('/quiz/<filename>')
def quiz(filename):
    data = load_quiz(filename)
    session['asked_questions'] = []
    session['quiz_data'] = data
    response = {
        "metadata": data["metadata"],
        "extralayers": data.get("extralayers", [])
    }
    return jsonify(response)


@app.route('/geojson/<path:filename>')
def geojson(filename):
    return send_from_directory(os.path.join(app.root_path, 'static/geojson'), filename)

@app.route('/next_question/<filename>')
def next_question(filename):
    quiz_data = session.get('quiz_data')
    asked_questions = session.get('asked_questions', [])

    available_questions = [q for q in quiz_data['questions'] if q not in asked_questions]
    if not available_questions:
        return jsonify({"error": "No more questions available"})

    current_question = random.choice(available_questions)
    asked_questions.append(current_question)
    session['asked_questions'] = asked_questions

    response = {
        "question": current_question,
        "geodata": quiz_data["geodata"]
    }
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True)
