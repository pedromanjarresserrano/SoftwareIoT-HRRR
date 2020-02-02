import serial
import random
from time import sleep

port = "COM4"
ser = serial.Serial(port, 9600)
while True: 
	num = random.randint(500,1150)
	ser.write((str(num)+"\n").encode())
	print ("x es",num)
	sleep(1)

ser.close()