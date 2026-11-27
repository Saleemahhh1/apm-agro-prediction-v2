const FPMA_BASE = "https://fpma.fao.org/giews/v4/global/price_module/api/v1";

export const COUNTRY_ISO3 = Object.freeze({
  "Nigeria":"NGA","United States":"USA","United Kingdom":"GBR","Ghana":"GHA","Kenya":"KEN","South Africa":"ZAF","India":"IND","Canada":"CAN","Australia":"AUS","New Zealand":"NZL",
  "Germany":"DEU","France":"FRA","Italy":"ITA","Spain":"ESP","Netherlands":"NLD","Ireland":"IRL","Portugal":"PRT","Belgium":"BEL","Austria":"AUT","Switzerland":"CHE",
  "China":"CHN","Japan":"JPN","South Korea":"KOR","Singapore":"SGP","Malaysia":"MYS","Indonesia":"IDN","Philippines":"PHL","Thailand":"THA","Vietnam":"VNM","Pakistan":"PAK","Bangladesh":"BGD","Sri Lanka":"LKA",
  "United Arab Emirates":"ARE","Saudi Arabia":"SAU","Qatar":"QAT","Kuwait":"KWT","Egypt":"EGY","Morocco":"MAR","Algeria":"DZA","Tunisia":"TUN","Ethiopia":"ETH","Uganda":"UGA","Tanzania":"TZA","Rwanda":"RWA",
  "Senegal":"SEN","Côte d’Ivoire":"CIV","Cameroon":"CMR","Benin":"BEN","Togo":"TGO","Burkina Faso":"BFA","Niger":"NER","Mali":"MLI","Guinea":"GIN","Sierra Leone":"SLE","Liberia":"LBR","Gambia":"GMB",
  "Botswana":"BWA","Namibia":"NAM","Zambia":"ZMB","Zimbabwe":"ZWE","Brazil":"BRA","Mexico":"MEX","Argentina":"ARG","Chile":"CHL","Colombia":"COL","Peru":"PER","Turkey":"TUR","Russia":"RUS","Ukraine":"UKR",
  "Poland":"POL","Sweden":"SWE","Norway":"NOR","Denmark":"DNK","Finland":"FIN","Greece":"GRC","Romania":"ROU","Hungary":"HUN","Czechia":"CZE","Czech Republic":"CZE","Israel":"ISR","Iraq":"IRQ","Afghanistan":"AFG","Nepal":"NPL","Myanmar":"MMR","Cambodia":"KHM","Laos":"LAO","Papua New Guinea":"PNG","Madagascar":"MDG","Mozambique":"MOZ","Malawi":"MWI"
});

export const COMMODITIES = Object.freeze([
  { id:"rice", label:"Rice", match:/rice/i },
  { id:"maize", label:"Maize", match:/maize|corn/i },
  { id:"beans", label:"Beans", match:/beans?|cowpeas?|pulses/i },
  { id:"potato", label:"Potatoes", match:/potatoes?|potato/i },
  { id:"fertilizer", label:"Fertilizer", match:null, unsupported:true }
]);

const asArray = value => Array.isArray(value) ? value : [];
const asText = value => typeof value === "string" ? value : (value?.name || value?.label || "");
const choosePeriod = series => {
  const options = asArray(series.periodicity).map(item => typeof item === "string" ? item : item?.period).filter(Boolean);
  return ["daily","weekly","monthly"].find(period => options.includes(period)) || options[0] || "monthly";
};
const latestPoint = points => asArray(points)
  .filter(point => Number.isFinite(Number(point.price_value)) && Number(point.price_value) > 0 && point.date)
  .sort((a,b) => String(b.date).localeCompare(String(a.date)))[0] || null;

async function fetchJson(url, fetchImpl) {
  const response = await fetchImpl(url, { headers:{Accept:"application/json"}, signal:AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`FAO FPMA returned HTTP ${response.status}`);
  return response.json();
}

export async function getRegionalCommodityPrices({ country, state = "", currencyCode = "", fetchImpl = fetch }) {
  const iso3 = COUNTRY_ISO3[country];
  if (!iso3) {
    return { country, currencyCode, source:"FAO GIEWS FPMA", updatedAt:null, commodities:COMMODITIES.map(item => ({ id:item.id,label:item.label,status:"unavailable",records:[],message:"This country is not currently mapped to the FAO market-price catalogue." })) };
  }

  const query = new URLSearchParams({ iso3_country_codes:iso3, newerThan:"2023-01-01", page_size:"250" });
  const catalogue = await fetchJson(`${FPMA_BASE}/FpmaSerieDomestic/?${query}`, fetchImpl);
  const allSeries = asArray(catalogue.results || catalogue);
  const countrySeries = allSeries.filter(series => series.iso3_country_code === iso3);
  const commodities = [];

  for (const commodity of COMMODITIES) {
    if (commodity.unsupported) {
      commodities.push({ id:commodity.id,label:commodity.label,status:"source_unavailable",records:[],message:"FAO FPMA domestic food-price series do not provide a verified fertilizer retail-price feed. We will add it only after a reliable source is integrated." });
      continue;
    }
    let matches = countrySeries.filter(series => commodity.match.test(asText(series.commodity)));
    const retail = matches.filter(series => /retail/i.test(asText(series.price_type)));
    if (retail.length) matches = retail;
    const normalizedState = state.trim().toLocaleLowerCase();
    const stateMatches = normalizedState ? matches.filter(series =>
      [asText(series.admin_unit1),asText(series.admin_unit),asText(series.market),asText(series.market_name)]
        .some(value => value.toLocaleLowerCase().includes(normalizedState))
    ) : [];
    if (stateMatches.length) matches = stateMatches;
    matches = matches.slice(0, 12);
    if (!matches.length) {
      commodities.push({ id:commodity.id,label:commodity.label,status:"no_data",records:[],message:"No matching price series is currently published for this country." });
      continue;
    }

    const byPeriod = new Map();
    for (const series of matches) {
      const period = choosePeriod(series);
      if (!series.uuid) continue;
      if (!byPeriod.has(period)) byPeriod.set(period, []);
      byPeriod.get(period).push(series);
    }
    const batches = [];
    for (const [period, seriesList] of byPeriod) {
      for (let i=0;i<seriesList.length;i+=8) batches.push({ period, series:seriesList.slice(i,i+8) });
    }
    const priceResults = await Promise.all(batches.map(async batch => {
      const ids = batch.series.map(item => item.uuid);
      const params = new URLSearchParams({ uuid__in:ids.join(","), periodicity:batch.period });
      const payload = await fetchJson(`${FPMA_BASE}/FpmaSeriePrice/?${params}`, fetchImpl);
      return asArray(payload.results);
    }));

    const datapoints = new Map(priceResults.flat().map(item => [item.uuid,item.datapoints]));
    const records = matches.map(series => {
      const point = latestPoint(datapoints.get(series.uuid));
      if (!point) return null;
      return {
        market:asText(series.market) || asText(series.market_name) || asText(series.admin_unit1) || "Market not specified",
        administrativeArea:asText(series.admin_unit1) || "",
        priceType:asText(series.price_type) || "Market price",
        price:Number(point.price_value),
        currency:asText(series.currency) || asText(series.currency_code) || currencyCode || null,
        unit:asText(series.measure_unit_label) || asText(series.measure_unit) || "unit not specified",
        date:point.date,
        periodicity:point.periodicity || choosePeriod(series),
        source:asText(series.source) || "FAO GIEWS FPMA",
        conversionFactor:Number.isFinite(Number(point.conversion_factor)) ? Number(point.conversion_factor) : null
      };
    }).filter(Boolean).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);

    commodities.push({
      id:commodity.id,label:commodity.label,status:records.length ? "available" : "no_data",records,
      message:records.length ? null : "The catalogue has a series, but no valid price observation was returned."
    });
  }

  const dates = commodities.flatMap(item=>item.records.map(record=>record.date)).sort();
  return {
    country,state,countryCode:iso3,currencyCode,source:"FAO GIEWS FPMA",
    sourceUrl:"https://www.fao.org/giews/food-prices/price-tool/en/",
    updatedAt:dates.at(-1) || null,
    commodities
  };
}
