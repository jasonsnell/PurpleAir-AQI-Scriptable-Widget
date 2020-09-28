# PurpleAir-AQI-Scriptable-Widget

<img src="https://raw.githubusercontent.com/jasonsnell/PurpleAir-AQI-Scriptable-Widget/main/widget.jpg alt="Widget in action" width="500" />

By Jason Snell <jsnell@sixcolors.com>

With contributions by many others, including Matt Silverlock (whose code was the initial inspiration for this), Rob Silverii (who added the gradients and themes per AQI level), and Adam Lickel (who added some better JavaScript formatting and moved stuff into functions).

## About this project

This script is meant to be used inside [Scriptable](https://scriptable.app) to generate iOS home screen widgets.

It uses data from the [PurpleAir network](https://www2.purpleair.com) of low-cost, consumer air quality sensors to display your local air quality, including AQI rating and trend.

## Why doesn't this widget match what I see on PurpleAir's map?

Standard AQI calculations were made with certain assumptions in place, including a goal of understanding industrial smog and and the use of expensive particle detectors. They were also meant to reflect long-term readings.

This widget using a draft adjustment from the EPA for more immediate readings from low-cost sensors like PurpleAir in areas where wood smoke is an issue, such as those affected by smoke from wildfires.

You can [read about the backstory here](https://thebolditalic.com/understanding-purpleair-vs-airnow-gov-measurements-of-wood-smoke-pollution-562923a55226).

This widget uses the draft EPA calculation [detailed in this document](https://cfpub.epa.gov/si/si_public_record_report.cfm?dirEntryId=349513&Lab=CEMM&simplesearch=0&showcriteria=2&sortby=pubDate&timstype=&datebeginpublishedpresented=08/25/2018).

As of this writing, the [AQandU](https://climatechange.ucdavis.edu/what-can-i-do/making-sense-of-air-quality-sensors-an-aqi-explainer/) calculation on PurpleAir is going to give you a reading that's more accurate than the default. I hope the new EPA calc will appear on PurpleAir soon.

## Do I need to sweat the numbers?

You don't. Earlier versions of this widget had a larger display for the numbers and a smaller display for the condition level, but the real point of AQI isn't a precise number, it's getting the level -- the words and color -- in the right zone.

But we all like numbers, so it displays a number too. Also, the widget does display a trend if one exists, so if you're in volatile conditions, you should be able to tell at a glance if your air quality is improving or worsening. I found this very useful during a recent set of wildfires in my area.

## How to use this

To use it, make a new script inside the Scriptable and paste in the contents of purpleair-aqi.js. 

You can run the script from within the app, or add a new Small widget on your home screen, set it to Scriptable, choose the script, and enter the sensor ID from a nearby PurpleAir sensor in the Parameter field.

## Finding a sensor ID

To find a sensor ID, go to the PurpleAir map and tap or click on a station near you. The URL in your browser should change to the new selection. A four- or five-digit number will appear just after "select=" and that's the number to enter in to the Parameter field.

## The backstory

You can [read more about the origin of this project](https://sixcolors.com/post/2020/08/how-bad-is-the-air-out-there/) if you like.



