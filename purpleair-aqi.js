// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: leaf;
"use strict";

/**
 * This widget is from <https://github.com/jasonsnell/PurpleAir-AQI-Scriptable-Widget>
 * By Jason Snell, Rob Silverii, Adam Lickel, Alexander Ogilvie, and Brian Donovan.
 * Based on code by Matt Silverlock.
 */

const API_URL = "https://api.purpleair.com/";

/**
 * This widget requires a PurpleAir API key. If you don't have one,
 * you'll need to request one from <https://www2.purpleair.com/pages/contact-us>
 * and enter your READ KEY in the API key variable below.
 */

const API_KEY = "your-api-key-goes-here";

/**
 * Find a nearby PurpleAir sensor ID via https://fire.airnow.gov/
 * Click a sensor near your location: the ID is the trailing integers
 * https://www.purpleair.com/json has all sensors by location & ID.
 * @type {number}
 */

const SENSOR_ID = args.widgetParameter;

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
 * @property {string} sfSymbol
 */

/**
 * @typedef {object} SensorData
 * @property {string} val
 * @property {string} adj
 * @property {number} ts
 * @property {string} hum
 * @property {string} loc
 * @property {string} lat
 * @property {string} lon
 */

/**
 * @typedef {object} LatLon
 * @property {number} latitude
 * @property {number} longitude
 */


/**
 * Get JSON from a local file
 *
 * @param {string} fileName
 * @returns {object}
 */
function getCachedData(fileName) {
  const fileManager = FileManager.local();
  const cacheDirectory = fileManager.joinPath(fileManager.libraryDirectory(), "jsnell-aqi");
  const cacheFile = fileManager.joinPath(cacheDirectory, fileName);

  if (!fileManager.fileExists(cacheFile)) {
    return undefined;
  }

  const contents = fileManager.readString(cacheFile);
  return JSON.parse(contents);
}

/**
 * Wite JSON to a local file
 *
 * @param {string} fileName
 * @param {object} data
 */
function cacheData(fileName, data) {
  const fileManager = FileManager.local();
  const cacheDirectory = fileManager.joinPath(fileManager.libraryDirectory(), "jsnell-aqi");
  const cacheFile = fileManager.joinPath(cacheDirectory, fileName);

  if (!fileManager.fileExists(cacheDirectory)) {
    fileManager.createDirectory(cacheDirectory);
  }

  const contents = JSON.stringify(data);
  fileManager.writeString(cacheFile, contents);
}



/**
 * Get the closest PurpleAir sensorId to the given location
 *
 * @returns {Promise<number>}
 */
async function getSensorId() {
  if (SENSOR_ID) return SENSOR_ID;

  let fallbackSensorId = undefined;

  try {
    const cachedSensor = getCachedData("sensor.json");
    if (cachedSensor) {
      console.log({ "Cached Sensor": cachedSensor });

      const { id, updatedAt } = cachedSensor;
      fallbackSensorId = id;
      // If we've fetched the location within the last 15 minutes, just return it
      if (Date.now() - updatedAt < 15 * 60 * 1000) {
        return id;
      }
    }

    /** @type {LatLon} */
    const { latitude, longitude } = await Location.current();

    const BOUND_OFFSET = 0.2;

    const nwLat = latitude + BOUND_OFFSET;
    const seLat = latitude - BOUND_OFFSET;
    const nwLng = longitude - BOUND_OFFSET;
    const seLng = longitude + BOUND_OFFSET;
    var req = new Request(
      `${API_URL}/v1/sensors?fields=name,latitude,longitude&max_age=3600&location_type=0&nwlat=${nwLat}&selat=${seLat}&nwlng=${nwLng}&selng=${seLng}`
    );
    req.headers = {"X-API-Key": API_KEY} ;

    const res = await req.loadJSON();
    const { data } = res;

    let closestSensor;
    let closestDistance = Infinity;

    for (const location of data) {
      const distanceFromLocation = haversine(
        { latitude, longitude },
        { latitude: location[2], longitude: location[3] }
      );
      if (distanceFromLocation < closestDistance) {
        closestDistance = distanceFromLocation;
        closestSensor = location;
      }
    }

    const [id, name, lat, long] = closestSensor;
    const typedSensor = { id, name, latitude: lat, longitude: long, updatedAt: Date.now() };
    console.log({ "Closest sensor": typedSensor });
    cacheData("sensor.json", typedSensor);

    return id;
  } catch (error) {
    console.log(`Could not fetch location: ${error}`);
    return fallbackSensorId;
  }
}

/**
 * Returns the haversine distance between start and end.
 *
 * @param {LatLon} start
 * @param {LatLon} end
 * @returns {number}
 */
function haversine(start, end) {
  const toRadians = (n) => (n * Math.PI) / 180;

  const deltaLat = toRadians(end.latitude - start.latitude);
  const deltaLon = toRadians(end.longitude - start.longitude);
  const startLat = toRadians(start.latitude);
  const endLat = toRadians(end.latitude);

  const angle =
    Math.sin(deltaLat / 2) ** 2 +
    Math.sin(deltaLon / 2) ** 2 * Math.cos(startLat) * Math.cos(endLat);

  return 2 * Math.atan2(Math.sqrt(angle), Math.sqrt(1 - angle));
}

/**
 * Fetch content from PurpleAir
 *
 * @param {number} sensorId
 * @returns {Promise<SensorData>}
 */

async function getSensorData(sensorId) {
  const sensorCache = `sensor-${sensorId}-data.json`;
  var req = new Request(`${API_URL}/v1/sensors/${sensorId}`);
  req.headers = {"X-API-Key": API_KEY} ;

  let json = await req.loadJSON();

  try {
    // Check that our results are what we expect
    if (json && json.sensor) {
      console.log(`Sensor data looks good, will cache.`);
      const sensorData = { json, updatedAt: Date.now() }
      cacheData(sensorCache, sensorData);
    } else {
      const { json: cachedJson, updatedAt } = getCachedData(sensorCache);
      if (Date.now() - updatedAt > 2 * 60 * 60 * 1000) {
        // Bail if our data is > 2 hours old
        throw `Our cache is too old: ${updatedAt}`;
      }
      console.log(`Using cached sensor data: ${updatedAt}`);
      json = cachedJson;
    }
    return {
      val: json.sensor,
      adj: json.sensor["pm2.5_cf_1"], // as of Sep 2023 Purple Air API has pm2.5_cf_1 at top level of JSON
      ts: json.sensor.last_seen,
      hum: json.sensor.humidity,
      loc: json.sensor.name,
      lat: json.sensor.latitude,
      lon: json.sensor.longitude,
    };
  } catch (error) {
    console.log(`Could not parse JSON: ${error}`);
    throw 666;
  }
}

/**
 * Fetch reverse geocode
 *
 * @param {string} lat
 * @param {string} lon
 * @returns {Promise<GeospatialData>}
 */
async function getGeoData(lat, lon) {
  const latitude = Number.parseFloat(lat);
  const longitude = Number.parseFloat(lon);

  const geo = await Location.reverseGeocode(latitude, longitude);
  console.log({ geo: geo });

  return {
    neighborhood: geo[0].subLocality,
    city: geo[0].locality,
    state: geo[0].administrativeArea,
  };
}

/**
 * Fetch a renderable location
 *
 * @param {SensorData} data
 * @returns {Promise<String>}
 */
async function getLocation(data) {
  try {
    if (args.widgetParameter) {
      return data.loc;
    }

    const geoData = await getGeoData(data.lat, data.lon);
    console.log({ geoData });

    if (geoData.neighborhood && geoData.city) {
        return `${geoData.neighborhood}, ${geoData.city}`;
    } else {
        return geoData.city || data.loc;
    }
  } catch (error) {
    console.log(`Could not cleanup location: ${error}`);
    return data.loc;
  }
}


/** @type {Array<LevelAttribute>} sorted by threshold desc. */
const LEVEL_ATTRIBUTES = [
  {
    threshold: 300,
    label: "Hazardous",
    startColor: "76205d",
    endColor: "521541",
    textColor: "f0f0f0",
    darkStartColor: "333333",
    darkEndColor: "000000",
    darkTextColor: "ce4ec5",
    sfSymbol: "aqi.high",
  },
  {
    threshold: 200,
    label: "Very Unhealthy",
    startColor: "9c2424",
    endColor: "661414",
    textColor: "f0f0f0",
    darkStartColor: "333333",
    darkEndColor: "000000",
    darkTextColor: "f33939",
    sfSymbol: "aqi.high",
  },
  {
    threshold: 150,
    label: "Unhealthy",
    startColor: "da5340",
    endColor: "bc2f26",
    textColor: "eaeaea",
    darkStartColor: "333333",
    darkEndColor: "000000",
    darkTextColor: "f16745",
    sfSymbol: "aqi.high",
  },
  {
    threshold: 100,
    label: "Unhealthy for Sensitive Groups",
    startColor: "f5ba2a",
    endColor: "d3781c",
    textColor: "1f1f1f",
    darkStartColor: "333333",
    darkEndColor: "000000",
    darkTextColor: "f7a021",
    sfSymbol: "aqi.medium",
  },
  {
    threshold: 50,
    label: "Moderate",
    startColor: "f2e269",
    endColor: "dfb743",
    textColor: "1f1f1f",
    darkStartColor: "333333",
    darkEndColor: "000000",
    darkTextColor: "f2e269",
    sfSymbol: "aqi.low",
  },
  {
    threshold: -20,
    label: "Good",
    startColor: "8fec74",
    endColor: "77c853",
    textColor: "1f1f1f",
    darkStartColor: "333333",
    darkEndColor: "000000",
    darkTextColor: "6de46d",
    sfSymbol: "aqi.low",
  },
];




/**
 * Get the EPA adjusted PPM
 *
 * @param {SensorData} sensorData
 * @returns {number} EPA adjustment for wood smoke and PurpleAir
 */
function computePM(sensorData) {
  const dataAverage = Number.parseInt(sensorData.adj, 10);
  const hum = Number.parseInt(sensorData.hum, 10);
  console.log(`PM2.5 number is ${dataAverage}.`)

  // now a piecewise formula, revised by EPA in October 2021 as described here https://cfpub.epa.gov/si/si_public_record_report.cfm?dirEntryId=353088&Lab=CEMM
  // direct download to PDF https://cfpub.epa.gov/si/si_public_file_download.cfm?p_download_id=544231&Lab=CEMM -- slide 26 has formula

  if (dataAverage < 30) {
    return 0.524*dataAverage - 0.0862*hum + 5.75;
    } else if (30 <= dataAverage && dataAverage < 50) {
      return (0.786 * (dataAverage/20 - 3/2) + 0.524*(1 - (dataAverage/20 - 3/2)))*dataAverage - 0.0862*hum + 5.75;
    } else if (50 <= dataAverage && dataAverage < 210) {
      return 0.786*dataAverage - 0.0862*hum + 5.75;  
    } else if (210 <= dataAverage && dataAverage < 260) {
      return (0.69*(dataAverage/50 - 21/5) + 0.786*(1 - (dataAverage/50 - 21/5)))*dataAverage - 0.0862*hum*(1 - (dataAverage/50 - 21/5)) + 2.966*(dataAverage/50 - 21/5) + 5.75*(1 - (dataAverage/50 - 21/5)) + 8.84*(10**-4)*dataAverage**2*(dataAverage/50 - 21/5);
    } else if (260 <= dataAverage) {    
      return 2.966 + 0.69*dataAverage + 8.84*10**-4*dataAverage**2; 
    }
  
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
    threshold = -Infinity,
    sfSymbol = "aqi.low",
  } = LEVEL_ATTRIBUTES.find(({ threshold }) => level > threshold) || {};

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
    sfSymbol,
  };
}

/**
 * Get the AQI trend
 *
 * @param {{ pm2.5: number; pm2.5_10minute: number; }} stats
 * @returns {string}
 */
function getAQITrend(stats) {
  const partLive = stats["pm2.5"];
  const partTime = stats["pm2.5_10minute"]
  const partDelta = partTime - partLive;
  if (partDelta > 5) return "arrow.down";
  if (partDelta < -5) return "arrow.up";
  return "";
}

/**
 * Constructs an SFSymbol from the given symbolName
 *
 * @param {string} symbolName
 * @param {number} fontSize
 * @returns {object} SFSymbol
 */
function createSymbol(symbolName, fontSize) {
  const symbol = SFSymbol.named(symbolName);
  symbol.applyFont(Font.systemFont(fontSize));
  return symbol;
}

async function run() {
  const listWidget = new ListWidget();
  listWidget.useDefaultPadding();

  try {
    if (!API_KEY || API_KEY === "your-api-key-goes-here") {
      throw `You need a PurpleAir API Key for this widget.`;
    }

    const sensorId = await getSensorId();

    if (!sensorId) {
      throw "Please specify a location for this widget.";
    }
    console.log(`Using sensor ID: ${sensorId}`);

    const data = await getSensorData(sensorId);

    const stats = data.val.stats;
    console.log({ stats });

    const aqiTrend = getAQITrend(stats);

    const epaPM = computePM(data);
    console.log({ epaPM });

    const aqi = aqiFromPM(epaPM);
    const level = calculateLevel(aqi);
    const aqiText = aqi.toString();
    console.log({ aqi });

    const sensorLocation = await getLocation(data)
    console.log({ sensorLocation });

    const startColor = Color.dynamic(new Color(level.startColor), new Color(level.darkStartColor));
    const endColor = Color.dynamic(new Color(level.endColor), new Color(level.darkEndColor));
    const textColor = Color.dynamic(new Color(level.textColor), new Color(level.darkTextColor));

    // BACKGROUND

    const gradient = new LinearGradient();
    gradient.colors = [startColor, endColor];
    gradient.locations = [0.0, 1];
    console.log({ gradient });

    listWidget.backgroundGradient = gradient;

    // HEADER

    const headStack = listWidget.addStack();
    headStack.layoutHorizontally();
    headStack.topAlignContent();
    headStack.setPadding (0,0,0,0);

    const textStack = headStack.addStack();
    textStack.layoutVertically();
    textStack.topAlignContent();
    textStack.setPadding (0,0,0,0);

    const header = textStack.addText('Air Quality'.toUpperCase());
    header.textColor = textColor;
    header.font = Font.regularSystemFont(11);
    header.minimumScaleFactor = 1;

    const wordLevel = textStack.addText(level.label);
    wordLevel.textColor = textColor;
    wordLevel.font = Font.semiboldSystemFont(25);
    wordLevel.minimumScaleFactor = 0.3;

    headStack.addSpacer();

    const statusSymbol = createSymbol(level.sfSymbol, 20);
    const statusImg = headStack.addImage(statusSymbol.image);
    statusImg.resizable = false;
    statusImg.tintColor = textColor;

    listWidget.addSpacer(0);

    // SCORE

    const scoreStack = listWidget.addStack();
    scoreStack.centerAlignContent()

    const content = scoreStack.addText(aqiText);
    content.textColor = textColor;
    content.font = Font.semiboldSystemFont(30);

    if (aqiTrend.length > 0) {
      scoreStack.addSpacer(4);

      const trendSymbol = createSymbol(aqiTrend, 15);
      const trendImg = scoreStack.addImage(trendSymbol.image);
      trendImg.resizable = false;
      trendImg.tintColor = textColor;
    }

    listWidget.addSpacer();

    // LOCATION

    const locationText = listWidget.addText(sensorLocation);
    locationText.textColor = textColor;
    locationText.font = Font.regularSystemFont(14);
    locationText.minimumScaleFactor = 0.5;

    listWidget.addSpacer(2);

    // UPDATED AT

    const updatedAt = new Date(data.ts * 1000).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    const widgetText = listWidget.addText(`Updated ${updatedAt}`);
    widgetText.textColor = textColor;
    widgetText.font = Font.regularSystemFont(8);
    widgetText.minimumScaleFactor = 0.5;

    // TAP HANDLER
    var purpleMapUrl = `https://www.purpleair.com/map?opt=1/i/mAQI/a10/cC5?key=${API_KEY}&select=${sensorId}#14/${data.lat}/${data.lon}`;
    listWidget.url = purpleMapUrl;
  } catch (error) {
    if (error === 666) {
      // Handle JSON parsing errors with a custom error layout

      listWidget.background = new Color('999999');
      const header = listWidget.addText('Error'.toUpperCase());
      header.textColor = new Color('000000');
      header.font = Font.regularSystemFont(11);
      header.minimumScaleFactor = 0.50;

      listWidget.addSpacer(15);

      const wordLevel = listWidget.addText(`Couldn't connect to the server.`);
      wordLevel.textColor = new Color ('000000');
      wordLevel.font = Font.semiboldSystemFont(15);
      wordLevel.minimumScaleFactor = 0.3;
    } else {
      console.log(`Could not render widget: ${error}`);

      const errorWidgetText = listWidget.addText(`${error}`);
      errorWidgetText.textColor = Color.red();
      errorWidgetText.textOpacity = 30;
      errorWidgetText.font = Font.regularSystemFont(10);
    }
  }

  if (config.runsInApp) {
    listWidget.presentSmall();
  }

  Script.setWidget(listWidget);
  Script.complete();
}

await run();
