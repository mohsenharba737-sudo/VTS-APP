from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from datetime import datetime
import pandas as pd

app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app)

# المستخدمين
vts_users = [
    {"id": 1, "name": "المراقب الرئيسي", "username": "port", "password": "control"}
]

observations = []
logs = []

obs_id = 1
user_id = 2


def add_log(username, action, details=""):
    logs.append({
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "username": username,
        "action": action,
        "details": details
    })


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    user = next((u for u in vts_users if u["username"] == username and u["password"] == password), None)

    if user:
        add_log(username, "تسجيل دخول")
        return jsonify({"success": True, "user": user})

    return jsonify({"success": False}), 401


@app.route("/api/observations")
def get_observations():
    return jsonify(observations)


@app.route("/api/add-observation", methods=["POST"])
def add_observation():
    global obs_id
    data = request.json

    observations.append({
        "id": obs_id,
        "date": data["date"],
        "employee": data["employee"],
        "time": data["time"],
        "ship": data["ship"],
        "observation": data["observation"],
        "notes": data.get("notes", "")
    })

    obs_id += 1
    return jsonify({"success": True})


# استيراد Excel
@app.route("/api/import-excel", methods=["POST"])
def import_excel():
    global obs_id

    if "file" not in request.files:
        return jsonify({"success": False, "msg": "لم يتم اختيار ملف"}), 400

    file = request.files["file"]

    try:

        # قراءة الملف (العناوين في الصف الثالث)
        df = pd.read_excel(file, header=2)

        # حذف الأعمدة الفارغة
        df = df.loc[:, ~df.columns.str.contains('^Unnamed')]

        imported = 0

        for _, row in df.iterrows():

            date = row["التاريخ"]
            employee = row["اسم الموظف"]
            time = row["الساعة"]
            ship = row["السفينة / القارب"]
            observation = row["المشاهدات"]
            notes = row["الملاحظات"]

            if pd.isna(ship) and pd.isna(observation):
                continue

            observations.append({
                "id": obs_id,
                "date": str(date),
                "employee": str(employee),
                "time": str(time),
                "ship": str(ship),
                "observation": str(observation),
                "notes": str(notes)
            })

            obs_id += 1
            imported += 1

        add_log("system", "import_excel", f"تم استيراد {imported} صف")

        return jsonify({
            "success": True,
            "imported": imported
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "msg": str(e)
        }), 400


@app.route("/api/users")
def get_users():
    return jsonify(vts_users)


@app.route("/api/add-user", methods=["POST"])
def add_user():
    global user_id
    data = request.json

    user = {
        "id": user_id,
        "name": data["name"],
        "username": data["username"],
        "password": data["password"]
    }

    vts_users.append(user)
    add_log("system", "إضافة مستخدم", f"{user['username']}")
    user_id += 1

    return jsonify({"success": True, "user": user})


# إضافة endpoint لحذف المستخدم
@app.route("/api/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    global vts_users
    user_to_delete = next((u for u in vts_users if u["id"] == user_id), None)
    if not user_to_delete:
        return jsonify({"success": False, "msg": "المستخدم غير موجود"}), 404

    vts_users = [u for u in vts_users if u["id"] != user_id]
    add_log("system", "حذف مستخدم", f"{user_to_delete['username']}")
    return jsonify({"success": True})


@app.route("/api/logs")
def get_logs():
    return jsonify(logs)


if __name__ == "__main__":
    app.run(debug=True)