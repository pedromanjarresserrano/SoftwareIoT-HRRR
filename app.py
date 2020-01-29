from flask import Flask, jsonify, request
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.json_util import dumps
import threading
import datetime
import time
import serial
import ctypes

app = Flask(__name__)
app.config["MONGO_URI"] = "mongodb://localhost:27017/aeropuerto"
db = MongoClient('localhost', 27017).aeropuerto


@app.route("/api/sensor",  methods=['POST'])
def sensor():
    sensor_id = db.sensores.insert_one({
        "nombre": request.form["nombre"],
        "descripcion": request.form["descripcion"],
        "puerto": request.form["puerto"]
    }).inserted_id

    return jsonify({"restult": "Sensor create" + str(sensor_id)})


@app.route("/api/sensor",  methods=['GET'])
def sensorFind():
    sensor = db.sensores.find_one({
        "_id": ObjectId(request.form["id"])
    })
    return dumps(sensor)

@app.route("/api/sensors",  methods=['GET'])
def sensorFindAll():
    sensors = db.sensores.find({})
    return dumps(sensors)

@app.route("/api/sesion",  methods=['GET'])
def sensioFind():
    sesion = db.sesiones.find_one({
        "_id": ObjectId(request.form["id"])
    })
    return dumps(sesion)

@app.route("/api/sensors",  methods=['GET'])
def sensorFindAll():
    sessions = db.sesione.find({})
    return dumps(sessions)



@app.route("/api/begin",  methods=['POST'])
def begin():
    sesion_id = str(db.sesiones.insert_one({
        "nombre": request.form["nombre"],
        "descripcion": request.form["descripcion"],
        "sensor_id": request.form["sensor_id"],
        "datos": []
    }).inserted_id)
    sensores = db.sensores
    sensor = sensores.find_one({"_id": ObjectId(request.form["sensor_id"])})
    x = threading.Thread(target=beginSessionCapture,
                         args=(sesion_id, sensor["puerto"],))

    Tasking.sesioneslist.append(Tasking(sesion_id, x))
    x.start()
    return jsonify({"session_id": str(sesion_id)})


@app.route("/api/stop",  methods=['POST'])
def stopSesion():
    sesion_id = request.form["sesion_id"]
    for task in Tasking.sesioneslist:
        if task.sesion == sesion_id:
            task.stop()

    return jsonify({"session_id": str(sesion_id)})


def beginSessionCapture(sesion_id, port):
    # ser = serial.Serial(port, 9600)
    sesiones = db.sesiones
    while True:
        print("READING" + str(port))
        sesion = sesiones.find_one({
            "_id": ObjectId(sesion_id)
        })
        sesion["datos"].append({"HR": 1000, "RR": 200})
        sesiones.update_one({
            "_id": ObjectId(sesion_id)
        }, {
            "$set": sesion
        })
        time.sleep(1)
    # ser.close()


class Tasking:

    sesioneslist = []

    def __init__(self, sesion_id, thread):
        self.sesion = sesion_id
        self.thread = thread

    def stop(self):
        print("Killing")
        terminate(self.thread)


def terminate(t):
    """Terminate thread.

    :param threading.Thread t: thread object
    """
    exec = ctypes.py_object(SystemExit)
    res = ctypes.pythonapi.PyThreadState_SetAsyncExc(
        ctypes.c_long(t.ident), exec)
    if res == 0:
        print("thread not found!")
    elif res > 1:
        ctypes.pythonapi.PyThreadState_SetAsyncExc(
            ctypes.c_long(t.ident), None)


if __name__ == '__main__':
    app.run(debug=True)
