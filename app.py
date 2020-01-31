from flask import Flask, jsonify, request, render_template
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.json_util import dumps
import threading
from datetime import datetime
import time
import serial
import ctypes
import numpy as np
from sklearn.cluster import KMeans
import statistics

app = Flask(__name__)
app.config["MONGO_URI"] = "mongodb://localhost:27017/aeropuerto"
db = MongoClient('localhost', 27017).aeropuerto


@app.route("/",  methods=['GET'])
def mainRoute():
    return render_template('index.html')


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
        "_id": ObjectId(request.args.get('id'))
    })
    return dumps(sensor)


@app.route("/api/sensors",  methods=['GET'])
def sensorFindAll():
    sensors = db.sensores.find({})
    return dumps(sensors)


@app.route("/api/sesiones",  methods=['GET'])
def sesionFindAll():
    sesiones = db.sesiones.find({})
    return dumps(sesiones)

@app.route("/api/sesion",  methods=['GET'])
def sensioFind():
    sesion = db.sesiones.find_one({
        "_id": ObjectId(request.args.get('id'))
    })

    return dumps({
        "_id": sesion["_id"],
        "nombre": sesion["nombre"],
        "descripcion": sesion["descripcion"],
        "sensor_id": sesion["sensor_id"],
        "datos": sesion["datos"],
        "extras": getExtras(sesion["datos"])
    })


def getExtras(array):
    counta = len(array)
    hr = 0
    rr = 0
    maxhr = 0
    maxrr = 0

    minhr = array[0]["HR"]
    minrr = array[0]["RR"]

    auxhr = []
    auxrr = []

    count50 = 0

    statusrr = "LOW"
    statussdrr = "LOW"
    statusprr50 = "LOW"

    for x in range(counta):

        auxhr.append(array[x]["HR"])
        auxrr.append(array[x]["RR"])
        hr += array[x]["HR"]
        rr += array[x]["RR"]

        if maxhr < array[x]["HR"]:
            maxhr = array[x]["HR"]

        if maxrr < array[x]["RR"]:
            maxrr = array[x]["RR"]

        if minhr > array[x]["HR"]:
            minhr = array[x]["HR"]

        if minrr > array[x]["RR"]:
            minrr = array[x]["RR"]

        if x < counta-1 and (array[x+1]["RR"] - array[x]["RR"]) > 50:
            count50 += 1

    avghr = hr/counta
    avgrr = rr/counta
    prr50 = (count50*100)/(counta-1)

    stdevrr = statistics.stdev(auxrr)

    if avgrr < 750:
        statusrr = "HIGH"

    if avgrr >= 750 and avgrr <= 900:
        statusrr = "HIGH"

    if stdevrr < 50:
        statusrr = "HIGH"

    if stdevrr >= 50 and avgrr <= 100:
        statusrr = "MODERATE"

    return {
        "promedios": {"hr": avghr,
                      "rr": avgrr},
        "max": {
            "hr": maxhr,
            "rr": maxrr},
        "min": {
            "hr": minhr,
            "rr": minrr},
        "stdev": {
            "hr": statistics.stdev(auxhr),
            "rr": stdevrr
        },
        "prr50": prr50,
        "status": {
            "avgrr": statusrr,
            "sdrr": statussdrr,
            "prr50": statusprr50
        }
    }


@app.route("/api/sesion/cluster",  methods=['GET'])
def sesionGetCluster():
    sesion = db.sesiones.find_one({
        "_id": ObjectId(request.args.get('id'))
    })
    datos = sesion["datos"]
    aux = []
    for d in datos:
        aux.append([d["HR"], d["RR"]])
    kmeans = KMeans(n_clusters=2)
    kmeans.fit(aux)
    return dumps(kmeans.cluster_centers_)


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
            sesion = db.sesiones.find_one({
                "_id": ObjectId(sesion_id)
            })

            db.sesiones.update_one({
                "_id": ObjectId(sesion_id)
            }, {
                "$set": {
                    "extras": getExtras(sesion["datos"])
                }
            })

    return jsonify({"session_id": str(sesion_id)})


def beginSessionCapture(sesion_id, port):
    # ser = serial.Serial(port, 9600)
    sesiones = db.sesiones
    while True:
        print("READING " + str(port))
        sesion = sesiones.find_one({
            "_id": ObjectId(sesion_id)
        })
        sesion["datos"].append(
            {"HR": 1000, "RR": 200, "date": datetime.timestamp(datetime.now())})
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
