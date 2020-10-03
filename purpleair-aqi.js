"use strict";

/**
 * This code is from <https://github.com/jasonsnell/PurpleAir-AQI-Scriptable-Widget>
 * By Jason Snell based on code by Matt Silverlock, Rob Silverii, Adam Lickel, Alexander Ogilvie
 */

const API_URL = "https://www.purpleair.com/json?show=";

/**
 * Find a nearby PurpleAir sensor ID via https://fire.airnow.gov/
 * Click a sensor near your location: the ID is the trailing integers
 * https://www.purpleair.com/json has all sensors by location & ID.
 * @type {string}
 */
const SENSOR_ID = args.widgetParameter || "69223";

/**
 * Widget attributes: AQI level threshold, text label, gradient start and end colors, text color
 *
 * @typedef {object} LevelAttribute
 * @property {number} threshold
 * @property {string} label
 * @property {string} startColor
 * @property {string} endColor
 * @property {string} textColor
 * @property {string} darkStartColor
 * @property {string} darkEndColor
 * @property {string} darkTextColor
 */

/**
 * @typedef {object} SensorData
 * @property {string} val
 * @property {string} adj1
 * @property {string} adj2
 * @property {number} ts
 * @property {string} hum
 * @property {string} loc
 * @property {string} lat
 * @property {string} lon
 */

/**
 * Fetch content from PurpleAir
 *
 * @param {string} url
 * @param {string} id
 * @returns {Promise<SensorData>}
 */
async function getSensorData(url, id) {
  const req = new Request(`${url}${id}`);
  const json = await req.loadJSON();

  return {
    val: json.results[0].Stats,
    adj1: json.results[0].pm2_5_cf_1,
    adj2: json.results[1].pm2_5_cf_1,
    ts: json.results[0].LastSeen,
    hum: json.results[0].humidity,
    loc: json.results[0].Label,
    lat: json.results[0].Lat,
    lon: json.results[0].Lon,
  };
}

/** @type {Array<LevelAttribute>} sorted by threshold desc. */
const LEVEL_ATTRIBUTES = [
  {
    threshold: 300,
    label: "Hazardous",
    startColor: "9e2043",
    endColor: "7e0023",
    textColor: "ffffff",
    darkStartColor: "9e2043",
    darkEndColor: "7e0023",
    darkTextColor: "bbbbbb",
  },
  {
    threshold: 200,
    label: "Very Unhealthy",
    startColor: "edc4ff",
    endColor: "edc4ff",
    textColor: "8f3f97",
    darkStartColor: "8f3f97",
    darkEndColor: "6f1f77",
    darkTextColor: "ffffff",
  },
  {
    threshold: 150,
    label: "Unhealthy",
    startColor: "FF3D3D",
    endColor: "D60000",
    textColor: "000000",
    darkStartColor: "820a00",
    darkEndColor: "530500",
    darkTextColor: "999999",
  },
  {
    threshold: 100,
    label: "Unhealthy for Sensitive Groups",
    startColor: "facc00",
    endColor: "faa003",
    textColor: "000000",
    darkStartColor: "333333",
    darkEndColor: "000000",
    darkTextColor: "ff7600",
  },
  {
    threshold: 50,
    label: "Moderate",
    startColor: "ffff00",
    endColor: "dddd00",
    textColor: "000000",
    darkStartColor: "333333",
    darkEndColor: "000000",
    darkTextColor: "ffff00",
  },
  {
    threshold: -20,
    label: "Good",
    startColor: "00ff00",
    endColor: "00bb00",
    textColor: "000000",
    darkStartColor: "005500",
    darkEndColor: "003300",
    darkTextColor: "ffffff",
  },
];


/**
 * Get the EPA adjusted PPM
 *
 * @param {SensorData} sensorData
 * @returns {number} EPA draft adjustment for wood smoke and PurpleAir from https://cfpub.epa.gov/si/si_public_record_report.cfm?dirEntryId=349513&Lab=CEMM&simplesearch=0&showcriteria=2&sortby=pubDate&timstype=&datebeginpublishedpresented=08/25/2018
 */
function computePM(sensorData) {
  const adj1 = Number.parseInt(sensorData.adj1, 10);
  const adj2 = Number.parseInt(sensorData.adj2, 10);
  const hum = Number.parseInt(sensorData.hum, 10);
  const dataAverage = (adj1 + adj2) / 2;

  return 0.52 * dataAverage - 0.085 * hum + 5.71;
}

/**
 * Get AQI number from PPM reading
 *
 * @param {number} pm
 * @returns {number|'-'}
 */
function aqiFromPM(pm) {
  if (pm > 350.5) return calculateAQI(pm, 500.0, 401.0, 500.0, 350.5);
  if (pm > 250.5) return calculateAQI(pm, 400.0, 301.0, 350.4, 250.5);
  if (pm > 150.5) return calculateAQI(pm, 300.0, 201.0, 250.4, 150.5);
  if (pm > 55.5) return calculateAQI(pm, 200.0, 151.0, 150.4, 55.5);
  if (pm > 35.5) return calculateAQI(pm, 150.0, 101.0, 55.4, 35.5);
  if (pm > 12.1) return calculateAQI(pm, 100.0, 51.0, 35.4, 12.1);
  if (pm >= 0.0) return calculateAQI(pm, 50.0, 0.0, 12.0, 0.0);
  return "-";
}

/**
 * Calculate the AQI number
 *
 * @param {number} Cp
 * @param {number} Ih
 * @param {number} Il
 * @param {number} BPh
 * @param {number} BPl
 * @returns {number}
 */
function calculateAQI(Cp, Ih, Il, BPh, BPl) {
  const a = Ih - Il;
  const b = BPh - BPl;
  const c = Cp - BPl;
  return Math.round((a / b) * c + Il);
}

/**
 * Calculates the AQI level
 * based on https://cfpub.epa.gov/airnow/index.cfm?action=aqibasics.aqi#unh
 *
 * @param {number|'-'} aqi
 * @returns {LevelAttribute & { level: number }}
 */
function calculateLevel(aqi) {
  const level = Number(aqi) || 0;

  const {
    label = "Weird",
    startColor = "white",
    endColor = "white",
    textColor = "black",
    darkStartColor = "009900",
    darkEndColor = "007700",
    darkTextColor = "000000",
    threshold,
  } = LEVEL_ATTRIBUTES.find(({ threshold }) => level > threshold);

  return {
    label,
    startColor,
    endColor,
    textColor,
    darkStartColor,
    darkEndColor,
    darkTextColor,
    threshold,
    level,
  };
}

/**
 * Get the AQI trend
 *
 * @param {{ v1: number; v3: number; }} stats
 * @returns {string}
 */
function getAQITrend({ v1: partLive, v3: partTime }) {
  const partDelta = partTime - partLive;
  if (partDelta > 5) return "arrow.down";
  if (partDelta < -5) return "arrow.up";
  return "arrow.left.and.right";
}

async function run() {
  const listWidget = new ListWidget();
  listWidget.setPadding(10, 15, 10, 10);

  try {
    console.log(`Using sensor ID: ${SENSOR_ID}`);

    const data = await getSensorData(API_URL, SENSOR_ID);
    const stats = JSON.parse(data.val);
    console.log(stats);

    const aqiTrend = getAQITrend(stats);
    console.log(aqiTrend);

    const epaPM = computePM(data);
    console.log(`EPA PM is ${epaPM}`);

    const aqi = aqiFromPM(epaPM);
    const level = calculateLevel(aqi);
    const aqiText = aqi.toString();
    console.log(`AQI is ${aqi}`);

    const isDarkMode = Device.isUsingDarkAppearance();

    const startColor = new Color(
      isDarkMode ? level.darkStartColor : level.startColor
    );
    const endColor = new Color(
      isDarkMode ? level.darkEndColor : level.endColor
    );
    const textColor = new Color(
      isDarkMode ? level.darkTextColor : level.textColor
    );
    const gradient = new LinearGradient();

    console.log(`${isDarkMode ? "dark" : "light"} mode`);

    gradient.colors = [startColor, endColor];
    gradient.locations = [0.0, 1];
    console.log(gradient);

    listWidget.backgroundGradient = gradient;

    const header = listWidget.addText(`Air Quality`);
    header.textColor = textColor;
    header.font = Font.regularSystemFont(14);

    listWidget.addSpacer(5);

    if (listWidget.addStack) {
      const scoreStack = listWidget.addStack()

      const content = scoreStack.addText(aqiText);
      content.textColor = textColor;
      content.font = Font.mediumSystemFont(30);

      const trendSymbol = createSymbol(aqiTrend);
      const trendImg = scoreStack.addImage(trendSymbol.image);
      trendImg.resizable = false;
      trendImg.tintColor = textColor;
      trendImg.imageSize = new Size(30, 38);
    } else {
      const content = listWidget.addText(aqiText);
      content.textColor = textColor;
      content.font = Font.mediumSystemFont(30);
    }

    const wordLevel = listWidget.addText(level.label);
    wordLevel.textColor = textColor;
    wordLevel.font = Font.semiboldSystemFont(24);
    wordLevel.minimumScaleFactor = 0.3;

    listWidget.addSpacer(10);

    const location = listWidget.addText(data.loc);
    location.textColor = textColor;
    location.font = Font.regularSystemFont(13);
    location.minimumScaleFactor = 0.5;

    const updatedAt = new Date(data.ts * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const widgetText = listWidget.addText(`Updated ${updatedAt}`);
    widgetText.textColor = textColor;
    widgetText.font = Font.regularSystemFont(10);
    widgetText.minimumScaleFactor = 0.5;


    const purpleMapUrl = `https://www.purpleair.com/map?opt=1/i/mAQI/a10/cC0&select=${SENSOR_ID}#14/${data.lat}/${data.lon}`;
    listWidget.url = purpleMapUrl;
  } catch (error) {
    console.log(error);

    const errorWidgetText = listWidget.addText(`${error}`);
    errorWidgetText.textColor = Color.red();
    errorWidgetText.textOpacity = 30;
    errorWidgetText.font = Font.regularSystemFont(10);
  }

  if (config.runsInApp) {
    listWidget.presentSmall();
  }

  Script.setWidget(listWidget);
  Script.complete();
}

await run();





function createSymbol(name) {
  const font = Font.systemFont(20)
  const sym = SFSymbol.named(name)
  sym.applyFont(font)
  return sym
}
