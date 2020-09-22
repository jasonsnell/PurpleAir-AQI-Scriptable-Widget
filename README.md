# PurpleAir-AQI-Scriptable-Widget

By Jason Snell <jsnell@sixcolors.com>... 

...and many others, including Matt Silverlock (whose code was the initial inspiration for this), Rob Silverii (who added the gradients and themes per AQI level), and Adam Lickel (who added some better JavaScript formatting and moved stuff into functions.)

This script is meant to be used inside scriptable.app to generate iOS home screen widgets.

It uses the PurpleAir network (purpleair.com) to display your local air quality, including AQI rating and trend.

It's using a draft adjustment from the EPA for low-cost sensors like PurpleAir in areas where wood smoke is an issue, such as those affected by smoke from wildfires.

<https://cfpub.epa.gov/si/si_public_record_report.cfm?dirEntryId=349513&Lab=CEMM&simplesearch=0&showcriteria=2&sortby=pubDate&timstype=&datebeginpublishedpresented=08/25/2018>

To use it, make a new script inside the Scriptable and paste it in. You can run from within the app, or add a new Small widget on your home screen, set it to Scriptable, choose this script, and enter the sensor ID from a nearby PurpleAir sensor in the Parameter field.

To find a sensor ID, go to the PurpleAir map and tap or click on a station near you. The URL in your browser should change to the new selection. A four- or five-digit number will appear just after "select=" and that's the number to enter in to the Parameter field.

Read more about the origin of this project at:

https://sixcolors.com/post/2020/08/how-bad-is-the-air-out-there/

