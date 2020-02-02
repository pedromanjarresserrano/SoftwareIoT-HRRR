
from datetime import datetime
import time


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

sesion = {
            "datos": {
                "RR": [],
                "HR": []
            }
        }
while True:
        print("READING " + str("port"))

        sesion["datos"]["RR"].append(
            {"RR": 750, "date": datetime.timestamp(datetime.now())})
          
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

            print("one")
            print(one)
            print("value")
            print(value)
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
            print("hr")
            print(hr)
            aux1 = filtra(x+1, aux)
            maxval = maximo(aux1)
            hr.append({"HR": maxval, "time": x+1})  

        time.sleep(1)
