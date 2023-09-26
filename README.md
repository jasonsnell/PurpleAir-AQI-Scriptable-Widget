# PurpleAir-AQI-Scriptable-Widget

<img src="https://sixcolors.com/wp-content/uploads/2021/08/new-aqi.jpg" width="600" />



Project operated by Jason Snell <jsnell@sixcolors.com> with enormous contributions from Matt Silverlock, Rob Silverii, Adam Lickel, Alexander Ogilvie, Brian Donovan, Jon Sadka, bennywij, and anonymous others!

## About this project

This project generates a widget that displays local air quality on the home screen of devices running iOS or iPadOS 14. It is displayed via the [Scriptable](https://scriptable.app) app by Simon Støvring.

The widget uses data from the [PurpleAir network](https://www2.purpleair.com) of low-cost, consumer air quality sensors. While in America the EPA has a large, established network of sensors, the nearest sensor to you may not be experiencing the same conditions as you are, especially in extreme events such as wildfires. This widget exists because the nearest EPA sensor to me (Jason Snell) did not accurately reflect my local air quality during heavy wildfire smoke conditions. You can [read more about the origin of this project](https://sixcolors.com/post/2020/08/how-bad-is-the-air-out-there/) if you like.

If you just want an app that does this, I recommend [Paku](http://paku.app). It's got a widget almost identical to this one, and you don't have to fuss with it! I wrote this widget before apps like Paku existed.

## How to use this

To use this widget, make a new script inside Scriptable and paste in the contents of `purpleair-aqi.js`. 

You can run the script from within the app, or add a new Small widget on your home screen, set it to Scriptable, and choose the script by tapping and holding on the widget, choosing Edit Widget, and choosing the script by tapping on the Script field. 

PurpleAir **has changed its API**. This widget now requires a PurpleAir API key. If you don't have one, you'll need to request one from <https://www2.purpleair.com/pages/contact-us> and enter your READ KEY in the API key variable in the script.

The widget is designed to use Location Services to find the nearest PurpleAir station to your location. If that's not working, you can specify a PurpleAir station manually by tapping and holding on the widget, choosing Edit Widget, and then entering the PurpleAir ID of the station you want to monitor in the Parameter field.

## How does this widget calculate AQI?

This widget uses an EPA calculation designed for low-cost sensors like PurpleAir in areas where wood smoke is an issue, such as during wildfires. You can [read about the backstory here](https://thebolditalic.com/understanding-purpleair-vs-airnow-gov-measurements-of-wood-smoke-pollution-562923a55226) and [see the EPA document here](https://cfpub.epa.gov/si/si_public_record_report.cfm?dirEntryId=349513&Lab=CEMM&simplesearch=0&showcriteria=2&sortby=pubDate&timstype=&datebeginpublishedpresented=08/25/2018).

PurpleAir refers to this calculation as **US EPA**, which you can choose from the Conversion popup on the PurpleAir web map.

## What matters more, the numbers or the words/colors?

The words and colors! The real point of AQI isn't the number, it's the level -- the words and color. But we all like numbers, so it displays a number too. Also, the widget does display a trend if one exists, so if you're in volatile conditions, you should be able to tell at a glance if your air quality is improving or worsening.
