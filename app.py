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

ser = {}
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
    arrayhr = array["HR"]
    arrayrr = array["RR"]
    counthr = len(arrayhr)
    countrr = len(arrayrr)
    if countrr > 0 and counthr > 0:
        hr = 0
        rr = 0
        maxhr = 0
        maxrr = 0

        minhr = arrayhr[0]["HR"]
        minrr = arrayrr[0]["RR"]

        auxhr = []
        auxrr = []

        count50 = 0

        statusrr = "LOW"
        statussdrr = "LOW"
        statusprr50 = "LOW"

        for x in range(counthr):
            value = arrayhr[x]["HR"]
            auxhr.append(value)
            hr += value
            if maxhr < value:
                maxhr = value
            if minhr > value:
                minhr = value

        for x in range(countrr):
            value = arrayrr[x]["RR"]
            auxrr.append(value)
            rr += value

            if maxrr < value:
                maxrr = value

            if minrr > value:
                minrr = value

            if x < countrr-1 and (arrayrr[x+1]["RR"] - value) > 50:
                count50 += 1

        avghr = hr/counthr
        avgrr = rr/countrr
        prr50 = (count50*100)/(countrr-1)

        stdevrr = statistics.stdev(auxrr)

        if avgrr < 750:
            statusrr = "HIGH"

        if avgrr >= 750 and avgrr <= 900:
            statusrr = "HIGH"

        if stdevrr < 50:
            statusrr = "HIGH"

        if stdevrr >= 50 and avgrr <= 100:
            statusrr = "MODERATE"


        if prr50 < 3:
            statusprr50 = "HIGH"



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
                    "hr": statistics.stdev(auxhr) if len(auxhr) > 1  else 0,
                    "rr": stdevrr
                },
                "prr50": prr50,
                "status": {
                    "avgrr": statusrr,
                    "sdrr": statussdrr,
                    "prr50": statusprr50
                }
            }
    else:
        return {}


@app.route("/api/sesion/cluster",  methods=['GET'])
def sesionGetCluster():
    sesion = db.sesiones.find_one({
        "_id": ObjectId(request.args.get('id'))
    })
    datos = sesion["datos"]["RR"]
    aux = []
    for d in datos:
        aux.append([d["RR"], d["date"]])
    kmeans = KMeans(n_clusters=2)
    kmeans.fit(aux)
    return dumps(kmeans.cluster_centers_)


@app.route("/api/begin",  methods=['POST'])
def begin():
    global ser
    sesion_id = str(db.sesiones.insert_one({
        "nombre": request.form["nombre"],
        "descripcion": request.form["descripcion"],
        "sensor_id": request.form["sensor_id"],
        "datos": {
            "HR":[],
            "RR":[]
        }
    }).inserted_id)
    sensores = db.sensores
    sensor = sensores.find_one({"_id": ObjectId(request.form["sensor_id"])})
    x = threading.Thread(target=beginSessionCapture,
                         args=(sesion_id, sensor["puerto"],))
    x.start()
    Tasking.sesioneslist.append(Tasking(sesion_id, x, ser))
    return jsonify({"session_id": str(sesion_id)})

@app.route("/api/running",  methods=['GET'])
def running():
    running = []
    for task in Tasking.sesioneslist:
        running.append(task.sesion)
    return jsonify(running)



@app.route("/api/stop",  methods=['POST'])
def stopSesion():
    sesion_id = request.form["sesion_id"]
    aux ={}
    for task in Tasking.sesioneslist:
        if task.sesion == sesion_id:
            aux = task
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
    Tasking.sesioneslist.remove(aux)
    return jsonify({"session_id": str(sesion_id)})


def beginSessionCapture(sesion_id, port):
    global ser
    ser = serial.Serial(port, 9600)
    sesiones = db.sesiones
    while True:
        print("READING " + str(port))
        line = ser.readline() 
       	print ("line es",line)
        sesion = sesiones.find_one({
            "_id": ObjectId(sesion_id)
        })
        sesion["datos"]["RR"].append(
            {"RR": float(line.decode()), "date": datetime.timestamp(datetime.now())})
        one = 60000
        count = 0
        hr = []
        timecount = 1
        array = sesion["datos"]["RR"]
        countlen = len(array)
        aux = []
        value = 0
        for x in range(countlen):
            value +=  array[x]["RR"]
            if value <= one :
                count += 1
                aux.append({"HR": count, "time": timecount})
            else:
                count +=1
                one += 60000
                aux.append({"HR": count, "time": timecount})
                count = 1
                timecount += 1

        for x in range(timecount):
            aux1 = filtra(x+1, aux)
            maxval = maximo(aux1)
            hr.append({"HR": maxval, "time": x+1})  


        sesion["datos"]["HR"] = hr

        sesiones.update_one({
            "_id": ObjectId(sesion_id)
        }, {
            "$set": sesion
        })
        time.sleep(1)


def filtra(times , lista):
    aux = []

    for x in lista:
        if x["time"] == times:
            aux.append(x)
    return aux
    
def maximo(array):
    maximo = 0
    for x in array:
        if x["HR"] > maximo:
            maximo = x["HR"]

    return maximo

class Tasking:

    sesioneslist = []

    def __init__(self, sesion_id, thread, serial):
        self.sesion = sesion_id
        self.thread = thread
        self.serial = serial

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
