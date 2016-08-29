---
title: Getting Started with Raspberry Pi
date: 2016-08-28T22:16:46-05:00
layout: post
---

I have watched Raspberry Pi projects and been fascinated with what you could do with a Pi since I listened to Ron Evans from the [Hybrid Group](http://hybridgroup.com/) talk about teaching kids ruby with a raspberry Pi at GoGaRuCo in 2011. And even with the ridiculously low price point of around $35 I waited 5 years to buy one. I will say that the version 3 is far more capable than the one that sparked the interest in 2011.

I ordered two and turned one into a [RetroPie](https://retropie.org.uk/) machine and the other I have been using to hack on and teach my son some basics about programming using python and the [SenseHat](https://www.raspberrypi.org/products/sense-hat/) that allows us to get readings for temperature, humidity, pressure, and orientation using gyroscope, magnetometer, and accelerometer. It also has an 8x8 LED matrix that is the really the highlight for the kids.

I will post a few of the goofy apps we wrote as well and some initial configuration that helped me out.

## Keyboard Support

The Pi defaults to a UK keyboard mapping which became a big deal when I couldn't use the `|` key. This was fixed by setting the keyboard layout with the `setxkbmap` command.

{% highlight shell %}
sudo setxkbmap -layout us
sudo udevadm trigger --subsystem-match --action=change
{% endhighlight %}

## 7" Touchscreen Support

The other purchase that came along with the Pi was a 7" LCD touchscreen. I didn't pay close enough attention when I got it that I was buying an off brand but it was half the price of the official touchscreen so I am not that worried since it seems to work, although it take some configuring. It was difficult to get the Pi to recognize the dimensions properly. I ended up having to put custom HDMI mode parameters in `/boot/config.txt`. Like I said this works withe off brand touchscreen so YMMV.

The following is the configuration needed:

{% highlight shell %}
# force a specific HDMI mode (here we are forcing 800x480!)
hdmi_group=2
hdmi_mode=1
hdmi_mode=87
hdmi_cvt=800 480 60 6 0 0 0

# give max current to the USB so you can power the screen from the Pi
max_usb_current=1
{% endhighlight %}

## Playing with the SenseHat

There is a great [python library](http://pythonhosted.org/sense-hat/) for interacting with the SenseHat. I was new to python so much of this was an experience to learn python as well as play with some new toys.

### Catching CTRL+C

One thing that bothered me as we first playing with the LEDs was that when you stop a running script it would persist the latest state of the LEDs. This could be annoying if you weren't going to be running a script immediately and the bright LEDs were blaring on. So the first thing we did was catch the `SIGINT` signal and do something a little more graceful.

{% highlight python %}
import signal
import sys

def exit_gracefully(signal, frame):
  sense.clear()
  sys.exit(0)
signal.signal(signal.SIGINT, exit_gracefully)
{% endhighlight %}

We will use this in all of our scripts that output to the LEDs.

### Bar Graph the Axes

{% highlight python %}
import time
import signal
import sys

from sense_hat import SenseHat
sense = SenseHat()

def exit_gracefully(signal, frame):
  sense.clear()
  sys.exit(0)
signal.signal(signal.SIGINT, exit_gracefully)

red = (255, 0, 0)
green = (0, 255, 0)
blue = (0, 0, 255)
black = (0, 0, 0)

sense.set_rotation(270)
sense.low_light = True

def convert(deg):
  deg = int(deg)
  q = deg / 90
  r = deg % 90
  if (q % 2 == 1):
    r = 90 - r
  return int(r * (8.0/90))

while True:
  orientation = sense.orientation
  x = convert(orientation['pitch'])
  y = convert(orientation['roll'])
  z = convert(orientation['yaw'])

  grid = []

  grid += ([red] * x + [black] * (8-x)) * 2
  grid += [black] * 8
  grid += ([green] * y + [black] * (8-y)) * 2
  grid += [black] * 8
  grid += ([blue] * z + [black] * (8-z)) * 2

  sense.set_pixels(grid)

  time.sleep(0.2)
{% endhighlight %}
